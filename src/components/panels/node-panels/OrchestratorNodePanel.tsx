import { Plus, X } from 'lucide-react';
import { IOListEditor } from '../../shared/IOListEditor';
import { AgentSpecSection } from './AgentSpecSection';
import { HitlPolicySection } from './HitlPolicySection';
import {
  createOrchestratorWorker,
  type AgentSpecFields,
  type NodeData,
  type OrchestratorNodeData,
  type OrchestratorWorker,
} from '../../../types';
import type { AppNode } from '../../../store/nodesStore';

interface Props {
  node: AppNode;
  updateNode: (id: string, data: Partial<NodeData>) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

export function OrchestratorNodePanel({ node, updateNode }: Props) {
  const data = node.data as OrchestratorNodeData;
  const workers = data.workers || [];

  const updateWorker = (index: number, partial: Partial<OrchestratorWorker>) => {
    const next = [...workers];
    next[index] = { ...next[index], ...partial };
    updateNode(node.id, { workers: next });
  };

  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
        <textarea
          value={data.goal}
          onChange={(e) => updateNode(node.id, { goal: e.target.value })}
          rows={3}
          placeholder="What outcome should the orchestrated work achieve?"
          className={inputClass}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Delegation Strategy
          <span className="block text-xs font-normal text-gray-400">
            How the manager decomposes work and picks workers
          </span>
        </label>
        <textarea
          value={data.delegationStrategy}
          onChange={(e) => updateNode(node.id, { delegationStrategy: e.target.value })}
          rows={3}
          className={inputClass}
        />
      </div>

      {/* Worker pool */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Worker Pool
          <span className="block text-xs font-normal text-gray-400">
            Workers are invoked dynamically by the manager, not by fixed control flow
          </span>
        </label>
        <div className="space-y-2 mb-2">
          {workers.map((worker, index) => (
            <div key={worker.id} className="border border-gray-200 rounded p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={worker.name}
                  onChange={(e) => updateWorker(index, { name: e.target.value })}
                  placeholder="Worker name"
                  className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() =>
                    updateNode(node.id, { workers: workers.filter((_, i) => i !== index) })
                  }
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Remove worker"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                value={worker.description}
                onChange={(e) => updateWorker(index, { description: e.target.value })}
                placeholder="What this worker handles and when the manager should pick it"
                rows={2}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <input
                type="text"
                value={worker.skills.join(', ')}
                onChange={(e) =>
                  updateWorker(index, {
                    skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Skills (comma-separated)"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            updateNode(node.id, { workers: [...workers, createOrchestratorWorker()] })
          }
          className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          Add Worker
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Synthesis
          <span className="block text-xs font-normal text-gray-400">
            How worker outputs combine into the final result
          </span>
        </label>
        <textarea
          value={data.synthesis}
          onChange={(e) => updateNode(node.id, { synthesis: e.target.value })}
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Termination Condition</label>
        <textarea
          value={data.terminationCondition}
          onChange={(e) => updateNode(node.id, { terminationCondition: e.target.value })}
          rows={2}
          placeholder="When does the manager stop delegating? Required — open-ended loops are a common failure mode."
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
            placeholder="e.g. 10 rounds"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
          <input
            type="text"
            value={data.budget}
            onChange={(e) => updateNode(node.id, { budget: e.target.value })}
            placeholder="e.g. $5 / run"
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
