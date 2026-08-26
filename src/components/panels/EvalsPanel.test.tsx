import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { EvalsPanel } from './EvalsPanel';
import { useEvalsStore } from '../../store/evalsStore';
import { useNodesStore } from '../../store/nodesStore';
import { useUIStore } from '../../store/uiStore';
import type { AppNode } from '../../store/nodesStore';
import type { EvalItem } from '../../types';

const API_KEY_STORAGE = 'blueprint-builder:claude-api-key';

const NODES: AppNode[] = [
  {
    id: 'n1',
    type: 'work',
    position: { x: 0, y: 0 },
    data: { nodeType: 'work', name: 'Refund Agent', workerType: 'agent', goal: 'Issue refunds' },
  } as AppNode,
  {
    id: 'n2',
    type: 'router',
    position: { x: 200, y: 0 },
    data: { nodeType: 'router', name: 'Triage Router' },
  } as AppNode,
];

function evalItem(overrides: Partial<EvalItem> = {}): EvalItem {
  return {
    id: 'e1',
    title: 'Refund routing accuracy',
    dimension: 'trajectory',
    graderType: 'deterministic',
    question: 'Did refunds over $500 reach the approval gate?',
    passCriteria: 'All over-threshold refunds route to approval',
    dataNeeded: '30 labeled refund requests',
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

function candidateJson(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Approval gate holds',
    dimension: 'oversight',
    graderType: 'deterministic',
    question: 'Did every over-threshold refund reach a human?',
    passCriteria: 'No auto-approved refund exceeds $500',
    dataNeeded: '30 labeled refund requests',
    failureMode: 'The gate is decorative',
    linkedNodeId: 'n1',
    priority: 'high',
    ...overrides,
  };
}

function mockGeneration(candidates: Record<string, unknown>[]) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ content: [{ text: JSON.stringify(candidates) }] }),
  } as unknown as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPanel() {
  return render(
    <ReactFlowProvider>
      <EvalsPanel />
    </ReactFlowProvider>
  );
}

