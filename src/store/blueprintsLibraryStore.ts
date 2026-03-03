import { create } from 'zustand';
import type { Blueprint, Status } from '../types';
import * as storage from '../services/blueprintStorage';
import type { SyncStatus } from '../services/blueprintStorage';

export type { SyncStatus };

export interface BlueprintSummary {
  id: string;
  title: string;
  description: string;
  status: Status;
  createdBy: string;
  lastModifiedBy: string;
  lastModifiedDate: string;
  version: string;
  nodeCount: number;
}

interface BlueprintsLibraryState {
  blueprints: Map<string, Blueprint>;
  syncStatus: SyncStatus;
  isLoading: boolean;

  // Existing actions (signatures unchanged)
  addBlueprint: (blueprint: Blueprint) => void;
  updateBlueprint: (id: string, blueprint: Blueprint) => void;
  deleteBlueprint: (id: string) => void;
  getBlueprint: (id: string) => Blueprint | undefined;
  getBlueprintSummaries: () => BlueprintSummary[];
  importBlueprint: (blueprint: Blueprint) => string;

  // New actions
  loadFromServer: () => Promise<void>;
  retrySyncPending: () => Promise<void>;
}

// Read localStorage cache synchronously for instant hydration
function getInitialBlueprints(): Map<string, Blueprint> {
  try {
    const raw = localStorage.getItem('blueprints-cache');
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
      // Migrate to new cache key
      if (map.size > 0) {
        localStorage.setItem('blueprints-cache', JSON.stringify(Array.from(map.entries())));
      }
      return map;
    }
  } catch {
    // ignore
  }

  return new Map();
}

export const useBlueprintsLibraryStore = create<BlueprintsLibraryState>()(
  (set, get) => ({
    blueprints: getInitialBlueprints(),
    syncStatus: 'offline' as SyncStatus,
    isLoading: false,

    addBlueprint: (blueprint) => {
      set((state) => {
        const newBlueprints = new Map(state.blueprints);
        newBlueprints.set(blueprint.id, blueprint);
        return { blueprints: newBlueprints };
      });
      // Background save
      storage.save(blueprint.id, blueprint).then((syncStatus) => {
        set({ syncStatus });
      });
    },

    updateBlueprint: (id, blueprint) => {
      set((state) => {
        const newBlueprints = new Map(state.blueprints);
        newBlueprints.set(id, blueprint);
        return { blueprints: newBlueprints };
      });
      // Background save
      storage.save(id, blueprint).then((syncStatus) => {
        set({ syncStatus });
      });
    },

    deleteBlueprint: (id) => {
      set((state) => {
        const newBlueprints = new Map(state.blueprints);
        newBlueprints.delete(id);
        return { blueprints: newBlueprints };
      });
      // Background delete
      storage.remove(id).then((syncStatus) => {
        set({ syncStatus });
      });
    },

    getBlueprint: (id) => {
      return get().blueprints.get(id);
    },

    getBlueprintSummaries: () => {
      const summaries: BlueprintSummary[] = [];
      get().blueprints.forEach((blueprint) => {
        summaries.push({
          id: blueprint.id,
          title: blueprint.title,
          description: blueprint.description,
          status: blueprint.status,
          createdBy: blueprint.createdBy,
          lastModifiedBy: blueprint.lastModifiedBy,
          lastModifiedDate: blueprint.lastModifiedDate,
          version: blueprint.version,
          nodeCount: blueprint.nodes.length,
        });
      });
      return summaries.sort(
        (a, b) => new Date(b.lastModifiedDate).getTime() - new Date(a.lastModifiedDate).getTime()
      );
    },

    importBlueprint: (blueprint) => {
      set((state) => {
        const newBlueprints = new Map(state.blueprints);
        newBlueprints.set(blueprint.id, blueprint);
        return { blueprints: newBlueprints };
      });
      // Background save
      storage.save(blueprint.id, blueprint).then((syncStatus) => {
        set({ syncStatus });
      });
      return blueprint.id;
    },

    loadFromServer: async () => {
      set({ isLoading: true });
      const { blueprints, syncStatus } = await storage.loadAll();
      set({ blueprints, syncStatus, isLoading: false });
    },

    retrySyncPending: async () => {
      set({ syncStatus: 'pending' });
      const syncStatus = await storage.syncPending();
      set({ syncStatus });
    },
  })
);
