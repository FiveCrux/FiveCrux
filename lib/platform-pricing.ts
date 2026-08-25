/**
 * Prices for everything FiveCrux sells itself: ad slots, featured-script slots
 * and side banners.
 *
 * These used to be read live from the Tebex store. Tebex is being removed, so
 * they live here instead. The values below are the EXACT prices that were live
 * on the Tebex store when it was switched off, captured from
 * /api/advertise/pricing — nothing changed for buyers on the way across.
 *
 * ponytail: hardcoded rather than admin-editable, which is a real step back
 * from Tebex — changing a price now needs a deploy. The upgrade path is a
 * `package_prices` table plus an admin screen; it is deliberately not done here
 * so that removing Tebex is not blocked on building a pricing CMS.
 *
 * Key format: `${packageType}:${packageId}:${duration}`
 *   ads              → duration is MONTHS  (1, 3, 6, 12)
 *   featured-scripts → duration is WEEKS   (1, 2, 4, 8)
 *   sidebanner       → duration is WEEKS   (1, 2, 4)
 */

export const PLATFORM_CURRENCY = "EUR"
export const PLATFORM_CURRENCY_SYMBOL = "€"

export const PLATFORM_PRICES: Record<string, number> = {
  // Advertisement slots — priced per month
  "ads:starter:1": 40,
  "ads:starter:3": 110,
  "ads:starter:6": 200,
  "ads:starter:12": 360,
  "ads:premium:1": 100,
  "ads:premium:3": 275,
  "ads:premium:6": 500,
  "ads:premium:12": 900,
  "ads:executive:1": 150,
  "ads:executive:3": 420,
  "ads:executive:6": 750,
  "ads:executive:12": 1350,

  // Featured-script slots — priced per week
  "featured-scripts:starter:1": 20,
  "featured-scripts:starter:2": 35,
  "featured-scripts:starter:4": 60,
  "featured-scripts:starter:8": 100,
  "featured-scripts:premium:1": 50,
  "featured-scripts:premium:2": 80,
  "featured-scripts:premium:4": 150,
  "featured-scripts:premium:8": 260,
  "featured-scripts:executive:1": 80,
  "featured-scripts:executive:2": 120,
  "featured-scripts:executive:4": 220,
  "featured-scripts:executive:8": 400,

  // Side banners — priced per week, one price for any of the four positions
  "sidebanner:slot:1": 49.99,
  "sidebanner:slot:2": 84.99,
  "sidebanner:slot:4": 149.99,
}

export function priceKey(
  packageType: string,
  packageId: string,
  duration: number | string
): string {
  return `${packageType}:${packageId}:${duration}`
}

/**
 * Look up a price. Returns null for anything not in the table rather than
 * defaulting to 0 — an unpriced package must be unbuyable, not free.
 */
export function getPlatformPrice(
  packageType: string,
  packageId: string,
  duration: number | string
): { amount: number; currency: string } | null {
  const amount = PLATFORM_PRICES[priceKey(packageType, packageId, duration)]
  if (typeof amount !== "number") return null
  return { amount, currency: PLATFORM_CURRENCY }
}

/** The whole table, for the pricing endpoint the advertise page reads. */
export function getPlatformPriceMap(): {
  currency: string
  prices: Record<string, number>
} {
  return { currency: PLATFORM_CURRENCY, prices: { ...PLATFORM_PRICES } }
}

/** Side-banner durations, derived from the price table so the two cannot drift. */
export function getSideBannerPackages(): Array<{
  durationWeeks: number
  price: number
  currency: string
  currencySymbol: string
  label: string
}> {
  return Object.keys(PLATFORM_PRICES)
    .filter((k) => k.startsWith("sidebanner:slot:"))
    .map((k) => Number(k.split(":")[2]))
    .sort((a, b) => a - b)
    .map((weeks) => ({
      durationWeeks: weeks,
      price: PLATFORM_PRICES[priceKey("sidebanner", "slot", weeks)],
      currency: PLATFORM_CURRENCY,
      currencySymbol: PLATFORM_CURRENCY_SYMBOL,
      label: weeks === 1 ? "1 Week" : `${weeks} Weeks`,
    }))
}
