"use client"

import { useMemo, useState } from "react"
import { Receipt, BadgeCheck, Lock, CreditCard, ShieldCheck } from "lucide-react"

type AppliedCoupon = {
  id: number
  code: string
  discountAmount: number
}

type CartCheckoutPanelProps = {
  total: number
}

// Default payment provider for the primary Checkout button. Flip to "tebex" via
// NEXT_PUBLIC_PAYMENT_PROVIDER once the FiveCrux Tebex store + package map are
// configured. The secondary button always uses Tebex.
const DEFAULT_PROVIDER: "paypal" | "tebex" =
  process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === "tebex" ? "tebex" : "paypal"

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

  const checkout = async (provider: "paypal" | "tebex" = DEFAULT_PROVIDER) => {
    setIsCheckingOut(true)
    setError(null)
    setMessage(null)

    try {
      const endpoint = provider === "tebex" ? "/api/cart/tebex-checkout" : "/api/cart/checkout"
      const response = await fetch(endpoint, {
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

      // PayPal returns `approvalUrl`; Tebex returns `checkoutUrl`.
      const redirectUrl = data.checkoutUrl || data.approvalUrl
      if (!redirectUrl) {
        throw new Error("Payment gateway did not return a redirect URL")
      }

      window.location.href = redirectUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed")
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0e0e0e] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)]">
      {/* Receipt header */}
      <div className="flex items-center justify-between border-b border-dashed border-white/[0.12] px-6 py-5">
        <div>
          <div className="text-base font-extrabold tracking-tight text-white">Receipt</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-[0.16em] tabular-nums text-white/35">
            Order summary
          </div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/15">
          <Receipt className="h-5 w-5 text-orange-500" />
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Coupon */}
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(event) => {
              setCouponCode(event.target.value.toUpperCase())
              setAppliedCoupon(null)
              setMessage(null)
              setError(null)
            }}
            placeholder="Coupon code"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm font-semibold tracking-wide tabular-nums text-white outline-none transition focus:border-orange-500/50"
          />
          <button
            type="button"
            onClick={applyCoupon}
            disabled={isApplying || !couponCode.trim()}
            className="rounded-xl bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:text-white/40"
          >
            {isApplying ? "Applying..." : "Apply"}
          </button>
        </div>

        {appliedCoupon && (
          <div className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/25">
            <BadgeCheck className="h-3.5 w-3.5" />
            {appliedCoupon.code} applied
            <span className="tabular-nums text-emerald-300">
              −€{appliedCoupon.discountAmount.toFixed(2)}
            </span>
          </div>
        )}

        {message && !appliedCoupon && <p className="mt-2.5 text-sm text-emerald-400">{message}</p>}
        {error && <p className="mt-2.5 text-sm text-red-400">{error}</p>}

        <div className="my-4 border-t border-dashed border-white/[0.12]"></div>

        {/* Totals */}
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-white/50">Subtotal</dt>
            <dd className="font-semibold tabular-nums text-white">€{total.toFixed(2)}</dd>
          </div>
          {appliedCoupon && (
            <div className="flex items-center justify-between">
              <dt className="text-white/50">Discount</dt>
              <dd className="font-semibold tabular-nums text-emerald-400">
                −€{appliedCoupon.discountAmount.toFixed(2)}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between">
            <dt className="text-white/50">Processing</dt>
            <dd className="font-semibold tabular-nums text-white/60">€0.00</dd>
          </div>
        </dl>

        <div className="my-4 border-t border-dashed border-white/[0.12]"></div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">Total due</div>
            <div className="text-xs text-white/30">EUR · one-time</div>
          </div>
          <div className="text-[38px] font-extrabold leading-none tracking-tight tabular-nums text-white">
            €{payableAmount.toFixed(2)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => checkout()}
          disabled={isCheckingOut}
          className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-[15px] font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Lock className="h-4 w-4" />
          {isCheckingOut ? "Redirecting..." : `Checkout — €${payableAmount.toFixed(2)}`}
        </button>
        <button
          type="button"
          onClick={() => checkout("tebex")}
          disabled={isCheckingOut}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 text-sm font-semibold text-white/85 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CreditCard className="h-4 w-4" />
          Buy via Tebex
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-white/35">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" />
          Secure checkout · instant delivery
        </p>
      </div>

      {/* Perforated bottom edge */}
      <div
        className="h-3 w-full opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.14) 1.5px, transparent 1.5px)",
          backgroundSize: "14px 14px",
          backgroundPosition: "center",
        }}
      ></div>
    </div>
  )
}
