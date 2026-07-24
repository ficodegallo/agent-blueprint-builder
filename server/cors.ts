import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Apply permissive CORS headers so a local dev build pointed at a deployed API
 * (VITE_API_BASE_URL, per docs/deployment.md) can call it cross-origin, and
 * answer preflight OPTIONS. Returns true if the request was a preflight and has
 * been fully handled (the caller should return immediately).
 *
 * Access is still gated by the x-api-key token — CORS only controls which
 * origins the browser permits to read the response, not who may call.
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
