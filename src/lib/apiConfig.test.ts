import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getApiBaseUrl, isApiConfigured, getSyncToken, setSyncToken, clearSyncToken, authHeaders } from './apiConfig';

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  localStorage.clear();
});

describe('getApiBaseUrl / isApiConfigured', () => {
  it('returns null (offline) with no override outside production — R6 local dev', () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect(getApiBaseUrl()).toBeNull();
    expect(isApiConfigured()).toBe(false);
  });

  it('returns same-origin /api in a production build', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect(getApiBaseUrl()).toBe('/api');
    expect(isApiConfigured()).toBe(true);
  });

  it('honors an explicit VITE_API_BASE_URL override and trims a trailing slash', () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_API_BASE_URL', 'https://app.example.com/api/');
    expect(getApiBaseUrl()).toBe('https://app.example.com/api');
  });
});

describe('sync token storage', () => {
  it('round-trips a token through base64 storage', () => {
    setSyncToken('secret-123');
    expect(getSyncToken()).toBe('secret-123');
    expect(localStorage.getItem('blueprint-builder:sync-token')).not.toBe('secret-123'); // encoded
  });

  it('clears the token', () => {
    setSyncToken('secret-123');
    clearSyncToken();
    expect(getSyncToken()).toBeNull();
  });

  it('returns null on malformed stored data instead of throwing', () => {
    localStorage.setItem('blueprint-builder:sync-token', '!!!not base64!!!');
    // atob on invalid input throws; getSyncToken must swallow it.
    expect(() => getSyncToken()).not.toThrow();
  });

  it('attaches x-api-key only when a token is present', () => {
    expect(authHeaders()).toEqual({});
    setSyncToken('secret-123');
    expect(authHeaders()).toEqual({ 'x-api-key': 'secret-123' });
  });
});
