-- Giveaway prize-delivery tracker (#5) — creator-side.
-- Additive + idempotent. Safe to run more than once. USER runs this against prod.
--
-- The existing `claimed` boolean doubles as the "Delivered" flag. These two
-- columns record WHEN the creator marked a prize delivered and a free-text note
-- (what/how it was handed over) so nobody can double-claim a prize.

ALTER TABLE giveaway_prize_winners ADD COLUMN IF NOT EXISTS delivered_at timestamp;
ALTER TABLE giveaway_prize_winners ADD COLUMN IF NOT EXISTS notes text;
