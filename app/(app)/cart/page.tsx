"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Loader2,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Zap,
  ShieldCheck,
  RefreshCw,
} from "lucide-react"

import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import SideAdsFrame from "@/componentss/ads/side-banners"
import CartCheckoutPanel from "@/componentss/cart/cart-checkout-panel"
import CartItemRow from "@/componentss/cart/cart-item-row"
import CartPaymentSuccess from "@/componentss/cart/cart-payment-success"

type CartItem = {
  id: number | string
  itemType: string
  title: string
  price: number | string
  quantity: number
  metadata?: unknown
}

export default function CartPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const payment = searchParams.get("payment")
  const token = searchParams.get("token")

  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  // Cart total — preserves the original subtotal calculation exactly.
  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items]
  )

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const loadCart = useCallback(async () => {
    setLoading(true)

    // Wrap the cart-loading fetch with an 8s AbortController timeout so the
    // page never infinite-spins when the DB is unavailable (e.g. in dev).
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 15000)

    try {
      const response = await fetch("/api/cart", { signal: c.signal })

      // Mirror the original server-side auth redirect (skipped under local mock auth
      // so the cart UI can be reviewed without a real server session).
      if (response.status === 401) {
        if (process.env.NEXT_PUBLIC_MOCK_AUTH === "true") {
          setItems([])
          return
        }
        router.push("/api/auth/signin?callbackUrl=/cart")
        return
      }

      if (!response.ok) {
        setItems([])
        return
      }

      const data = await response.json().catch(() => null)
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch {
      // Abort / network error -> fall through to the empty-cart state.
      setItems([])
    } finally {
      clearTimeout(t)
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    // Skip the cart fetch while showing the payment-success flow (Tebex returns
    // to ?payment=success&provider=tebex — no client token needed).
    if (payment === "success") {
      setLoading(false)
      return
    }
    loadCart()
  }, [loadCart, payment, token])

  // Keep the cart in sync when items are removed elsewhere on the page.
  useEffect(() => {
    const onCartUpdated = () => loadCart()
    window.addEventListener("cartUpdated", onCartUpdated)
    return () => window.removeEventListener("cartUpdated", onCartUpdated)
  }, [loadCart])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white antialiased">
      <Navbar />
      <SideAdsFrame>
      {/* Fill the width between the side-ad rails (no centered max-width cap)
          so there's no dead gap against the rails — matches scripts/props. */}
      <main className="w-full px-5 py-8 md:py-12">
        {payment === "success" ? (
          <div className="mx-auto max-w-3xl">
            <CartPaymentSuccess />
          </div>
        ) : loading ? (
          /* Loading state */
          <div className="mx-auto flex min-h-[40vh] max-w-3xl flex-col items-center justify-center rounded-3xl border border-white/[0.07] bg-[#0e0e0e] p-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <p className="mt-5 text-sm text-white/55">Loading your cart…</p>
          </div>
        ) : items.length === 0 ? (
          /* Empty-cart state */
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mx-auto max-w-3xl rounded-3xl border border-white/[0.07] bg-[#0e0e0e] p-10 text-center sm:p-16"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10">
              <ShoppingBag className="h-9 w-9 text-orange-400" />
            </div>
            <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Your cart is empty
            </h2>
            <p className="mx-auto mb-8 max-w-md text-white/55">
              Add ad packages or featured asset slots to see them here.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-400 sm:w-auto"
              >
                <Sparkles className="h-4 w-4" />
                Browse marketplace
              </Link>
              <Link
                href="/advertise"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/[0.07] sm:w-auto"
              >
                Advertising Plans
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        ) : (
          /* Review & checkout layout: items + extras on the left, receipt rail on the right. */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_430px]">
            {/* LEFT: compact item rows + extras */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-[26px] font-extrabold tracking-tight md:text-[32px]">
                    Review &amp; Checkout
                  </h1>
                  <p className="mt-1 text-sm text-white/55">
                    Confirm your{" "}
                    <span className="font-semibold tabular-nums text-white/70">
                      {items.length} {items.length === 1 ? "item" : "items"}
                    </span>{" "}
                    before paying
                  </p>
                </div>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/55 transition hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" /> Continue shopping
                </Link>
              </div>

              {/* Compact rows */}
              <div className="mt-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0e0e0e]">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-white/55">
                    Cart items
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.16em] tabular-nums text-white/55">
                    {items.length} · qty {totalQuantity}
                  </span>
                </div>

                <div className="divide-y divide-white/[0.05]">
                  {items.map((item) => (
                    <CartItemRow key={item.id} item={item} />
                  ))}
                </div>
              </div>

              {/* Trust badges row */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e0e] px-4 py-3.5">
                  <Zap className="h-5 w-5 text-orange-500" />
                  <div className="mt-2 text-sm font-semibold">Instant delivery</div>
                  <div className="text-xs text-white/55">Files unlock now</div>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e0e] px-4 py-3.5">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <div className="mt-2 text-sm font-semibold">Secure payment</div>
                  <div className="text-xs text-white/55">Encrypted checkout</div>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e0e] px-4 py-3.5">
                  <RefreshCw className="h-5 w-5 text-sky-400" />
                  <div className="mt-2 text-sm font-semibold">Lifetime updates</div>
                  <div className="text-xs text-white/55">Free re-downloads</div>
                </div>
              </div>

            </motion.section>

            {/* RIGHT: receipt rail (sticky on desktop, stacks below on mobile) */}
            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="lg:sticky lg:top-24 lg:self-start"
            >
              <CartCheckoutPanel total={total} />
            </motion.aside>
          </div>
        )}
      </main>
      </SideAdsFrame>

      <Footer />
    </div>
  )
}
