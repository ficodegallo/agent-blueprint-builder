import type { SerializedNode, BlueprintEdge } from '../../../types';
import { SMART_IMPORT_CONFIG } from '../constants';

interface LayoutConfig {
  startX: number;
  startY: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  maxNodesPerColumn: number;
}

/**
 * Calculate positions for nodes using a left-to-right BFS layout
 */
export function calculateAutoLayout(
  nodes: SerializedNode[],
  edges: BlueprintEdge[],
  config: Partial<LayoutConfig> = {}
): Map<string, { x: number; y: number }> {
  console.log('calculateAutoLayout: Starting with', nodes.length, 'nodes and', edges.length, 'edges');

  const cfg: LayoutConfig = {
    startX: SMART_IMPORT_CONFIG.LAYOUT.START_X,
    startY: SMART_IMPORT_CONFIG.LAYOUT.START_Y,
    horizontalSpacing: SMART_IMPORT_CONFIG.LAYOUT.HORIZONTAL_SPACING,
    verticalSpacing: SMART_IMPORT_CONFIG.LAYOUT.VERTICAL_SPACING,
    maxNodesPerColumn: SMART_IMPORT_CONFIG.LAYOUT.MAX_NODES_PER_COLUMN,
    ...config,
  };

  const positions = new Map<string, { x: number; y: number }>();

  if (nodes.length === 0) {
    console.log('calculateAutoLayout: No nodes to layout');
    return positions;
  }

  // Build adjacency lists
  console.log('calculateAutoLayout: Building adjacency lists');
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  nodes.forEach((n) => {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  });

  edges.forEach((e) => {
    outgoing.get(e.source)?.push(e.target);
    incoming.get(e.target)?.push(e.source);
  });

  // Find trigger nodes (nodes with type 'trigger' or no incoming edges)
  const triggerNodes = nodes.filter(
    (n) => n.type === 'trigger' || (incoming.get(n.id)?.length || 0) === 0
  );

  console.log('calculateAutoLayout: Found', triggerNodes.length, 'trigger nodes');

  // BFS to assign depths (longest path from any trigger)
  const depths = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = [];

  // Start from all trigger nodes at depth 0
  triggerNodes.forEach((n) => {
    queue.push({ id: n.id, depth: 0 });
    depths.set(n.id, 0);
  });

  console.log('calculateAutoLayout: Starting BFS from', queue.length, 'trigger nodes');

  let iterations = 0;
  const maxIterations = nodes.length * nodes.length; // Safety limit

  while (queue.length > 0) {
    iterations++;
    if (iterations > maxIterations) {
      console.error('calculateAutoLayout: BFS exceeded max iterations! Possible cycle detected.');
      break;
    }

    const { id, depth } = queue.shift()!;
    const targets = outgoing.get(id) || [];

    targets.forEach((targetId) => {
      const existingDepth = depths.get(targetId);
      const newDepth = depth + 1;

      // Use the maximum depth (longest path) to avoid overlapping
      if (existingDepth === undefined || newDepth > existingDepth) {
        depths.set(targetId, newDepth);
        queue.push({ id: targetId, depth: newDepth });
      }
    });
  }

  console.log('calculateAutoLayout: BFS completed in', iterations, 'iterations. Assigned depths to', depths.size, 'nodes');

  // Handle orphan nodes (not reachable from triggers)
  console.log('calculateAutoLayout: Handling orphan nodes');
  const maxDepth = depths.size > 0 ? Math.max(...Array.from(depths.values())) : 0;
  let orphanCount = 0;
  nodes.forEach((n) => {
    if (!depths.has(n.id)) {
      depths.set(n.id, maxDepth + 1);
      orphanCount++;
    }
  });

  if (orphanCount > 0) {
    console.log('calculateAutoLayout: Found', orphanCount, 'orphan nodes, placed at depth', maxDepth + 1);
  }

  // Group nodes by depth
  console.log('calculateAutoLayout: Grouping nodes by depth');
  const depthGroups = new Map<number, string[]>();
  depths.forEach((depth, id) => {
    if (!depthGroups.has(depth)) {
      depthGroups.set(depth, []);
    }
    depthGroups.get(depth)!.push(id);
  });

  console.log('calculateAutoLayout: Created', depthGroups.size, 'depth groups');

  // Sort nodes within each depth group for consistency
  // Put triggers first, then work nodes, then decisions, then end nodes
  console.log('calculateAutoLayout: Sorting nodes within depth groups');
  const typeOrder: Record<string, number> = {
    trigger: 0,
    work: 1,
    workflow: 2,
    decision: 3,
    end: 4,
  };

  const nodeTypeMap = new Map(nodes.map((n) => [n.id, n.type]));

  depthGroups.forEach((nodeIds, depth) => {
    nodeIds.sort((a, b) => {
      const typeA = nodeTypeMap.get(a) || 'work';
      const typeB = nodeTypeMap.get(b) || 'work';
      return (typeOrder[typeA] || 1) - (typeOrder[typeB] || 1);
    });
    depthGroups.set(depth, nodeIds);
  });

  // Calculate positions for each depth level
  console.log('calculateAutoLayout: Calculating positions');
  const sortedDepths = Array.from(depthGroups.keys()).sort((a, b) => a - b);

  sortedDepths.forEach((depth) => {
    const nodeIds = depthGroups.get(depth)!;
    const x = cfg.startX + depth * cfg.horizontalSpacing;

    // Center nodes vertically
    const totalHeight = (nodeIds.length - 1) * cfg.verticalSpacing;
    const startY = cfg.startY + (cfg.maxNodesPerColumn * cfg.verticalSpacing - totalHeight) / 2;

    nodeIds.forEach((id, index) => {
      const y = Math.max(cfg.startY, startY + index * cfg.verticalSpacing);
      positions.set(id, { x, y });
    });
  });

  console.log('calculateAutoLayout: Position calculation complete. Total positions:', positions.size);

  return positions;
}

/**
 * Apply calculated positions to nodes
 */
export function applyAutoLayout(
  nodes: SerializedNode[],
  edges: BlueprintEdge[]
): SerializedNode[] {
  console.log('Auto-layout started. Nodes:', nodes.length, 'Edges:', edges.length);

  try {
    const startTime = Date.now();
    const positions = calculateAutoLayout(nodes, edges);
    const duration = Date.now() - startTime;

    console.log('Position calculation completed in', duration, 'ms');
    console.log('Positions calculated:', positions.size);

    const result = nodes.map((node) => {
      const position = positions.get(node.id);
      if (!position) {
        console.warn('No position found for node:', node.id, 'Using default position');
      }
      return {
        ...node,
        position: position || { x: 100, y: 100 },
      };
    });

    console.log('Auto-layout complete. Positioned', result.length, 'nodes');
    return result;
  } catch (error) {
    console.error('Auto-layout error:', error);
    // Return nodes with default positions on error
    console.log('Returning nodes with default positions due to error');
    return nodes.map((node, index) => ({
      ...node,
      position: { x: 100 + (index % 5) * 300, y: 100 + Math.floor(index / 5) * 200 },
    }));
  }
}
