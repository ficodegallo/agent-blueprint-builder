import { isSupabaseConfigured } from '../lib/supabase';
import { fetchAllBlueprints, upsertBlueprint, deleteBlueprintRemote } from '../lib/supabaseBlueprints';
import type { Blueprint } from '../types';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';

const CACHE_KEY = 'blueprints-cache';
const PENDING_KEY = 'blueprints-pending';

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

// --- Public API ---

export async function loadAll(): Promise<{ blueprints: Map<string, Blueprint>; syncStatus: SyncStatus }> {
  if (!isSupabaseConfigured()) {
    return { blueprints: readCache(), syncStatus: 'offline' };
  }

  const { data, error } = await fetchAllBlueprints();

  if (error || !data) {
    // Supabase unavailable — serve from cache
    return { blueprints: readCache(), syncStatus: 'error' };
  }

  // Merge: Supabase is source of truth, but include any pending local items
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

  writeCache(map);

  const syncStatus: SyncStatus = pending.size > 0 ? 'pending' : 'synced';
  return { blueprints: map, syncStatus };
}

export async function save(id: string, bp: Blueprint): Promise<SyncStatus> {
  // Always write to local cache immediately (optimistic)
  const cache = readCache();
  cache.set(id, bp);
  writeCache(cache);

  if (!isSupabaseConfigured()) return 'offline';

  const { error } = await upsertBlueprint(bp);
  if (error) {
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

  if (!isSupabaseConfigured()) return 'offline';

  const { error } = await deleteBlueprintRemote(id);
  if (error) {
    // Item is already removed locally, log but don't block
    console.warn('Failed to delete from Supabase:', error);
    return 'error';
  }

  return 'synced';
}

export async function syncPending(): Promise<SyncStatus> {
  if (!isSupabaseConfigured()) return 'offline';

  const pending = readPending();
  if (pending.size === 0) return 'synced';

  const cache = readCache();
  let hadErrors = false;

  for (const id of pending) {
    const bp = cache.get(id);
    if (!bp) {
      // Blueprint was deleted locally, remove from pending
      removePending(id);
      continue;
    }

    const { error } = await upsertBlueprint(bp);
    if (error) {
      hadErrors = true;
    } else {
      removePending(id);
    }
  }

  return hadErrors ? 'error' : 'synced';
}
