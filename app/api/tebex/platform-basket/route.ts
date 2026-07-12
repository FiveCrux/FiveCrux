import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  createBasket,
  addPackageToBasket,
  getBasket,
  getCheckoutUrl,
  FIVECRUX_TEBEX_PUBLIC_TOKEN,
} from "@/lib/tebex";
import { resolvePackage } from "@/lib/ad-pricing";
import { resolveTebexPackageId } from "@/lib/tebex-pricing";
import { db } from "@/lib/db/client";
import { tebexOrders } from "@/lib/db/schema";
import { requireUser } from "@/lib/api-auth";

/**
 * POST /api/tebex/platform-basket
 *
 * Create a Tebex basket against FiveCrux's OWN webstore for a PLATFORM FEE
 * (advertisement slots, featured-script slots). Uses the FiveCrux store token
 * (TEBEX_PUBLIC_TOKEN), records a `tebex_orders` row with kind 'platform_fee',
 * and returns the hosted checkout URL. Provisioning happens later via webhook.
 *
 * Body: { packageType, packageId, duration, returnUrl?, completeUrl? }
 *   packageType: 'ads' | 'featured-scripts'
 *   packageId:   'starter' | 'premium' | 'executive'
 *   duration:    months for ads, weeks for featured-scripts
 *
 * SECURITY: every provisioning field (packageType/packageId/duration/slots)
 * is resolved and validated SERVER-SIDE via resolvePackage() — the same
 * catalog used by the cart checkout flow — never taken as-is from the client.
 * Previously this route accepted a client-supplied `custom` object verbatim
 * (only overwriting `userId`), so a caller could pay for a cheap package while
 * requesting `custom: { packageType: "ads", packageId: "executive",
 * slotsToAdd: 999, durationMonths: 12 }` — the webhook would have provisioned
 * whatever `custom` said, completely decoupled from what was actually charged.
 * The `custom` sent to Tebex (and echoed back on the webhook) is now built
 * entirely from the resolved, price-validated package — the client cannot
 * influence packageType/packageId/slots/duration independently of what they
 * are actually billed via `resolved.price`.
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: require a logged-in user; provision for the SESSION user, never a
    // client-supplied custom.userId.
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const { packageType, packageId, duration, returnUrl, completeUrl } = body ?? {};

    if (!packageType || !packageId || duration === undefined || duration === null) {
      return NextResponse.json(
        { error: "Missing packageType, packageId, or duration" },
        { status: 400 }
      );
    }

    // Resolve + validate the (packageType, packageId, duration) combo against
    // the server-side catalog and fetch its LIVE Tebex price. Rejects anything
    // that isn't a real, currently-priced package.
    const resolved = await resolvePackage(String(packageType), String(packageId), Number(duration));
    if (!resolved) {
      return NextResponse.json({ error: "Unknown or unpriced package" }, { status: 400 });
    }
    const tebexPackageId = await resolveTebexPackageId(resolved.packageType, resolved.packageId, resolved.duration);
    if (tebexPackageId == null) {
      return NextResponse.json({ error: "Package not mapped to a Tebex catalog item" }, { status: 400 });
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

    // The webhook needs this to provision — built entirely from the resolved,
    // validated package, never from client input.
    const custom = {
      userId: auth.userId,
      packageType: resolved.packageType,
      packageId: resolved.packageId,
      slotsToAdd: resolved.slots,
      durationMonths: resolved.durationMonths,
      ...(resolved.durationWeeks != null ? { durationWeeks: resolved.durationWeeks } : {}),
    };

    // 1. Create the basket against FiveCrux's own webstore.
    const created = await createBasket(storeToken, {
      returnUrl,
      completeUrl,
      custom,
    });

    // 2. Add the RESOLVED Tebex package (never the client's raw packageId), then
    // 3. re-fetch to obtain the checkout link.
    await addPackageToBasket(storeToken, created.ident, tebexPackageId, 1);
    const basket = await getBasket(storeToken, created.ident);
    const checkoutUrl = getCheckoutUrl(basket);

    // 4. Record the platform-fee order for later webhook reconciliation.
    await db.insert(tebexOrders).values({
      id: randomUUID(),
      basketIdent: basket.ident,
      userId: auth.userId,
      kind: "platform_fee",
      storeToken,
      packageIds: [String(tebexPackageId)],
      status: "pending",
      amount: basket.total_price != null ? String(basket.total_price) : null,
      custom,
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
