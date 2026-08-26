import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEvalGenerate } from './useEvalGenerate';
import { saveCustomPrompts, resetFeaturePrompts } from '../utils/aiPromptStorage';
import type { AppNode } from '../store/nodesStore';
import type { EvalItem } from '../types';

const API_KEY_STORAGE = 'blueprint-builder:claude-api-key';

const NODES: AppNode[] = [
  {
    id: 'n1',
    type: 'work',
    position: { x: 0, y: 0 },
    data: { nodeType: 'work', name: 'Refund Agent', workerType: 'agent', goal: 'Issue refunds' },
  } as AppNode,
];

const EXISTING: EvalItem[] = [
  {
    id: 'e1',
    title: 'Existing outcome check',
    dimension: 'outcome',
    graderType: 'deterministic',
    question: 'Did the refund settle?',
    passCriteria: 'Receipt exists',
    dataNeeded: '20 traces',
    failureMode: 'Refund silently dropped',
    linkedNodeId: null,
    priority: 'high',
    status: 'accepted',
    origin: 'manual',
    edited: false,
    createdAt: '2026-08-26T00:00:00.000Z',
    updatedAt: '2026-08-26T00:00:00.000Z',
  },
];

function apiResponse(text: string) {
  return {
    ok: true,
    json: async () => ({ content: [{ text }] }),
  } as unknown as Response;
}

const VALID_CANDIDATES = JSON.stringify([
  {
    title: 'Approval gate holds',
    dimension: 'oversight',
    graderType: 'deterministic',
    question: 'Did every over-threshold refund reach a human?',
    passCriteria: 'No auto-approved refund exceeds $500',
    dataNeeded: '30 labeled refund requests',
    failureMode: 'Gate is decorative',
    linkedNodeId: 'n1',
    priority: 'high',
    confidence: 'high',
  },
]);

describe('useEvalGenerate', () => {
  beforeEach(() => {
    localStorage.setItem(API_KEY_STORAGE, btoa('sk-ant-test-key'));
    resetFeaturePrompts('evalGenerate');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('sets candidates on a successful generation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse(VALID_CANDIDATES)));

    const { result } = renderHook(() => useEvalGenerate());

    await act(async () => {
      await result.current.generateEvals(NODES, [], { title: 'Refunds' }, []);
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.candidates).toHaveLength(1);
    expect(result.current.candidates[0].title).toBe('Approval gate holds');
    expect(result.current.candidates[0].linkedNodeId).toBe('n1');
  });

  it('errors without calling the API when no key is configured', async () => {
    localStorage.removeItem(API_KEY_STORAGE);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEvalGenerate());

    await act(async () => {
      await result.current.generateEvals(NODES, [], {}, []);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.error).toContain('API key not found');
  });

  it("surfaces the API's error message on a non-ok response", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'rate limit exceeded' } }),
      } as unknown as Response)
    );

    const { result } = renderHook(() => useEvalGenerate());

    await act(async () => {
      await result.current.generateEvals(NODES, [], {}, []);
    });

    expect(result.current.error).toBe('rate limit exceeded');
    expect(result.current.isGenerating).toBe(false);
  });

  it('falls back to the status code when the API sends no message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as unknown as Response)
    );

    const { result } = renderHook(() => useEvalGenerate());

    await act(async () => {
      await result.current.generateEvals(NODES, [], {}, []);
    });

    expect(result.current.error).toBe('API request failed: 500');
  });

  it('reports an aborted request as a timeout and stops generating', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const { result } = renderHook(() => useEvalGenerate());

    await act(async () => {
      await result.current.generateEvals(NODES, [], {}, []);
    });

    expect(result.current.error).toContain('timed out');
    expect(result.current.isGenerating).toBe(false);
  });

  it('errors when the response contains no readable evals', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse('sorry, no evals for you')));

    const { result } = renderHook(() => useEvalGenerate());

    await act(async () => {
      await result.current.generateEvals(NODES, [], {}, []);
    });

    expect(result.current.error).toContain('Could not read any evals');
    expect(result.current.candidates).toEqual([]);
  });

  it('substitutes every placeholder, including the existing eval titles', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(VALID_CANDIDATES));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEvalGenerate());

    await act(async () => {
      await result.current.generateEvals(
        NODES,
        [],
        { title: 'Refund Triage', orchestrationPattern: 'routing' },
        EXISTING
      );
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const prompt = body.messages[0].content as string;

    expect(prompt).not.toContain('{{EVAL_PRACTICES}}');
    expect(prompt).not.toContain('{{BLUEPRINT_METADATA}}');
    expect(prompt).not.toContain('{{BLUEPRINT_TEXT}}');
    expect(prompt).not.toContain('{{EXISTING_EVALS}}');
    expect(prompt).toContain('Built-in eval design rules');
    expect(prompt).toContain('Title: Refund Triage');
    expect(prompt).toContain('Orchestration pattern: Routing');
    expect(prompt).toContain('Node [n1] "Refund Agent"');
    expect(prompt).toContain('Existing outcome check');
  });

  it('uses custom prompts when they are saved', async () => {
    saveCustomPrompts('evalGenerate', {
      systemPrompt: 'CUSTOM SYSTEM',
      userPromptTemplate: 'CUSTOM USER {{BLUEPRINT_TEXT}}',
    });
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(VALID_CANDIDATES));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEvalGenerate());

    await act(async () => {
      await result.current.generateEvals(NODES, [], {}, []);
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.system).toBe('CUSTOM SYSTEM');
    expect(body.messages[0].content).toContain('CUSTOM USER');
  });
});
