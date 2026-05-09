"use client"

import { useMemo, useState } from "react"

type AppliedCoupon = {
  id: number
  code: string
  discountAmount: number
}

type CartCheckoutPanelProps = {
  total: number
}

export default function CartCheckoutPanel({ total }: CartCheckoutPanelProps) {
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const payableAmount = useMemo(() => {
    return Math.max(0, total - (appliedCoupon?.discountAmount ?? 0))
  }, [appliedCoupon, total])

  const applyCoupon = async () => {
    setIsApplying(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/cart/coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ couponCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        setAppliedCoupon(null)
        throw new Error(data.error || "Failed to apply coupon")
      }

      setAppliedCoupon(data.coupon)
      setMessage(`Coupon ${data.coupon.code} applied`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply coupon")
    } finally {
      setIsApplying(false)
    }
  }

  const checkout = async () => {
    setIsCheckingOut(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ couponCode: appliedCoupon?.code ?? "" }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Checkout failed")
      }

      if (!data.approvalUrl) {
        throw new Error("Payment gateway did not return an approval URL")
      }

      window.location.href = data.approvalUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed")
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="rounded-3xl border border-gray-800 bg-neutral-900/70 p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 space-y-5">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Order summary</p>
            <p className="mt-2 text-lg text-gray-300">
              Ready to proceed when you are.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="text-sm text-gray-400">Coupon code</span>
              <input
                type="text"
                value={couponCode}
                onChange={(event) => {
                  setCouponCode(event.target.value.toUpperCase())
                  setAppliedCoupon(null)
                  setMessage(null)
                  setError(null)
                }}
                placeholder="Enter coupon code"
                className="mt-3 w-full rounded-2xl border border-gray-800 bg-[#0d0d0d] px-4 py-3 text-white outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </label>
            <button
              type="button"
              onClick={applyCoupon}
              disabled={isApplying || !couponCode.trim()}
              className="inline-flex h-full min-h-[3rem] items-center justify-center rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {isApplying ? "Applying..." : "Apply"}
            </button>
          </div>
          {message && <p className="text-sm text-green-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="rounded-2xl bg-[#121212] px-5 py-6 text-right w-full lg:w-[320px]">
          {appliedCoupon && (
            <div className="mb-4 space-y-1 text-sm">
              <div className="flex justify-between gap-3 text-gray-400">
                <span>Subtotal</span>
                <span>€{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-3 text-green-400">
                <span>Discount</span>
                <span>-€{appliedCoupon.discountAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
          <p className="text-sm text-gray-400">Total</p>
          <p className="text-3xl font-bold text-white">€{payableAmount.toFixed(2)}</p>
          <button
            type="button"
            onClick={checkout}
            disabled={isCheckingOut}
            className="mt-5 w-full rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCheckingOut ? "Redirecting..." : "Checkout"}
          </button>
        </div>
      </div>
    </div>
  )
}
