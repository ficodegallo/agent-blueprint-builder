import { describe, it, expect } from 'vitest';
import {
  ALL_PATTERNS,
  getPattern,
  isOrchestrationPatternId,
  patternCatalogSummary,
} from './patterns';
import type { OrchestrationPatternId } from './types';

const EXPECTED_IDS: OrchestrationPatternId[] = [
  'pipeline',
  'routing',
  'parallel',
  'orchestrator',
  'evaluator',
  'agent',
];

describe('pattern catalog', () => {
  it('covers exactly the six pattern ids, uniquely', () => {
    const ids = ALL_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it('every entry has all required non-empty fields', () => {
    for (const p of ALL_PATTERNS) {
      expect(p.name).toBeTruthy();
      expect(p.tagline).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.whenToUse.length).toBeGreaterThan(0);
      expect(p.avoidWhen.length).toBeGreaterThan(0);
      expect(p.nodeTypes.length).toBeGreaterThan(0);
      expect(p.researchNote).toBeTruthy();
    }
  });

  it('getPattern returns the entry for a valid id and undefined otherwise', () => {
    expect(getPattern('routing')?.name).toBe('Routing');
    expect(getPattern(undefined)).toBeUndefined();
    expect(getPattern(null)).toBeUndefined();
    expect(getPattern('nope' as OrchestrationPatternId)).toBeUndefined();
  });

  it('isOrchestrationPatternId narrows only known ids', () => {
    expect(isOrchestrationPatternId('agent')).toBe(true);
    expect(isOrchestrationPatternId('freeform')).toBe(false);
    expect(isOrchestrationPatternId(undefined)).toBe(false);
    expect(isOrchestrationPatternId(42)).toBe(false);
  });

  it('catalog summary lists one line per pattern', () => {
    const summary = patternCatalogSummary();
    for (const p of ALL_PATTERNS) {
      expect(summary).toContain(p.id);
    }
    expect(summary.split('\n')).toHaveLength(ALL_PATTERNS.length);
  });
});
