import { isApiConfigured } from '../lib/apiConfig';
import { fetchAllBlueprints, upsertBlueprint, deleteBlueprintRemote } from '../lib/apiBlueprints';
import type { Blueprint } from '../types';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';

const CACHE_KEY = 'blueprints-cache';
const PENDING_KEY = 'blueprints-pending';
const PENDING_DELETES_KEY = 'blueprints-pending-deletes';
const MIGRATED_FLAG_KEY = 'blueprints-migrated-to-api';

// --- Local cache helpers ---

function readCache(): Map<string, Blueprint> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const entries: [string, Blueprint][] = JSON.parse(raw);
      return new Map(entries);
    }
  } catch {
    // fall through to legacy check
  }

  // Fallback: read from old Zustand persist key
  try {
    const legacy = localStorage.getItem('blueprints-library');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const entries: [string, Blueprint][] = parsed?.state?.blueprints || [];
      const map = new Map(entries);
      // Migrate to new cache key so this only happens once
      if (map.size > 0) {
        writeCache(map);
      }
      return map;
    }
  } catch {
    // ignore
  }

  return new Map();
}

function writeCache(map: Map<string, Blueprint>): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(map.entries())));
}

function readPending(): Set<string> {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writePending(set: Set<string>): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(Array.from(set)));
}

function addPending(id: string): void {
  const pending = readPending();
  pending.add(id);
  writePending(pending);
}

function removePending(id: string): void {
  const pending = readPending();
  pending.delete(id);
  writePending(pending);
}

// Pending deletes: ids whose remote DELETE failed, retried by syncPending and
// filtered out on load so a failed delete never resurrects the blueprint.
function readPendingDeletes(): Set<string> {
  try {
    const raw = localStorage.getItem(PENDING_DELETES_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writePendingDeletes(set: Set<string>): void {
  localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(Array.from(set)));
}

function addPendingDelete(id: string): void {
  const set = readPendingDeletes();
  set.add(id);
  writePendingDeletes(set);
}

function removePendingDelete(id: string): void {
  const set = readPendingDeletes();
  set.delete(id);
  writePendingDeletes(set);
}

/**
 * One-time migration: when the app first runs against a configured API, every
 * blueprint that exists only in local storage (created offline, or under the
 * legacy Supabase-less build) is enqueued for upload. Without this, loadAll's
 * merge would overwrite the cache with the server view and silently drop them.
 * Guarded by a flag so it runs exactly once — re-running would resurrect
 * blueprints deleted on another device (there are no server-side tombstones).
 */
function migrateLocalBlueprintsOnce(): void {
  if (localStorage.getItem(MIGRATED_FLAG_KEY)) return;
  const cache = readCache();
  for (const id of cache.keys()) {
    addPending(id);
  }
  localStorage.setItem(MIGRATED_FLAG_KEY, new Date().toISOString());
}

// --- Public API ---

export async function loadAll(): Promise<{ blueprints: Map<string, Blueprint>; syncStatus: SyncStatus }> {
  if (!isApiConfigured()) {
    return { blueprints: readCache(), syncStatus: 'offline' };
  }

  // Seed the pending queue from local storage the first time we run online, so
  // pre-existing offline/legacy blueprints upload instead of being overwritten.
  migrateLocalBlueprintsOnce();

  const { data, error } = await fetchAllBlueprints();

  if (error || !data) {
    // API unavailable — serve from cache
    return { blueprints: readCache(), syncStatus: 'error' };
  }

  // Merge: the API is source of truth, but include any pending local items
  const map = new Map<string, Blueprint>();
  for (const bp of data) {
    map.set(bp.id, bp);
  }

  // Keep locally-pending blueprints that aren't on the server yet
  const cache = readCache();
  const pending = readPending();
  for (const id of pending) {
    if (!map.has(id) && cache.has(id)) {
      map.set(id, cache.get(id)!);
    }
  }

  // Drop blueprints whose delete hasn't reached the server yet so a failed
  // remote DELETE doesn't resurrect them from the server list.
  const pendingDeletes = readPendingDeletes();
  for (const id of pendingDeletes) {
    map.delete(id);
  }

  writeCache(map);

  const syncStatus: SyncStatus = pending.size > 0 || pendingDeletes.size > 0 ? 'pending' : 'synced';
  return { blueprints: map, syncStatus };
}

export async function save(id: string, bp: Blueprint): Promise<SyncStatus> {
  // Always write to local cache immediately (optimistic)
  const cache = readCache();
  cache.set(id, bp);
  writeCache(cache);

  if (!isApiConfigured()) return 'offline';

  const { error, permanent } = await upsertBlueprint(bp);
  if (error) {
    // A permanent rejection (validation / too large) would retry forever and
    // pin the whole library's sync state — keep it local-only instead.
    if (permanent) return 'error';
    addPending(id);
    return 'pending';
  }

  removePending(id);
  return 'synced';
}

export async function remove(id: string): Promise<SyncStatus> {
  // Remove from local cache
  const cache = readCache();
  cache.delete(id);
  writeCache(cache);
  removePending(id);

  if (!isApiConfigured()) return 'offline';

  const { error } = await deleteBlueprintRemote(id);
  if (error) {
    // Queue the delete so it retries and the blueprint doesn't reappear on the
    // next load from the server list.
    addPendingDelete(id);
    return 'pending';
  }

  removePendingDelete(id);
  return 'synced';
}

export async function syncPending(): Promise<SyncStatus> {
  if (!isApiConfigured()) return 'offline';

  const pending = readPending();
  const pendingDeletes = readPendingDeletes();
  if (pending.size === 0 && pendingDeletes.size === 0) return 'synced';

  const cache = readCache();
  let hadErrors = false;

  for (const id of pending) {
    const bp = cache.get(id);
    if (!bp) {
      // Blueprint was deleted locally, remove from pending
      removePending(id);
      continue;
    }

    const { error, permanent } = await upsertBlueprint(bp);
    if (permanent) {
      // Server will reject this identically forever — stop retrying it.
      removePending(id);
    } else if (error) {
      hadErrors = true;
    } else {
      removePending(id);
    }
  }

  // Retry queued deletes
  for (const id of pendingDeletes) {
    const { error } = await deleteBlueprintRemote(id);
    if (error) {
      hadErrors = true;
    } else {
      removePendingDelete(id);
    }
  }

  return hadErrors ? 'error' : 'synced';
}
