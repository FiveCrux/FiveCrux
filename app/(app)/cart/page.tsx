import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"

import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import { Badge } from "@/componentss/ui/badge"
import CartCheckoutPanel from "@/componentss/cart/cart-checkout-panel"
import CartItemRow from "@/componentss/cart/cart-item-row"
import { authOptions } from "@/auth"
import { db } from "@/lib/db/client"
import { carts } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export default async function CartPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/cart")
  }

  const cart = await db.query.carts.findFirst({
    where: and(
      eq(carts.userId, session.user?.id as string),
      eq(carts.status, "active")
    ),
    with: {
      items: true,
    },
  })

  const items = cart?.items ?? []
  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)

  return (
    <div className="min-h-screen bg-[#070707] text-white overflow-hidden">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Your Cart</h1>
            <p className="mt-3 text-gray-400 max-w-2xl">
              Review the selected items and total before checking out.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
              {items.length} {items.length === 1 ? "item" : "items"}
            </Badge>
            <Badge className="bg-slate-800/80 text-gray-200 border border-gray-700/60">
              EUR {total.toFixed(2)} total
            </Badge>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-gray-800 bg-neutral-900/70 p-12 text-center">
            <h2 className="text-3xl font-semibold text-white mb-4">Your cart is empty</h2>
            <p className="text-gray-400 mb-8">
              Add ad packages or featured script slots to see them here.
            </p>
            <Link
              href="/advertise"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
            >
              Browse Advertising Plans
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-800 bg-neutral-900/70 p-6">
              <div className="grid grid-cols-12 gap-4 border-b border-gray-800 pb-4 text-sm uppercase tracking-[0.2em] text-gray-400">
                <span className="col-span-6">Package</span>
                <span className="col-span-2 text-right">Quantity</span>
                <span className="col-span-2 text-right">Unit Price</span>
                <span className="col-span-2 text-right">Subtotal</span>
              </div>
              <div className="space-y-4 py-6">
                {items.map((item) => (
                  <CartItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>

            <CartCheckoutPanel total={total} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
