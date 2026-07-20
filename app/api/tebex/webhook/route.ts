import { type NextRequest, NextResponse } from "next/server";
import { verifyTebexWebhook, type TebexWebhookPayload } from "@/lib/tebex";
import { db } from "@/lib/db/client";
import { tebexOrders, orders, orderItems, carts, cartItems, userAdSlots, userFeaturedScriptSlots, coupons, couponRedemptions } from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createAdSlots, createFeaturedScriptSlots, activateSideBanner, extendSlotsForRecurring, endRecurringSlots } from "@/lib/database-new";
import { sideBannerBookings } from "@/lib/db/schema";

function generateNumericId() {
  // Full 32-bit-safe random (id column is a 32-bit int). The old
  // floor(Date.now()/1000)+rand(0..9999) collided for multiple rows created in
  // the same second (only the tiny random term differed) → duplicate-PK 500s
  // on multi-item carts, which forced a webhook retry that double-provisioned.
  return Math.floor(Math.random() * 2_000_000_000);
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
      console.error("Tebex webhook: provisionCart item failed", { orderRef, index, item, error });
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

/**
 * Atomically transition an order to `to` ONLY if its current status is one of
 * `fromAny` — e.g. "refunded" only from "completed"/"pending", never from
 * "refunded" again. Returns the updated row if the transition happened, or
 * null if another status already won (already-terminal, or a concurrent
 * request got there first). This is a single conditional UPDATE, not a
 * read-then-write, so two near-simultaneous webhook deliveries for the same
 * reversal can't both "win" and both run side effects (e.g. both restoring a
 * coupon use for one real refund).
 */
async function transitionOrderStatus(
  orderId: string,
  to: "completed" | "declined" | "refunded",
  fromAny: Array<"pending" | "completed" | "declined" | "refunded">,
  extra?: { transactionId?: string; amount?: string | null }
) {
  const setValues: Record<string, unknown> = { status: to, updatedAt: new Date() };
  if (extra?.transactionId) setValues.tebexTransactionId = extra.transactionId;
  if (extra?.amount != null) setValues.amount = extra.amount;
  const rows = await db
    .update(tebexOrders)
    .set(setValues)
    .where(and(eq(tebexOrders.id, orderId), inArray(tebexOrders.status, fromAny)))
    .returning();
  return rows[0] ?? null;
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
 * Fallback matcher. Tebex's `payment.completed` subject carries NO basket ident,
 * and our order's transaction id is null until this very event — so basket/txn
 * matching can't link the payment to its order. Instead match on the stable id
 * inside the `custom` we set on the basket (Tebex echoes it back on the subject
 * as `subject.custom`): bookingId for side banners, fivecruxOrderId for carts.
 */
async function findOrderByCustom(custom: any) {
  if (!custom || typeof custom !== "object") return null;
  if (custom.bookingId != null) {
    const rows = await db.select().from(tebexOrders)
      .where(sql`${tebexOrders.custom}->>'bookingId' = ${String(custom.bookingId)}`).limit(1);
    if (rows[0]) return rows[0];
  }
  if (custom.fivecruxOrderId != null) {
    const rows = await db.select().from(tebexOrders)
      .where(sql`${tebexOrders.custom}->>'fivecruxOrderId' = ${String(custom.fivecruxOrderId)}`).limit(1);
    if (rows[0]) return rows[0];
  }
  return null;
}

/** Parse a tebex_orders `custom` value regardless of whether it came back as a JSON string or already-parsed object. */
function parseCustom(custom: unknown): Record<string, any> | null {
  if (typeof custom === "string") {
    try {
      return JSON.parse(custom);
    } catch {
      return null;
    }
  }
  return (custom as Record<string, any>) ?? null;
}

/**
 * Restore coupon usage + mark the FiveCrux order failed for a cart order that
 * will never be paid (refunded/charged-back, OR declined). Idempotent-ish: if
 * the order's already 'failed' this still re-decrements usedCount, so callers
 * must only invoke this ONCE per real payment failure (guarded by the atomic
 * tebex_orders status transition in the caller, not by this function itself).
 */
async function restoreCouponForFiveCruxOrder(fivecruxOrderId: number): Promise<void> {
  const fcOrder = await db.query.orders.findFirst({ where: eq(orders.id, fivecruxOrderId) });
  if (!fcOrder || fcOrder.status === "failed") return; // already handled — don't double-decrement
  // orders.status enum has no 'refunded' → 'failed' marks it no-longer-valid.
  await db.update(orders).set({ status: "failed", updatedAt: new Date() }).where(eq(orders.id, fivecruxOrderId));
  if (fcOrder.couponId != null) {
    await db.update(coupons).set({ usedCount: sql`GREATEST(${coupons.usedCount} - 1, 0)`, updatedAt: new Date() }).where(eq(coupons.id, fcOrder.couponId));
    await db.delete(couponRedemptions).where(eq(couponRedemptions.orderId, fivecruxOrderId));
  }
}

/**
 * Revoke a refunded/charged-back platform order: deactivate the ad/featured slots
 * it provisioned, restore any coupon usage. Keyed on the Tebex order id (= the
 * order-reference stored on each slot). Does NOT touch tebex_orders.status —
 * the caller transitions that atomically so two concurrent reversal events for
 * the same order can't both run this and double-restore the coupon.
 */
async function revokeForOrder(order: { id: string; custom: unknown }): Promise<void> {
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

    // Side banner booking (from /api/side-banners/checkout): activate the
    // reserved scarce slot. The overselling lock may reject it (rare) → flag refund.
    if (meta.kind === "side_banner" && meta.bookingId != null) {
      const res = await activateSideBanner(Number(meta.bookingId), fallbackOrderId);
      if (res.needsRefund) {
        console.error("Tebex webhook: side-banner slot was taken; REFUND needed for booking", meta.bookingId);
      }
      return { provisioned: res.activated };
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
        const payloadCustom = (payload.subject as any)?.custom;
        // Tebex payment.completed has no basket ident + our order's txn is still
        // null → basket/txn matching fails. Fall back to the custom we set on the
        // basket (echoed back as subject.custom).
        let existing = await findOrderByIdents(ids);
        if (!existing) existing = await findOrderByCustom(payloadCustom);

        // C3: webhook may arrive before our tebex_orders row is committed (the
        // basket round-trip is slow). Returning 200 here would make Tebex stop
        // retrying and we'd lose provisioning forever — so 500 to force a retry.
        if (!existing) {
          console.warn("Tebex webhook: payment.completed with no matching order yet (will retry)", ids);
          return NextResponse.json({ error: "order_not_found_yet" }, { status: 500 });
        }

        // C2 idempotency: a replayed/duplicate completed event for an order we've
        // already completed must NOT provision again. Also treat "refunded" as
        // terminal — a late/duplicate/replayed payment.completed for an order
        // that was already refunded must NEVER re-provision the entitlement
        // and silently flip the order back to "completed" (this previously
        // happened: nothing blocked it once the refund's own status check
        // passed, effectively un-refunding a chargeback).
        if (existing.status === "completed" || existing.status === "refunded") {
          return NextResponse.json({ ok: true, idempotent: true, status: existing.status });
        }

        // Provision BEFORE marking completed, so a duplicate that arrives after
        // is short-circuited by the check above (not re-provisioned).
        if (existing.kind === "platform_fee") {
          const result = await provisionPlatformFee(existing, payloadCustom, existing.id);
          if (!result.provisioned) {
            // CRITICAL: do NOT mark the order completed here. The customer was
            // charged but got no slot — if we stamped "completed" anyway, the
            // idempotency check above would permanently block every future
            // retry from ever provisioning it. Returning 500 makes Tebex retry
            // delivery (the order stays "pending" so a later attempt — after a
            // transient DB blip clears, or once someone fixes a bad package
            // mapping — can still succeed).
            console.error("Tebex webhook: platform_fee completed but NOT provisioned — leaving order pending for retry:", { orderId: existing.id, reason: result.reason });
            return NextResponse.json({ error: "provisioning_failed", reason: result.reason }, { status: 500 });
          }
        }
        // For kind === 'seller_product' the seller's store fulfills; we only track status.
        // Match by the KNOWN basket ident of the found order (+ record the txn id).
        await updateOrderStatus("completed", { basketIdent: existing.basketIdent, transactionId: ids.transactionId, amount: ids.amount });
        return NextResponse.json({ ok: true });
      }

      case "payment.declined": {
        const ids = extractIdentifiers(payload.subject);
        let existing = await findOrderByIdents(ids);
        if (!existing) existing = await findOrderByCustom((payload.subject as any)?.custom);
        if (!existing) {
          await updateOrderStatus("declined", ids); // best-effort, nothing to restore
          return NextResponse.json({ ok: true });
        }
        // Only downgrade a still-pending order. A stray/duplicate/out-of-order
        // "declined" for an order that has since actually completed or been
        // refunded must NOT overwrite that status (previously this was an
        // unconditional UPDATE with no WHERE-status guard, so a late "declined"
        // could corrupt a completed order's status and cause a legitimate
        // later payment.completed replay to re-provision it a second time).
        const transitioned = await transitionOrderStatus(existing.id, "declined", ["pending"], {
          transactionId: ids.transactionId,
          amount: ids.amount,
        });
        if (transitioned) {
          // Restore whatever this decline consumed: coupon usage (cart orders)
          // and the side-banner reservation (so the position is bookable again
          // immediately instead of waiting out the hold's natural expiry).
          const meta = parseCustom(existing.custom);
          if (meta?.fivecruxOrderId != null) {
            await restoreCouponForFiveCruxOrder(Number(meta.fivecruxOrderId)).catch((e) =>
              console.error("Tebex webhook: coupon restore on decline failed", existing!.id, e)
            );
          }
          if (meta?.kind === "side_banner" && meta.bookingId != null) {
            await db.update(sideBannerBookings).set({ status: "cancelled", updatedAt: new Date() }).where(eq(sideBannerBookings.id, Number(meta.bookingId)));
          }
        }
        return NextResponse.json({ ok: true });
      }

      case "payment.refunded":
      case "payment.chargeback": {
        const ids = extractIdentifiers(payload.subject);
        let existing = await findOrderByIdents(ids);
        if (!existing) existing = await findOrderByCustom((payload.subject as any)?.custom);
        if (existing) {
          // Atomic conditional transition: only ONE concurrent delivery of a
          // refund/chargeback for the same order can win this (WHERE status !=
          // 'refunded'), so revokeForOrder — including the coupon-usage
          // restore — runs exactly once per real reversal, not once per
          // duplicate webhook delivery.
          const transitioned = await transitionOrderStatus(existing.id, "refunded", ["pending", "completed", "declined"], {
            transactionId: ids.transactionId,
            amount: ids.amount,
          });
          if (transitioned) {
            await revokeForOrder(existing);
          }
        }
        return NextResponse.json({ ok: true });
      }

      // ── Recurring (subscription) events. Fully dynamic: any package the
      // seller marks recurring in Tebex arrives here; we keep its slot(s) alive
      // until the next payment, and stop them when the subscription ends. The
      // slot(s) are matched by the ORIGINAL order reference carried on the
      // recurring payment's initial_payment (basket ident / transaction id).
      case "recurring-payment.started":
      case "recurring-payment.renewed": {
        const subj = payload.subject as any;
        const recCustom = (subj?.initial_payment as any)?.custom ?? (subj?.last_payment as any)?.custom ?? subj?.custom;
        const ids = extractIdentifiers(subj?.initial_payment ?? subj?.last_payment ?? subj);
        let existing = await findOrderByIdents(ids);
        if (!existing) existing = await findOrderByCustom(recCustom);
        if (!existing) {
          // Original order row may not be committed yet → force a Tebex retry.
          console.warn("Tebex webhook: recurring event with no matching order yet (will retry)", payload.type, ids);
          return NextResponse.json({ error: "order_not_found_yet" }, { status: 500 });
        }

        // A subscription already refunded/charged-back must never be resurrected
        // by a late/duplicate/replayed recurring event — neither (re-)provisioned
        // nor extended.
        if (existing.status === "refunded") {
          return NextResponse.json({ ok: true, idempotent: true, status: "refunded" });
        }

        // First charge: provision exactly once. Idempotent via the order status,
        // so this is safe even if a payment.completed for the same charge also fires.
        if (payload.type === "recurring-payment.started" && existing.status !== "completed") {
          if (existing.kind === "platform_fee") {
            const result = await provisionPlatformFee(existing, recCustom, existing.id);
            if (!result.provisioned) {
              // Same reasoning as payment.completed: never stamp "completed" on a
              // failed provision, or the idempotency check locks out every retry.
              console.error("Tebex webhook: recurring-payment.started completed but NOT provisioned — leaving order pending for retry:", { orderId: existing.id, reason: result.reason });
              return NextResponse.json({ error: "provisioning_failed", reason: result.reason }, { status: 500 });
            }
          }
          await updateOrderStatus("completed", { basketIdent: existing.basketIdent, transactionId: ids.transactionId, amount: ids.amount });
        }

        // Keep the slot(s) live until Tebex's next scheduled payment.
        const nextAt = subj?.next_payment_at ? new Date(subj.next_payment_at) : null;
        if (nextAt && !isNaN(nextAt.getTime())) {
          await extendSlotsForRecurring(existing.id, nextAt);
        }
        return NextResponse.json({ ok: true, type: payload.type });
      }

      case "recurring-payment.ended": {
        const subj = payload.subject as any;
        const endCustom = (subj?.initial_payment as any)?.custom ?? subj?.custom;
        let existing = await findOrderByIdents(extractIdentifiers(subj?.initial_payment ?? subj));
        if (!existing) existing = await findOrderByCustom(endCustom);
        if (existing) await endRecurringSlots(existing.id);
        return NextResponse.json({ ok: true });
      }

      case "recurring-payment.cancellation.requested":
      case "recurring-payment.cancellation.aborted":
        // Slot stays live until the period ends (a recurring-payment.ended will
        // follow). Nothing to change now — just acknowledge.
        return NextResponse.json({ ok: true, noted: payload.type });

      default:
        // Acknowledge unknown but signature-valid events so Tebex stops retrying.
        return NextResponse.json({ ok: true, ignored: payload.type });
    }
  } catch (error) {
    console.error("Tebex webhook handler error:", error);
    // 500, not 200: this event was verified but NOT successfully handled (it
    // threw before reaching any `return`). A 200 here previously told Tebex
    // "all good" — which meant it would never retry, and a transient error
    // (a DB blip, an unexpected payload shape) silently ate a real payment
    // event forever. Returning 500 lets Tebex's retry mechanism try again.
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }
}
