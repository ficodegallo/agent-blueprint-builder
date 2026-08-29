import { useMemo, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  X,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Sparkles,
  Check,
  Loader2,
  AlertCircle,
  ClipboardCheck,
} from 'lucide-react';
import {
  useUIStore,
  useNodesStore,
  useEdgesStore,
  useBlueprintStore,
  useEvalsStore,
} from '../../store';
import { useEvalGenerate } from '../../hooks/useEvalGenerate';
import { mergeEvalCandidates } from '../../features/evals';
import { useValidation } from '../../hooks/useValidation';
import {
  EVAL_DIMENSIONS,
  EVAL_DIMENSION_COLORS,
  EVAL_DIMENSION_LABELS,
  EVAL_GRADER_LABELS,
  EVAL_PRIORITY_COLORS,
  type EvalDimension,
  type EvalItem,
} from '../../types';

type ScopeFilter = 'all' | 'workflow' | string;

export function EvalsPanel() {
  const isEvalsOpen = useUIStore((s) => s.isEvalsOpen);
  const evalsNodeFilter = useUIStore((s) => s.evalsNodeFilter);
  const closeEvals = useUIStore((s) => s.closeEvals);
  const openEvalItemDialog = useUIStore((s) => s.openEvalItemDialog);

  const items = useEvalsStore((s) => s.items);
  const addProposals = useEvalsStore((s) => s.addProposals);
  const updateItem = useEvalsStore((s) => s.updateItem);
  const deleteItem = useEvalsStore((s) => s.deleteItem);

  const nodes = useNodesStore((s) => s.nodes);
  const edges = useEdgesStore((s) => s.edges);
  const validation = useValidation();

  const { generateEvals, isGenerating, error, clearError } = useEvalGenerate();
  const [notice, setNotice] = useState<string | null>(null);

  const [dimensionFilter, setDimensionFilter] = useState<EvalDimension | 'all'>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [showDismissed, setShowDismissed] = useState(false);

  const reactFlow = useReactFlow();

  const proposals = useMemo(() => items.filter((i) => i.status === 'proposed'), [items]);
  const accepted = useMemo(() => items.filter((i) => i.status === 'accepted'), [items]);
  const dismissed = useMemo(() => items.filter((i) => i.status === 'dismissed'), [items]);

  const effectiveScope = evalsNodeFilter || scopeFilter;

  const visibleList = useMemo(() => {
    const base = showDismissed ? [...accepted, ...dismissed] : accepted;

    return base.filter((item) => {
      if (dimensionFilter !== 'all' && item.dimension !== dimensionFilter) return false;
      if (effectiveScope === 'all') return true;
      if (effectiveScope === 'workflow') return item.linkedNodeId === null;
      return item.linkedNodeId === effectiveScope;
    });
  }, [accepted, dismissed, showDismissed, dimensionFilter, effectiveScope]);

  const getNodeName = (nodeId: string | null) => {
    if (!nodeId) return 'Blueprint Overall';
    const node = nodes.find((n) => n.id === nodeId);
    return (node?.data.name as string) || 'Unknown Node';
  };

  const navigateToNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    reactFlow.setCenter(node.position.x + 90, node.position.y + 40, { zoom: 1, duration: 800 });
    closeEvals();
  };

  const handleGenerate = async () => {
    clearError();
    setNotice(null);

    const metadata = useBlueprintStore.getState();
    const existing = useEvalsStore.getState().items;
    const candidates = await generateEvals(nodes, edges, metadata, existing);
    if (candidates.length === 0) return;

    // Merge is additive: it can only add proposals or skip ones already covered.
    const { added, skipped } = mergeEvalCandidates(useEvalsStore.getState().items, candidates);

    if (added.length > 0) addProposals(added);

    if (added.length === 0) {
      setNotice('Everything proposed is already covered by your existing evals.');
    } else if (skipped.length > 0) {
      setNotice(
        `Added ${added.length} new ${added.length === 1 ? 'eval' : 'evals'}; skipped ${skipped.length} already covered.`
      );
    } else {
      setNotice(`Added ${added.length} proposed ${added.length === 1 ? 'eval' : 'evals'} to review.`);
    }
  };

  const acceptAll = () => proposals.forEach((p) => updateItem(p.id, { status: 'accepted' }));

  const hasEvals = accepted.length > 0;

  return (
    <div
      className={`fixed right-0 top-12 bottom-0 w-[28rem] bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col transition-transform duration-200 ${
        isEvalsOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Evals</h2>
          {accepted.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              {accepted.length}
            </span>
          )}
          {proposals.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
              {proposals.length} to review
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEvalItemDialog()}
            className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {hasEvals ? 'Refresh evals' : 'Generate evals'}
          </button>
          <button
            onClick={closeEvals}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error / notice */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {notice && !error && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 shrink-0">
          {notice}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-100 shrink-0">
        <select
          aria-label="Filter by dimension"
          value={dimensionFilter}
          onChange={(e) => setDimensionFilter(e.target.value as EvalDimension | 'all')}
          className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="all">All dimensions</option>
          {EVAL_DIMENSIONS.map((d) => (
            <option key={d} value={d}>
              {EVAL_DIMENSION_LABELS[d]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by scope"
          value={effectiveScope}
          onChange={(e) => {
            setScopeFilter(e.target.value);
            if (evalsNodeFilter) useUIStore.setState({ evalsNodeFilter: null });
          }}
          className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="all">All scopes</option>
          <option value="workflow">Blueprint Overall</option>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {(n.data.name as string) || n.id}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
          <input
            type="checkbox"
            checked={showDismissed}
            onChange={(e) => setShowDismissed(e.target.checked)}
          />
          Dismissed
        </label>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Proposals awaiting review */}
        {proposals.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Proposed ({proposals.length})
              </h3>
              <button
                onClick={acceptAll}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Accept all
              </button>
            </div>
            <div className="space-y-3">
              {proposals.map((item) => (
                <EvalCard
                  key={item.id}
                  item={item}
                  scopeName={getNodeName(item.linkedNodeId)}
                  onNavigateToNode={navigateToNode}
                  onEdit={() => openEvalItemDialog(item.id)}
                  onAccept={() => updateItem(item.id, { status: 'accepted' })}
                  onDismiss={() => updateItem(item.id, { status: 'dismissed' })}
                />
              ))}
            </div>
          </section>
        )}

        {/* Accepted evals */}
        {items.length === 0 ? (
          <EmptyState errorCount={validation.errors.length} nodeCount={nodes.length} />
        ) : (
          visibleList.length > 0 && (
            <section>
              {proposals.length > 0 && (
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Evaluation plan ({visibleList.length})
                </h3>
              )}
              <div className="space-y-3">
                {visibleList.map((item) => (
                  <EvalCard
                    key={item.id}
                    item={item}
                    scopeName={getNodeName(item.linkedNodeId)}
                    onNavigateToNode={navigateToNode}
                    onEdit={() => openEvalItemDialog(item.id)}
                    onDelete={() => deleteItem(item.id)}
                    onRestore={
                      item.status === 'dismissed'
                        ? () => updateItem(item.id, { status: 'accepted' })
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )
        )}

        {items.length > 0 && visibleList.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-4">
            No evals match the current filters.
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ errorCount, nodeCount }: { errorCount: number; nodeCount: number }) {
  return (
    <div className="text-center py-10 px-4">
      <ClipboardCheck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p className="text-sm font-medium text-gray-700">No evals yet</p>
      <p className="text-xs text-gray-500 mt-2 leading-relaxed">
        Evals are the checks that tell you whether this workflow is working once it is built —
        did it reach the right outcome, take a sound path, stay inside its guardrails, and escalate
        the right things to a human.
      </p>
      <p className="text-xs text-gray-500 mt-2 leading-relaxed">
        <span className="font-medium">Generate evals</span> reads the whole blueprint and proposes a
        starter set. It works best once the workflow is roughly complete.
      </p>
      {nodeCount > 0 && errorCount > 0 && (
        <p className="text-xs text-amber-600 mt-3">
          {errorCount} validation {errorCount === 1 ? 'error' : 'errors'} outstanding — worth fixing
          first for a sharper set.
        </p>
      )}
    </div>
  );
}

function EvalCard({
  item,
  scopeName,
  onNavigateToNode,
  onEdit,
  onAccept,
  onDismiss,
  onDelete,
  onRestore,
}: {
  item: EvalItem;
  scopeName: string;
  onNavigateToNode: (nodeId: string) => void;
  onEdit: () => void;
  onAccept?: () => void;
  onDismiss?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
}) {
  const dimensionColors = EVAL_DIMENSION_COLORS[item.dimension];
  const priorityColors = EVAL_PRIORITY_COLORS[item.priority];

  return (
    <div
      className={`bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow ${
        item.status === 'proposed' ? 'border-purple-200 bg-purple-50/40' : 'border-gray-200'
      } ${item.status === 'dismissed' ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${dimensionColors.bg} ${dimensionColors.text}`}
            >
              {EVAL_DIMENSION_LABELS[item.dimension]}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
              {EVAL_GRADER_LABELS[item.graderType]}
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors.bg} ${priorityColors.text}`}
            >
              {item.priority}
            </span>
            {item.edited && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                edited
              </span>
            )}
          </div>

          <h4 className="text-sm font-semibold text-gray-800 mt-1.5">{item.title}</h4>
          <p className="text-xs text-gray-700 mt-1 italic">{item.question}</p>

          {item.passCriteria && (
            <p className="text-xs text-gray-600 mt-1.5">
              <span className="font-medium text-gray-500">Pass: </span>
              {item.passCriteria}
            </p>
          )}
          {item.dataNeeded && (
            <p className="text-xs text-gray-600 mt-1">
              <span className="font-medium text-gray-500">Data: </span>
              {item.dataNeeded}
            </p>
          )}
          {item.failureMode && (
            <p className="text-xs text-gray-600 mt-1">
              <span className="font-medium text-gray-500">Catches: </span>
              {item.failureMode}
            </p>
          )}
          {item.aiNotes && <p className="text-xs text-gray-400 mt-1">{item.aiNotes}</p>}

          {item.linkedNodeId ? (
            <button
              onClick={() => onNavigateToNode(item.linkedNodeId!)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1.5 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {scopeName}
            </button>
          ) : (
            <p className="text-xs text-gray-400 mt-1.5">Blueprint Overall</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            title="Edit eval"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              title="Delete eval"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {(onAccept || onDismiss || onRestore) && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
          {onAccept && (
            <button
              onClick={onAccept}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Check className="w-3 h-3" />
              Accept
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Dismiss
            </button>
          )}
          {onRestore && (
            <button
              onClick={onRestore}
              className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              Restore
            </button>
          )}
        </div>
      )}
    </div>
  );
}
