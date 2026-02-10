import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { DecisionNodeData } from '../../types';
import { NODE_COLORS } from '../../constants';

export const DecisionNode = memo(function DecisionNode({
  data,
  selected,
}: NodeProps & { data: DecisionNodeData }) {
  const colors = NODE_COLORS.decision;

  // Use conditions from data, or default to empty array
  const conditions = data.conditions || [];

  // Generate label position and color based on condition index and total
  const getLabelStyle = (index: number, total: number) => {
    if (total === 2) {
      // 2 conditions: first at top, second at bottom
      return {
        position: index === 0 ? '-top-5' : '-bottom-5',
        horizontal: 'right-[25%]',
        color: index === 0 ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200',
      };
    } else if (total === 3) {
      // 3 conditions: top, right, bottom
      if (index === 0) {
        return { position: '-top-5', horizontal: 'right-[25%]', color: 'text-blue-600 border-blue-200' };
      } else if (index === 1) {
        return { position: 'top-1/2 -translate-y-1/2', horizontal: '-right-2', color: 'text-purple-600 border-purple-200' };
      } else {
        return { position: '-bottom-5', horizontal: 'right-[25%]', color: 'text-orange-600 border-orange-200' };
      }
    } else {
      // 4+ conditions: distribute on right and bottom
      const halfPoint = Math.ceil(total / 2);
      const colors = ['text-blue-600 border-blue-200', 'text-purple-600 border-purple-200', 'text-orange-600 border-orange-200', 'text-pink-600 border-pink-200', 'text-teal-600 border-teal-200', 'text-indigo-600 border-indigo-200'];

      if (index < halfPoint) {
        // Right side
        const spacing = 100 / (halfPoint + 1);
        return {
          position: `top-[${spacing * (index + 1)}%] -translate-y-1/2`,
          horizontal: '-right-2',
          color: colors[index % colors.length],
        };
      } else {
        // Bottom side
        const bottomCount = total - halfPoint;
        const spacing = 100 / (bottomCount + 1);
        return {
          position: '-bottom-5',
          horizontal: `left-[${spacing * (index - halfPoint + 1)}%] -translate-x-1/2`,
          color: colors[index % colors.length],
        };
      }
    }
  };

  return (
    <BaseNode
      selected={selected}
      bgColor={colors.bg}
      borderColor={colors.border}
      accentColor={colors.accent}
      showTargetHandle={true}
      showSourceHandle={true}
      decisionConditions={conditions}
      aiConfidence={data.ai_confidence}
      aiGenerated={data.ai_generated}
    >
      {/* Dynamic condition labels */}
      {conditions.map((condition, index) => {
        const style = getLabelStyle(index, conditions.length);
        return (
          <div
            key={condition.id}
            className={`absolute ${style.position} ${style.horizontal} text-xs font-medium bg-white px-1 rounded shadow-sm border ${style.color} whitespace-nowrap z-10`}
          >
            {condition.label}
          </div>
        );
      })}

      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded ${colors.accent} text-white shrink-0`}>
          <GitBranch size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-medium ${colors.text} uppercase tracking-wide`}>
            Decision
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
