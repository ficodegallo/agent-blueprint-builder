import type { Coverage, ParkedQuestion } from './types';

/**
 * Merge freshly-parked questions into the existing list, deduped by id.
 * New keys are appended; a re-emitted key refreshes its why/context (latest
 * wins) without moving or duplicating the entry. The hook owns this list as
 * the source of truth, so the model may safely re-list still-open questions.
 */
export function mergeParkedQuestions(
  existing: ParkedQuestion[],
  incoming: ParkedQuestion[]
): ParkedQuestion[] {
  if (incoming.length === 0) return existing;
  const byId = new Map(existing.map((q) => [q.id, q]));
  for (const q of incoming) {
    const prior = byId.get(q.id);
    byId.set(q.id, prior ? { ...prior, why: q.why, context: q.context } : q);
  }
  // Preserve original order, then append genuinely new entries.
  const seen = new Set<string>();
  const ordered: ParkedQuestion[] = [];
  for (const q of existing) {
    ordered.push(byId.get(q.id)!);
    seen.add(q.id);
  }
  for (const q of incoming) {
    if (!seen.has(q.id)) {
      ordered.push(byId.get(q.id)!);
      seen.add(q.id);
    }
  }
  return ordered;
}

/**
 * Drop parked questions whose coverage area is now fully covered — the owner
 * answered it, so it is no longer an open gap (R3: parked-only areas stay
 * partial, so a "covered" area has no legitimately-open parked question).
 */
export function pruneCoveredParked(
  list: ParkedQuestion[],
  coverage: Coverage
): ParkedQuestion[] {
  return list.filter((q) => coverage[q.area] !== 'covered');
}

/** Remove parked questions by id (used when an answer resolves a specific one). */
export function removeParkedByIds(
  list: ParkedQuestion[],
  ids: Iterable<string>
): ParkedQuestion[] {
  const drop = new Set(ids);
  return list.filter((q) => !drop.has(q.id));
}
