// Server-side CATALOG for platform paid slots (ad slots + featured-script slots).
//
// PRICES ARE NOT STORED HERE — they are the single source of truth in FiveCrux's
// Tebex store and are fetched live (see lib/tebex-pricing.ts). This file only
// defines the STRUCTURE Tebex can't model: which tiers exist, the valid
// durations, and how many slots each tier grants. The SERVER still resolves the
// authoritative price (from Tebex, never the client) so a tampered client price
// is ignored.
//
// itemId convention used by the cart: `${packageType}:${packageId}:${duration}`
// where duration = months for ads, weeks for featured-scripts.
import { getLivePriceByKey } from "@/lib/tebex-pricing";

export type PackageType = "ads" | "featured-scripts";

type Tier = {
  packageId: "starter" | "premium" | "executive";
  slotsPerMonth: number;
  validDurations: number[]; // months for ads, weeks for featured-scripts
};

const AD_TIERS: Tier[] = [
  { packageId: "starter", slotsPerMonth: 1, validDurations: [1, 3, 6, 12] },
  { packageId: "premium", slotsPerMonth: 3, validDurations: [1, 3, 6, 12] },
  { packageId: "executive", slotsPerMonth: 5, validDurations: [1, 3, 6, 12] },
];

const FEATURED_TIERS: Tier[] = [
  { packageId: "starter", slotsPerMonth: 1, validDurations: [1, 2, 4, 8] },
  { packageId: "premium", slotsPerMonth: 3, validDurations: [1, 2, 4, 8] },
  { packageId: "executive", slotsPerMonth: 5, validDurations: [1, 2, 4, 8] },
];

export type PackageMeta = {
  packageType: PackageType;
  packageId: string;
  duration: number;
  slots: number;
  durationMonths: number;
  durationWeeks?: number;
};

export type ResolvedPackage = PackageMeta & {
  price: number;
  currency: string;
};

/**
 * Validate (packageType, packageId, duration) against the catalog STRUCTURE and
 * return its slot/duration metadata — WITHOUT a price. Sync; null if the combo
 * isn't a real package. Use when you only need slots/duration (no charge).
 */
export function resolvePackageMeta(
  packageType: string,
  packageId: string,
  duration: number
): PackageMeta | null {
  const pt: PackageType | null =
    packageType === "ads" ? "ads" : packageType === "featured-scripts" ? "featured-scripts" : null;
  if (!pt) return null;
  const tiers = pt === "ads" ? AD_TIERS : FEATURED_TIERS;
  const tier = tiers.find((t) => t.packageId === packageId);
  if (!tier) return null;
  if (!tier.validDurations.includes(duration)) return null;
  if (pt === "ads") {
    return { packageType: pt, packageId, duration, slots: tier.slotsPerMonth, durationMonths: duration };
  }
  // featured-scripts: duration is in weeks; months = weeks / 4 (matches /advertise)
  return {
    packageType: pt,
    packageId,
    duration,
    slots: tier.slotsPerMonth,
    durationMonths: duration / 4,
    durationWeeks: duration,
  };
}

/**
 * Resolve a canonical package INCLUDING its live price from Tebex. Async.
 * Returns null when the combo isn't a real package OR when no live price is
 * available yet (Tebex not configured / package id not mapped). Callers must
 * reject anything that doesn't resolve. Price/slots come from HERE (Tebex +
 * catalog), never from the client.
 */
export async function resolvePackage(
  packageType: string,
  packageId: string,
  duration: number
): Promise<ResolvedPackage | null> {
  const meta = resolvePackageMeta(packageType, packageId, duration);
  if (!meta) return null;
  const live = await getLivePriceByKey(packageType, packageId, duration);
  if (!live) return null; // not configured/priced yet → not purchasable
  return { ...meta, price: live.amount, currency: live.currency };
}

/** Parse the cart itemId `${packageType}:${packageId}:${duration}`. */
export function parsePackageItemId(
  itemId: unknown
): { packageType: string; packageId: string; duration: number } | null {
  if (typeof itemId !== "string") return null;
  const parts = itemId.split(":");
  if (parts.length !== 3) return null;
  const duration = Number(parts[2]);
  if (!Number.isFinite(duration)) return null;
  return { packageType: parts[0], packageId: parts[1], duration };
}
