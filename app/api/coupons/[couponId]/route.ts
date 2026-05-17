import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { eq } from "drizzle-orm"

import { authOptions } from "@/auth"
import { db } from "@/lib/db/client"
import { coupons } from "@/lib/db/schema"
import { hasAnyRole } from "@/lib/database-new"

const validScopes = ["Ad Slots", "Featured Script Slots", "Props", "all"] as const
const validDiscountTypes = ["Percentage", "Amount"] as const
const validApplicationRules = ["individual", "basket_before_sales", "basket_after_sales"] as const

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

function parseCouponId(couponId: string) {
  const id = Number(couponId)
  return Number.isInteger(id) && id > 0 ? id : null
}

function buildCouponValues(body: any) {
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : ""
  const scope = body.effectiveOn
  const discountType = body.discountType
  const discountValue = Number(body.discountValue)
  const maxUses = body.redeemLimit === null || body.redeemLimit === undefined || body.redeemLimit === "" ? null : Number(body.redeemLimit)
  const minCartValue = Number(body.minimumBasketValue ?? 0)
  const perUserLimit = Number(body.redeemLimitPerCustomer ?? 0)
  const couponApplicationRule = body.couponApplicationRule
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true

  if (!code) return { error: "Coupon code is required" }
  if (!/^[A-Z0-9-]+$/.test(code) || code.length > 32) {
    return { error: "Coupon code may only contain letters, numbers and hyphens, up to 32 characters" }
  }
  if (!validScopes.includes(scope)) return { error: "Invalid coupon scope" }
  if (!validDiscountTypes.includes(discountType)) return { error: "Invalid discount type" }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { error: "Discount value must be greater than 0" }
  }
  if (discountType === "Percentage" && (!Number.isInteger(discountValue) || discountValue > 100)) {
    return { error: "Percentage discount must be a whole number from 1 to 100" }
  }
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
    return { error: "Redeem limit must be a whole number greater than 0" }
  }
  if (!validApplicationRules.includes(couponApplicationRule)) {
    return { error: "Invalid coupon application rule" }
  }
  if (!Number.isFinite(minCartValue) || minCartValue < 0) {
    return { error: "Minimum basket value cannot be negative" }
  }
  if (!Number.isInteger(perUserLimit) || perUserLimit < 0) {
    return { error: "Redeem limit per customer must be 0 or a positive whole number" }
  }
  if (note && note.length > 500) return { error: "Note cannot exceed 500 characters" }

  const startDate = parseDate(body.startDate, "Start date")
  if (startDate && "error" in startDate) return { error: startDate.error }

  const expiryDate = parseDate(body.expiryDate, "Expiry date")
  if (expiryDate && "error" in expiryDate) return { error: expiryDate.error }

  if (startDate instanceof Date && expiryDate instanceof Date && expiryDate <= startDate) {
    return { error: "Expiry date must be after the start date" }
  }

  return {
    values: {
      code,
      discountType,
      discountValue: discountValue.toString(),
      scope,
      minCartValue: minCartValue.toString(),
      maxUses,
      perUserLimit,
      couponApplicationRule,
      note,
      startDate: startDate instanceof Date ? startDate : null,
      expiryDate: expiryDate instanceof Date ? expiryDate : null,
      isActive,
      updatedAt: new Date(),
    },
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasCouponAccess(session)) {
      return NextResponse.json({ error: "Founder or admin access required" }, { status: 403 })
    }

    const { couponId } = await params
    const id = parseCouponId(couponId)

    if (!id) {
      return NextResponse.json({ error: "Invalid coupon id" }, { status: 400 })
    }

    const parsed = buildCouponValues(await request.json())

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const [updatedCoupon] = await db.update(coupons)
      .set(parsed.values)
      .where(eq(coupons.id, id))
      .returning()

    if (!updatedCoupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, coupon: updatedCoupon })
  } catch (error: any) {
    console.error("Error updating coupon:", error)

    if (error?.code === "23505" || error?.message?.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 })
    }

    const detail = process.env.NODE_ENV === "production" ? undefined : error?.message
    return NextResponse.json({ error: detail || "Failed to update coupon" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasCouponAccess(session)) {
      return NextResponse.json({ error: "Founder or admin access required" }, { status: 403 })
    }

    const { couponId } = await params
    const id = parseCouponId(couponId)

    if (!id) {
      return NextResponse.json({ error: "Invalid coupon id" }, { status: 400 })
    }

    const [deletedCoupon] = await db.delete(coupons)
      .where(eq(coupons.id, id))
      .returning({ id: coupons.id })

    if (!deletedCoupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting coupon:", error)
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 })
  }
}
