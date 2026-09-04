"use client"

import { useState } from "react"
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"

/**
 * PayPal buttons for a side-banner slot.
 *
 * Different from the cart's button in one way that matters: the order ALREADY
 * exists. /api/side-banners/checkout creates it together with a 15-minute
 * reservation on the position, so this hands PayPal that id rather than asking
 * the server for a new one — creating a second order would take a second
 * reservation on a scarce slot.
 */
export default function SideBannerPayPal({
  orderId,
  amount,
  currencySymbol,
  label,
  onCancel,
  onError,
}: {
  orderId: string
  amount: string
  currencySymbol: string
  label: string
  onCancel: () => void
  onError: (message: string) => void
}) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const [done, setDone] = useState(false)

  if (!clientId) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Payments are not configured yet. Please try again shortly.
      </div>
    )
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        Payment complete — taking you to your banners…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70">{label}</span>
        <span className="font-bold tabular-nums text-white">
          {currencySymbol}
          {amount}
        </span>
      </div>

      <PayPalScriptProvider options={{ clientId, currency: "EUR", intent: "capture" }}>
        {/* PayPal paints its own white iframe this dark page cannot reach into,
            so it gets a light card of its own rather than landing as a raw
            white rectangle. Same treatment as the cart. */}
        <div className="rounded-2xl bg-white/[0.97] p-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)]">
          <PayPalButtons
            style={{ layout: "vertical", shape: "rect", borderRadius: 12, label: "pay", height: 48 }}
            createOrder={async () => orderId}
            onApprove={async () => {
              const res = await fetch("/api/paypal/capture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId }),
              })
              const body = await res.json().catch(() => ({}))
              if (!res.ok) {
                // The money may already be taken — never invite a second attempt
                // at a payment we cannot confirm failed.
                onError(
                  body?.error ||
                    "We could not confirm your payment. Do not pay again — contact support."
                )
                return
              }
              setDone(true)
              window.location.href = "/profile?tab=ad-slots&sidebanner=paid"
            }}
            onCancel={onCancel}
            onError={() => onError("PayPal could not complete the payment. Please try again.")}
          />
        </div>
      </PayPalScriptProvider>

      <button
        type="button"
        onClick={onCancel}
        className="w-full rounded-xl border border-white/[0.14] px-4 py-2 text-sm font-semibold text-white/70 transition hover:text-white"
      >
        Choose a different slot
      </button>
    </div>
  )
}
