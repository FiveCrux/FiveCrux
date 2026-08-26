import { eq, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import {
  users,
  orders,
  orderItems,
  carts,
  cartItems,
  userAdSlots,
  userFeaturedScriptSlots,
  coupons,
  couponRedemptions,
  creatorCodes,
  creatorCodeRedemptions,
  sideBannerBookings,
} from "@/lib/db/schema"
import { createAdSlots, createFeaturedScriptSlots } from "@/lib/database-new"
import { slotsForCartLine } from "@/lib/slot-count"

/**
 * Entitlement provisioning, shared by every payment rail.
 *
 * This logic used to live inside the Tebex webhook. It was lifted out verbatim
 * — not rewritten — when PayPal was added, because it is the part that actually
 * grants what people paid for (ad slots, featured-script slots, side banners)
 * and reverses it on refund. A payment provider change should swap the TRIGGER,
 * never this.
 *
 * Everything here is idempotent: providers retry webhooks, and a retry must
 * never provision twice.
 */

/** Order references arrive as strings from PayPal and numbers from Tebex. */
export type OrderRef = string


/** Provider `custom` payloads arrive as an object or a JSON string. */
export function parseCustom(custom: unknown): Record<string, any> | null {
  if (!custom) return null
  if (typeof custom === "object" && !Array.isArray(custom)) return custom as Record<string, any>
  if (typeof custom === "string") {
    try {
      const parsed = JSON.parse(custom)
      return parsed && typeof parsed === "object" ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

export function generateNumericId() {
  // Full 32-bit-safe random (id column is a 32-bit int). The old
  // floor(Date.now()/1000)+rand(0..9999) collided for multiple rows created in
  // the same second (only the tiny random term differed) → duplicate-PK 500s
  // on multi-item carts, which forced a webhook retry that double-provisioned.
  return Math.floor(Math.random() * 2_000_000_000);
}

/** Provision ONE platform entitlement (ad slots or featured-script slots). */
export async function provisionEntitlement(
  userId: string,
  meta: { packageType?: string; packageId?: string; slotsToAdd?: unknown; slotsPerMonth?: unknown; durationMonths?: unknown; durationWeeks?: unknown; quantity?: unknown },
  orderRef: string
): Promise<boolean> {
  const packageId = meta.packageId;
  if (!packageId) return false;
  const slotsToAdd = slotsForCartLine(meta);
  const durationMonths = Number(meta.durationMonths ?? 1) || 1;
  const durationWeeks = meta.durationWeeks != null ? Number(meta.durationWeeks) : undefined;
  const orderRefIds = Array(slotsToAdd).fill(orderRef);
  if (meta.packageType === "ads") {
    await createAdSlots(userId, slotsToAdd, orderRefIds, packageId, durationMonths);
    return true;
  }
  if (meta.packageType === "featured-scripts") {
    await createFeaturedScriptSlots(userId, slotsToAdd, orderRefIds, packageId, 0, durationWeeks);
    return true;
  }
  return false;
}

/**
 * Provision a whole-cart platform order (custom.kind === 'platform_cart'): provision
 * every item, populate order_items, mark the FiveCrux order paid, and clear the
 * cart — mirroring app/api/cart/capture/route.ts. Idempotent against webhook
 * retries via the FiveCrux order status.
 */
export async function provisionCart(
  meta: Record<string, any>,
  userId: string,
  orderRef: string
): Promise<{ provisioned: boolean; reason?: string }> {
  const fivecruxOrderId = meta.fivecruxOrderId;
  const cartId = meta.cartId;
  const items: any[] = Array.isArray(meta.items) ? meta.items : [];
  if (items.length === 0) return { provisioned: false, reason: "no_items" };

  // Idempotency (cart-level): if this cart was already completed, the entitlements
  // were already provisioned (Tebex retry, or a second basket for the same cart) —
  // do nothing. Prevents double-provisioning.
  if (cartId != null) {
    const existingCart = await db.query.carts.findFirst({ where: eq(carts.id, Number(cartId)) });
    if (existingCart && existingCart.status === "completed") {
      return { provisioned: true };
    }
  }

  // Idempotency (order-level): if the FiveCrux order is already paid AND has
  // order_items, this event was already processed — do nothing.
  if (fivecruxOrderId != null) {
    const dbOrder = await db.query.orders.findFirst({ where: eq(orders.id, Number(fivecruxOrderId)) });
    const existing = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, Number(fivecruxOrderId)), limit: 1 });
    if (dbOrder?.status === "paid" && existing.length > 0) {
      return { provisioned: true };
    }
  }

  // 1. Provision each platform entitlement.
  // NOTE: not transactional — if item N throws after items 1..N-1 already
  // created real slots, the caller (provisionPlatformFee) reports the whole
  // cart unprovisioned and the webhook now leaves the order non-"completed"
  // so Tebex retries. A retry re-runs ALL items, so an already-succeeded
  // item could be provisioned twice. Rare (requires a multi-item cart where
  // one item fails) and low-harm (an extra slot, not a lost one) — flagged
  // here for future hardening (e.g. per-item idempotency keys) rather than
  // solved now, since the alternative failure mode (silently losing a paid
  // entitlement forever) is far worse.
  for (const [index, item] of items.entries()) {
    try {
      await provisionEntitlement(userId, item, orderRef);
    } catch (error) {
      console.error("[provisioning] provisionCart item failed", { orderRef, index, item, error });
      throw error;
    }
  }

  // 2. Populate order_items from the cart, mark order paid, clear the cart.
  if (cartId != null) {
    const cart = await db.query.carts.findFirst({ where: eq(carts.id, Number(cartId)), with: { items: true } });
    if (cart) {
      for (const ci of cart.items) {
        await db.insert(orderItems).values({
          id: generateNumericId(),
          orderId: Number(fivecruxOrderId),
          itemType: ci.itemType,
          itemId: ci.itemId,
          title: ci.title,
          price: ci.price,
          quantity: ci.quantity,
        });
      }
      await db.delete(cartItems).where(eq(cartItems.cartId, Number(cartId)));
      await db.update(carts).set({ status: "completed", updatedAt: new Date() }).where(eq(carts.id, Number(cartId)));
    }
  }
  if (fivecruxOrderId != null) {
    await db.update(orders).set({ status: "paid", updatedAt: new Date() }).where(eq(orders.id, Number(fivecruxOrderId)));
  }
  return { provisioned: true };
}

export async function restoreCouponForFiveCruxOrder(fivecruxOrderId: number): Promise<void> {
  const fcOrder = await db.query.orders.findFirst({ where: eq(orders.id, fivecruxOrderId) });
  if (!fcOrder || fcOrder.status === "failed") return; // already handled — don't double-decrement
  // orders.status enum has no 'refunded' → 'failed' marks it no-longer-valid.
  await db.update(orders).set({ status: "failed", updatedAt: new Date() }).where(eq(orders.id, fivecruxOrderId));
  if (fcOrder.couponId != null) {
    await db.update(coupons).set({ usedCount: sql`GREATEST(${coupons.usedCount} - 1, 0)`, updatedAt: new Date() }).where(eq(coupons.id, fcOrder.couponId));
    await db.delete(couponRedemptions).where(eq(couponRedemptions.orderId, fivecruxOrderId));
  }
  // Reverse creator-code usage too. finalizeBasket books a redemption +
  // increments usedCount at checkout (on the still-pending order); if the
  // payment is declined/refunded/charged-back, that commission was booked on
  // money we never kept and a limited-use code stays burned. Undo both. Guarded
  // ONCE per real failure by the order's `status === "failed"` check above.
  const redemptions = await db.select().from(creatorCodeRedemptions).where(eq(creatorCodeRedemptions.orderId, fivecruxOrderId));
  for (const r of redemptions) {
    await db.update(creatorCodes).set({ usedCount: sql`GREATEST(${creatorCodes.usedCount} - 1, 0)`, updatedAt: new Date() }).where(eq(creatorCodes.id, r.creatorCodeId));
  }
  if (redemptions.length > 0) {
    await db.delete(creatorCodeRedemptions).where(eq(creatorCodeRedemptions.orderId, fivecruxOrderId));
  }
}

/**
 * Revoke a refunded/charged-back platform order: deactivate the ad/featured slots
 * it provisioned, restore any coupon usage. Keyed on the Tebex order id (= the
 * order-reference stored on each slot). Does NOT touch tebex_orders.status —
 * the caller transitions that atomically so two concurrent reversal events for
 * the same order can't both run this and double-restore the coupon.
 */
export async function revokeForOrder(order: { id: string; custom: unknown }): Promise<void> {
  try {
    // 1. Deactivate slots provisioned under this order reference.
    await db.update(userAdSlots).set({ status: "inactive" }).where(eq(userAdSlots.paypalOrderId, order.id));
    await db.update(userFeaturedScriptSlots).set({ featuredSlotStatus: "inactive" }).where(eq(userFeaturedScriptSlots.featuredPaypalOrderId, order.id));
    // Side banner booked under this order → free the position.
    await db.update(sideBannerBookings).set({ status: "cancelled", updatedAt: new Date() }).where(eq(sideBannerBookings.orderReference, order.id));

    // 2. Cart orders carry a fivecruxOrderId in custom → restore coupon usage.
    const meta = parseCustom(order.custom);
    const fivecruxOrderId = meta?.fivecruxOrderId;
    if (fivecruxOrderId != null) {
      await restoreCouponForFiveCruxOrder(Number(fivecruxOrderId));
    }
  } catch (e) {
    console.error("[provisioning] revoke failed for order", order.id, e);
  }
}

/**
 * Block an account after a payment reversal.
 *
 * The fraud this stops: buy, pay, file a chargeback — money back, goods kept —
 * then come back and do it again. Revoking the entitlement alone does not stop
 * the next attempt.
 *
 * The block is read-only, not a ban: the account can still sign in and browse,
 * it just cannot buy, submit, or enter anything.
 *
 * Never overwrites an existing block, so a second chargeback does not erase the
 * reason recorded for the first, and an admin's manual note is not clobbered.
 */
export async function blockUserForChargeback(
  userId: string | null | undefined,
  orderRef: string
): Promise<void> {
  if (!userId) return
  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { isBlocked: true },
    })
    if (existing?.isBlocked) return

    await db
      .update(users)
      .set({
        isBlocked: true,
        blockedReason: `Payment reversed on order ${orderRef}. Contact support to resolve.`,
        blockedSource: "chargeback",
        blockedAt: new Date(),
        blockedBy: "system",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    console.warn(`[provisioning] blocked ${userId} after reversal on ${orderRef}`)
  } catch (error) {
    // Never let this break reversal handling — the revoke matters more, and a
    // webhook that throws here would be retried forever.
    console.error("[provisioning] blockUserForChargeback failed:", userId, error)
  }
}
