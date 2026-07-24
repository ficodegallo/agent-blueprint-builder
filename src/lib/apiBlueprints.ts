import { authHeaders, getApiBaseUrl } from './apiConfig';
import type { Blueprint } from '../types';

/**
 * Remote provider for blueprintStorage, backed by the /api serverless
 * functions (Railway Postgres behind them). Keeps the { data, error }
 * result shape the storage service consumes.
 */

const TIMEOUT_MS = 10_000;

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('API not configured');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(init?.headers || {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function errorMessage(response: Response): Promise<string> {
  if (response.status === 401) return 'Unauthorized — check your sync token in Sync Settings';
  try {
    const body = await response.json();
    return body?.error || `Request failed: ${response.status}`;
  } catch {
    return `Request failed: ${response.status}`;
  }
}

// A permanent rejection the server will repeat identically (bad request, too
// large, unprocessable) — callers should not requeue these for retry. 401 is
// excluded: it clears once the right token is entered.
function isPermanent(status: number): boolean {
  return status === 400 || status === 413 || status === 422;
}

export async function fetchAllBlueprints(): Promise<{ data: Blueprint[] | null; error: string | null }> {
  try {
    const response = await apiFetch('/blueprints?full=1');
    if (!response.ok) return { data: null, error: await errorMessage(response) };
    const body = await response.json();
    return { data: (body.data || []) as Blueprint[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function fetchBlueprint(id: string): Promise<{ data: Blueprint | null; error: string | null }> {
  try {
    const response = await apiFetch(`/blueprints/${encodeURIComponent(id)}`);
    if (!response.ok) return { data: null, error: await errorMessage(response) };
    const body = await response.json();
    return { data: body.data as Blueprint, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function upsertBlueprint(
  bp: Blueprint
): Promise<{ error: string | null; permanent?: boolean }> {
  try {
    const response = await apiFetch(`/blueprints/${encodeURIComponent(bp.id)}`, {
      method: 'PUT',
      body: JSON.stringify(bp),
    });
    if (!response.ok) {
      return { error: await errorMessage(response), permanent: isPermanent(response.status) };
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function deleteBlueprintRemote(id: string): Promise<{ error: string | null }> {
  try {
    const response = await apiFetch(`/blueprints/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) return { error: await errorMessage(response) };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function checkHealth(
  tokenOverride?: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const headers = tokenOverride ? { 'x-api-key': tokenOverride } : undefined;
    const response = await apiFetch('/health', headers ? { headers } : undefined);
    if (!response.ok) return { ok: false, error: await errorMessage(response) };
    const body = await response.json();
    return { ok: body.ok === true, error: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
