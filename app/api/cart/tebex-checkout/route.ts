import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";

import { authOptions } from "@/auth";
import { db } from "@/lib/db/client";
import { carts, coupons, couponRedemptions, orders, tebexOrders } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { validateCoupon } from "@/lib/cart-checkout-utils";
import {
  createBasket,
  addPackageToBasket,
  getBasket,
  getCheckoutUrl,
  applyCoupon,
  FIVECRUX_TEBEX_PUBLIC_TOKEN,
} from "@/lib/tebex";
import { getTebexPackageId, isTebexMock } from "@/lib/tebex-packages";

function generateNumericId() {
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
}

/**
 * POST /api/cart/tebex-checkout
 *
 * Tebex counterpart of /api/cart/checkout (PayPal). Sells the platform's own
 * paid slots (ad slots + featured-script slots) through FiveCrux's OWN Tebex
 * store. Mirrors the PayPal route's order/coupon bookkeeping, then creates one
 * Tebex basket for the whole cart and returns the hosted checkout URL.
 *
 * Provisioning + order completion happen later in the Tebex webhook
 * (payment.completed) — NOT here — exactly like Tebex's async payment model.
 *
 * Set TEBEX_MOCK=true to exercise the full flow locally with no real store: the
 * basket/checkout call is synthesized and the webhook is fired by the test
 * harness (scripts/e2e-tebex.mjs).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as any;
    const mock = isTebexMock();

    if (!mock && !FIVECRUX_TEBEX_PUBLIC_TOKEN) {
      return NextResponse.json(
        { error: "FiveCrux Tebex store token not configured (TEBEX_PUBLIC_TOKEN)" },
        { status: 501 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const couponCode = typeof body.couponCode === "string" ? body.couponCode : "";

    // 1. Active cart + items.
    const cart = await db.query.carts.findFirst({
      where: and(eq(carts.userId, user.id), eq(carts.status, "active")),
      with: { items: true },
    });
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart empty" }, { status: 400 });
    }

    // 2. Total (mirror PayPal route exactly).
    let total = 0;
    for (const item of cart.items) total += Number(item.price) * item.quantity;

    const couponResult = await validateCoupon(couponCode, user.id, total, cart.items);
    if (couponResult && "error" in couponResult) {
      return NextResponse.json({ error: couponResult.error }, { status: 400 });
    }
    const appliedCoupon = couponResult?.coupon ?? null;
    const discountAmount = couponResult?.discountAmount ?? 0;
    const payableAmount = Math.max(0, total - discountAmount);
    if (payableAmount <= 0) {
      return NextResponse.json(
        { error: "Payable amount must be greater than 0 to start payment" },
        { status: 400 }
      );
    }

    // 3. Build provisioning items from the cart's subscription (platform) items.
    // Metadata is server-authoritative (set in /api/cart/add via lib/ad-pricing).
    type ProvItem = {
      packageType: string;
      packageId: string;
      slotsToAdd: number;
      durationMonths?: number;
      durationWeeks?: number;
      tebexPackageId: number | null;
      quantity: number;
    };
    const provItems: ProvItem[] = [];
    for (const item of cart.items) {
      if (item.itemType !== "subscription") continue;
      const meta = typeof item.metadata === "string"
        ? (() => { try { return JSON.parse(item.metadata) } catch { return null } })()
        : (item.metadata as any);
      if (!meta?.packageType || !meta?.packageId) continue;
      const duration = meta.packageType === "ads" ? meta.durationMonths : meta.durationWeeks;
      provItems.push({
        packageType: meta.packageType,
        packageId: meta.packageId,
        slotsToAdd: Number(meta.slotsToAdd ?? meta.slotsPerMonth ?? 1) || 1,
        durationMonths: meta.durationMonths != null ? Number(meta.durationMonths) : undefined,
        durationWeeks: meta.durationWeeks != null ? Number(meta.durationWeeks) : undefined,
        tebexPackageId: getTebexPackageId(meta.packageType, meta.packageId, duration),
        quantity: item.quantity,
      });
    }

    if (provItems.length === 0) {
      return NextResponse.json(
        { error: "No platform-fee items in cart (Tebex checkout handles ad/featured slots)" },
        { status: 400 }
      );
    }

    // In real mode every item MUST map to a Tebex package id.
    if (!mock) {
      const unmapped = provItems.filter((i) => i.tebexPackageId == null);
      if (unmapped.length > 0) {
        return NextResponse.json(
          {
            error: "Tebex packages not configured for some cart items. Fill lib/tebex-packages.ts.",
            unmapped: unmapped.map((i) => `${i.packageType}:${i.packageId}`),
          },
          { status: 501 }
        );
      }
    }

    // 4. Create the FiveCrux order (pending) + coupon bookkeeping — same as PayPal.
    const [order] = await db.insert(orders).values({
      id: generateNumericId(),
      userId: user.id,
      cartId: cart.id,
      couponId: appliedCoupon?.id ?? null,
      totalAmount: total.toString(),
      discountAmount: discountAmount.toFixed(2),
      payableAmount: payableAmount.toFixed(2),
      status: "pending",
    }).returning();

    if (appliedCoupon) {
      await db.insert(couponRedemptions).values({
        id: generateNumericId(),
        couponId: appliedCoupon.id,
        userId: user.id,
        orderId: order.id,
      });
      await db.update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1`, updatedAt: new Date() })
        .where(eq(coupons.id, appliedCoupon.id));
    }

    // 5. The `custom` payload echoed back on the webhook — everything the webhook
    // needs to provision the whole cart and complete the order.
    const custom = {
      kind: "platform_cart",
      userId: user.id,
      fivecruxOrderId: order.id,
      cartId: cart.id,
      items: provItems.map((i) => ({
        packageType: i.packageType,
        packageId: i.packageId,
        slotsToAdd: i.slotsToAdd,
        durationMonths: i.durationMonths,
        durationWeeks: i.durationWeeks,
      })),
    };

    const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const completeUrl = `${siteUrl}/cart?payment=success&provider=tebex`;
    const returnUrl = `${siteUrl}/cart?payment=cancelled`;

    let basketIdent: string;
    let checkoutUrl: string;

    if (mock) {
      // Local mock: no real Tebex call. Synthesize a basket + checkout URL.
      basketIdent = `mock-${randomUUID()}`;
      checkoutUrl = `${completeUrl}&mock=1&order=${order.id}`;
    } else {
      const storeToken = FIVECRUX_TEBEX_PUBLIC_TOKEN;
      const created = await createBasket(storeToken, { completeUrl, returnUrl, custom });
      for (const i of provItems) {
        await addPackageToBasket(storeToken, created.ident, i.tebexPackageId as number, i.quantity);
      }
      if (appliedCoupon) {
        // Best-effort: only works if a matching Tebex coupon exists in the store.
        try { await applyCoupon(storeToken, created.ident, appliedCoupon.code); } catch { /* non-fatal */ }
      }
      const basket = await getBasket(storeToken, created.ident);
      basketIdent = basket.ident;
      checkoutUrl = getCheckoutUrl(basket);
    }

    // 6. Record the Tebex order for webhook reconciliation/provisioning.
    await db.insert(tebexOrders).values({
      id: randomUUID(),
      basketIdent,
      userId: user.id,
      kind: "platform_fee", // webhook provisions platform fees; custom carries the cart items[]
      storeToken: mock ? "mock" : FIVECRUX_TEBEX_PUBLIC_TOKEN,
      packageIds: provItems.map((i) => i.tebexPackageId).filter((x) => x != null),
      status: "pending",
      amount: payableAmount.toFixed(2),
      custom,
    });

    return NextResponse.json({ success: true, order, basketIdent, checkoutUrl, mock });
  } catch (error) {
    console.error("Tebex cart checkout error:", error);
    return NextResponse.json(
      { error: "Tebex checkout failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
