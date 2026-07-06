import { Plus, X } from 'lucide-react';
import type { NodeData, RouteCondition, RouterNodeData } from '../../../types';
import type { AppNode } from '../../../store/nodesStore';

interface Props {
  node: AppNode;
  updateNode: (id: string, data: Partial<NodeData>) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

export function RouterNodePanel({ node, updateNode }: Props) {
  const data = node.data as RouterNodeData;
  const routes = data.routes || [];

  const updateRoute = (index: number, partial: Partial<RouteCondition>) => {
    const next = [...routes];
    next[index] = { ...next[index], ...partial };
    updateNode(node.id, { routes: next });
  };

  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          rows={2}
          placeholder="What is being routed, and why routes differ"
          className={inputClass}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Classifier Instructions
          <span className="block text-xs font-normal text-gray-400">
            How the model should decide which route an item takes
          </span>
        </label>
        <textarea
          value={data.classifierInstructions}
          onChange={(e) => updateNode(node.id, { classifierInstructions: e.target.value })}
          rows={3}
          className={inputClass}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Routes</label>
        <div className="space-y-2 mb-2">
          {routes.map((route, index) => (
            <div key={route.id} className="border border-gray-200 rounded p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={route.label}
                  onChange={(e) => updateRoute(index, { label: e.target.value })}
                  placeholder="Route label (e.g. Complex)"
                  className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {routes.length > 2 && (
                  <button
                    onClick={() =>
                      updateNode(node.id, { routes: routes.filter((_, i) => i !== index) })
                    }
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Remove route"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <textarea
                value={route.description}
                onChange={(e) => updateRoute(index, { description: e.target.value })}
                placeholder="What belongs on this route — the classifier reads this"
                rows={2}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            updateNode(node.id, {
              routes: [
                ...routes,
                {
                  id: `route-${Date.now()}`,
                  label: `Route ${routes.length + 1}`,
                  description: '',
                },
              ],
            })
          }
          className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          Add Route
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fallback Route
          <span className="block text-xs font-normal text-gray-400">
            Where items go when classification is uncertain
          </span>
        </label>
        <select
          value={data.fallbackRoute}
          onChange={(e) => updateNode(node.id, { fallbackRoute: e.target.value })}
          className={inputClass}
        >
          <option value="">— none —</option>
          {routes.map((route) => (
            <option key={route.id} value={route.label}>
              {route.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
