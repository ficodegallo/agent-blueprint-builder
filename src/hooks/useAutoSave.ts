import { useEffect, useRef } from 'react';
import { useNodesStore, useEdgesStore, useBlueprintStore, useCommentsStore } from '../store';
import { useLocalStorage } from './useLocalStorage';

const AUTO_SAVE_DELAY = 2000; // 2 seconds

/**
 * Hook that automatically saves the current blueprint to localStorage whenever
 * any tracked state changes, debounced by AUTO_SAVE_DELAY (2 seconds).
 *
 * Subscribes to nodes, edges, comments, and blueprint metadata fields. The
 * debounce prevents excessive writes during rapid edits. Mount this hook once
 * in BlueprintEditor — it has no return value.
 */
export function useAutoSave() {
  const { saveCurrentBlueprint } = useLocalStorage();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to all relevant state changes
  const nodes = useNodesStore((state) => state.nodes);
  const edges = useEdgesStore((state) => state.edges);
  const comments = useCommentsStore((state) => state.comments);

  // Blueprint metadata that should trigger save
  const title = useBlueprintStore((state) => state.title);
  const description = useBlueprintStore((state) => state.description);
  const status = useBlueprintStore((state) => state.status);
  const version = useBlueprintStore((state) => state.version);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      saveCurrentBlueprint();
    }, AUTO_SAVE_DELAY);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodes, edges, comments, title, description, status, version, saveCurrentBlueprint]);
}
