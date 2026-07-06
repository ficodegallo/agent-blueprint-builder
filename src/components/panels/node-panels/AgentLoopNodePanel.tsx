import { IOListEditor } from '../../shared/IOListEditor';
import { AgentSpecSection } from './AgentSpecSection';
import { HitlPolicySection } from './HitlPolicySection';
import type { AgentLoopNodeData, AgentSpecFields, NodeData } from '../../../types';
import type { AppNode } from '../../../store/nodesStore';

interface Props {
  node: AppNode;
  updateNode: (id: string, data: Partial<NodeData>) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

export function AgentLoopNodePanel({ node, updateNode }: Props) {
  const data = node.data as AgentLoopNodeData;

  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
        <textarea
          value={data.goal}
          onChange={(e) => updateNode(node.id, { goal: e.target.value })}
          rows={3}
          placeholder="What should the agent accomplish before it stops?"
          className={inputClass}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Iterations</label>
          <input
            type="text"
            value={data.maxIterations}
            onChange={(e) => updateNode(node.id, { maxIterations: e.target.value })}
            placeholder="e.g. 25 steps"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Memory</label>
          <input
            type="text"
            value={data.memory}
            onChange={(e) => updateNode(node.id, { memory: e.target.value })}
            placeholder="e.g. scratchpad file"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mb-4">
        <IOListEditor
          label="Inputs"
          items={data.inputs || []}
          onChange={(inputs) => updateNode(node.id, { inputs })}
        />
      </div>
      <div className="mb-4">
        <IOListEditor
          label="Outputs"
          items={data.outputs || []}
          onChange={(outputs) => updateNode(node.id, { outputs })}
        />
      </div>

      <HitlPolicySection hitl={data.hitl} onChange={(hitl) => updateNode(node.id, { hitl })} />
      <AgentSpecSection
        data={data}
        onChange={(partial: Partial<AgentSpecFields>) => updateNode(node.id, partial)}
        defaultOpen
      />
    </>
  );
}
