import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Network, Users } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { OrchestratorNodeData } from '../../types';
import { NODE_COLORS } from '../../constants';
import { useParkingLotStore, selectUnresolvedParkingLotCountForNode, useUIStore } from '../../store';
import { HitlIndicator } from './HitlIndicator';

export const OrchestratorNode = memo(function OrchestratorNode({
  id,
  data,
  selected,
}: NodeProps & { data: OrchestratorNodeData }) {
  const colors = NODE_COLORS.orchestrator;
  const plCount = useParkingLotStore(selectUnresolvedParkingLotCountForNode(id));
  const openParkingLotForNode = useUIStore((s) => s.openParkingLotForNode);
  const workers = data.workers || [];

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
          <Network size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-medium ${colors.text} uppercase tracking-wide`}>
            Orchestrator
          </div>
          <div className="text-sm font-semibold text-gray-800 truncate mt-0.5">
            {data.name}
          </div>
          {data.goal && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{data.goal}</div>
          )}
          {workers.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-indigo-600">
              <Users size={11} />
              <span>
                {workers.length} worker{workers.length === 1 ? '' : 's'}
              </span>
            </div>
          )}
          <HitlIndicator hitl={data.hitl} />
        </div>
      </div>
    </BaseNode>
  );
});
