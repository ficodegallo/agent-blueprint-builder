import { Boxes, User, Calendar, ChevronRight } from 'lucide-react';
import type { BlueprintSummary } from '../../store/blueprintsLibraryStore';
import { STATUS_COLORS } from '../../constants';

interface BlueprintCardProps {
  blueprint: BlueprintSummary;
  onClick: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

export function BlueprintCard({ blueprint, onClick }: BlueprintCardProps) {
  const statusColors = STATUS_COLORS[blueprint.status];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-purple-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-1">
          {blueprint.title || 'Untitled Blueprint'}
        </h3>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-500 transition-colors shrink-0 ml-2" />
      </div>

      {blueprint.description && (
        <p className="text-sm text-slate-500 mb-4 line-clamp-2">
          {blueprint.description}
        </p>
      )}

      {/* Status Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} />
          {blueprint.status}
        </span>
        <span className="text-xs text-slate-400">v{blueprint.version}</span>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        {blueprint.createdBy && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span className="truncate max-w-[100px]">{blueprint.createdBy}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(blueprint.lastModifiedDate)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Boxes className="w-3.5 h-3.5" />
          <span>{blueprint.nodeCount} node{blueprint.nodeCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </button>
  );
}
