/**
 * API base + sync token configuration for the blueprint persistence API.
 *
 * Base URL resolution:
 * - VITE_API_BASE_URL when set (points a dev build at a deployed API)
 * - same-origin `/api` in production builds (Vercel serves SPA + functions together)
 * - unconfigured in local dev with no override → the app runs in offline mode
 */

const TOKEN_STORAGE_KEY = 'blueprint-builder:sync-token';

export function getApiBaseUrl(): string | null {
  const override = import.meta.env.VITE_API_BASE_URL;
  if (override) return String(override).replace(/\/$/, '');
  if (import.meta.env.PROD) return '/api';
  return null;
}

export function isApiConfigured(): boolean {
  return getApiBaseUrl() !== null;
}

// Token stored base64-encoded, same pattern as the Claude API key storage.
export function getSyncToken(): string | null {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    return stored ? atob(stored) : null;
  } catch {
    return null;
  }
}

export function setSyncToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, btoa(token));
}

export function clearSyncToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getSyncToken();
  return token ? { 'x-api-key': token } : {};
}
