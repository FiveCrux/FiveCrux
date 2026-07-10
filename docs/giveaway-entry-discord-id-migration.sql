-- Giveaway entries now capture the entrant's own typed Discord ID at entry
-- time (separate from their login identity), so the creator always has it on
-- hand for winners. Additive + idempotent.
-- Run manually (the user runs ALL DB commands):
--   $env:ALLOW_PROD_DB_WRITE="1"; node scripts/run-migration.mjs docs/giveaway-entry-discord-id-migration.sql

ALTER TABLE giveaway_entries ADD COLUMN IF NOT EXISTS discord_id text;
