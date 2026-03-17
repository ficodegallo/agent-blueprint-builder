import { ExternalLink, Download, Upload, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { IOListEditor } from '../../shared/IOListEditor';
import type { AppNode } from '../../../store/nodesStore';
import type { NodeData, IOItem, WorkflowNodeData, Blueprint } from '../../../types';
import { useBlueprintsLibraryStore } from '../../../store/blueprintsLibraryStore';
import { useBlueprintStore } from '../../../store';

interface BlueprintSummary {
  id: string;
  title: string;
  description: string;
  status: string;
  version: string;
  nodeCount: number;
}

interface IncomingEdge {
  source: string;
}

interface Props {
  node: AppNode;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  incomingEdges: IncomingEdge[];
  getNode: (id: string) => AppNode | undefined;
  savedBlueprints: BlueprintSummary[];
  navigate: (path: string) => void;
}

function wouldCreateCycle(
  targetId: string,
  sourceId: string,
  getBlueprint: (id: string) => Blueprint | undefined,
  visited = new Set<string>()
): boolean {
  if (targetId === sourceId) return true;
  if (visited.has(targetId)) return false;
  visited.add(targetId);

  const blueprint = getBlueprint(targetId);
  if (!blueprint) return false;

  for (const node of blueprint.nodes) {
    const wfId = (node.data as { nodeType?: string; workflowId?: string }).workflowId;
    if (node.data.nodeType === 'workflow' && wfId) {
      if (wouldCreateCycle(wfId, sourceId, getBlueprint, visited)) return true;
    }
  }
  return false;
}

export function WorkflowNodePanel({ node, updateNode, incomingEdges, getNode, savedBlueprints, navigate }: Props) {
  const data = node.data as WorkflowNodeData;
  const currentBlueprintId = useBlueprintStore((s) => s.id);
  const getBlueprint = useBlueprintsLibraryStore((s) => s.getBlueprint);

  const linkedBlueprint = data.workflowId ? getBlueprint(data.workflowId) : undefined;
  const hasBrokenLink = data.workflowId ? !linkedBlueprint : false;

  // Blueprints available for linking: exclude self, and flag those that would create cycles
  const linkableBlueprints = savedBlueprints.filter((bp) => bp.id !== currentBlueprintId);

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

  const statusColors: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-700',
    'In Review': 'bg-yellow-100 text-yellow-700',
    Approved: 'bg-green-100 text-green-700',
    Archived: 'bg-slate-100 text-slate-600',
  };

  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          rows={2}
          placeholder="What does this workflow do?"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
        <label className="block text-sm font-medium text-purple-700 mb-2">Referenced Workflow</label>

        {/* Broken link warning */}
        {hasBrokenLink && (
          <div className="flex items-start gap-2 mb-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              The linked blueprint no longer exists. Select a new one or clear the selection.
            </p>
          </div>
        )}

        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Link to Existing Blueprint</label>
          <select
            value={data.workflowId || ''}
            onChange={(e) => {
              const selectedId = e.target.value;
              if (selectedId) {
                const blueprint = linkableBlueprints.find((bp) => bp.id === selectedId);
                if (blueprint) {
                  updateNode(node.id, { workflowId: blueprint.id, workflowName: blueprint.title });
                }
              } else {
                updateNode(node.id, { workflowId: '', workflowName: '' });
              }
            }}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">-- Select a blueprint --</option>
            {linkableBlueprints.map((bp) => {
              const isCyclic = wouldCreateCycle(bp.id, currentBlueprintId, getBlueprint);
              return (
                <option key={bp.id} value={bp.id} disabled={isCyclic}>
                  {bp.title} ({bp.status}){isCyclic ? ' — circular' : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Workflow Name</label>
          <input
            type="text"
            value={data.workflowName}
            onChange={(e) => updateNode(node.id, { workflowName: e.target.value })}
            placeholder="Enter workflow name"
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Workflow ID</label>
          <input
            type="text"
            value={data.workflowId}
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
            onChange={(e) => updateNode(node.id, { version: e.target.value })}
            placeholder="e.g., 1.0"
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Linked blueprint preview */}
        {linkedBlueprint && (
          <div className="mb-3 p-2.5 bg-white border border-purple-200 rounded-md">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-purple-500 shrink-0" />
                <span className="text-xs font-medium text-gray-800 truncate">{linkedBlueprint.title}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${statusColors[linkedBlueprint.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {linkedBlueprint.status}
                </span>
                <span className="text-xs text-gray-400">v{linkedBlueprint.version}</span>
              </div>
            </div>
            {linkedBlueprint.description && (
              <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{linkedBlueprint.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">{linkedBlueprint.nodes.length} nodes</p>
          </div>
        )}

        {/* Broken link: show open button disabled with alert, or working open button */}
        {data.workflowId && !hasBrokenLink && (
          <button
            onClick={() => {
              if (confirm('Open the linked workflow? Current blueprint will be saved automatically.')) {
                navigate(`/blueprint/${data.workflowId}?from=${currentBlueprintId}`);
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <ExternalLink size={16} />
            Open Linked Workflow
          </button>
        )}

        {hasBrokenLink && (
          <div className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle size={16} />
            Blueprint not found
          </div>
        )}
      </div>

      <IOListEditor
        label="Inputs (passed to workflow)"
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
      <IOListEditor
        label="Outputs (returned from workflow)"
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
    </>
  );
}
