import { useState } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle, AlertTriangle, ExternalLink, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNodesStore, useUIStore } from '../../store';
import { useBlueprintsLibraryStore } from '../../store/blueprintsLibraryStore';
import { NodeComments } from './NodeComments';
import { ListEditor } from '../shared/ListEditor';
import { IOListEditor } from '../shared/IOListEditor';
import { IntegrationDetailsDialog } from './IntegrationDetailsDialog';
import { useTaskAutoOrder } from '../../hooks/useTaskAutoOrder';
import { useGoalEvaluate } from '../../hooks/useGoalEvaluate';
import { migrateIntegrations, type IntegrationDetail } from '../../types';

export function DetailPanel() {
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const selectNode = useUIStore((state) => state.selectNode);
  const openDialog = useUIStore((state) => state.openDialog);
  const getNode = useNodesStore((state) => state.getNode);
  const updateNode = useNodesStore((state) => state.updateNode);
  const navigate = useNavigate();
  const getBlueprintSummaries = useBlueprintsLibraryStore((state) => state.getBlueprintSummaries);

  // State for integration dialog
  const [editingIntegration, setEditingIntegration] = useState<{
    integration: IntegrationDetail;
    index: number;
  } | null>(null);
  const [isIntegrationDialogOpen, setIsIntegrationDialogOpen] = useState(false);

  // Auto-order hook for tasks
  const { autoOrderTasks, isOrdering, error: autoOrderError, clearError } = useTaskAutoOrder();

  // Goal evaluate hook
  const {
    evaluateGoal,
    isEvaluating,
    suggestedGoal,
    error: goalEvalError,
    clearError: clearGoalEvalError,
    clearSuggestion,
  } = useGoalEvaluate();

  // Get saved blueprints for workflow linking
  const savedBlueprints = getBlueprintSummaries();

  const selectedNode = selectedNodeId ? getNode(selectedNodeId) : null;

  // Handle auto-ordering of tasks
  const handleAutoOrderTasks = async () => {
    console.log('handleAutoOrderTasks called');
    if (!selectedNode || selectedNode.data.nodeType !== 'work') {
      console.log('Invalid node or not a work node');
      return;
    }

    const data = selectedNode.data;
    console.log('Calling autoOrderTasks with:', {
      taskCount: data.tasks.length,
      goal: data.goal,
      inputCount: data.inputs.length,
      outputCount: data.outputs.length,
    });

    const reorderedTasks = await autoOrderTasks({
      tasks: data.tasks,
      goal: data.goal,
      inputs: data.inputs,
      outputs: data.outputs,
    });

    if (reorderedTasks) {
      console.log('Updating node with reordered tasks:', reorderedTasks);
      updateNode(selectedNode.id, { tasks: reorderedTasks });
    } else {
      console.log('No reordered tasks returned');
    }
  };

  // Handle goal evaluation
  const handleEvaluateGoal = async () => {
    if (!selectedNode || selectedNode.data.nodeType !== 'work') return;
    const data = selectedNode.data;
    await evaluateGoal({
      nodeName: data.name,
      goal: data.goal,
      tasks: data.tasks,
      inputs: data.inputs,
      outputs: data.outputs,
    });
  };

  if (!selectedNode) {
    return (
      <div className="p-4">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          Node Details
        </h2>
        <p className="text-sm text-gray-400">Select a node to view and edit its details</p>
      </div>
    );
  }

  const data = selectedNode.data;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Node Details
        </h2>
        <button
          onClick={() => selectNode(null)}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <X size={16} />
        </button>
      </div>

      {/* Name field - common to all nodes */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Type-specific fields */}
      {data.nodeType === 'trigger' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type</label>
            <select
              value={data.triggerType}
              onChange={(e) => updateNode(selectedNode.id, { triggerType: e.target.value })}
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
              onChange={(e) => updateNode(selectedNode.id, { description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </>
      )}

      {data.nodeType === 'work' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Worker Type</label>
            <select
              value={data.workerType}
              onChange={(e) => updateNode(selectedNode.id, { workerType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="agent">Agent</option>
              <option value="automation">Automation</option>
              <option value="human">Human</option>
            </select>
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Goal</label>
              {data.goal.trim() && (
                <button
                  onClick={handleEvaluateGoal}
                  disabled={isEvaluating}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Evaluate goal with AI"
                >
                  <Sparkles size={12} />
                  {isEvaluating ? 'Evaluating...' : 'Evaluate'}
                </button>
              )}
            </div>
            <textarea
              value={data.goal}
              onChange={(e) => {
                updateNode(selectedNode.id, { goal: e.target.value });
                clearSuggestion();
                clearGoalEvalError();
              }}
              rows={2}
              placeholder="What outcome should this node achieve?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {/* Goal evaluation error */}
            {goalEvalError && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{goalEvalError}</p>
                {goalEvalError.includes('API key') && (
                  <button
                    onClick={() => {
                      clearGoalEvalError();
                      openDialog('smartImport');
                    }}
                    className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                  >
                    Configure API Key
                  </button>
                )}
              </div>
            )}

            {/* Goal evaluation suggestion */}
            {suggestedGoal && (
              <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                {/* Rating badge */}
                <div className="flex items-center gap-2 mb-2">
                  {suggestedGoal.rating === 'strong' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3" />
                      Strong
                    </span>
                  )}
                  {suggestedGoal.rating === 'moderate' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      <AlertTriangle className="w-3 h-3" />
                      Moderate
                    </span>
                  )}
                  {suggestedGoal.rating === 'weak' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      <AlertCircle className="w-3 h-3" />
                      Weak
                    </span>
                  )}
                </div>

                {/* Reasoning */}
                <p className="text-xs text-gray-600 mb-2">{suggestedGoal.reasoning}</p>

                {/* Suggested goal */}
                <div className="mb-2">
                  <label className="block text-xs font-medium text-purple-700 mb-1">Suggested Goal</label>
                  <div className="w-full px-3 py-2 bg-white border border-purple-200 rounded-md text-sm text-gray-800">
                    {suggestedGoal.suggestion}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      updateNode(selectedNode.id, { goal: suggestedGoal.suggestion });
                      clearSuggestion();
                    }}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={clearSuggestion}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Inputs, Tasks, Outputs */}
          <IOListEditor
            label="Inputs"
            items={data.inputs}
            onChange={(inputs) => updateNode(selectedNode.id, { inputs })}
            placeholder="Add input..."
          />
          <ListEditor
            label="Tasks"
            items={data.tasks}
            onChange={(tasks) => {
              updateNode(selectedNode.id, { tasks });
              clearError();
            }}
            placeholder="Add task..."
            showAutoOrder={true}
            onAutoOrder={handleAutoOrderTasks}
            isAutoOrdering={isOrdering}
            suggestions={[
              ...data.inputs.map((input) => input.name),
              ...data.outputs.map((output) => output.name),
            ]}
          />
          {autoOrderError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{autoOrderError}</p>
              {autoOrderError.includes('API key') && (
                <button
                  onClick={() => {
                    clearError();
                    openDialog('smartImport');
                  }}
                  className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                >
                  Configure API Key
                </button>
              )}
            </div>
          )}
          <IOListEditor
            label="Outputs"
            items={data.outputs}
            onChange={(outputs) => updateNode(selectedNode.id, { outputs })}
            placeholder="Add output..."
          />
          {/* Enhanced Integrations Section */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Integrations</label>

            {/* Existing integrations list */}
            {data.integrations.length > 0 && (
              <div className="space-y-2 mb-2">
                {migrateIntegrations(data.integrations).map((integration, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{integration.name}</div>
                      {integration.action && (
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{integration.action}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        onClick={() => {
                          setEditingIntegration({ integration, index });
                          setIsIntegrationDialogOpen(true);
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        Details
                      </button>
                      <button
                        onClick={() => {
                          const updated = [...data.integrations];
                          updated.splice(index, 1);
                          updateNode(selectedNode.id, { integrations: updated });
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Remove integration"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new integration */}
            <button
              onClick={() => {
                const newIntegration: IntegrationDetail = {
                  name: `Integration ${data.integrations.length + 1}`,
                  action: '',
                  inputs: [],
                  outputs: [],
                  apiEndpoints: [],
                };
                setEditingIntegration({
                  integration: newIntegration,
                  index: data.integrations.length,
                });
                setIsIntegrationDialogOpen(true);
              }}
              className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Integration
            </button>

            {data.integrations.length === 0 && (
              <p className="text-xs text-gray-400 mt-2 italic">No integrations configured</p>
            )}
          </div>
        </>
      )}

      {data.nodeType === 'decision' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={data.description}
              onChange={(e) => updateNode(selectedNode.id, { description: e.target.value })}
              rows={3}
              placeholder="What condition determines the branch?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Decision Conditions */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Decision Branches</label>
            </div>

            {/* Existing conditions */}
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
                          updateNode(selectedNode.id, { conditions: newConditions });
                        }}
                        placeholder="Branch label (e.g., Approved)"
                        className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {data.conditions.length > 2 && (
                        <button
                          onClick={() => {
                            const newConditions = data.conditions.filter((_, i) => i !== index);
                            updateNode(selectedNode.id, { conditions: newConditions });
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
                        updateNode(selectedNode.id, { conditions: newConditions });
                      }}
                      placeholder="Description (optional)"
                      rows={2}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Add new condition */}
            <button
              onClick={() => {
                const newCondition = {
                  id: `condition-${Date.now()}`,
                  label: `Option ${(data.conditions?.length || 0) + 1}`,
                  description: '',
                };
                const newConditions = [...(data.conditions || []), newCondition];
                updateNode(selectedNode.id, { conditions: newConditions });
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
      )}

      {data.nodeType === 'end' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={data.description}
              onChange={(e) => updateNode(selectedNode.id, { description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
            <textarea
              value={data.outcome}
              onChange={(e) => updateNode(selectedNode.id, { outcome: e.target.value })}
              rows={2}
              placeholder="What is the result of reaching this end state?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </>
      )}

      {data.nodeType === 'workflow' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={data.description}
              onChange={(e) => updateNode(selectedNode.id, { description: e.target.value })}
              rows={2}
              placeholder="What does this workflow do?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Workflow Reference */}
          <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <label className="block text-sm font-medium text-purple-700 mb-2">
              Referenced Workflow
            </label>

            {/* Link to existing blueprint */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Link to Existing Blueprint
              </label>
              <select
                value={data.workflowId || ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (selectedId) {
                    const blueprint = savedBlueprints.find((bp) => bp.id === selectedId);
                    if (blueprint) {
                      updateNode(selectedNode.id, {
                        workflowId: blueprint.id,
                        workflowName: blueprint.title,
                      });
                    }
                  } else {
                    updateNode(selectedNode.id, {
                      workflowId: '',
                      workflowName: '',
                    });
                  }
                }}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">-- Select a blueprint --</option>
                {savedBlueprints.map((bp) => (
                  <option key={bp.id} value={bp.id}>
                    {bp.title} ({bp.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Workflow Name</label>
              <input
                type="text"
                value={data.workflowName}
                onChange={(e) => updateNode(selectedNode.id, { workflowName: e.target.value })}
                placeholder="Enter workflow name"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Workflow ID</label>
              <input
                type="text"
                value={data.workflowId}
                onChange={(e) => updateNode(selectedNode.id, { workflowId: e.target.value })}
                placeholder="Enter workflow ID or leave blank"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-xs"
                readOnly
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Version</label>
              <input
                type="text"
                value={data.version}
                onChange={(e) => updateNode(selectedNode.id, { version: e.target.value })}
                placeholder="e.g., 1.0"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Open workflow button */}
            {data.workflowId && (
              <button
                onClick={() => {
                  if (confirm('Open the linked workflow? Current blueprint will be saved automatically.')) {
                    navigate(`/blueprint/${data.workflowId}`);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <ExternalLink size={16} />
                Open Linked Workflow
              </button>
            )}
          </div>

          {/* Inputs and Outputs */}
          <IOListEditor
            label="Inputs (passed to workflow)"
            items={data.inputs}
            onChange={(inputs) => updateNode(selectedNode.id, { inputs })}
            placeholder="Add input..."
          />
          <IOListEditor
            label="Outputs (returned from workflow)"
            items={data.outputs}
            onChange={(outputs) => updateNode(selectedNode.id, { outputs })}
            placeholder="Add output..."
          />
        </>
      )}

      {/* AI Generation Info */}
      {data.ai_generated && (
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">AI Generated</span>
          </div>

          {/* Confidence Badge */}
          {data.ai_confidence && (
            <div className="mb-2">
              <span className="text-xs text-gray-500 mr-2">Confidence:</span>
              {data.ai_confidence === 'high' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3" />
                  High
                </span>
              )}
              {data.ai_confidence === 'medium' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                  <AlertTriangle className="w-3 h-3" />
                  Medium
                </span>
              )}
              {data.ai_confidence === 'low' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <AlertCircle className="w-3 h-3" />
                  Low
                </span>
              )}
            </div>
          )}

          {/* AI Notes */}
          {data.ai_notes && (
            <div className="mt-2">
              <span className="text-xs text-gray-500 block mb-1">AI Notes:</span>
              <p className="text-xs text-gray-600 bg-white/50 rounded p-2 border border-purple-100">
                {data.ai_notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Comments section */}
      <NodeComments nodeId={selectedNode.id} />

      {/* Node info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-400">
          <div>Node ID: {selectedNode.id.slice(0, 8)}...</div>
          <div>Type: {data.nodeType}</div>
          {data.ai_generated && <div>Source: AI Generated</div>}
        </div>
      </div>

      {/* Integration Details Dialog */}
      {editingIntegration && data.nodeType === 'work' && (
        <IntegrationDetailsDialog
          isOpen={isIntegrationDialogOpen}
          onClose={() => {
            setIsIntegrationDialogOpen(false);
            setEditingIntegration(null);
          }}
          integration={editingIntegration.integration}
          nodeInputs={data.inputs}
          nodeOutputs={data.outputs}
          onSave={(updatedIntegration) => {
            const updated = [...migrateIntegrations(data.integrations)];
            updated[editingIntegration.index] = updatedIntegration;
            updateNode(selectedNode.id, { integrations: updated });
            setEditingIntegration(null);
          }}
        />
      )}
    </div>
  );
}
