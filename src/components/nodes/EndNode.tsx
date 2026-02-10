import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { CircleStop } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { EndNodeData } from '../../types';
import { NODE_COLORS } from '../../constants';

export const EndNode = memo(function EndNode({
  data,
  selected,
}: NodeProps & { data: EndNodeData }) {
  const colors = NODE_COLORS.end;

  return (
    <BaseNode
      selected={selected}
      bgColor={colors.bg}
      borderColor={colors.border}
      accentColor={colors.accent}
      showTargetHandle={true}
      showSourceHandle={false}
      aiConfidence={data.ai_confidence}
      aiGenerated={data.ai_generated}
    >
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded ${colors.accent} text-white shrink-0`}>
          <CircleStop size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-medium ${colors.text} uppercase tracking-wide`}>
            End
          </div>
          <div className="text-sm font-semibold text-gray-800 truncate mt-0.5">
            {data.name}
          </div>
          {data.outcome && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
              {data.outcome}
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  );
});
