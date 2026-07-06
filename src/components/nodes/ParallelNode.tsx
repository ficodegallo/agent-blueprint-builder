import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Split, Merge } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { ParallelNodeData } from '../../types';
import { NODE_COLORS } from '../../constants';
import { useParkingLotStore, selectUnresolvedParkingLotCountForNode, useUIStore } from '../../store';

const JOIN_LABELS = {
  'wait-all': 'Wait for all branches',
  'wait-any': 'Continue on first result',
  'merge-results': 'Merge branch results',
} as const;

export const ParallelNode = memo(function ParallelNode({
  id,
  data,
  selected,
}: NodeProps & { data: ParallelNodeData }) {
  const colors = NODE_COLORS.parallel;
  const plCount = useParkingLotStore(selectUnresolvedParkingLotCountForNode(id));
  const openParkingLotForNode = useUIStore((s) => s.openParkingLotForNode);
  const isSplit = data.mode === 'split';
  const branches = data.branches || [];
  const Icon = isSplit ? Split : Merge;

  return (
    <BaseNode
      selected={selected}
      bgColor={colors.bg}
      borderColor={colors.border}
      accentColor={colors.accent}
      decisionConditions={isSplit && branches.length > 0 ? branches : undefined}
      aiConfidence={data.ai_confidence}
      aiGenerated={data.ai_generated}
      parkingLotCount={plCount}
      onParkingLotBadgeClick={() => openParkingLotForNode(id)}
    >
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded ${colors.accent} text-white shrink-0`}>
          <Icon size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-medium ${colors.text} uppercase tracking-wide`}>
            {isSplit ? 'Parallel Split' : 'Parallel Join'}
          </div>
          <div className="text-sm font-semibold text-gray-800 truncate mt-0.5">
            {data.name}
          </div>
          {data.description && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{data.description}</div>
          )}
          <div className="text-xs text-teal-700 mt-1.5">
            {isSplit
              ? `${branches.length || 'No'} branch${branches.length === 1 ? '' : 'es'}`
              : JOIN_LABELS[data.joinBehavior] || JOIN_LABELS['wait-all']}
          </div>
        </div>
      </div>
    </BaseNode>
  );
});
