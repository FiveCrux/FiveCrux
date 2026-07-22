import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  createBasket,
  addPackageToBasket,
  getBasket,
  getCheckoutUrl,
} from "@/lib/tebex";
import { db } from "@/lib/db/client";
import { tebexOrders } from "@/lib/db/schema";
import { requireUser } from "@/lib/api-auth";

/**
 * POST /api/tebex/basket
 *
 * Create a Tebex basket for a SELLER product (the seller owns their own Tebex
 * webstore). Builds the basket against the seller's public token, adds the
 * package, records a `tebex_orders` row, and returns the hosted checkout URL.
 *
 * Body: { storeToken, packageId, quantity?, returnUrl?, completeUrl?, custom? }
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: require a logged-in buyer (records who started the order;
    // prevents anonymous unbounded basket/order creation).
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const {
      storeToken,
      packageId,
      quantity = 1,
      returnUrl,
      completeUrl,
      custom,
    } = body ?? {};

    if (!storeToken || typeof storeToken !== "string") {
      return NextResponse.json({ error: "Missing storeToken" }, { status: 400 });
    }
    if (packageId === undefined || packageId === null || packageId === "") {
      return NextResponse.json({ error: "Missing packageId" }, { status: 400 });
    }

    // Tebex Headless REQUIRES complete_url + cancel_url on basket creation —
    // omitting them made "Buy Now" fail with a generic checkout error. The
    // client rarely sends them, so default to the app origin (mirrors the cart
    // checkout flow, which always passes URLs).
    const origin = request.nextUrl.origin || "https://www.fivecrux.com";
    const completeUrlFinal = completeUrl || `${origin}/`;
    const returnUrlFinal = returnUrl || `${origin}/`;

    // 1. Create the basket against the seller's webstore.
    const created = await createBasket(storeToken, {
      returnUrl: returnUrlFinal,
      completeUrl: completeUrlFinal,
      custom,
    });

    // 2. Add the package, then 3. re-fetch to obtain the checkout link.
    await addPackageToBasket(storeToken, created.ident, packageId, quantity);
    const basket = await getBasket(storeToken, created.ident);
    const checkoutUrl = getCheckoutUrl(basket);

    // 4. Record the order for later webhook reconciliation.
    await db.insert(tebexOrders).values({
      id: randomUUID(),
      basketIdent: basket.ident,
      userId: auth.userId,
      kind: "seller_product",
      storeToken,
      packageIds: [String(packageId)],
      status: "pending",
      amount: basket.total_price != null ? String(basket.total_price) : null,
      custom: custom ?? null,
    });

    return NextResponse.json({ basketIdent: basket.ident, checkoutUrl });
  } catch (error) {
    console.error("Tebex create basket error:", error);
    return NextResponse.json(
      {
        error: "Failed to create Tebex basket",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
