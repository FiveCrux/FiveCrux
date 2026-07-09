// Shared FiveCrux → Tebex checkout flow, used by both the init route
// (/api/cart/tebex-checkout) and the post-auth continuation route
// (/api/cart/tebex-continue). Keeping the logic here means the no-auth path and
// the FiveM-login path build the basket + persist the order identically.
import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { carts, coupons, couponRedemptions, creatorCodes, creatorCodeRedemptions, orders, tebexOrders } from "@/lib/db/schema";
import { validateCoupon } from "@/lib/cart-checkout-utils";
import { validateCreatorCode } from "@/lib/creator-code-utils";
import {
  addPackageToBasket,
  getBasket,
  getCheckoutUrl,
  applyCoupon,
} from "@/lib/tebex";
import { resolveTebexPackageId } from "@/lib/tebex-pricing";

export function genCheckoutId() {
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
}

export type ProvItem = {
  kind: "slot" | "prop";
  itemType: string;
  itemId: string;
  title: string;
  price: string | number;
  quantity: number;
  tebexPackageId: number | null;
  packageType?: string;
  packageId?: string;
  slotsToAdd?: number;
  durationMonths?: number;
  durationWeeks?: number;
};

type PrepResult =
  | { ok: false; error: string; status: number; unmapped?: string[] }
  | {
      ok: true;
      cart: any;
      provItems: ProvItem[];
      appliedCoupon: any;
      appliedCreatorCode: any;
      creatorCommissionAmount: number;
      discountAmount: number;
      payableAmount: number;
      total: number;
    };

/**
 * Validate the user's cart + coupon/creator-code and resolve every item to a
 * Tebex package id in FiveCrux's store. Pure read/compute — nothing is
 * created or persisted here. Coupon and creator code are mutually exclusive
 * (checkout only ever sends one) — couponCode wins if somehow both arrive.
 */
export async function prepareCartCheckout(userId: string, couponCode: string, creatorCodeStr: string = ""): Promise<PrepResult> {
  const cart = await db.query.carts.findFirst({
    where: and(eq(carts.userId, userId), eq(carts.status, "active")),
    with: { items: true },
  });
  if (!cart || cart.items.length === 0) return { ok: false, error: "Cart empty", status: 400 };

  let total = 0;
  for (const item of cart.items) total += Number(item.price) * item.quantity;

  let appliedCoupon: any = null;
  let appliedCreatorCode: any = null;
  let discountAmount = 0;
  let creatorCommissionAmount = 0;

  if (couponCode) {
    const couponResult = await validateCoupon(couponCode, userId, total, cart.items);
    if (couponResult && "error" in couponResult) return { ok: false, error: String(couponResult.error || "Invalid coupon"), status: 400 };
    appliedCoupon = couponResult?.coupon ?? null;
    discountAmount = couponResult?.discountAmount ?? 0;
  } else if (creatorCodeStr) {
    const creatorResult = await validateCreatorCode(creatorCodeStr, userId, total);
    if (creatorResult && "error" in creatorResult) return { ok: false, error: String(creatorResult.error || "Invalid creator code"), status: 400 };
    appliedCreatorCode = creatorResult?.creatorCode ?? null;
    discountAmount = creatorResult?.discountAmount ?? 0;
    creatorCommissionAmount = creatorResult?.commissionAmount ?? 0;
  }

  // Allow €0 (free packages / 100%-off codes) — Tebex still processes a €0
  // order through checkout and emails the file, so free goes through Tebex too
  // (no separate library path).
  const payableAmount = Math.max(0, total - discountAmount);

  const provItems: ProvItem[] = [];
  for (const item of cart.items) {
    const meta = typeof item.metadata === "string"
      ? (() => { try { return JSON.parse(item.metadata as string) } catch { return null } })()
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
        tebexPackageId: await resolveTebexPackageId(meta.packageType, meta.packageId, duration),
      });
    } else if (item.itemType === "prop") {
      const pkgId = meta?.tebexPackageId;
      provItems.push({ ...base, kind: "prop", tebexPackageId: pkgId != null && pkgId !== "" ? Number(pkgId) : null });
    }
  }

  if (provItems.length === 0) return { ok: false, error: "Cart has no purchasable items", status: 400 };

  const unmapped = provItems.filter((i) => i.tebexPackageId == null);
  if (unmapped.length > 0) {
    return {
      ok: false,
      error: "Tebex packages not configured for some cart items.",
      status: 501,
      unmapped: unmapped.map((i) => (i.kind === "slot" ? `${i.packageType}:${i.packageId}` : `prop:${i.itemId}`)),
    };
  }

  return { ok: true, cart, provItems, appliedCoupon, appliedCreatorCode, creatorCommissionAmount, discountAmount, payableAmount, total };
}

