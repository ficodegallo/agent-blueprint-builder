import type { OrchestrationPatternId } from './types';

/**
 * A single yes/no question in the guided picker. The questions are walked
 * top-down (simplest pattern first); the first "yes" resolves to that
 * question's pattern, honoring the escalate-only-when-needed principle.
 */
export interface PatternQuestion {
  id: string;
  /** The question shown to the user. */
  question: string;
  /** Short clarifier under the question. */
  help: string;
  /** Pattern selected when the user answers "yes". */
  patternIfYes: OrchestrationPatternId;
}

/** Ordered decision-tree. Order encodes the simplest-first bias. */
export const PATTERN_QUESTIONS: PatternQuestion[] = [
  {
    id: 'fixed-path',
    question: 'Is the sequence of steps known and fixed in advance?',
    help: 'The same ordered steps run every time, regardless of the input.',
    patternIfYes: 'pipeline',
  },
  {
    id: 'distinct-categories',
    question: 'Do inputs fall into distinct categories that each need different handling?',
    help: 'You can reliably tell which category an input belongs to, and each goes down its own path.',
    patternIfYes: 'routing',
  },
  {
    id: 'independent-subtasks',
    question: 'Are there independent subtasks that can run at the same time?',
    help: 'The work splits into pieces with no dependency between them — or repeating the same task improves confidence.',
    patternIfYes: 'parallel',
  },
  {
    id: 'iterate-on-quality',
    question: 'Does the output need to be iterated and critiqued against clear quality criteria?',
    help: 'You can state what "good enough" means, and looping to improve it is worth the cost.',
    patternIfYes: 'evaluator',
  },
  {
    id: 'dynamic-decomposition',
    question: 'Must the subtasks be figured out dynamically, or does one agent hit a specialization or scale ceiling?',
    help: 'A manager needs to decide the subtasks per input and delegate to specialized workers.',
    patternIfYes: 'orchestrator',
  },
];

/** Fallback when no question resolves to a workflow pattern. */
export const DEFAULT_PATTERN: OrchestrationPatternId = 'agent';

export type PatternAnswers = Record<string, 'yes' | 'no' | undefined>;

export interface PatternRecommendation {
  patternId: OrchestrationPatternId;
  rationale: string;
}

/**
 * Walk the decision-tree top-down and return the first pattern whose question
 * was answered "yes". If none are, the task is open-ended → Autonomous Agent.
 */
export function recommendPatternFromAnswers(answers: PatternAnswers): PatternRecommendation {
  for (const q of PATTERN_QUESTIONS) {
    if (answers[q.id] === 'yes') {
      return {
        patternId: q.patternIfYes,
        rationale: `You indicated: "${q.question}" — which points to this pattern.`,
      };
    }
  }
  return {
    patternId: DEFAULT_PATTERN,
    rationale:
      'None of the simpler workflow shapes fit — the steps cannot be laid out in advance, so a single autonomous agent with the right skills is the best starting point.',
  };
}
