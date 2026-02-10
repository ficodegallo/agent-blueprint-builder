import type { Edge } from '@xyflow/react';

// Edge data extends Record for React Flow compatibility
export interface EdgeData extends Record<string, unknown> {
  conditionLabel?: string;
  description?: string;
  // Control point offset for custom bezier curves (allows dragging edges)
  controlPointOffsetY?: number;
}

export type BlueprintEdge = Edge<EdgeData>;

export function createEdgeData(partial?: Partial<EdgeData>): EdgeData {
  return {
    conditionLabel: '',
    description: '',
    ...partial,
  };
}
