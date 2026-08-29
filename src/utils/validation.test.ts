import { describe, it, expect } from 'vitest';
import { validateBlueprint } from './validation';
import type { AppNode } from '../store/nodesStore';
import type { BlueprintEdge } from '../types';

// Helper to create a trigger node
function createTriggerNode(id: string, name = 'Test Trigger'): AppNode {
  return {
    id,
    type: 'trigger',
    position: { x: 0, y: 0 },
    data: {
      nodeType: 'trigger',
      name,
      triggerType: 'event',
      description: 'Test trigger',
      configuration: '',
    },
  };
}

// Helper to create a work node
function createWorkNode(
  id: string,
  name = 'Test Work',
  goal = 'Test goal',
  workerType: 'agent' | 'automation' | 'human' = 'agent'
): AppNode {
  return {
    id,
    type: 'work',
    position: { x: 100, y: 0 },
    data: {
      nodeType: 'work',
      name,
      workerType,
      goal,
      inputs: [{ name: 'input1', required: true }],
      tasks: ['task1'],
      outputs: [{ name: 'output1', required: true }],
      integrations: [],
    },
  };
}

// Helper to create an end node
function createEndNode(id: string, name = 'Test End'): AppNode {
  return {
    id,
    type: 'end',
    position: { x: 200, y: 0 },
    data: {
      nodeType: 'end',
      name,
      description: 'Test end',
      outcome: 'Process complete',
    },
  };
}

// Helper to create a decision node
function createDecisionNode(id: string, name = 'Test Decision'): AppNode {
  return {
    id,
    type: 'decision',
    position: { x: 100, y: 100 },
    data: {
      nodeType: 'decision',
      name,
      description: 'Test decision',
      conditions: [],
    },
  };
}

// Helper to create an edge
function createEdge(source: string, target: string): BlueprintEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: 'default',
  };
}

