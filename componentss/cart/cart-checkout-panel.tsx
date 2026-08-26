"use client"

import { useMemo, useState } from "react"
import { Receipt, BadgeCheck, CreditCard, ShieldCheck, Ticket, Check } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentss/ui/select"
import PayPalCheckoutButton from "@/componentss/cart/paypal-checkout-button"

type AppliedCode = {
  id?: number
  code: string
  /** Always known: both coupons and creator codes are priced by our own server. */
  discountAmount: number
}

type CodeMode = "coupon" | "creator"

type CartCheckoutPanelProps = {
  total: number
}

export default function CartCheckoutPanel({ total }: CartCheckoutPanelProps) {
  const [mode, setMode] = useState<CodeMode>("coupon")
  const [codeInput, setCodeInput] = useState("")
  const [appliedCode, setAppliedCode] = useState<AppliedCode | null>(null)
  const [appliedMode, setAppliedMode] = useState<CodeMode | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const payableAmount = useMemo(() => {
    return Math.max(0, total - (appliedCode?.discountAmount ?? 0))
  }, [appliedCode, total])

  const resetInput = (value: string) => {
    setCodeInput(value.toUpperCase())
    setAppliedCode(null)
    setAppliedMode(null)
    setMessage(null)
    setError(null)
  }

  const switchMode = (next: CodeMode) => {
    setMode(next)
    resetInput("")
  }

  const applyCode = async () => {
    setIsApplying(true)
    setError(null)
    setMessage(null)

    const endpoint = mode === "coupon" ? "/api/cart/coupon" : "/api/cart/creator-code"
    const payloadKey = mode === "coupon" ? "couponCode" : "creatorCode"
    const responseKey = mode === "coupon" ? "coupon" : "creatorCode"

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [payloadKey]: codeInput }),
      })

      const data = await response.json()

      if (!response.ok) {
        setAppliedCode(null)
        setAppliedMode(null)
        throw new Error(data.error || `Failed to apply ${mode === "coupon" ? "coupon" : "creator code"}`)
      }

      setAppliedCode(data[responseKey])
      setAppliedMode(mode)
      setMessage(`${data[responseKey].code} applied`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply code")
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0e0e0e] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)]">
      {/* Receipt header */}
      <div className="flex items-center justify-between border-b border-dashed border-white/[0.12] px-6 py-5">
        <div>
          <div className="flex items-center gap-2 text-base font-extrabold tracking-tight text-white">
            <Ticket className="h-4 w-4 text-orange-500" />
            Apply Coupon
          </div>
          <div className="mt-0.5 text-[11px] uppercase tracking-[0.16em] tabular-nums text-white/55">
            Order summary
          </div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/15">
          <Receipt className="h-5 w-5 text-orange-500" />
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Coupon / Creator toggle + code input — one fused segmented control:
            [ Coupon ▾ | enter code… | ✓ Apply ] */}
        <div className="flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] focus-within:border-orange-500/50">
          <Select value={mode} onValueChange={(v) => switchMode(v as CodeMode)}>
            <SelectTrigger className="h-auto w-[104px] flex-none rounded-none border-0 border-r border-white/10 bg-transparent px-3 text-sm font-semibold text-white focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/[0.08] bg-[#0d0d0f] text-white">
              <SelectItem value="coupon">Coupon</SelectItem>
              <SelectItem value="creator">Creator</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="text"
            value={codeInput}
            onChange={(event) => resetInput(event.target.value)}
            placeholder={mode === "coupon" ? "Enter coupon code" : "Enter creator code"}
            className="w-full min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2.5 text-sm font-semibold tracking-wide tabular-nums text-white outline-none"
          />
          <button
            type="button"
            onClick={applyCode}
            disabled={isApplying || !codeInput.trim()}
            className="inline-flex flex-none items-center gap-1.5 rounded-none bg-orange-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {isApplying ? "Applying..." : "Apply"}
          </button>
        </div>

        {appliedCode && (
          <div className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/25">
            <BadgeCheck className="h-3.5 w-3.5" />
            {appliedCode.code} applied
            <span className="tabular-nums text-emerald-300">
              −€{appliedCode.discountAmount.toFixed(2)}
            </span>
          </div>
        )}

        {message && !appliedCode && <p className="mt-2.5 text-sm text-emerald-400">{message}</p>}
        {error && <p className="mt-2.5 text-sm text-red-400">{error}</p>}

        <div className="my-4 border-t border-dashed border-white/[0.12]"></div>

        {/* Totals */}
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-white/50">Subtotal</dt>
            <dd className="font-semibold tabular-nums text-white">€{total.toFixed(2)}</dd>
          </div>
          {appliedCode && appliedCode.discountAmount > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-white/50">Discount</dt>
              <dd className="font-semibold tabular-nums text-emerald-400">
                −€{appliedCode.discountAmount.toFixed(2)}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between">
            <dt className="text-white/50">Sales Tax</dt>
            {/* Tax is settled by PayPal at payment time, based on the buyer's
                location — it is not known while the cart is being reviewed. */}
            <dd className="text-xs font-medium text-white/45">Calculated at checkout</dd>
          </div>
        </dl>

        <div className="my-4 border-t border-dashed border-white/[0.12]"></div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">
              Total due
            </div>
            <div className="text-xs text-white/55">EUR · one-time · excl. tax</div>
          </div>
          <div className="text-[38px] font-extrabold leading-none tracking-tight tabular-nums text-white">
            €{payableAmount.toFixed(2)}
          </div>
        </div>

        <div className="mt-6">
          <PayPalCheckoutButton
            couponCode={appliedMode === "coupon" ? appliedCode?.code : undefined}
            creatorCode={appliedMode === "creator" ? appliedCode?.code : undefined}
            onError={(m: string) => setError(m)}
          />
        </div>
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[12px] text-white/55">
          <CreditCard className="h-3.5 w-3.5" />
          Secure payment via PayPal
        </p>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-white/55">
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
