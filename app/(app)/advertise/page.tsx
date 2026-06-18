"use client"

import { useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/componentss/ui/tabs"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars"
import { HexagonBackground } from "@/components/animate-ui/components/backgrounds/hexagon"
import {
  Zap,
  TrendingUp,
  TargetIcon,
  BarChart3,
  Users,
  Check,
  Star,
  ArrowRight,
  Sparkles,
  Eye,
  MousePointerClick,
  Calendar,
  Award,
  Crown,
  Loader2,
  Tag,
  ShoppingCart,
  LayoutGrid,
  MessageSquare,
  Sliders,
  Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { toast } from "sonner"
interface PricingDuration {
  label: string
  months: number
  weeks?: number // For featured script slots
  price: number
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
      { label: "1 Month", months: 1, price: 40, originalPrice: 70 },
      { label: "3 Months", months: 3, price: 110, originalPrice: 210 },
      { label: "6 Months", months: 6, price: 200, originalPrice: 420 },
      { label: "Yearly", months: 12, price: 360, originalPrice: 840 }
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
      { label: "1 Month", months: 1, price: 100, originalPrice: 210 },
      { label: "3 Months", months: 3, price: 275, originalPrice: 630 },
      { label: "6 Months", months: 6, price: 500, originalPrice: 1260 },
      { label: "Yearly", months: 12, price: 900, originalPrice: 2520 }
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
      { label: "1 Month", months: 1, price: 150, originalPrice: 350 },
      { label: "3 Months", months: 3, price: 420, originalPrice: 1050 },
      { label: "6 Months", months: 6, price: 750, originalPrice: 2100 },
      { label: "Yearly", months: 12, price: 1350, originalPrice: 4200 }
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
      { label: "1 Week", months: 0.25, weeks: 1, price: 20, originalPrice: 40 },
      { label: "2 Weeks", months: 0.5, weeks: 2, price: 35, originalPrice: 80 },
      { label: "4 Weeks", months: 1, weeks: 4, price: 60, originalPrice: 160 },
      { label: "8 Weeks", months: 2, weeks: 8, price: 100, originalPrice: 320 }
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
      { label: "1 Week", months: 0.25, weeks: 1, price: 50, originalPrice: 120 },
      { label: "2 Weeks", months: 0.5, weeks: 2, price: 80, originalPrice: 240 },
      { label: "4 Weeks", months: 1, weeks: 4, price: 150, originalPrice: 480 },
      { label: "8 Weeks", months: 2, weeks: 8, price: 260, originalPrice: 960 }
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
      { label: "1 Week", months: 0.25, weeks: 1, price: 80, originalPrice: 200 },
      { label: "2 Weeks", months: 0.5, weeks: 2, price: 120, originalPrice: 400 },
      { label: "4 Weeks", months: 1, weeks: 4, price: 220, originalPrice: 800 },
      { label: "8 Weeks", months: 2, weeks: 8, price: 400, originalPrice: 1200 }
    ]
  }
]

const benefitsData = [
  {
    title: "Maximum Visibility",
    description: "Reach thousands of active FiveM server owners and developers directly.",
    metric: "500K+ monthly impressions",
    icon: Eye,
    iconBg: "rgba(249,115,22,0.12)",
    iconColor: "#f97316"
  },
  {
    title: "High Click-Through Rates",
    description: "Targeted audience ensures optimal engagement and conversions.",
    metric: "8.4% average click-through rate",
    icon: MousePointerClick,
    iconBg: "rgba(29,158,117,0.12)",
    iconColor: "#1d9e75"
  },
  {
    title: "Flexible Campaigns",
    description: "Choose your own duration and adjust your slot count dynamically.",
    metric: "1 week to 12 months",
    icon: Sliders,
    iconBg: "rgba(74,140,230,0.12)",
    iconColor: "#4a8ce6"
  },
  {
    title: "Proven Results",
    description: "Join hundreds of sellers who have scaled their FiveM script sales.",
    metric: "2.5x average ROI increase",
    icon: Trophy,
    iconBg: "rgba(140,90,220,0.12)",
    iconColor: "#8c5adc"
  }
]

