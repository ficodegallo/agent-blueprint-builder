import { describe, it, expect } from 'vitest';
import { Paragraph, Table } from 'docx';
import { buildEvaluationPlan, buildAppendices } from './exportWord';
import type { Blueprint, EvalItem } from '../types';

function blueprint(evals: EvalItem[]): Blueprint {
  return {
    id: 'bp1',
    title: 'Refund Triage',
    description: '',
    clientName: '',
    projectName: '',
    impactedAudiences: [],
    businessBenefits: [],
    clientContacts: [],
    createdBy: '',
    lastModifiedBy: '',
    lastModifiedDate: '2026-08-26T00:00:00.000Z',
    version: '1.0',
    status: 'In Review',
    changeLog: [],
    nodes: [
      {
        id: 'n1',
        type: 'work',
        position: { x: 0, y: 0 },
        data: {
          nodeType: 'work',
          name: 'Refund Agent',
          workerType: 'agent',
          inputs: [{ name: 'claim', required: true }],
          outputs: [{ name: 'receipt', required: true }],
        },
      },
    ] as Blueprint['nodes'],
    edges: [],
    comments: [],
    parkingLot: [],
    evals,
  };
}

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
    origin: 'ai',
    edited: false,
    createdAt: '2026-08-26T00:00:00.000Z',
    updatedAt: '2026-08-26T00:00:00.000Z',
    ...overrides,
  };
}

/** Pull the plain text out of the docx object tree. */
function textOf(element: Paragraph | Table): string {
  return JSON.stringify(element);
}

function allText(elements: (Paragraph | Table)[]): string {
  return elements.map(textOf).join(' ');
}

describe('buildEvaluationPlan', () => {
  it('emits the numbered heading and one row per eval', () => {
    const elements = buildEvaluationPlan(
      blueprint([evalItem(), evalItem({ id: 'e2', title: 'Loop bound holds' })])
    );

    expect(allText(elements)).toContain('6. Evaluation Plan');

    const table = elements.find((e) => e instanceof Table) as Table | undefined;
    expect(table).toBeDefined();
    // Header row + one row per eval
    expect(allText(elements)).toContain('Refund routing accuracy');
    expect(allText(elements)).toContain('Loop bound holds');
    expect(allText(elements)).toContain('Failure Mode Addressed');
  });

  it('excludes dismissed evals from the table', () => {
    const elements = buildEvaluationPlan(
      blueprint([
        evalItem(),
        evalItem({ id: 'e2', title: 'Rejected idea', status: 'dismissed' }),
      ])
    );

    const text = allText(elements);
    expect(text).toContain('Refund routing accuracy');
    expect(text).not.toContain('Rejected idea');
  });

  it('renders the node name for a node-linked eval', () => {
    const elements = buildEvaluationPlan(blueprint([evalItem({ linkedNodeId: 'n1' })]));

    expect(allText(elements)).toContain('Refund Agent');
  });

  it('renders Blueprint Overall for a workflow-level eval', () => {
    const elements = buildEvaluationPlan(blueprint([evalItem({ linkedNodeId: null })]));

    expect(allText(elements)).toContain('Blueprint Overall');
  });

  it('falls back to the raw id when the linked node was deleted', () => {
    const elements = buildEvaluationPlan(blueprint([evalItem({ linkedNodeId: 'deleted-node' })]));

    expect(() => allText(elements)).not.toThrow();
    expect(allText(elements)).toContain('deleted-node');
  });

  it('emits the empty-state paragraph and no table when there are no evals', () => {
    const elements = buildEvaluationPlan(blueprint([]));

    expect(allText(elements)).toContain('No evaluation criteria defined.');
    expect(elements.some((e) => e instanceof Table)).toBe(false);
  });

  it('emits the empty state when every eval is dismissed', () => {
    const elements = buildEvaluationPlan(blueprint([evalItem({ status: 'dismissed' })]));

    expect(allText(elements)).toContain('No evaluation criteria defined.');
    expect(elements.some((e) => e instanceof Table)).toBe(false);
  });
});

describe('section numbering after inserting the Evaluation Plan', () => {
  it('renumbers Appendices to 7 so it still follows the Evaluation Plan', () => {
    const bp = blueprint([]);
    expect(allText(buildAppendices(bp, bp.nodes))).toContain('7. Appendices');
  });
});
