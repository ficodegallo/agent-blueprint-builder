import { useMemo } from 'react';
import { useNodesStore, useEdgesStore } from '../store';
import { validateBlueprint, type ValidationResult } from '../utils/validation';

export function useValidation(): ValidationResult {
  const nodes = useNodesStore((state) => state.nodes);
  const edges = useEdgesStore((state) => state.edges);

  const validationResult = useMemo(() => {
    return validateBlueprint(nodes, edges);
  }, [nodes, edges]);

  return validationResult;
}
