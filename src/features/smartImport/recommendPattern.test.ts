import { describe, it, expect } from 'vitest';
import { parsePatternRecommendation } from './recommendPattern';

describe('parsePatternRecommendation', () => {
  it('parses a well-formed recommendation', () => {
    const result = parsePatternRecommendation(
      JSON.stringify({ patternId: 'routing', rationale: 'Distinct categories.', confidence: 'high' })
    );
    expect(result.success).toBe(true);
    expect(result.recommendation).toEqual({
      patternId: 'routing',
      rationale: 'Distinct categories.',
      confidence: 'high',
    });
  });

  it('extracts JSON embedded in surrounding prose', () => {
    const text = 'Here is my answer:\n{"patternId":"pipeline","rationale":"Fixed steps.","confidence":"medium"}\nDone.';
    const result = parsePatternRecommendation(text);
    expect(result.success).toBe(true);
    expect(result.recommendation?.patternId).toBe('pipeline');
  });

  it('rejects an unknown pattern id (recoverable → caller falls back)', () => {
    const result = parsePatternRecommendation(
      JSON.stringify({ patternId: 'megagent', rationale: 'x', confidence: 'high' })
    );
    expect(result.success).toBe(false);
    expect(result.recommendation).toBeUndefined();
  });

  it('defaults an invalid confidence to medium', () => {
    const result = parsePatternRecommendation(
      JSON.stringify({ patternId: 'agent', rationale: 'Open-ended.', confidence: 'very-sure' })
    );
    expect(result.success).toBe(true);
    expect(result.recommendation?.confidence).toBe('medium');
  });

  it('fails cleanly on non-JSON', () => {
    expect(parsePatternRecommendation('no json here').success).toBe(false);
  });
});