/** The webhook-facing custom payload set on the Tebex basket. */
export function buildCustom(userId: string, orderId: number, cartId: number, provItems: ProvItem[]) {
  return {
    kind: "platform_cart",
    userId,
    fivecruxOrderId: orderId,
    cartId,
    items: provItems.map((i) => ({
      kind: i.kind,
      packageType: i.packageType,
      packageId: i.packageId,
      slotsToAdd: i.slotsToAdd,
      durationMonths: i.durationMonths,
      durationWeeks: i.durationWeeks,
    })),
  };
}

/**
 * Add packages to an (authenticated) basket, apply the coupon, then persist the
 * order + coupon bookkeeping + tebex_orders ATOMICALLY (I5: nothing is committed
 * unless the Tebex calls succeed). Returns the hosted checkout URL.
 */
export async function finalizeBasket(args: {
  userId: string;
  cartId: number;
  storeToken: string;
  basketIdent: string;
  provItems: ProvItem[];
  appliedCoupon: any;
  appliedCreatorCode?: any;
  creatorCommissionAmount?: number;
  discountAmount: number;
  payableAmount: number;
  total: number;
  orderId: number;
  custom: any;
}): Promise<{ checkoutUrl: string; order: any }> {
  const {
    userId, cartId, storeToken, basketIdent, provItems,
    appliedCoupon, appliedCreatorCode, creatorCommissionAmount = 0,
    discountAmount, payableAmount, total, orderId, custom,
  } = args;

  for (const i of provItems) {
    await addPackageToBasket(storeToken, basketIdent, i.tebexPackageId as number, i.quantity);
  }
  const codeForTebex = appliedCoupon?.code ?? appliedCreatorCode?.code;
  if (codeForTebex) {
    try { await applyCoupon(storeToken, basketIdent, codeForTebex); } catch { /* non-fatal */ }
  }
  const basket = await getBasket(storeToken, basketIdent);
  const checkoutUrl = getCheckoutUrl(basket);

  const order = await db.transaction(async (tx) => {
    const [o] = await tx.insert(orders).values({
      id: orderId,
      userId,
      cartId,
      couponId: appliedCoupon?.id ?? null,
      creatorCodeId: appliedCreatorCode?.id ?? null,
      totalAmount: total.toString(),
      discountAmount: discountAmount.toFixed(2),
      payableAmount: payableAmount.toFixed(2),
      status: "pending",
    }).returning();

    if (appliedCoupon) {
      await tx.insert(couponRedemptions).values({
        id: genCheckoutId(),
        couponId: appliedCoupon.id,
        userId,
        orderId,
      });
      await tx.update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1`, updatedAt: new Date() })
        .where(eq(coupons.id, appliedCoupon.id));
    }

    if (appliedCreatorCode) {
      await tx.insert(creatorCodeRedemptions).values({
        creatorCodeId: appliedCreatorCode.id,
        userId,
        orderId,
        discountAmount: discountAmount.toFixed(2),
        commissionAmount: creatorCommissionAmount.toFixed(2),
      });
      await tx.update(creatorCodes)
        .set({ usedCount: sql`${creatorCodes.usedCount} + 1`, updatedAt: new Date() })
        .where(eq(creatorCodes.id, appliedCreatorCode.id));
    }

    await tx.insert(tebexOrders).values({
      id: randomUUID(),
      basketIdent,
      userId,
      kind: "platform_fee",
      storeToken,
      packageIds: provItems.map((i) => i.tebexPackageId).filter((x) => x != null) as number[],
      status: "pending",
      amount: payableAmount.toFixed(2),
      custom,
    });
    return o;
  });

  return { checkoutUrl, order };
}
