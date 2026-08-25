import { type NextRequest, NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { CheckoutPaymentIntent } from "@paypal/paypal-server-sdk"

import { requireUser } from "@/lib/api-auth"
import { db } from "@/lib/db/client"
import {
  coupons,
  couponRedemptions,
  orders,
  paypalOrders,
} from "@/lib/db/schema"
import {
  getOrdersController,
  isPayPalConfigured,
  PAYPAL_CURRENCY,
  toPayPalAmount,
} from "@/lib/paypal"
import { validateCouponRules, calculateCouponDiscount } from "@/lib/coupon-utils"
import { buildCustom, genCheckoutId, prepareCartCheckout } from "@/lib/tebex-checkout-flow"

/**
 * POST /api/paypal/order
 *
 * Create a PayPal order for the signed-in user's cart — props, ad slots,
 * featured-script slots, subscriptions. This is FiveCrux's own revenue; seller
 * scripts are not sold here (they redirect to the seller's own store).
 *
 * SECURITY: the amount is computed entirely from the CART and the server-side
 * price table. Nothing about the price, the discount or the entitlement comes
 * from the request body — the same rule the Tebex path enforces. A client that
 * posts its own total is simply ignored.
 *
 * Body: { couponCode?: string, creatorCode?: string }
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  if (!isPayPalConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured yet." },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const couponCode = String(body?.couponCode || "").trim()
  const creatorCode = String(body?.creatorCode || "").trim()

  // Reuse the existing cart preparation so PayPal and Tebex agree on what is
  // in the cart and what it provisions. Coupons are re-validated below because
  // that step delegates them to Tebex, which is not in this flow.
  const prep = await prepareCartCheckout(auth.userId, "", creatorCode)
  if (!prep.ok) {
    return NextResponse.json({ error: prep.error }, { status: prep.status })
  }

  let discountAmount = prep.discountAmount
  let appliedCouponId: number | null = null

  if (couponCode) {
    if (creatorCode) {
      // Mirrors the existing checkout rule: one or the other, never both.
      return NextResponse.json(
        { error: "Use either a coupon or a creator code, not both." },
        { status: 400 }
      )
    }

    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, couponCode),
    })
    if (!coupon) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 })
    }

    const priorUses = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(couponRedemptions)
      .where(
        and(
          eq(couponRedemptions.couponId, coupon.id),
          eq(couponRedemptions.userId, auth.userId)
        )
      )

    const invalid = validateCouponRules(coupon, {
      cartTotal: prep.total,
      userRedemptions: Number(priorUses[0]?.n ?? 0),
    })
    if (invalid) {
      return NextResponse.json({ error: invalid.error }, { status: 400 })
    }

    discountAmount = calculateCouponDiscount(coupon, prep.total)
    appliedCouponId = coupon.id
  }

  const payable = Math.max(0, prep.total - discountAmount)

  // A fully-discounted cart has nothing for PayPal to charge. Sending a zero
  // order would be rejected, and silently charging the undiscounted total would
  // be worse — so this is refused with an explanation rather than guessed at.
  if (payable <= 0) {
    return NextResponse.json(
      {
        error:
          "This cart totals zero after the discount. Free checkout is not available on this payment method yet.",
      },
      { status: 400 }
    )
  }

  const fivecruxOrderId = genCheckoutId()
  const custom = buildCustom(auth.userId, fivecruxOrderId, prep.cart.id, prep.provItems)

  try {
    const { result } = await getOrdersController().createOrder({
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            // Echoed back on capture and on every webhook, which is how the
            // payment is tied to this FiveCrux order without trusting the client.
            customId: String(fivecruxOrderId),
            amount: {
              currencyCode: PAYPAL_CURRENCY,
              value: toPayPalAmount(payable),
            },
          },
        ],
      },
      prefer: "return=minimal",
    })

    if (!result?.id) {
      return NextResponse.json({ error: "PayPal did not return an order" }, { status: 502 })
    }

    // Persist BEFORE returning: capture and the webhook both look the order up
    // by PayPal id, and a race where the buyer pays before the row exists would
    // leave a paid order with nothing to provision against.
    await db.insert(paypalOrders).values({
      id: result.id,
      userId: auth.userId,
      kind: "platform_cart",
      status: "created",
      amount: String(toPayPalAmount(payable)),
      currency: PAYPAL_CURRENCY,
      custom,
    })

    await db.insert(orders).values({
      id: fivecruxOrderId,
      userId: auth.userId,
      cartId: prep.cart.id,
      couponId: appliedCouponId,
      creatorCodeId: prep.appliedCreatorCode?.id ?? null,
      status: "pending",
      totalAmount: toPayPalAmount(prep.total),
      discountAmount: toPayPalAmount(discountAmount),
      payableAmount: toPayPalAmount(payable),
    })

    return NextResponse.json({
      orderId: result.id,
      amount: toPayPalAmount(payable),
      currency: PAYPAL_CURRENCY,
    })
  } catch (error) {
    console.error("[POST /api/paypal/order] create failed:", error)
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 })
  }
}
