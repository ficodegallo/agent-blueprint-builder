import { describe, it, expect } from 'vitest';
import { buildPatternDirective, buildUserPrompt } from './constants';
import { DEFAULT_OPTIONS } from './types';

describe('buildPatternDirective', () => {
  it('is empty when no pattern is set', () => {
    expect(buildPatternDirective(null)).toBe('');
    expect(buildPatternDirective(undefined)).toBe('');
  });

  it('includes the pattern name and shaping instructions when set', () => {
    const directive = buildPatternDirective('routing');
    expect(directive).toContain('Routing');
    expect(directive).toContain('router');
  });

  it('ignores an unknown pattern id', () => {
    // @ts-expect-error — deliberately passing an invalid id
    expect(buildPatternDirective('nope')).toBe('');
  });
});

describe('buildUserPrompt pattern injection', () => {
  it('appends a pattern directive when the option is set', () => {
    const prompt = buildUserPrompt('some process', {
      ...DEFAULT_OPTIONS,
      orchestrationPattern: 'orchestrator',
    });
    expect(prompt).toContain('Required orchestration pattern: Orchestrator-Workers');
  });

  it('omits the pattern directive when unset', () => {
    const prompt = buildUserPrompt('some process', DEFAULT_OPTIONS);
    expect(prompt).not.toContain('Required orchestration pattern');
  });
});
