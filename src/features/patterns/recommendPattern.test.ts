import { describe, it, expect } from 'vitest';
import {
  recommendPatternFromAnswers,
  PATTERN_QUESTIONS,
  DEFAULT_PATTERN,
} from './recommendPattern';
import { isOrchestrationPatternId } from './patterns';

describe('recommendPatternFromAnswers', () => {
  it('known fixed path → pipeline', () => {
    expect(recommendPatternFromAnswers({ 'fixed-path': 'yes' }).patternId).toBe('pipeline');
  });

  it('distinct categories → routing', () => {
    expect(
      recommendPatternFromAnswers({ 'fixed-path': 'no', 'distinct-categories': 'yes' }).patternId
    ).toBe('routing');
  });

  it('independent concurrent subtasks → parallel', () => {
    expect(
      recommendPatternFromAnswers({
        'fixed-path': 'no',
        'distinct-categories': 'no',
        'independent-subtasks': 'yes',
      }).patternId
    ).toBe('parallel');
  });

  it('iterate against criteria → evaluator', () => {
    expect(
      recommendPatternFromAnswers({
        'fixed-path': 'no',
        'distinct-categories': 'no',
        'independent-subtasks': 'no',
        'iterate-on-quality': 'yes',
      }).patternId
    ).toBe('evaluator');
  });

  it('dynamic decomposition / specialization ceiling → orchestrator', () => {
    expect(
      recommendPatternFromAnswers({
        'fixed-path': 'no',
        'distinct-categories': 'no',
        'independent-subtasks': 'no',
        'iterate-on-quality': 'no',
        'dynamic-decomposition': 'yes',
      }).patternId
    ).toBe('orchestrator');
  });

  it('all no / open-ended → autonomous agent', () => {
    expect(recommendPatternFromAnswers({}).patternId).toBe(DEFAULT_PATTERN);
    expect(DEFAULT_PATTERN).toBe('agent');
  });

  it('walks top-down: an earlier yes wins over a later yes', () => {
    // Both fixed-path and dynamic-decomposition are "yes" — the simpler
    // (earlier) pattern must win.
    const rec = recommendPatternFromAnswers({
      'fixed-path': 'yes',
      'dynamic-decomposition': 'yes',
    });
    expect(rec.patternId).toBe('pipeline');
  });

  it('every question maps to a valid pattern id and returns a rationale', () => {
    for (const q of PATTERN_QUESTIONS) {
      const rec = recommendPatternFromAnswers({ [q.id]: 'yes' });
      expect(isOrchestrationPatternId(rec.patternId)).toBe(true);
      expect(rec.rationale).toBeTruthy();
    }
  });
});