describe('EvalsPanel', () => {
  beforeEach(() => {
    localStorage.setItem(API_KEY_STORAGE, btoa('sk-ant-test-key'));
    useEvalsStore.getState().reset();
    useNodesStore.getState().setNodes(NODES);
    useUIStore.setState({ isEvalsOpen: true, evalsNodeFilter: null, activeDialog: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders the empty state with a Generate button', () => {
    renderPanel();

    expect(screen.getByText('No evals yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate evals/i })).toBeInTheDocument();
  });

  it('shows Refresh evals once accepted evals exist', () => {
    useEvalsStore.getState().setItems([evalItem()]);
    renderPanel();

    expect(screen.getByRole('button', { name: /Refresh evals/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Generate evals/i })).not.toBeInTheDocument();
  });

  it('generating adds proposals to a review section', async () => {
    mockGeneration([
      candidateJson(),
      candidateJson({
        title: 'Loop bound holds',
        dimension: 'efficiency',
        question: 'Did the agent loop stop within its iteration cap?',
      }),
    ]);
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Generate evals/i }));

    await waitFor(() => expect(screen.getByText(/Proposed \(2\)/)).toBeInTheDocument());
    expect(screen.getByText('Approval gate holds')).toBeInTheDocument();
    expect(screen.getByText('Loop bound holds')).toBeInTheDocument();
    // 'Oversight' also appears as a filter option, so scope the badge assertion.
    expect(screen.getAllByText('Oversight').length).toBeGreaterThan(1);
    expect(screen.getByText('Did every over-threshold refund reach a human?')).toBeInTheDocument();

    const stored = useEvalsStore.getState().items;
    expect(stored.every((i) => i.status === 'proposed' && i.origin === 'ai')).toBe(true);
  });

  it('disables the generate button while a run is in flight', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve; }))
    );
    renderPanel();

    const button = screen.getByRole('button', { name: /Generate evals/i });
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());

    resolveFetch({
      ok: true,
      json: async () => ({ content: [{ text: JSON.stringify([candidateJson()]) }] }),
    });
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('accepting a proposal moves it out of the review section', async () => {
    useEvalsStore.getState().setItems([evalItem({ id: 'p1', status: 'proposed', origin: 'ai' })]);
    renderPanel();

    expect(screen.getByText(/Proposed \(1\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    expect(screen.queryByText(/Proposed \(1\)/)).not.toBeInTheDocument();
    expect(useEvalsStore.getState().items[0].status).toBe('accepted');
    expect(screen.getByText('Refund routing accuracy')).toBeInTheDocument();
  });

  it('dismissing a proposal hides it but keeps it as a tombstone', () => {
    useEvalsStore.getState().setItems([evalItem({ id: 'p1', status: 'proposed', origin: 'ai' })]);
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByText('Refund routing accuracy')).not.toBeInTheDocument();
    expect(useEvalsStore.getState().items[0].status).toBe('dismissed');
  });

  it('Accept all promotes every proposal at once', () => {
    useEvalsStore.getState().setItems([
      evalItem({ id: 'p1', status: 'proposed', origin: 'ai' }),
      evalItem({ id: 'p2', title: 'Second', status: 'proposed', origin: 'ai' }),
    ]);
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Accept all' }));

    expect(useEvalsStore.getState().items.every((i) => i.status === 'accepted')).toBe(true);
    expect(screen.queryByText(/Proposed/)).not.toBeInTheDocument();
  });

  it('a refresh that duplicates existing evals adds nothing and says so', async () => {
    useEvalsStore.getState().setItems([
      evalItem({ id: 'e1', title: 'Approval gate holds', dimension: 'oversight', linkedNodeId: 'n1' }),
    ]);
    mockGeneration([candidateJson()]);
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Refresh evals/i }));

    await waitFor(() =>
      expect(screen.getByText(/already covered by your existing evals/i)).toBeInTheDocument()
    );
    expect(useEvalsStore.getState().items).toHaveLength(1);
  });

  it('does not re-propose a dismissed eval on refresh', async () => {
    useEvalsStore.getState().setItems([
      evalItem({
        id: 'd1',
        title: 'Approval gate holds',
        dimension: 'oversight',
        linkedNodeId: 'n1',
        status: 'dismissed',
        origin: 'ai',
      }),
    ]);
    mockGeneration([candidateJson()]);
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Generate evals/i }));

    await waitFor(() =>
      expect(screen.getByText(/already covered by your existing evals/i)).toBeInTheDocument()
    );
    expect(useEvalsStore.getState().items).toHaveLength(1);
    expect(useEvalsStore.getState().items[0].status).toBe('dismissed');
  });

  it('filters by scope', () => {
    useEvalsStore.getState().setItems([
      evalItem({ id: 'a', title: 'Workflow level', linkedNodeId: null }),
      evalItem({ id: 'b', title: 'Node level', linkedNodeId: 'n1' }),
    ]);
    renderPanel();

    fireEvent.change(screen.getByLabelText('Filter by scope'), { target: { value: 'workflow' } });
    expect(screen.getByText('Workflow level')).toBeInTheDocument();
    expect(screen.queryByText('Node level')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter by scope'), { target: { value: 'n1' } });
    expect(screen.getByText('Node level')).toBeInTheDocument();
    expect(screen.queryByText('Workflow level')).not.toBeInTheDocument();
  });

  it('filters by dimension', () => {
    useEvalsStore.getState().setItems([
      evalItem({ id: 'a', title: 'Traj eval', dimension: 'trajectory' }),
      evalItem({ id: 'b', title: 'Safety eval', dimension: 'safety' }),
    ]);
    renderPanel();

    fireEvent.change(screen.getByLabelText('Filter by dimension'), { target: { value: 'safety' } });

    expect(screen.getByText('Safety eval')).toBeInTheDocument();
    expect(screen.queryByText('Traj eval')).not.toBeInTheDocument();
  });

  it('deletes an accepted eval', () => {
    useEvalsStore.getState().setItems([evalItem()]);
    renderPanel();

    fireEvent.click(screen.getByTitle('Delete eval'));

    expect(useEvalsStore.getState().items).toEqual([]);
  });

  it('renders a hook error inline and leaves existing evals untouched', async () => {
    useEvalsStore.getState().setItems([evalItem()]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'rate limit exceeded' } }),
      } as unknown as Response)
    );
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Refresh evals/i }));

    await waitFor(() => expect(screen.getByText('rate limit exceeded')).toBeInTheDocument());
    expect(useEvalsStore.getState().items).toHaveLength(1);
    expect(useEvalsStore.getState().items[0].title).toBe('Refund routing accuracy');
  });

  it('shows dismissed evals only when the toggle is on', () => {
    useEvalsStore.getState().setItems([evalItem({ id: 'd1', status: 'dismissed', origin: 'ai' })]);
    renderPanel();

    expect(screen.queryByText('Refund routing accuracy')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Dismissed'));

    const card = screen.getByText('Refund routing accuracy').closest('div');
    expect(card).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument();
  });

  it('opens the eval dialog for manual authoring', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Add/i }));

    expect(useUIStore.getState().activeDialog).toBe('evalItem');
    expect(useUIStore.getState().editingEvalItemId).toBeNull();
  });

  it('surfaces outstanding validation errors in the empty state', () => {
    // NODES has no trigger and no end node, so validation reports errors.
    renderPanel();

    const empty = screen.getByText('No evals yet').parentElement as HTMLElement;
    expect(within(empty).getByText(/validation error/i)).toBeInTheDocument();
  });
});
