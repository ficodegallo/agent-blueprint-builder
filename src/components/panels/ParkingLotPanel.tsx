import { useMemo, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { X, Plus, Pencil, ExternalLink } from 'lucide-react';
import { useUIStore, useNodesStore, useParkingLotStore } from '../../store';
import { PARKING_LOT_STATUS_COLORS, type ParkingLotStatus, type ParkingLotItem } from '../../types';

type SortOption = 'newest' | 'oldest' | 'status' | 'owner';

const ALL_STATUSES: ParkingLotStatus[] = ['Open', 'In Discussion', 'Awaiting Decision', 'Blocked', 'Resolved'];

export function ParkingLotPanel() {
  const isParkingLotOpen = useUIStore((s) => s.isParkingLotOpen);
  const parkingLotNodeFilter = useUIStore((s) => s.parkingLotNodeFilter);
  const closeParkingLot = useUIStore((s) => s.closeParkingLot);
  const openParkingLotItemDialog = useUIStore((s) => s.openParkingLotItemDialog);

  const items = useParkingLotStore((s) => s.items);
  const nodes = useNodesStore((s) => s.nodes);

  const [statusFilter, setStatusFilter] = useState<ParkingLotStatus | 'All'>('All');
  const [nodeFilter, setNodeFilter] = useState<string | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('newest');

  const reactFlow = useReactFlow();

  // Sync nodeFilter with parkingLotNodeFilter from uiStore
  const effectiveNodeFilter = parkingLotNodeFilter || nodeFilter;

  const unresolvedCount = useMemo(
    () => items.filter((i) => i.status !== 'Resolved').length,
    [items]
  );

  const filteredItems = useMemo(() => {
    let result = items;

    if (statusFilter !== 'All') {
      result = result.filter((i) => i.status === statusFilter);
    }

    if (effectiveNodeFilter !== 'all') {
      if (effectiveNodeFilter === 'blueprint-overall') {
        result = result.filter((i) => i.linkedNodeId === null);
      } else {
        result = result.filter((i) => i.linkedNodeId === effectiveNodeFilter);
      }
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'status': {
          const statusOrder: Record<ParkingLotStatus, number> = {
            'Blocked': 0, 'Awaiting Decision': 1, 'In Discussion': 2, 'Open': 3, 'Resolved': 4,
          };
          return statusOrder[a.status] - statusOrder[b.status];
        }
        case 'owner':
          return (a.owner || '').localeCompare(b.owner || '');
        default:
          return 0;
      }
    });

    return result;
  }, [items, statusFilter, effectiveNodeFilter, sort]);

  const getNodeName = (nodeId: string | null) => {
    if (!nodeId) return 'Blueprint Overall';
    const node = nodes.find((n) => n.id === nodeId);
    return node?.data.name || 'Unknown Node';
  };

  const navigateToNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      reactFlow.setCenter(node.position.x + 90, node.position.y + 40, {
        zoom: 1,
        duration: 800,
      });
      closeParkingLot();
    }
  };

  return (
    <div
      className={`fixed right-0 top-12 bottom-0 w-96 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col transition-transform duration-200 ${
        isParkingLotOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Parking Lot</h2>
          {unresolvedCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
              {unresolvedCount} open
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openParkingLotItemDialog()}
            className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
          <button
            onClick={closeParkingLot}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-100 shrink-0">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ParkingLotStatus | 'All')}
          className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="All">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={parkingLotNodeFilter || nodeFilter}
          onChange={(e) => {
            setNodeFilter(e.target.value);
            // Clear the uiStore node filter if user changes it manually
            if (parkingLotNodeFilter) {
              useUIStore.setState({ parkingLotNodeFilter: null });
            }
          }}
          className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="all">All Nodes</option>
          <option value="blueprint-overall">Blueprint Overall</option>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>{n.data.name || n.id}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="status">Status</option>
          <option value="owner">Owner A-Z</option>
        </select>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            No items match the current filters.
          </div>
        ) : (
          filteredItems.map((item) => (
            <ParkingLotCard
              key={item.id}
              item={item}
              getNodeName={getNodeName}
              onEdit={() => openParkingLotItemDialog(item.id)}
              onNavigateToNode={navigateToNode}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ParkingLotCard({
  item,
  getNodeName,
  onEdit,
  onNavigateToNode,
}: {
  item: ParkingLotItem;
  getNodeName: (nodeId: string | null) => string;
  onEdit: () => void;
  onNavigateToNode: (nodeId: string) => void;
}) {
  const colors = PARKING_LOT_STATUS_COLORS[item.status];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
            {item.status}
          </span>
          <h3 className="text-sm font-semibold text-gray-800 mt-1 line-clamp-2">{item.title}</h3>
          {item.owner && (
            <p className="text-xs text-gray-500 mt-1">Owner: {item.owner}</p>
          )}
          {item.linkedNodeId && (
            <button
              onClick={() => onNavigateToNode(item.linkedNodeId!)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {getNodeName(item.linkedNodeId)}
            </button>
          )}
          {!item.linkedNodeId && (
            <p className="text-xs text-gray-400 mt-1">Blueprint Overall</p>
          )}
        </div>
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors shrink-0"
          title="Edit item"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
