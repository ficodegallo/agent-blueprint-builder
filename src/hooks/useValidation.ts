import { useMemo } from 'react';
import { useNodesStore, useEdgesStore, useBlueprintStore, useEvalsStore, selectActiveEvalCount } from '../store';
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
  const orchestrationPattern = useBlueprintStore((state) => state.orchestrationPattern);
  const status = useBlueprintStore((state) => state.status);
  const evalCount = useEvalsStore(selectActiveEvalCount);

  const existingBlueprintIds = useMemo(
    () => new Set(blueprints.keys()),
    [blueprints]
  );

  const validationResult = useMemo(() => {
    return validateBlueprint(nodes, edges, existingBlueprintIds, orchestrationPattern, {
      evalCount,
      status,
    });
  }, [nodes, edges, existingBlueprintIds, orchestrationPattern, evalCount, status]);

  return validationResult;
}
