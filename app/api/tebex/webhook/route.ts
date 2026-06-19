import { type NextRequest, NextResponse } from "next/server";
import { verifyTebexWebhook, type TebexWebhookPayload } from "@/lib/tebex";
import { db } from "@/lib/db/client";
import { tebexOrders, orders, orderItems, carts, cartItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

  // Idempotency: if the FiveCrux order is already paid AND has order_items, this
  // event was already processed (Tebex retry) — do nothing.
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
    // order-reference id per slot. PayPal used the PayPal order id; here we use
    // the Tebex order id (basket-backed) as the per-slot reference.
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
  const signature = request.headers.get("x-signature");

  // 2. Verify the signature against the raw body + webhook secret.
  const valid = verifyTebexWebhook(rawBody, signature, process.env.TEBEX_WEBHOOK_SECRET);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // 3. Parse the (now-verified) payload.
  let payload: TebexWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as TebexWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    switch (payload.type) {
      // Tebex sends this when an endpoint is created/edited. We must echo the
      // received `id` back so Tebex can confirm the endpoint is reachable.
      case "validation.webhook":
        return NextResponse.json({ id: payload.id });

      case "payment.completed": {
        const ids = extractIdentifiers(payload.subject);
        const updated = await updateOrderStatus("completed", ids);

        // When the matched order is a platform fee (ads / featured-script slots
        // bought through FiveCrux's own Tebex store), provision the entitlement
        // here, mirroring app/api/cart/capture/route.ts. For kind ===
        // 'seller_product' the buyer is fulfilled by the seller's own Tebex
        // store, so we only need the status update above.
        const order = updated?.[0];
        if (order && order.kind === "platform_fee") {
          // Tebex echoes the basket `custom` back on the payment subject; use it
          // as a fallback if the order row's custom is unavailable.
          const payloadCustom = (payload.subject as any)?.custom;
          const result = await provisionPlatformFee(order, payloadCustom, order.id);
          if (!result.provisioned) {
            console.warn(
              "Tebex webhook: platform_fee order marked completed but NOT provisioned:",
              { orderId: order.id, reason: result.reason }
            );
          }
        }

        return NextResponse.json({ ok: true });
      }

      case "payment.declined": {
        await updateOrderStatus("declined", extractIdentifiers(payload.subject));
        return NextResponse.json({ ok: true });
      }

      case "payment.refunded":
      case "payment.chargeback": {
        await updateOrderStatus("refunded", extractIdentifiers(payload.subject));
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
