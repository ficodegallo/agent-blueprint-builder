import { X, Sparkles, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useNodesStore, useEdgesStore, useUIStore } from '../../store';
import { useBlueprintsLibraryStore } from '../../store/blueprintsLibraryStore';
import { NodeComments } from './NodeComments';
import { TriggerNodePanel } from './node-panels/TriggerNodePanel';
import { WorkNodePanel } from './node-panels/WorkNodePanel';
import { DecisionNodePanel } from './node-panels/DecisionNodePanel';
import { EndNodePanel } from './node-panels/EndNodePanel';
import { WorkflowNodePanel } from './node-panels/WorkflowNodePanel';

export function DetailPanel() {
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const selectNode = useUIStore((state) => state.selectNode);
  const openDialog = useUIStore((state) => state.openDialog);
  const getNode = useNodesStore((state) => state.getNode);
  const updateNode = useNodesStore((state) => state.updateNode);
  const navigate = useNavigate();
  const getBlueprintSummaries = useBlueprintsLibraryStore((state) => state.getBlueprintSummaries);

  const incomingEdges = useEdgesStore(
    useShallow((state) => state.edges.filter((e) => e.target === (selectedNodeId ?? '')))
  );

  const savedBlueprints = getBlueprintSummaries();
  const selectedNode = selectedNodeId ? getNode(selectedNodeId) : null;

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

      {/* Name — common to all node types */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Type-specific panel */}
      {data.nodeType === 'trigger' && (
        <TriggerNodePanel node={selectedNode} updateNode={updateNode} />
      )}

      {data.nodeType === 'work' && (
        <WorkNodePanel
          node={selectedNode}
          updateNode={updateNode}
          incomingEdges={incomingEdges}
          getNode={getNode}
          openDialog={openDialog}
        />
      )}

      {data.nodeType === 'decision' && (
        <DecisionNodePanel node={selectedNode} updateNode={updateNode} />
      )}

      {data.nodeType === 'end' && (
        <EndNodePanel node={selectedNode} updateNode={updateNode} />
      )}

      {data.nodeType === 'workflow' && (
        <WorkflowNodePanel
          node={selectedNode}
          updateNode={updateNode}
          incomingEdges={incomingEdges}
          getNode={getNode}
          savedBlueprints={savedBlueprints}
          navigate={navigate}
        />
      )}

      {/* AI Generation Info */}
      {data.ai_generated && (
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">AI Generated</span>
          </div>

          {data.ai_confidence && (
            <div className="mb-2">
              <span className="text-xs text-gray-500 mr-2">Confidence:</span>
              {data.ai_confidence === 'high' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3" /> High
                </span>
              )}
              {data.ai_confidence === 'medium' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                  <AlertTriangle className="w-3 h-3" /> Medium
                </span>
              )}
              {data.ai_confidence === 'low' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <AlertCircle className="w-3 h-3" /> Low
                </span>
              )}
            </div>
          )}

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

      {/* Comments */}
      <NodeComments nodeId={selectedNode.id} />

      {/* Node info footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-400">
          <div>Node ID: {selectedNode.id.slice(0, 8)}...</div>
          <div>Type: {data.nodeType}</div>
          {data.ai_generated && <div>Source: AI Generated</div>}
        </div>
      </div>
    </div>
  );
}
