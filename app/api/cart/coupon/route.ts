import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq } from "drizzle-orm"

import { authOptions } from "@/auth"
import { db } from "@/lib/db/client"
import { carts } from "@/lib/db/schema"
import { validateCoupon } from "@/lib/cart-checkout-utils"

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

    // Preview uses the SAME validation + creator-scoping as checkout so the
    // discount shown here matches exactly what checkout applies (money-safety).
    const result = await validateCoupon(code, userId, cart.total, cart.items)

    if (!result) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 })
    }

    if ("error" in result) {
      // Preserve the previous status codes: "Invalid coupon code" → 404, rest → 400.
      const status = result.error === "Invalid coupon code" ? 404 : 400
      return NextResponse.json({ error: result.error }, { status })
    }

    const discountAmount = result.discountAmount
    const payableAmount = Math.max(0, cart.total - discountAmount)

    return NextResponse.json({
      success: true,
      coupon: {
        id: result.coupon.id,
        code: result.coupon.code,
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
