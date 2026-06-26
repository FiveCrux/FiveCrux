import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { createBasket, getBasketAuthUrl, FIVECRUX_TEBEX_PUBLIC_TOKEN } from "@/lib/tebex";
import {
  prepareCartCheckout,
  finalizeBasket,
  buildCustom,
  genCheckoutId,
} from "@/lib/tebex-checkout-flow";

/**
 * POST /api/cart/tebex-checkout
 *
 * Phase 1 of the FiveCrux → Tebex checkout. Validates the cart, creates ONE
 * Tebex basket, then checks whether the store requires the buyer to log in
 * (FiveM stores do). If it does, we return the Tebex auth URL and the client
 * redirects the buyer there; after login Tebex sends them to
 * /api/cart/tebex-continue, which adds the packages + finishes checkout. If no
 * login is required (universal store), we add packages + persist the order here
 * and return the hosted checkout URL directly.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as any;

    const storeToken = FIVECRUX_TEBEX_PUBLIC_TOKEN;
    if (!storeToken) {
      return NextResponse.json(
        { error: "FiveCrux Tebex store token not configured (TEBEX_PUBLIC_TOKEN)" },
        { status: 501 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const couponCode = typeof body.couponCode === "string" ? body.couponCode : "";

    const prep = await prepareCartCheckout(user.id, couponCode);
    if (!prep.ok) {
      return NextResponse.json(
        { error: prep.error, ...(prep.unmapped ? { unmapped: prep.unmapped } : {}) },
        { status: prep.status }
      );
    }

    const orderId = genCheckoutId();
    const custom = buildCustom(user.id, orderId, prep.cart.id, prep.provItems);

    const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const completeUrl = `${siteUrl}/cart?payment=success&provider=tebex`;
    const cancelUrl = `${siteUrl}/cart?payment=cancelled`;

    // Create the basket FIRST (no DB writes yet — I5: no orphan order/coupon if Tebex errors).
    let basketIdent: string;
    try {
      const created = await createBasket(storeToken, { completeUrl, returnUrl: cancelUrl, custom });
      basketIdent = created.ident;
    } catch (e) {
      console.error("Tebex basket creation failed:", e);
      return NextResponse.json({ error: "Failed to start Tebex checkout" }, { status: 502 });
    }

    // Does the store require the buyer to authenticate before adding packages?
    const continueUrl =
      `${siteUrl}/api/cart/tebex-continue?ident=${encodeURIComponent(basketIdent)}` +
      `&order=${orderId}&coupon=${encodeURIComponent(couponCode)}`;
    let authUrl: string | null = null;
    try {
      const authOpts = await getBasketAuthUrl(storeToken, basketIdent, continueUrl);
      if (Array.isArray(authOpts) && authOpts.length > 0 && authOpts[0]?.url) {
        authUrl = authOpts[0].url;
      }
    } catch (e) {
      // If the auth probe fails, fall through and try the no-auth path.
      console.warn("Tebex basket auth probe failed (continuing without auth):", e);
    }

    // Auth required → client redirects the buyer to Tebex login; tebex-continue finishes.
    if (authUrl) {
      return NextResponse.json({ authUrl, basketIdent });
    }

    // No auth required → add packages + persist order + return the checkout URL.
    try {
      const { checkoutUrl, order } = await finalizeBasket({
        userId: user.id,
        cartId: prep.cart.id,
        storeToken,
        basketIdent,
        provItems: prep.provItems,
        appliedCoupon: prep.appliedCoupon,
        discountAmount: prep.discountAmount,
        payableAmount: prep.payableAmount,
        total: prep.total,
        orderId,
        custom,
      });
      return NextResponse.json({ success: true, order, basketIdent, checkoutUrl });
    } catch (e) {
      console.error("Tebex basket finalize failed:", e);
      return NextResponse.json({ error: "Failed to start Tebex checkout" }, { status: 502 });
    }
  } catch (error) {
    console.error("Tebex cart checkout error:", error);
    return NextResponse.json(
      { error: "Tebex checkout failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
