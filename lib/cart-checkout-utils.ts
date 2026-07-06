// Shared cart checkout helpers — coupon validation, discount calculation, and
// scope matching. Extracted verbatim from app/api/cart/checkout/route.ts so the
// Shared so the cart checkout route applies consistent coupon/discount rules.
import { db } from "@/lib/db/client";
import { coupons, couponRedemptions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { validateCouponSchedule } from "@/lib/coupon-utils";
import { getPropOwnersByIds, getUserById } from "@/lib/database-new";
import { isCouponAdmin } from "@/lib/coupon-access";

type Coupon = typeof coupons.$inferSelect;

/**
 * MONEY-SAFETY: confine a plain creator's coupon to their OWN products.
 *
 * A `verified_creator` (who is NOT also an admin/founder) may create coupons,
 * but such a coupon must only ever discount props the creator themselves
 * listed (prop.createdBy === coupon.createdBy). It must NOT discount other
 * sellers' props, nor platform ad/featured slots (those are subscription line
 * items, not props). Admin/founder coupons are unaffected — they keep the full
 * scope behavior.
 *
 * Given the already scope-matched items, this returns only the subset the
 * coupon is actually allowed to discount. For admin/founder coupons it returns
 * the input unchanged.
 */
async function filterItemsToCouponOwner(matchingItems: any[], coupon: Coupon): Promise<any[]> {
  // No creator recorded → treat as unrestricted (legacy/admin-seeded coupons).
  if (!coupon.createdBy) return matchingItems;

  const creator = await getUserById(coupon.createdBy);
  // Admins/founders keep unrestricted reach.
  if (isCouponAdmin(creator?.roles)) return matchingItems;

  // Plain creator: only their own props are eligible. Ad/featured slots are
  // subscription items and are never a creator's own product → excluded here.
  const propItems = matchingItems.filter((item) => item.itemType === "prop");
  if (propItems.length === 0) return [];

  const owners = await getPropOwnersByIds(propItems.map((item) => String(item.itemId)));
  return propItems.filter((item) => owners.get(String(item.itemId)) === coupon.createdBy);
}

export function getMatchingItemsTotal(items: any[], scope: string) {
  const isTargetedScope = ["Ad Slots", "Featured Script Slots", "Props"].includes(scope);

  const matchingItems = items.filter((item) => {
    if (!isTargetedScope) return true;

    const metadata = typeof item.metadata === "string"
      ? (() => { try { return JSON.parse(item.metadata) } catch { return null } })()
      : item.metadata;

    if (scope === "Props") {
      return item.itemType === "prop";
    }
    if (scope === "Ad Slots") {
      return metadata?.couponScope === "Ad Slots" || metadata?.category === "Ad Slots" || metadata?.packageType === "ads";
    }
    if (scope === "Featured Script Slots") {
      return metadata?.couponScope === "Featured Script Slots" || metadata?.category === "Featured Script Slots" || metadata?.packageType === "featured-scripts";
    }
    return false;
  });

  return {
    items: matchingItems,
    total: matchingItems.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    ),
  };
}

export function calculateDiscount(total: number, coupon: Coupon) {
  const value = Number(coupon.discountValue);

  // Case-insensitive: the enum allows both "percentage" and "Percentage" (I3).
  if (String(coupon.discountType).toLowerCase() === "percentage") {
    return Math.min(total, (total * value) / 100);
  }

  return Math.min(total, value);
}

export async function validateCoupon(couponCode: string, userId: string, total: number, items: any[]) {
  const code = couponCode.trim().toUpperCase();

  if (!code) {
    return null;
  }

  const coupon = await db.query.coupons.findFirst({
    where: eq(coupons.code, code),
  });

  if (!coupon || coupon.isActive === false) {
    return { error: "Invalid coupon code" };
  }

  const scheduleError = validateCouponSchedule(coupon.startDate, coupon.expiryDate);
  if (scheduleError) {
    return scheduleError;
  }

  if (Number(coupon.minCartValue) > total) {
    return { error: `Minimum cart value for this coupon is ${Number(coupon.minCartValue).toFixed(2)}` };
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { error: "Coupon usage limit has been reached" };
  }

  const existingRedemption = await db.query.couponRedemptions.findFirst({
    where: and(
      eq(couponRedemptions.couponId, coupon.id),
      eq(couponRedemptions.userId, userId)
    ),
  });

  if (existingRedemption) {
    return { error: "This coupon cannot be used again" };
  }

  const { items: matchingItems } = getMatchingItemsTotal(items, coupon.scope);

  if (matchingItems.length === 0 && ["Ad Slots", "Featured Script Slots", "Props"].includes(coupon.scope)) {
    return { error: `This coupon is only valid for items of type "${coupon.scope}"` };
  }

  // MONEY-SAFETY: a plain creator's coupon only discounts their own props.
  const eligibleItems = await filterItemsToCouponOwner(matchingItems, coupon);

  if (eligibleItems.length === 0) {
    return { error: "This coupon does not apply to any items in your cart" };
  }

  const eligibleTotal = eligibleItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  return {
    coupon,
    discountAmount: calculateDiscount(eligibleTotal, coupon),
  };
}
