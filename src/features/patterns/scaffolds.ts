import type { SerializedNode, BlueprintEdge, NodeData } from '../../types';
import type { OrchestrationPatternId } from './types';
import {
  createTriggerNodeData,
  createEndNodeData,
  createWorkNodeData,
  createRouterNodeData,
  createParallelNodeData,
  createOrchestratorNodeData,
  createEvaluatorOptimizerNodeData,
  createAgentLoopNodeData,
  createOrchestratorWorker,
} from '../../types/nodes';

export interface PatternScaffold {
  nodes: SerializedNode[];
  edges: BlueprintEdge[];
}

// Layout constants — mirror the Smart Import left-to-right flow spacing.
const COL = 280;
const ROW = 170;
const BASE_X = 120;
const BASE_Y = 240;

function node(id: string, x: number, y: number, data: NodeData): SerializedNode {
  return { id, type: data.nodeType, position: { x, y }, data };
}

function edge(source: string, target: string, sourceHandle?: string, label?: string): BlueprintEdge {
  return {
    id: `edge-${source}-${target}${sourceHandle ? `-${sourceHandle}` : ''}`,
    source,
    target,
    ...(sourceHandle ? { sourceHandle } : {}),
    data: { conditionLabel: label ?? '', description: '' },
  };
}

/**
 * Build a minimal, editable starter graph for the given pattern. Every
 * scaffold begins at a trigger and ends at an end node so the result passes
 * the trigger/end validation rules; the user edits freely from there.
 */
