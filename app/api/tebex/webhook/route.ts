import { type NextRequest, NextResponse } from "next/server";
import { verifyTebexWebhook, type TebexWebhookPayload } from "@/lib/tebex";
import { db } from "@/lib/db/client";
import { tebexOrders, orders, orderItems, carts, cartItems, userAdSlots, userFeaturedScriptSlots, coupons, couponRedemptions } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { createAdSlots, createFeaturedScriptSlots } from "@/lib/database-new";

function generateNumericId() {
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
}

/** Provision ONE platform entitlement (ad slots or featured-script slots). */
async function provisionEntitlement(
  userId: string,
  meta: { packageType?: string; packageId?: string; slotsToAdd?: unknown; slotsPerMonth?: unknown; durationMonths?: unknown; durationWeeks?: unknown },
  orderRef: string
): Promise<boolean> {
  const packageId = meta.packageId;
  if (!packageId) return false;
  const slotsToAdd = Number(meta.slotsToAdd ?? meta.slotsPerMonth ?? 1) || 1;
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
 * Provision a whole-cart Tebex order (custom.kind === 'platform_cart'): provision
 * every item, populate order_items, mark the FiveCrux order paid, and clear the
 * cart — mirroring app/api/cart/capture/route.ts. Idempotent against webhook
 * retries via the FiveCrux order status.
 */
async function provisionCart(
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
  for (const item of items) {
    await provisionEntitlement(userId, item, orderRef);
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

/**
 * POST /api/tebex/webhook
 *
 * Tebex webhook receiver. Verifies the `X-Signature` header against the RAW
 * request body, echoes the `validation.webhook` handshake, and reconciles
 * payment events into the `tebex_orders` table.
 *
 * IMPORTANT: the signature is computed over the raw bytes, so we read the body
 * with `req.text()` and never parse-then-reserialize before verifying.
 */

// Ensure this route always runs on the Node.js runtime (crypto) and is never
// statically optimized — every request must hit the handler.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pull a usable basket ident / transaction id out of the webhook subject. */
function extractIdentifiers(subject: any): {
  basketIdent?: string;
  transactionId?: string;
  amount?: string | null;
} {
  if (!subject || typeof subject !== "object") return {};
  const transactionId =
    subject.transaction_id ?? subject.id ?? subject.txn_id ?? undefined;
  // Tebex payment subjects commonly nest the basket under `products`/`basket`.
  const basketIdent =
    subject.basket_ident ??
    subject.basket?.ident ??
    subject.ident ??
    undefined;
  const amount =
    subject.price?.amount != null
      ? String(subject.price.amount)
      : subject.amount != null
        ? String(subject.amount)
        : null;
  return {
    basketIdent: basketIdent ? String(basketIdent) : undefined,
    transactionId: transactionId ? String(transactionId) : undefined,
    amount,
  };
}

/** Update a matching tebex_orders row to the given status. */
async function updateOrderStatus(
  status: "completed" | "declined" | "refunded",
  ids: { basketIdent?: string; transactionId?: string; amount?: string | null }
) {
  if (!ids.basketIdent && !ids.transactionId) {
    console.warn("Tebex webhook: no basketIdent/transactionId to match an order");
    return null;
  }

  const setValues: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };
  if (ids.transactionId) setValues.tebexTransactionId = ids.transactionId;
  if (ids.amount != null) setValues.amount = ids.amount;

  // Prefer matching by basket ident (we always store it on create); fall back
  // to the transaction id for events that omit the basket reference.
  if (ids.basketIdent) {
    const rows = await db
      .update(tebexOrders)
      .set(setValues)
      .where(eq(tebexOrders.basketIdent, ids.basketIdent))
      .returning();
    if (rows.length > 0) return rows;
  }
  if (ids.transactionId) {
    const rows = await db
      .update(tebexOrders)
      .set(setValues)
      .where(eq(tebexOrders.tebexTransactionId, ids.transactionId))
      .returning();
    if (rows.length > 0) return rows;
  }
  console.warn("Tebex webhook: no matching tebex_orders row for", ids);
  return null;
}

/** Read-only: find the tebex_orders row for these identifiers (no mutation). */
async function findOrderByIdents(ids: { basketIdent?: string; transactionId?: string }) {
  if (ids.basketIdent) {
    const r = await db.query.tebexOrders.findFirst({ where: eq(tebexOrders.basketIdent, ids.basketIdent) });
    if (r) return r;
  }
  if (ids.transactionId) {
    const r = await db.query.tebexOrders.findFirst({ where: eq(tebexOrders.tebexTransactionId, ids.transactionId) });
    if (r) return r;
  }
  return null;
}

/**
 * Revoke a refunded/charged-back platform order: deactivate the ad/featured slots
 * it provisioned, flip the FiveCrux order to 'refunded', and restore any coupon
 * usage. Keyed on the Tebex order id (= the order-reference stored on each slot).
 */
async function revokeForOrder(order: { id: string; custom: unknown }): Promise<void> {
  try {
    // 1. Deactivate slots provisioned under this order reference.
    await db.update(userAdSlots).set({ status: "inactive" }).where(eq(userAdSlots.paypalOrderId, order.id));
    await db.update(userFeaturedScriptSlots).set({ featuredSlotStatus: "inactive" }).where(eq(userFeaturedScriptSlots.featuredPaypalOrderId, order.id));

    // 2. Cart orders carry a fivecruxOrderId in custom → flip it + restore coupon.
    const meta = typeof order.custom === "string"
      ? (() => { try { return JSON.parse(order.custom as string) } catch { return null } })()
      : (order.custom as any);
    const fivecruxOrderId = meta?.fivecruxOrderId;
    if (fivecruxOrderId != null) {
      const fcOrder = await db.query.orders.findFirst({ where: eq(orders.id, Number(fivecruxOrderId)) });
      // orders.status enum has no 'refunded' → 'failed' marks it no-longer-valid.
      await db.update(orders).set({ status: "failed", updatedAt: new Date() }).where(eq(orders.id, Number(fivecruxOrderId)));
      if (fcOrder?.couponId != null) {
        await db.update(coupons).set({ usedCount: sql`GREATEST(${coupons.usedCount} - 1, 0)`, updatedAt: new Date() }).where(eq(coupons.id, fcOrder.couponId));
        await db.delete(couponRedemptions).where(eq(couponRedemptions.orderId, Number(fivecruxOrderId)));
      }
    }
  } catch (e) {
    console.error("Tebex webhook: revoke failed for order", order.id, e);
  }
}

/**
 * Provision a completed platform-fee purchase, MIRRORING the entitlement logic
 * in app/api/cart/capture/route.ts (createAdSlots / createFeaturedScriptSlots).
 *
 * The provisioning details come from the order's stored `custom` JSON, falling
 * back to the webhook payload's `custom` field (Tebex echoes the basket custom
 * back on the payment subject). Expected shape (set by the platform-basket
 * route):
 *   {
 *     userId, packageType: 'ads' | 'featured-scripts',
 *     packageId, slotsToAdd, durationMonths?, durationWeeks?
 *   }
 *
 * Resilient by design: never throws to the caller — logs and returns a result
 * flag so the webhook still returns 200 and Tebex stops retrying.
 */
async function provisionPlatformFee(
  order: { id: string; userId: string | null; custom: unknown },
  payloadCustom: unknown,
  fallbackOrderId: string
): Promise<{ provisioned: boolean; reason?: string }> {
  try {
    // Normalize custom from either source (order row preferred, then payload).
    const parse = (v: unknown): Record<string, any> | null => {
      if (!v) return null;
      if (typeof v === "string") {
        try {
          return JSON.parse(v);
        } catch {
          return null;
        }
      }
      if (typeof v === "object") return v as Record<string, any>;
      return null;
    };

    const meta = parse(order.custom) ?? parse(payloadCustom);
    if (!meta) {
      console.warn("Tebex webhook: platform_fee order has no usable custom metadata", order.id);
      return { provisioned: false, reason: "no_custom_metadata" };
    }

    // userId: prefer the value persisted on the order row, then custom.
    const userId: string | undefined =
      order.userId ?? (typeof meta.userId === "string" ? meta.userId : undefined);
    if (!userId) {
      console.warn("Tebex webhook: platform_fee order missing userId", order.id);
      return { provisioned: false, reason: "missing_user" };
    }

    // Whole-cart order (from /api/cart/tebex-checkout): provision every item +
    // complete the FiveCrux order + clear the cart.
    if (Array.isArray(meta.items)) {
      return await provisionCart(meta, userId, fallbackOrderId);
    }

    const packageType: string | undefined = meta.packageType;
    const packageId: string | undefined = meta.packageId;
    const slotsToAdd: number = Number(meta.slotsToAdd ?? meta.slotsPerMonth ?? 1) || 1;
    const durationMonths: number = Number(meta.durationMonths ?? 1) || 1;
    const durationWeeks: number | undefined =
      meta.durationWeeks != null ? Number(meta.durationWeeks) : undefined;

    if (!packageId) {
      console.warn("Tebex webhook: platform_fee order missing packageId", order.id);
      return { provisioned: false, reason: "missing_package" };
    }

    // Mirror cart/capture: createAdSlots / createFeaturedScriptSlots expect one
    // order-reference id per slot — here the Tebex order id (basket-backed).
    const orderRefIds = Array(slotsToAdd).fill(fallbackOrderId);

    if (packageType === "ads") {
      await createAdSlots(userId, slotsToAdd, orderRefIds, packageId, durationMonths);
      return { provisioned: true };
    } else if (packageType === "featured-scripts") {
      await createFeaturedScriptSlots(
        userId,
        slotsToAdd,
        orderRefIds,
        packageId,
        0,
        durationWeeks
      );
      return { provisioned: true };
    }

    console.warn("Tebex webhook: unknown platform_fee packageType", packageType);
    return { provisioned: false, reason: "unknown_package_type" };
  } catch (error) {
    console.error("Tebex webhook: platform-fee provisioning failed:", error);
    return { provisioned: false, reason: "provisioning_error" };
  }
}

export async function POST(request: NextRequest) {
  // 1. Read the RAW body (required for signature verification).
  const rawBody = await request.text();

  // 2. Parse first so we can answer the validation handshake. Tebex sends a
  // `validation.webhook` event when an endpoint is created/edited and expects
  // the `id` echoed back to confirm reachability. We handle it BEFORE signature
  // verification: it performs no action and reveals nothing, so it's safe — and
  // this makes endpoint validation succeed reliably (even before the secret is
  // configured on the server).
  let payload: TebexWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as TebexWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (payload.type === "validation.webhook") {
    return NextResponse.json({ id: payload.id });
  }

  // 3. Every real event MUST have a valid signature.
  const signature = request.headers.get("x-signature");
  const valid = verifyTebexWebhook(rawBody, signature, process.env.TEBEX_WEBHOOK_SECRET);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    switch (payload.type) {
      case "payment.completed": {
        const ids = extractIdentifiers(payload.subject);
        const existing = await findOrderByIdents(ids);

        // C3: webhook may arrive before our tebex_orders row is committed (the
        // basket round-trip is slow). Returning 200 here would make Tebex stop
        // retrying and we'd lose provisioning forever — so 500 to force a retry.
        if (!existing) {
          console.warn("Tebex webhook: payment.completed with no matching order yet (will retry)", ids);
          return NextResponse.json({ error: "order_not_found_yet" }, { status: 500 });
        }

        // C2 idempotency: a replayed/duplicate completed event for an order we've
        // already completed must NOT provision again.
        if (existing.status === "completed") {
          return NextResponse.json({ ok: true, idempotent: true });
        }

        // Provision BEFORE marking completed, so a duplicate that arrives after
        // is short-circuited by the check above (not re-provisioned).
        if (existing.kind === "platform_fee") {
          const payloadCustom = (payload.subject as any)?.custom;
          const result = await provisionPlatformFee(existing, payloadCustom, existing.id);
          if (!result.provisioned) {
            console.warn("Tebex webhook: platform_fee completed but NOT provisioned:", { orderId: existing.id, reason: result.reason });
          }
        }
        // For kind === 'seller_product' the seller's store fulfills; we only track status.
        await updateOrderStatus("completed", ids);
        return NextResponse.json({ ok: true });
      }

      case "payment.declined": {
        await updateOrderStatus("declined", extractIdentifiers(payload.subject));
        return NextResponse.json({ ok: true });
      }

      case "payment.refunded":
      case "payment.chargeback": {
        const ids = extractIdentifiers(payload.subject);
        const existing = await findOrderByIdents(ids);
        // C1: revoke entitlements + restore coupon, then mark refunded. Idempotent
        // (skip if already refunded).
        if (existing && existing.status !== "refunded") {
          await revokeForOrder(existing);
          await updateOrderStatus("refunded", ids);
        }
        return NextResponse.json({ ok: true });
      }

      default:
        // Acknowledge unknown but signature-valid events so Tebex stops retrying.
        return NextResponse.json({ ok: true, ignored: payload.type });
    }
  } catch (error) {
    console.error("Tebex webhook handler error:", error);
    // Still return 200 so Tebex does not hammer us with retries for a
    // transient DB error on an already-verified event; surface in logs.
    return NextResponse.json({ ok: true, error: "handler_error" });
  }
}
