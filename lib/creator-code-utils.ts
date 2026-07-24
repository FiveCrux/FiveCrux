// Creator code validation + discount/commission math. Mirrors
// lib/cart-checkout-utils.ts's coupon validation, but storewide (no
// scope/ownership filtering — a creator code applies to the whole cart,
// since it's affiliate marketing, not a "discount your own product" tool).
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { creatorCodes, creatorCodeRedemptions, orders } from "@/lib/db/schema";

type CreatorCodeRow = typeof creatorCodes.$inferSelect;

function calculateAmount(base: number, type: string, value: number) {
  if (String(type).toLowerCase() === "percentage") {
    return Math.min(base, (base * value) / 100);
  }
  return Math.min(base, value);
}

export async function validateCreatorCode(rawCode: string, userId: string, cartTotal: number) {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;

  const creatorCode = await db.query.creatorCodes.findFirst({
    where: eq(creatorCodes.code, code),
  });

  if (!creatorCode || creatorCode.isActive === false) {
    return { error: "Invalid creator code" };
  }

  // A buyer can't use the same code twice — but only a PAID redemption counts.
  // Redemptions are written at checkout START (order still pending); an
  // abandoned/failed checkout must NOT permanently burn the buyer's one use.
  const paidRedemption = await db
    .select({ id: creatorCodeRedemptions.id })
    .from(creatorCodeRedemptions)
    .innerJoin(orders, eq(orders.id, creatorCodeRedemptions.orderId))
    .where(
      and(
        eq(creatorCodeRedemptions.creatorCodeId, creatorCode.id),
        eq(creatorCodeRedemptions.userId, userId),
        eq(orders.status, "paid")
      )
    )
    .limit(1);
  if (paidRedemption.length > 0) {
    return { error: "This creator code cannot be used again" };
  }

  const discountAmount = calculateAmount(cartTotal, creatorCode.discountType, Number(creatorCode.discountValue));
  // Commission is computed off the amount the buyer actually pays (post-discount) —
  // the creator earns a cut of REAL revenue, not of the discount they granted away.
  const payable = Math.max(0, cartTotal - discountAmount);
  const commissionAmount = calculateAmount(payable, creatorCode.commissionType, Number(creatorCode.commissionValue));

  return { creatorCode, discountAmount, commissionAmount };
}

export type { CreatorCodeRow };
