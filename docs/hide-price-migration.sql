-- ============================================================================
-- FiveCrux — `hide_price` flag on scripts (ADDITIVE migration)
-- ============================================================================
-- Run MANUALLY against the prod Neon DB. Additive + idempotent (ADD COLUMN IF
-- NOT EXISTS) — nothing is dropped/altered, no row is touched. Default false
-- means existing scripts keep showing their price.
--
-- When true, the price is hidden everywhere (hero, listing cards, detail page);
-- buyers see the price on the seller's own store instead. Set per-script via the
-- submit form's "Show price on listing" toggle.
--
--   PowerShell:  $env:ALLOW_PROD_DB_WRITE="1"; node scripts/run-migration.mjs docs/hide-price-migration.sql
-- ============================================================================

ALTER TABLE approved_scripts ADD COLUMN IF NOT EXISTS hide_price boolean DEFAULT false;
ALTER TABLE pending_scripts  ADD COLUMN IF NOT EXISTS hide_price boolean DEFAULT false;
ALTER TABLE rejected_scripts ADD COLUMN IF NOT EXISTS hide_price boolean DEFAULT false;
