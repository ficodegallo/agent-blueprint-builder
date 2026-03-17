import { Plus, X } from 'lucide-react';
import type { AppNode } from '../../../store/nodesStore';
import type { NodeData } from '../../../types';

interface Props {
  node: AppNode;
  updateNode: (id: string, data: Partial<NodeData>) => void;
}

export function DecisionNodePanel({ node, updateNode }: Props) {
  const data = node.data;
  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          rows={3}
          placeholder="What condition determines the branch?"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Decision Branches</label>
        </div>

        {data.conditions && data.conditions.length > 0 && (
          <div className="space-y-2 mb-2">
            {data.conditions.map((condition, index) => (
              <div key={condition.id} className="border border-gray-200 rounded p-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={condition.label}
                    onChange={(e) => {
                      const newConditions = [...data.conditions];
                      newConditions[index] = { ...condition, label: e.target.value };
                      updateNode(node.id, { conditions: newConditions });
                    }}
                    placeholder="Branch label (e.g., Approved)"
                    className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {data.conditions.length > 2 && (
                    <button
                      onClick={() => {
                        const newConditions = data.conditions.filter((_, i) => i !== index);
                        updateNode(node.id, { conditions: newConditions });
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Remove branch"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <textarea
                  value={condition.description}
                  onChange={(e) => {
                    const newConditions = [...data.conditions];
                    newConditions[index] = { ...condition, description: e.target.value };
                    updateNode(node.id, { conditions: newConditions });
                  }}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            const newCondition = {
              id: `condition-${Date.now()}`,
              label: `Option ${(data.conditions?.length || 0) + 1}`,
              description: '',
            };
            const newConditions = [...(data.conditions || []), newCondition];
            updateNode(node.id, { conditions: newConditions });
          }}
          className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          Add Branch
        </button>

        <p className="text-xs text-gray-400 mt-1 italic">
          Add multiple decision branches (minimum 2 required)
        </p>
      </div>
    </>
  );
}
