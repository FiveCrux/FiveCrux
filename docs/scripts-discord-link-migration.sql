-- Migration: optional Discord link on scripts (spec #6)
-- Additive + idempotent. The USER runs this manually against their DB.
-- Adds a nullable `discord_link` text column to all three script approval tables.

ALTER TABLE pending_scripts  ADD COLUMN IF NOT EXISTS discord_link text;
ALTER TABLE approved_scripts ADD COLUMN IF NOT EXISTS discord_link text;
ALTER TABLE rejected_scripts ADD COLUMN IF NOT EXISTS discord_link text;
