// Maps FiveCrux's internal platform packages (ad slots + featured-script slots)
// to the Tebex PACKAGE IDs in FiveCrux's own Tebex store.
//
// WHY THIS EXISTS: Tebex Headless baskets contain real Tebex packages with prices
// defined in the Tebex store — you can't push an arbitrary price. So to sell our
// ad/featured slots through Tebex (Model B platform fees), FiveCrux must create
// one Tebex package per tier+duration in their store, then paste each Tebex
// package id below. The price shown to the buyer comes from the Tebex package;
// keep it in sync with lib/ad-pricing.ts (which still governs the PayPal path and
// our own bookkeeping).
//
// Key = the cart itemId convention `${packageType}:${packageId}:${duration}`
// (duration = months for ads, weeks for featured-scripts) — see lib/ad-pricing.ts.
//
// Until these are filled, /api/cart/tebex-checkout returns a clear 501 unless
// TEBEX_MOCK is on (local testing).

export const TEBEX_PACKAGE_MAP: Record<string, number> = {
  // --- Ad slots (key: ads:<tier>:<months>) ---
  // "ads:starter:1": 0000000,
  // "ads:starter:3": 0000000,
  // "ads:starter:6": 0000000,
  // "ads:starter:12": 0000000,
  // "ads:premium:1": 0000000,
  // ... premium 3/6/12, executive 1/3/6/12

  // --- Featured-script slots (key: featured-scripts:<tier>:<weeks>) ---
  // "featured-scripts:starter:1": 0000000,
  // "featured-scripts:starter:2": 0000000,
  // ... etc (weeks 1/2/4/8 × starter/premium/executive)
}

/** True when running the local mock-Tebex path (no real store/tokens needed). */
export function isTebexMock(): boolean {
  return process.env.TEBEX_MOCK === "true"
}

/** Build the map key from an itemId or its parts. */
export function tebexPackageKey(packageType: string, packageId: string, duration: number | string): string {
  return `${packageType}:${packageId}:${duration}`
}

/**
 * Resolve the Tebex package id for an internal package. Returns null when the
 * mapping hasn't been filled (caller should surface a "not configured" error,
 * unless in mock mode).
 */
export function getTebexPackageId(packageType: string, packageId: string, duration: number | string): number | null {
  const id = TEBEX_PACKAGE_MAP[tebexPackageKey(packageType, packageId, duration)]
  return typeof id === "number" && id > 0 ? id : null
}
