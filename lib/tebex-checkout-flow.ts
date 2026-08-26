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
  applyCreatorCode,
} from "@/lib/tebex";
import { resolveTebexPackageId } from "@/lib/tebex-pricing";

// Full 32-bit-safe random — the old floor(Date.now()/1000)+rand(0..9999)
// collided for orders created in the same second (duplicate-PK 500).
export function genCheckoutId() {
  return Math.floor(Math.random() * 2_000_000_000);
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

/** The webhook-facing custom payload set on the Tebex basket. */
export function buildCustom(
  userId: string,
  orderId: number,
  cartId: number,
  provItems: ProvItem[],
  /**
   * What the creator earns on this order. Carried here rather than on the
   * `orders` row because there is no column for it, and it must be the figure
   * agreed when the order was PRICED — recomputing it at capture time would
   * quietly pay a different rate if the code changed in between.
   */
  creator?: { creatorCodeId: number; discountAmount: number; commissionAmount: number } | null
) {
  return {
    kind: "platform_cart",
    userId,
    fivecruxOrderId: orderId,
    cartId,
    ...(creator ? { creator } : {}),
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
