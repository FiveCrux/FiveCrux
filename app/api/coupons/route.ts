import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { desc } from "drizzle-orm"

import { authOptions } from "@/auth"
import { db } from "@/lib/db/client"
import { coupons } from "@/lib/db/schema"
import { hasAnyRole } from "@/lib/database-new"

const validScopes = ["Ad Slots", "Featured Script Slots", "Props"] as const
const validDiscountTypes = ["Percentage", "Amount"] as const
const validApplicationRules = ["Individual", "Basket (Before Sales)", "Basket (After Sales)"] as const

function generateNumericId() {
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000)
}

function hasCouponAccess(session: any) {
  const user = session?.user as any
  return Boolean(user?.roles && hasAnyRole(user.roles, ["founder", "admin"]))
}

function parseDate(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  if (typeof value !== "string") {
    return { error: `${field} must be a date string` }
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return { error: `${field} must be a valid date` }
  }

  return date
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasCouponAccess(session)) {
      return NextResponse.json({ error: "Founder or admin access required" }, { status: 403 })
    }

    const rows = await db.query.coupons.findMany({
      orderBy: [desc(coupons.createdAt)],
    })

    return NextResponse.json(rows)
  } catch (error) {
    console.error("Error fetching coupons:", error)
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasCouponAccess(session)) {
      return NextResponse.json({ error: "Founder or admin access required" }, { status: 403 })
    }

    const user = session.user as any
    const body = await request.json()

    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : ""
    const scope = body.effectiveOn
    const discountType = body.discountType
    const discountValue = Number(body.discountValue)
    const maxUses = body.redeemLimit === null || body.redeemLimit === undefined ? null : Number(body.redeemLimit)
    const minCartValue = Number(body.minimumBasketValue ?? 0)
    const perUserLimit = Number(body.redeemLimitPerCustomer ?? 0)
    const couponApplicationRule = body.couponApplicationRule
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true

    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 })
    }

    if (!/^[A-Z0-9-]+$/.test(code) || code.length > 32) {
      return NextResponse.json({ error: "Coupon code may only contain letters, numbers and hyphens, up to 32 characters" }, { status: 400 })
    }

    if (!validScopes.includes(scope)) {
      return NextResponse.json({ error: "Invalid coupon scope" }, { status: 400 })
    }

    if (!validDiscountTypes.includes(discountType)) {
      return NextResponse.json({ error: "Invalid discount type" }, { status: 400 })
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: "Discount value must be greater than 0" }, { status: 400 })
    }

    if (discountType === "Percentage" && (!Number.isInteger(discountValue) || discountValue > 100)) {
      return NextResponse.json({ error: "Percentage discount must be a whole number from 1 to 100" }, { status: 400 })
    }

    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
      return NextResponse.json({ error: "Redeem limit must be a whole number greater than 0" }, { status: 400 })
    }

    if (!validApplicationRules.includes(couponApplicationRule)) {
      return NextResponse.json({ error: "Invalid coupon application rule" }, { status: 400 })
    }

    if (!Number.isFinite(minCartValue) || minCartValue < 0) {
      return NextResponse.json({ error: "Minimum basket value cannot be negative" }, { status: 400 })
    }

    if (!Number.isInteger(perUserLimit) || perUserLimit < 0) {
      return NextResponse.json({ error: "Redeem limit per customer must be 0 or a positive whole number" }, { status: 400 })
    }

    if (note && note.length > 500) {
      return NextResponse.json({ error: "Note cannot exceed 500 characters" }, { status: 400 })
    }

    const startDate = parseDate(body.startDate, "Start date")
    if (startDate && "error" in startDate) {
      return NextResponse.json({ error: startDate.error }, { status: 400 })
    }

    const expiryDate = parseDate(body.expiryDate, "Expiry date")
    if (expiryDate && "error" in expiryDate) {
      return NextResponse.json({ error: expiryDate.error }, { status: 400 })
    }

    if (startDate instanceof Date && expiryDate instanceof Date && expiryDate <= startDate) {
      return NextResponse.json({ error: "Expiry date must be after the start date" }, { status: 400 })
    }

    const [createdCoupon] = await db.insert(coupons)
      .values({
        id: generateNumericId(),
        code,
        discountType,
        discountValue: discountValue.toString(),
        scope,
        minCartValue: minCartValue.toString(),
        maxUses,
        perUserLimit,
        couponApplicationRule,
        username: user.username || user.name || null,
        note,
        createdBy: user.id,
        startDate: startDate instanceof Date ? startDate : null,
        expiryDate: expiryDate instanceof Date ? expiryDate : null,
        isActive,
        updatedAt: new Date(),
      })
      .returning()

    return NextResponse.json({ success: true, coupon: createdCoupon }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating coupon:", error)

    if (error?.code === "23505" || error?.message?.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 })
    }

    const detail = process.env.NODE_ENV === "production" ? undefined : error?.message

    return NextResponse.json({ error: detail || "Failed to create coupon" }, { status: 500 })
  }
}
