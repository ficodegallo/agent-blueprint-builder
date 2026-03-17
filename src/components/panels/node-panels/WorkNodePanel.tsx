import { useState, useMemo } from 'react';
import {
  Sparkles, AlertCircle, CheckCircle, AlertTriangle,
  ExternalLink, Plus, Search, Download, Upload, X,
} from 'lucide-react';
import { ListEditor } from '../../shared/ListEditor';
import { IOListEditor } from '../../shared/IOListEditor';
import { IntegrationDetailsDialog } from '../IntegrationDetailsDialog';
import { ApiDiscoveryDialog } from '../../dialogs/ApiDiscoveryDialog';
import { useTaskAutoOrder } from '../../../hooks/useTaskAutoOrder';
import { useGoalEvaluate } from '../../../hooks/useGoalEvaluate';
import { migrateIntegrations, type IntegrationDetail, type ApiEndpoint, type IOItem } from '../../../types';
import type { AppNode } from '../../../store/nodesStore';
import type { NodeData } from '../../../types';

interface IncomingEdge {
  source: string;
}

interface Props {
  node: AppNode;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  incomingEdges: IncomingEdge[];
  getNode: (id: string) => AppNode | undefined;
  openDialog: (dialog: string) => void;
}

export function WorkNodePanel({ node, updateNode, incomingEdges, getNode, openDialog }: Props) {
  const data = node.data;

  // Integration dialog state
  const [editingIntegration, setEditingIntegration] = useState<{
    integration: IntegrationDetail;
    index: number;
  } | null>(null);
  const [isIntegrationDialogOpen, setIsIntegrationDialogOpen] = useState(false);

  // API discovery dialog state
  const [isApiDiscoveryOpen, setIsApiDiscoveryOpen] = useState(false);
  const [discoveryIntegrationIndex, setDiscoveryIntegrationIndex] = useState<number | null>(null);

  const { autoOrderTasks, isOrdering, error: autoOrderError, clearError } = useTaskAutoOrder();
  const {
    evaluateGoal,
    isEvaluating,
    suggestedGoal,
    error: goalEvalError,
    clearError: clearGoalEvalError,
    clearSuggestion,
  } = useGoalEvaluate();

  const migratedIntegrations = useMemo(
    () => migrateIntegrations(data.integrations),
    [data.integrations]
  );

  const handleAutoOrderTasks = async () => {
    const reorderedTasks = await autoOrderTasks({
      tasks: data.tasks,
      goal: data.goal,
      inputs: data.inputs,
      outputs: data.outputs,
    });
    if (reorderedTasks) {
      updateNode(node.id, { tasks: reorderedTasks });
    }
  };

  const handleEvaluateGoal = async () => {
    await evaluateGoal({
      nodeName: data.name,
      goal: data.goal,
      tasks: data.tasks,
      inputs: data.inputs,
      outputs: data.outputs,
    });
  };

  const handleInheritInputs = () => {
    const inherited: IOItem[] = [];
    for (const edge of incomingEdges) {
      const sourceNode = getNode(edge.source);
      if (!sourceNode) continue;
      if (sourceNode.data.nodeType === 'work' || sourceNode.data.nodeType === 'workflow') {
        inherited.push(...(sourceNode.data.outputs as IOItem[]));
      }
    }
    if (inherited.length === 0) return;

    const existingNames = new Set(data.inputs.map((i: IOItem) => i.name.toLowerCase()));
    const newItems = inherited.filter((o) => o.name.trim() && !existingNames.has(o.name.toLowerCase()));
    if (newItems.length === 0) return;

    updateNode(node.id, { inputs: [...data.inputs, ...newItems] });
  };

  const handleInheritOutputs = () => {
    const existingNames = new Set(data.outputs.map((o: IOItem) => o.name.toLowerCase()));
    const newItems = data.inputs.filter(
      (i: IOItem) => i.name.trim() && !existingNames.has(i.name.toLowerCase())
    );
    if (newItems.length === 0) return;

    updateNode(node.id, { outputs: [...data.outputs, ...newItems] });
  };

  return (
    <>
      {/* Worker Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Worker Type</label>
        <select
          value={data.workerType}
          onChange={(e) => updateNode(node.id, { workerType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="agent">Agent</option>
          <option value="automation">Automation</option>
          <option value="human">Human</option>
        </select>
      </div>

      {/* Goal */}
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
            updateNode(node.id, { goal: e.target.value });
            clearSuggestion();
            clearGoalEvalError();
          }}
          rows={2}
          placeholder="What outcome should this node achieve?"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {goalEvalError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{goalEvalError}</p>
            {goalEvalError.includes('API key') && (
              <button
                onClick={() => { clearGoalEvalError(); openDialog('smartImport'); }}
                className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
              >
                Configure API Key
              </button>
            )}
          </div>
        )}

        {suggestedGoal && (
          <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {suggestedGoal.rating === 'strong' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3" /> Strong
                </span>
              )}
              {suggestedGoal.rating === 'moderate' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  <AlertTriangle className="w-3 h-3" /> Moderate
                </span>
              )}
              {suggestedGoal.rating === 'weak' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <AlertCircle className="w-3 h-3" /> Weak
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-2">{suggestedGoal.reasoning}</p>
            <div className="mb-2">
              <label className="block text-xs font-medium text-purple-700 mb-1">Suggested Goal</label>
              <div className="w-full px-3 py-2 bg-white border border-purple-200 rounded-md text-sm text-gray-800">
                {suggestedGoal.suggestion}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { updateNode(node.id, { goal: suggestedGoal.suggestion }); clearSuggestion(); }}
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

      {/* Inputs */}
      <IOListEditor
        label="Inputs"
        items={data.inputs}
        onChange={(inputs) => updateNode(node.id, { inputs })}
        placeholder="Add input..."
        headerAction={incomingEdges.length > 0 ? (
          <button
            onClick={handleInheritInputs}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-md transition-colors"
            title="Inherit outputs from upstream nodes as inputs"
          >
            <Download size={12} />
            Inherit Inputs
          </button>
        ) : undefined}
      />

      {/* Tasks */}
      <ListEditor
        label="Tasks"
        items={data.tasks}
        onChange={(tasks) => { updateNode(node.id, { tasks }); clearError(); }}
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
              onClick={() => { clearError(); openDialog('smartImport'); }}
              className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
            >
              Configure API Key
            </button>
          )}
        </div>
      )}

      {/* Outputs */}
      <IOListEditor
        label="Outputs"
        items={data.outputs}
        onChange={(outputs) => updateNode(node.id, { outputs })}
        placeholder="Add output..."
        headerAction={data.inputs.length > 0 ? (
          <button
            onClick={handleInheritOutputs}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-md transition-colors"
            title="Inherit inputs from this node as outputs"
          >
            <Upload size={12} />
            Inherit Outputs
          </button>
        ) : undefined}
      />

      {/* Integrations */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Integrations</label>

        {migratedIntegrations.length > 0 && (
          <div className="space-y-2 mb-2">
            {migratedIntegrations.map((integration, index) => (
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
                    onClick={() => { setDiscoveryIntegrationIndex(index); setIsApiDiscoveryOpen(true); }}
                    className="px-2.5 py-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors flex items-center gap-1"
                    title="Discover API endpoints with AI"
                  >
                    <Search size={12} />
                    Discover
                  </button>
                  <button
                    onClick={() => { setEditingIntegration({ integration, index }); setIsIntegrationDialogOpen(true); }}
                    className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                  >
                    <ExternalLink size={12} />
                    Details
                  </button>
                  <button
                    onClick={() => {
                      const updated = [...data.integrations];
                      updated.splice(index, 1);
                      updateNode(node.id, { integrations: updated });
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

        <button
          onClick={() => {
            const newIntegration: IntegrationDetail = {
              name: `Integration ${data.integrations.length + 1}`,
              action: '',
              inputs: [],
              outputs: [],
              apiEndpoints: [],
            };
            setEditingIntegration({ integration: newIntegration, index: data.integrations.length });
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

      {/* Integration Details Dialog */}
      {editingIntegration && (
        <IntegrationDetailsDialog
          isOpen={isIntegrationDialogOpen}
          onClose={() => { setIsIntegrationDialogOpen(false); setEditingIntegration(null); }}
          integration={editingIntegration.integration}
          nodeInputs={data.inputs}
          nodeOutputs={data.outputs}
          onSave={(updatedIntegration) => {
            const updated = [...migratedIntegrations];
            updated[editingIntegration.index] = updatedIntegration;
            updateNode(node.id, { integrations: updated });
            setEditingIntegration(null);
          }}
        />
      )}

      {/* API Discovery Dialog */}
      {discoveryIntegrationIndex !== null && (
        <ApiDiscoveryDialog
          isOpen={isApiDiscoveryOpen}
          onClose={() => { setIsApiDiscoveryOpen(false); setDiscoveryIntegrationIndex(null); }}
          integrationName={migratedIntegrations[discoveryIntegrationIndex]?.name || ''}
          nodeName={data.name}
          goal={data.goal}
          tasks={data.tasks}
          inputs={data.inputs}
          outputs={data.outputs}
          onAddEndpoint={(endpoint: ApiEndpoint) => {
            const integration = migratedIntegrations[discoveryIntegrationIndex];
            if (integration) {
              const updatedIntegration = {
                ...integration,
                apiEndpoints: [...integration.apiEndpoints, endpoint],
              };
              const updated = [...migratedIntegrations];
              updated[discoveryIntegrationIndex] = updatedIntegration;
              updateNode(node.id, { integrations: updated });
            }
          }}
        />
      )}
    </>
  );
}
