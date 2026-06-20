"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { Button } from "@/componentss/ui/button"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import {
  Zap,
  TrendingUp,
  TargetIcon,
  BarChart3,
  Check,
  Star,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Crown,
  Loader2,
  ShoppingCart,
  LayoutGrid,
  MessageSquare,
  BadgeCheck,
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
 * Presentational demo data (reach stats / chart / trusted-by / testimonial).
 * These are illustrative only — no real analytics endpoint is wired up.
 * -------------------------------------------------------------------------- */
const reachStats = [
  { value: 2400, suffix: "+", decimals: 0, label: "Active servers reached", accent: false },
  { value: 48, suffix: "k+", decimals: 0, label: "Monthly ad views", accent: false },
  { value: 8.4, suffix: "%", decimals: 1, label: "Average click-through", accent: true },
]

const viewsTrend = [
  { month: "Jan", x: 0, y: 160 },
  { month: "Feb", x: 75, y: 150 },
  { month: "Mar", x: 150, y: 165 },
  { month: "Apr", x: 225, y: 120 },
  { month: "May", x: 375, y: 90 },
  { month: "Jun", x: 600, y: 40 },
]

const placementBars = [
  { label: "Listing", height: 46, tone: "bg-white/15" },
  { label: "Search", height: 68, tone: "bg-white/25" },
  { label: "Homepage", height: 100, tone: "bg-gradient-to-t from-orange-600 to-[#f97316]", accent: true },
]

const trustedCreators = [
  { name: "CruxDev", letter: "C", from: "from-orange-500", to: "to-amber-400", text: "text-black", verified: true },
  { name: "MapMasters", letter: "M", from: "from-violet-500", to: "to-indigo-600", text: "text-white", verified: true },
  { name: "NightShift", letter: "N", from: "from-sky-500", to: "to-blue-700", text: "text-white", verified: true },
  { name: "HighRoller", letter: "H", from: "from-yellow-500", to: "to-amber-700", text: "text-black", verified: true },
  { name: "PixelForge", letter: "P", from: "from-emerald-500", to: "to-green-700", text: "text-black", verified: false },
]

/* Count-up hook — fires when the element scrolls into view (subtle, demo only) */
function useCountUp(target: number, decimals: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration])

  return Number(value.toFixed(decimals)).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function ReachStat({ stat, active }: { stat: typeof reachStats[number]; active: boolean }) {
  const display = useCountUp(stat.value, stat.decimals, active)
  return (
    <div className="bg-[#0a0a0a] px-8 py-10 text-center">
      <div
        className={cn(
          "text-5xl md:text-6xl font-extrabold tracking-tight tabular-nums",
          stat.accent ? "text-[#f97316]" : "text-white"
        )}
      >
        {display}
        {stat.suffix}
      </div>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
        {stat.label}
      </div>
    </div>
  )
}

