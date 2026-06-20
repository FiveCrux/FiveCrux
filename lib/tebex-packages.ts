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
// Until these are filled, /api/cart/tebex-checkout returns a clear 501.
//
// The map can also be augmented via the TEBEX_PACKAGE_MAP_JSON env var (a JSON
// object of the same shape) — convenient for staging/test stores without code
// changes. Env entries override the hard-coded ones below.

// HOW TO FILL: create one package per line in FiveCrux's own Tebex store at the
// price shown in the comment (must match lib/ad-pricing.ts), then replace the 0
// with that Tebex package id and uncomment the line. A value of 0 (or commented)
// = "not configured" → /api/cart/tebex-checkout returns a clear 501 for it.
// You can instead provide these via the TEBEX_PACKAGE_MAP_JSON env var (env wins)
// — a ready template lives in docs/tebex-package-map.template.json.
const STATIC_TEBEX_PACKAGE_MAP: Record<string, number> = {
  // --- Ad slots (key: ads:<tier>:<months>) · price = USD ---
  // "ads:starter:1": 0,    // $40    · 1 slot
  // "ads:starter:3": 0,    // $110   · 1 slot
  // "ads:starter:6": 0,    // $200   · 1 slot
  // "ads:starter:12": 0,   // $360   · 1 slot
  // "ads:premium:1": 0,    // $100   · 3 slots
  // "ads:premium:3": 0,    // $275   · 3 slots
  // "ads:premium:6": 0,    // $500   · 3 slots
  // "ads:premium:12": 0,   // $900   · 3 slots
  // "ads:executive:1": 0,  // $150   · 5 slots
  // "ads:executive:3": 0,  // $420   · 5 slots
  // "ads:executive:6": 0,  // $750   · 5 slots
  // "ads:executive:12": 0, // $1350  · 5 slots

  // --- Featured-script slots (key: featured-scripts:<tier>:<weeks>) · price = USD ---
  // "featured-scripts:starter:1": 0,    // $20   · 1 slot
  // "featured-scripts:starter:2": 0,    // $35   · 1 slot
  // "featured-scripts:starter:4": 0,    // $60   · 1 slot
  // "featured-scripts:starter:8": 0,    // $100  · 1 slot
  // "featured-scripts:premium:1": 0,    // $50   · 3 slots
  // "featured-scripts:premium:2": 0,    // $80   · 3 slots
  // "featured-scripts:premium:4": 0,    // $150  · 3 slots
  // "featured-scripts:premium:8": 0,    // $260  · 3 slots
  // "featured-scripts:executive:1": 0,  // $80   · 5 slots
  // "featured-scripts:executive:2": 0,  // $120  · 5 slots
  // "featured-scripts:executive:4": 0,  // $220  · 5 slots
  // "featured-scripts:executive:8": 0,  // $400  · 5 slots
}

// Merge static map with an optional env-provided JSON map (env wins).
function loadPackageMap(): Record<string, number> {
  let envMap: Record<string, number> = {}
  try {
    const raw = process.env.TEBEX_PACKAGE_MAP_JSON
    if (raw) envMap = JSON.parse(raw)
  } catch {
    /* ignore malformed env map */
  }
  return { ...STATIC_TEBEX_PACKAGE_MAP, ...envMap }
}

export const TEBEX_PACKAGE_MAP: Record<string, number> = loadPackageMap()

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
