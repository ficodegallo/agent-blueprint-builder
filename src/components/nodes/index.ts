import { TriggerNode } from './TriggerNode';
import { WorkNode } from './WorkNode';
import { DecisionNode } from './DecisionNode';
import { EndNode } from './EndNode';
import { WorkflowNode } from './WorkflowNode';

// Node type registry for React Flow
export const nodeTypes = {
  trigger: TriggerNode,
  work: WorkNode,
  decision: DecisionNode,
  end: EndNode,
  workflow: WorkflowNode,
} as const;

export { TriggerNode, WorkNode, DecisionNode, EndNode, WorkflowNode };