export default function AdvertisePage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const pricingRef = useRef<HTMLDivElement>(null)

  const statsRef = useRef<HTMLDivElement>(null)
  const statsInView = useInView(statsRef, { once: true, amount: 0.4 })

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInView = useInView(chartRef, { once: true, amount: 0.3 })

  // State for selected tab (ad slots or featured script slots)
  const [activeTab, setActiveTab] = useState<"ads" | "featured-scripts">("ads")

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

  // Get current packages based on active tab
  const currentPackages = activeTab === "ads" ? pricingPackages : featuredScriptPackages

  // Build the inline SVG path from the demo trend points
  const linePath = viewsTrend.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const fillPath = `${linePath} L600,200 L0,200 Z`
  const lastPoint = viewsTrend[viewsTrend.length - 1]

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] text-white antialiased selection:bg-[#f97316]/30">
        {/* ===== STATS HERO ===== */}
        <section
          className="border-b border-white/[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(70% 60% at 50% 0%, rgba(249,115,22,0.16), transparent 70%)",
          }}
        >
          <div className="mx-auto max-w-7xl px-5 pt-28 pb-12 sm:pt-32 md:pt-36">
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

            {/* big animated stat blocks */}
            <div
              ref={statsRef}
              className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.04] sm:grid-cols-3"
            >
              {reachStats.map((stat) => (
                <ReachStat key={stat.label} stat={stat} active={statsInView} />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/55">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live across the marketplace right now
            </div>
          </div>
        </section>

        {/* ===== VISIBILITY VISUAL ===== */}
        <section ref={chartRef} className="mx-auto max-w-7xl px-5 py-16">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* line chart: monthly views trend */}
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-7 lg:col-span-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Monthly ad views
                  </div>
                  <div className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">
                    48,200
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/25">
                  <ArrowUpRight className="h-3.5 w-3.5" /> +32% QoQ
                </span>
              </div>
              <svg
                viewBox="0 0 600 200"
                className="mt-6 w-full"
                preserveAspectRatio="none"
                role="img"
                aria-label="Monthly views trend line"
              >
                <defs>
                  <linearGradient id="advViewsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="50" x2="600" y2="50" stroke="rgba(255,255,255,0.05)" />
                <line x1="0" y1="100" x2="600" y2="100" stroke="rgba(255,255,255,0.05)" />
                <line x1="0" y1="150" x2="600" y2="150" stroke="rgba(255,255,255,0.05)" />
                <path d={fillPath} fill="url(#advViewsFill)" />
                <motion.path
                  d={linePath}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={chartInView ? { pathLength: 1 } : { pathLength: 0 }}
                  transition={{ duration: 1.6, ease: "easeOut" }}
                />
                <motion.circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r="4"
                  fill="#f97316"
                  initial={{ opacity: 0 }}
                  animate={chartInView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ delay: 1.4, duration: 0.4 }}
                />
              </svg>
              <div className="mt-3 flex justify-between text-[11px] tabular-nums text-white/55">
                {viewsTrend.map((p) => (
                  <span key={p.month}>{p.month}</span>
                ))}
              </div>
            </div>

            {/* bar chart: clicks by placement */}
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-7 lg:col-span-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                Clicks by placement
              </div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">4,072</div>
              <div className="mt-7 flex h-44 items-end justify-around gap-4">
                {placementBars.map((bar, i) => (
                  <div key={bar.label} className="flex h-full flex-col items-center justify-end">
                    <motion.div
                      className={cn("w-9 rounded-t-lg", bar.tone)}
                      initial={{ height: 0 }}
                      animate={chartInView ? { height: `${bar.height}%` } : { height: 0 }}
                      transition={{ duration: 1.1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <span
                      className={cn(
                        "mt-3 text-[10px] font-semibold uppercase tracking-[0.18em]",
                        bar.accent ? "text-[#f97316]" : "text-white/55"
                      )}
                    >
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs text-white/55">
                Homepage spotlight drives{" "}
                <span className="font-semibold text-white">2.1×</span> the clicks of standard
                listing placement.
              </p>
            </div>
          </div>
        </section>

        {/* ===== PACKAGES ===== */}
        <section
          ref={pricingRef}
          className="scroll-mt-24 border-y border-white/[0.07] bg-white/[0.015]"
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
              </div>

              {/* Duration Selector */}
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
            </div>

            {/* Pricing Cards Grid */}
            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
              {currentPackages.map((pkg, index) => {
                const selectedDuration = pkg.durations[selectedDurationIndex]
                const durationAmount =
                  activeTab === "ads"
                    ? selectedDuration.months
                    : selectedDuration.weeks || Math.round(selectedDuration.months * 4)
                const livePrice = livePriceFor(activeTab, pkg.packageId, durationAmount)
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
          </div>
        </section>

        {/* ===== TRUSTED BY + TESTIMONIAL + CTA ===== */}
        <section className="mx-auto max-w-7xl px-5 py-16">
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
              Trusted by creators advertising on FiveCrux
            </div>
          </div>
          <div className="mx-auto mt-7 flex max-w-4xl flex-wrap items-center justify-center gap-3">
            {trustedCreators.map((creator) => (
              <span
                key={creator.name}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] px-4 py-2 text-sm font-semibold"
              >
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br text-[11px] font-black",
                    creator.from,
                    creator.to,
                    creator.text
                  )}
                >
                  {creator.letter}
                </span>
                {creator.name}
                {creator.verified && <BadgeCheck className="h-4 w-4 text-[#f97316]" />}
              </span>
            ))}
          </div>

          <figure className="mx-auto mt-12 max-w-3xl rounded-3xl border border-white/[0.07] bg-white/[0.02] p-8 text-center md:p-10">
            <div className="flex justify-center gap-1 text-[#f97316]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <blockquote className="mt-5 text-xl font-semibold leading-relaxed tracking-tight md:text-2xl">
              &ldquo;We boosted our garage script into the homepage spotlight for two weeks and
              did <span className="tabular-nums text-[#f97316]">3×</span> our normal sales. The
              real-time analytics made it easy to justify the spend.&rdquo;
            </blockquote>
            <figcaption className="mt-6 flex items-center justify-center gap-3 text-sm">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 font-black text-black">
                C
              </span>
              <span>
                <span className="font-semibold">CruxDev</span>{" "}
                <span className="text-white/55">· 12.4k sales · Verified seller</span>
              </span>
            </figcaption>
          </figure>

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

        <Footer />
      </main>
    </>
  )
}
