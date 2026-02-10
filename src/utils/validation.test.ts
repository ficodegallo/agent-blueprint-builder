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
