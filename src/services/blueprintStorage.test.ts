import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Blueprint } from '../types';

const mocks = vi.hoisted(() => ({
  isApiConfigured: vi.fn(),
  fetchAllBlueprints: vi.fn(),
  upsertBlueprint: vi.fn(),
  deleteBlueprintRemote: vi.fn(),
}));

vi.mock('../lib/apiConfig', () => ({ isApiConfigured: mocks.isApiConfigured }));
vi.mock('../lib/apiBlueprints', () => ({
  fetchAllBlueprints: mocks.fetchAllBlueprints,
  upsertBlueprint: mocks.upsertBlueprint,
  deleteBlueprintRemote: mocks.deleteBlueprintRemote,
}));

import { loadAll, save, remove, syncPending } from './blueprintStorage';

function makeBlueprint(id: string): Blueprint {
  return { id, title: `BP ${id}` } as Blueprint;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.isApiConfigured.mockReturnValue(true);
  mocks.fetchAllBlueprints.mockResolvedValue({ data: [], error: null });
  mocks.upsertBlueprint.mockResolvedValue({ error: null });
  mocks.deleteBlueprintRemote.mockResolvedValue({ error: null });
});

describe('loadAll', () => {
  it('returns offline status with cached data when API is not configured (R4, R6)', async () => {
    mocks.isApiConfigured.mockReturnValue(false);
    localStorage.setItem('blueprints-cache', JSON.stringify([['a', makeBlueprint('a')]]));

    const result = await loadAll();
    expect(result.syncStatus).toBe('offline');
    expect(result.blueprints.get('a')?.id).toBe('a');
    expect(mocks.fetchAllBlueprints).not.toHaveBeenCalled();
  });

  it('returns error status with cached data when the API call fails (R4)', async () => {
    mocks.fetchAllBlueprints.mockResolvedValue({ data: null, error: 'boom' });
    localStorage.setItem('blueprints-cache', JSON.stringify([['a', makeBlueprint('a')]]));

    const result = await loadAll();
    expect(result.syncStatus).toBe('error');
    expect(result.blueprints.has('a')).toBe(true);
  });

  it('treats the server as source of truth but keeps pending local items (R5)', async () => {
    mocks.fetchAllBlueprints.mockResolvedValue({ data: [makeBlueprint('server-1')], error: null });
    localStorage.setItem('blueprints-cache', JSON.stringify([['local-1', makeBlueprint('local-1')]]));
    localStorage.setItem('blueprints-pending', JSON.stringify(['local-1']));

    const result = await loadAll();
    expect(result.blueprints.has('server-1')).toBe(true);
    expect(result.blueprints.has('local-1')).toBe(true);
    expect(result.syncStatus).toBe('pending');
  });
});

describe('save', () => {
  it('writes locally and returns synced on success', async () => {
    const status = await save('a', makeBlueprint('a'));
    expect(status).toBe('synced');
    const cache = JSON.parse(localStorage.getItem('blueprints-cache')!);
    expect(cache[0][0]).toBe('a');
  });

  it('marks the item pending when the API save fails (R4)', async () => {
    mocks.upsertBlueprint.mockResolvedValue({ error: 'nope' });
    const status = await save('a', makeBlueprint('a'));
    expect(status).toBe('pending');
    expect(JSON.parse(localStorage.getItem('blueprints-pending')!)).toContain('a');
  });

  it('returns offline (still cached locally) when API is unconfigured (R6)', async () => {
    mocks.isApiConfigured.mockReturnValue(false);
    const status = await save('a', makeBlueprint('a'));
    expect(status).toBe('offline');
    expect(mocks.upsertBlueprint).not.toHaveBeenCalled();
  });
});

