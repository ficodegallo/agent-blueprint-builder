import { describe, it, expect, beforeEach } from 'vitest';
import { loadSession, saveSession, clearSession } from './interviewSessionStorage';
import { emptyCoverage, parkedQuestionKey, type InterviewSession } from './types';

const session = (overrides: Partial<InterviewSession> = {}): InterviewSession => ({
  mode: 'discovery',
  processContext: 'Invoice approval',
  messages: [{ role: 'user', displayText: 'hi', apiText: 'hi' }],
  coverage: emptyCoverage(),
  parkedQuestions: [
    { id: parkedQuestionKey('volumes', 'What SLA?'), question: 'What SLA?', area: 'volumes', why: 'timeouts' },
  ],
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('interviewSessionStorage', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a session for the same blueprint id', () => {
    saveSession('bp-1', session());
    const loaded = loadSession('bp-1');
    expect(loaded?.mode).toBe('discovery');
    expect(loaded?.parkedQuestions).toHaveLength(1);
    expect(loaded?.processContext).toBe('Invoice approval');
  });

  it('returns null for a missing key', () => {
    expect(loadSession('nope')).toBeNull();
  });

  it('returns null (no throw) for malformed JSON', () => {
    localStorage.setItem('blueprint-builder:interview-session:bad', '{not json');
    expect(loadSession('bad')).toBeNull();
  });

  it('returns null when the stored mode is invalid', () => {
    localStorage.setItem('blueprint-builder:interview-session:x', JSON.stringify({ mode: 'bogus' }));
    expect(loadSession('x')).toBeNull();
  });

  it('keeps sessions for different blueprint ids independent', () => {
    saveSession('bp-1', session({ processContext: 'one' }));
    saveSession('bp-2', session({ processContext: 'two' }));
    expect(loadSession('bp-1')?.processContext).toBe('one');
    expect(loadSession('bp-2')?.processContext).toBe('two');
  });

  it('clearSession removes the persisted session', () => {
    saveSession('bp-1', session());
    clearSession('bp-1');
    expect(loadSession('bp-1')).toBeNull();
  });
});
