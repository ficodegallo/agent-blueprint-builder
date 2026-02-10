import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Zap, Clock, MousePointer } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { TriggerNodeData } from '../../types';
import { NODE_COLORS } from '../../constants';

const TRIGGER_ICONS = {
  event: Zap,
  scheduled: Clock,
  manual: MousePointer,
} as const;

const TRIGGER_LABELS = {
  event: 'Event',
  scheduled: 'Scheduled',
  manual: 'Manual',
} as const;

export const TriggerNode = memo(function TriggerNode({
  data,
  selected,
}: NodeProps & { data: TriggerNodeData }) {
  const colors = NODE_COLORS.trigger;
  const Icon = TRIGGER_ICONS[data.triggerType];

  return (
    <BaseNode
      selected={selected}
      bgColor={colors.bg}
      borderColor={colors.border}
      accentColor={colors.accent}
      showTargetHandle={false}
      showSourceHandle={true}
      aiConfidence={data.ai_confidence}
      aiGenerated={data.ai_generated}
    >
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded ${colors.accent} text-white shrink-0`}>
          <Icon size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-medium ${colors.text} uppercase tracking-wide`}>
            {TRIGGER_LABELS[data.triggerType]} Trigger
          </div>
          <div className="text-sm font-semibold text-gray-800 truncate mt-0.5">
            {data.name}
          </div>
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
