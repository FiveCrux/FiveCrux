// Price tier buckets — used by the storefront price filters. These are price
// *logic* (fixed €-range buckets), not admin-managed content, so they live as a
// shared constant rather than a DB table. Change the thresholds here and every
// filter updates in lockstep.

export type PriceTier = "Budget" | "Standard" | "Premium";

export const PRICE_TIERS: PriceTier[] = ["Budget", "Standard", "Premium"];

// Thresholds (inclusive upper bound) in the store currency.
const STANDARD_MAX = 30;
const BUDGET_MAX = 15;

export const PRICE_TIER_LABELS: Record<PriceTier, string> = {
  Budget: "Budget ($0–$15)",
  Standard: "Standard ($15–$30)",
  Premium: "Premium ($30+)",
};

/** Classify a price into its tier key. */
export function classifyPriceTier(price: number | string): PriceTier {
  const p = Number(price) || 0;
  if (p <= BUDGET_MAX) return "Budget";
  if (p <= STANDARD_MAX) return "Standard";
  return "Premium";
}
