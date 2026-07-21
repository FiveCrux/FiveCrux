-- ===========================================================================
-- FiveCrux — ADDITIVE Tebex migration (run on PROD by YOU, after a backup)
-- ===========================================================================
-- 100% additive + idempotent (IF NOT EXISTS). Nothing is dropped, renamed, or
-- type-changed. Existing rows/data are untouched. Safe to run more than once.
--
-- Recommended: take a Neon branch/backup first, run there, verify, then prod.
-- Do NOT run this automatically — execute it yourself.
-- ===========================================================================

-- (1) Tebex order/basket tracking — NEW table
CREATE TABLE IF NOT EXISTS tebex_orders (
  id                    text PRIMARY KEY NOT NULL,
  basket_ident          text NOT NULL,
  user_id               text REFERENCES users(id) ON DELETE SET NULL,
  kind                  text NOT NULL,                 -- 'seller_product' | 'platform_fee'
  store_token           text NOT NULL,
  package_ids           json,
  status                text NOT NULL DEFAULT 'pending',
  tebex_transaction_id  text,
  amount                numeric(10,2),
  custom                json,
  created_at            timestamp DEFAULT now(),
  updated_at            timestamp DEFAULT now()
);

-- (1b) Subscriptions catalog — NEW table. Our code (cart/add) queries this for
-- generic "subscription" items; prod never had it, so add it (empty, additive).
CREATE TABLE IF NOT EXISTS subscriptions (
  id          text PRIMARY KEY NOT NULL,
  title       text NOT NULL,
  price       numeric(10,2) NOT NULL,
  metadata    json,
  created_at  timestamp DEFAULT now(),
  updated_at  timestamp DEFAULT now()
);

-- (2) Which seller store/package backs each product — NEW nullable columns
ALTER TABLE approved_scripts ADD COLUMN IF NOT EXISTS tebex_store_token text,
                             ADD COLUMN IF NOT EXISTS tebex_package_id  text;
ALTER TABLE pending_scripts  ADD COLUMN IF NOT EXISTS tebex_store_token text,
                             ADD COLUMN IF NOT EXISTS tebex_package_id  text;
ALTER TABLE rejected_scripts ADD COLUMN IF NOT EXISTS tebex_store_token text,
                             ADD COLUMN IF NOT EXISTS tebex_package_id  text;
ALTER TABLE approved_props   ADD COLUMN IF NOT EXISTS tebex_store_token text,
                             ADD COLUMN IF NOT EXISTS tebex_package_id  text;
ALTER TABLE pending_props    ADD COLUMN IF NOT EXISTS tebex_store_token text,
                             ADD COLUMN IF NOT EXISTS tebex_package_id  text;
ALTER TABLE rejected_props   ADD COLUMN IF NOT EXISTS tebex_store_token text,
                             ADD COLUMN IF NOT EXISTS tebex_package_id  text;

-- ===========================================================================
-- Verify (read-only) after running:
--   SELECT table_name, column_name FROM information_schema.columns
--   WHERE column_name IN ('tebex_store_token','tebex_package_id') ORDER BY table_name;
--   SELECT to_regclass('public.tebex_orders');     -- should be non-null
--   SELECT to_regclass('public.subscriptions');    -- should be non-null
-- ===========================================================================
