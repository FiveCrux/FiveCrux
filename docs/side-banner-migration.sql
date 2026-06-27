-- Side banner ad slots — additive migration.
-- Adds the scarce 2-position (left/right) side-banner inventory table.
-- Safe/additive: creates a new table + a PARTIAL UNIQUE INDEX that is the hard
-- overselling lock (at most one reserved/active booking per position).
--
-- Run manually (the user runs ALL DB commands). Example:
--   $env:ALLOW_PROD_DB_WRITE="1"; node scripts/run-migration.mjs docs/side-banner-migration.sql

CREATE TABLE IF NOT EXISTS side_banner_bookings (
  id              integer PRIMARY KEY NOT NULL,
  position        text NOT NULL,                       -- 'left' | 'right'
  status          text NOT NULL DEFAULT 'reserved',    -- 'reserved' | 'active' | 'expired' | 'cancelled'
  title           text,
  image_url       text,
  link_url        text,
  created_by      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duration_weeks  integer,
  reserved_until  timestamp,
  start_date      timestamp,
  end_date        timestamp,
  order_reference text,
  created_at      timestamp DEFAULT now(),
  updated_at      timestamp DEFAULT now()
);

-- THE overselling lock: only one live (reserved/active) booking per position.
CREATE UNIQUE INDEX IF NOT EXISTS side_banner_one_live_per_position
  ON side_banner_bookings (position)
  WHERE status IN ('reserved', 'active');
