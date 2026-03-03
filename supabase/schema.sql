-- Blueprints table for Supabase
-- Run this in your Supabase SQL editor to create the schema

CREATE TABLE blueprints (
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

CREATE INDEX idx_blueprints_modified ON blueprints(last_modified_date DESC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER blueprints_updated_at
  BEFORE UPDATE ON blueprints FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON blueprints FOR ALL USING (true) WITH CHECK (true);