describe('validateBlueprint', () => {
  describe('E001: Missing Trigger Node', () => {
    it('should return error when no trigger node exists', () => {
      const nodes: AppNode[] = [
        createWorkNode('work1'),
        createEndNode('end1'),
      ];
      const edges = [createEdge('work1', 'end1')];

      const result = validateBlueprint(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'E001',
          message: 'Blueprint must have at least one Trigger node',
        })
      );
    });

    it('should not return error when trigger node exists', () => {
      const nodes: AppNode[] = [
        createTriggerNode('trigger1'),
        createWorkNode('work1'),
        createEndNode('end1'),
      ];
      const edges = [
        createEdge('trigger1', 'work1'),
        createEdge('work1', 'end1'),
      ];

      const result = validateBlueprint(nodes, edges);

      expect(result.errors.find((e) => e.code === 'E001')).toBeUndefined();
    });
  });

  describe('E002: Missing End Node', () => {
    it('should return error when no end node exists', () => {
      const nodes: AppNode[] = [
        createTriggerNode('trigger1'),
        createWorkNode('work1'),
      ];
      const edges = [createEdge('trigger1', 'work1')];

      const result = validateBlueprint(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'E002',
          message: 'Blueprint must have at least one End node',
        })
      );
    });
  });

  describe('E003: Disconnected Nodes', () => {
    it('should return error for work node without incoming connection', () => {
      const nodes: AppNode[] = [
        createTriggerNode('trigger1'),
        createWorkNode('work1'),
        createEndNode('end1'),
      ];
      const edges = [createEdge('trigger1', 'end1')];

      const result = validateBlueprint(nodes, edges);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'E003',
          nodeId: 'work1',
        })
      );
    });

    it('should return error for node without outgoing connection (except end nodes)', () => {
      const nodes: AppNode[] = [
        createTriggerNode('trigger1'),
        createWorkNode('work1'),
        createWorkNode('work2'),
        createEndNode('end1'),
      ];
      const edges = [
        createEdge('trigger1', 'work1'),
        createEdge('trigger1', 'work2'),
        createEdge('work1', 'end1'),
        // work2 has no outgoing connection
      ];

      const result = validateBlueprint(nodes, edges);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'E003',
          nodeId: 'work2',
        })
      );
    });
  });

  describe('E004: Missing Goal', () => {
    it('should return error for work node without goal', () => {
      const nodes: AppNode[] = [
        createTriggerNode('trigger1'),
        createWorkNode('work1', 'Work Node', ''), // Empty goal
        createEndNode('end1'),
      ];
      const edges = [
        createEdge('trigger1', 'work1'),
        createEdge('work1', 'end1'),
      ];

      const result = validateBlueprint(nodes, edges);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'E004',
          nodeId: 'work1',
        })
      );
    });
  });

  describe('W001: Missing Name', () => {
    it('should return warning for node without name', () => {
      const node = createTriggerNode('trigger1', '');
      const nodes: AppNode[] = [node, createEndNode('end1')];
      const edges = [createEdge('trigger1', 'end1')];

      const result = validateBlueprint(nodes, edges);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'W001',
          nodeId: 'trigger1',
        })
      );
    });
  });

  describe('W002/W003: Empty Inputs/Tasks', () => {
    it('should return warnings for work node with empty inputs and tasks', () => {
      const workNode: AppNode = {
        id: 'work1',
        type: 'work',
        position: { x: 100, y: 0 },
        data: {
          nodeType: 'work',
          name: 'Work Node',
          workerType: 'agent',
          goal: 'Test goal',
          inputs: [],
          tasks: [],
          outputs: [],
          integrations: [],
        },
      };

      const nodes: AppNode[] = [
        createTriggerNode('trigger1'),
        workNode,
        createEndNode('end1'),
      ];
      const edges = [
        createEdge('trigger1', 'work1'),
        createEdge('work1', 'end1'),
      ];

      const result = validateBlueprint(nodes, edges);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'W002', nodeId: 'work1' })
      );
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'W003', nodeId: 'work1' })
      );
    });
  });

  describe('W004: Decision with Few Branches', () => {
    it('should return warning for decision node with fewer than 2 branches', () => {
      const nodes: AppNode[] = [
        createTriggerNode('trigger1'),
        createDecisionNode('decision1'),
        createEndNode('end1'),
      ];
      const edges = [
        createEdge('trigger1', 'decision1'),
        createEdge('decision1', 'end1'), // Only 1 outgoing
      ];

      const result = validateBlueprint(nodes, edges);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'W004',
          nodeId: 'decision1',
        })
      );
    });

    it('should not return warning for decision node with 2+ branches', () => {
      const nodes: AppNode[] = [
        createTriggerNode('trigger1'),
        createDecisionNode('decision1'),
        createEndNode('end1'),
        createEndNode('end2'),
      ];
      const edges = [
        createEdge('trigger1', 'decision1'),
        createEdge('decision1', 'end1'),
        createEdge('decision1', 'end2'),
      ];

      const result = validateBlueprint(nodes, edges);

      expect(result.warnings.find((w) => w.code === 'W004')).toBeUndefined();
    });
  });

  describe('Valid Blueprint', () => {
    it('should return isValid=true for a properly connected blueprint', () => {
      const nodes: AppNode[] = [
        createTriggerNode('trigger1'),
        createWorkNode('work1'),
        createEndNode('end1'),
      ];
      const edges = [
        createEdge('trigger1', 'work1'),
        createEdge('work1', 'end1'),
      ];

      const result = validateBlueprint(nodes, edges);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});


// ── Agentic pattern node validation ──────────────────────────────────

function connectChain(ids: string[]): BlueprintEdge[] {
  return ids.slice(0, -1).map((source, i) => ({
    id: `e-${source}-${ids[i + 1]}`,
    source,
    target: ids[i + 1],
  }));
}

describe('agentic pattern validation', () => {
  it('errors when an orchestrator has no termination condition (E006)', () => {
    const orchestrator: AppNode = {
      id: 'orch1',
      type: 'orchestrator',
      position: { x: 100, y: 0 },
      data: {
        nodeType: 'orchestrator',
        name: 'Manager',
        goal: 'Coordinate work',
        delegationStrategy: 'By skill match',
        workers: [{ id: 'w1', name: 'Worker', description: 'Does things', skills: [] }],
        synthesis: 'Merge results',
        terminationCondition: '',
        maxIterations: '',
        budget: '',
        inputs: [],
        outputs: [],
      },
    };
    const nodes = [createTriggerNode('t1'), orchestrator, createEndNode('e1')];
    const result = validateBlueprint(nodes, connectChain(['t1', 'orch1', 'e1']));
    expect(result.errors.some((e) => e.code === 'E006')).toBe(true);
  });

  it('errors when an agent loop has no stop condition (E007)', () => {
    const loop: AppNode = {
      id: 'loop1',
      type: 'agentLoop',
      position: { x: 100, y: 0 },
      data: {
        nodeType: 'agentLoop',
        name: 'Agent',
        goal: 'Do the work',
        inputs: [],
        outputs: [],
        maxIterations: '',
        memory: '',
        integrations: [],
        stopCondition: '',
      },
    };
    const nodes = [createTriggerNode('t1'), loop, createEndNode('e1')];
    const result = validateBlueprint(nodes, connectChain(['t1', 'loop1', 'e1']));
    expect(result.errors.some((e) => e.code === 'E007')).toBe(true);
  });

  it('warns when a router has fewer than 2 routes (W007)', () => {
    const router: AppNode = {
      id: 'r1',
      type: 'router',
      position: { x: 100, y: 0 },
      data: {
        nodeType: 'router',
        name: 'Router',
        description: '',
        classifierInstructions: '',
        routes: [{ id: 'only', label: 'Only', description: '' }],
        fallbackRoute: '',
      },
    };
    const nodes = [createTriggerNode('t1'), router, createEndNode('e1')];
    const result = validateBlueprint(nodes, connectChain(['t1', 'r1', 'e1']));
    expect(result.warnings.some((w) => w.code === 'W007')).toBe(true);
  });

  it('warns on a parallel split with no join anywhere (W009)', () => {
    const split: AppNode = {
      id: 'p1',
      type: 'parallel',
      position: { x: 100, y: 0 },
      data: {
        nodeType: 'parallel',
        name: 'Split',
        mode: 'split',
        description: '',
        branches: [
          { id: 'b1', label: 'A', description: '' },
          { id: 'b2', label: 'B', description: '' },
        ],
        joinBehavior: 'wait-all',
      },
    };
    const nodes = [createTriggerNode('t1'), split, createEndNode('e1')];
    const result = validateBlueprint(nodes, connectChain(['t1', 'p1', 'e1']));
    expect(result.warnings.some((w) => w.code === 'W009')).toBe(true);
  });

  it('warns when an evaluator loop has no criteria (W008)', () => {
    const evalNode: AppNode = {
      id: 'ev1',
      type: 'evaluatorOptimizer',
      position: { x: 100, y: 0 },
      data: {
        nodeType: 'evaluatorOptimizer',
        name: 'Quality Loop',
        goal: 'Produce good output',
        generatorDescription: 'Drafts',
        evaluatorCriteria: [],
        passCondition: '',
        maxIterations: '',
        onMaxIterations: '',
        inputs: [],
        outputs: [],
      },
    };
    const nodes = [createTriggerNode('t1'), evalNode, createEndNode('e1')];
    const result = validateBlueprint(nodes, connectChain(['t1', 'ev1', 'e1']));
    expect(result.warnings.some((w) => w.code === 'W008')).toBe(true);
  });

  it('passes a well-formed orchestrator blueprint', () => {
    const orchestrator: AppNode = {
      id: 'orch1',
      type: 'orchestrator',
      position: { x: 100, y: 0 },
      data: {
        nodeType: 'orchestrator',
        name: 'Manager',
        goal: 'Coordinate work',
        delegationStrategy: 'By skill match',
        workers: [{ id: 'w1', name: 'Worker', description: 'Does things', skills: [] }],
        synthesis: 'Merge results',
        terminationCondition: 'All subtasks done',
        maxIterations: '10',
        budget: '',
        inputs: [],
        outputs: [],
      },
    };
    const nodes = [createTriggerNode('t1'), orchestrator, createEndNode('e1')];
    const result = validateBlueprint(nodes, connectChain(['t1', 'orch1', 'e1']));
    expect(result.errors).toHaveLength(0);
  });
});

describe('W011: Pattern / graph mismatch', () => {
  it('warns when the routing pattern is set but no router node exists', () => {
    const nodes = [createTriggerNode('t1'), createWorkNode('w1'), createEndNode('e1')];
    const edges = connectChain(['t1', 'w1', 'e1']);
    const result = validateBlueprint(nodes, edges, undefined, 'routing');
    const w011 = result.warnings.filter((w) => w.code === 'W011');
    expect(w011).toHaveLength(1);
  });

  it('does not warn when the routing pattern has a router node', () => {
    const router: AppNode = {
      id: 'r1',
      type: 'router',
      position: { x: 100, y: 0 },
      data: {
        nodeType: 'router',
        name: 'Route',
        description: '',
        classifierInstructions: '',
        routes: [
          { id: 'a', label: 'A', description: '' },
          { id: 'b', label: 'B', description: '' },
        ],
        fallbackRoute: 'A',
      },
    };
    const nodes = [createTriggerNode('t1'), router, createEndNode('e1')];
    const edges = connectChain(['t1', 'r1', 'e1']);
    const result = validateBlueprint(nodes, edges, undefined, 'routing');
    expect(result.warnings.filter((w) => w.code === 'W011')).toHaveLength(0);
  });

  it('never warns for the pipeline pattern (uses only base node types)', () => {
    const nodes = [createTriggerNode('t1'), createWorkNode('w1'), createEndNode('e1')];
    const edges = connectChain(['t1', 'w1', 'e1']);
    const result = validateBlueprint(nodes, edges, undefined, 'pipeline');
    expect(result.warnings.filter((w) => w.code === 'W011')).toHaveLength(0);
  });

  it('never warns when the blueprint is freeform (no pattern)', () => {
    const nodes = [createTriggerNode('t1'), createWorkNode('w1'), createEndNode('e1')];
    const edges = connectChain(['t1', 'w1', 'e1']);
    const result = validateBlueprint(nodes, edges);
    expect(result.warnings.filter((w) => w.code === 'W011')).toHaveLength(0);
  });

  it('classifies the mismatch as a warning, not an error', () => {
    const nodes = [createTriggerNode('t1'), createWorkNode('w1'), createEndNode('e1')];
    const edges = connectChain(['t1', 'w1', 'e1']);
    const result = validateBlueprint(nodes, edges, undefined, 'orchestrator');
    expect(result.errors.filter((e) => e.code === 'W011')).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === 'W011')).toBe(true);
  });
});

