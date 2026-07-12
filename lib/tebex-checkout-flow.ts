// Shared FiveCrux → Tebex checkout flow, used by both the init route
// (/api/cart/tebex-checkout) and the post-auth continuation route
// (/api/cart/tebex-continue). Keeping the logic here means the no-auth path and
// the FiveM-login path build the basket + persist the order identically.
import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { carts, creatorCodes, creatorCodeRedemptions, orders, tebexOrders } from "@/lib/db/schema";
import { validateCreatorCode } from "@/lib/creator-code-utils";
import {
  addPackageToBasket,
  createBasket,
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
 * Validate the user's cart + creator-code and resolve every item to a Tebex
 * package id in FiveCrux's store. Pure read/compute — nothing is created or
 * persisted here. Coupon and creator code are mutually exclusive (checkout
 * only ever sends one) — couponCode wins if somehow both arrive.
 *
 * NOTE (2026-07-12): a plain coupon code is no longer validated against a
 * FiveCrux-side `coupons` table here — it's passed straight through and
 * applied to the real Tebex basket in finalizeBasket(), which is now the
 * sole source of truth for whether it's valid and how much it discounts.
 * Creator codes are unchanged (FiveCrux still tracks those, since they carry
 * business logic — creator commission — that Tebex has no concept of).
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
    // Just a pass-through marker — Tebex is asked to validate + apply it for
    // real in finalizeBasket(). No local expiry/max-uses/scope check anymore.
    appliedCoupon = { code: couponCode };
  } else if (creatorCodeStr) {
    const creatorResult = await validateCreatorCode(creatorCodeStr, userId, total);
    if (creatorResult && "error" in creatorResult) return { ok: false, error: String(creatorResult.error || "Invalid creator code"), status: 400 };
    appliedCreatorCode = creatorResult?.creatorCode ?? null;
    discountAmount = creatorResult?.discountAmount ?? 0;
    creatorCommissionAmount = creatorResult?.commissionAmount ?? 0;
  }

  // Allow €0 (free packages / 100%-off codes) — Tebex still processes a €0
  // order through checkout and emails the file, so free goes through Tebex too
  // (no separate library path). For a plain coupon, this is a placeholder —
  // finalizeBasket() overwrites it with Tebex's own post-discount total.
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

export type PreviewCouponResult =
  | { ok: false; error: string; status: number }
  | { ok: true; code: string };

/**
 * Preview whether a coupon code is valid, by applying it to a throwaway EMPTY
 * Tebex basket (never shown to the buyer, never completed — it just expires
 * unused on Tebex's side). Coupons are Tebex-native now (see finalizeBasket),
 * so this is the only honest way to check a code before the buyer commits to
 * checkout: there's no FiveCrux-side coupon table left to consult.
 *
 * IMPORTANT: this store requires the buyer to be logged in (via Tebex/FiveM
 * auth) before packages can be added to a basket (confirmed against the real
 * Tebex API — adding a package to an unauthenticated basket returns 422
 * "User must login before adding packages to basket"). So this preview
 * CANNOT show the real discounted total — only Tebex applying the coupon to
 * the buyer's actual, authenticated, package-filled basket during real
 * checkout (finalizeBasket) can. This only confirms the code itself is
 * currently valid; the real amount is revealed at checkout.
 */
export async function previewCoupon(storeToken: string, couponCode: string): Promise<PreviewCouponResult> {
  let basketIdent: string;
  try {
    const created = await createBasket(storeToken, {
      completeUrl: "https://fivecrux.com/cart",
      returnUrl: "https://fivecrux.com/cart",
    });
    basketIdent = created.ident;
  } catch (e) {
    console.error("previewCoupon: throwaway basket creation failed:", e);
    return { ok: false, error: "Couldn't check that coupon right now.", status: 502 };
  }

  try {
    await applyCoupon(storeToken, basketIdent, couponCode);
  } catch (e) {
    return { ok: false, error: "That coupon code isn't valid.", status: 404 };
  }

  return { ok: true, code: couponCode };
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

export type FinalizeResult =
  | { ok: false; error: string; status: number }
  | { ok: true; checkoutUrl: string; order: any };

/**
 * Add packages to an (authenticated) basket, apply the coupon/creator-code,
 * then persist the order + bookkeeping + tebex_orders ATOMICALLY (I5: nothing
 * is committed unless the Tebex calls succeed). Returns the hosted checkout
 * URL.
 *
 * Coupon codes (2026-07-12): Tebex is now the sole source of truth. A coupon
 * MUST successfully apply to the real basket — if Tebex rejects it (expired,
 * unknown, already used, whatever rule the seller set on their own Tebex
 * dashboard), checkout fails with a clear error instead of silently charging
 * full price (the old behavior swallowed a failed apply as "non-fatal").
 * FiveCrux no longer tracks coupon redemptions/usedCount at all — Tebex owns
 * that now. payableAmount for a coupon order comes from Tebex's own
 * post-discount basket total, not a locally-computed figure.
 *
 * Creator codes are unchanged — still FiveCrux-validated/tracked, since they
 * carry commission bookkeeping Tebex has no concept of.
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
}): Promise<FinalizeResult> {
  const {
    userId, cartId, storeToken, basketIdent, provItems,
    appliedCoupon, appliedCreatorCode, creatorCommissionAmount = 0,
    total, orderId, custom,
  } = args;
  let payableAmount = args.payableAmount;
  let discountAmount = args.discountAmount;

  for (const i of provItems) {
    await addPackageToBasket(storeToken, basketIdent, i.tebexPackageId as number, i.quantity);
  }

  if (appliedCoupon?.code) {
    try {
      await applyCoupon(storeToken, basketIdent, appliedCoupon.code);
    } catch (e) {
      console.error("Tebex rejected coupon code:", appliedCoupon.code, e);
      return { ok: false, error: "That coupon code isn't valid.", status: 400 };
    }
  } else if (appliedCreatorCode?.code) {
    // Best-effort, as before — the discount/commission accounting for
    // creator codes lives in FiveCrux's own DB, not Tebex's.
    try { await applyCoupon(storeToken, basketIdent, appliedCreatorCode.code); } catch { /* non-fatal */ }
  }

  const basket = await getBasket(storeToken, basketIdent);
  const checkoutUrl = getCheckoutUrl(basket);

  // A plain coupon's real discount is whatever Tebex actually applied —
  // never a locally-computed guess.
  if (appliedCoupon?.code && basket.total_price != null) {
    payableAmount = Number(basket.total_price);
    discountAmount = Math.max(0, total - payableAmount);
  }

  const order = await db.transaction(async (tx) => {
    const [o] = await tx.insert(orders).values({
      id: orderId,
      userId,
      cartId,
      couponId: null, // FiveCrux no longer models coupons as a local entity
      creatorCodeId: appliedCreatorCode?.id ?? null,
      totalAmount: total.toString(),
      discountAmount: discountAmount.toFixed(2),
      payableAmount: payableAmount.toFixed(2),
      status: "pending",
    }).returning();

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

  return { ok: true, checkoutUrl, order };
}
