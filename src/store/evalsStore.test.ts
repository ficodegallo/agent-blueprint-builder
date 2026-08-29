import { describe, it, expect, beforeEach } from 'vitest';
import {
  useEvalsStore,
  selectAcceptedEvalCount,
  selectProposedEvalCount,
  selectActiveEvalCount,
  selectEvalCountForNode,
} from './evalsStore';
import type { EvalItem } from '../types';

function makeItem(overrides: Partial<EvalItem> = {}): EvalItem {
  return {
    id: overrides.id ?? 'fixed-id',
    title: 'Refund routing accuracy',
    dimension: 'trajectory',
    graderType: 'deterministic',
    question: 'Did refunds over $500 reach the human approval gate?',
    passCriteria: '100% of over-threshold refunds route to approval',
    dataNeeded: '30 labeled refund requests spanning the threshold',
    failureMode: 'Router auto-approves high-value refunds',
    linkedNodeId: null,
    priority: 'high',
    status: 'accepted',
    origin: 'manual',
    edited: false,
    createdAt: '2026-08-26T00:00:00.000Z',
    updatedAt: '2026-08-26T00:00:00.000Z',
    ...overrides,
  };
}

const newItemFields = {
  title: 'Refund routing accuracy',
  dimension: 'trajectory' as const,
  graderType: 'deterministic' as const,
  question: 'Did refunds over $500 reach the human approval gate?',
  passCriteria: '100% of over-threshold refunds route to approval',
  dataNeeded: '30 labeled refund requests spanning the threshold',
  failureMode: 'Router auto-approves high-value refunds',
  linkedNodeId: null,
  priority: 'high' as const,
  status: 'accepted' as const,
  origin: 'manual' as const,
};

describe('evalsStore', () => {
  beforeEach(() => {
    useEvalsStore.getState().reset();
  });

  it('addItem stamps id and timestamps and defaults edited to false', () => {
    const id = useEvalsStore.getState().addItem(newItemFields);

    expect(id).toMatch(/^[0-9a-f-]{36}$/i);

    const items = useEvalsStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(id);
    expect(items[0].edited).toBe(false);
    expect(items[0].createdAt).toBe(items[0].updatedAt);
    expect(new Date(items[0].createdAt).toString()).not.toBe('Invalid Date');
  });

  it('addProposals inserts multiple items in order without touching existing ones', () => {
    const existingId = useEvalsStore.getState().addItem(newItemFields);

    useEvalsStore.getState().addProposals([
      makeItem({ id: 'p1', title: 'First', status: 'proposed', origin: 'ai' }),
      makeItem({ id: 'p2', title: 'Second', status: 'proposed', origin: 'ai' }),
    ]);

    const items = useEvalsStore.getState().items;
    expect(items.map((i) => i.id)).toEqual([existingId, 'p1', 'p2']);
    expect(items[0].status).toBe('accepted');
  });

  it('updateItem marks an AI eval edited when content changes', () => {
    useEvalsStore.getState().addProposals([
      makeItem({ id: 'p1', status: 'proposed', origin: 'ai' }),
    ]);

    useEvalsStore.getState().updateItem('p1', { question: 'A sharper question?' });

    const item = useEvalsStore.getState().items[0];
    expect(item.edited).toBe(true);
    expect(item.question).toBe('A sharper question?');
    expect(item.updatedAt).not.toBe('2026-08-26T00:00:00.000Z');
  });

  it('updateItem does not mark edited for a status-only review action', () => {
    useEvalsStore.getState().addProposals([
      makeItem({ id: 'p1', status: 'proposed', origin: 'ai' }),
    ]);

    useEvalsStore.getState().updateItem('p1', { status: 'accepted' });

    const item = useEvalsStore.getState().items[0];
    expect(item.edited).toBe(false);
    expect(item.status).toBe('accepted');
  });

  it('updateItem leaves edited false for manual-origin items', () => {
    const id = useEvalsStore.getState().addItem(newItemFields);

    useEvalsStore.getState().updateItem(id, { title: 'Renamed by hand' });

    expect(useEvalsStore.getState().items[0].edited).toBe(false);
    expect(useEvalsStore.getState().items[0].title).toBe('Renamed by hand');
  });

  it('updateItem with an unknown id is a no-op', () => {
    const id = useEvalsStore.getState().addItem(newItemFields);
    const before = useEvalsStore.getState().items[0];

    expect(() =>
      useEvalsStore.getState().updateItem('does-not-exist', { title: 'nope' })
    ).not.toThrow();

    const after = useEvalsStore.getState().items;
    expect(after).toHaveLength(1);
    expect(after[0]).toEqual(before);
    expect(after[0].id).toBe(id);
  });

  it('deleteItem removes only the target', () => {
    useEvalsStore.getState().addProposals([
      makeItem({ id: 'a' }),
      makeItem({ id: 'b' }),
    ]);

    useEvalsStore.getState().deleteItem('a');

    expect(useEvalsStore.getState().items.map((i) => i.id)).toEqual(['b']);
  });

  it('setItems replaces wholesale and reset clears', () => {
    useEvalsStore.getState().addItem(newItemFields);

    useEvalsStore.getState().setItems([makeItem({ id: 'only' })]);
    expect(useEvalsStore.getState().items.map((i) => i.id)).toEqual(['only']);

    useEvalsStore.getState().reset();
    expect(useEvalsStore.getState().items).toEqual([]);
  });

  it('selectEvalCountForNode counts only non-dismissed items for that node', () => {
    useEvalsStore.getState().addProposals([
      makeItem({ id: '1', linkedNodeId: 'node-a' }),
      makeItem({ id: '2', linkedNodeId: 'node-a', status: 'dismissed' }),
      makeItem({ id: '3', linkedNodeId: 'node-b' }),
      makeItem({ id: '4', linkedNodeId: null }),
    ]);

    const state = useEvalsStore.getState();
    expect(selectEvalCountForNode('node-a')(state)).toBe(1);
    expect(selectEvalCountForNode('node-b')(state)).toBe(1);
    expect(selectEvalCountForNode('missing')(state)).toBe(0);
  });

  it('count selectors partition by status', () => {
    useEvalsStore.getState().addProposals([
      makeItem({ id: '1', status: 'accepted' }),
      makeItem({ id: '2', status: 'proposed' }),
      makeItem({ id: '3', status: 'proposed' }),
      makeItem({ id: '4', status: 'dismissed' }),
    ]);

    const state = useEvalsStore.getState();
    expect(selectAcceptedEvalCount(state)).toBe(1);
    expect(selectProposedEvalCount(state)).toBe(2);
    expect(selectActiveEvalCount(state)).toBe(3);
  });
});