describe('W012 — no evals on a review-ready blueprint', () => {
  const chain = () => ({
    nodes: [createTriggerNode('t1'), createWorkNode('w1'), createEndNode('e1')],
    edges: connectChain(['t1', 'w1', 'e1']),
  });

  it('does not warn while the blueprint is a Draft', () => {
    const { nodes, edges } = chain();
    const result = validateBlueprint(nodes, edges, undefined, undefined, {
      status: 'Draft',
      evalCount: 0,
    });
    expect(result.warnings.filter((w) => w.code === 'W012')).toHaveLength(0);
  });

  it('warns once when the blueprint is In Review with no evals', () => {
    const { nodes, edges } = chain();
    const result = validateBlueprint(nodes, edges, undefined, undefined, {
      status: 'In Review',
      evalCount: 0,
    });
    const issues = result.warnings.filter((w) => w.code === 'W012');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(result.all.some((i) => i.code === 'W012')).toBe(true);
    expect(result.errors.some((e) => e.code === 'W012')).toBe(false);
  });

  it('warns when the blueprint is Approved with no evals', () => {
    const { nodes, edges } = chain();
    const result = validateBlueprint(nodes, edges, undefined, undefined, {
      status: 'Approved',
      evalCount: 0,
    });
    expect(result.warnings.filter((w) => w.code === 'W012')).toHaveLength(1);
  });

  it('does not warn below the node threshold', () => {
    const nodes = [createTriggerNode('t1'), createEndNode('e1')];
    const edges = connectChain(['t1', 'e1']);
    const result = validateBlueprint(nodes, edges, undefined, undefined, {
      status: 'In Review',
      evalCount: 0,
    });
    expect(result.warnings.filter((w) => w.code === 'W012')).toHaveLength(0);
  });

  it('does not warn once at least one eval exists', () => {
    const { nodes, edges } = chain();
    const result = validateBlueprint(nodes, edges, undefined, undefined, {
      status: 'In Review',
      evalCount: 1,
    });
    expect(result.warnings.filter((w) => w.code === 'W012')).toHaveLength(0);
  });

  it('never warns when the options argument is omitted', () => {
    const { nodes, edges } = chain();
    const result = validateBlueprint(nodes, edges);
    expect(result.warnings.filter((w) => w.code === 'W012')).toHaveLength(0);
  });

  it('does not make the blueprint invalid', () => {
    const { nodes, edges } = chain();
    const result = validateBlueprint(nodes, edges, undefined, undefined, {
      status: 'Approved',
      evalCount: 0,
    });
    expect(result.warnings.some((w) => w.code === 'W012')).toBe(true);
    expect(result.isValid).toBe(true);
  });
});
