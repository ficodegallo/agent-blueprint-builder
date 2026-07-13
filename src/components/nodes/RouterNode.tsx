import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Shuffle } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { RouterNodeData } from '../../types';
import { NODE_COLORS } from '../../constants';
import { useParkingLotStore, selectUnresolvedParkingLotCountForNode, useUIStore } from '../../store';

export const RouterNode = memo(function RouterNode({
  id,
  data,
  selected,
}: NodeProps & { data: RouterNodeData }) {
  const colors = NODE_COLORS.router;
  const plCount = useParkingLotStore(selectUnresolvedParkingLotCountForNode(id));
  const openParkingLotForNode = useUIStore((s) => s.openParkingLotForNode);
  const routes = data.routes || [];

  return (
    <BaseNode
      selected={selected}
      bgColor={colors.bg}
      borderColor={colors.border}
      accentColor={colors.accent}
      decisionConditions={routes}
      aiConfidence={data.ai_confidence}
      aiGenerated={data.ai_generated}
      parkingLotCount={plCount}
      onParkingLotBadgeClick={() => openParkingLotForNode(id)}
    >
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded ${colors.accent} text-white shrink-0`}>
          <Shuffle size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-medium ${colors.text} uppercase tracking-wide`}>
            Router (AI)
          </div>
          <div className="text-sm font-semibold text-gray-800 truncate mt-0.5">
            {data.name}
          </div>
          {data.description && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{data.description}</div>
          )}
          {routes.length > 0 && (
            <div className="text-xs text-rose-600 mt-1.5">
              {routes.map((r) => r.label).filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  );
});
