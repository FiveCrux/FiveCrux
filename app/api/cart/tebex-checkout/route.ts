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
import { getTebexPackageId } from "@/lib/tebex-packages";

function generateNumericId() {
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
}

/**
 * POST /api/cart/tebex-checkout
 *
 * Cart checkout for the platform's own paid slots (ad slots + featured-script
 * slots) through FiveCrux's OWN Tebex store. Creates the FiveCrux order + coupon
 * bookkeeping, then one Tebex basket for the whole cart, and returns the hosted
 * checkout URL.
 *
 * Provisioning + order completion happen later in the Tebex webhook
 * (payment.completed) — NOT here — exactly like Tebex's async payment model.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as any;

    if (!FIVECRUX_TEBEX_PUBLIC_TOKEN) {
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

    // 2. Cart total.
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

    // 3. Build the basket items from the cart. Metadata is server-authoritative
    // (set in /api/cart/add). Two kinds, both billed through FiveCrux's OWN store:
    //   • 'slot'  — ad / featured-script subscription plans (provision entitlements)
    //   • 'prop'  — digital props (delivery is Tebex's auto-email; we just record it)
    type ProvItem = {
      kind: "slot" | "prop";
      itemType: string;
      itemId: string;
      title: string;
      price: string | number;
      quantity: number;
      tebexPackageId: number | null;
      // slot-only:
      packageType?: string;
      packageId?: string;
      slotsToAdd?: number;
      durationMonths?: number;
      durationWeeks?: number;
    };
    const provItems: ProvItem[] = [];
    for (const item of cart.items) {
      const meta = typeof item.metadata === "string"
        ? (() => { try { return JSON.parse(item.metadata) } catch { return null } })()
        : (item.metadata as any);
      const base = { itemType: item.itemType, itemId: item.itemId, title: item.title, price: item.price, quantity: item.quantity };

      if (item.itemType === "subscription") {
        if (!meta?.packageType || !meta?.packageId) continue;
        const duration = meta.packageType === "ads" ? meta.durationMonths : meta.durationWeeks;
        provItems.push({
          ...base,
          kind: "slot",
          packageType: meta.packageType,
          packageId: meta.packageId,
          slotsToAdd: Number(meta.slotsToAdd ?? meta.slotsPerMonth ?? 1) || 1,
          durationMonths: meta.durationMonths != null ? Number(meta.durationMonths) : undefined,
          durationWeeks: meta.durationWeeks != null ? Number(meta.durationWeeks) : undefined,
          tebexPackageId: getTebexPackageId(meta.packageType, meta.packageId, duration),
        });
      } else if (item.itemType === "prop") {
        const pkgId = meta?.tebexPackageId;
        provItems.push({
          ...base,
          kind: "prop",
          tebexPackageId: pkgId != null && pkgId !== "" ? Number(pkgId) : null,
        });
      }
    }

    if (provItems.length === 0) {
      return NextResponse.json(
        { error: "Cart has no purchasable items" },
        { status: 400 }
      );
    }

    // Every item MUST map to a Tebex package id in FiveCrux's store.
    const unmapped = provItems.filter((i) => i.tebexPackageId == null);
    if (unmapped.length > 0) {
      return NextResponse.json(
        {
          error: "Tebex packages not configured for some cart items.",
          unmapped: unmapped.map((i) => i.kind === "slot" ? `${i.packageType}:${i.packageId}` : `prop:${i.itemId}`),
        },
        { status: 501 }
      );
    }

    // 4. Pre-generate the FiveCrux order id so the webhook `custom` can reference
    // it — we only PERSIST anything once the Tebex basket succeeds (I5: no orphan
    // pending orders / burned coupons if Tebex errors).
    const orderId = generateNumericId();
    const storeToken = FIVECRUX_TEBEX_PUBLIC_TOKEN;

    const custom = {
      kind: "platform_cart",
      userId: user.id,
      fivecruxOrderId: orderId,
      cartId: cart.id,
      items: provItems.map((i) => ({
        kind: i.kind,
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

    // 5. Create the Tebex basket FIRST. If any Tebex call fails, nothing is
    // committed to our DB (no orphan order, no burned coupon).
    let basket;
    try {
      const created = await createBasket(storeToken, { completeUrl, returnUrl, custom });
      for (const i of provItems) {
        await addPackageToBasket(storeToken, created.ident, i.tebexPackageId as number, i.quantity);
      }
      if (appliedCoupon) {
        // Best-effort: only works if a matching Tebex coupon exists in the store.
        try { await applyCoupon(storeToken, created.ident, appliedCoupon.code); } catch { /* non-fatal */ }
      }
      basket = await getBasket(storeToken, created.ident);
    } catch (e) {
      console.error("Tebex basket creation failed:", e);
      return NextResponse.json({ error: "Failed to start Tebex checkout" }, { status: 502 });
    }
    const checkoutUrl = getCheckoutUrl(basket);

    // 6. Persist order + coupon bookkeeping + tebex_orders ATOMICALLY (I5).
    const order = await db.transaction(async (tx) => {
      const [o] = await tx.insert(orders).values({
        id: orderId,
        userId: user.id,
        cartId: cart.id,
        couponId: appliedCoupon?.id ?? null,
        totalAmount: total.toString(),
        discountAmount: discountAmount.toFixed(2),
        payableAmount: payableAmount.toFixed(2),
        status: "pending",
      }).returning();

      if (appliedCoupon) {
        await tx.insert(couponRedemptions).values({
          id: generateNumericId(),
          couponId: appliedCoupon.id,
          userId: user.id,
          orderId: orderId,
        });
        await tx.update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1`, updatedAt: new Date() })
          .where(eq(coupons.id, appliedCoupon.id));
      }

      await tx.insert(tebexOrders).values({
        id: randomUUID(),
        basketIdent: basket.ident,
        userId: user.id,
        kind: "platform_fee", // webhook provisions platform fees; custom carries the cart items[]
        storeToken,
        packageIds: provItems.map((i) => i.tebexPackageId).filter((x) => x != null),
        status: "pending",
        amount: payableAmount.toFixed(2),
        custom,
      });
      return o;
    });

    return NextResponse.json({ success: true, order, basketIdent: basket.ident, checkoutUrl });
  } catch (error) {
    console.error("Tebex cart checkout error:", error);
    return NextResponse.json(
      { error: "Tebex checkout failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