export default function AdvertisePage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const pricingRef = useRef<HTMLDivElement>(null)
  const benefitsRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()

  // State for selected tab (ad slots or featured script slots)
  const [activeTab, setActiveTab] = useState<"ads" | "featured-scripts">("ads")

  // State for selected duration index (shared across all packages)
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<number>(0)

  const [addingCartItemId, setAddingCartItemId] = useState<string | null>(null)

  const handleAddToCart = async (pkg: PricingPackage, durationIndex: number) => {
    const duration = pkg.durations[durationIndex]
    const packageType = activeTab === "ads" ? "ads" : "featured-scripts"
    const couponScope = activeTab === "ads" ? "Ad Slots" : "Featured Script Slots"
    const durationAmount = activeTab === "ads"
      ? duration.months
      : duration.weeks || Math.round(duration.months * 4)
    const itemId = `${packageType}:${pkg.packageId}:${durationAmount}`

    setAddingCartItemId(itemId)

    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 8000)

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
          price: duration.price,
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

  return (
    <>
      <Navbar />
      <div
        className="min-h-screen text-white relative overflow-hidden pb-16"
        style={{
          backgroundColor: "#0d0d0f",
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            radial-gradient(circle at 50% 0%, rgba(249, 115, 22, 0.07) 0%, transparent 60%)
          `,
          backgroundSize: "60px 100%, 100% 100%",
        }}
      >
        {/* Hero Section */}
        <motion.div
          ref={heroRef}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-7xl mx-auto pt-28 sm:pt-32 pb-8 px-6 sm:px-10 flex flex-col items-center text-center gap-6"
        >
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-1 bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] text-[11px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
            <Sparkles className="w-3 h-3 mr-1" />
            Advertising plans
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-[56px] font-extrabold text-white tracking-tight leading-[1.05] max-w-4xl">
            Advertise on <span className="text-[#f97316]">FiveCrux</span> —
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#f97316] to-[#facc15] bg-clip-text text-transparent">
              {" "}reach thousands
            </span>{" "}
            of FiveM server owners
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-white/40 max-w-xl leading-relaxed">
            Put your scripts, servers, and brand in front of the most active and engaged
            FiveM community with premium targeted advertising placements.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 w-full sm:w-auto">
            <Button
              type="button"
              onClick={() => pricingRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#f97316] hover:bg-[#ea6c0a] text-white text-sm font-semibold border-none shadow-[0_0_24px_rgba(249,115,22,0.25)]"
            >
              View pricing
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              type="button"
              onClick={() => benefitsRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/80 hover:bg-white/[0.1] hover:text-white text-sm font-semibold"
            >
              Why advertise?
            </Button>
          </div>
        </motion.div>

        {/* Trust Bar */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 mb-16 max-w-5xl mx-auto px-6 sm:px-10">
          <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-lg p-[8px_16px]">
            <Users className="w-5 h-5 text-[#f97316]" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-lg font-bold text-white">2,400+</span>
              <span className="text-[12px] text-white/35">active buyers</span>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-white/[0.07] hidden md:block" />
          
          <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-lg p-[8px_16px]">
            <Award className="w-5 h-5 text-[#f97316]" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-lg font-bold text-white">500+</span>
              <span className="text-[12px] text-white/35">advertisers served</span>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-white/[0.07] hidden md:block" />

          <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-lg p-[8px_16px]">
            <TrendingUp className="w-5 h-5 text-[#f97316]" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-lg font-bold text-white">8.4%</span>
              <span className="text-[12px] text-white/35">avg click-through rate</span>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-white/[0.07] hidden md:block" />

          <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-lg p-[8px_16px]">
            <Zap className="w-5 h-5 text-[#f97316]" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-lg font-bold text-white">Live</span>
              <span className="text-[12px] text-white/35">instantly on purchase</span>
            </div>
          </div>
        </div>

        {/* Controls and Pricing Section */}
        <div ref={pricingRef} className="max-w-7xl mx-auto mb-16 scroll-mt-24">
          {/* Controls Section */}
          <div className="flex flex-col items-center gap-[14px] mb-12 px-6">
            {/* Slot Type Toggle */}
            <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-[10px] p-1">
              <button
                onClick={() => {
                  setActiveTab("ads");
                  setSelectedDurationIndex(0);
                }}
                className={cn(
                  "px-4 py-1.5 rounded-[7px] text-xs font-semibold transition-all duration-200",
                  activeTab === "ads"
                    ? "bg-[#f97316] text-white shadow-sm"
                    : "text-white/40 hover:text-white/80"
                )}
              >
                Ad slots
              </button>
              <button
                onClick={() => {
                  setActiveTab("featured-scripts");
                  setSelectedDurationIndex(0);
                }}
                className={cn(
                  "px-4 py-1.5 rounded-[7px] text-xs font-semibold transition-all duration-200",
                  activeTab === "featured-scripts"
                    ? "bg-[#f97316] text-white shadow-sm"
                    : "text-white/40 hover:text-white/80"
                )}
              >
                Featured script slots
              </button>
            </div>

            {/* Duration Selector */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {currentPackages[0].durations.map((duration, durIndex) => {
                const isActive = selectedDurationIndex === durIndex;
                const savingsBadges = [null, "-43%", "-52%", "-57%"];
                const badge = savingsBadges[durIndex];

                return (
                  <button
                    key={durIndex}
                    onClick={() => setSelectedDurationIndex(durIndex)}
                    className={cn(
                      "relative px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-200",
                      isActive
                        ? "bg-[#f97316]/[0.08] border-[#f97316]/40 text-white"
                        : "bg-white/[0.02] border-white/[0.08] text-white/45 hover:text-white/80"
                    )}
                  >
                    {duration.label}
                    {badge && (
                      <span
                        className="absolute bg-[#f97316] text-white font-bold"
                        style={{
                          top: "-8px",
                          right: "-6px",
                          fontSize: "9px",
                          borderRadius: "4px",
                          padding: "1px 4px",
                          lineHeight: "1",
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 sm:px-10">
            {currentPackages.map((pkg, index) => {
              const selectedDuration = pkg.durations[selectedDurationIndex];
              const discount = Math.round(((selectedDuration.originalPrice - selectedDuration.price) / selectedDuration.originalPrice) * 100);
              const durationAmount = activeTab === "ads"
                ? selectedDuration.months
                : selectedDuration.weeks || Math.round(selectedDuration.months * 4);
              const cartItemId = `${activeTab === "ads" ? "ads" : "featured-scripts"}:${pkg.packageId}:${durationAmount}`;
              const isAddingToCart = addingCartItemId === cartItemId;

              // Features list
              const packageFeatures = activeTab === "ads" ? [
                { text: `${pkg.slotsPerMonth} ad slot${pkg.slotsPerMonth > 1 ? 's' : ''} (unlocked instantly)`, icon: Check },
                { text: "Featured placement in marketplace", icon: Star },
                { text: "Real-time analytics dashboard", icon: BarChart3 },
                { text: "24/7 Discord support access", icon: MessageSquare }
              ] : [
                { text: `${pkg.slotsPerMonth} featured script slot${pkg.slotsPerMonth > 1 ? 's' : ''}`, icon: Check },
                { text: "Premium homepage placement", icon: Star },
                { text: "Real-time analytics dashboard", icon: BarChart3 },
                { text: "24/7 Discord support access", icon: MessageSquare }
              ];

              const isPopular = pkg.popular;

              return (
                <motion.div
                  key={pkg.packageId}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
                  className={cn(
                    "relative bg-[#16161a] rounded-2xl p-[24px_22px] flex flex-col justify-between transition-all duration-200 hover:-translate-y-1",
                    isPopular
                      ? "border-2 border-[#f97316] md:scale-[1.03]"
                      : "border border-white/5 hover:border-[#f97316]/25"
                  )}
                  style={{
                    boxShadow: isPopular ? "0 0 24px rgba(249, 115, 22, 0.18)" : "none",
                  }}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#f97316] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                      Most popular
                    </div>
                  )}

                  <div>
                    {/* Plan label */}
                    <div className="text-[10px] uppercase font-semibold text-white/25 mb-1">
                      {activeTab === "ads" ? "Ad Slots" : "Featured Script"}
                    </div>

                    {/* Plan name */}
                    <div className="text-lg font-bold text-white mb-2">
                      {pkg.name}
                    </div>

                    {/* Description */}
                    <div className="text-[12px] text-white/35 leading-normal mb-4">
                      {pkg.description}
                    </div>

                    {/* Slots badge */}
                    <div className="inline-flex items-center gap-1.5 bg-[#f97316]/[0.08] border border-[#f97316]/15 text-[#f97316] text-xs font-semibold px-2 py-0.5 rounded-md mb-6">
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>
                        {pkg.slotsPerMonth} slot{pkg.slotsPerMonth > 1 ? 's' : ''} {activeTab === "ads" ? "per month" : "per week"}
                      </span>
                    </div>

                    {/* Old Price */}
                    <div className="text-[12px] line-through text-white/25 mb-0.5">
                      €{selectedDuration.originalPrice}
                    </div>

                    {/* Main Price */}
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-bold text-white">€{selectedDuration.price}</span>
                      <span className="text-xs text-white/35 font-normal">
                        / {activeTab === "ads" ? `${selectedDuration.months} mo` : `${selectedDuration.weeks || Math.round(selectedDuration.months * 4)} wk`}
                      </span>
                    </div>

                    {/* Savings line */}
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[#1d9e75] mb-6">
                      <Check className="w-3.5 h-3.5" />
                      <span>Save €{selectedDuration.originalPrice - selectedDuration.price} ({discount}%)</span>
                    </div>

                    {/* Divider */}
                    <div className="h-[1px] bg-white/[0.06] my-5" />

                    {/* Feature list */}
                    <ul className="space-y-3 mb-8">
                      {packageFeatures.map((feat, fidx) => {
                        const FeatIcon = feat.icon;
                        return (
                          <li key={fidx} className="flex items-center gap-2">
                            <FeatIcon className="w-[15px] h-[15px] text-[#1d9e75] flex-shrink-0" />
                            <span className="text-[12px] text-white/[0.55] leading-none">
                              {feat.text}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <Button
                    type="button"
                    onClick={() => handleAddToCart(pkg, selectedDurationIndex)}
                    disabled={isAddingToCart}
                    className={cn(
                      "w-full h-10 rounded-[9px] text-[13px] font-semibold transition-all duration-200",
                      isPopular
                        ? "bg-[#f97316] hover:bg-[#ea6c0a] text-white border-none shadow-sm"
                        : "bg-white/[0.06] border border-white/[0.1] text-white/70 hover:bg-white/[0.1] hover:text-white"
                    )}
                  >
                    {isAddingToCart ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4 mr-2" />
                    )}
                    {isAddingToCart ? "Adding..." : "Add to Cart"}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Why Advertise Section */}
        <div ref={benefitsRef} className="max-w-7xl mx-auto mb-16 scroll-mt-24">
          {/* Centered header */}
          <div className="text-center mb-10">
            <div className="text-[11px] font-bold text-[#f97316] uppercase tracking-wider mb-2">
              Why Advertise Here
            </div>
            <h2 className="text-[22px] font-bold text-white mb-2">
              Reach Your Target Audience
            </h2>
            <p className="text-[13px] text-white/35 max-w-md mx-auto">
              Connect with the most active and engaged FiveM community owners
            </p>
          </div>

          {/* 2x2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px] px-6 sm:px-10">
            {benefitsData.map((benefit, index) => {
              const BenefitIcon = benefit.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
                  className="bg-[#16161a] border border-white/5 rounded-2xl p-[20px_18px] flex gap-4 items-start transition-colors duration-200 hover:border-[#f97316]/25"
                >
                  {/* Icon Block */}
                  <div
                    className="flex-shrink-0 w-[38px] h-[38px] rounded-[9px] flex items-center justify-center"
                    style={{
                      backgroundColor: benefit.iconBg,
                      color: benefit.iconColor
                    }}
                  >
                    <BenefitIcon className="w-[18px] h-[18px]" />
                  </div>

                  {/* Text details */}
                  <div className="flex flex-col">
                    <h3 className="text-[13px] font-semibold text-[#f0f0f2] mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-[12px] text-white/35 leading-[1.55] mb-2">
                      {benefit.description}
                    </p>
                    {/* Supporting metric stat text */}
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: benefit.iconColor }}
                    >
                      {benefit.metric}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <Footer />
      </div>
    </>
  )
}
