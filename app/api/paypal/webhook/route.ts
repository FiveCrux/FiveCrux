import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { paypalOrders } from "@/lib/db/schema"
import { verifyPayPalWebhook } from "@/lib/paypal"
import {
  provisionCart,
  provisionEntitlement,
  revokeForOrder,
  parseCustom,
  blockUserForChargeback,
} from "@/lib/provisioning"
import { activateSideBanner } from "@/lib/database-new"

/**
 * POST /api/paypal/webhook
 *
 * The authority on payment state. Capture gives the buyer their entitlement
 * immediately; this reconciles what actually happened — including refunds and
 * reversals that arrive long after checkout.
 *
 * SECURITY: every payload is signature-verified before anything is read from
 * it. Without that this endpoint is a free "mark my order paid" button that
 * provisions paid ad slots to anyone who can POST.
 *
 * The signature is computed over the RAW bytes, so the body is read with
 * .text() and never parsed-then-reserialised before verification.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// PayPal retries on any non-2xx. Returning 200 for events we understand but
// cannot act on stops an endless retry loop; genuine failures return 5xx so a
// retry actually happens.
const OK = () => NextResponse.json({ received: true })


/**
 * Route a paid order to the right provisioning, by what the `custom` payload
 * says it was. All three are idempotent, so a webhook retry — or the capture
 * route having already run — is a no-op.
 *
 *   platform_cart → a cart of ad/featured slots
 *   side_banner   → one of the four scarce banner positions
 *   ads / featured-scripts → a single slot bought directly
 */
async function provisionForOrder(
  meta: Record<string, any>,
  userId: string,
  orderRef: string
): Promise<boolean> {
  if (meta.kind === "side_banner") {
    if (meta.bookingId == null) return false
    const res = await activateSideBanner(Number(meta.bookingId), orderRef)
    return res.activated
  }
  if (meta.kind === "platform_cart") {
    const res = await provisionCart(meta, userId, orderRef)
    return res.provisioned
  }
  if (meta.packageType) {
    return provisionEntitlement(userId, meta, orderRef)
  }
  console.error("[paypal webhook] unknown provisioning kind:", meta.kind)
  return false
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  const verified = await verifyPayPalWebhook({ headers: request.headers, rawBody })
  if (!verified) {
    console.error("[paypal webhook] signature verification FAILED — rejected")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const type = String(event?.event_type || "")
  const resource = event?.resource ?? {}

  // A capture event carries the capture id and links to its order; an order
  // event carries the order id directly. Handle both shapes.
  const captureId: string | undefined = resource?.id
  const orderIdFromCapture: string | undefined =
    resource?.supplementary_data?.related_ids?.order_id
  const orderId: string | undefined = orderIdFromCapture || resource?.id

  try {
    switch (type) {
      case "CHECKOUT.ORDER.APPROVED": {
        if (!orderId) return OK()
        // Only advance from 'created' — never downgrade an order the capture
        // route has already completed, since webhook ordering is not guaranteed.
        const record = await db.query.paypalOrders.findFirst({
          where: eq(paypalOrders.id, orderId),
        })
        if (record && record.status === "created") {
          await db
            .update(paypalOrders)
            .set({ status: "approved", updatedAt: new Date() })
            .where(eq(paypalOrders.id, orderId))
        }
        return OK()
      }

      case "PAYMENT.CAPTURE.COMPLETED": {
        if (!orderIdFromCapture) {
          console.warn("[paypal webhook] capture completed with no related order id")
          return OK()
        }
        const record = await db.query.paypalOrders.findFirst({
          where: eq(paypalOrders.id, orderIdFromCapture),
        })
        if (!record) {
          console.warn("[paypal webhook] unknown order:", orderIdFromCapture)
          return OK()
        }

        await db
          .update(paypalOrders)
          .set({
            status: "captured",
            captureId: captureId ?? record.captureId,
            updatedAt: new Date(),
          })
          .where(eq(paypalOrders.id, orderIdFromCapture))

        const meta = parseCustom(record.custom)
        if (!meta) {
          console.error("[paypal webhook] captured with no provisioning payload:", orderIdFromCapture)
          return OK()
        }

        const provisioned = await provisionForOrder(
          meta,
          record.userId ?? meta.userId,
          orderIdFromCapture
        )
        if (!provisioned) {
          // 5xx so PayPal retries — the buyer has paid and must get their items.
          console.error("[paypal webhook] provisioning failed:", orderIdFromCapture)
          return NextResponse.json({ error: "Provisioning failed" }, { status: 500 })
        }
        return OK()
      }

      case "PAYMENT.CAPTURE.REFUNDED":
      case "PAYMENT.CAPTURE.REVERSED":
      case "PAYMENT.CAPTURE.DENIED": {
        // Refunds arrive keyed on the CAPTURE, not the order.
        const refundedCaptureId: string | undefined =
          resource?.links?.find((l: any) => l?.rel === "up")?.href?.split("/").pop() ||
          captureId

        let record = orderIdFromCapture
          ? await db.query.paypalOrders.findFirst({ where: eq(paypalOrders.id, orderIdFromCapture) })
          : undefined
        if (!record && refundedCaptureId) {
          record = await db.query.paypalOrders.findFirst({
            where: eq(paypalOrders.captureId, refundedCaptureId),
          })
        }
        if (!record) {
          console.warn("[paypal webhook] reversal for unknown capture:", refundedCaptureId)
          return OK()
        }

        // Transition first, and only revoke if THIS call made the change.
        // Two concurrent reversal events would otherwise both revoke and
        // double-restore the coupon.
        if (record.status === "refunded") return OK()
        await db
          .update(paypalOrders)
          .set({ status: "refunded", updatedAt: new Date() })
          .where(eq(paypalOrders.id, record.id))

        await revokeForOrder({ id: record.id, custom: record.custom })

        // A reversal is not an accident — block the account so the same
        // buy-then-reverse cycle cannot simply be repeated. REVERSED and DENIED
        // are the chargeback-shaped events; a plain REFUNDED can be a support
        // decision we made ourselves, so it does not carry a block.
        if (type !== "PAYMENT.CAPTURE.REFUNDED") {
          const meta = parseCustom(record.custom)
          await blockUserForChargeback(record.userId ?? meta?.userId, record.id)
        }
        return OK()
      }

      default:
        return OK()
    }
  } catch (error) {
    console.error("[paypal webhook] handler failed:", type, error)
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }
}
