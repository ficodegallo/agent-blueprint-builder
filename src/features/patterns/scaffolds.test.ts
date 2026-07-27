import { describe, it, expect } from 'vitest';
import { scaffoldPattern } from './scaffolds';
import { ALL_PATTERNS } from './patterns';
import type { OrchestrationPatternId } from './types';

const IDS = ALL_PATTERNS.map((p) => p.id) as OrchestrationPatternId[];

describe('scaffoldPattern', () => {
  it.each(IDS)('%s scaffold begins at a trigger and ends at an end node', (id) => {
    const { nodes } = scaffoldPattern(id);
    expect(nodes.some((n) => n.data.nodeType === 'trigger')).toBe(true);
    expect(nodes.some((n) => n.data.nodeType === 'end')).toBe(true);
  });

  it.each(IDS)('%s node.type always equals data.nodeType', (id) => {
    const { nodes } = scaffoldPattern(id);
    for (const n of nodes) {
      expect(n.type).toBe(n.data.nodeType);
    }
  });

  it.each(IDS)('%s edges only reference nodes that exist in the scaffold', (id) => {
    const { nodes, edges } = scaffoldPattern(id);
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const e of edges) {
      expect(nodeIds.has(e.source)).toBe(true);
      expect(nodeIds.has(e.target)).toBe(true);
    }
  });

  it.each(IDS)('%s node ids are unique', (id) => {
    const { nodes } = scaffoldPattern(id);
    const ids = nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each pattern scaffold contains its signature node type', () => {
    expect(scaffoldPattern('routing').nodes.some((n) => n.data.nodeType === 'router')).toBe(true);
    expect(scaffoldPattern('orchestrator').nodes.some((n) => n.data.nodeType === 'orchestrator')).toBe(true);
    expect(scaffoldPattern('evaluator').nodes.some((n) => n.data.nodeType === 'evaluatorOptimizer')).toBe(true);
    expect(scaffoldPattern('agent').nodes.some((n) => n.data.nodeType === 'agentLoop')).toBe(true);

    const parallelNodes = scaffoldPattern('parallel').nodes.filter((n) => n.data.nodeType === 'parallel');
    expect(parallelNodes.some((n) => (n.data as { mode?: string }).mode === 'split')).toBe(true);
    expect(parallelNodes.some((n) => (n.data as { mode?: string }).mode === 'join')).toBe(true);

    const pipeline = scaffoldPattern('pipeline');
    expect(pipeline.nodes.filter((n) => n.data.nodeType === 'work').length).toBeGreaterThanOrEqual(2);
    expect(
      pipeline.nodes.every((n) => ['trigger', 'work', 'end'].includes(n.data.nodeType))
    ).toBe(true);
  });
});
