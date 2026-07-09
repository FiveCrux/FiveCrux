"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Search, Upload, SlidersHorizontal, X } from "lucide-react"
import { useFrameworks } from "@/lib/use-frameworks"
import { Button } from "@/componentss/ui/button"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import { ProductCard, type MarketProduct } from "@/componentss/marketplace/product-card"
import SideAdsFrame from "@/componentss/ads/side-banners"

// Raw script shape returned by /api/scripts
interface ApiScript {
  id: number | string
  title: string
  price: number
  originalPrice?: number
  category?: string
  framework?: string[]
  seller_name?: string
  coverImage?: string
  rating?: number
  featured?: boolean
  free?: boolean
}

// Map an API script onto the shared MarketProduct shape consumed by ProductCard.
function toMarketProduct(s: ApiScript): MarketProduct {
  const isFree = s.free || s.price === 0
  return {
    id: s.id,
    title: s.title,
    framework: s.framework,
    price: s.price,
    originalPrice: s.originalPrice,
    free: isFree,
    rating: typeof s.rating === "number" ? s.rating : undefined,
    seller: s.seller_name,
    coverImage: s.coverImage,
    tag: s.featured ? "FEATURED" : isFree ? "FREE" : null,
    href: `/script/${s.id}`,
  }
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "script", label: "Scripts" },
  { value: "mlo", label: "MLOs" },
  { value: "vehicle", label: "Vehicles" },
  { value: "weapon", label: "Weapons" },
  { value: "clothing", label: "Clothing" },
  { value: "prop", label: "Props" },
]

export function MarketplaceClient({ initialScripts = [] }: { initialScripts?: any[] }) {
  // Dynamic frameworks (DB-managed). value = slug (matches stored framework), label = display.
  const frameworkOptions = useFrameworks()
  // ── data + filter state ──────────────────────────────────────────────
  // Seed from server-fetched scripts so the grid paints on first render (SSR).
  const seeded = Array.isArray(initialScripts) && initialScripts.length > 0
  const [products, setProducts] = useState<MarketProduct[]>(
    () => (Array.isArray(initialScripts) ? initialScripts.map(toMarketProduct) : [])
  )
  const [loading, setLoading] = useState(!seeded)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [activeFrameworks, setActiveFrameworks] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Track category alongside the product so chips can filter even on seed data.
  const [productCategories, setProductCategories] = useState<Record<string, string>>(() =>
    Array.isArray(initialScripts)
      ? Object.fromEntries(
          initialScripts.map((s: any) => [String(s.id), (s.category || "script").toLowerCase()])
        )
      : {}
  )

  useEffect(() => {
    if (seeded) return // server already seeded the catalog
    let cancelled = false

    const fetchProducts = async () => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      try {
        setLoading(true)
        const res = await fetch("/api/scripts?status=all", { signal: controller.signal })
        if (!res.ok) {
          if (!cancelled) {
            setProducts([])
            setProductCategories({})
          }
          return
        }
        const data = await res.json()
        const scripts: ApiScript[] = data?.scripts || []
        if (cancelled) return
        setProducts(scripts.map(toMarketProduct))
        setProductCategories(
          Object.fromEntries(scripts.map((s) => [String(s.id), (s.category || "script").toLowerCase()])),
        )
      } catch {
        if (!cancelled) {
          setProducts([])
          setProductCategories({})
        }
      } finally {
        clearTimeout(timeout)
        if (!cancelled) setLoading(false)
      }
    }

    fetchProducts()
    return () => {
      cancelled = true
    }
  }, [])

  const toggleFramework = (fw: string) => {
    setActiveFrameworks((prev) => (prev.includes(fw) ? prev.filter((f) => f !== fw) : [...prev, fw]))
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matches =
          p.title.toLowerCase().includes(q) || (p.seller || "").toLowerCase().includes(q)
        if (!matches) return false
      }
      // Category
      if (activeCategory !== "all") {
        if ((productCategories[String(p.id)] || "") !== activeCategory) return false
      }
      // Framework
      if (activeFrameworks.length > 0) {
        if (!p.framework || p.framework.length === 0) return false
        if (!p.framework.some((fw) => activeFrameworks.includes(fw))) return false
      }
      return true
    })
  }, [products, searchQuery, activeCategory, activeFrameworks, productCategories])

  const hasActiveFilters = activeCategory !== "all" || activeFrameworks.length > 0 || searchQuery.length > 0

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] text-white">
      <SideAdsFrame>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-white/[0.06]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-orange-500/20 blur-[120px]" />
            <div className="absolute -top-12 right-1/4 h-72 w-72 rounded-full bg-yellow-400/10 blur-[120px]" />
          </div>
          <div className="relative mx-auto w-full px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <span className="mb-4 inline-block rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-400">
                Marketplace
              </span>
              <h1 className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
                Discover Premium FiveM Assets
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base text-white/60 sm:text-lg">
                Scripts, MLOs, vehicles, weapons and more — curated for your server.
              </p>
              <div className="mt-8">
                <Link href="/scripts/submit">
                  <Button className="bg-gradient-to-r from-orange-500 to-yellow-400 px-8 py-3 text-base font-bold text-black shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-yellow-500">
                    <Upload className="mr-2 h-5 w-5" />
                    Submit Your Script
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Catalog ──────────────────────────────────────────────────── */}
        <section className="mx-auto w-full px-2.5 py-10">
          {/* Search + filter toggle */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
              <input
                type="text"
                placeholder="Search assets or creators…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white placeholder-white/40 outline-none transition focus:border-orange-500/50 focus:bg-white/[0.06]"
              />
            </div>
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                showFilters || activeFrameworks.length > 0
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                  : "border-white/[0.08] bg-white/[0.04] text-white/70 hover:border-white/20"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFrameworks.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-black">
                  {activeFrameworks.length}
                </span>
              )}
            </button>
          </div>

          {/* Category chips */}
          <div className="mb-5 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  activeCategory === cat.value
                    ? "bg-gradient-to-r from-orange-500 to-yellow-400 text-black"
                    : "border border-white/[0.08] bg-white/[0.04] text-white/70 hover:border-orange-500/40 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Framework filter (collapsible) */}
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
            >
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Framework</h3>
              <div className="flex flex-wrap gap-2">
                {frameworkOptions.map((fw) => (
                  <button
                    key={fw.value}
                    onClick={() => toggleFramework(fw.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase transition ${
                      activeFrameworks.includes(fw.value)
                        ? "border-orange-500/60 bg-orange-500/15 text-orange-300"
                        : "border-white/15 bg-white/[0.04] text-white/60 hover:border-white/30"
                    }`}
                  >
                    {fw.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Result meta */}
          <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-white/50">
            <span>{filtered.length} {filtered.length === 1 ? "item" : "items"} found</span>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setActiveCategory("all")
                  setActiveFrameworks([])
                  setSearchQuery("")
                }}
                className="flex items-center gap-1 text-orange-400 hover:text-orange-300"
              >
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            )}
          </div>

          {/* Grid / states */}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-16 text-center">
              <h3 className="text-lg font-semibold text-white">No assets found</h3>
              <p className="mt-1 text-sm text-white/50">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              // auto-fill at the card's native 300px width so columns only form when
              // there is room — keeps the fixed-width ProductCard responsive without overflow.
              className="grid justify-center gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),300px))] justify-items-center"
            >
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </motion.div>
          )}
        </section>
      </SideAdsFrame>
      </main>
      <Footer />
    </>
  )
}
