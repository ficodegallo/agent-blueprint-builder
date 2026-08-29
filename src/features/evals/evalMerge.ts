import { v4 as uuidv4 } from 'uuid';
import type { EvalCandidate, EvalItem } from '../../types';

/**
 * Additive merge of generated eval candidates into an existing collection.
 *
 * The refresh guarantee lives here: a merge can only ADD proposals or SKIP
 * them. It never edits or deletes an existing eval, so "refresh blew away my
 * edits" is impossible by construction rather than by care.
 *
 * Dedupe mirrors the interviewer's parked-question handling
 * (`src/features/interviewer/parkedQuestions.ts`): a normalized key compared
 * against every existing item regardless of status. Dismissed items are
 * retained precisely so they act as tombstones — a rejected eval is not
 * re-proposed on the next refresh.
 */

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Identity of an eval for dedupe: dimension + scope + normalized title. */
export function evalKey(item: {
  title: string;
  dimension: string;
  linkedNodeId: string | null;
}): string {
  return `${item.dimension}:${item.linkedNodeId ?? 'workflow'}:${normalizeTitle(item.title)}`;
}

export interface MergeEvalResult {
  /** New proposals to add to the collection. */
  added: EvalItem[];
  /** Candidates already covered by an existing eval (accepted, proposed or dismissed). */
  skipped: EvalCandidate[];
}

export function mergeEvalCandidates(
  existing: EvalItem[],
  candidates: EvalCandidate[]
): MergeEvalResult {
  const seen = new Set(existing.map(evalKey));

  const added: EvalItem[] = [];
  const skipped: EvalCandidate[] = [];
  const now = new Date().toISOString();

  for (const candidate of candidates) {
    const key = evalKey(candidate);
    if (seen.has(key)) {
      skipped.push(candidate);
      continue;
    }

    seen.add(key);
    added.push({
      ...candidate,
      id: uuidv4(),
      status: 'proposed',
      origin: 'ai',
      edited: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { added, skipped };
}
