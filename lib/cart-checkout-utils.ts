// Coupon validation against a real cart — the one place that reads the
// database and decides whether a code applies and for how much.
//
// Coupons were briefly Tebex-native, which meant FiveCrux could not even tell
// a buyer what their discount was until PayPal showed them the charge. They are
// FiveCrux's own again: every rule is enforced here, and the amount is known
// before the buyer commits.
//
// Both callers use this and nothing else, so the number quoted on the cart page
// and the number actually charged come from the same code:
//   POST /api/cart/coupon   — the Apply button
//   POST /api/paypal/order  — authoritative, at the moment money is taken
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  coupons,
  couponRedemptions,
  creatorCodes,
  creatorCodeRedemptions,
} from "@/lib/db/schema";
import {
  calculateCouponDiscount,
  isTargetedScope,
  lineTotal,
  matchScope,
  validateCouponRules,
  type CartLine,
} from "@/lib/coupon-utils";
import { getPropOwnersByIds, getUserById } from "@/lib/database-new";
import { isCouponAdmin } from "@/lib/coupon-access";

type Coupon = typeof coupons.$inferSelect;

export type CouponResult =
  | { ok: true; coupon: Coupon; discountAmount: number; eligibleTotal: number }
  | { ok: false; error: string; status: number };

/**
 * MONEY-SAFETY: confine a plain creator's coupon to their OWN products.
 *
 * A `verified_creator` who is not also an admin/founder may create coupons, but
 * such a coupon must only discount props that creator listed. It must not
 * discount another seller's props, nor platform ad/featured slots — those are
 * FiveCrux's own revenue, not the creator's to give away. Admin and founder
 * coupons keep full reach.
 */
async function confineToCouponOwner(matching: CartLine[], coupon: Coupon): Promise<CartLine[]> {
  // No creator recorded → an admin-seeded coupon; unrestricted.
  if (!coupon.createdBy) return matching;

  const creator = await getUserById(coupon.createdBy);
  if (isCouponAdmin(creator?.roles)) return matching;

  const propItems = matching.filter((item) => item.itemType === "prop");
  if (propItems.length === 0) return [];

  const owners = await getPropOwnersByIds(propItems.map((item) => String(item.itemId)));
  return propItems.filter((item) => owners.get(String(item.itemId)) === coupon.createdBy);
}

/**
 * Validate `code` against these cart lines for this user.
 *
 * Returns the discount in the cart's currency, already clamped to the lines the
 * coupon is allowed to touch. Never throws for an invalid code — a bad coupon
 * is a 400 with a reason the buyer can act on, not a 500.
 */
export async function validateCouponForCart(
  code: string,
  userId: string,
  items: CartLine[]
): Promise<CouponResult> {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) {
    return { ok: false, error: "Coupon code is required", status: 400 };
  }

  const coupon = await db.query.coupons.findFirst({
    where: eq(coupons.code, normalized),
  });

  // Deliberately the same message for "no such code" and "switched off", so the
  // endpoint cannot be used to enumerate which codes exist.
  if (!coupon || coupon.isActive === false) {
    return { ok: false, error: "Invalid coupon code", status: 400 };
  }

  const matching = matchScope(items, coupon.scope);
  if (matching.length === 0 && isTargetedScope(coupon.scope)) {
    return {
      ok: false,
      error: `This coupon only applies to ${coupon.scope} in your cart`,
      status: 400,
    };
  }

  const eligible = await confineToCouponOwner(matching, coupon);
  if (eligible.length === 0) {
    return { ok: false, error: "This coupon does not apply to anything in your cart", status: 400 };
  }

  const eligibleTotal = lineTotal(eligible);

  // How many times THIS user has already redeemed it. Counted from redemptions
  // rather than a column so it stays correct when a refund removes one.
  const [priorUses] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(couponRedemptions)
    .where(and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.userId, userId)));

  // minCartValue is a threshold on what the buyer is spending, so it is checked
  // against the whole cart, not just the part this coupon can discount.
  const invalid = validateCouponRules(coupon, {
    cartTotal: lineTotal(items),
    userRedemptions: Number(priorUses?.n ?? 0),
  });
  if (invalid) return { ok: false, error: invalid.error, status: 400 };

  return {
    ok: true,
    coupon,
    eligibleTotal,
    discountAmount: calculateCouponDiscount(coupon, eligibleTotal),
  };
}

/**
 * Book a coupon use against a paid order.
 *
 * Without this the counters `validateCouponForCart` reads are never written, so
 * maxUses and perUserLimit can never trip and a single-use coupon is unlimited.
 *
 * Idempotent: payment providers retry webhooks, and a retry must not burn a
 * second use. Reversed by restoreCouponForFiveCruxOrder on refund.
 */
export async function recordCouponRedemption(
  couponId: number,
  userId: string,
  orderId: number,
  newId: () => number
): Promise<void> {
  const existing = await db.query.couponRedemptions.findFirst({
    where: and(
      eq(couponRedemptions.couponId, couponId),
      eq(couponRedemptions.orderId, orderId)
    ),
  });
  if (existing) return;

  await db.insert(couponRedemptions).values({
    id: newId(),
    couponId,
    userId,
    orderId,
    usedAt: new Date(),
  });

  await db
    .update(coupons)
    .set({ usedCount: sql`${coupons.usedCount} + 1`, updatedAt: new Date() })
    .where(eq(coupons.id, couponId));
}

/**
 * Book a creator-code use, and the commission the creator earned, against a
 * paid order.
 *
 * This lived inside the Tebex checkout's finalizeBasket. When payment moved to
 * PayPal nothing took it over, so on every PayPal order the code's usage went
 * uncounted AND the creator earned nothing — the redemption row is where the
 * commission is recorded.
 *
 * Booked on money actually taken, not at checkout start: the old placement
 * credited commission on orders that were merely started, and abandoned ones
 * left a limited-use code burned. Idempotent for the same reason coupons are;
 * reversed by restoreCouponForFiveCruxOrder on refund.
 */
export async function recordCreatorCodeRedemption(
  creatorCodeId: number,
  userId: string,
  orderId: number,
  discountAmount: number,
  commissionAmount: number
): Promise<void> {
  const existing = await db.query.creatorCodeRedemptions.findFirst({
    where: and(
      eq(creatorCodeRedemptions.creatorCodeId, creatorCodeId),
      eq(creatorCodeRedemptions.orderId, orderId)
    ),
  });
  if (existing) return;

  await db.insert(creatorCodeRedemptions).values({
    creatorCodeId,
    userId,
    orderId,
    discountAmount: discountAmount.toFixed(2),
    commissionAmount: commissionAmount.toFixed(2),
  });

  await db
    .update(creatorCodes)
    .set({ usedCount: sql`${creatorCodes.usedCount} + 1`, updatedAt: new Date() })
    .where(eq(creatorCodes.id, creatorCodeId));
}
