/**
 * Prices for everything FiveCrux sells itself: ad slots, featured-script slots
 * and side banners.
 *
 * Prices are admin-editable: the live value comes from the `platform_prices`
 * table, managed from the admin panel's Pricing tab.
 *
 * The table below is the DEFAULT, used for any key the admin has not overridden
 * and whenever the table cannot be read. Those values are the exact prices that
 * were live on the Tebex store when it was switched off, so a fresh install
 * prices the same as it always did and a database problem can never make
 * something free.
 *
 * Key format: `${packageType}:${packageId}:${duration}`
 *   ads              → duration is MONTHS  (1, 3, 6, 12)
 *   featured-scripts → duration is WEEKS   (1, 2, 4, 8)
 *   sidebanner       → duration is WEEKS   (1, 2, 4)
 */

export const PLATFORM_CURRENCY = "EUR"
export const PLATFORM_CURRENCY_SYMBOL = "€"

export const DEFAULT_PLATFORM_PRICES: Record<string, number> = {
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
 * Defaults merged with whatever the admin has set. Never throws: if the table
 * cannot be read the defaults stand, because a pricing outage must not make
 * paid placements free.
 */
async function loadPrices(): Promise<Record<string, number>> {
  const prices = { ...DEFAULT_PLATFORM_PRICES }
  try {
    const { db } = await import("@/lib/db/client")
    const { platformPrices } = await import("@/lib/db/schema")
    for (const row of await db.select().from(platformPrices)) {
      const amount = Number(row.amount)
      if (Number.isFinite(amount) && amount >= 0) prices[row.key] = amount
    }
  } catch (error) {
    console.error("[platform-pricing] falling back to defaults:", error)
  }
  return prices
}

/**
 * Look up a price. Returns null for anything not in the table rather than
 * defaulting to 0 — an unpriced package must be unbuyable, not free.
 */
export async function getPlatformPrice(
  packageType: string,
  packageId: string,
  duration: number | string
): Promise<{ amount: number; currency: string } | null> {
  const prices = await loadPrices()
  const amount = prices[priceKey(packageType, packageId, duration)]
  if (typeof amount !== "number") return null
  return { amount, currency: PLATFORM_CURRENCY }
}

/** The whole table, for the pricing endpoint the advertise page reads. */
export async function getPlatformPriceMap(): Promise<{
  currency: string
  prices: Record<string, number>
}> {
  return { currency: PLATFORM_CURRENCY, prices: await loadPrices() }
}

/** Side-banner durations, derived from the price table so the two cannot drift. */
export async function getSideBannerPackages(): Promise<
  Array<{
    durationWeeks: number
    price: number
    currency: string
    currencySymbol: string
    label: string
  }>
> {
  const prices = await loadPrices()
  return Object.keys(prices)
    .filter((k) => k.startsWith("sidebanner:slot:"))
    .map((k) => Number(k.split(":")[2]))
    .sort((a, b) => a - b)
    .map((weeks) => ({
      durationWeeks: weeks,
      price: prices[priceKey("sidebanner", "slot", weeks)],
      currency: PLATFORM_CURRENCY,
      currencySymbol: PLATFORM_CURRENCY_SYMBOL,
      label: weeks === 1 ? "1 Week" : `${weeks} Weeks`,
    }))
}
