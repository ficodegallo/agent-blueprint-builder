import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Gauge, ListChecks } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { EvaluatorOptimizerNodeData } from '../../types';
import { NODE_COLORS } from '../../constants';
import { useParkingLotStore, selectUnresolvedParkingLotCountForNode, useUIStore } from '../../store';
import { HitlIndicator } from './HitlIndicator';

export const EvaluatorOptimizerNode = memo(function EvaluatorOptimizerNode({
  id,
  data,
  selected,
}: NodeProps & { data: EvaluatorOptimizerNodeData }) {
  const colors = NODE_COLORS.evaluatorOptimizer;
  const plCount = useParkingLotStore(selectUnresolvedParkingLotCountForNode(id));
  const openParkingLotForNode = useUIStore((s) => s.openParkingLotForNode);
  const criteria = data.evaluatorCriteria || [];

  return (
    <BaseNode
      selected={selected}
      bgColor={colors.bg}
      borderColor={colors.border}
      accentColor={colors.accent}
      aiConfidence={data.ai_confidence}
      aiGenerated={data.ai_generated}
      parkingLotCount={plCount}
      onParkingLotBadgeClick={() => openParkingLotForNode(id)}
    >
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded ${colors.accent} text-white shrink-0`}>
          <Gauge size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-medium ${colors.text} uppercase tracking-wide`}>
            Evaluator Loop
          </div>
          <div className="text-sm font-semibold text-gray-800 truncate mt-0.5">
            {data.name}
          </div>
          {data.goal && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{data.goal}</div>
          )}
          {criteria.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-lime-700">
              <ListChecks size={11} />
              <span>
                {criteria.length} quality criteri{criteria.length === 1 ? 'on' : 'a'}
              </span>
            </div>
          )}
          <HitlIndicator hitl={data.hitl} />
        </div>
      </div>
    </BaseNode>
  );
});
