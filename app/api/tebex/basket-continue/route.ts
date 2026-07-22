import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { addPackageToBasket, getBasket, getCheckoutUrl } from "@/lib/tebex";
import { db } from "@/lib/db/client";
import { tebexOrders } from "@/lib/db/schema";

/**
 * GET /api/tebex/basket-continue?ident=…&token=…&pkg=…&qty=…
 *
 * Phase 2 of the seller "Buy Now" flow. FiveM/game stores make the buyer
 * authenticate with the store before a package can be added to the basket, so
 * /api/tebex/basket hands the client a Tebex auth URL instead of a checkout
 * URL. After the buyer logs in, Tebex redirects them here — the basket is now
 * authenticated, so we add the package, record the order, and forward them to
 * the hosted checkout (payment). token/pkg are Tebex PUBLIC values.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin || "https://www.fivecrux.com";
  const fail = (reason: string, detail?: string) =>
    NextResponse.redirect(
      `${origin}/?checkout=error&reason=${encodeURIComponent(reason)}` +
        (detail ? `&detail=${encodeURIComponent(detail.slice(0, 300))}` : "")
    );

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.redirect(`${origin}/auth/signin`);
    const userId = (session.user as any).id as string;

    const { searchParams } = new URL(request.url);
    const ident = searchParams.get("ident") || "";
    const token = searchParams.get("token") || "";
    const pkg = searchParams.get("pkg") || "";
    const qty = Number(searchParams.get("qty")) || 1;
    if (!ident || !token || !pkg) return fail("missing-basket");

    // Basket is authenticated now — add the package and fetch the checkout link.
    await addPackageToBasket(token, ident, pkg, qty);
    const basket = await getBasket(token, ident);
    const checkoutUrl = getCheckoutUrl(basket);

    await db.insert(tebexOrders).values({
      id: randomUUID(),
      basketIdent: basket.ident,
      userId,
      kind: "seller_product",
      storeToken: token,
      packageIds: [String(pkg)],
      status: "pending",
      amount: basket.total_price != null ? String(basket.total_price) : null,
      custom: null,
    });

    return NextResponse.redirect(checkoutUrl);
  } catch (error) {
    console.error("Tebex basket-continue (post-auth) error:", error);
    return fail("checkout-failed", error instanceof Error ? error.message : String(error));
  }
}
