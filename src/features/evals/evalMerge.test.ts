import { describe, it, expect } from 'vitest';
import { evalKey, normalizeTitle, mergeEvalCandidates } from './evalMerge';
import type { EvalCandidate, EvalItem, EvalStatus } from '../../types';

function existing(overrides: Partial<EvalItem> = {}): EvalItem {
  return {
    id: 'e1',
    title: 'Refund routing accuracy',
    dimension: 'trajectory',
    graderType: 'deterministic',
    question: 'Did refunds over $500 reach the approval gate?',
    passCriteria: 'All over-threshold refunds route to approval',
    dataNeeded: '30 labeled refund requests',
    failureMode: 'Router auto-approves high-value refunds',
    linkedNodeId: null,
    priority: 'high',
    status: 'accepted',
    origin: 'ai',
    edited: false,
    createdAt: '2026-08-26T00:00:00.000Z',
    updatedAt: '2026-08-26T00:00:00.000Z',
    ...overrides,
  };
}

function candidate(overrides: Partial<EvalCandidate> = {}): EvalCandidate {
  return {
    title: 'Refund routing accuracy',
    dimension: 'trajectory',
    graderType: 'deterministic',
    question: 'Did refunds over $500 reach the approval gate?',
    passCriteria: 'All over-threshold refunds route to approval',
    dataNeeded: '30 labeled refund requests',
    failureMode: 'Router auto-approves high-value refunds',
    linkedNodeId: null,
    priority: 'high',
    ...overrides,
  };
}

describe('normalizeTitle / evalKey', () => {
  it('is stable across case, punctuation and whitespace', () => {
    expect(normalizeTitle('Refund routing accuracy')).toBe(
      normalizeTitle('refund  ROUTING, accuracy!')
    );
    expect(evalKey(candidate())).toBe(
      evalKey(candidate({ title: '  refund  ROUTING, accuracy!  ' }))
    );
  });

  it('scopes by node so the same title on different nodes does not collide', () => {
    expect(evalKey(candidate({ linkedNodeId: 'n1' }))).not.toBe(
      evalKey(candidate({ linkedNodeId: 'n2' }))
    );
  });

  it('separates workflow-level from node-level evals with the same title', () => {
    expect(evalKey(candidate({ linkedNodeId: null }))).not.toBe(
      evalKey(candidate({ linkedNodeId: 'n1' }))
    );
  });

  it('separates the same title under a different dimension', () => {
    expect(evalKey(candidate({ dimension: 'trajectory' }))).not.toBe(
      evalKey(candidate({ dimension: 'safety' }))
    );
  });
});

describe('mergeEvalCandidates', () => {
  it.each<EvalStatus>(['accepted', 'proposed', 'dismissed'])(
    'skips a candidate already covered by a %s eval',
    (status) => {
      const result = mergeEvalCandidates([existing({ status })], [candidate()]);

      expect(result.added).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
    }
  );

  it('collapses duplicate candidates within one batch', () => {
    const result = mergeEvalCandidates([], [candidate(), candidate()]);

    expect(result.added).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
  });

  it('adds everything when the existing collection is empty', () => {
    const result = mergeEvalCandidates([], [
      candidate({ title: 'A' }),
      candidate({ title: 'B' }),
      candidate({ title: 'C' }),
    ]);

    expect(result.added).toHaveLength(3);
    expect(result.skipped).toEqual([]);
  });

  it('adds only the genuinely new candidates alongside covered ones', () => {
    const result = mergeEvalCandidates(
      [existing()],
      [candidate(), candidate({ title: 'Loop bound holds', dimension: 'efficiency' })]
    );

    expect(result.added.map((i) => i.title)).toEqual(['Loop bound holds']);
    expect(result.skipped).toHaveLength(1);
  });

  it('never mutates the existing collection', () => {
    const items = [Object.freeze(existing())] as EvalItem[];
    Object.freeze(items);

    expect(() =>
      mergeEvalCandidates(items, [candidate({ title: 'Something new' })])
    ).not.toThrow();
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Refund routing accuracy');
    expect(items[0].status).toBe('accepted');
  });

  it('stamps added items as fresh AI proposals with distinct ids', () => {
    const result = mergeEvalCandidates([], [candidate({ title: 'A' }), candidate({ title: 'B' })]);

    for (const item of result.added) {
      expect(item.status).toBe('proposed');
      expect(item.origin).toBe('ai');
      expect(item.edited).toBe(false);
      expect(item.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(new Date(item.createdAt).toISOString()).toBe(item.createdAt);
      expect(item.updatedAt).toBe(item.createdAt);
    }
    expect(result.added[0].id).not.toBe(result.added[1].id);
  });

  it('preserves the candidate payload on added items', () => {
    const source = candidate({
      title: 'Escalation correctness',
      dimension: 'oversight',
      graderType: 'hybrid',
      linkedNodeId: 'n7',
      priority: 'medium',
      aiConfidence: 'medium',
      aiNotes: 'Assumes the reviewer queue is the escalation path',
    });

    const [added] = mergeEvalCandidates([], [source]).added;

    expect(added).toMatchObject({
      title: 'Escalation correctness',
      dimension: 'oversight',
      graderType: 'hybrid',
      linkedNodeId: 'n7',
      priority: 'medium',
      aiConfidence: 'medium',
      aiNotes: 'Assumes the reviewer queue is the escalation path',
    });
  });
});
