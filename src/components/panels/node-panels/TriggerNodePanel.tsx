import type { AppNode } from '../../../store/nodesStore';
import type { NodeData } from '../../../types';

interface Props {
  node: AppNode;
  updateNode: (id: string, data: Partial<NodeData>) => void;
}

export function TriggerNodePanel({ node, updateNode }: Props) {
  const data = node.data;
  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type</label>
        <select
          value={data.triggerType}
          onChange={(e) => updateNode(node.id, { triggerType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="event">Event</option>
          <option value="scheduled">Scheduled</option>
          <option value="manual">Manual</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </>
  );
}
