import { type NextRequest, NextResponse } from "next/server"

import { requireRole } from "@/lib/api-auth"
import { db } from "@/lib/db/client"
import { platformPrices } from "@/lib/db/schema"
import {
  DEFAULT_PLATFORM_PRICES,
  PLATFORM_CURRENCY,
  getPlatformPriceMap,
} from "@/lib/platform-pricing"

/**
 * Admin pricing for everything FiveCrux sells: ad slots, featured-script slots
 * and side banners.
 *
 * Prices were read live from Tebex, then hardcoded when Tebex was removed. This
 * puts them back under admin control — change a price here and the site uses it
 * immediately, no deploy.
 *
 * GET   -> every price, with its default alongside so a change is visible
 * PATCH -> { prices: { "ads:starter:1": 45, ... } }
 *
 * Founder/admin only: this is the money. A moderator can approve content but
 * has no business setting what things cost.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Group a key like `ads:starter:3` for display. */
function describe(key: string) {
  const [packageType, packageId, duration] = key.split(":")
  const unit = packageType === "ads" ? "month" : "week"
  const n = Number(duration)
  return {
    packageType,
    packageId,
    duration: n,
    unit,
    label: `${n} ${unit}${n === 1 ? "" : "s"}`,
  }
}

export async function GET() {
  const auth = await requireRole(["admin", "founder"])
  if (!auth.ok) return auth.response

  const { prices } = await getPlatformPriceMap()

  // Every key the app knows about, so the admin sees the full catalogue rather
  // than only the rows that happen to have been overridden.
  const keys = Array.from(
    new Set([...Object.keys(DEFAULT_PLATFORM_PRICES), ...Object.keys(prices)])
  ).sort()

  return NextResponse.json({
    currency: PLATFORM_CURRENCY,
    items: keys.map((key) => ({
      key,
      ...describe(key),
      price: prices[key],
      defaultPrice: DEFAULT_PLATFORM_PRICES[key] ?? null,
      isOverridden: prices[key] !== DEFAULT_PLATFORM_PRICES[key],
    })),
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(["admin", "founder"])
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const incoming = body?.prices
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return NextResponse.json(
      { error: "Expected { prices: { key: amount } }" },
      { status: 400 }
    )
  }

  const updates: { key: string; amount: string }[] = []

  for (const [key, raw] of Object.entries(incoming)) {
    // Only keys the app actually sells. Without this the table could be filled
    // with junk that never matches a real package.
    if (!(key in DEFAULT_PLATFORM_PRICES)) {
      return NextResponse.json({ error: `Unknown package: ${key}` }, { status: 400 })
    }
    const amount = Number(raw)
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json(
        { error: `Invalid price for ${key} — must be zero or more` },
        { status: 400 }
      )
    }
    // Guard against a slipped decimal point turning €40 into €4000.
    if (amount > 100_000) {
      return NextResponse.json(
        { error: `Price for ${key} looks wrong (over 100,000)` },
        { status: 400 }
      )
    }
    updates.push({ key, amount: amount.toFixed(2) })
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No prices supplied" }, { status: 400 })
  }

  try {
    for (const u of updates) {
      await db
        .insert(platformPrices)
        .values({
          key: u.key,
          amount: u.amount,
          currency: PLATFORM_CURRENCY,
          updatedBy: auth.userId,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: platformPrices.key,
          set: {
            amount: u.amount,
            currency: PLATFORM_CURRENCY,
            updatedBy: auth.userId,
            updatedAt: new Date(),
          },
        })
    }
    return NextResponse.json({ ok: true, updated: updates.length })
  } catch (error) {
    console.error("[PATCH /api/admin/pricing] failed:", error)
    return NextResponse.json({ error: "Could not save prices" }, { status: 500 })
  }
}