describe('syncPending', () => {
  it('uploads pending items and clears them on success (R5)', async () => {
    localStorage.setItem('blueprints-cache', JSON.stringify([['a', makeBlueprint('a')]]));
    localStorage.setItem('blueprints-pending', JSON.stringify(['a']));

    const status = await syncPending();
    expect(status).toBe('synced');
    expect(mocks.upsertBlueprint).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('blueprints-pending')!)).toEqual([]);
  });

  it('keeps failing items pending and reports error (R4)', async () => {
    localStorage.setItem(
      'blueprints-cache',
      JSON.stringify([
        ['a', makeBlueprint('a')],
        ['b', makeBlueprint('b')],
      ])
    );
    localStorage.setItem('blueprints-pending', JSON.stringify(['a', 'b']));
    mocks.upsertBlueprint
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: 'boom' });

    const status = await syncPending();
    expect(status).toBe('error');
    const remaining = JSON.parse(localStorage.getItem('blueprints-pending')!);
    expect(remaining).toHaveLength(1);
  });
});

describe('remove', () => {
  it('deletes locally and returns synced on remote success', async () => {
    localStorage.setItem('blueprints-cache', JSON.stringify([['a', makeBlueprint('a')]]));
    const status = await remove('a');
    expect(status).toBe('synced');
    expect(JSON.parse(localStorage.getItem('blueprints-cache')!)).toEqual([]);
  });

  it('queues a pending delete when the remote DELETE fails (no resurrection) (P1)', async () => {
    localStorage.setItem('blueprints-cache', JSON.stringify([['a', makeBlueprint('a')]]));
    mocks.deleteBlueprintRemote.mockResolvedValue({ error: 'boom' });
    const status = await remove('a');
    expect(status).toBe('pending');
    expect(JSON.parse(localStorage.getItem('blueprints-pending-deletes')!)).toContain('a');
  });

  it('returns offline without calling the remote when API is unconfigured', async () => {
    mocks.isApiConfigured.mockReturnValue(false);
    localStorage.setItem('blueprints-cache', JSON.stringify([['a', makeBlueprint('a')]]));
    const status = await remove('a');
    expect(status).toBe('offline');
    expect(mocks.deleteBlueprintRemote).not.toHaveBeenCalled();
  });
});

describe('one-time local migration (P0)', () => {
  it('enqueues pre-existing local-only blueprints on first API load so they are not dropped (R5)', async () => {
    // Blueprint saved while offline: in cache, never in the pending set.
    localStorage.setItem('blueprints-cache', JSON.stringify([['local-1', makeBlueprint('local-1')]]));
    // Server has nothing yet (fresh database).
    mocks.fetchAllBlueprints.mockResolvedValue({ data: [], error: null });

    const result = await loadAll();

    // The local blueprint survives the merge and is queued for upload.
    expect(result.blueprints.has('local-1')).toBe(true);
    expect(result.syncStatus).toBe('pending');
    expect(JSON.parse(localStorage.getItem('blueprints-pending')!)).toContain('local-1');
    expect(localStorage.getItem('blueprints-migrated-to-api')).toBeTruthy();
  });

  it('runs only once — does not re-enqueue after the flag is set (avoids resurrecting cross-device deletes)', async () => {
    localStorage.setItem('blueprints-migrated-to-api', '2026-07-22T00:00:00.000Z');
    localStorage.setItem('blueprints-cache', JSON.stringify([['local-1', makeBlueprint('local-1')]]));
    mocks.fetchAllBlueprints.mockResolvedValue({ data: [], error: null });

    await loadAll();
    const pending = localStorage.getItem('blueprints-pending');
    expect(pending ? JSON.parse(pending) : []).toEqual([]);
  });
});

describe('permanent-rejection handling (P2)', () => {
  it('does not requeue a save the server permanently rejects', async () => {
    mocks.upsertBlueprint.mockResolvedValue({ error: 'Blueprint id must be a UUID', permanent: true });
    const status = await save('bad', makeBlueprint('bad'));
    expect(status).toBe('error');
    expect(localStorage.getItem('blueprints-pending')).toBeNull();
  });

  it('drops a permanently-rejected item from the pending queue during syncPending', async () => {
    localStorage.setItem('blueprints-cache', JSON.stringify([['bad', makeBlueprint('bad')]]));
    localStorage.setItem('blueprints-pending', JSON.stringify(['bad']));
    mocks.upsertBlueprint.mockResolvedValue({ error: 'rejected', permanent: true });

    const status = await syncPending();
    expect(status).toBe('synced');
    expect(JSON.parse(localStorage.getItem('blueprints-pending')!)).toEqual([]);
  });
});
