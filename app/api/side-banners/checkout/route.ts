import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { CheckoutPaymentIntent } from "@paypal/paypal-server-sdk";

import { authOptions } from "@/auth";
import { assertNotBlocked } from "@/lib/api-auth";
import { db } from "@/lib/db/client";
import { paypalOrders } from "@/lib/db/schema";
import {
  getOrdersController,
  isPayPalConfigured,
  PAYPAL_CURRENCY,
  toPayPalAmount,
} from "@/lib/paypal";
import { getPlatformPrice } from "@/lib/platform-pricing";
import {
  reserveSideBanner,
  releaseSideBannerReservation,
  ensureUserExists,
  SIDE_BANNER_POSITIONS,
  type SideBannerPosition,
} from "@/lib/database-new";
import { buildSideBannerCustom } from "@/lib/side-banner-checkout";

/**
 * POST /api/side-banners/checkout
 *
 * Reserve one of the four scarce banner positions and start a PayPal payment
 * for it.
 *
 * TEBEX-REMOVED 2026-08-17: this used to build a Tebex basket. The reservation
 * lock, the release-on-failure behaviour and the `custom` provisioning payload
 * are unchanged — only the payment rail moved.
 *
 * Body: { position, durationWeeks }
 * Returns: { orderId, bookingId, amount, currency } for the PayPal buttons.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as any;

    // Fraud block: a chargeback-blocked account must not be able to buy.
    const blocked = await assertNotBlocked(user.id);
    if (blocked) return blocked.response;

    if (!isPayPalConfigured()) {
      return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const position = String(body.position) as SideBannerPosition;
    const durationWeeks = Number(body.durationWeeks);
    // Creative (image/link/title) is NOT set here — like ad slots, the buyer
    // sets/edits it afterwards from their dashboard.

    if (!SIDE_BANNER_POSITIONS.includes(position))
      return NextResponse.json({ error: "Invalid position" }, { status: 400 });
    if (!Number.isFinite(durationWeeks) || durationWeeks <= 0)
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });

    // The price table is also the duration whitelist: an unpriced duration is
    // not purchasable, rather than silently free.
    const price = getPlatformPrice("sidebanner", "slot", durationWeeks);
    if (!price) {
      return NextResponse.json(
        { error: "That duration is not available", unmapped: [`sidebanner:slot:${durationWeeks}`] },
        { status: 400 }
      );
    }

    // Ensure the buyer's user row exists (FK-safety for stale sessions / local resets).
    await ensureUserExists(user);

    // RESERVE — the overselling lock. A racing buyer for the same position fails here.
    const reservation = await reserveSideBanner({
      position,
      userId: user.id,
      durationWeeks,
    });
    if (!reservation.ok) {
      const taken = reservation.reason === "taken";
      return NextResponse.json(
        {
          error: taken
            ? "That slot was just taken — try the other side or come back later."
            : "Could not reserve slot",
        },
        { status: taken ? 409 : 400 }
      );
    }
    const bookingId = reservation.bookingId;

    const custom = buildSideBannerCustom(user.id, bookingId, position, durationWeeks);

    try {
      const { result } = await getOrdersController().createOrder({
        body: {
          intent: CheckoutPaymentIntent.Capture,
          purchaseUnits: [
            {
              customId: String(bookingId),
              description: `Side banner ${position} — ${durationWeeks} week(s)`,
              amount: {
                currencyCode: PAYPAL_CURRENCY,
                value: toPayPalAmount(price.amount),
              },
            },
          ],
        },
        prefer: "return=minimal",
      });

      if (!result?.id) throw new Error("PayPal returned no order id");

      await db.insert(paypalOrders).values({
        id: result.id,
        userId: user.id,
        kind: "platform_fee",
        status: "created",
        amount: toPayPalAmount(price.amount),
        currency: PAYPAL_CURRENCY,
        custom,
      });

      return NextResponse.json({
        orderId: result.id,
        bookingId,
        amount: toPayPalAmount(price.amount),
        currency: PAYPAL_CURRENCY,
      });
    } catch (e) {
      // Free the position again — otherwise a failed payment start would hold a
      // scarce slot hostage until the reservation timed out.
      console.error("Side-banner PayPal order failed:", e);
      await releaseSideBannerReservation(bookingId);
      return NextResponse.json({ error: "Failed to start checkout" }, { status: 502 });
    }
  } catch (error) {
    console.error("Side-banner checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
