import { TriggerNode } from './TriggerNode';
import { WorkNode } from './WorkNode';
import { DecisionNode } from './DecisionNode';
import { EndNode } from './EndNode';
import { WorkflowNode } from './WorkflowNode';
import { OrchestratorNode } from './OrchestratorNode';
import { AgentLoopNode } from './AgentLoopNode';
import { RouterNode } from './RouterNode';
import { ParallelNode } from './ParallelNode';
import { EvaluatorOptimizerNode } from './EvaluatorOptimizerNode';

// Node type registry for React Flow
export const nodeTypes = {
  trigger: TriggerNode,
  work: WorkNode,
  decision: DecisionNode,
  end: EndNode,
  workflow: WorkflowNode,
  orchestrator: OrchestratorNode,
  agentLoop: AgentLoopNode,
  router: RouterNode,
  parallel: ParallelNode,
  evaluatorOptimizer: EvaluatorOptimizerNode,
} as const;

export {
  TriggerNode,
  WorkNode,
  DecisionNode,
  EndNode,
  WorkflowNode,
  OrchestratorNode,
  AgentLoopNode,
  RouterNode,
  ParallelNode,
  EvaluatorOptimizerNode,
};
