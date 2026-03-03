import { isSupabaseConfigured } from '../lib/supabase';
import { upsertBlueprint } from '../lib/supabaseBlueprints';
import type { Blueprint } from '../types';

const MIGRATION_FLAG = 'blueprint-builder:migrated-to-supabase';
const CACHE_KEY = 'blueprints-cache';

export async function migrateToSupabase(): Promise<void> {
  // Skip if already migrated or Supabase not configured
  if (!isSupabaseConfigured()) return;
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  const blueprintsToMigrate = new Map<string, Blueprint>();

  // Source 1: Zustand persist format (current format)
  try {
    const raw = localStorage.getItem('blueprints-library');
    if (raw) {
      const parsed = JSON.parse(raw);
      const entries: [string, Blueprint][] = parsed?.state?.blueprints || [];
      for (const [id, bp] of entries) {
        blueprintsToMigrate.set(id, bp);
      }
    }
  } catch (e) {
    console.warn('Migration: failed to read blueprints-library', e);
  }

  // Source 2: Legacy individual blueprint keys
  try {
    const listRaw = localStorage.getItem('blueprint-builder:blueprints');
    if (listRaw) {
      const ids: string[] = JSON.parse(listRaw);
      for (const id of ids) {
        const bpRaw = localStorage.getItem(`blueprint-builder:blueprint:${id}`);
        if (bpRaw) {
          const bp: Blueprint = JSON.parse(bpRaw);
          // Only keep if newer than existing
          const existing = blueprintsToMigrate.get(id);
          if (!existing || new Date(bp.lastModifiedDate) > new Date(existing.lastModifiedDate)) {
            blueprintsToMigrate.set(id, bp);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Migration: failed to read legacy blueprints', e);
  }

  if (blueprintsToMigrate.size === 0) {
    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
    return;
  }

  console.log(`Migrating ${blueprintsToMigrate.size} blueprints to Supabase...`);

  // Upsert each to Supabase
  let errors = 0;
  for (const [, bp] of blueprintsToMigrate) {
    const { error } = await upsertBlueprint(bp);
    if (error) {
      console.warn(`Migration: failed to upsert blueprint ${bp.id}:`, error);
      errors++;
    }
  }

  // Write to new cache key
  localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(blueprintsToMigrate.entries())));

  if (errors === 0) {
    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
    console.log('Migration complete');
  } else {
    console.warn(`Migration completed with ${errors} errors — will retry next load`);
  }
}
