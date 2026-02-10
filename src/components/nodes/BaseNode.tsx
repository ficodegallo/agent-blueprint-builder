import { memo, type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { AIConfidence, DecisionCondition } from '../../types/nodes';

interface BaseNodeProps {
  children: ReactNode;
  selected?: boolean;
  bgColor: string;
  borderColor: string;
  accentColor: string;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
  decisionConditions?: DecisionCondition[];
  aiConfidence?: AIConfidence;
  aiGenerated?: boolean;
}

const handleStyle = "!w-3 !h-3 !border-2 !border-white";

// Confidence indicator styles
const confidenceRingStyles: Record<AIConfidence, string> = {
  high: 'ring-2 ring-green-400 ring-offset-1',
  medium: 'ring-2 ring-yellow-400 ring-offset-1',
  low: 'ring-2 ring-red-400 ring-offset-1',
};

export const BaseNode = memo(function BaseNode({
  children,
  selected,
  bgColor,
  borderColor,
  accentColor,
  showSourceHandle = true,
  showTargetHandle = true,
  decisionConditions,
  aiConfidence,
  aiGenerated,
}: BaseNodeProps) {
  // Determine ring style: selection takes precedence over confidence
  const confidenceRing = aiGenerated && aiConfidence && !selected
    ? confidenceRingStyles[aiConfidence]
    : '';

  // Generate handle colors for decision conditions
  const getHandleColor = (index: number, total: number) => {
    if (total === 2) {
      return index === 0 ? '!bg-green-500' : '!bg-red-500';
    }
    // For 3+ conditions, use a color palette
    const colors = ['!bg-blue-500', '!bg-purple-500', '!bg-orange-500', '!bg-pink-500', '!bg-teal-500', '!bg-indigo-500'];
    return colors[index % colors.length];
  };

  return (
    <div
      className={`
        relative min-w-[180px] max-w-[240px] rounded-lg shadow-md border-2 transition-shadow
        ${bgColor} ${borderColor}
        ${selected ? 'shadow-lg ring-2 ring-blue-400 ring-offset-2' : confidenceRing}
      `}
    >
      {/* Accent bar at top */}
      <div className={`h-1 rounded-t-md ${accentColor}`} />

      {/* Content */}
      <div className="p-3">{children}</div>

      {/* Target handles (inputs) - top, left */}
      {showTargetHandle && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            id="target-top"
            className={`${handleStyle} !bg-gray-400`}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="target-left"
            className={`${handleStyle} !bg-gray-400`}
          />
        </>
      )}

      {/* Source handles for decision nodes with conditions */}
      {showSourceHandle && decisionConditions && decisionConditions.length > 0 && (
        <>
          {decisionConditions.map((condition, index) => {
            const total = decisionConditions.length;
            let position: Position;
            let style: React.CSSProperties;

            if (total === 2) {
              // 2 conditions: first at top-right, second at bottom-right
              position = index === 0 ? Position.Top : Position.Bottom;
              style = { left: '70%' };
            } else if (total === 3) {
              // 3 conditions: distribute on top, right, bottom
              if (index === 0) {
                position = Position.Top;
                style = { left: '70%' };
              } else if (index === 1) {
                position = Position.Right;
                style = { top: '50%' };
              } else {
                position = Position.Bottom;
                style = { left: '70%' };
              }
            } else {
              // 4+ conditions: distribute evenly on right and bottom
              const halfPoint = Math.ceil(total / 2);
              if (index < halfPoint) {
                // Right side
                position = Position.Right;
                const spacing = 100 / (halfPoint + 1);
                style = { top: `${spacing * (index + 1)}%` };
              } else {
                // Bottom side
                position = Position.Bottom;
                const bottomCount = total - halfPoint;
                const spacing = 100 / (bottomCount + 1);
                style = { left: `${spacing * (index - halfPoint + 1)}%` };
              }
            }

            return (
              <Handle
                key={condition.id}
                type="source"
                position={position}
                id={condition.id}
                className={`${handleStyle} ${getHandleColor(index, total)}`}
                style={style}
              />
            );
          })}
        </>
      )}

      {/* Standard source handles (outputs) - for non-decision nodes */}
      {showSourceHandle && !decisionConditions && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="source-bottom"
            className={`${handleStyle} !bg-gray-600`}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="source-right"
            className={`${handleStyle} !bg-gray-600`}
          />
        </>
      )}
    </div>
  );
});
