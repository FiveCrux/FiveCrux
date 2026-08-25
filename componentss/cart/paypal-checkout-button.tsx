"use client"

import { useState } from "react"
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"

/**
 * PayPal checkout for the FiveCrux cart — ad slots, featured-script slots,
 * subscriptions. Replaces the Tebex redirect.
 *
 * The buyer never sends an amount. `createOrder` asks our server, which prices
 * the cart itself and returns only a PayPal order id; the coupon or creator
 * code is re-validated there too. Nothing here can change what is charged.
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

export default function PayPalCheckoutButton({
  couponCode,
  creatorCode,
  disabled,
  onError,
}: {
  couponCode?: string
  creatorCode?: string
  disabled?: boolean
  onError?: (message: string) => void
}) {
  const [status, setStatus] = useState<"idle" | "paying" | "done">("idle")

  if (!CLIENT_ID) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Payments are not configured yet. Please try again shortly.
      </div>
    )
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        Payment complete — your items are being activated.
      </div>
    )
  }

  const fail = (message: string) => {
    setStatus("idle")
    onError?.(message)
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: CLIENT_ID,
        currency: "EUR",
        intent: "capture",
      }}
    >
      {/* PayPal renders its buttons inside its own iframe, which paints a white
          background this dark page cannot override. Rather than fight it, give
          it a light card of its own with padding and matching corners, so it
          reads as a deliberate payment panel instead of a raw white rectangle
          dropped onto the page. */}
      <div
        className={`rounded-2xl bg-white/[0.97] p-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)] ${
          disabled || status === "paying" ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <PayPalButtons
          style={{
            layout: "vertical",
            shape: "rect",
            // Matches the site's 12px controls; "pill" looked out of place next
            // to the square cart rows.
            borderRadius: 12,
            label: "pay",
            height: 48,
            // Asks PayPal to drop the "Powered by PayPal" strip. It only honours
            // this on the horizontal layout, so the strip still shows here — kept
            // because it costs nothing if PayPal ever extends it to vertical.
            tagline: false,
          }}
          disabled={disabled || status === "paying"}
          // Re-render the buttons when the discount changes, otherwise PayPal
          // keeps the callbacks it captured on first mount and would create the
          // order with a stale code.
          forceReRender={[couponCode, creatorCode]}
          createOrder={async () => {
            setStatus("paying")
            const res = await fetch("/api/paypal/order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ couponCode, creatorCode }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok || !data?.orderId) {
              const message = data?.error || "Could not start checkout"
              fail(message)
              throw new Error(message)
            }
            return data.orderId
          }}
          onApprove={async (data) => {
            const res = await fetch("/api/paypal/capture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) {
              // The money may still have been taken — never tell the buyer to
              // retry a payment we cannot confirm failed.
              fail(
                body?.error ||
                  "We could not confirm your payment. Do not pay again — contact support."
              )
              return
            }
            setStatus("done")
            window.location.href = "/profile?tab=ad-slots&paid=1"
          }}
          onCancel={() => setStatus("idle")}
          onError={() =>
            fail("PayPal could not complete the payment. Please try again.")
          }
        />
      </div>
    </PayPalScriptProvider>
  )
}
