import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Shared-secret auth: when API_TOKEN is set on the deployment, every request
 * must carry a matching x-api-key header. When unset (local dev), auth is
 * skipped. Comparison is timing-safe over sha256 digests so length
 * differences don't leak.
 */
export function isAuthorized(
  headerValue: string | string[] | undefined,
  configuredToken: string | undefined = process.env.API_TOKEN,
  isProduction: boolean = process.env.VERCEL_ENV === 'production'
): boolean {
  if (!configuredToken) {
    // Fail closed on a real deployment: a production API with no API_TOKEN set
    // would otherwise be an open, world-writable database. Only local/preview
    // dev (no VERCEL_ENV=production) skips auth.
    return !isProduction;
  }
  const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!provided) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(configuredToken).digest();
  return timingSafeEqual(a, b);
}
