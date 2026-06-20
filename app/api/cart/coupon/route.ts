import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq } from "drizzle-orm"

import { authOptions } from "@/auth"
import { validateCouponSchedule } from "@/lib/coupon-utils"
import { db } from "@/lib/db/client"
import { carts, couponRedemptions, coupons } from "@/lib/db/schema"

function calculateDiscount(total: number, coupon: typeof coupons.$inferSelect) {
  const value = Number(coupon.discountValue)

  // Case-insensitive: enum allows both "percentage" and "Percentage" (I3).
  if (String(coupon.discountType).toLowerCase() === "percentage") {
    return Math.min(total, (total * value) / 100)
  }

  return Math.min(total, value)
}

async function getActiveCart(userId: string) {
  const cart = await db.query.carts.findFirst({
    where: and(eq(carts.userId, userId), eq(carts.status, "active")),
    with: { items: true },
  })

  if (!cart || cart.items.length === 0) {
    return { error: "Cart empty" }
  }

  return {
    items: cart.items,
    total: cart.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    ),
  }
}

function getMatchingItemsTotal(items: any[], scope: string) {
  const isTargetedScope = ["Ad Slots", "Featured Script Slots", "Props"].includes(scope);

  const matchingItems = items.filter((item) => {
    if (!isTargetedScope) return true;

    const metadata = typeof item.metadata === "string"
      ? (() => { try { return JSON.parse(item.metadata) } catch { return null } })()
      : item.metadata;

    if (scope === "Props") {
      return item.itemType === "prop";
    }
    if (scope === "Ad Slots") {
      return metadata?.couponScope === "Ad Slots" || metadata?.category === "Ad Slots" || metadata?.packageType === "ads";
    }
    if (scope === "Featured Script Slots") {
      return metadata?.couponScope === "Featured Script Slots" || metadata?.category === "Featured Script Slots" || metadata?.packageType === "featured-scripts";
    }
    return false;
  });

  return {
    items: matchingItems,
    total: matchingItems.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    ),
  };
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

    const cart = await getActiveCart(userId)

    if ("error" in cart) {
      return NextResponse.json({ error: cart.error }, { status: 400 })
    }

    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, code),
    })

    if (!coupon || coupon.isActive === false) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 })
    }

    const scheduleError = validateCouponSchedule(coupon.startDate, coupon.expiryDate)
    if (scheduleError) {
      return NextResponse.json({ error: scheduleError.error }, { status: 400 })
    }

    if (Number(coupon.minCartValue) > cart.total) {
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

    const { items: matchingItems, total: matchingTotal } = getMatchingItemsTotal(cart.items, coupon.scope)

    if (matchingItems.length === 0 && ["Ad Slots", "Featured Script Slots", "Props"].includes(coupon.scope)) {
      return NextResponse.json(
        { error: `This coupon is only valid for items of type "${coupon.scope}"` },
        { status: 400 }
      )
    }

    const discountAmount = calculateDiscount(matchingTotal, coupon)
    const payableAmount = Math.max(0, cart.total - discountAmount)

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountAmount,
      },
      totalAmount: cart.total,
      payableAmount,
    })
  } catch (error) {
    console.error("Coupon validation error:", error)
    return NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 })
  }
}
