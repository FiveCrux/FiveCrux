-- Giveaway creators can now type their own Discord ID at create time, shown on
-- the detail page so entrants/winners can actually reach them. Additive +
-- idempotent, applies to all 3 giveaway-status tables.
-- Run manually (the user runs ALL DB commands):
--   $env:ALLOW_PROD_DB_WRITE="1"; node scripts/run-migration.mjs docs/giveaway-creator-discord-id-migration.sql

ALTER TABLE pending_giveaways ADD COLUMN IF NOT EXISTS creator_discord_id text;
ALTER TABLE approved_giveaways ADD COLUMN IF NOT EXISTS creator_discord_id text;
ALTER TABLE rejected_giveaways ADD COLUMN IF NOT EXISTS creator_discord_id text;
