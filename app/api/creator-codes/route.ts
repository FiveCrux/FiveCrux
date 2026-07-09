import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { desc, eq, sql } from "drizzle-orm"

import { authOptions } from "@/auth"
import { db } from "@/lib/db/client"
import { creatorCodes, creatorCodeRedemptions } from "@/lib/db/schema"
import { hasRole } from "@/lib/database-new"
import { canManageCreatorCodes } from "@/lib/creator-code-access"

const validDiscountTypes = ["Percentage", "Amount"] as const

async function hasAccess(session: any) {
  const user = session?.user as any
  return canManageCreatorCodes(user?.id, user?.roles)
}

function isAdmin(session: any) {
  const roles = (session?.user as any)?.roles || []
  return hasRole(roles, "admin") || hasRole(roles, "founder")
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!(await hasAccess(session))) {
      return NextResponse.json({ error: "Creator code access required" }, { status: 403 })
    }

    const user = session.user as any
    // A quick "can I access this surface at all" ping (e.g. from the profile
    // nav) can just check for a 200 — ?ping=1 skips the actual query.
    if (new URL(request.url).searchParams.get("ping") === "1") {
      return NextResponse.json({ ok: true })
    }

    const rows = await db.query.creatorCodes.findMany({
      where: isAdmin(session) ? undefined : eq(creatorCodes.createdBy, user.id),
      orderBy: [desc(creatorCodes.createdAt)],
    })

    // Earnings are summed from the redemptions log itself (never a running
    // counter) so a code's dashboard total can never drift from real orders.
    const withEarnings = await Promise.all(
      rows.map(async (code) => {
        const [agg] = await db
          .select({
            totalCommission: sql<string>`coalesce(sum(${creatorCodeRedemptions.commissionAmount}), 0)`,
            totalDiscountGiven: sql<string>`coalesce(sum(${creatorCodeRedemptions.discountAmount}), 0)`,
            redemptionCount: sql<number>`count(*)::int`,
          })
          .from(creatorCodeRedemptions)
          .where(eq(creatorCodeRedemptions.creatorCodeId, code.id))
        return {
          ...code,
          totalCommission: Number(agg?.totalCommission ?? 0),
          totalDiscountGiven: Number(agg?.totalDiscountGiven ?? 0),
          redemptionCount: agg?.redemptionCount ?? 0,
        }
      })
    )

    return NextResponse.json(withEarnings)
  } catch (error) {
    console.error("Error fetching creator codes:", error)
    return NextResponse.json({ error: "Failed to fetch creator codes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!(await hasAccess(session))) {
      return NextResponse.json({ error: "Creator code access required" }, { status: 403 })
    }

    const user = session.user as any
    const body = await request.json()

    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : ""
    const discountType = body.discountType
    const discountValue = Number(body.discountValue)
    const commissionType = body.commissionType
    const commissionValue = Number(body.commissionValue)
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true

    if (!code) {
      return NextResponse.json({ error: "Creator code is required" }, { status: 400 })
    }
    if (!/^[A-Z0-9-]+$/.test(code) || code.length > 32) {
      return NextResponse.json({ error: "Creator code may only contain letters, numbers and hyphens, up to 32 characters" }, { status: 400 })
    }
    if (!validDiscountTypes.includes(discountType)) {
      return NextResponse.json({ error: "Invalid discount type" }, { status: 400 })
    }
    if (!validDiscountTypes.includes(commissionType)) {
      return NextResponse.json({ error: "Invalid commission type" }, { status: 400 })
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: "Discount value must be greater than 0" }, { status: 400 })
    }
    if (!Number.isFinite(commissionValue) || commissionValue <= 0) {
      return NextResponse.json({ error: "Commission value must be greater than 0" }, { status: 400 })
    }
    if (discountType === "Percentage" && (!Number.isInteger(discountValue) || discountValue > 100)) {
      return NextResponse.json({ error: "Percentage discount must be a whole number from 1 to 100" }, { status: 400 })
    }
    if (commissionType === "Percentage" && (!Number.isInteger(commissionValue) || commissionValue > 100)) {
      return NextResponse.json({ error: "Percentage commission must be a whole number from 1 to 100" }, { status: 400 })
    }
    // Money-safety: percentage discount + percentage commission must never be
    // able to exceed 100% of the sale between the two of them.
    if (discountType === "Percentage" && commissionType === "Percentage" && discountValue + commissionValue > 100) {
      return NextResponse.json({ error: "Discount % + commission % cannot exceed 100%" }, { status: 400 })
    }

    const [createdCode] = await db.insert(creatorCodes)
      .values({
        code,
        createdBy: user.id,
        discountType,
        discountValue: discountValue.toString(),
        commissionType,
        commissionValue: commissionValue.toString(),
        isActive,
        updatedAt: new Date(),
      })
      .returning()

    return NextResponse.json({ success: true, creatorCode: createdCode }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating creator code:", error)
    if (error?.code === "23505" || error?.message?.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: "A creator code with this code already exists" }, { status: 409 })
    }
    const detail = process.env.NODE_ENV === "production" ? undefined : error?.message
    return NextResponse.json({ error: detail || "Failed to create creator code" }, { status: 500 })
  }
}
