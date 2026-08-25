import { type NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { requireActiveUser } from "@/lib/api-auth"
import { db } from "@/lib/db/client"
import { paypalOrders } from "@/lib/db/schema"
import { getOrdersController, isPayPalConfigured } from "@/lib/paypal"
import { provisionCart, parseCustom } from "@/lib/provisioning"

/**
 * POST /api/paypal/capture
 *
 * Capture an approved PayPal order and provision what was bought.
 *
 * The webhook is the authority on payment state — this route exists so the
 * buyer gets their entitlement immediately instead of waiting on a webhook
 * that may take seconds. Both call the SAME provisioning code, and both are
 * idempotent, so whichever arrives second is a no-op.
 *
 * Body: { orderId: string }
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const auth = await requireActiveUser()
  if (!auth.ok) return auth.response

  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId || "").trim()
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 })
  }

  // Scope the lookup to the caller: without the userId predicate any signed-in
  // user could capture — and be credited with — somebody else's order.
  const record = await db.query.paypalOrders.findFirst({
    where: and(eq(paypalOrders.id, orderId), eq(paypalOrders.userId, auth.userId)),
  })
  if (!record) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  // Already done — return success rather than capturing twice. PayPal would
  // reject the second capture anyway, but this keeps a double-click quiet.
  if (record.status === "captured") {
    return NextResponse.json({ ok: true, alreadyCaptured: true })
  }

  try {
    const { result } = await getOrdersController().captureOrder({
      id: orderId,
      prefer: "return=minimal",
    })

    const status = String(result?.status || "")
    if (status !== "COMPLETED") {
      await db
        .update(paypalOrders)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(paypalOrders.id, orderId))
      return NextResponse.json(
        { error: `Payment was not completed (${status || "unknown"})` },
        { status: 402 }
      )
    }

    const captureId =
      result?.purchaseUnits?.[0]?.payments?.captures?.[0]?.id ?? null

    await db
      .update(paypalOrders)
      .set({ status: "captured", captureId, updatedAt: new Date() })
      .where(eq(paypalOrders.id, orderId))

    // Provision through the shared module — the exact code the Tebex webhook
    // runs, so what a buyer receives does not depend on how they paid.
    const meta = parseCustom(record.custom)
    if (!meta) {
      // Money is captured but we cannot tell what to grant. Loud, because it
      // needs a human: the buyer has paid and has nothing.
      console.error("[paypal capture] captured with no provisioning payload:", orderId)
      return NextResponse.json(
        { ok: true, provisioned: false, warning: "Payment captured; entitlement pending review." },
        { status: 200 }
      )
    }

    const provision = await provisionCart(meta, record.userId ?? auth.userId, orderId)
    if (!provision.provisioned) {
      // Deliberately still 200: the payment DID succeed, and telling the buyer
      // it failed would invite a second attempt. The webhook retries the
      // provisioning side.
      console.error("[paypal capture] provisioning failed:", orderId, provision.reason)
      return NextResponse.json({
        ok: true,
        provisioned: false,
        warning: "Payment captured; your items are being finalised.",
      })
    }

    return NextResponse.json({ ok: true, provisioned: true })
  } catch (error) {
    console.error("[POST /api/paypal/capture] failed:", orderId, error)
    return NextResponse.json({ error: "Could not complete payment" }, { status: 502 })
  }
}
