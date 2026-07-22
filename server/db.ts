import pg from 'pg';

/**
 * Module-scoped connection pool, reused across warm serverless invocations.
 * Small max: Railway's Postgres has a modest connection limit and this app
 * has single-user traffic.
 */
let pool: pg.Pool | null = null;

export function sslConfigFor(databaseUrl: string): false | { rejectUnauthorized: boolean } {
  try {
    const host = new URL(databaseUrl).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return false;
  } catch {
    // unparseable URL — default to SSL on
  }
  if (process.env.PGSSLMODE === 'disable') return false;
  return { rejectUnauthorized: false };
}

export function getPool(): pg.Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }
    pool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: sslConfigFor(databaseUrl),
      max: 3,
      idleTimeoutMillis: 10_000,
    });
  }
  return pool;
}

/** Minimal query interface so business logic is testable with a mock. */
export interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
}
