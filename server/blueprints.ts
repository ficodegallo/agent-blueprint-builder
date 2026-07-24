import type { Queryable } from './db.js';

/**
 * Server-side blueprint document shape. Mirrors the client's Blueprint type
 * (src/types/blueprint.ts) without importing across the app/server boundary —
 * the client remains the type authority; the server validates and stores.
 */
export interface BlueprintDoc {
  id: string;
  title: string;
  description: string;
  clientName: string;
  projectName: string;
  impactedAudiences: unknown[];
  businessBenefits: unknown[];
  clientContacts: unknown[];
  createdBy: string;
  lastModifiedBy: string;
  lastModifiedDate: string;
  version: string;
  status: string;
  changeLog: unknown[];
  nodes: { id: string; type: string; position: unknown; data: Record<string, unknown> }[];
  edges: { id?: string; source: string; target: string }[];
  comments: unknown[];
  parkingLot: unknown[];
}

export interface BlueprintSummary {
  id: string;
  title: string;
  description: string;
  status: string;
  version: string;
  nodeCount: number;
  lastModifiedDate: string;
}

export const REVISION_CAP = 20;
export const MAX_BODY_BYTES = 2 * 1024 * 1024;

// Same allowlist as the client importer (src/utils/import.ts)
const VALID_NODE_TYPES = [
  'trigger',
  'work',
  'decision',
  'end',
  'workflow',
  'orchestrator',
  'agentLoop',
  'router',
  'parallel',
  'evaluatorOptimizer',
];

const VALID_STATUSES = ['Draft', 'In Review', 'Approved', 'Archived'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Validation ───────────────────────────────────────────────────────

export function validateBlueprint(body: unknown): { ok: true; blueprint: BlueprintDoc } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be a blueprint object' };
  const b = body as Record<string, unknown>;

  if (typeof b.id !== 'string' || !b.id) return { ok: false, error: 'Blueprint must have a string id' };
  // Reject non-UUID ids here as a 400 rather than letting them fail the Postgres
  // UUID cast as an opaque 500 that the client would retry forever.
  if (!UUID_RE.test(b.id)) return { ok: false, error: 'Blueprint id must be a UUID' };
  if (typeof b.title !== 'string') return { ok: false, error: 'Blueprint must have a title' };
  if (!Array.isArray(b.nodes)) return { ok: false, error: 'Blueprint nodes must be an array' };
  if (!Array.isArray(b.edges)) return { ok: false, error: 'Blueprint edges must be an array' };
  if (b.status !== undefined && !VALID_STATUSES.includes(b.status as string)) {
    return { ok: false, error: `Invalid status: ${String(b.status)}` };
  }

  for (const node of b.nodes) {
    const n = node as Record<string, unknown>;
    if (!n || typeof n.id !== 'string' || !n.id) return { ok: false, error: 'Every node must have a string id' };
    const data = n.data as Record<string, unknown> | undefined;
    if (!data || typeof data !== 'object') return { ok: false, error: `Node "${n.id}" has no data` };
    if (!VALID_NODE_TYPES.includes(data.nodeType as string)) {
      return { ok: false, error: `Node "${n.id}" has unknown nodeType "${String(data.nodeType)}"` };
    }
    if (n.type !== data.nodeType) {
      return { ok: false, error: `Node "${n.id}": type must equal data.nodeType` };
    }
  }

  for (const edge of b.edges) {
    const e = edge as Record<string, unknown>;
    if (!e || typeof e.source !== 'string' || typeof e.target !== 'string') {
      return { ok: false, error: 'Every edge must have string source and target' };
    }
  }

  return { ok: true, blueprint: b as unknown as BlueprintDoc };
}

// ── Row mapping (mirrors src/lib/supabaseBlueprints.ts) ──────────────

type Row = Record<string, unknown>;

