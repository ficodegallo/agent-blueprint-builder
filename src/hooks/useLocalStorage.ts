import { useCallback } from 'react';
import { STORAGE_KEYS, getBlueprintStorageKey } from '../constants';
import type { Blueprint, SerializedNode } from '../types';
import { useBlueprintStore, useNodesStore, useEdgesStore, useCommentsStore } from '../store';
import type { AppNode } from '../store/nodesStore';

interface SavedBlueprintSummary {
  id: string;
  title: string;
  lastModifiedDate: string;
  status: string;
}

// Convert AppNode to SerializedNode (strips React Flow internal state)
function serializeNodes(nodes: AppNode[]): SerializedNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type || node.data.nodeType,
    position: node.position,
    data: node.data,
  }));
}

// Convert SerializedNode to AppNode
function deserializeNodes(nodes: SerializedNode[]): AppNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
  }));
}

export function useLocalStorage() {
  const blueprintStore = useBlueprintStore();
  const nodesStore = useNodesStore();
  const edgesStore = useEdgesStore();
  const commentsStore = useCommentsStore();

  // Get the current blueprint as a single object
  const getCurrentBlueprint = useCallback((): Blueprint => {
    return {
      id: blueprintStore.id,
      title: blueprintStore.title,
      description: blueprintStore.description,
      impactedAudiences: blueprintStore.impactedAudiences,
      businessBenefits: blueprintStore.businessBenefits,
      clientContacts: blueprintStore.clientContacts,
      createdBy: blueprintStore.createdBy,
      lastModifiedBy: blueprintStore.lastModifiedBy,
      lastModifiedDate: blueprintStore.lastModifiedDate,
      version: blueprintStore.version,
      status: blueprintStore.status,
      changeLog: blueprintStore.changeLog,
      nodes: serializeNodes(nodesStore.nodes),
      edges: edgesStore.edges,
      comments: commentsStore.comments,
    };
  }, [blueprintStore, nodesStore.nodes, edgesStore.edges, commentsStore.comments]);

  // Save current blueprint to localStorage
  const saveCurrentBlueprint = useCallback(() => {
    const blueprint = getCurrentBlueprint();
    localStorage.setItem(STORAGE_KEYS.CURRENT_BLUEPRINT, JSON.stringify(blueprint));
  }, [getCurrentBlueprint]);

  // Load blueprint from localStorage
  const loadCurrentBlueprint = useCallback((): boolean => {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_BLUEPRINT);
    if (!stored) return false;

    try {
      const blueprint: Blueprint = JSON.parse(stored);
      loadBlueprint(blueprint);
      return true;
    } catch (e) {
      console.error('Failed to load blueprint from localStorage:', e);
      return false;
    }
  }, []);

  // Load a blueprint into the stores
  const loadBlueprint = useCallback((blueprint: Blueprint) => {
    // Load metadata
    blueprintStore.loadFromData({
      id: blueprint.id,
      title: blueprint.title,
      description: blueprint.description,
      impactedAudiences: blueprint.impactedAudiences,
      businessBenefits: blueprint.businessBenefits,
      clientContacts: blueprint.clientContacts,
      createdBy: blueprint.createdBy,
      lastModifiedBy: blueprint.lastModifiedBy,
      lastModifiedDate: blueprint.lastModifiedDate,
      version: blueprint.version,
      status: blueprint.status,
      changeLog: blueprint.changeLog,
    });

    // Load nodes, edges, comments
    nodesStore.setNodes(deserializeNodes(blueprint.nodes));
    edgesStore.setEdges(blueprint.edges);
    commentsStore.setComments(blueprint.comments);
  }, [blueprintStore, nodesStore, edgesStore, commentsStore]);

  // Save blueprint with a name (for saved blueprints list)
  const saveNamedBlueprint = useCallback((name?: string) => {
    const blueprint = getCurrentBlueprint();
    if (name) {
      blueprint.title = name;
      // Also update the blueprint store's title
      blueprintStore.updateMetadata({ title: name });
    }

    // Save the blueprint
    const key = getBlueprintStorageKey(blueprint.id);
    localStorage.setItem(key, JSON.stringify(blueprint));

    // Update the blueprints list
    const listStr = localStorage.getItem(STORAGE_KEYS.BLUEPRINTS_LIST);
    const list: SavedBlueprintSummary[] = listStr ? JSON.parse(listStr) : [];

    const summary: SavedBlueprintSummary = {
      id: blueprint.id,
      title: blueprint.title,
      lastModifiedDate: blueprint.lastModifiedDate,
      status: blueprint.status,
    };

    const existingIndex = list.findIndex((item) => item.id === blueprint.id);
    if (existingIndex >= 0) {
      list[existingIndex] = summary;
    } else {
      list.push(summary);
    }

    localStorage.setItem(STORAGE_KEYS.BLUEPRINTS_LIST, JSON.stringify(list));
  }, [getCurrentBlueprint, blueprintStore]);

  // Load a named blueprint
  const loadNamedBlueprint = useCallback((id: string): boolean => {
    const key = getBlueprintStorageKey(id);
    const stored = localStorage.getItem(key);
    if (!stored) return false;

    try {
      const blueprint: Blueprint = JSON.parse(stored);
      loadBlueprint(blueprint);
      return true;
    } catch (e) {
      console.error('Failed to load named blueprint:', e);
      return false;
    }
  }, [loadBlueprint]);

  // Delete a named blueprint
  const deleteNamedBlueprint = useCallback((id: string) => {
    const key = getBlueprintStorageKey(id);
    localStorage.removeItem(key);

    // Update the list
    const listStr = localStorage.getItem(STORAGE_KEYS.BLUEPRINTS_LIST);
    if (listStr) {
      const list: SavedBlueprintSummary[] = JSON.parse(listStr);
      const filtered = list.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEYS.BLUEPRINTS_LIST, JSON.stringify(filtered));
    }
  }, []);

  // Get list of saved blueprints
  const getSavedBlueprintsList = useCallback((): SavedBlueprintSummary[] => {
    const listStr = localStorage.getItem(STORAGE_KEYS.BLUEPRINTS_LIST);
    return listStr ? JSON.parse(listStr) : [];
  }, []);

  // Create a new blueprint (reset all stores)
  const createNewBlueprint = useCallback(() => {
    blueprintStore.reset();
    nodesStore.reset();
    edgesStore.reset();
    commentsStore.reset();
  }, [blueprintStore, nodesStore, edgesStore, commentsStore]);

  return {
    getCurrentBlueprint,
    saveCurrentBlueprint,
    loadCurrentBlueprint,
    loadBlueprint,
    saveNamedBlueprint,
    loadNamedBlueprint,
    deleteNamedBlueprint,
    getSavedBlueprintsList,
    createNewBlueprint,
  };
}