export function scaffoldPattern(id: OrchestrationPatternId): PatternScaffold {
  switch (id) {
    case 'pipeline': {
      const t = node('trigger-1', BASE_X, BASE_Y, createTriggerNodeData({ name: 'Process starts' }));
      const w1 = node(
        'work-1',
        BASE_X + COL,
        BASE_Y,
        createWorkNodeData({ name: 'Step 1', goal: '' })
      );
      const w2 = node(
        'work-2',
        BASE_X + COL * 2,
        BASE_Y,
        createWorkNodeData({ name: 'Step 2', goal: '' })
      );
      const e = node('end-1', BASE_X + COL * 3, BASE_Y, createEndNodeData({ name: 'Done' }));
      return {
        nodes: [t, w1, w2, e],
        edges: [edge('trigger-1', 'work-1'), edge('work-1', 'work-2'), edge('work-2', 'end-1')],
      };
    }

    case 'routing': {
      const t = node('trigger-1', BASE_X, BASE_Y, createTriggerNodeData({ name: 'Request arrives' }));
      const r = node(
        'router-1',
        BASE_X + COL,
        BASE_Y,
        createRouterNodeData({
          name: 'Classify & route',
          routes: [
            { id: 'route-a', label: 'Category A', description: 'What belongs on this route' },
            { id: 'route-b', label: 'Category B', description: 'What belongs on this route' },
          ],
          fallbackRoute: 'Category A',
        })
      );
      const wA = node('work-a', BASE_X + COL * 2, BASE_Y - ROW, createWorkNodeData({ name: 'Handle Category A' }));
      const wB = node('work-b', BASE_X + COL * 2, BASE_Y + ROW, createWorkNodeData({ name: 'Handle Category B' }));
      const e = node('end-1', BASE_X + COL * 3, BASE_Y, createEndNodeData({ name: 'Done' }));
      return {
        nodes: [t, r, wA, wB, e],
        edges: [
          edge('trigger-1', 'router-1'),
          edge('router-1', 'work-a', 'route-a', 'Category A'),
          edge('router-1', 'work-b', 'route-b', 'Category B'),
          edge('work-a', 'end-1'),
          edge('work-b', 'end-1'),
        ],
      };
    }

    case 'parallel': {
      const t = node('trigger-1', BASE_X, BASE_Y, createTriggerNodeData({ name: 'Process starts' }));
      const split = node(
        'parallel-split',
        BASE_X + COL,
        BASE_Y,
        createParallelNodeData({
          name: 'Split',
          mode: 'split',
          branches: [
            { id: 'branch-a', label: 'Branch A', description: 'Independent subtask A' },
            { id: 'branch-b', label: 'Branch B', description: 'Independent subtask B' },
          ],
        })
      );
      const wA = node('work-a', BASE_X + COL * 2, BASE_Y - ROW, createWorkNodeData({ name: 'Subtask A' }));
      const wB = node('work-b', BASE_X + COL * 2, BASE_Y + ROW, createWorkNodeData({ name: 'Subtask B' }));
      const join = node(
        'parallel-join',
        BASE_X + COL * 3,
        BASE_Y,
        createParallelNodeData({ name: 'Join', mode: 'join', joinBehavior: 'wait-all' })
      );
      const e = node('end-1', BASE_X + COL * 4, BASE_Y, createEndNodeData({ name: 'Done' }));
      return {
        nodes: [t, split, wA, wB, join, e],
        edges: [
          edge('trigger-1', 'parallel-split'),
          edge('parallel-split', 'work-a'),
          edge('parallel-split', 'work-b'),
          edge('work-a', 'parallel-join'),
          edge('work-b', 'parallel-join'),
          edge('parallel-join', 'end-1'),
        ],
      };
    }

    case 'orchestrator': {
      const t = node('trigger-1', BASE_X, BASE_Y, createTriggerNodeData({ name: 'Task arrives' }));
      const o = node(
        'orchestrator-1',
        BASE_X + COL,
        BASE_Y,
        createOrchestratorNodeData({
          name: 'Manager agent',
          terminationCondition: 'All delegated subtasks complete and synthesized',
          workers: [
            createOrchestratorWorker({ name: 'Worker 1', description: 'What this worker handles and when' }),
            createOrchestratorWorker({ name: 'Worker 2', description: 'What this worker handles and when' }),
          ],
        })
      );
      const e = node('end-1', BASE_X + COL * 2, BASE_Y, createEndNodeData({ name: 'Done' }));
      return {
        nodes: [t, o, e],
        edges: [edge('trigger-1', 'orchestrator-1'), edge('orchestrator-1', 'end-1')],
      };
    }

    case 'evaluator': {
      const t = node('trigger-1', BASE_X, BASE_Y, createTriggerNodeData({ name: 'Process starts' }));
      const ev = node(
        'evaluator-1',
        BASE_X + COL,
        BASE_Y,
        createEvaluatorOptimizerNodeData({
          name: 'Generate & evaluate',
          evaluatorCriteria: ['Define what "good enough" means here'],
          passCondition: 'All criteria met',
          onMaxIterations: 'Escalate to a human reviewer',
        })
      );
      const e = node('end-1', BASE_X + COL * 2, BASE_Y, createEndNodeData({ name: 'Done' }));
      return {
        nodes: [t, ev, e],
        edges: [edge('trigger-1', 'evaluator-1'), edge('evaluator-1', 'end-1')],
      };
    }

    case 'agent': {
      const t = node('trigger-1', BASE_X, BASE_Y, createTriggerNodeData({ name: 'Task arrives' }));
      const a = node(
        'agent-1',
        BASE_X + COL,
        BASE_Y,
        createAgentLoopNodeData({
          name: 'Autonomous agent',
          stopCondition: 'Goal achieved or a checkpoint is reached',
          skills: ['Name the skills this agent needs for the process'],
        })
      );
      const e = node('end-1', BASE_X + COL * 2, BASE_Y, createEndNodeData({ name: 'Done' }));
      return {
        nodes: [t, a, e],
        edges: [edge('trigger-1', 'agent-1'), edge('agent-1', 'end-1')],
      };
    }

    default: {
      // Exhaustiveness guard — a new pattern id must add a scaffold above.
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
