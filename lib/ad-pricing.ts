// Server-side source of truth for platform paid slots (ad slots + featured-script
// slots). The /advertise UI mirrors these numbers, but the SERVER must never
// trust a client-supplied price or slot count — otherwise a user can buy an
// "Executive / 8 weeks" package for €0.01 (see security-probe finding B).
//
// itemId convention used by the cart: `${packageType}:${packageId}:${duration}`
// where duration = months for ads, weeks for featured-scripts.

export type PackageType = "ads" | "featured-scripts"

type Tier = {
  packageId: "starter" | "premium" | "executive"
  slotsPerMonth: number
  // keyed by duration unit (months for ads, weeks for featured-scripts)
  durations: Record<number, number> // duration -> price
}

const AD_TIERS: Tier[] = [
  { packageId: "starter", slotsPerMonth: 1, durations: { 1: 40, 3: 110, 6: 200, 12: 360 } },
  { packageId: "premium", slotsPerMonth: 3, durations: { 1: 100, 3: 275, 6: 500, 12: 900 } },
  { packageId: "executive", slotsPerMonth: 5, durations: { 1: 150, 3: 420, 6: 750, 12: 1350 } },
]

const FEATURED_TIERS: Tier[] = [
  { packageId: "starter", slotsPerMonth: 1, durations: { 1: 20, 2: 35, 4: 60, 8: 100 } },
  { packageId: "premium", slotsPerMonth: 3, durations: { 1: 50, 2: 80, 4: 150, 8: 260 } },
  { packageId: "executive", slotsPerMonth: 5, durations: { 1: 80, 2: 120, 4: 220, 8: 400 } },
]

export type ResolvedPackage = {
  packageType: PackageType
  packageId: string
  duration: number
  price: number
  slots: number
  durationMonths: number
  durationWeeks?: number
}

/**
 * Resolve a canonical package from its (packageType, packageId, duration).
 * Returns null if the combination is not a real, purchasable package — callers
 * must reject anything that doesn't resolve. Price/slots come from HERE, never
 * from the client.
 */
export function resolvePackage(
  packageType: string,
  packageId: string,
  duration: number
): ResolvedPackage | null {
  const pt: PackageType | null = packageType === "ads" ? "ads" : packageType === "featured-scripts" ? "featured-scripts" : null
  if (!pt) return null
  const tiers = pt === "ads" ? AD_TIERS : FEATURED_TIERS
  const tier = tiers.find((t) => t.packageId === packageId)
  if (!tier) return null
  const price = tier.durations[duration]
  if (price == null) return null
  if (pt === "ads") {
    return { packageType: pt, packageId, duration, price, slots: tier.slotsPerMonth, durationMonths: duration }
  }
  // featured-scripts: duration is in weeks; months = weeks / 4 (matches /advertise)
  return { packageType: pt, packageId, duration, price, slots: tier.slotsPerMonth, durationMonths: duration / 4, durationWeeks: duration }
}

/** Parse the cart itemId `${packageType}:${packageId}:${duration}`. */
export function parsePackageItemId(itemId: unknown): { packageType: string; packageId: string; duration: number } | null {
  if (typeof itemId !== "string") return null
  const parts = itemId.split(":")
  if (parts.length !== 3) return null
  const duration = Number(parts[2])
  if (!Number.isFinite(duration)) return null
  return { packageType: parts[0], packageId: parts[1], duration }
}
