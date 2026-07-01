-- Per-seller Tebex store token on users — additive migration.
-- Lets a seller connect their own Tebex webstore once (in their profile) and
-- import their whole package catalogue as FiveCrux listings.
--
-- Run manually (the user runs ALL DB commands). Example:
--   $env:ALLOW_PROD_DB_WRITE="1"; node scripts/run-migration.mjs docs/users-tebex-store-token-migration.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS tebex_store_token text;
