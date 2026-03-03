import { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { useUIStore, useNodesStore, useParkingLotStore } from '../../store';
import type { ParkingLotStatus } from '../../types';

const ALL_STATUSES: ParkingLotStatus[] = ['Open', 'In Discussion', 'Awaiting Decision', 'Blocked', 'Resolved'];

const NODE_TYPE_COLORS: Record<string, string> = {
  trigger: 'text-emerald-500',
  work: 'text-blue-500',
  decision: 'text-amber-500',
  end: 'text-red-500',
  workflow: 'text-purple-500',
};

export function ParkingLotItemDialog() {
  const activeDialog = useUIStore((s) => s.activeDialog);
  const editingId = useUIStore((s) => s.editingParkingLotItemId);
  const closeDialog = useUIStore((s) => s.closeDialog);

  const items = useParkingLotStore((s) => s.items);
  const addItem = useParkingLotStore((s) => s.addItem);
  const updateItem = useParkingLotStore((s) => s.updateItem);
  const deleteItem = useParkingLotStore((s) => s.deleteItem);

  const nodes = useNodesStore((s) => s.nodes);

  const isOpen = activeDialog === 'parkingLotItem';
  const isEditing = !!editingId;
  const editingItem = isEditing ? items.find((i) => i.id === editingId) : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState<ParkingLotStatus>('Open');
  const [linkedNodeId, setLinkedNodeId] = useState<string>('');
  const [resolution, setResolution] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset form when dialog opens/closes or editing item changes
  useEffect(() => {
    if (isOpen && editingItem) {
      setTitle(editingItem.title);
      setDescription(editingItem.description);
      setOwner(editingItem.owner);
      setStatus(editingItem.status);
      setLinkedNodeId(editingItem.linkedNodeId || '');
      setResolution(editingItem.resolution);
    } else if (isOpen) {
      setTitle('');
      setDescription('');
      setOwner('');
      setStatus('Open');
      setLinkedNodeId('');
      setResolution('');
    }
    setShowDeleteConfirm(false);
  }, [isOpen, editingItem]);

  const handleSave = () => {
    if (!title.trim()) return;

    const data = {
      title: title.trim(),
      description: description.trim(),
      owner: owner.trim(),
      status,
      linkedNodeId: linkedNodeId || null,
      resolution: resolution.trim(),
    };

    if (isEditing && editingId) {
      updateItem(editingId, data);
    } else {
      addItem(data);
    }

    closeDialog();
  };

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    if (editingId) {
      deleteItem(editingId);
      closeDialog();
    }
  };

  // Sort nodes by type then name for the dropdown
  const sortedNodes = [...nodes].sort((a, b) => {
    const typeA = (a.data.nodeType as string) || '';
    const typeB = (b.data.nodeType as string) || '';
    const typeCompare = typeA.localeCompare(typeB);
    if (typeCompare !== 0) return typeCompare;
    return ((a.data.name as string) || '').localeCompare((b.data.name as string) || '');
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeDialog}
      title={isEditing ? 'Edit Parking Lot Item' : 'Add Parking Lot Item'}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be resolved?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional context or details..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Owner + Status (side by side) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Who is responsible?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ParkingLotStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Link To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link To</label>
          <select
            value={linkedNodeId}
            onChange={(e) => setLinkedNodeId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Blueprint Overall</option>
            {sortedNodes.map((node) => {
              const colorClass = NODE_TYPE_COLORS[node.data.nodeType] || 'text-gray-500';
              const typeLabel = node.data.nodeType === 'work'
                ? `${node.data.workerType}`
                : node.data.nodeType;
              return (
                <option key={node.id} value={node.id} className={colorClass}>
                  {node.data.name || node.id} ({typeLabel})
                </option>
              );
            })}
          </select>
        </div>

        {/* Resolution (shown/highlighted when status is Resolved) */}
        <div className={status === 'Resolved' ? 'bg-green-50 border border-green-200 rounded-md p-3' : ''}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resolution
            {status === 'Resolved' && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder={status === 'Resolved' ? 'How was this resolved?' : 'Resolution notes (optional)'}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div>
            {isEditing && (
              <button
                onClick={handleDelete}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  showDeleteConfirm
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'text-red-600 hover:bg-red-50'
                }`}
              >
                {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={closeDialog}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
