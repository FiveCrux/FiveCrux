import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { requireUser } from "@/lib/api-auth"
import { db } from "@/lib/db/client"
import {
  userAdSlots,
  userFeaturedScriptSlots,
  sideBannerBookings,
} from "@/lib/db/schema"

/**
 * GET /api/user/expiring
 *
 * Everything the signed-in user has paid for that is running out — ad slots,
 * featured-script slots and side banners — so their portal can warn them
 * BEFORE it lapses and let them buy again.
 *
 * Nothing renews itself. A slot that expires simply stops; this is what makes
 * that visible in time to do something about it.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Warn this far ahead. Long enough to act on, short enough to still feel urgent. */
const WARN_DAYS = 7

type ExpiringItem = {
  kind: "ad-slot" | "featured-slot" | "side-banner"
  label: string
  detail: string | null
  endDate: string
  daysLeft: number
  expired: boolean
  /** Where the portal sends them to buy the same thing again. */
  renewHref: string
}

const DAY = 86_400_000

function daysUntil(end: Date, now: Date): number {
  // Ceil so "expires in 4 hours" reads as 1 day left, not 0 — 0 is reserved for
  // something that has actually lapsed.
  return Math.ceil((end.getTime() - now.getTime()) / DAY)
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const now = new Date()
  const items: ExpiringItem[] = []

  const push = (
    kind: ExpiringItem["kind"],
    label: string,
    detail: string | null,
    end: Date | null,
    renewHref: string
  ) => {
    if (!end) return
    const daysLeft = daysUntil(end, now)
    // Only surface what is nearly over or just over. A slot with a month left
    // is not news, and an item that lapsed long ago is noise.
    if (daysLeft > WARN_DAYS || daysLeft < -30) return
    items.push({
      kind,
      label,
      detail,
      endDate: end.toISOString(),
      daysLeft: Math.max(daysLeft, 0),
      expired: end.getTime() <= now.getTime(),
      renewHref,
    })
  }

  try {
    const ads = await db
      .select()
      .from(userAdSlots)
      .where(and(eq(userAdSlots.userId, auth.userId), eq(userAdSlots.status, "active")))

    for (const s of ads) {
      const count = Array.isArray(s.slotNumber) ? s.slotNumber.length : 1
      push(
        "ad-slot",
        `${count} advertisement slot${count === 1 ? "" : "s"}`,
        s.packageId ? `${s.packageId} · ${s.durationMonths ?? "?"} month(s)` : null,
        s.endDate,
        "/advertise#ads"
      )
    }

    const featured = await db
      .select()
      .from(userFeaturedScriptSlots)
      .where(
        and(
          eq(userFeaturedScriptSlots.featuredUserId, auth.userId),
          eq(userFeaturedScriptSlots.featuredSlotStatus, "active")
        )
      )

    for (const s of featured) {
      const count = Array.isArray(s.featuredSlotNumber) ? s.featuredSlotNumber.length : 1
      push(
        "featured-slot",
        `${count} featured-script slot${count === 1 ? "" : "s"}`,
        s.featuredPackageId
          ? `${s.featuredPackageId} · ${s.featuredDurationWeeks ?? "?"} week(s)`
          : null,
        s.featuredSlotEndDate,
        "/advertise#featured"
      )
    }

    const banners = await db
      .select()
      .from(sideBannerBookings)
      .where(
        and(
          eq(sideBannerBookings.createdBy, auth.userId),
          eq(sideBannerBookings.status, "active")
        )
      )

    for (const b of banners) {
      push(
        "side-banner",
        `Side banner — ${b.position}`,
        b.durationWeeks ? `${b.durationWeeks} week(s)` : null,
        b.endDate,
        "/advertise#side-banners"
      )
    }

    // Soonest first: what is about to lapse matters more than what already has.
    items.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())

    return NextResponse.json({
      items,
      total: items.length,
      warnDays: WARN_DAYS,
    })
  } catch (error) {
    console.error("[GET /api/user/expiring] failed:", error)
    // Never break the portal over a warning banner.
    return NextResponse.json({ items: [], total: 0, warnDays: WARN_DAYS })
  }
}
