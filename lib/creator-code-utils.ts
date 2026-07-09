// Creator code validation + discount/commission math. Mirrors
// lib/cart-checkout-utils.ts's coupon validation, but storewide (no
// scope/ownership filtering — a creator code applies to the whole cart,
// since it's affiliate marketing, not a "discount your own product" tool).
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { creatorCodes, creatorCodeRedemptions } from "@/lib/db/schema";

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

  // A buyer can't use the same code twice (matches coupon's one-use-per-buyer rule).
  const existingRedemption = await db.query.creatorCodeRedemptions.findFirst({
    where: and(
      eq(creatorCodeRedemptions.creatorCodeId, creatorCode.id),
      eq(creatorCodeRedemptions.userId, userId)
    ),
  });
  if (existingRedemption) {
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
