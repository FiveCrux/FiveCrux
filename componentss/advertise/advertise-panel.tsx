"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/componentss/ui/button"
import {
  Zap,
  TrendingUp,
  TargetIcon,
  BarChart3,
  Check,
  Star,
  ArrowRight,
  Sparkles,
  Crown,
  Loader2,
  ShoppingCart,
  LayoutGrid,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface PricingDuration {
  label: string
  months: number
  weeks?: number // For featured script slots
  // NOTE: the real price is NOT stored here — it comes live from Tebex
  // (fetched from /api/advertise/pricing). `originalPrice` is the marketing
  // strike-through reference only (no Tebex equivalent).
  originalPrice: number
}

interface PricingPackage {
  name: string
  packageId: string
  slotsPerMonth: number
  description: string
  gradient: string
  icon: typeof Zap
  popular?: boolean
  durations: PricingDuration[]
}

const pricingPackages: PricingPackage[] = [
  {
    name: "STARTER PACK",
    packageId: "starter",
    slotsPerMonth: 1,
    description: "Perfect for small businesses and individual creators. All slots unlocked immediately.",
    gradient: "from-gray-600 to-gray-700",
    icon: TargetIcon,
    durations: [
      { label: "1 Month", months: 1, originalPrice: 70 },
      { label: "3 Months", months: 3, originalPrice: 210 },
      { label: "6 Months", months: 6, originalPrice: 420 },
      { label: "Yearly", months: 12, originalPrice: 840 }
    ]
  },
  {
    name: "PREMIUM PACK",
    packageId: "premium",
    slotsPerMonth: 3,
    description: "Ideal for growing businesses with higher visibility needs. All slots unlocked immediately.",
    gradient: "from-orange-500 to-yellow-400",
    icon: TrendingUp,
    popular: true,
    durations: [
      { label: "1 Month", months: 1, originalPrice: 210 },
      { label: "3 Months", months: 3, originalPrice: 630 },
      { label: "6 Months", months: 6, originalPrice: 1260 },
      { label: "Yearly", months: 12, originalPrice: 2520 }
    ]
  },
  {
    name: "EXECUTIVE PACK",
    packageId: "executive",
    slotsPerMonth: 5,
    description: "Maximum exposure for established brands and agencies. All slots unlocked immediately.",
    gradient: "from-yellow-400 via-orange-500 to-red-500",
    icon: Crown,
    durations: [
      { label: "1 Month", months: 1, originalPrice: 350 },
      { label: "3 Months", months: 3, originalPrice: 1050 },
      { label: "6 Months", months: 6, originalPrice: 2100 },
      { label: "Yearly", months: 12, originalPrice: 4200 }
    ]
  }
]

// Featured Script Slot Packages (week-based pricing)
const featuredScriptPackages: PricingPackage[] = [
  {
    name: "STARTER PACK",
    packageId: "starter",
    slotsPerMonth: 1,
    description: "Perfect for showcasing one script. Slot unlocked immediately.",
    gradient: "from-purple-600 to-pink-600",
    icon: Star,
    durations: [
      { label: "1 Week", months: 0.25, weeks: 1, originalPrice: 40 },
      { label: "2 Weeks", months: 0.5, weeks: 2, originalPrice: 80 },
      { label: "4 Weeks", months: 1, weeks: 4, originalPrice: 160 },
      { label: "8 Weeks", months: 2, weeks: 8, originalPrice: 320 }
    ]
  },
  {
    name: "PREMIUM PACK",
    packageId: "premium",
    slotsPerMonth: 3,
    description: "Ideal for showcasing multiple scripts. All slots unlocked immediately.",
    gradient: "from-purple-500 to-pink-500",
    icon: Sparkles,
    popular: true,
    durations: [
      { label: "1 Week", months: 0.25, weeks: 1, originalPrice: 120 },
      { label: "2 Weeks", months: 0.5, weeks: 2, originalPrice: 240 },
      { label: "4 Weeks", months: 1, weeks: 4, originalPrice: 480 },
      { label: "8 Weeks", months: 2, weeks: 8, originalPrice: 960 }
    ]
  },
  {
    name: "EXECUTIVE PACK",
    packageId: "executive",
    slotsPerMonth: 5,
    description: "Maximum visibility for your scripts. All slots unlocked immediately.",
    gradient: "from-pink-500 via-purple-500 to-indigo-500",
    icon: Crown,
    durations: [
      { label: "1 Week", months: 0.25, weeks: 1, originalPrice: 200 },
      { label: "2 Weeks", months: 0.5, weeks: 2, originalPrice: 400 },
      { label: "4 Weeks", months: 1, weeks: 4, originalPrice: 800 },
      { label: "8 Weeks", months: 2, weeks: 8, originalPrice: 1200 }
    ]
  }
]

/* ----------------------------------------------------------------------------
 * What an advertiser actually gets. Honest, qualitative value props — no
 * fabricated reach/CTR numbers (FiveCrux has no analytics endpoint wired up
 * yet, so any number here would be made up). Swap to real metrics once
 * impression/click tracking exists.
 * -------------------------------------------------------------------------- */
const placementBenefits = [
  { title: "Homepage & search placement", desc: "Your slot shows where buyers are actually browsing — not buried in a sidebar.", accent: true },
  { title: "Featured for the full term", desc: "Stay highlighted for your whole booking — 1 month to a year, your choice.", accent: false },
  { title: "Direct link to your store", desc: "Every click sends buyers straight to your own site or product — no middle step.", accent: false },
]

export default function AdvertisePanel() {
  const heroRef = useRef<HTMLDivElement>(null)
  const pricingRef = useRef<HTMLDivElement>(null)

  // State for selected tab (ad slots or featured script slots)
  const [activeTab, setActiveTab] = useState<"ads" | "featured-scripts" | "side-banners">("ads")

  // State for selected duration index (shared across all packages)
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<number>(0)

  const [addingCartItemId, setAddingCartItemId] = useState<string | null>(null)

  // Live prices from Tebex (single source of truth). null = still loading.
  const [livePrices, setLivePrices] = useState<Record<string, number> | null>(null)
  const [pricingConfigured, setPricingConfigured] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/advertise/pricing")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setLivePrices(d?.prices || {})
        setPricingConfigured(d?.configured !== false)
      })
      .catch(() => {
        if (cancelled) return
        setLivePrices({})
        setPricingConfigured(false)
      })
    return () => { cancelled = true }
  }, [])

  // Live Tebex price for a package+duration, or null if not configured/priced yet.
  const livePriceFor = (
    packageType: "ads" | "featured-scripts",
    packageId: string,
    durationAmount: number
  ): number | null => {
    const v = livePrices?.[`${packageType}:${packageId}:${durationAmount}`]
    return typeof v === "number" ? v : null
  }

  const handleAddToCart = async (pkg: PricingPackage, durationIndex: number) => {
    const duration = pkg.durations[durationIndex]
    const packageType = activeTab === "ads" ? "ads" : "featured-scripts"
    const couponScope = activeTab === "ads" ? "Ad Slots" : "Featured Script Slots"
    const durationAmount = activeTab === "ads"
      ? duration.months
      : duration.weeks || Math.round(duration.months * 4)
    const itemId = `${packageType}:${pkg.packageId}:${durationAmount}`

    const livePrice = livePriceFor(packageType, pkg.packageId, durationAmount)
    if (livePrice == null) {
      toast.error("Pricing for this package isn't available yet.")
      return
    }

    setAddingCartItemId(itemId)

    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 15000)

    try {
      const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemType: "subscription",
          itemId,
          title: `${couponScope} - ${pkg.name} (${duration.label})`,
          price: livePrice, // display only; the server re-resolves the authoritative Tebex price
          metadata: {
            packageType,
            couponScope,
            category: couponScope,
            packageId: pkg.packageId,
            packageName: pkg.name,
            durationLabel: duration.label,
            durationMonths: duration.months,
            durationWeeks: activeTab === "featured-scripts" ? durationAmount : undefined,
            slotsPerMonth: pkg.slotsPerMonth,
            slotsToAdd: pkg.slotsPerMonth,
            originalPrice: duration.originalPrice,
          },
        }),
        signal: c.signal,
      })

      clearTimeout(t)

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || "Failed to add item to cart")
      }

      toast.success("Added to cart")
      window.dispatchEvent(new CustomEvent("cartUpdated"))
    } catch (error) {
      console.error("Add to cart error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to add item to cart")
    } finally {
      clearTimeout(t)
      setAddingCartItemId(null)
    }
  }

  // ── Side banner slots (4 scarce positions: each rail split top + bottom) ──
  // POSITION (FiveCrux-side scarcity, the 4 slots) is kept SEPARATE from the
  // DURATION package (Tebex, read live from the "SIDE ADVERTISEMENT" category).
  const SB_POSITIONS = [
    {
      side: "Left",
      slots: [
        { value: "left-top", label: "Top" },
        { value: "left-bottom", label: "Bottom" },
      ],
    },
    {
      side: "Right",
      slots: [
        { value: "right-top", label: "Top" },
        { value: "right-bottom", label: "Bottom" },
      ],
    },
  ] as const

  type SbSlot = "left-top" | "left-bottom" | "right-top" | "right-bottom"

  // Duration packages live from the Tebex "SIDE ADVERTISEMENT" category.
  type SbPackage = { id: number; name: string; price: number; currency: string; durationWeeks: number | null; recurring?: boolean }
  const [sbPackages, setSbPackages] = useState<SbPackage[] | null>(null) // null = still loading
  const [sbAvail, setSbAvail] = useState<Record<string, { available: boolean; until?: string | null }>>({
    "left-top": { available: true },
    "left-bottom": { available: true },
    "right-top": { available: true },
    "right-bottom": { available: true },
  })
  const [sbPosition, setSbPosition] = useState<SbSlot>("left-top")
  const [sbWeeks, setSbWeeks] = useState<number | null>(null)
  const [sbBusy, setSbBusy] = useState(false)

  // Open the "Side banners" tab when arriving via /advertise#side-banners.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#side-banners") {
      setActiveTab("side-banners")
    }
  }, [])

  useEffect(() => {
    let alive = true
    fetch("/api/side-banners")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.availability) setSbAvail(d.availability)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // Durations + prices come live from the Tebex "SIDE ADVERTISEMENT" category.
  useEffect(() => {
    let alive = true
    fetch("/api/side-banners/packages")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return
        const pkgs: SbPackage[] = Array.isArray(d?.packages) ? d.packages : []
        setSbPackages(pkgs)
        // Default the duration selector to the first package with a valid duration.
        const firstWeeks = pkgs.find((p) => typeof p.durationWeeks === "number")?.durationWeeks ?? null
        setSbWeeks((prev) => prev ?? firstWeeks)
      })
      .catch(() => {
        if (alive) setSbPackages([])
      })
    return () => {
      alive = false
    }
  }, [])

  // Only packages whose name encodes a duration are bookable via the position flow.
  const sbBookablePackages = (sbPackages ?? []).filter(
    (p): p is SbPackage & { durationWeeks: number } => typeof p.durationWeeks === "number"
  )
  const sbPriceFor = (w: number | null): number | null => {
    if (w == null) return null
    return sbBookablePackages.find((p) => p.durationWeeks === w)?.price ?? null
  }

  const handleSideBannerBuy = async () => {
    if (!sbAvail[sbPosition]?.available) {
      toast.error("That slot is currently taken — pick another one.")
      return
    }
    if (sbWeeks == null) {
      toast.error("Pick a duration first.")
      return
    }
    setSbBusy(true)
    try {
      const res = await fetch("/api/side-banners/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: sbPosition,
          durationWeeks: sbWeeks,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Checkout failed")
      if (data.authUrl) {
        window.location.href = data.authUrl
        return
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      toast.error("Could not start checkout")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed")
    } finally {
      setSbBusy(false)
    }
  }

  // Human label for the currently selected slot, e.g. "Left · Top".
  const sbPositionLabel = (() => {
    for (const group of SB_POSITIONS) {
      const slot = group.slots.find((s) => s.value === sbPosition)
      if (slot) return `${group.side} · ${slot.label}`
    }
    return sbPosition
  })()

  // Side-banner booking panel — rendered inside the "Side banners" tab below.
  const sideBannerPanel = (
    <div className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-2">
      {/* Availability — 4 slots grouped Left → Top/Bottom, Right → Top/Bottom */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/50">Live availability</h3>
        <div className="space-y-4">
          {SB_POSITIONS.map((group) => (
            <div key={group.side}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                {group.side} rail
              </div>
              <div className="grid grid-cols-2 gap-2">
                {group.slots.map((slot) => {
                  const free = sbAvail[slot.value]?.available !== false
                  return (
                    <button
                      key={slot.value}
                      onClick={() => free && setSbPosition(slot.value)}
                      disabled={!free}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-xl border px-3.5 py-3 text-left transition",
                        !free
                          ? "cursor-not-allowed border-white/[0.06] bg-white/[0.02] opacity-60"
                          : sbPosition === slot.value
                            ? "border-orange-500/60 bg-orange-500/10"
                            : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                      )}
                    >
                      <span className="text-sm font-semibold">{slot.label}</span>
                      <span className={cn("text-xs font-bold", free ? "text-green-400" : "text-white/45")}>
                        {free ? "Available" : "Sold"}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-white/40">
          Four slots exist site-wide — each rail is split top &amp; bottom. Sold slots free up automatically after their booking window ends.
        </p>
      </div>

      {/* Reserve form */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/50">Book a slot</h3>
        <label className="mb-1.5 block text-xs font-semibold text-white/60">Duration</label>
        {sbPackages === null ? (
          <div className="mb-4 h-[58px] animate-pulse rounded-xl bg-white/[0.06]" aria-label="Loading durations" />
        ) : sbBookablePackages.length === 0 ? (
          <div className="mb-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs text-white/45">
            Side-banner packages aren&apos;t available yet. Check back soon.
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap gap-2">
            {sbBookablePackages.map((pkg) => {
              const w = pkg.durationWeeks
              return (
                <button
                  key={pkg.id}
                  onClick={() => setSbWeeks(w)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-center transition",
                    sbWeeks === w ? "border-orange-500/60 bg-orange-500/10" : "border-white/[0.08] hover:border-white/20"
                  )}
                >
                  <div className="text-sm font-bold">{w} {w === 1 ? "week" : "weeks"}</div>
                  <div className="font-mono text-xs text-white/55">€{pkg.price}</div>
                  {pkg.recurring && (
                    <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-orange-400/80">Auto-renews</div>
                  )}
                </button>
              )
            })}
          </div>
        )}
        <div className="mb-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs leading-relaxed text-white/50">
          You&apos;re buying the <span className="text-white/80">{sbPositionLabel}</span> slot
          {sbWeeks != null && (
            <> for {sbWeeks} {sbWeeks === 1 ? "week" : "weeks"}</>
          )}
          . After checkout, upload your banner image &amp; link from
          <span className="text-white/80"> Profile → Side Banners</span> (change it anytime during your window).
        </div>
        <Button
          onClick={handleSideBannerBuy}
          disabled={sbBusy || sbWeeks == null || !sbAvail[sbPosition]?.available}
          className="w-full bg-orange-500 py-3 text-base font-bold text-black hover:bg-orange-400 disabled:opacity-60"
        >
          {sbBusy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Buy {sbPositionLabel} slot{sbPriceFor(sbWeeks) != null ? ` · €${sbPriceFor(sbWeeks)}` : ""}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </>
          )}
        </Button>
        <p className="mt-3 text-center text-[11px] text-white/40">
          Secured via Tebex. The slot is held for you for 15 minutes while you pay.
        </p>
      </div>
    </div>
  )

  // Get current packages based on active tab
  const currentPackages = activeTab === "ads" ? pricingPackages : featuredScriptPackages

  return (
    <div className="text-white antialiased selection:bg-[#f97316]/30">
      {/* ===== STATS HERO ===== */}
      <section
        className="overflow-hidden rounded-3xl border border-white/[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(70% 60% at 50% 0%, rgba(249,115,22,0.16), transparent 70%)",
        }}
      >
        <div className="mx-auto max-w-7xl px-5 pt-12 pb-12">
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
              <TrendingUp className="h-3.5 w-3.5 text-[#f97316]" />
              Advertising plans
            </span>
            <h1 className="mt-7 text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Advertise on <span className="text-[#f97316]">FiveCrux</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/55">
              Put your scripts, server, or brand in front of thousands of active FiveM
              server owners.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={() => pricingRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="h-11 w-full rounded-xl border-none bg-[#f97316] px-6 text-sm font-semibold text-black shadow-[0_0_24px_rgba(249,115,22,0.25)] hover:bg-[#ea6c0a] sm:w-auto"
              >
                View pricing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* what you get — honest value props (no fabricated metrics) */}
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.04] sm:grid-cols-3">
            {placementBenefits.map((b) => (
              <div key={b.title} className="bg-[#0a0a0a] px-7 py-9">
                <div
                  className={cn(
                    "text-lg font-extrabold tracking-tight",
                    b.accent ? "text-[#f97316]" : "text-white"
                  )}
                >
                  {b.title}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PACKAGES ===== */}
      <section
        ref={pricingRef}
        className="mt-8 scroll-mt-24 rounded-3xl border border-white/[0.07] bg-white/[0.015]"
      >
        <div className="mx-auto max-w-7xl px-5 py-16">
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f97316]">
              Packages
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Reach that scales with your budget
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/50">
              Banner Ad Slots &amp; Featured Script Slots, in three packages. Compare at a
              glance.
            </p>
          </div>

          {/* Controls: tab toggle + duration selector */}
          <div className="mt-10 flex flex-col items-center gap-3.5">
            {/* Slot Type Toggle */}
            <div className="flex items-center rounded-[10px] border border-white/[0.08] bg-white/[0.04] p-1">
              <button
                onClick={() => {
                  setActiveTab("ads")
                  setSelectedDurationIndex(0)
                }}
                className={cn(
                  "rounded-[7px] px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                  activeTab === "ads"
                    ? "bg-[#f97316] text-black shadow-sm"
                    : "text-white/55 hover:text-white/80"
                )}
              >
                Ad slots
              </button>
              <button
                onClick={() => {
                  setActiveTab("featured-scripts")
                  setSelectedDurationIndex(0)
                }}
                className={cn(
                  "rounded-[7px] px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                  activeTab === "featured-scripts"
                    ? "bg-[#f97316] text-black shadow-sm"
                    : "text-white/55 hover:text-white/80"
                )}
              >
                Featured script slots
              </button>
              <button
                onClick={() => setActiveTab("side-banners")}
                className={cn(
                  "rounded-[7px] px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                  activeTab === "side-banners"
                    ? "bg-[#f97316] text-black shadow-sm"
                    : "text-white/55 hover:text-white/80"
                )}
              >
                Side banners
              </button>
            </div>

            {/* Duration Selector (hidden for side banners — they use weeks in their own panel) */}
            {activeTab !== "side-banners" && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {currentPackages[0].durations.map((duration, durIndex) => {
                const isActive = selectedDurationIndex === durIndex
                const savingsBadges = [null, "-43%", "-52%", "-57%"]
                const badge = savingsBadges[durIndex]

                return (
                  <button
                    key={durIndex}
                    onClick={() => setSelectedDurationIndex(durIndex)}
                    className={cn(
                      "relative rounded-lg border px-4 py-2 text-xs font-semibold transition-all duration-200",
                      isActive
                        ? "border-[#f97316]/40 bg-[#f97316]/[0.08] text-white"
                        : "border-white/[0.08] bg-white/[0.02] text-white/55 hover:text-white/80"
                    )}
                  >
                    {duration.label}
                    {badge && (
                      <span className="absolute -right-1.5 -top-2 rounded bg-[#f97316] px-1 py-px text-[9px] font-bold leading-none text-black">
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            )}
          </div>

          {/* Body: side-banner booking OR pricing cards */}
          {activeTab === "side-banners" ? (
            sideBannerPanel
          ) : (
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {currentPackages.map((pkg, index) => {
              const selectedDuration = pkg.durations[selectedDurationIndex]
              const durationAmount =
                activeTab === "ads"
                  ? selectedDuration.months
                  : selectedDuration.weeks || Math.round(selectedDuration.months * 4)
              const livePrice = livePriceFor(activeTab as "ads" | "featured-scripts", pkg.packageId, durationAmount)
              const priceLoading = livePrices === null
              const discount =
                livePrice != null && selectedDuration.originalPrice > 0
                  ? Math.round(((selectedDuration.originalPrice - livePrice) / selectedDuration.originalPrice) * 100)
                  : 0
              const cartItemId = `${activeTab === "ads" ? "ads" : "featured-scripts"}:${pkg.packageId}:${durationAmount}`
              const isAddingToCart = addingCartItemId === cartItemId

              // Features list
              const packageFeatures =
                activeTab === "ads"
                  ? [
                      {
                        text: `${pkg.slotsPerMonth} ad slot${pkg.slotsPerMonth > 1 ? "s" : ""} (unlocked instantly)`,
                        icon: Check,
                      },
                      { text: "Featured placement in marketplace", icon: Star },
                      { text: "Real-time analytics dashboard", icon: BarChart3 },
                      { text: "24/7 Discord support access", icon: MessageSquare },
                    ]
                  : [
                      {
                        text: `${pkg.slotsPerMonth} featured script slot${pkg.slotsPerMonth > 1 ? "s" : ""}`,
                        icon: Check,
                      },
                      { text: "Premium homepage placement", icon: Star },
                      { text: "Real-time analytics dashboard", icon: BarChart3 },
                      { text: "24/7 Discord support access", icon: MessageSquare },
                    ]

              const isPopular = pkg.popular
              const perLabel =
                activeTab === "ads"
                  ? `${selectedDuration.months} mo`
                  : `${selectedDuration.weeks || Math.round(selectedDuration.months * 4)} wk`

              return (
                <motion.div
                  key={pkg.packageId}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
                  className={cn(
                    "relative flex flex-col rounded-3xl p-7 transition-all duration-200",
                    isPopular
                      ? "bg-[#f97316]/[0.06] ring-1 ring-inset ring-[#f97316]/40 md:scale-[1.02]"
                      : "border border-white/[0.07] bg-white/[0.025] hover:border-[#f97316]/25"
                  )}
                  style={{
                    boxShadow: isPopular ? "0 0 40px rgba(249,115,22,0.14)" : "none",
                  }}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#f97316] px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-black">
                      Most popular
                    </div>
                  )}

                  <div className="flex-1">
                    {/* Plan label */}
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                      {activeTab === "ads" ? "Ad Slots" : "Featured Script"}
                    </div>

                    {/* Plan name */}
                    <div className="mt-2 text-xl font-bold text-white">{pkg.name}</div>

                    {/* Description */}
                    <p className="mt-2 text-[12px] leading-normal text-white/55">
                      {pkg.description}
                    </p>

                    {/* Slots badge */}
                    <div className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-[#f97316]/15 bg-[#f97316]/[0.08] px-2 py-0.5 text-xs font-semibold text-[#f97316]">
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span>
                        {pkg.slotsPerMonth} slot{pkg.slotsPerMonth > 1 ? "s" : ""}{" "}
                        {activeTab === "ads" ? "per month" : "per week"}
                      </span>
                    </div>

                    {/* Price block — live from Tebex */}
                    <div className="mt-6">
                      {priceLoading ? (
                        <div className="h-[68px] animate-pulse rounded-md bg-white/[0.06]" aria-label="Loading price" />
                      ) : livePrice == null ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-extrabold tracking-tight text-white/70">
                            Coming soon
                          </span>
                        </div>
                      ) : (
                        <>
                          {selectedDuration.originalPrice > livePrice && (
                            <div className="text-[12px] tabular-nums text-white/55 line-through">
                              €{selectedDuration.originalPrice}
                            </div>
                          )}
                          <div className="mt-0.5 flex items-baseline gap-1.5">
                            <span className="text-4xl font-extrabold tracking-tight tabular-nums text-white">
                              €{livePrice}
                            </span>
                            <span className="text-xs font-medium text-white/55">/ {perLabel}</span>
                          </div>
                          {discount > 0 && (
                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/25">
                              <Check className="h-3.5 w-3.5" />
                              <span className="tabular-nums">
                                Save €{selectedDuration.originalPrice - livePrice} ({discount}%)
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="my-6 h-px bg-white/[0.07]" />

                    {/* Feature list */}
                    <ul className="space-y-3">
                      {packageFeatures.map((feat, fidx) => {
                        const FeatIcon = feat.icon
                        return (
                          <li key={fidx} className="flex items-center gap-2.5">
                            <FeatIcon className="h-[15px] w-[15px] flex-shrink-0 text-[#f97316]" />
                            <span className="text-[12px] leading-snug text-white/[0.6]">
                              {feat.text}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <Button
                    type="button"
                    onClick={() => handleAddToCart(pkg, selectedDurationIndex)}
                    disabled={isAddingToCart || priceLoading || livePrice == null}
                    className={cn(
                      "mt-8 h-11 w-full rounded-xl text-[13px] font-semibold transition-all duration-200",
                      isPopular
                        ? "border-none bg-[#f97316] text-black shadow-sm hover:bg-orange-400"
                        : "border border-white/[0.1] bg-white/[0.06] text-white/80 hover:bg-white/[0.1] hover:text-white"
                    )}
                  >
                    {isAddingToCart ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="mr-2 h-4 w-4" />
                    )}
                    {isAddingToCart
                      ? "Adding..."
                      : priceLoading
                        ? "Loading…"
                        : livePrice == null
                          ? "Unavailable"
                          : "Add to Cart"}
                  </Button>
                </motion.div>
              )
            })}
          </div>
          )}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        {/* final CTA */}
        <div className="mx-auto mt-12 max-w-3xl rounded-3xl bg-gradient-to-br from-[#f97316] to-orange-600 p-8 text-center text-black md:p-10">
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            Ready to get in front of FiveM?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium text-black/70">
            Choose a slot, submit your creative, and go live — usually within hours.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              onClick={() => pricingRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="group h-auto rounded-2xl border-none bg-black px-6 py-3.5 font-bold text-white hover:bg-black/85"
            >
              View packages
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
