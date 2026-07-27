-- Add the orchestration pattern a blueprint follows (chosen/recommended at
-- creation). Nullable — existing blueprints are "freeform" until one is set.
-- Idempotent: safe to re-run.

ALTER TABLE blueprints ADD COLUMN IF NOT EXISTS orchestration_pattern TEXT;
