-- Verified-creator verification requests — additive migration.
-- A creator applies for the "verified" badge; an admin approves (which grants
-- the verified_creator role) or rejects with a reason.
--
-- Run manually (the user runs ALL DB commands). Example:
--   $env:ALLOW_PROD_DB_WRITE="1"; node scripts/run-migration.mjs docs/verification-requests-migration.sql

CREATE TABLE IF NOT EXISTS verification_requests (
  id           integer PRIMARY KEY NOT NULL,
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason       text,
  links        text,
  discord      text,
  status       text NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'rejected'
  admin_reason text,
  reviewed_by  text,
  reviewed_at  timestamp,
  created_at   timestamp DEFAULT now(),
  updated_at   timestamp DEFAULT now()
);

-- Fast lookups of a user's request + the admin pending queue.
CREATE INDEX IF NOT EXISTS verification_requests_user_idx ON verification_requests (user_id);
CREATE INDEX IF NOT EXISTS verification_requests_status_idx ON verification_requests (status);
