"use client"

import Link from "next/link"
import Image from "next/image"
import { ShoppingCart, Star, ChevronRight } from "lucide-react"

export interface MarketProduct {
  id: number | string
  title: string
  framework?: string[]
  price: number
  originalPrice?: number
  free?: boolean
  rating?: number
  seller?: string
  sellerImage?: string
  coverImage?: string
  tag?: "FEATURED" | "FREE" | null
  href: string
}

// Deterministic gradient palette used as a cover fallback when a product has no image.
const GRADIENTS = [
  "from-emerald-600 to-teal-700",
  "from-blue-700 to-indigo-800",
  "from-orange-600 to-amber-700",
  "from-rose-600 to-pink-800",
  "from-cyan-600 to-sky-800",
  "from-slate-600 to-zinc-800",
  "from-teal-600 to-emerald-800",
  "from-violet-600 to-purple-800",
  "from-fuchsia-600 to-purple-800",
  "from-lime-600 to-green-800",
]

function gradientFor(id: number | string) {
  const n = typeof id === "number" ? id : Array.from(String(id)).reduce((a, c) => a + c.charCodeAt(0), 0)
  return GRADIENTS[Math.abs(n) % GRADIENTS.length]
}

function slugText(title: string) {
  return title.toUpperCase().slice(0, 16)
}

export function ProductCard({ product, className = "" }: { product: MarketProduct; className?: string }) {
  const grad = gradientFor(product.id)
  const isFree = product.free || product.price === 0
  const discounted = product.originalPrice && product.originalPrice > product.price

  return (
    <Link
      href={product.href}
      className={`group block flex-shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md transition-all duration-200 hover:-translate-y-1.5 hover:border-orange-500/40 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5)] ${className}`}
      style={{ width: 280 }}
    >
      {/* Cover */}
      <div className={`relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br ${grad}`}>
        {product.coverImage ? (
          <Image
            src={product.coverImage}
            alt={product.title}
            width={400}
            height={180}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="select-none text-4xl font-black uppercase tracking-tight text-white/[0.08]">
            {slugText(product.title)}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Corner tag */}
        {product.tag === "FEATURED" && (
          <span className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-black">
            <Star className="h-3 w-3" /> FEATURED
          </span>
        )}
        {(product.tag === "FREE" || (isFree && !product.tag)) && (
          <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-black">
            FREE
          </span>
        )}

        {/* Quick add */}
        <span className="absolute bottom-2.5 right-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-black shadow-[0_0_0_1px_rgba(249,115,22,0.5),0_8px_32px_rgba(249,115,22,0.35)] transition-transform group-hover:scale-110">
          <ShoppingCart className="h-4 w-4" />
        </span>
      </div>

      {/* Body */}
      <div className="p-3.5">
        {product.framework && product.framework.length > 0 && (
          <div className="mb-2 flex items-center gap-1.5">
            {product.framework.slice(0, 3).map((fw) => (
              <span
                key={fw}
                className="rounded border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase"
              >
                {fw}
              </span>
            ))}
          </div>
        )}
        <h3 className="mb-2 truncate text-sm font-bold leading-snug text-white">{product.title}</h3>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-yellow-400 text-[9px] font-black text-black">
            {product.seller ? product.seller.charAt(0).toUpperCase() : "?"}
          </span>
          <span className="truncate text-xs text-white/60">{product.seller || "Unknown"}</span>
          {typeof product.rating === "number" && (
            <span className="ml-auto flex items-center gap-0.5 text-xs font-semibold text-yellow-400">
              <Star className="h-3.5 w-3.5 fill-yellow-400" /> {product.rating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
          <div>
            {isFree ? (
              <span className="text-base font-extrabold text-green-400">Free</span>
            ) : (
              <span className="text-base font-extrabold text-white">
                {discounted && (
                  <span className="mr-1 text-xs font-medium text-white/55 line-through">
                    ${product.originalPrice!.toFixed(2)}
                  </span>
                )}
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-orange-400">
            View <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
