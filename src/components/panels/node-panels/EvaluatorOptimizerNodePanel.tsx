import { IOListEditor } from '../../shared/IOListEditor';
import { ListEditor } from '../../shared/ListEditor';
import { AgentSpecSection } from './AgentSpecSection';
import { HitlPolicySection } from './HitlPolicySection';
import type { AgentSpecFields, EvaluatorOptimizerNodeData, NodeData } from '../../../types';
import type { AppNode } from '../../../store/nodesStore';

interface Props {
  node: AppNode;
  updateNode: (id: string, data: Partial<NodeData>) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

export function EvaluatorOptimizerNodePanel({ node, updateNode }: Props) {
  const data = node.data as EvaluatorOptimizerNodeData;

  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
        <textarea
          value={data.goal}
          onChange={(e) => updateNode(node.id, { goal: e.target.value })}
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Generator
          <span className="block text-xs font-normal text-gray-400">What produces the candidate output</span>
        </label>
        <textarea
          value={data.generatorDescription}
          onChange={(e) => updateNode(node.id, { generatorDescription: e.target.value })}
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="mb-4">
        <ListEditor
          label="Evaluator Criteria"
          items={data.evaluatorCriteria || []}
          onChange={(evaluatorCriteria) => updateNode(node.id, { evaluatorCriteria })}
          placeholder="Verifiable check the evaluator scores against"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Pass Condition</label>
        <input
          type="text"
          value={data.passCondition}
          onChange={(e) => updateNode(node.id, { passCondition: e.target.value })}
          placeholder="e.g. All criteria met, or score >= 8/10"
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
            placeholder="e.g. 5 rounds"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">On Max Iterations</label>
          <input
            type="text"
            value={data.onMaxIterations}
            onChange={(e) => updateNode(node.id, { onMaxIterations: e.target.value })}
            placeholder="e.g. escalate to human"
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
      />
    </>
  );
}
