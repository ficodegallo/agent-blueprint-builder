-- Initial schema for blueprint persistence on Railway Postgres.
-- Applied by scripts/db-migrate.mjs (tracked in schema_migrations).

CREATE TABLE IF NOT EXISTS blueprints (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled Blueprint',
  description TEXT DEFAULT '',
  client_name TEXT DEFAULT '',
  project_name TEXT DEFAULT '',
  impacted_audiences JSONB DEFAULT '[]',
  business_benefits JSONB DEFAULT '[]',
  client_contacts JSONB DEFAULT '[]',
  created_by TEXT DEFAULT '',
  last_modified_by TEXT DEFAULT '',
  last_modified_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version TEXT DEFAULT '1.0',
  status TEXT CHECK (status IN ('Draft','In Review','Approved','Archived')) DEFAULT 'Draft',
  change_log JSONB DEFAULT '[]',
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  comments JSONB DEFAULT '[]',
  parking_lot JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blueprints_modified ON blueprints (last_modified_date DESC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blueprints_updated_at ON blueprints;
CREATE TRIGGER blueprints_updated_at
  BEFORE UPDATE ON blueprints FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Revision history: one row per server-side save, capped in application code
-- (newest 20 per blueprint survive; older rows pruned on write).
CREATE TABLE IF NOT EXISTS blueprint_revisions (
  id BIGSERIAL PRIMARY KEY,
  blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revisions_blueprint ON blueprint_revisions (blueprint_id, saved_at DESC);
