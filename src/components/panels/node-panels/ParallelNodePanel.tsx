import { Plus, X } from 'lucide-react';
import type { JoinBehavior, NodeData, ParallelBranch, ParallelMode, ParallelNodeData } from '../../../types';
import type { AppNode } from '../../../store/nodesStore';

interface Props {
  node: AppNode;
  updateNode: (id: string, data: Partial<NodeData>) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

export function ParallelNodePanel({ node, updateNode }: Props) {
  const data = node.data as ParallelNodeData;
  const branches = data.branches || [];
  const isSplit = data.mode === 'split';

  const updateBranch = (index: number, partial: Partial<ParallelBranch>) => {
    const next = [...branches];
    next[index] = { ...next[index], ...partial };
    updateNode(node.id, { branches: next });
  };

  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
        <select
          value={data.mode}
          onChange={(e) => updateNode(node.id, { mode: e.target.value as ParallelMode })}
          className={inputClass}
        >
          <option value="split">Split — fan work out across branches</option>
          <option value="join">Join — wait for branches and merge</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          rows={2}
          className={inputClass}
        />
      </div>

      {isSplit && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Branches</label>
          <div className="space-y-2 mb-2">
            {branches.map((branch, index) => (
              <div key={branch.id} className="border border-gray-200 rounded p-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={branch.label}
                    onChange={(e) => updateBranch(index, { label: e.target.value })}
                    placeholder="Branch label"
                    className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {branches.length > 2 && (
                    <button
                      onClick={() =>
                        updateNode(node.id, { branches: branches.filter((_, i) => i !== index) })
                      }
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Remove branch"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <textarea
                  value={branch.description}
                  onChange={(e) => updateBranch(index, { description: e.target.value })}
                  placeholder="What runs on this branch (optional)"
                  rows={2}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            ))}
          </div>
          <button
            onClick={() =>
              updateNode(node.id, {
                branches: [
                  ...branches,
                  { id: `branch-${Date.now()}`, label: `Branch ${branches.length + 1}`, description: '' },
                ],
              })
            }
            className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus size={14} />
            Add Branch
          </button>
        </div>
      )}

      {!isSplit && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Join Behavior</label>
          <select
            value={data.joinBehavior}
            onChange={(e) => updateNode(node.id, { joinBehavior: e.target.value as JoinBehavior })}
            className={inputClass}
          >
            <option value="wait-all">Wait for all branches</option>
            <option value="wait-any">Continue on first result</option>
            <option value="merge-results">Merge branch results</option>
          </select>
        </div>
      )}
    </>
  );
}
