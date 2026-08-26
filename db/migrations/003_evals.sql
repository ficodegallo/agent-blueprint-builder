-- Add the workflow evals a blueprint carries — the checks that tell you whether
-- the built workflow is working. Defaults to an empty array so blueprints saved
-- before this migration load unchanged.
-- Idempotent: safe to re-run.

ALTER TABLE blueprints ADD COLUMN IF NOT EXISTS evals JSONB DEFAULT '[]';
