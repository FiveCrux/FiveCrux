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
  Car,
  Users,
  Shield,
  Megaphone,
  ChevronDown,
  MessagesSquare,
} from "lucide-react"
import { categoryIcon } from "@/lib/category-icons"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import BrowseNav from "@/componentss/shared/browse-nav"
import { FrameworkBadge } from "@/componentss/shared/framework-badge"
import SideAdsFrame from "@/componentss/ads/side-banners"
import { ProductCard, type MarketProduct } from "@/componentss/marketplace/product-card"
import { formatPrice } from "@/lib/format-price"
import type { HomeContent } from "@/lib/site-content"


// A seller can submit without ever picking an explicit cover image — fall
// back to their first screenshot rather than showing no image at all. Mirrors
// the fallback already used on /scripts (scripts-client.tsx's mapApiScript).
function resolveCoverImage(...candidates: any[]): string | undefined {
  for (const c of candidates) {
    if (typeof c === "string" && c) return c
    if (Array.isArray(c) && c.length > 0 && c[0]) return c[0]
  }
  return undefined
}

function mapFeatured(item: any): MarketProduct {
  // A featured BANNER (no scriptId) links to its own URL and has no price/
  // framework/seller — just the banner image + title.
  const isBanner = item.isBanner || item.scriptId == null
  if (isBanner) {
    return {
      id: item.id,
      title: item.scriptTitle || item.title || "Untitled",
      framework: [],
      price: 0,
      hidePrice: true,
      coverImage: resolveCoverImage(item.scriptCoverImage, item.bannerImage, item.image_url),
      tag: "FEATURED",
      href: item.linkUrl || item.bannerLink || "#",
      external: true,
    }
  }
  return {
    id: item.scriptId ?? item.id,
    title: item.scriptTitle || item.title || "Untitled",
    framework: Array.isArray(item.scriptFramework) ? item.scriptFramework : item.scriptFramework ? [item.scriptFramework] : item.framework || [],
    price: Number(item.scriptPrice ?? item.price ?? 0),
    free: item.scriptFree ?? item.free ?? false,
    hidePrice: item.scriptHidePrice ?? item.hidePrice ?? item.hide_price ?? false,
    seller: item.scriptSellerName || item.seller_name || item.seller,
    sellerImage: item.scriptSellerImage || item.seller_image,
    coverImage: resolveCoverImage(item.scriptCoverImage, item.cover_image, item.scriptImages, item.images, item.scriptScreenshots, item.screenshots),
    currencySymbol: item.scriptCurrencySymbol || item.currency_symbol || item.currencySymbol,
    tag: "FEATURED",
    href: `/script/${item.scriptId ?? item.id}`,
  }
}

