"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ShoppingCart, ShoppingBag, ArrowRight, Loader2, Sparkles } from "lucide-react"

import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import { Badge } from "@/componentss/ui/badge"
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

  const loadCart = useCallback(async () => {
    setLoading(true)

    // Wrap the cart-loading fetch with an 8s AbortController timeout so the
    // page never infinite-spins when the DB is unavailable (e.g. in dev).
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 8000)

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
    // Skip the cart fetch while showing the payment-success flow.
    if (payment === "success" && token) {
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
    <div className="min-h-screen bg-[#070707] text-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {payment === "success" && token ? (
          <CartPaymentSuccess token={token} />
        ) : (
          <>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
            >
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Your Cart
                </div>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  Your{" "}
                  <span className="bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    Cart
                  </span>
                </h1>
                <p className="mt-3 max-w-2xl text-gray-400">
                  Review the selected items and total before checking out.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="border-orange-500/30 bg-orange-500/20 text-orange-300">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </Badge>
                <Badge className="border border-gray-700/60 bg-neutral-800/80 text-gray-200">
                  EUR {total.toFixed(2)} total
                </Badge>
              </div>
            </motion.div>

            {loading ? (
              /* Loading state */
              <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-gray-800 bg-neutral-900/70 p-12 text-center backdrop-blur-md">
                <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                <p className="mt-5 text-sm text-gray-400">Loading your cart…</p>
              </div>
            ) : items.length === 0 ? (
              /* Empty-cart state */
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="rounded-3xl border border-gray-800 bg-neutral-900/70 p-10 text-center backdrop-blur-md sm:p-16"
              >
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10">
                  <ShoppingBag className="h-9 w-9 text-orange-400" />
                </div>
                <h2 className="mb-3 text-2xl font-semibold text-white sm:text-3xl">
                  Your cart is empty
                </h2>
                <p className="mx-auto mb-8 max-w-md text-gray-400">
                  Add ad packages or featured script slots to see them here.
                </p>
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/marketplace"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 sm:w-auto"
                  >
                    <Sparkles className="h-4 w-4" />
                    Browse marketplace
                  </Link>
                  <Link
                    href="/advertise"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-700 bg-neutral-900 px-6 py-3 text-sm font-semibold text-gray-200 transition hover:border-orange-500 hover:text-orange-300 sm:w-auto"
                  >
                    Advertising Plans
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            ) : (
              /* Line items, then the order-summary panel.
                 The summary becomes sticky on desktop and naturally
                 stacks below the items on mobile. */
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="rounded-3xl border border-gray-800 bg-neutral-900/70 p-4 backdrop-blur-md sm:p-6"
                >
                  {/* Column headers — hidden on small screens where rows stack */}
                  <div className="hidden grid-cols-12 gap-4 border-b border-gray-800 pb-4 text-xs uppercase tracking-[0.2em] text-gray-400 md:grid">
                    <span className="col-span-6">Package</span>
                    <span className="col-span-2 text-right">Quantity</span>
                    <span className="col-span-2 text-right">Unit Price</span>
                    <span className="col-span-2 text-right">Subtotal</span>
                  </div>
                  <div className="space-y-4 py-2 md:py-6">
                    {items.map((item) => (
                      <CartItemRow key={item.id} item={item} />
                    ))}
                  </div>
                </motion.div>

                {/* Sticky order summary */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="lg:sticky lg:bottom-6"
                >
                  <CartCheckoutPanel total={total} />
                </motion.div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
