"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Search,
  Star,
  Play,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Zap,
  Gift,
  Building2,
  Code2,
  Package,
  Car,
  Crosshair,
  Shirt,
  Upload,
  BadgeDollarSign,
  Users,
  Shield,
  Megaphone,
  Plus,
} from "lucide-react"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import { ProductCard, type MarketProduct } from "@/componentss/marketplace/product-card"
import { MARKETPLACE_SEED, type SeedProduct } from "@/lib/marketplace-seed"

const CATEGORIES = [
  { name: "Scripts", icon: Code2, href: "/scripts" },
  { name: "Props", icon: Package, href: "/props" },
  { name: "MLOs", icon: Building2, href: "/scripts?category=mlo" },
  { name: "Vehicles", icon: Car, href: "/scripts?category=vehicles" },
  { name: "Weapons", icon: Crosshair, href: "/scripts?category=weapons" },
  { name: "Clothing", icon: Shirt, href: "/scripts?category=clothing" },
  { name: "Giveaways", icon: Gift, href: "/giveaways" },
]

const PLATFORM_FEATURES = [
  { title: "Community Driven", description: "Built by experienced FiveM developers, trusted and improved by the community.", icon: Users },
  { title: "Premium Quality", description: "Only top-tier scripts that meet our quality standards make it onto FiveCrux.", icon: Star },
  { title: "Security Verified", description: "Every resource is manually reviewed before it goes live.", icon: Shield },
  { title: "Maximum Reach", description: "Get discovered by thousands of FiveM server owners worldwide.", icon: Megaphone },
]

const FAQS = [
  { q: "How does publishing a script work?", a: "Submit your script through the developer panel. Each submission goes through a quality, security, and compatibility review before being published." },
  { q: "How do I get paid?", a: "Payments are handled through Tebex — money from your sales goes directly to your connected Tebex account." },
  { q: "Is there any publishing fee?", a: "There is no upfront fee to publish. You can optionally pay for featured slots and ads for extra reach." },
  { q: "Can I host giveaways on FiveCrux?", a: "Yes. Developers can create and publish giveaways to promote their scripts and reach a wider FiveM audience." },
]

function mapFeatured(item: any): MarketProduct {
  return {
    id: item.scriptId ?? item.id,
    title: item.scriptTitle || item.title || "Untitled",
    framework: Array.isArray(item.scriptFramework) ? item.scriptFramework : item.scriptFramework ? [item.scriptFramework] : item.framework || [],
    price: Number(item.scriptPrice ?? item.price ?? 0),
    free: item.scriptFree ?? item.free ?? false,
    seller: item.scriptSellerName || item.seller_name || item.seller,
    sellerImage: item.scriptSellerImage || item.seller_image,
    coverImage: item.scriptCoverImage || item.cover_image,
    tag: "FEATURED",
    href: `/script/${item.scriptId ?? item.id}`,
  }
}

