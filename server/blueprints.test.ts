// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import {
  validateBlueprint,
  blueprintToRow,
  rowToBlueprint,
  rowToSummary,
  upsertBlueprint,
  REVISION_CAP,
  type BlueprintDoc,
} from './blueprints';
import { isAuthorized } from './auth';

function makeBlueprint(overrides: Partial<BlueprintDoc> = {}): BlueprintDoc {
  return {
    id: 'bp-1',
    title: 'Test Blueprint',
    description: 'desc',
    clientName: 'Client',
    projectName: 'Project',
    impactedAudiences: ['AP team'],
    businessBenefits: ['Faster'],
    clientContacts: ['Jane'],
    createdBy: 'nick',
    lastModifiedBy: 'nick',
    lastModifiedDate: '2026-07-22T00:00:00.000Z',
    version: '1.0',
    status: 'Draft',
    changeLog: [],
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: { nodeType: 'trigger', name: 'Start' } },
      {
        id: 'n2',
        type: 'orchestrator',
        position: { x: 0, y: 0 },
        data: { nodeType: 'orchestrator', name: 'Manager', terminationCondition: 'done' },
      },
      { id: 'n3', type: 'end', position: { x: 0, y: 0 }, data: { nodeType: 'end', name: 'End' } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ],
    comments: [],
    parkingLot: [],
    ...overrides,
  };
}

describe('validateBlueprint', () => {
  it('accepts a well-formed blueprint including agentic node types', () => {
    const result = validateBlueprint(makeBlueprint());
    expect(result.ok).toBe(true);
  });

  it('rejects a missing id', () => {
    const result = validateBlueprint(makeBlueprint({ id: '' }));
    expect(result).toEqual({ ok: false, error: expect.stringContaining('id') });
  });

  it('rejects node type mismatch with data.nodeType', () => {
    const bp = makeBlueprint();
    bp.nodes[0].type = 'work';
    const result = validateBlueprint(bp);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('type must equal data.nodeType');
  });

  it('rejects unknown nodeType', () => {
    const bp = makeBlueprint();
    bp.nodes[0].data.nodeType = 'banana';
    bp.nodes[0].type = 'banana';
    const result = validateBlueprint(bp);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('unknown nodeType');
  });

  it('rejects non-array edges', () => {
    const result = validateBlueprint({ ...makeBlueprint(), edges: 'nope' });
    expect(result.ok).toBe(false);
  });

  it('rejects an invalid status', () => {
    const result = validateBlueprint(makeBlueprint({ status: 'Shipped' }));
    expect(result.ok).toBe(false);
  });
});

describe('row mapping', () => {
  it('round-trips a full blueprint through row and back', () => {
    const bp = makeBlueprint();
    const row = blueprintToRow(bp);
    // Postgres JSONB columns come back as parsed objects
    const dbRow: Record<string, unknown> = { ...row };
    for (const key of ['impacted_audiences', 'business_benefits', 'client_contacts', 'change_log', 'nodes', 'edges', 'comments', 'parking_lot']) {
      dbRow[key] = JSON.parse(row[key] as string);
    }
    expect(rowToBlueprint(dbRow)).toEqual(bp);
  });

  it('summary carries node count and omits document fields', () => {
    const bp = makeBlueprint();
    const row = blueprintToRow(bp);
    const dbRow: Record<string, unknown> = { ...row, nodes: JSON.parse(row.nodes as string) };
    const summary = rowToSummary(dbRow);
    expect(summary.nodeCount).toBe(3);
    expect(summary.title).toBe('Test Blueprint');
    expect(summary).not.toHaveProperty('nodes');
    expect(summary).not.toHaveProperty('edges');
  });

  it('converts Date values from pg to ISO strings', () => {
    const bp = makeBlueprint();
    const row = blueprintToRow(bp);
    const dbRow: Record<string, unknown> = {
      ...row,
      last_modified_date: new Date('2026-07-22T00:00:00.000Z'),
      nodes: [],
      edges: [],
    };
    expect(rowToBlueprint(dbRow).lastModifiedDate).toBe('2026-07-22T00:00:00.000Z');
  });
});

describe('upsertBlueprint revision handling', () => {
  it('upserts the row, inserts a revision, and prunes beyond the cap', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    await upsertBlueprint({ query }, makeBlueprint());

    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[0][0]).toContain('ON CONFLICT (id) DO UPDATE');
    expect(query.mock.calls[1][0]).toContain('INSERT INTO blueprint_revisions');
    expect(query.mock.calls[2][0]).toContain('DELETE FROM blueprint_revisions');
    expect(query.mock.calls[2][1]).toEqual(['bp-1', REVISION_CAP]);
  });
});

describe('isAuthorized', () => {
  it('passes when no token is configured', () => {
    expect(isAuthorized(undefined, undefined)).toBe(true);
    expect(isAuthorized('anything', undefined)).toBe(true);
  });

  it('rejects missing or wrong header when a token is configured', () => {
    expect(isAuthorized(undefined, 'secret')).toBe(false);
    expect(isAuthorized('wrong', 'secret')).toBe(false);
    expect(isAuthorized('secrets', 'secret')).toBe(false);
  });

  it('accepts a matching header', () => {
    expect(isAuthorized('secret', 'secret')).toBe(true);
  });

  it('uses the first value of a repeated header', () => {
    expect(isAuthorized(['secret', 'other'], 'secret')).toBe(true);
  });
});
