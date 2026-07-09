import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { FIVECRUX_TEBEX_PUBLIC_TOKEN } from "@/lib/tebex";
import { prepareCartCheckout, finalizeBasket, buildCustom } from "@/lib/tebex-checkout-flow";

/**
 * GET /api/cart/tebex-continue?ident=...&order=...&coupon=...
 *
 * Phase 2 of the FiveCrux → Tebex checkout. Tebex redirects the buyer here after
 * they log in (FiveM stores require it). The basket is now authenticated, so we
 * add the packages, persist the order, and redirect the buyer to the hosted
 * checkout (payment). Cart/coupon are re-validated server-side; `order` is the
 * same id stamped into the basket's `custom` in phase 1 so the webhook matches.
 */
export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const fail = (reason: string) =>
    NextResponse.redirect(`${siteUrl}/cart?payment=error&reason=${encodeURIComponent(reason)}`);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.redirect(`${siteUrl}/auth/signin`);
    const user = session.user as any;

    const storeToken = FIVECRUX_TEBEX_PUBLIC_TOKEN;
    if (!storeToken) return fail("store-not-configured");

    const { searchParams } = new URL(request.url);
    const basketIdent = searchParams.get("ident") || "";
    const orderId = Number(searchParams.get("order")) || 0;
    const couponCode = searchParams.get("coupon") || "";
    const creatorCode = searchParams.get("creator") || "";
    if (!basketIdent || !orderId) return fail("missing-basket");

    const prep = await prepareCartCheckout(user.id, couponCode, creatorCode);
    if (!prep.ok) return fail(prep.error);

    const custom = buildCustom(user.id, orderId, prep.cart.id, prep.provItems);

    const { checkoutUrl } = await finalizeBasket({
      userId: user.id,
      cartId: prep.cart.id,
      storeToken,
      basketIdent,
      provItems: prep.provItems,
      appliedCoupon: prep.appliedCoupon,
      appliedCreatorCode: prep.appliedCreatorCode,
      creatorCommissionAmount: prep.creatorCommissionAmount,
      discountAmount: prep.discountAmount,
      payableAmount: prep.payableAmount,
      total: prep.total,
      orderId,
      custom,
    });

    // Straight to Tebex hosted checkout (payment).
    return NextResponse.redirect(checkoutUrl);
  } catch (error) {
    console.error("Tebex continue (post-auth) error:", error);
    return fail("checkout-failed");
  }
}
