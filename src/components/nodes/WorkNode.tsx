import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Bot, Cog, User } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { WorkNodeData } from '../../types';
import { NODE_COLORS } from '../../constants';

const WORKER_ICONS = {
  agent: Bot,
  automation: Cog,
  human: User,
} as const;

const WORKER_LABELS = {
  agent: 'Agent',
  automation: 'Automation',
  human: 'Human',
} as const;

export const WorkNode = memo(function WorkNode({
  data,
  selected,
}: NodeProps & { data: WorkNodeData }) {
  const colors = NODE_COLORS.work[data.workerType];
  const Icon = WORKER_ICONS[data.workerType];

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
          <Icon size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-medium ${colors.text} uppercase tracking-wide`}>
            {WORKER_LABELS[data.workerType]}
          </div>
          <div className="text-sm font-semibold text-gray-800 truncate mt-0.5">
            {data.name}
          </div>
          {data.goal && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
              {data.goal}
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  );
});
