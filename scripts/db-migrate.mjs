#!/usr/bin/env node
/**
 * Minimal SQL migration runner for the Railway Postgres database.
 *
 * Usage: DATABASE_URL=postgres://... npm run db:migrate
 *
 * Applies db/migrations/*.sql in filename order, each inside a transaction,
 * and records applied filenames in schema_migrations. Safe to re-run.
 */

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');

/**
 * Pure planner: which migrations still need to run, in order.
 * Exported for tests.
 */
export function planMigrations(availableFiles, appliedNames) {
  const applied = new Set(appliedNames);
  return availableFiles
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .filter((f) => !applied.has(f));
}

/** SSL is required for Railway's public connection strings, not for localhost. */
export function sslConfigFor(databaseUrl) {
  try {
    const host = new URL(databaseUrl).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return false;
  } catch {
    // fall through to SSL-on for unparseable URLs
  }
  if (process.env.PGSSLMODE === 'disable') return false;
  return { rejectUnauthorized: false };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL is not set.');
    console.error('Get it from your Railway Postgres service (Variables tab) and run:');
    console.error('  DATABASE_URL=postgres://... npm run db:migrate');
    process.exit(2);
  }

  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: databaseUrl, ssl: sslConfigFor(databaseUrl) });
  await client.connect();

  try {
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())'
    );

    const files = await readdir(MIGRATIONS_DIR);
    const appliedResult = await client.query('SELECT name FROM schema_migrations');
    const applied = appliedResult.rows.map((r) => r.name);

    const pending = planMigrations(files, applied);
    if (pending.length === 0) {
      console.log(`Up to date — ${applied.length} migration(s) already applied.`);
      return;
    }

    for (const file of pending) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`Applying ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`FAILED ${file}: ${err.message}`);
        process.exit(1);
      }
    }
    console.log(`Applied ${pending.length} migration(s).`);
  } finally {
    await client.end();
  }
}

// Only run when executed directly (not when imported by tests)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
