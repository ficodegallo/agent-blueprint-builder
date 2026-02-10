import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Blueprint, Status } from '../types';

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

  // Actions
  addBlueprint: (blueprint: Blueprint) => void;
  updateBlueprint: (id: string, blueprint: Blueprint) => void;
  deleteBlueprint: (id: string) => void;
  getBlueprint: (id: string) => Blueprint | undefined;
  getBlueprintSummaries: () => BlueprintSummary[];
  importBlueprint: (blueprint: Blueprint) => string;
}

export const useBlueprintsLibraryStore = create<BlueprintsLibraryState>()(
  persist(
    (set, get) => ({
      blueprints: new Map(),

      addBlueprint: (blueprint) =>
        set((state) => {
          const newBlueprints = new Map(state.blueprints);
          newBlueprints.set(blueprint.id, blueprint);
          return { blueprints: newBlueprints };
        }),

      updateBlueprint: (id, blueprint) =>
        set((state) => {
          const newBlueprints = new Map(state.blueprints);
          newBlueprints.set(id, blueprint);
          return { blueprints: newBlueprints };
        }),

      deleteBlueprint: (id) =>
        set((state) => {
          const newBlueprints = new Map(state.blueprints);
          newBlueprints.delete(id);
          return { blueprints: newBlueprints };
        }),

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
        // Sort by last modified date descending
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
        return blueprint.id;
      },
    }),
    {
      name: 'blueprints-library',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Convert array back to Map
          if (parsed.state?.blueprints) {
            parsed.state.blueprints = new Map(parsed.state.blueprints);
          }
          return parsed;
        },
        setItem: (name, value) => {
          // Convert Map to array for JSON serialization
          const toStore = {
            ...value,
            state: {
              ...value.state,
              blueprints: Array.from(value.state.blueprints.entries()),
            },
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
