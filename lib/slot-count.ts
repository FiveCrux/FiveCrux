/**
 * How many slots one cart line grants.
 *
 * A pack carries its own slot count (a Premium ad pack is 3 slots), and the
 * cart carries how many of that pack was bought. The cart charges
 * price x quantity, so it must grant slots x quantity.
 *
 * Kept in its own module with no imports so the guard script can exercise it
 * without pulling in the database client.
 */
/**
 * Most of one item a single cart line may hold. Provisioning writes one row per
 * slot, so an unbounded quantity turns one checkout into thousands of rows.
 * Enforced by PATCH /api/cart; the cart's stepper stops at the same number so
 * the two cannot disagree.
 */
export const MAX_CART_QUANTITY = 25

export function slotsForCartLine(meta: {
  slotsToAdd?: unknown
  slotsPerMonth?: unknown
  quantity?: unknown
}): number {
  const perUnit = toCount(meta.slotsToAdd ?? meta.slotsPerMonth)
  return perUnit * toCount(meta.quantity)
}

/** A positive whole number, or 1 for anything absent, junk or out of range. */
function toCount(value: unknown): number {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n > 0 ? n : 1
}