// ── Horizontal scroll row ──
function Row({ title, icon, emoji, items, seeAllHref }: {
  title: string
  icon?: React.ReactNode
  emoji?: string
  items: MarketProduct[]
  seeAllHref: string
}) {
  if (!items.length) return null
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-extrabold sm:text-xl">
          {emoji ? <span>{emoji}</span> : icon}
          {title}
        </h2>
        <Link href={seeAllHref} className="flex items-center gap-1 text-sm font-semibold text-orange-400 transition-all hover:gap-2">
          See all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-4 pb-2">
          {items.map((p) => (
            <ProductCard key={`${title}-${p.id}`} product={p} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Rotating featured spotlight hero ──
function HeroSpotlight({ items, query, setQuery, onSearch }: {
  items: MarketProduct[]
  query: string
  setQuery: (v: string) => void
  onSearch: () => void
}) {
  const [idx, setIdx] = useState(0)
  const slides = items.length ? items : []
  const active = slides[idx % slides.length] || items[0]

  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6000)
    return () => clearInterval(t)
  }, [slides.length])

  const go = (d: number) => setIdx((i) => (i + d + slides.length) % slides.length)
  if (!active) return null

  return (
    <section className="mt-4 px-3 sm:px-6">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-white/[0.08]" style={{ minHeight: "70vh" }}>
        {/* Cover image of active product */}
        {active.coverImage ? (
          <Image src={active.coverImage} alt={active.title} fill priority className="object-cover" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-700 via-purple-700 to-orange-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/55 to-[#0a0a0a]/20" />

        {/* Search overlay */}
        <div className="relative z-10 flex justify-center p-4 sm:p-8">
          <div className="flex w-full max-w-2xl items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md focus-within:border-orange-500/50">
            <Search className="h-5 w-5 text-white/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              type="text"
              placeholder="Search scripts, MLOs, vehicles, props…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/50"
            />
            <button onClick={onSearch} className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-black">Search</button>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end px-5 pb-12 sm:px-10" style={{ minHeight: "calc(70vh - 90px)" }}>
          <span className="mb-3 inline-flex items-center gap-1.5 self-start rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-black">
            <Star className="h-3 w-3" /> FEATURED SPOTLIGHT
          </span>
          <h1 className="mb-3 max-w-3xl text-3xl font-black tracking-tight drop-shadow-lg sm:text-5xl">{active.title}</h1>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {active.framework?.slice(0, 2).map((fw) => (
              <span key={fw} className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs font-bold backdrop-blur-sm">{fw}</span>
            ))}
            {typeof active.rating === "number" && (
              <span className="flex items-center gap-1 text-sm font-semibold text-yellow-400">
                <Star className="h-4 w-4 fill-yellow-400" /> {active.rating.toFixed(1)}
              </span>
            )}
            {active.seller && <span className="text-sm text-white/70">by {active.seller}</span>}
            <span className="ml-2 text-2xl font-black">{active.free || active.price === 0 ? "Free" : `$${active.price.toFixed(2)}`}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={active.href} className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-bold text-black transition hover:bg-orange-400 shadow-[0_0_0_1px_rgba(249,115,22,0.5),0_8px_32px_rgba(249,115,22,0.35)]">
              <Play className="h-4 w-4" /> View Script
            </Link>
            <Link href={active.href} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-6 py-3 font-semibold backdrop-blur-md transition hover:bg-white/10">
              <ShoppingCart className="h-4 w-4" /> Add to Cart
            </Link>
          </div>
        </div>

        {slides.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md transition hover:bg-white/10">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => go(1)} aria-label="Next" className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md transition hover:bg-white/10">
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === idx % slides.length ? "w-8 bg-orange-500" : "w-2 bg-white/30"}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

// ── FAQ accordion item ──
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-[22px] transition-colors" style={{ background: open ? "rgba(249,115,22,0.07)" : "transparent" }}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-6 py-5 text-left">
        <span className={`pr-4 text-base font-semibold ${open ? "text-orange-400" : "text-white"}`}>{q}</span>
        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-transform ${open ? "rotate-45 text-orange-400" : "text-white/40"}`}
          style={{ background: open ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.06)" }}>
          <Plus className="h-4 w-4" />
        </span>
      </button>
      {open && <p className="px-6 pb-5 text-sm leading-relaxed text-white/55">{a}</p>}
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [liveFeatured, setLiveFeatured] = useState<MarketProduct[]>([])

  // Optional live featured overlay (DB may be empty in dev → seed is the source of truth).
  useEffect(() => {
    let cancelled = false
    fetch("/api/featured-scripts?status=active", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.featuredScripts?.length) setLiveFeatured(d.featuredScripts.map(mapFeatured))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo(() => {
    const SEED: SeedProduct[] = MARKETPLACE_SEED
    const byCat = (c: SeedProduct["category"]) => SEED.filter((p) => p.category === c)
    const featuredSeed = SEED.filter((p) => p.tag === "FEATURED")
    const heroItems = (liveFeatured.length ? liveFeatured : featuredSeed).slice(0, 5)
    return {
      heroItems,
      featured: (liveFeatured.length ? liveFeatured : featuredSeed).slice(0, 10),
      trending: [...SEED].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10),
      newReleases: [...SEED].reverse().slice(0, 10),
      free: SEED.filter((p) => p.free || p.price === 0).slice(0, 10),
      mlo: byCat("mlo"),
      vehicles: byCat("vehicle"),
      weapons: byCat("weapon"),
      clothing: byCat("clothing"),
    }
  }, [liveFeatured])

  const onSearch = () => {
    const q = query.trim()
    router.push(q ? `/scripts?search=${encodeURIComponent(q)}` : "/scripts")
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#0a0a0a] text-white">
      <Navbar />

      <HeroSpotlight items={rows.heroItems} query={query} setQuery={setQuery} onSearch={onSearch} />

      {/* Category chips */}
      <section className="mt-5 px-3 sm:px-6">
        <div className="mx-auto max-w-7xl overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max items-center gap-2.5 pb-1">
            {CATEGORIES.map((c, i) => {
              const Icon = c.icon
              return (
                <Link key={c.name} href={c.href}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                    i === 0 ? "bg-orange-500 font-semibold text-black" : "border border-white/[0.08] bg-white/[0.04] backdrop-blur-md hover:bg-white/10"
                  }`}>
                  <Icon className="h-4 w-4" /> {c.name}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Discovery rows */}
      <main className="mx-auto mt-8 max-w-7xl space-y-10 px-3 sm:px-6">
        <Row title="Featured" icon={<Sparkles className="h-5 w-5 text-yellow-400" />} items={rows.featured} seeAllHref="/scripts?featured=true" />
        <Row title="Trending This Week" emoji="🔥" items={rows.trending} seeAllHref="/scripts" />
        <Row title="New Releases" icon={<Zap className="h-5 w-5 text-orange-400" />} items={rows.newReleases} seeAllHref="/scripts" />
        <Row title="Free Scripts" icon={<Gift className="h-5 w-5 text-green-400" />} items={rows.free} seeAllHref="/scripts?free=true" />
        <Row title="Top MLOs & Maps" icon={<Building2 className="h-5 w-5 text-yellow-400" />} items={rows.mlo} seeAllHref="/scripts?category=mlo" />
        <Row title="Vehicles" icon={<Car className="h-5 w-5 text-sky-400" />} items={rows.vehicles} seeAllHref="/scripts?category=vehicles" />
        <Row title="Weapons" icon={<Crosshair className="h-5 w-5 text-red-400" />} items={rows.weapons} seeAllHref="/scripts?category=weapons" />
        <Row title="Clothing & EUP" icon={<Shirt className="h-5 w-5 text-pink-400" />} items={rows.clothing} seeAllHref="/scripts?category=clothing" />
      </main>

      {/* Start selling strip */}
      <section className="mt-12 px-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 rounded-2xl border border-white/[0.10] bg-white/[0.06] px-5 py-5 backdrop-blur-md sm:flex-row sm:px-8">
          <p className="flex items-center gap-2.5 text-center text-sm font-semibold sm:text-left sm:text-base">
            <BadgeDollarSign className="h-5 w-5 shrink-0 text-yellow-400" />
            Got scripts to sell? List your product and get paid directly via Tebex.
          </p>
          <Link href="/scripts/submit"
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-black transition hover:bg-orange-400 shadow-[0_0_0_1px_rgba(249,115,22,0.5),0_8px_32px_rgba(249,115,22,0.35)]">
            <Upload className="h-4 w-4" /> Start Selling
          </Link>
        </div>
      </section>

      {/* Why Choose FiveCrux */}
      <section className="mt-20 px-3 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-sm font-semibold text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> Why Choose Us
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Why Choose <span className="text-orange-400">FiveCrux</span>?</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORM_FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-7 text-center backdrop-blur-md transition hover:-translate-y-1 hover:border-orange-500/30">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
                    <Icon className="h-7 w-7 text-orange-400" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-white/45">{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Our Services / Crux Ecosystem */}
      <section className="mt-20 px-3 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-sm font-semibold text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> Our Services
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Powered by the <span className="text-orange-400">Crux</span> Ecosystem</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <a href="https://www.gamecrux.io/" target="_blank" rel="noopener noreferrer"
              className="group block rounded-2xl border border-white/[0.07] bg-white/[0.03] p-7 backdrop-blur-md transition hover:-translate-y-1 hover:border-orange-500/30">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
                  <Image src="/gamecrux.webp" alt="GameCrux" width={40} height={40} className="rounded-lg" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">GameCrux</h3>
                  <p className="text-xs font-medium uppercase tracking-wide text-orange-400/70">Gaming Platform</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-white/45">Discover, play, and enjoy a curated selection of exciting minigames.</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 group-hover:gap-2.5">Visit GameCrux <ArrowRight className="h-4 w-4" /></span>
            </a>
            <a href="https://crux.tebex.io/" target="_blank" rel="noopener noreferrer"
              className="group block rounded-2xl border border-white/[0.07] bg-white/[0.03] p-7 backdrop-blur-md transition hover:-translate-y-1 hover:border-orange-500/30">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
                  <Image src="/cs.webp" alt="Crux Studio" width={40} height={40} className="rounded-lg" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Crux Studio</h3>
                  <p className="text-xs font-medium uppercase tracking-wide text-orange-400/70">FiveM Marketplace</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-white/45">Premium FiveM assets crafted with passion and attention to detail.</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 group-hover:gap-2.5">Visit Crux Studio <ArrowRight className="h-4 w-4" /></span>
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-20 px-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-sm font-semibold text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> FAQ
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Frequently Asked <span className="text-orange-400">Questions</span></h2>
          </div>
          <div className="flex flex-col gap-0.5 rounded-[26px] border border-white/[0.08] bg-white/[0.05] p-1.5">
            {FAQS.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      <div className="mt-20">
        <Footer />
      </div>
    </div>
  )
}
