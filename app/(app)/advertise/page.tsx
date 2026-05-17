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
  ShoppingCart
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

const benefits = [
  {
    title: "Maximum Visibility",
    description: "Reach thousands of active FiveM server owners and developers",
    icon: Eye,
    gradient: "from-orange-500 to-orange-600"
  },
  {
    title: "High Click-Through Rates",
    description: "Targeted audience ensures better engagement and conversions",
    icon: MousePointerClick,
    gradient: "from-yellow-400 to-yellow-500"
  },
  {
    title: "Flexible Campaigns",
    description: "Choose your duration and adjust your strategy as needed",
    icon: Calendar,
    gradient: "from-orange-500 to-red-500"
  },
  {
    title: "Proven Results",
    description: "Join hundreds of satisfied advertisers growing their reach",
    icon: Award,
    gradient: "from-yellow-400 to-orange-500"
  }
]

export default function AdvertisePage() {
  const heroRef = useRef(null)
  const pricingRef = useRef(null)
  const benefitsRef = useRef(null)
  const { resolvedTheme } = useTheme()

  // State for selected tab (ad slots or featured script slots)
  const [activeTab, setActiveTab] = useState<"ads" | "featured-scripts">("ads")

  // State for selected duration index (shared across all packages)
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<number>(0)

  const [addingCartItemId, setAddingCartItemId] = useState<string | null>(null)

  const heroInView = useInView(heroRef, { once: true })
  const pricingInView = useInView(pricingRef, { once: true })
  const benefitsInView = useInView(benefitsRef, { once: true })

  const handleAddToCart = async (pkg: PricingPackage, durationIndex: number) => {
    const duration = pkg.durations[durationIndex]
    const packageType = activeTab === "ads" ? "ads" : "featured-scripts"
    const couponScope = activeTab === "ads" ? "Ad Slots" : "Featured Script Slots"
    const durationAmount = activeTab === "ads"
      ? duration.months
      : duration.weeks || Math.round(duration.months * 4)
    const itemId = `${packageType}:${pkg.packageId}:${durationAmount}`

    setAddingCartItemId(itemId)

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
      })

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
      setAddingCartItemId(null)
    }
  }

  // Get current packages based on active tab
  const currentPackages = activeTab === "ads" ? pricingPackages : featuredScriptPackages

  return (
    <div className="min-h-screen text-white overflow-hidden">
      <Navbar />

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        className="relative py-20 px-4 sm:px-6 lg:px-8 min-h-[60vh] flex items-center"
      >
        <StarsBackground
          starColor={resolvedTheme === 'dark' ? '#FFF' : '#000'}
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-xl',
            'bg-[#131313]',
          )}
        />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <AnimatePresence>
            {heroInView && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="mb-8"
                >
                  <Badge className="bg-gradient-to-r from-orange-500/20 to-yellow-400/20 text-orange-400 border-orange-500/30 mb-6 px-4 py-2 text-sm font-semibold">
                    Advertise with Us
                  </Badge>
                  <motion.h1
                    className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
                    animate={{
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
                    style={{
                      background: "linear-gradient(45deg, #f97316, #eab308, #f59e0b, #fb923c, #f97316)",
                      backgroundSize: "400% 400%",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Grow Your Reach
                    <br />
                    <span className="text-4xl md:text-6xl">With Premium Advertising</span>
                  </motion.h1>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.4 }}
                  className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed"
                >
                  Reach thousands of active FiveM server owners, developers, and enthusiasts.
                  Our premium advertising platform delivers targeted visibility and proven results.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.6 }}
                  className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      className="!bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 hover:!from-orange-600 hover:!via-yellow-500 hover:!to-orange-600 text-black font-bold px-10 py-4 text-xl rounded-full shadow-2xl transition-all duration-300 border-none"
                      onClick={() => {
                        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      View Pricing
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.section>


      {/* Pricing Section */}
      <motion.section
        id="pricing"
        ref={pricingRef}
        className="pt-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={pricingInView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        <HexagonBackground
          className="absolute bg-[#131313]"
          hexagonProps={{
            className: "before:!bg-[#0f0f0f] after:!bg-[#131313] dark:!before:bg-[#0f0f0f] dark:!after:bg-[#131313] hover:!before:bg-[#252525] dark:hover:!before:bg-[#252525] hover:!after:bg-[#2a2a2a] dark:hover:!after:bg-[#2a2a2a]"
          }}
        />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={pricingInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="text-center mb-16"
          >
            <Badge className="bg-gradient-to-r from-orange-500/20 to-yellow-400/20 text-orange-400 border-orange-500/30 mb-6 px-4 py-2 text-sm font-semibold">
              Pricing Plans
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Choose Your{" "}
              <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
                Advertising Plan
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-8">
              Flexible pricing options to suit businesses of all sizes
            </p>

            {/* Tabs for Ad Slots vs Featured Script Slots */}
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value as "ads" | "featured-scripts")
              setSelectedDurationIndex(0) // Reset duration when switching tabs
            }} className="w-full max-w-2xl mx-auto mb-8">
              <TabsList className="grid w-full grid-cols-2 bg-neutral-800/50 border border-gray-700/50">
                <TabsTrigger
                  value="ads"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-yellow-400 data-[state=active]:text-black data-[state=active]:font-bold"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Ad Slots
                </TabsTrigger>
                <TabsTrigger
                  value="featured-scripts"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:font-bold"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Featured Script Slots
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Duration Selection - Now at the top */}
            <div className="mb-12">
              <Tabs
                value={selectedDurationIndex.toString()}
                onValueChange={(value) => setSelectedDurationIndex(parseInt(value))}
                className="w-full max-w-2xl mx-auto"
              >
                <TabsList className="grid w-full grid-cols-4 bg-neutral-800/50 border border-gray-700/50">
                  {currentPackages[0].durations.map((duration, durIndex) => (
                    <TabsTrigger
                      key={durIndex}
                      value={durIndex.toString()}
                      className={cn(
                        "text-sm data-[state=active]:font-bold",
                        activeTab === "ads"
                          ? "data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-yellow-400 data-[state=active]:text-black"
                          : "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                      )}
                    >
                      {duration.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            {currentPackages.map((pkg, index) => {
              const Icon = pkg.icon
              const selectedDuration = pkg.durations[selectedDurationIndex]
              const discount = Math.round(((selectedDuration.originalPrice - selectedDuration.price) / selectedDuration.originalPrice) * 100)
              const durationAmount = activeTab === "ads"
                ? selectedDuration.months
                : selectedDuration.weeks || Math.round(selectedDuration.months * 4)
              const cartItemId = `${activeTab === "ads" ? "ads" : "featured-scripts"}:${pkg.packageId}:${durationAmount}`
              const isAddingToCart = addingCartItemId === cartItemId

              return (
                <motion.div
                  key={pkg.packageId}
                  initial={{ opacity: 0, y: 50 }}
                  animate={pricingInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.8, delay: index * 0.15 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="relative"
                >
                  {pkg.popular && (
                    <motion.div
                      className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    >
                      <Badge className={cn(
                        "font-bold px-4 py-1 text-sm flex items-center gap-1",
                        activeTab === "ads"
                          ? "bg-gradient-to-r from-orange-500 to-yellow-400 text-black"
                          : "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      )}>
                        <Star className="h-3 w-3 fill-current" />
                        Most Popular
                      </Badge>
                    </motion.div>
                  )}
                  <Card className={cn(
                    "bg-neutral-900/60 border-gray-700/50 backdrop-blur-sm h-full relative overflow-hidden transition-all duration-500",
                    pkg.popular
                      ? activeTab === "ads"
                        ? "border-2 border-orange-500/50 shadow-2xl shadow-orange-500/20"
                        : "border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20"
                      : activeTab === "ads"
                        ? "hover:border-orange-500/50"
                        : "hover:border-purple-500/50"
                  )}>
                    <CardHeader className="p-8 pb-4 relative z-10">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${pkg.gradient} mb-6`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-white mb-2">
                        {pkg.name}
                      </CardTitle>
                      <CardDescription className="text-gray-400 text-base mb-4">
                        {pkg.description}
                      </CardDescription>
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <Badge className={cn(
                          "border-opacity-30",
                          activeTab === "ads"
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                            : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                        )}>
                          {pkg.slotsPerMonth} Slot{pkg.slotsPerMonth > 1 ? 's' : ''}{activeTab === "ads" ? " per Month" : ""}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 relative z-10">
                      {/* Pricing Display */}
                      <div className="mb-6">
                        <div className="flex items-baseline gap-2 mb-2">
                          <motion.span
                            className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
                            animate={pricingInView ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ delay: index * 0.15 + 0.3, duration: 0.5 }}
                            key={selectedDuration.price}
                          >
                            €{selectedDuration.price}
                          </motion.span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-gray-400 text-sm line-through">
                            €{selectedDuration.originalPrice}
                          </span>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                            Save {discount}%
                          </Badge>
                        </div>
                        <div className="text-gray-400 text-sm mt-2">
                          No recurring charges
                        </div>
                        <div className={cn(
                          "text-sm font-semibold mt-1",
                          activeTab === "ads" ? "text-orange-400" : "text-purple-400"
                        )}>
                          {activeTab === "ads" ? (
                            <>Get {pkg.slotsPerMonth} slot{pkg.slotsPerMonth > 1 ? 's' : ''} immediately for {selectedDuration.months} month{selectedDuration.months > 1 ? 's' : ''}</>
                          ) : (
                            <>Get {pkg.slotsPerMonth} slot{pkg.slotsPerMonth > 1 ? 's' : ''} for {selectedDuration.weeks || Math.round(selectedDuration.months * 4)} week{selectedDuration.weeks !== 1 ? 's' : ''}</>
                          )}
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-3 mb-6">
                        <motion.li
                          initial={{ opacity: 0, x: -20 }}
                          animate={pricingInView ? { opacity: 1, x: 0 } : {}}
                          transition={{ delay: index * 0.15 }}
                          className="flex items-start gap-3"
                        >
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${pkg.gradient} flex items-center justify-center mt-0.5`}>
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-gray-300 text-sm leading-relaxed">
                            {activeTab === "ads" ? (
                              <>{pkg.slotsPerMonth} ad slot{pkg.slotsPerMonth > 1 ? 's' : ''} (all slots unlocked immediately)</>
                            ) : (
                              <>{pkg.slotsPerMonth} featured script slot{pkg.slotsPerMonth > 1 ? 's' : ''} (all slots unlocked immediately)</>
                            )}
                          </span>
                        </motion.li>
                        <motion.li
                          initial={{ opacity: 0, x: -20 }}
                          animate={pricingInView ? { opacity: 1, x: 0 } : {}}
                          transition={{ delay: index * 0.15 + 0.1 }}
                          className="flex items-start gap-3"
                        >
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${pkg.gradient} flex items-center justify-center mt-0.5`}>
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-gray-300 text-sm leading-relaxed">
                            {activeTab === "ads" ? "Featured placement in marketplace" : "Featured placement on homepage"}
                          </span>
                        </motion.li>
                        <motion.li
                          initial={{ opacity: 0, x: -20 }}
                          animate={pricingInView ? { opacity: 1, x: 0 } : {}}
                          transition={{ delay: index * 0.15 + 0.2 }}
                          className="flex items-start gap-3"
                        >
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${pkg.gradient} flex items-center justify-center mt-0.5`}>
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-gray-300 text-sm leading-relaxed">
                            Analytics dashboard
                          </span>
                        </motion.li>
                        <motion.li
                          initial={{ opacity: 0, x: -20 }}
                          animate={pricingInView ? { opacity: 1, x: 0 } : {}}
                          transition={{ delay: index * 0.15 + 0.3 }}
                          className="flex items-start gap-3"
                        >
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${pkg.gradient} flex items-center justify-center mt-0.5`}>
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-gray-300 text-sm leading-relaxed">
                            Discord support
                          </span>
                        </motion.li>
                      </ul>

                      <div className="w-full">
                        <Button
                          type="button"
                          onClick={() => handleAddToCart(pkg, selectedDurationIndex)}
                          disabled={isAddingToCart}
                          className={cn(
                            "w-full py-6 text-lg font-bold rounded-full border transition-all duration-300",
                            activeTab === "ads"
                              ? "bg-orange-500/10 text-orange-300 border-orange-500/40 hover:bg-orange-500/20 hover:text-orange-200"
                              : "bg-purple-500/10 text-purple-200 border-purple-500/40 hover:bg-purple-500/20 hover:text-purple-100"
                          )}
                        >
                          {isAddingToCart ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ) : (
                            <ShoppingCart className="mr-2 h-5 w-5" />
                          )}
                          {isAddingToCart ? "Adding..." : "Add to Cart"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.section>
      
      
      {/* Benefits Section */}
      <motion.section
        ref={benefitsRef}
        className="pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={benefitsInView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        <HexagonBackground
          className="absolute bg-[#131313]"
          hexagonProps={{
            className: "before:!bg-[#0f0f0f] after:!bg-[#131313] dark:!before:bg-[#0f0f0f] dark:!after:bg-[#131313] hover:!before:bg-[#252525] dark:hover:!before:bg-[#252525] hover:!after:bg-[#2a2a2a] dark:hover:!after:bg-[#2a2a2a]"
          }}
        />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={benefitsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="text-center mt-16 mb-16"
          >
            <Badge className="bg-gradient-to-r from-orange-500/20 to-yellow-400/20 text-orange-400 border-orange-500/30 mb-6 px-4 py-2 text-sm font-semibold">
              Why Advertise Here
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 bg-gradient-to-r from-white via-orange-200 to-yellow-200 bg-clip-text text-transparent">
              Reach Your Target Audience
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Connect with the most engaged FiveM community members
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  animate={benefitsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -10 }}
                  className="group"
                >
                  <Card className="bg-neutral-900/40 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 backdrop-blur-sm h-full relative overflow-hidden">
                    <CardContent className="p-8 text-center relative z-10">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${benefit.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-bold text-xl mb-3 group-hover:text-orange-400 transition-colors">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{benefit.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* Stats Section */}
      {/* <motion.section
        className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, staggerChildren: 0.1 }}
          >
            {[
              { number: "500K+", label: "Monthly Impressions", gradient: "from-orange-500 to-orange-600" },
              { number: "25K+", label: "Active Advertisers", gradient: "from-yellow-400 to-yellow-500" },
              { number: "98%", label: "Satisfaction Rate", gradient: "from-orange-500 to-red-500" },
              { number: "2.5x", label: "Avg. ROI Increase", gradient: "from-yellow-400 to-orange-500" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -10 }}
                className="group"
              >
                <Card className="bg-neutral-900/40 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 backdrop-blur-sm h-full relative overflow-hidden">
                  <CardContent className="p-8 relative z-10">
                    <motion.div
                      className={`text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}
                      animate={pricingInView ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                    >
                      {stat.number}
                    </motion.div>
                    <div className="text-gray-400 font-semibold text-sm group-hover:text-orange-400 transition-colors uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section> */}
      <Footer />
    </div>
  )
}
