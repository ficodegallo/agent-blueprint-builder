import {
  EVAL_DIMENSIONS,
  EVAL_GRADER_TYPES,
  EVAL_PRIORITIES,
  type EvalCandidate,
  type EvalConfidence,
  type EvalDimension,
  type EvalGraderType,
  type EvalPriority,
} from '../../types';

/**
 * Hard cap on how many candidates one generation run can contribute. The prompt
 * asks for 5-6; the cap stops a runaway response from flooding the panel.
 */
export const MAX_EVAL_CANDIDATES = 8;

const CONFIDENCES: EvalConfidence[] = ['high', 'medium', 'low'];

export interface ParseEvalResponseResult {
  items: EvalCandidate[];
  /** Candidates rejected for missing a required field or being unusable. */
  dropped: number;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  const candidate = str(value).toLowerCase();
  return (allowed as string[]).includes(candidate) ? (candidate as T) : fallback;
}

/**
 * Parse and normalize an eval-generation response.
 *
 * Every field is coerced to a known value or the candidate is dropped — a
 * malformed response must degrade to "no candidates plus a visible error",
 * never to a crash or to an eval pointing at a node that does not exist.
 *
 * @param raw Raw text returned by the model (may wrap the JSON array in prose).
 * @param nodeIds Ids present on the canvas; anything else becomes workflow-level.
 */
export function parseEvalResponse(raw: string, nodeIds: Set<string>): ParseEvalResponseResult {
  const match = raw?.match(/\[[\s\S]*\]/);
  if (!match) return { items: [], dropped: 0 };

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { items: [], dropped: 0 };
  }

  if (!Array.isArray(parsed)) return { items: [], dropped: 0 };

  const items: EvalCandidate[] = [];
  let dropped = 0;

  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') {
      dropped++;
      continue;
    }

    const e = entry as Record<string, unknown>;
    const title = str(e.title);
    const question = str(e.question);

    if (!title || !question) {
      dropped++;
      continue;
    }

    if (items.length >= MAX_EVAL_CANDIDATES) {
      dropped++;
      continue;
    }

    const rawNodeId = str(e.linkedNodeId);
    const notes = str(e.notes) || str(e.aiNotes);
    const confidence = str(e.confidence) || str(e.aiConfidence);

    items.push({
      title,
      question,
      dimension: oneOf<EvalDimension>(e.dimension, EVAL_DIMENSIONS, 'quality'),
      graderType: oneOf<EvalGraderType>(e.graderType, EVAL_GRADER_TYPES, 'llm-judge'),
      passCriteria: str(e.passCriteria),
      dataNeeded: str(e.dataNeeded),
      failureMode: str(e.failureMode),
      // A hallucinated node id degrades to a workflow-level eval rather than dangling.
      linkedNodeId: rawNodeId && nodeIds.has(rawNodeId) ? rawNodeId : null,
      priority: oneOf<EvalPriority>(e.priority, EVAL_PRIORITIES, 'medium'),
      ...(CONFIDENCES.includes(confidence as EvalConfidence)
        ? { aiConfidence: confidence as EvalConfidence }
        : {}),
      ...(notes ? { aiNotes: notes } : {}),
    });
  }

  return { items, dropped };
}
