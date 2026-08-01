import { emptyCoverage, type InterviewSession } from './types';

const STORAGE_PREFIX = 'blueprint-builder:interview-session:';

function keyFor(blueprintId: string): string {
  return STORAGE_PREFIX + blueprintId;
}

/**
 * Load a persisted interview session for a blueprint. Returns null when none
 * exists or the stored value is malformed (defensive parse, mirroring
 * loadCustomPrompts in aiPromptStorage).
 */
export function loadSession(blueprintId: string): InterviewSession | null {
  if (!blueprintId) return null;
  try {
    const stored = localStorage.getItem(keyFor(blueprintId));
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<InterviewSession>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.mode !== 'discovery' && parsed.mode !== 'grill') return null;
    return {
      mode: parsed.mode,
      processContext: typeof parsed.processContext === 'string' ? parsed.processContext : '',
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      coverage: { ...emptyCoverage(), ...(parsed.coverage ?? {}) },
      parkedQuestions: Array.isArray(parsed.parkedQuestions) ? parsed.parkedQuestions : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return null;
  }
}

/** Persist an interview session for a blueprint. Failures are swallowed. */
export function saveSession(blueprintId: string, session: InterviewSession): void {
  if (!blueprintId) return;
  try {
    localStorage.setItem(keyFor(blueprintId), JSON.stringify(session));
  } catch {
    // localStorage may be full or unavailable; persistence is best-effort.
  }
}

/** Remove any persisted session for a blueprint. */
export function clearSession(blueprintId: string): void {
  if (!blueprintId) return;
  try {
    localStorage.removeItem(keyFor(blueprintId));
  } catch {
    // ignore
  }
}
