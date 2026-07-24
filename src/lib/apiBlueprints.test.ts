import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Force the API to be "configured" regardless of dev/prod test env
vi.mock('./apiConfig', () => ({
  getApiBaseUrl: () => '/api',
  authHeaders: () => ({ 'x-api-key': 'test-token' }),
}));

import { fetchAllBlueprints, upsertBlueprint, deleteBlueprintRemote, checkHealth } from './apiBlueprints';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchAllBlueprints', () => {
  it('requests full documents and returns data', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [{ id: 'a' }, { id: 'b' }] }));
    const result = await fetchAllBlueprints();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/blueprints?full=1');
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
  });

  it('attaches the x-api-key header from the stored token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [] }));
    await fetchAllBlueprints();
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('test-token');
  });

  it('maps a 401 to a helpful error instead of throwing', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'Unauthorized' }));
    const result = await fetchAllBlueprints();
    expect(result.data).toBeNull();
    expect(result.error).toContain('sync token');
  });

  it('maps a network failure to an error result', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await fetchAllBlueprints();
    expect(result.data).toBeNull();
    expect(result.error).toBe('Failed to fetch');
  });
});

describe('upsertBlueprint', () => {
  it('PUTs the blueprint to its id path', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    const result = await upsertBlueprint({ id: 'bp-1', title: 'X' } as never);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/blueprints/bp-1');
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
    expect(result.error).toBeNull();
  });

  it('surfaces server validation errors', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'Blueprint must have a title' }));
    const result = await upsertBlueprint({ id: 'bp-1' } as never);
    expect(result.error).toBe('Blueprint must have a title');
  });
});

describe('deleteBlueprintRemote', () => {
  it('DELETEs by id and succeeds', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    const result = await deleteBlueprintRemote('bp-1');
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
    expect(result.error).toBeNull();
  });
});

describe('checkHealth', () => {
  it('returns ok on healthy response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true, migrated: true }));
    expect(await checkHealth()).toEqual({ ok: true, error: null });
  });

  it('returns unauthorized error on 401', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'Unauthorized' }));
    const result = await checkHealth();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('sync token');
  });
});
