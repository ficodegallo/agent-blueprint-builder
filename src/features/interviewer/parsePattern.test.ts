import { describe, it, expect } from 'vitest';
import type { InterviewerPatternRecommendation } from './types';
import { isOrchestrationPatternId } from '../patterns/patterns';

/**
 * Mirror of the interviewer's parsePattern helper (kept private in
 * useInterviewer). Validates that recommendedPattern parsing tolerates missing
 * data and rejects out-of-catalog ids. If the hook's logic changes, update both.
 */
function parsePattern(value: unknown): InterviewerPatternRecommendation | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const p = value as Record<string, unknown>;
  if (!isOrchestrationPatternId(p.id)) return undefined;
  const confidence =
    p.confidence === 'high' || p.confidence === 'medium' || p.confidence === 'low'
      ? p.confidence
      : 'medium';
  return {
    id: p.id,
    rationale: typeof p.rationale === 'string' ? p.rationale : '',
    confidence,
  };
}

describe('interviewer recommendedPattern parsing', () => {
  it('returns undefined when absent (existing turns still work)', () => {
    expect(parsePattern(undefined)).toBeUndefined();
    expect(parsePattern(null)).toBeUndefined();
  });

  it('parses a valid recommendation', () => {
    expect(parsePattern({ id: 'orchestrator', rationale: 'Dynamic delegation.', confidence: 'high' })).toEqual({
      id: 'orchestrator',
      rationale: 'Dynamic delegation.',
      confidence: 'high',
    });
  });

  it('rejects an out-of-catalog id', () => {
    expect(parsePattern({ id: 'superagent', rationale: 'x', confidence: 'high' })).toBeUndefined();
  });

  it('defaults an invalid confidence to medium and tolerates a missing rationale', () => {
    expect(parsePattern({ id: 'pipeline' })).toEqual({
      id: 'pipeline',
      rationale: '',
      confidence: 'medium',
    });
  });
});
