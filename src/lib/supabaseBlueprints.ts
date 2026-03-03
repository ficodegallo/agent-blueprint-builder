import { getSupabase } from './supabase';
import type { Blueprint } from '../types';

// Database row type (snake_case)
interface BlueprintRow {
  id: string;
  title: string;
  description: string;
  client_name: string;
  project_name: string;
  impacted_audiences: string[];
  business_benefits: string[];
  client_contacts: string[];
  created_by: string;
  last_modified_by: string;
  last_modified_date: string;
  version: string;
  status: string;
  change_log: unknown[];
  nodes: unknown[];
  edges: unknown[];
  comments: unknown[];
  parking_lot: unknown[];
  created_at: string;
  updated_at: string;
}

function blueprintToRow(bp: Blueprint): Omit<BlueprintRow, 'created_at' | 'updated_at'> {
  return {
    id: bp.id,
    title: bp.title || 'Untitled Blueprint',
    description: bp.description || '',
    client_name: bp.clientName || '',
    project_name: bp.projectName || '',
    impacted_audiences: bp.impactedAudiences || [],
    business_benefits: bp.businessBenefits || [],
    client_contacts: bp.clientContacts || [],
    created_by: bp.createdBy || '',
    last_modified_by: bp.lastModifiedBy || '',
    last_modified_date: bp.lastModifiedDate || new Date().toISOString(),
    version: bp.version || '1.0',
    status: bp.status || 'Draft',
    change_log: bp.changeLog || [],
    nodes: bp.nodes || [],
    edges: bp.edges || [],
    comments: bp.comments || [],
    parking_lot: bp.parkingLot || [],
  };
}

function rowToBlueprint(row: BlueprintRow): Blueprint {
  return {
    id: row.id,
    title: row.title || 'Untitled Blueprint',
    description: row.description || '',
    clientName: row.client_name || '',
    projectName: row.project_name || '',
    impactedAudiences: row.impacted_audiences || [],
    businessBenefits: row.business_benefits || [],
    clientContacts: row.client_contacts || [],
    createdBy: row.created_by || '',
    lastModifiedBy: row.last_modified_by || '',
    lastModifiedDate: row.last_modified_date || new Date().toISOString(),
    version: row.version || '1.0',
    status: (row.status as Blueprint['status']) || 'Draft',
    changeLog: (row.change_log || []) as Blueprint['changeLog'],
    nodes: (row.nodes || []) as Blueprint['nodes'],
    edges: (row.edges || []) as Blueprint['edges'],
    comments: (row.comments || []) as Blueprint['comments'],
    parkingLot: (row.parking_lot || []) as Blueprint['parkingLot'],
  };
}

export async function fetchAllBlueprints(): Promise<{ data: Blueprint[] | null; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('blueprints')
    .select('*')
    .order('last_modified_date', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data as BlueprintRow[]).map(rowToBlueprint), error: null };
}

export async function fetchBlueprint(id: string): Promise<{ data: Blueprint | null; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('blueprints')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: rowToBlueprint(data as BlueprintRow), error: null };
}

export async function upsertBlueprint(bp: Blueprint): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase
    .from('blueprints')
    .upsert(blueprintToRow(bp), { onConflict: 'id' });

  return { error: error?.message ?? null };
}

export async function deleteBlueprintRemote(id: string): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase
    .from('blueprints')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
