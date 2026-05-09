import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq } from "drizzle-orm"

import { authOptions } from "@/auth"
import { db } from "@/lib/db/client"
import { carts, couponRedemptions, coupons } from "@/lib/db/schema"

function calculateDiscount(total: number, coupon: typeof coupons.$inferSelect) {
  const value = Number(coupon.discountValue)

  if (coupon.discountType === "Percentage") {
    return Math.min(total, (total * value) / 100)
  }

  return Math.min(total, value)
}

async function getActiveCartTotal(userId: string) {
  const cart = await db.query.carts.findFirst({
    where: and(eq(carts.userId, userId), eq(carts.status, "active")),
    with: { items: true },
  })

  if (!cart || cart.items.length === 0) {
    return { error: "Cart empty" }
  }

  return {
    total: cart.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    ),
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const body = await request.json()
    const code = typeof body.couponCode === "string" ? body.couponCode.trim().toUpperCase() : ""

    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 })
    }

    const cartTotal = await getActiveCartTotal(userId)

    if ("error" in cartTotal) {
      return NextResponse.json({ error: cartTotal.error }, { status: 400 })
    }

    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, code),
    })

    if (!coupon || coupon.isActive === false) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 })
    }

    const now = new Date()

    if (coupon.startDate && coupon.startDate > now) {
      return NextResponse.json({ error: "Coupon is not active yet" }, { status: 400 })
    }

    if (coupon.expiryDate && coupon.expiryDate < now) {
      return NextResponse.json({ error: "Coupon has expired" }, { status: 400 })
    }

    if (Number(coupon.minCartValue) > cartTotal.total) {
      return NextResponse.json(
        { error: `Minimum cart value for this coupon is ${Number(coupon.minCartValue).toFixed(2)}` },
        { status: 400 }
      )
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "Coupon usage limit has been reached" }, { status: 400 })
    }

    const existingRedemption = await db.query.couponRedemptions.findFirst({
      where: and(
        eq(couponRedemptions.couponId, coupon.id),
        eq(couponRedemptions.userId, userId)
      ),
    })

    if (existingRedemption) {
      return NextResponse.json(
        { error: "This coupon cannot be used again" },
        { status: 400 }
      )
    }

    const discountAmount = calculateDiscount(cartTotal.total, coupon)
    const payableAmount = Math.max(0, cartTotal.total - discountAmount)

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountAmount,
      },
      totalAmount: cartTotal.total,
      payableAmount,
    })
  } catch (error) {
    console.error("Coupon validation error:", error)
    return NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 })
  }
}
