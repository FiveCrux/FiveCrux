import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq } from "drizzle-orm"

import { authOptions } from "@/auth"
import { db } from "@/lib/db/client"
import { carts } from "@/lib/db/schema"
import { validateCouponForCart } from "@/lib/cart-checkout-utils"

/**
 * POST /api/cart/coupon — the Apply button.
 *
 * Checks a code against the buyer's real cart and returns the actual discount.
 *
 * This used to apply the code to a throwaway Tebex basket and report only
 * whether Tebex accepted it — it could not report the amount, because this
 * store required the buyer to log in before packages could be added, so the
 * discounted total was unknowable until checkout. The buyer had to commit to
 * paying to find out what they were saving. Coupons are FiveCrux's own again,
 * so the number is known here.
 *
 * This is a PREVIEW: nothing is reserved or counted. /api/paypal/order
 * re-validates through the same function at the moment money is taken, so a
 * coupon that runs out between previewing and paying is still caught.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json().catch(() => ({}))
    const code = typeof body.couponCode === "string" ? body.couponCode : ""

    const cart = await db.query.carts.findFirst({
      where: and(eq(carts.userId, userId), eq(carts.status, "active")),
      with: { items: true },
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: "Add something to your cart before applying a coupon" },
        { status: 400 }
      )
    }

    const result = await validateCouponForCart(code, userId, cart.items)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      coupon: {
        id: result.coupon.id,
        code: result.coupon.code,
        scope: result.coupon.scope,
        discountAmount: result.discountAmount,
        eligibleTotal: result.eligibleTotal,
      },
    })
  } catch (error) {
    console.error("Coupon validation error:", error)
    return NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 })
  }
}
