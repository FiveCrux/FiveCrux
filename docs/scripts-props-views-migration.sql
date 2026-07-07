-- Per-listing detail-page view counters, for creator analytics.
-- Additive + idempotent. Run manually (the user runs ALL DB commands).
--   $env:ALLOW_PROD_DB_WRITE="1"; node scripts/run-migration.mjs docs/scripts-props-views-migration.sql

ALTER TABLE pending_scripts  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
ALTER TABLE approved_scripts ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
ALTER TABLE rejected_scripts ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

ALTER TABLE pending_props  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
ALTER TABLE approved_props ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
ALTER TABLE rejected_props ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
