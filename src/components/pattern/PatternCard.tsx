import type { OrchestrationPattern } from '../../features/patterns/types';
import type { NodeType } from '../../types/nodes';

// Accent color per node type for the mini preview dots. Mirrors NODE_COLORS
// (colors.ts) but flattened — work collapses to its agent accent here.
const NODE_ACCENT: Record<NodeType, string> = {
  trigger: 'bg-emerald-500',
  work: 'bg-orange-500',
  decision: 'bg-amber-500',
  end: 'bg-red-500',
  workflow: 'bg-purple-500',
  orchestrator: 'bg-indigo-500',
  agentLoop: 'bg-cyan-500',
  router: 'bg-rose-500',
  parallel: 'bg-teal-500',
  evaluatorOptimizer: 'bg-lime-600',
};

interface PatternCardProps {
  pattern: OrchestrationPattern;
  selected: boolean;
  onSelect: () => void;
}

export function PatternCard({ pattern, selected, onSelect }: PatternCardProps) {
  // Preview flow: trigger → the pattern's signature nodes → end.
  const flow: NodeType[] = ['trigger', ...pattern.nodeTypes.filter((t) => t !== 'decision'), 'end'];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-xl border p-4 transition-all h-full flex flex-col ${
        selected
          ? 'border-purple-500 ring-2 ring-purple-200 bg-purple-50'
          : 'border-slate-200 hover:border-purple-300 hover:shadow-sm bg-white'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-3">
        {flow.map((t, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <div className="w-3 h-px bg-slate-300" />}
            <div className={`w-2.5 h-2.5 rounded-full ${NODE_ACCENT[t]}`} />
          </div>
        ))}
      </div>
      <h3 className="font-semibold text-slate-900">{pattern.name}</h3>
      <p className="text-sm text-slate-600 mt-1 flex-1">{pattern.tagline}</p>
      <p className="text-xs text-slate-500 mt-3">
        <span className="font-medium text-slate-600">Use when:</span> {pattern.whenToUse[0]}
      </p>
    </button>
  );
}