// Map a regular approved script (from /api/scripts) into a MarketProduct so the
// discovery rows (Trending / New / and Featured-fallback) have content even when
// there are no active featured scripts yet.
function mapScript(item: any): MarketProduct {
  return {
    id: item.id,
    title: item.title || item.name || "Untitled",
    framework: Array.isArray(item.framework) ? item.framework : item.framework ? [item.framework] : [],
    price: Number(item.price ?? 0),
    free: item.free ?? item.price === 0,
    hidePrice: item.hidePrice ?? item.hide_price ?? false,
    seller: item.seller_name || item.sellerName || item.seller,
    sellerImage: item.seller_image || item.sellerImage,
    coverImage: resolveCoverImage(item.cover_image, item.coverImage, item.images, item.screenshots),
    currencySymbol: item.currency_symbol || item.currencySymbol,
    category: item.category,
    href: `/script/${item.id}`,
    viewCount: Number(item.view_count ?? item.viewCount ?? 0),
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
      <div className="-mx-2.5 -mt-2 overflow-x-auto px-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-3 pt-2 pb-2">
          {items.map((p) => (
            <div key={`${title}-${p.id}`} className="w-[300px] shrink-0">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Rotating featured spotlight hero ──
function HeroSpotlight({ items, promo }: {
  items: MarketProduct[]
  promo: HomeContent["heroPromo"]
}) {
  const [idx, setIdx] = useState(0)
  // Always append a "get featured here" promo slide — turns the hero into an
  // advertising CTA showing which plan unlocks this premium placement.
  const PROMO = { __promo: true } as any
  const slides: any[] = items.length ? [...items, PROMO] : [PROMO]
  const active = slides[idx % slides.length]
  const isPromo = !!active?.__promo

  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6000)
    return () => clearInterval(t)
  }, [slides.length])

  const go = (d: number) => setIdx((i) => (i + d + slides.length) % slides.length)
  if (!active) return null

  return (
    <section className="mt-4 px-2.5">
      <div className="relative mx-auto w-full overflow-hidden rounded-2xl border border-white/[0.08]" style={{ minHeight: "70vh" }}>
        {/* Background — promo slide gets a branded glow; products show their cover */}
        {isPromo ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[#1b1020] via-[#0a0a0a] to-[#2a1606]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,rgba(249,115,22,0.38),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,rgba(168,85,247,0.20),transparent_50%)]" />
          </>
        ) : active.coverImage ? (
          <Image src={active.coverImage} alt={active.title} fill priority className="object-cover" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-700 via-purple-700 to-orange-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/55 to-[#0a0a0a]/20" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end px-5 pb-12 pt-8 sm:px-10" style={{ minHeight: "70vh" }}>
          {isPromo ? (
            <>
              <span className="mb-4 inline-flex items-center gap-1.5 self-start rounded-full border border-orange-400/40 bg-orange-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-orange-300 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" /> {promo.badge}
              </span>
              <h1 className="mb-3 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight drop-shadow-lg sm:text-6xl">
                {promo.headline}{" "}
                <span className="bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">{promo.headlineAccent}</span>.
              </h1>
              <p className="mb-5 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
                {promo.subtext}
              </p>
              {/* Tier pills */}
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {promo.tiers.map((t) => (
                  <span key={t} className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-200">
                    {t}
                  </span>
                ))}
                <span className="text-xs font-medium text-white/45">{promo.priceText}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/advertise" className="group flex items-center gap-2 rounded-xl bg-orange-500 px-7 py-3.5 text-[15px] font-bold text-black transition hover:bg-orange-400 shadow-[0_0_0_1px_rgba(249,115,22,0.5),0_10px_40px_rgba(249,115,22,0.45)]">
                  <Star className="h-4 w-4" /> {promo.ctaPrimary}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link href="/advertise" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-6 py-3.5 font-semibold backdrop-blur-md transition hover:bg-white/10">
                  {promo.ctaSecondary}
                </Link>
              </div>
            </>
          ) : (
            <>
              <span className="mb-3 inline-flex items-center gap-1.5 self-start rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-black">
                <Star className="h-3 w-3" /> FEATURED SPOTLIGHT
              </span>
              <h1 className="mb-3 max-w-3xl text-3xl font-black tracking-tight drop-shadow-lg sm:text-5xl">{active.title}</h1>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {active.framework?.slice(0, 2).map((fw: string) => (
                  <FrameworkBadge key={fw} framework={fw} className="backdrop-blur-sm" />
                ))}
                {typeof active.rating === "number" && (
                  <span className="flex items-center gap-1 text-sm font-semibold text-yellow-400">
                    <Star className="h-4 w-4 fill-yellow-400" /> {active.rating.toFixed(1)}
                  </span>
                )}
                {active.seller && <span className="text-sm text-white/70">by {active.seller}</span>}
                {!active.hidePrice && (
                  <span className="ml-2 text-2xl font-black">{active.free || active.price === 0 ? "Free" : formatPrice(active.price, active.currencySymbol)}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {active.external ? (
                  // Featured banner → single external CTA (no cart).
                  <a href={active.href} target="_blank" rel="noopener noreferrer sponsored" className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-bold text-black transition hover:bg-orange-400 shadow-[0_0_0_1px_rgba(249,115,22,0.5),0_8px_32px_rgba(249,115,22,0.35)]">
                    <ArrowRight className="h-4 w-4" /> Visit
                  </a>
                ) : (
                  <>
                    <Link href={active.href} className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-bold text-black transition hover:bg-orange-400 shadow-[0_0_0_1px_rgba(249,115,22,0.5),0_8px_32px_rgba(249,115,22,0.35)]">
                      <Play className="h-4 w-4" /> View Asset
                    </Link>
                    <Link href={active.href} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-6 py-3 font-semibold backdrop-blur-md transition hover:bg-white/10">
                      <ShoppingCart className="h-4 w-4" /> Add to Cart
                    </Link>
                  </>
                )}
              </div>
            </>
          )}
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

// ── FAQ accordion item (chevron rotate, glass row) ──
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 backdrop-blur-md transition-all duration-300 sm:px-6"
      style={open ? { borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.05)" } : undefined}
    >
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 py-5 text-left">
        <span className={`text-base font-semibold ${open ? "text-orange-400" : "text-white"}`}>{q}</span>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 text-orange-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="pb-5 pr-4 leading-relaxed text-white/60">{a}</p>}
    </div>
  )
}

export function HomeClient({
  initialFeatured = [],
  initialCategories = [],
  initialScripts = [],
  content,
}: {
  initialFeatured: any[]
  initialCategories?: { name: string; slug: string; icon: string | null }[]
  initialScripts?: any[]
  content: HomeContent
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  // Seed from server-fetched featured scripts so the hero/featured row renders
  // on first paint (SSR). Fall back to a client fetch only when none were provided.
  const [liveFeatured, setLiveFeatured] = useState<MarketProduct[]>(() =>
    Array.isArray(initialFeatured) ? initialFeatured.map(mapFeatured) : []
  )

  // Regular approved scripts — power the discovery rows. Seeded from the server
  // (SSR/ISR) so the rows are in the first paint; client fetch is a fallback.
  const [liveScripts, setLiveScripts] = useState<MarketProduct[]>(() =>
    Array.isArray(initialScripts) ? initialScripts.map(mapScript) : []
  )

  // Dynamic browse categories — seeded from the server so chips render instantly.
  const [homeCats, setHomeCats] = useState<{ name: string; slug: string; icon: string | null }[]>(
    Array.isArray(initialCategories) ? initialCategories : []
  )
  useEffect(() => {
    if (initialCategories && initialCategories.length) return // already seeded server-side
    fetch("/api/categories?home=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => Array.isArray(d?.categories) && setHomeCats(d.categories))
      .catch(() => {})
  }, [initialCategories])

  useEffect(() => {
    let cancelled = false
    // Featured overlay (only when SSR didn't seed it).
    if (!(initialFeatured && initialFeatured.length)) {
      fetch("/api/featured-scripts?status=active", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d?.featuredScripts?.length) setLiveFeatured(d.featuredScripts.map(mapFeatured))
        })
        .catch(() => {})
    }
    // Regular catalog for the discovery rows (only when SSR didn't seed it).
    if (!(initialScripts && initialScripts.length)) {
      fetch("/api/scripts", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && Array.isArray(d?.scripts)) setLiveScripts(d.scripts.map(mapScript))
        })
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [initialFeatured])

  const rows = useMemo(() => {
    // BOTH featured surfaces (the big hero "FEATURED SPOTLIGHT" and the
    // "Featured" carousel row) show ONLY real (paid) featured scripts — never a
    // catalog fallback, so nothing non-featured is ever mislabelled as featured.
    // When there are none, the hero gracefully shows just the "get featured here"
    // promo slide, and the Row component hides the empty carousel. The first 5
    // featured go to the hero; the row skips those to avoid duplicating them.
    // "Most Viewed" is real: sorted by each script's actual detail-page view
    // count (view_count), not just a copy of the newest-first list. This is an
    // all-time total (no per-week tracking exists yet), hence the label.
    const mostViewed = [...liveScripts].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    return {
      heroItems: liveFeatured.slice(0, 5),
      featured: liveFeatured.length > 5 ? liveFeatured.slice(5, 15) : [],
      trending: mostViewed.slice(0, 12),
      newReleases: liveScripts.slice(0, 12), // /api/scripts is ordered newest-first
      free: liveScripts.filter((s) => s.free).slice(0, 12),
    }
  }, [liveFeatured, liveScripts])

  // Per-category rows for the home-flagged categories — match scripts by category
  // (slug or name, case-insensitive). Only categories with items get a row.
  const categoryRows = useMemo(() => {
    return homeCats
      .map((cat) => {
        const key = cat.slug.toLowerCase()
        const name = cat.name.toLowerCase()
        const items = liveScripts
          .filter((s) => {
            const c = (s.category || "").toLowerCase()
            return c === key || c === name
          })
          .slice(0, 12)
        return { cat, items }
      })
      .filter((r) => r.items.length > 0)
  }, [homeCats, liveScripts])

  const onSearch = () => {
    const q = query.trim()
    router.push(q ? `/scripts?search=${encodeURIComponent(q)}` : "/scripts")
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#0a0a0a] text-white">
      <Navbar />

      <SideAdsFrame>
      <HeroSpotlight items={rows.heroItems} promo={content.heroPromo} />

      {/* Browse nav chips — shared with the props/browse pages (one canonical
          row site-wide). "Assets" is the active section on the home page. */}
      <section className="mt-5 px-2.5">
        <BrowseNav activeName="Assets" />
      </section>

      {/* Discovery rows */}
      <main className="mx-auto mt-8 w-full space-y-10 px-2.5">
        <Row title="Featured" icon={<Sparkles className="h-5 w-5 text-yellow-400" />} items={rows.featured} seeAllHref="/scripts?featured=true" />
        <Row title="Most Viewed" emoji="🔥" items={rows.trending} seeAllHref="/scripts" />
        <Row title="New Releases" icon={<Zap className="h-5 w-5 text-orange-400" />} items={rows.newReleases} seeAllHref="/scripts" />
        <Row title="Free Assets" icon={<Gift className="h-5 w-5 text-green-400" />} items={rows.free} seeAllHref="/scripts?free=true" />
        {categoryRows.map(({ cat, items }) => {
          const Icon = categoryIcon(cat.icon)
          return (
            <Row
              key={cat.slug}
              title={cat.name}
              icon={<Icon className="h-5 w-5 text-orange-400" />}
              items={items}
              seeAllHref={`/scripts?category=${cat.slug}`}
            />
          )
        })}
      </main>

      {/* Why Choose FiveCrux — bento (Variant 2) */}
      <section className="mt-20 px-2.5">
        <div className="mx-auto w-full">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">{content.whyChooseUs.eyebrow}</p>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{content.whyChooseUs.heading}</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Large hero tile */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8 backdrop-blur-md transition hover:border-orange-500/30 lg:row-span-2">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-orange-500/15 blur-3xl" />
              <div className="relative">
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10">
                  <Users className="h-8 w-8 text-orange-400" />
                </div>
                <h3 className="mb-4 text-3xl font-extrabold">{content.whyChooseUs.features[0]?.title}</h3>
                <p className="text-lg leading-relaxed text-white/60">{content.whyChooseUs.features[0]?.description}</p>
              </div>
              <div className="relative mt-10 flex items-center gap-2 text-sm font-semibold text-yellow-400">
                <Sparkles className="h-4 w-4" /><span>{content.whyChooseUs.tagline}</span>
              </div>
            </div>
            {/* Premium Quality */}
            <div className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-7 backdrop-blur-md transition hover:border-orange-500/30">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]"><Star className="h-6 w-6 text-white/70" /></div>
              <div><h3 className="mb-1.5 text-lg font-bold">{content.whyChooseUs.features[1]?.title}</h3><p className="text-sm leading-relaxed text-white/65">{content.whyChooseUs.features[1]?.description}</p></div>
            </div>
            {/* Security Verified */}
            <div className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-7 backdrop-blur-md transition hover:border-orange-500/30">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]"><Shield className="h-6 w-6 text-white/70" /></div>
              <div><h3 className="mb-1.5 text-lg font-bold">{content.whyChooseUs.features[2]?.title}</h3><p className="text-sm leading-relaxed text-white/65">{content.whyChooseUs.features[2]?.description}</p></div>
            </div>
            {/* Maximum Reach — wide */}
            <div className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-7 backdrop-blur-md transition hover:border-orange-500/30 lg:col-span-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]"><Megaphone className="h-6 w-6 text-white/70" /></div>
              <div><h3 className="mb-1.5 text-lg font-bold">{content.whyChooseUs.features[3]?.title}</h3><p className="text-sm leading-relaxed text-white/65">{content.whyChooseUs.features[3]?.description}</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Services / Crux Ecosystem — editorial banners (Variant 2) */}
      <section className="mt-20 px-2.5">
        <div className="mx-auto w-full">
          <div className="mb-12">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">{content.ecosystem.eyebrow}</p>
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">{content.ecosystem.heading}</h2>
          </div>
          <div className="space-y-6">
            {/* GameCrux — visual left */}
            <a href={content.ecosystem.cards[0]?.url} target="_blank" rel="noopener noreferrer"
              className="group flex flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md transition-all hover:border-orange-500/40 md:flex-row">
              <div className="relative flex items-center justify-center overflow-hidden p-12 md:w-2/5" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.25), rgba(20,20,20,0.4))" }}>
                <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at center, rgba(249,115,22,0.5), transparent 70%)" }} />
                <Image src="/gamecrux.webp" alt="GameCrux" width={96} height={96} className="relative rounded-2xl drop-shadow-2xl" />
              </div>
              <div className="flex flex-col justify-center p-8 sm:p-12 md:w-3/5">
                <span className="mb-3 text-xs font-semibold uppercase tracking-widest text-yellow-400/80">{content.ecosystem.cards[0]?.label}</span>
                <h3 className="mb-4 text-3xl font-extrabold sm:text-4xl">{content.ecosystem.cards[0]?.title}</h3>
                <p className="mb-7 max-w-lg text-lg leading-relaxed text-white/60">{content.ecosystem.cards[0]?.description}</p>
                <span className="inline-flex items-center gap-2 text-base font-semibold text-orange-400 transition-all group-hover:gap-3">{content.ecosystem.cards[0]?.linkText} <ArrowRight className="h-5 w-5" /></span>
              </div>
            </a>
            {/* Crux Studio — visual right */}
            <a href={content.ecosystem.cards[1]?.url} target="_blank" rel="noopener noreferrer"
              className="group flex flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md transition-all hover:border-orange-500/40 md:flex-row-reverse">
              <div className="relative flex items-center justify-center overflow-hidden p-12 md:w-2/5" style={{ background: "linear-gradient(135deg, rgba(250,204,21,0.22), rgba(20,20,20,0.4))" }}>
                <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at center, rgba(250,204,21,0.5), transparent 70%)" }} />
                <Image src="/cs.webp" alt="Crux Studio" width={96} height={96} className="relative rounded-2xl drop-shadow-2xl" />
              </div>
              <div className="flex flex-col justify-center p-8 sm:p-12 md:w-3/5 md:items-end md:text-right">
                <span className="mb-3 text-xs font-semibold uppercase tracking-widest text-yellow-400/80">{content.ecosystem.cards[1]?.label}</span>
                <h3 className="mb-4 text-3xl font-extrabold sm:text-4xl">{content.ecosystem.cards[1]?.title}</h3>
                <p className="mb-7 max-w-lg text-lg leading-relaxed text-white/60">{content.ecosystem.cards[1]?.description}</p>
                <span className="inline-flex items-center gap-2 text-base font-semibold text-orange-400 transition-all group-hover:gap-3">{content.ecosystem.cards[1]?.linkText} <ArrowRight className="h-5 w-5" /></span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* FAQ — two column (Variant 2) */}
      <section className="mt-20 px-2.5">
        <div className="mx-auto grid w-full gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left sticky intro */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-orange-400">{content.faq.eyebrow}</span>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{content.faq.heading}</h2>
            <p className="mt-5 max-w-md leading-relaxed text-white/60">{content.faq.intro}</p>
            <div className="mt-8 flex max-w-md items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-orange-500/30 bg-orange-500/15"><MessagesSquare className="h-5 w-5 text-orange-400" /></span>
              <div>
                <p className="text-sm font-semibold">{content.faq.contactTitle}</p>
                <p className="text-sm text-white/50">{content.faq.contactText}</p>
              </div>
            </div>
          </div>
          {/* Right accordion */}
          <div className="flex flex-col gap-3">
            {content.faq.items.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>
      </SideAdsFrame>

      <div className="mt-20">
        <Footer />
      </div>
    </div>
  )
}
