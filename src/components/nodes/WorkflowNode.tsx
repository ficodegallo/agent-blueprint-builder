import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Workflow } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { WorkflowNodeData } from '../../types';
import { NODE_COLORS } from '../../constants';

export const WorkflowNode = memo(function WorkflowNode({
  data,
  selected,
}: NodeProps & { data: WorkflowNodeData }) {
  const colors = NODE_COLORS.workflow;

  return (
    <BaseNode
      selected={selected}
      bgColor={colors.bg}
      borderColor={colors.border}
      accentColor={colors.accent}
      showTargetHandle={true}
      showSourceHandle={true}
      aiConfidence={data.ai_confidence}
      aiGenerated={data.ai_generated}
    >
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded ${colors.accent} text-white shrink-0`}>
          <Workflow size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-medium ${colors.text} uppercase tracking-wide`}>
            Workflow
          </div>
          <div className="text-sm font-semibold text-gray-800 truncate mt-0.5">
            {data.name}
          </div>
          {data.workflowName && (
            <div className="text-xs text-purple-600 mt-1 truncate">
              {data.workflowName}
              {data.version && <span className="text-gray-400 ml-1">v{data.version}</span>}
            </div>
          )}
          {data.description && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
              {data.description}
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  );
});
