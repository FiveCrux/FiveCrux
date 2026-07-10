-- Giveaway revamp (Fivegift-style flow) — Phase 1:
--   * use_points (weighted-odds entry mode) on the giveaway tables
--   * cached Discord server info on requirements (guild id/name/icon/invite code)
-- Additive + idempotent. Run manually (the user runs ALL DB commands):
--   $env:ALLOW_PROD_DB_WRITE="1"; node scripts/run-migration.mjs docs/giveaway-fivegift-migration.sql

ALTER TABLE pending_giveaways  ADD COLUMN IF NOT EXISTS use_points boolean DEFAULT false;
ALTER TABLE approved_giveaways ADD COLUMN IF NOT EXISTS use_points boolean DEFAULT false;
ALTER TABLE rejected_giveaways ADD COLUMN IF NOT EXISTS use_points boolean DEFAULT false;

ALTER TABLE giveaway_requirements ADD COLUMN IF NOT EXISTS guild_id text;
ALTER TABLE giveaway_requirements ADD COLUMN IF NOT EXISTS server_name text;
ALTER TABLE giveaway_requirements ADD COLUMN IF NOT EXISTS server_icon text;
ALTER TABLE giveaway_requirements ADD COLUMN IF NOT EXISTS invite_code text;