export function blueprintToRow(bp: BlueprintDoc): Record<string, unknown> {
  return {
    id: bp.id,
    title: bp.title || 'Untitled Blueprint',
    description: bp.description || '',
    client_name: bp.clientName || '',
    project_name: bp.projectName || '',
    impacted_audiences: JSON.stringify(bp.impactedAudiences || []),
    business_benefits: JSON.stringify(bp.businessBenefits || []),
    client_contacts: JSON.stringify(bp.clientContacts || []),
    created_by: bp.createdBy || '',
    last_modified_by: bp.lastModifiedBy || '',
    last_modified_date: bp.lastModifiedDate || new Date().toISOString(),
    version: bp.version || '1.0',
    status: bp.status || 'Draft',
    change_log: JSON.stringify(bp.changeLog || []),
    nodes: JSON.stringify(bp.nodes || []),
    edges: JSON.stringify(bp.edges || []),
    comments: JSON.stringify(bp.comments || []),
    parking_lot: JSON.stringify(bp.parkingLot || []),
  };
}

export function rowToBlueprint(row: Row): BlueprintDoc {
  return {
    id: row.id as string,
    title: (row.title as string) || 'Untitled Blueprint',
    description: (row.description as string) || '',
    clientName: (row.client_name as string) || '',
    projectName: (row.project_name as string) || '',
    impactedAudiences: (row.impacted_audiences as unknown[]) || [],
    businessBenefits: (row.business_benefits as unknown[]) || [],
    clientContacts: (row.client_contacts as unknown[]) || [],
    createdBy: (row.created_by as string) || '',
    lastModifiedBy: (row.last_modified_by as string) || '',
    lastModifiedDate: toIso(row.last_modified_date) || new Date().toISOString(),
    version: (row.version as string) || '1.0',
    status: (row.status as string) || 'Draft',
    changeLog: (row.change_log as unknown[]) || [],
    nodes: (row.nodes as BlueprintDoc['nodes']) || [],
    edges: (row.edges as BlueprintDoc['edges']) || [],
    comments: (row.comments as unknown[]) || [],
    parkingLot: (row.parking_lot as unknown[]) || [],
  };
}

export function rowToSummary(row: Row): BlueprintSummary {
  const nodes = (row.nodes as unknown[]) || [];
  return {
    id: row.id as string,
    title: (row.title as string) || 'Untitled Blueprint',
    description: (row.description as string) || '',
    status: (row.status as string) || 'Draft',
    version: (row.version as string) || '1.0',
    nodeCount: Array.isArray(nodes) ? nodes.length : 0,
    lastModifiedDate: toIso(row.last_modified_date) || '',
  };
}

function toIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

// ── Queries ──────────────────────────────────────────────────────────

const COLUMNS =
  'id, title, description, client_name, project_name, impacted_audiences, business_benefits, client_contacts, created_by, last_modified_by, last_modified_date, version, status, change_log, nodes, edges, comments, parking_lot';

export async function listBlueprints(db: Queryable, full: boolean): Promise<BlueprintDoc[] | BlueprintSummary[]> {
  const result = await db.query(
    `SELECT ${COLUMNS} FROM blueprints ORDER BY last_modified_date DESC`
  );
  return full ? result.rows.map(rowToBlueprint) : result.rows.map(rowToSummary);
}

export async function getBlueprint(db: Queryable, id: string): Promise<BlueprintDoc | null> {
  const result = await db.query(`SELECT ${COLUMNS} FROM blueprints WHERE id = $1`, [id]);
  if (result.rows.length === 0) return null;
  return rowToBlueprint(result.rows[0]);
}

export async function upsertBlueprint(db: Queryable, bp: BlueprintDoc): Promise<void> {
  const row = blueprintToRow(bp);
  const cols = Object.keys(row);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const updates = cols.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`);

  await db.query(
    `INSERT INTO blueprints (${cols.join(', ')}) VALUES (${placeholders.join(', ')})
     ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}`,
    cols.map((c) => row[c])
  );

  // Record a revision and prune beyond the cap
  await db.query('INSERT INTO blueprint_revisions (blueprint_id, data) VALUES ($1, $2)', [
    bp.id,
    JSON.stringify(bp),
  ]);
  await db.query(
    `DELETE FROM blueprint_revisions
     WHERE blueprint_id = $1 AND id NOT IN (
       SELECT id FROM blueprint_revisions WHERE blueprint_id = $1 ORDER BY saved_at DESC, id DESC LIMIT $2
     )`,
    [bp.id, REVISION_CAP]
  );
}

export async function deleteBlueprint(db: Queryable, id: string): Promise<boolean> {
  const result = await db.query('DELETE FROM blueprints WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
