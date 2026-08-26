/**
 * Workflow evals — the checks that tell you whether this agentic workflow is
 * actually working once it is built and running.
 *
 * An eval is a *specification*, not an implementation: the builder never runs
 * or scores anything. Each item carries what an engineer needs to build the
 * check — a binary pass/fail question, what "pass" means, which grader type
 * fits, what test data it needs, and the concrete failure mode it protects
 * against.
 */

/** What the eval measures. */
export type EvalDimension =
  | 'outcome' // did the workflow accomplish the goal (end state)
  | 'trajectory' // how it got there — routing, tool calls, step efficiency
  | 'quality' // groundedness, accuracy, completeness of what it produced
  | 'safety' // guardrails, policy, irreversible actions
  | 'oversight' // human-in-the-loop escalation and approval correctness
  | 'efficiency'; // cost, latency, iteration counts

/** How the eval is graded. */
export type EvalGraderType =
  | 'deterministic' // code/assertion — exact, reproducible
  | 'llm-judge' // model-graded rubric for criteria needing judgment
  | 'human-review' // subject-matter expert review; also calibrates the others
  | 'hybrid'; // deterministic gate plus a judged criterion

/** Review state. `dismissed` items are retained as refresh tombstones. */
export type EvalStatus = 'proposed' | 'accepted' | 'dismissed';

export type EvalOrigin = 'ai' | 'manual';

export type EvalPriority = 'high' | 'medium' | 'low';

export type EvalConfidence = 'high' | 'medium' | 'low';

export interface EvalItem {
  id: string;
  title: string;
  dimension: EvalDimension;
  graderType: EvalGraderType;
  /** The binary pass/fail question this eval answers. One criterion only. */
  question: string;
  /** What counts as a pass. */
  passCriteria: string;
  /** Traces, golden cases, or fixtures the check requires. */
  dataNeeded: string;
  /** The concrete failure this eval protects against. */
  failureMode: string;
  /** null = the blueprint overall, matching the Parking Lot convention. */
  linkedNodeId: string | null;
  priority: EvalPriority;
  status: EvalStatus;
  origin: EvalOrigin;
  aiConfidence?: EvalConfidence;
  aiNotes?: string;
  /** True once a person has changed an AI-generated eval's content. */
  edited: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * An eval as returned by generation, before it becomes an EvalItem. Carries
 * only the authoring fields — ids, timestamps and review state are assigned
 * client-side.
 */
export type EvalCandidate = Pick<
  EvalItem,
  | 'title'
  | 'dimension'
  | 'graderType'
  | 'question'
  | 'passCriteria'
  | 'dataNeeded'
  | 'failureMode'
  | 'linkedNodeId'
  | 'priority'
> & {
  aiConfidence?: EvalConfidence;
  aiNotes?: string;
};

export const EVAL_DIMENSIONS: EvalDimension[] = [
  'outcome',
  'trajectory',
  'quality',
  'safety',
  'oversight',
  'efficiency',
];

export const EVAL_GRADER_TYPES: EvalGraderType[] = [
  'deterministic',
  'llm-judge',
  'human-review',
  'hybrid',
];

export const EVAL_PRIORITIES: EvalPriority[] = ['high', 'medium', 'low'];

export const EVAL_DIMENSION_LABELS: Record<EvalDimension, string> = {
  outcome: 'Outcome',
  trajectory: 'Trajectory',
  quality: 'Quality',
  safety: 'Safety',
  oversight: 'Oversight',
  efficiency: 'Efficiency',
};

export const EVAL_DIMENSION_DESCRIPTIONS: Record<EvalDimension, string> = {
  outcome: 'Did the workflow reach the right end state?',
  trajectory: 'Did it take a sound path — routing, tool calls, step count?',
  quality: 'Is what it produced accurate, grounded and complete?',
  safety: 'Did guardrails hold on risky or irreversible actions?',
  oversight: 'Did the right things reach a human, at the right time?',
  efficiency: 'Did it stay inside cost, latency and iteration budgets?',
};

export const EVAL_GRADER_LABELS: Record<EvalGraderType, string> = {
  deterministic: 'Deterministic',
  'llm-judge': 'LLM judge',
  'human-review': 'Human review',
  hybrid: 'Hybrid',
};

export const EVAL_DIMENSION_COLORS: Record<EvalDimension, { bg: string; text: string }> = {
  outcome: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  trajectory: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  quality: { bg: 'bg-blue-100', text: 'text-blue-700' },
  safety: { bg: 'bg-red-100', text: 'text-red-700' },
  oversight: { bg: 'bg-amber-100', text: 'text-amber-700' },
  efficiency: { bg: 'bg-teal-100', text: 'text-teal-700' },
};

export const EVAL_PRIORITY_COLORS: Record<EvalPriority, { bg: string; text: string }> = {
  high: { bg: 'bg-red-100', text: 'text-red-700' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700' },
  low: { bg: 'bg-gray-100', text: 'text-gray-700' },
};
