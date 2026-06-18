import { type NextRequest, NextResponse } from "next/server";
import { verifyTebexWebhook, type TebexWebhookPayload } from "@/lib/tebex";
import { db } from "@/lib/db/client";
import { tebexOrders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

        // TODO(platform provisioning): when the matched order has
        // kind === 'platform_fee', provision the purchased entitlements here,
        // mirroring app/api/cart/capture/route.ts:
        //   - parse the order's `custom` for { packageType, packageId,
        //     slotsToAdd, durationMonths | durationWeeks, userId }
        //   - call createAdSlots(...) for ads
        //   - call createFeaturedScriptSlots(...) for featured scripts
        // For kind === 'seller_product', the buyer is fulfilled by the
        // seller's own Tebex store; we only need to mark the order completed.
        if (updated && updated[0]?.kind === "platform_fee") {
          // Provisioning intentionally left as a TODO for the wiring phase.
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
