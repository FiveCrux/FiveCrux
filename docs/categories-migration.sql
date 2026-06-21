-- ============================================================================
-- FiveCrux — `categories` table (ADDITIVE migration)
-- ============================================================================
-- Run this MANUALLY against the prod Neon DB (the assistant never touches prod).
-- It is additive + idempotent: safe to run once. It does NOT alter or drop any
-- existing table/column.
--
-- Powers: home-page category chips, the /scripts filter, the submit-form
-- category dropdown, and /category/[slug] pages — all read from this table via
-- /api/categories. Manage rows in the admin panel at /admin/categories.
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id          integer PRIMARY KEY NOT NULL,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  icon        text,
  applies_to  text NOT NULL DEFAULT 'scripts',
  is_active   boolean NOT NULL DEFAULT true,
  show_on_home boolean NOT NULL DEFAULT false,
  home_order  integer NOT NULL DEFAULT 0,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamp DEFAULT now(),
  updated_at  timestamp DEFAULT now()
);

-- Seed the initial browse categories. ON CONFLICT (slug) keeps reruns safe and
-- avoids clobbering any edits made later in the admin panel.
INSERT INTO categories (id, name, slug, icon, applies_to, is_active, show_on_home, home_order, sort_order) VALUES
  (1, 'MLOs',     'mlo',      'Building2', 'scripts', true, true, 1, 1),
  (2, 'Vehicles', 'vehicles', 'Car',       'scripts', true, true, 2, 2),
  (3, 'Weapons',  'weapons',  'Crosshair', 'scripts', true, true, 3, 3),
  (4, 'Clothing', 'clothing', 'Shirt',     'both',    true, true, 4, 4),
  (5, 'Maps',     'maps',     'Map',       'scripts', true, true, 5, 5),
  (6, 'Economy',  'economy',  'Coins',     'scripts', true, true, 6, 6)
ON CONFLICT (slug) DO NOTHING;
