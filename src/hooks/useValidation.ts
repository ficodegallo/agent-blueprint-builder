import { useMemo } from 'react';
import { useNodesStore, useEdgesStore } from '../store';
import { useBlueprintsLibraryStore } from '../store/blueprintsLibraryStore';
import { validateBlueprint, type ValidationResult } from '../utils/validation';

/**
 * Hook that reactively validates the current blueprint against all rules.
 *
 * Subscribes to nodes and edges from their Zustand stores and runs
 * validateBlueprint on every change. Results are memoized and only recomputed
 * when the node or edge arrays change.
 *
 * @returns {ValidationResult} Object containing errors[] and warnings[] arrays.
 *   Errors block export; warnings are advisory.
 */
export function useValidation(): ValidationResult {
  const nodes = useNodesStore((state) => state.nodes);
  const edges = useEdgesStore((state) => state.edges);
  const blueprints = useBlueprintsLibraryStore((state) => state.blueprints);

  const existingBlueprintIds = useMemo(
    () => new Set(blueprints.keys()),
    [blueprints]
  );

  const validationResult = useMemo(() => {
    return validateBlueprint(nodes, edges, existingBlueprintIds);
  }, [nodes, edges, existingBlueprintIds]);

  return validationResult;
}
