import type { NodeType } from '../../types/nodes';

/**
 * The orchestration pattern a blueprint follows. Chosen or recommended at
 * creation time (manual picker, Smart Import, or Interviewer) and used to
 * scaffold the starting graph. Grounded in Anthropic's "Building Effective
 * Agents" taxonomy — see patterns.ts for the catalog and research sources.
 */
export type OrchestrationPatternId =
  | 'pipeline' // Sequential Pipeline (prompt chaining)
  | 'routing' // Routing / classification
  | 'parallel' // Parallelization (sectioning / voting)
  | 'orchestrator' // Orchestrator-Workers (manager)
  | 'evaluator' // Evaluator-Optimizer loop
  | 'agent'; // Single Autonomous Agent (agent loop / skills-based)

export interface OrchestrationPattern {
  id: OrchestrationPatternId;
  name: string;
  /** One-line hook shown on the picker card. */
  tagline: string;
  /** Fuller description of the pattern's shape and control flow. */
  description: string;
  /** Signals that this pattern fits — shown as "use when" bullets. */
  whenToUse: string[];
  /** Signals that a simpler or different pattern fits better. */
  avoidWhen: string[];
  /** Node types this pattern's scaffold introduces (beyond trigger/end). */
  nodeTypes: NodeType[];
  /** Provenance note kept for traceability to the research pass. */
  researchNote: string;
}
