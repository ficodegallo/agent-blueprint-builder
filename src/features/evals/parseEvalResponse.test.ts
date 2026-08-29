import { describe, it, expect } from 'vitest';
import { parseEvalResponse, MAX_EVAL_CANDIDATES } from './parseEvalResponse';

const NODE_IDS = new Set(['n1', 'n2']);

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Refund routing accuracy',
    dimension: 'trajectory',
    graderType: 'deterministic',
    question: 'Did refunds over $500 reach the approval gate?',
    passCriteria: 'All over-threshold refunds route to approval',
    dataNeeded: '30 labeled refund requests spanning the threshold',
    failureMode: 'Router auto-approves high-value refunds',
    linkedNodeId: 'n1',
    priority: 'high',
    confidence: 'high',
    notes: 'Threshold read from the decision node label',
    ...overrides,
  };
}

describe('parseEvalResponse', () => {
  it('parses a well-formed array and trims every string field', () => {
    const raw = JSON.stringify([
      candidate({ title: '  Padded title  ', question: '  Padded question?  ' }),
      candidate({ title: 'Second' }),
    ]);

    const { items, dropped } = parseEvalResponse(raw, NODE_IDS);

    expect(dropped).toBe(0);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Padded title');
    expect(items[0].question).toBe('Padded question?');
    expect(items[0].aiConfidence).toBe('high');
    expect(items[0].aiNotes).toBe('Threshold read from the decision node label');
  });

  it('parses a response with prose wrapped around the JSON array', () => {
    const raw = `Here are the evals I'd suggest:\n${JSON.stringify([candidate()])}\nLet me know if you want more.`;

    const { items } = parseEvalResponse(raw, NODE_IDS);

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Refund routing accuracy');
  });

  it('returns zero items when there is no JSON array', () => {
    expect(parseEvalResponse('I could not do that.', NODE_IDS)).toEqual({ items: [], dropped: 0 });
  });

  it('returns zero items on malformed JSON without throwing', () => {
    const raw = '[{ "title": "broken", ]';
    expect(() => parseEvalResponse(raw, NODE_IDS)).not.toThrow();
    expect(parseEvalResponse(raw, NODE_IDS).items).toEqual([]);
  });

  it('drops candidates missing a title or a question', () => {
    const raw = JSON.stringify([
      candidate(),
      candidate({ title: '' }),
      candidate({ question: '   ' }),
      'not an object',
    ]);

    const { items, dropped } = parseEvalResponse(raw, NODE_IDS);

    expect(items).toHaveLength(1);
    expect(dropped).toBe(3);
  });

  it('falls back on unknown dimension, grader type and priority', () => {
    const raw = JSON.stringify([
      candidate({ dimension: 'vibes', graderType: 'telepathy', priority: 'urgent' }),
    ]);

    const { items } = parseEvalResponse(raw, NODE_IDS);

    expect(items[0].dimension).toBe('quality');
    expect(items[0].graderType).toBe('llm-judge');
    expect(items[0].priority).toBe('medium');
  });

  it('maps a hallucinated node id to a workflow-level eval', () => {
    const raw = JSON.stringify([candidate({ linkedNodeId: 'does-not-exist' })]);

    expect(parseEvalResponse(raw, NODE_IDS).items[0].linkedNodeId).toBeNull();
  });

  it('preserves a node id that exists on the canvas', () => {
    const raw = JSON.stringify([candidate({ linkedNodeId: 'n2' })]);

    expect(parseEvalResponse(raw, NODE_IDS).items[0].linkedNodeId).toBe('n2');
  });

  it('treats an explicit null node id as workflow-level', () => {
    const raw = JSON.stringify([candidate({ linkedNodeId: null })]);

    expect(parseEvalResponse(raw, NODE_IDS).items[0].linkedNodeId).toBeNull();
  });

  it('caps an oversized response and counts the overflow as dropped', () => {
    const raw = JSON.stringify(
      Array.from({ length: 12 }, (_, i) => candidate({ title: `Eval ${i}` }))
    );

    const { items, dropped } = parseEvalResponse(raw, NODE_IDS);

    expect(items).toHaveLength(MAX_EVAL_CANDIDATES);
    expect(dropped).toBe(12 - MAX_EVAL_CANDIDATES);
  });

  it('handles an empty array', () => {
    expect(parseEvalResponse('[]', NODE_IDS)).toEqual({ items: [], dropped: 0 });
  });

  it('omits optional fields when confidence and notes are absent or invalid', () => {
    const raw = JSON.stringify([candidate({ confidence: 'extremely', notes: '' })]);

    const item = parseEvalResponse(raw, NODE_IDS).items[0];

    expect(item.aiConfidence).toBeUndefined();
    expect(item.aiNotes).toBeUndefined();
  });
});
