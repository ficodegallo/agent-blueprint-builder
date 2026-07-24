// @vitest-environment node
import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - plain .mjs module
import { planMigrations, sslConfigFor } from '../scripts/db-migrate.mjs';

describe('planMigrations', () => {
  it('returns unapplied migrations in ascending filename order', () => {
    const result = planMigrations(['002_x.sql', '001_a.sql'], ['001_a.sql']);
    expect(result).toEqual(['002_x.sql']);
  });

  it('returns all migrations sorted when none are applied', () => {
    const result = planMigrations(['003_c.sql', '001_a.sql', '002_b.sql'], []);
    expect(result).toEqual(['001_a.sql', '002_b.sql', '003_c.sql']);
  });

  it('returns empty list when everything is applied (idempotent re-run)', () => {
    const result = planMigrations(['001_a.sql', '002_b.sql'], ['001_a.sql', '002_b.sql']);
    expect(result).toEqual([]);
  });

  it('ignores non-sql files', () => {
    const result = planMigrations(['001_a.sql', 'README.md', '.DS_Store'], []);
    expect(result).toEqual(['001_a.sql']);
  });
});

describe('sslConfigFor', () => {
  it('disables SSL for localhost', () => {
    expect(sslConfigFor('postgres://user:pw@localhost:5432/db')).toBe(false);
  });

  it('enables relaxed SSL for remote hosts (Railway)', () => {
    expect(sslConfigFor('postgres://user:pw@roundhouse.proxy.rlwy.net:12345/railway')).toEqual({
      rejectUnauthorized: false,
    });
  });
});
