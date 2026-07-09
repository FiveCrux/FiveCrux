import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { eq } from "drizzle-orm"

import { authOptions } from "@/auth"
import { db } from "@/lib/db/client"
import { approvedAds, featuredScripts, sideBannerBookings } from "@/lib/db/schema"
import { hasRole } from "@/lib/database-new"
import { getAdDetailedAnalytics, type AdType } from "@/lib/ad-analytics"

const VALID_TYPES: AdType[] = ["ad", "featured_script", "side_banner"]

// Resolves the owner of the given ad/featured-script/side-banner so a plain
// creator can only ever pull analytics for their own inventory.
async function getOwnerId(type: AdType, id: string): Promise<string | null> {
  if (type === "ad") {
    const numId = Number(id)
    if (!Number.isFinite(numId)) return null
    const [row] = await db.select({ createdBy: approvedAds.createdBy }).from(approvedAds).where(eq(approvedAds.id, numId)).limit(1)
    return row?.createdBy ?? null
  }
  if (type === "featured_script") {
    const numId = Number(id)
    if (!Number.isFinite(numId)) return null
    const [row] = await db.select({ createdBy: featuredScripts.featuredCreatedBy }).from(featuredScripts).where(eq(featuredScripts.id, numId)).limit(1)
    return row?.createdBy ?? null
  }
  const numId = Number(id)
  if (!Number.isFinite(numId)) return null
  const [row] = await db.select({ createdBy: sideBannerBookings.createdBy }).from(sideBannerBookings).where(eq(sideBannerBookings.id, numId)).limit(1)
  return row?.createdBy ?? null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") as AdType | null
    const id = searchParams.get("id")

    if (!type || !VALID_TYPES.includes(type) || !id) {
      return NextResponse.json({ error: "type and id are required" }, { status: 400 })
    }

    const user = session.user as any
    const isAdmin = hasRole(user.roles || [], "admin") || hasRole(user.roles || [], "founder")

    if (!isAdmin) {
      const ownerId = await getOwnerId(type, id)
      if (!ownerId || ownerId !== user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
    }

    const toParam = searchParams.get("to")
    const fromParam = searchParams.get("from")
    const to = toParam ? new Date(toParam) : new Date()
    const from = fromParam ? new Date(fromParam) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)

    const analytics = await getAdDetailedAnalytics(type, id, from, to)
    return NextResponse.json({ analytics, range: { from: from.toISOString(), to: to.toISOString() } })
  } catch (error) {
    console.error("GET /api/ads/analytics error:", error)
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 })
  }
}
