import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  createBasket,
  addPackageToBasket,
  getBasket,
  getCheckoutUrl,
  FIVECRUX_TEBEX_PUBLIC_TOKEN,
} from "@/lib/tebex";
import { db } from "@/lib/db/client";
import { tebexOrders } from "@/lib/db/schema";

/**
 * POST /api/tebex/platform-basket
 *
 * Create a Tebex basket against FiveCrux's OWN webstore for a PLATFORM FEE
 * (advertisement slots, featured-script slots). Uses the FiveCrux store token
 * (TEBEX_PUBLIC_TOKEN), records a `tebex_orders` row with kind 'platform_fee',
 * and returns the hosted checkout URL. Provisioning happens later via webhook.
 *
 * Body: { packageId, quantity?, returnUrl?, completeUrl?, custom? }
 *
 * The `custom` object is echoed back on the basket + every webhook payload, so
 * it MUST carry everything the webhook needs to provision the entitlement once
 * payment completes (see app/api/tebex/webhook/route.ts). For platform fees we
 * mirror the metadata that app/api/cart/capture/route.ts reads from PayPal:
 *   {
 *     userId: string,                            // who to provision for
 *     packageType: 'ads' | 'featured-scripts',   // which entitlement
 *     packageId: 'starter'|'premium'|'executive',
 *     slotsToAdd: number,                         // how many slots
 *     durationMonths?: number,                    // ads: 1|3|6|12
 *     durationWeeks?: number,                     // featured-scripts: 1|2|4|8
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      packageId,
      quantity = 1,
      returnUrl,
      completeUrl,
      custom,
    } = body ?? {};

    if (packageId === undefined || packageId === null || packageId === "") {
      return NextResponse.json({ error: "Missing packageId" }, { status: 400 });
    }

    // Resolve FiveCrux's own store token explicitly so we can persist it on the
    // order row (the client would also fall back to it when token is omitted).
    const storeToken = FIVECRUX_TEBEX_PUBLIC_TOKEN;
    if (!storeToken) {
      return NextResponse.json(
        { error: "FiveCrux Tebex store token not configured (TEBEX_PUBLIC_TOKEN)" },
        { status: 500 }
      );
    }

    // 1. Create the basket against FiveCrux's own webstore.
    const created = await createBasket(storeToken, {
      returnUrl,
      completeUrl,
      custom,
    });

    // 2. Add the package, then 3. re-fetch to obtain the checkout link.
    await addPackageToBasket(storeToken, created.ident, packageId, quantity);
    const basket = await getBasket(storeToken, created.ident);
    const checkoutUrl = getCheckoutUrl(basket);

    // 4. Record the platform-fee order for later webhook reconciliation.
    // Pull the userId out of `custom` (when provided) so the webhook can
    // provision the entitlement for the right user. The full provisioning
    // details live in `custom` and are echoed back on the webhook payload.
    const provisioningUserId =
      custom && typeof custom === "object" && typeof (custom as any).userId === "string"
        ? (custom as any).userId
        : null;

    await db.insert(tebexOrders).values({
      id: randomUUID(),
      basketIdent: basket.ident,
      userId: provisioningUserId,
      kind: "platform_fee",
      storeToken,
      packageIds: [String(packageId)],
      status: "pending",
      amount: basket.total_price != null ? String(basket.total_price) : null,
      custom: custom ?? null,
    });

    return NextResponse.json({ basketIdent: basket.ident, checkoutUrl });
  } catch (error) {
    console.error("Tebex create platform basket error:", error);
    return NextResponse.json(
      {
        error: "Failed to create Tebex platform basket",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
