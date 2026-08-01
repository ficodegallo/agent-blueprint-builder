import { describe, it, expect } from 'vitest';
import {
  parkedQuestionKey,
  emptyCoverage,
  COVERAGE_LABELS,
  type CoverageArea,
  type ParkedQuestion,
} from './types';
import { mergeParkedQuestions, pruneCoveredParked, removeParkedByIds } from './parkedQuestions';

/**
 * Mirror of the interviewer's private parseParkedQuestions helper (kept in
 * useInterviewer). Validates that turn parsing drops malformed entries and
 * backfills a stable id. If the hook's logic changes, update both.
 */
function parseParkedQuestions(value: unknown): ParkedQuestion[] {
  if (!Array.isArray(value)) return [];
  const out: ParkedQuestion[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const p = entry as Record<string, unknown>;
    const question = typeof p.question === 'string' ? p.question.trim() : '';
    const area = p.area as CoverageArea;
    if (!question || !(area in COVERAGE_LABELS)) continue;
    out.push({
      id: parkedQuestionKey(area, question),
      question,
      area,
      why: typeof p.why === 'string' ? p.why : '',
      context: typeof p.context === 'string' && p.context.trim() ? p.context.trim() : undefined,
    });
  }
  return out;
}

describe('parkedQuestionKey', () => {
  it('normalizes case and whitespace so equivalent phrasings collide', () => {
    const a = parkedQuestionKey('exceptions', 'What  happens  When It Fails?');
    const b = parkedQuestionKey('exceptions', 'what happens when it fails?');
    expect(a).toBe(b);
  });

  it('keeps distinct questions in the same area separate', () => {
    expect(parkedQuestionKey('steps', 'A')).not.toBe(parkedQuestionKey('steps', 'B'));
  });

  it('keeps the same question text in different areas separate', () => {
    expect(parkedQuestionKey('steps', 'Q')).not.toBe(parkedQuestionKey('systems', 'Q'));
  });
});

describe('parseParkedQuestions (turn parsing)', () => {
  it('parses a valid entry and derives a stable id + defaults', () => {
    const [q] = parseParkedQuestions([
      { question: 'What SLA applies?', area: 'volumes', why: 'Sets timeout budgets.' },
    ]);
    expect(q).toEqual({
      id: parkedQuestionKey('volumes', 'What SLA applies?'),
      question: 'What SLA applies?',
      area: 'volumes',
      why: 'Sets timeout budgets.',
      context: undefined,
    });
  });

  it('keeps a context note when present', () => {
    const [q] = parseParkedQuestions([
      { question: 'Who approves?', area: 'oversight', why: 'Names the gate owner.', context: 'Probably finance.' },
    ]);
    expect(q.context).toBe('Probably finance.');
  });

  it('drops an entry with an unknown coverage area', () => {
    expect(parseParkedQuestions([{ question: 'x', area: 'budget', why: 'y' }])).toEqual([]);
  });

  it('drops an entry with an empty question', () => {
    expect(parseParkedQuestions([{ question: '   ', area: 'steps', why: 'y' }])).toEqual([]);
  });

  it('returns [] for a turn with no parkedQuestions (backward compat)', () => {
    expect(parseParkedQuestions(undefined)).toEqual([]);
    expect(parseParkedQuestions(null)).toEqual([]);
  });
});

describe('mergeParkedQuestions', () => {
  const mk = (area: CoverageArea, question: string, why = ''): ParkedQuestion => ({
    id: parkedQuestionKey(area, question),
    question,
    area,
    why,
  });

  it('appends new questions keyed by id', () => {
    const merged = mergeParkedQuestions([], [mk('steps', 'A'), mk('systems', 'B')]);
    expect(merged.map((q) => q.question)).toEqual(['A', 'B']);
  });

  it('does not duplicate a re-emitted question and refreshes its why', () => {
    const first = mergeParkedQuestions([], [mk('steps', 'A', 'old reason')]);
    const second = mergeParkedQuestions(first, [mk('steps', 'A', 'new reason')]);
    expect(second).toHaveLength(1);
    expect(second[0].why).toBe('new reason');
  });
});

describe('removeParkedByIds (per-question resolution)', () => {
  const mk = (area: CoverageArea, question: string): ParkedQuestion => ({
    id: parkedQuestionKey(area, question),
    question,
    area,
    why: '',
  });

  it('removes only the resolved question, keeping siblings in the same area', () => {
    const list = [mk('exceptions', 'What if it times out?'), mk('exceptions', 'Who is paged?')];
    const resolvedKey = parkedQuestionKey('exceptions', 'What if it times out?');
    const after = removeParkedByIds(list, [resolvedKey]);
    expect(after).toHaveLength(1);
    expect(after[0].question).toBe('Who is paged?');
  });

  it('is a no-op when the id is not present', () => {
    const list = [mk('steps', 'A')];
    expect(removeParkedByIds(list, [parkedQuestionKey('steps', 'B')])).toEqual(list);
  });
});

describe('pruneCoveredParked', () => {
  const mk = (area: CoverageArea, question: string): ParkedQuestion => ({
    id: parkedQuestionKey(area, question),
    question,
    area,
    why: '',
  });

  it('drops parked questions whose area is fully covered', () => {
    const coverage = { ...emptyCoverage(), systems: 'covered' as const };
    const list = [mk('systems', 'Which CRM?'), mk('steps', 'First step?')];
    const after = pruneCoveredParked(list, coverage);
    expect(after.map((q) => q.area)).toEqual(['steps']);
  });

  it('keeps parked questions in a partial area', () => {
    const coverage = { ...emptyCoverage(), exceptions: 'partial' as const };
    const list = [mk('exceptions', 'What if it fails?')];
    expect(pruneCoveredParked(list, coverage)).toHaveLength(1);
  });
});
