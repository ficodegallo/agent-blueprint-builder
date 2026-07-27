import type { OrchestrationPattern, OrchestrationPatternId } from './types';

/**
 * The orchestration-pattern catalog — the single source of truth consumed by
 * all three creation paths (manual picker, Smart Import recommender, and the
 * Interviewer) and by the editor.
 *
 * Taxonomy: Anthropic, "Building Effective Agents" (Dec 2024), reconciled with
 * the OpenAI Agents SDK, LangGraph, CrewAI, Microsoft Agent Framework, and
 * Google ADK. Ordered simplest → most-agentic to honor the house rule of
 * preferring the least-agentic pattern that satisfies the task.
 *
 * Sources:
 * - https://www.anthropic.com/research/building-effective-agents
 * - https://developers.openai.com/api/docs/guides/agents/orchestration
 * - https://docs.langchain.com/oss/python/langgraph/workflows-agents
 * - https://machinelearningmastery.com/choosing-the-right-agentic-design-pattern-a-decision-tree-approach/
 */
export const ALL_PATTERNS: OrchestrationPattern[] = [
  {
    id: 'pipeline',
    name: 'Sequential Pipeline',
    tagline: 'Fixed, ordered steps — each builds on the last.',
    description:
      'A known sequence of steps where each consumes the previous output, with optional gate checks between steps. You own the control flow; the LLM fills each step. The simplest pattern — reach for it first.',
    whenToUse: [
      'The solution path is known and fixed in advance',
      'The task decomposes cleanly into a set order of subtasks',
      'You want per-step accuracy over end-to-end latency',
    ],
    avoidWhen: [
      'Step order depends on the input and cannot be fixed up front',
      'The input needs to branch to different specialized handlers',
    ],
    nodeTypes: ['work', 'decision'],
    researchNote: 'Anthropic "prompt chaining"; Google ADK SequentialAgent.',
  },
  {
    id: 'routing',
    name: 'Routing',
    tagline: 'Classify the input, then send it down the right path.',
    description:
      'A classifier inspects the input and dispatches it to one of several specialized downstream paths, each tuned to its category. Keeps each path simple and legible.',
    whenToUse: [
      'Inputs fall into distinct categories that each need different handling',
      'Categories are reliably distinguishable',
      'You want to route easy vs. hard cases to cheaper vs. stronger handling',
    ],
    avoidWhen: [
      'Classification itself is unreliable or the categories blur together',
      'Every input is handled the same way',
    ],
    nodeTypes: ['router', 'work'],
    researchNote: 'Anthropic "routing"; OpenAI handoffs; LangGraph routing.',
  },
  {
    id: 'parallel',
    name: 'Parallelization',
    tagline: 'Fan work out to run at once, then combine the results.',
    description:
      'Split into independent subtasks that run concurrently (sectioning), or run the same task several times for diverse takes (voting), then aggregate at a join. Trades coordination for speed or confidence.',
    whenToUse: [
      'Independent subtasks can run at the same time',
      'Repeated sampling improves confidence (voting)',
      'Latency matters and the work divides cleanly',
    ],
    avoidWhen: [
      'Subtasks depend on each other and must run in order',
      'There is no sound way to aggregate the branch results',
    ],
    nodeTypes: ['parallel', 'work'],
    researchNote: 'Anthropic "parallelization" (sectioning + voting); ADK ParallelAgent.',
  },
  {
    id: 'orchestrator',
    name: 'Orchestrator-Workers',
    tagline: 'A manager agent decomposes the work and delegates it.',
    description:
      'A central manager LLM breaks the task down at runtime, delegates subtasks to worker agents, and synthesizes their results. Like parallelization, but the subtasks are decided per input rather than fixed in advance.',
    whenToUse: [
      'Subtasks cannot be predicted before seeing the input',
      'A coordinator must plan and assign work dynamically',
      'One worker faces a specialization or scale ceiling',
    ],
    avoidWhen: [
      'The subtasks are known ahead of time (use a pipeline or parallelization)',
      'A single agent can handle the whole task',
    ],
    nodeTypes: ['orchestrator'],
    researchNote: 'Anthropic "orchestrator-workers"; OpenAI manager; LangGraph supervisor.',
  },
  {
    id: 'evaluator',
    name: 'Evaluator-Optimizer',
    tagline: 'Generate, critique against criteria, and iterate until it passes.',
    description:
      'A generator produces a candidate, a separate evaluator scores it against explicit criteria, and the loop repeats until the criteria are met or a cap is hit. Works when you can articulate what "good" means.',
    whenToUse: [
      'Clear evaluation criteria exist',
      'Iteration measurably improves the output',
      'Quality matters more than a single-pass answer',
    ],
    avoidWhen: [
      'The criteria are fuzzy or cannot be checked',
      'A single pass is already good enough',
    ],
    nodeTypes: ['evaluatorOptimizer'],
    researchNote: 'Anthropic "evaluator-optimizer"; Reflexion collapses this into one agent.',
  },
  {
    id: 'agent',
    name: 'Autonomous Agent',
    tagline: 'One agent with skills that plans, acts, and loops to a goal.',
    description:
      'A single agent plans, acts through tools/skills, reads the result, and repeats until a stop condition is met. The most flexible and most costly pattern — use it only when the steps genuinely cannot be laid out in advance. This is the "skills-based" shape: the process becomes the agent\'s skill set.',
    whenToUse: [
      'The problem is open-ended and the steps cannot be hardcoded',
      'The agent needs to react to intermediate results to decide the next move',
      'You are equipping one agent with a set of skills for the whole process',
    ],
    avoidWhen: [
      'A simpler workflow pattern would satisfy the task',
      'Cost, latency, or error compounding over long horizons is a concern',
    ],
    nodeTypes: ['agentLoop'],
    researchNote: 'Anthropic "autonomous agent"; ReAct loop; skills-based single agent.',
  },
];

const PATTERNS_BY_ID: Record<OrchestrationPatternId, OrchestrationPattern> = ALL_PATTERNS.reduce(
  (acc, pattern) => {
    acc[pattern.id] = pattern;
    return acc;
  },
  {} as Record<OrchestrationPatternId, OrchestrationPattern>
);

/** Look up a pattern by id, or undefined for an unknown/blank (freeform) id. */
export function getPattern(id: OrchestrationPatternId | undefined | null): OrchestrationPattern | undefined {
  if (!id) return undefined;
  return PATTERNS_BY_ID[id as OrchestrationPatternId];
}

/** Whether a string is a known orchestration-pattern id. */
export function isOrchestrationPatternId(value: unknown): value is OrchestrationPatternId {
  return typeof value === 'string' && value in PATTERNS_BY_ID;
}

/** Compact one-line-per-pattern summary for injecting into AI prompts. */
export function patternCatalogSummary(): string {
  return ALL_PATTERNS.map(
    (p) => `- ${p.id} (${p.name}): ${p.tagline} Use when: ${p.whenToUse.join('; ')}.`
  ).join('\n');
}
