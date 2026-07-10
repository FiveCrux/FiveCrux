-- Currency Part B: per-item currency selection for props, coupons, and
-- creator codes (mirrors the currency selector scripts already have).
-- Additive + idempotent. Run manually (the user runs ALL DB commands):
--   $env:ALLOW_PROD_DB_WRITE="1"; node scripts/run-migration.mjs docs/currency-part-b-migration.sql

ALTER TABLE pending_props  ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE pending_props  ADD COLUMN IF NOT EXISTS currency_symbol text;
ALTER TABLE approved_props ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE approved_props ADD COLUMN IF NOT EXISTS currency_symbol text;
ALTER TABLE rejected_props ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE rejected_props ADD COLUMN IF NOT EXISTS currency_symbol text;

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS currency_symbol text;

ALTER TABLE creator_codes ADD COLUMN IF NOT EXISTS currency_symbol text;
