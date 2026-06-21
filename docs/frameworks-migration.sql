-- ============================================================================
-- FiveCrux — `frameworks` table (ADDITIVE migration)
-- ============================================================================
-- Run MANUALLY against the prod Neon DB. Additive + idempotent — nothing
-- existing is altered/dropped. Powers the framework filter on /scripts, /props,
-- marketplace, and the submit/edit forms (via /api/frameworks). Manage rows at
-- /admin/frameworks.
-- ============================================================================

CREATE TABLE IF NOT EXISTS frameworks (
  id          integer PRIMARY KEY NOT NULL,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamp DEFAULT now(),
  updated_at  timestamp DEFAULT now()
);

INSERT INTO frameworks (id, name, slug, is_active, sort_order) VALUES
  (1, 'QBCore',     'qbcore',     true, 1),
  (2, 'Qbox',       'qbox',       true, 2),
  (3, 'ESX',        'esx',        true, 3),
  (4, 'OX',         'ox',         true, 4),
  (5, 'VRP',        'vrp',        true, 5),
  (6, 'Standalone', 'standalone', true, 6)
ON CONFLICT (slug) DO NOTHING;
