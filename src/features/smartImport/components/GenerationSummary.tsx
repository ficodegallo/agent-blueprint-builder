import { useMemo } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Play,
  Zap,
  GitBranch,
  Target,
  Workflow,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../../../components/shared/Modal';
import type { Blueprint } from '../../../types/blueprint';
import type { NodeData, AIConfidence } from '../../../types/nodes';
import type { GenerationSummary as GenerationSummaryType } from '../types';

interface GenerationSummaryProps {
  isOpen: boolean;
  blueprint: Blueprint;
  onClose: () => void;
  onLoadBlueprint: () => void;
}

function computeSummary(blueprint: Blueprint): GenerationSummaryType {
  const nodesByType: GenerationSummaryType['nodesByType'] = {};
  const confidenceCounts = { high: 0, medium: 0, low: 0 };
  const lowConfidenceNodes: GenerationSummaryType['lowConfidenceNodes'] = [];

  blueprint.nodes.forEach((node) => {
    const data = node.data as NodeData;

    // Count by type
    nodesByType[data.nodeType] = (nodesByType[data.nodeType] || 0) + 1;

    // Count by confidence
    const confidence = data.ai_confidence as AIConfidence | undefined;
    if (confidence) {
      confidenceCounts[confidence]++;

      if (confidence === 'low') {
        lowConfidenceNodes.push({
          id: node.id,
          name: data.name,
          confidence,
          notes: (data.ai_notes as string) || 'No notes provided',
        });
      }
    }
  });

  return {
    nodesByType,
    confidenceCounts,
    lowConfidenceNodes,
    totalNodes: blueprint.nodes.length,
    totalEdges: blueprint.edges.length,
  };
}

const nodeTypeIcons: Record<string, typeof Play> = {
  trigger: Play,
  work: Zap,
  decision: GitBranch,
  end: Target,
  workflow: Workflow,
};

const nodeTypeLabels: Record<string, string> = {
  trigger: 'Triggers',
  work: 'Work Nodes',
  decision: 'Decisions',
  end: 'End Points',
  workflow: 'Sub-Workflows',
};

export function GenerationSummary({
  isOpen,
  blueprint,
  onClose,
  onLoadBlueprint,
}: GenerationSummaryProps) {
  const summary = useMemo(() => computeSummary(blueprint), [blueprint]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Blueprint Generated" maxWidth="lg">
      <div className="space-y-6">
        {/* Success Header */}
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-800">{blueprint.title}</h3>
            <p className="text-sm text-green-700">{blueprint.description}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Node Counts */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Nodes by Type</h4>
            <div className="space-y-2">
              {Object.entries(summary.nodesByType).map(([type, count]) => {
                const Icon = nodeTypeIcons[type] || Zap;
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {nodeTypeLabels[type] || type}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{count}</span>
                  </div>
                );
              })}
              <div className="pt-2 mt-2 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Nodes</span>
                <span className="text-sm font-semibold text-gray-900">
                  {summary.totalNodes}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Connections</span>
                <span className="text-sm font-semibold text-gray-900">
                  {summary.totalEdges}
                </span>
              </div>
            </div>
          </div>

          {/* Confidence Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">AI Confidence</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-600">High confidence</span>
                </div>
                <span className="text-sm font-medium text-gray-800">
                  {summary.confidenceCounts.high}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="text-sm text-gray-600">Medium confidence</span>
                </div>
                <span className="text-sm font-medium text-gray-800">
                  {summary.confidenceCounts.medium}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-sm text-gray-600">Low confidence</span>
                </div>
                <span className="text-sm font-medium text-gray-800">
                  {summary.confidenceCounts.low}
                </span>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden flex">
              {summary.confidenceCounts.high > 0 && (
                <div
                  className="bg-green-500 h-full"
                  style={{
                    width: `${(summary.confidenceCounts.high / summary.totalNodes) * 100}%`,
                  }}
                />
              )}
              {summary.confidenceCounts.medium > 0 && (
                <div
                  className="bg-yellow-500 h-full"
                  style={{
                    width: `${(summary.confidenceCounts.medium / summary.totalNodes) * 100}%`,
                  }}
                />
              )}
              {summary.confidenceCounts.low > 0 && (
                <div
                  className="bg-red-500 h-full"
                  style={{
                    width: `${(summary.confidenceCounts.low / summary.totalNodes) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Low Confidence Nodes Warning */}
        {summary.lowConfidenceNodes.length > 0 && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h4 className="text-sm font-medium text-amber-800">
                Nodes Needing Review ({summary.lowConfidenceNodes.length})
              </h4>
            </div>
            <ul className="space-y-2 max-h-32 overflow-y-auto">
              {summary.lowConfidenceNodes.map((node) => (
                <li key={node.id} className="text-sm">
                  <span className="font-medium text-amber-800">{node.name}</span>
                  <span className="text-amber-700"> — {node.notes}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onLoadBlueprint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
          >
            Start Reviewing
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
