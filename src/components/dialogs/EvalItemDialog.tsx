import { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { useUIStore, useNodesStore, useEvalsStore } from '../../store';
import {
  EVAL_DIMENSIONS,
  EVAL_DIMENSION_DESCRIPTIONS,
  EVAL_DIMENSION_LABELS,
  EVAL_GRADER_LABELS,
  EVAL_GRADER_TYPES,
  EVAL_PRIORITIES,
  type EvalDimension,
  type EvalGraderType,
  type EvalPriority,
} from '../../types';

export function EvalItemDialog() {
  const activeDialog = useUIStore((s) => s.activeDialog);
  const editingId = useUIStore((s) => s.editingEvalItemId);
  const closeDialog = useUIStore((s) => s.closeDialog);

  const items = useEvalsStore((s) => s.items);
  const addItem = useEvalsStore((s) => s.addItem);
  const updateItem = useEvalsStore((s) => s.updateItem);
  const deleteItem = useEvalsStore((s) => s.deleteItem);

  const nodes = useNodesStore((s) => s.nodes);

  const isOpen = activeDialog === 'evalItem';
  const isEditing = !!editingId;
  const editingItem = isEditing ? items.find((i) => i.id === editingId) : null;

  const [title, setTitle] = useState('');
  const [dimension, setDimension] = useState<EvalDimension>('outcome');
  const [graderType, setGraderType] = useState<EvalGraderType>('deterministic');
  const [question, setQuestion] = useState('');
  const [passCriteria, setPassCriteria] = useState('');
  const [dataNeeded, setDataNeeded] = useState('');
  const [failureMode, setFailureMode] = useState('');
  const [priority, setPriority] = useState<EvalPriority>('medium');
  const [linkedNodeId, setLinkedNodeId] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && editingItem) {
      setTitle(editingItem.title);
      setDimension(editingItem.dimension);
      setGraderType(editingItem.graderType);
      setQuestion(editingItem.question);
      setPassCriteria(editingItem.passCriteria);
      setDataNeeded(editingItem.dataNeeded);
      setFailureMode(editingItem.failureMode);
      setPriority(editingItem.priority);
      setLinkedNodeId(editingItem.linkedNodeId || '');
    } else if (isOpen) {
      setTitle('');
      setDimension('outcome');
      setGraderType('deterministic');
      setQuestion('');
      setPassCriteria('');
      setDataNeeded('');
      setFailureMode('');
      setPriority('medium');
      setLinkedNodeId('');
    }
    setShowDeleteConfirm(false);
  }, [isOpen, editingItem]);

  const canSave = title.trim().length > 0 && question.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;

    const data = {
      title: title.trim(),
      dimension,
      graderType,
      question: question.trim(),
      passCriteria: passCriteria.trim(),
      dataNeeded: dataNeeded.trim(),
      failureMode: failureMode.trim(),
      priority,
      linkedNodeId: linkedNodeId || null,
    };

    if (isEditing && editingId) {
      // Editing a proposal from the review list also accepts it.
      const status = editingItem?.status === 'proposed' ? ('accepted' as const) : undefined;
      updateItem(editingId, status ? { ...data, status } : data);
    } else {
      addItem({ ...data, status: 'accepted', origin: 'manual' });
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

  const sortedNodes = [...nodes].sort((a, b) => {
    const typeCompare = ((a.data.nodeType as string) || '').localeCompare(
      (b.data.nodeType as string) || ''
    );
    if (typeCompare !== 0) return typeCompare;
    return ((a.data.name as string) || '').localeCompare((b.data.name as string) || '');
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeDialog}
      title={isEditing ? 'Edit Eval' : 'Add Eval'}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short name, e.g. Refund routing accuracy"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question <span className="text-red-500">*</span>
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="One binary pass/fail question, e.g. Did every refund over $500 reach the approval gate?"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            One criterion, answerable pass or fail. Two things that can fail separately are two
            evals.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dimension</label>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value as EvalDimension)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {EVAL_DIMENSIONS.map((d) => (
                <option key={d} value={d}>
                  {EVAL_DIMENSION_LABELS[d]}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">{EVAL_DIMENSION_DESCRIPTIONS[dimension]}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grader</label>
            <select
              value={graderType}
              onChange={(e) => setGraderType(e.target.value as EvalGraderType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {EVAL_GRADER_TYPES.map((g) => (
                <option key={g} value={g}>
                  {EVAL_GRADER_LABELS[g]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as EvalPriority)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {EVAL_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pass criteria</label>
          <textarea
            value={passCriteria}
            onChange={(e) => setPassCriteria(e.target.value)}
            placeholder="What counts as a pass, checkable by someone who was not in the room"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data needed</label>
          <textarea
            value={dataNeeded}
            onChange={(e) => setDataNeeded(e.target.value)}
            placeholder="Which test cases, traces or fixtures — how many, and what has to be labeled"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Failure mode</label>
          <textarea
            value={failureMode}
            onChange={(e) => setFailureMode(e.target.value)}
            placeholder="The concrete failure in this workflow that this eval protects against"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
          <select
            value={linkedNodeId}
            onChange={(e) => setLinkedNodeId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Blueprint Overall</option>
            {sortedNodes.map((node) => {
              const typeLabel =
                node.data.nodeType === 'work' ? `${node.data.workerType}` : node.data.nodeType;
              return (
                <option key={node.id} value={node.id}>
                  {(node.data.name as string) || node.id} ({typeLabel})
                </option>
              );
            })}
          </select>
        </div>

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
              disabled={!canSave}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Add Eval'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
