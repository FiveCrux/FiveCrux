"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/componentss/ui/tabs"
import Navbar from "@/componentss/shared/navbar"
import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars"
import { HexagonBackground } from "@/components/animate-ui/components/backgrounds/hexagon"
import { 
  Zap, 
  TrendingUp, 
  Target, 
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
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

interface PricingDuration {
  label: string
  months: number
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
    description: "Perfect for small businesses and individual creators. One-time payment, all slots unlocked immediately.",
    gradient: "from-gray-600 to-gray-700",
    icon: Target,
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
    description: "Ideal for growing businesses with higher visibility needs. One-time payment, all slots unlocked immediately.",
    gradient: "from-orange-500 to-yellow-400",
    icon: TrendingUp,
    popular: true,
    durations: [
      { label: "1 Month", months: 1, price: 100, originalPrice: 210 },
      { label: "3 Months", months: 3, price: 275, originalPrice: 630 },
      { label: "6 Months", months: 6, price: 500, originalPrice: 1260 },
      { label: "Yearly", months: 12, price: 900, originalPrice: 3420 }
    ]
  },
  {
    name: "EXECUTIVE PACK",
    packageId: "executive",
    slotsPerMonth: 5,
    description: "Maximum exposure for established brands and agencies. One-time payment, all slots unlocked immediately.",
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

// PayPal Button Wrapper Component
function PayPalButtonWrapper({
  pkg,
  durationIndex,
  onSuccess,
  onError,
}: {
  pkg: PricingPackage
  durationIndex: number
  onSuccess: () => void
  onError: (error: string) => void
}) {
  const [{ isPending }] = usePayPalScriptReducer()
  const duration = pkg.durations[durationIndex]
  const totalSlots = pkg.slotsPerMonth * duration.months

  const createOrder = async () => {
    try {
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: pkg.packageId,
          durationMonths: duration.months,
          price: duration.price,
          slotsToAdd: totalSlots,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create order")
      }

      const data = await response.json()
      return data.orderId
    } catch (error) {
      console.error("Error creating order:", error)
      onError(error instanceof Error ? error.message : "Failed to create order")
      throw error
    }
  }

  const onApprove = async (data: { orderID: string }) => {
    try {
      const response = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: data.orderID,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to capture order")
      }

      const result = await response.json()
      toast.success(result.message || "Payment successful! Your ad slots have been activated.")
      onSuccess()
    } catch (error) {
      console.error("Error capturing order:", error)
      onError(error instanceof Error ? error.message : "Failed to process payment")
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <PayPalButtons
      createOrder={createOrder}
      onApprove={onApprove}
      onError={(err) => {
        console.error("PayPal error:", err)
        onError("Payment was canceled or failed")
      }}
      style={{
        layout: "vertical",
        color: "gold",
        shape: "rect",
        label: "paypal",
      }}
    />
  )
}

export default function AdvertisePage() {
  const heroRef = useRef(null)
  const pricingRef = useRef(null)
  const benefitsRef = useRef(null)
  const { resolvedTheme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State for selected duration per package
  const [selectedDurations, setSelectedDurations] = useState<Record<string, number>>({
    starter: 0,
    premium: 0,
    executive: 0
  })

  // State for PayPal client ID
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null)
  const [isLoadingPaypal, setIsLoadingPaypal] = useState(true)

  // Get PayPal client ID from server
  useEffect(() => {
    const fetchPaypalClientId = async () => {
      try {
        const response = await fetch("/api/paypal/client-id")
        if (response.ok) {
          const data = await response.json()
          setPaypalClientId(data.clientId)
        } else {
          console.error("Failed to fetch PayPal client ID")
        }
      } catch (error) {
        console.error("Error loading PayPal:", error)
      } finally {
        setIsLoadingPaypal(false)
      }
    }
    fetchPaypalClientId()
  }, [])

  // Handle success/cancel from PayPal redirect
  useEffect(() => {
    const success = searchParams.get("success")
    const canceled = searchParams.get("canceled")
    
    if (success) {
      toast.success("Payment successful! Your ad slots have been activated.")
      router.replace("/advertise")
    } else if (canceled) {
      toast.info("Payment was canceled")
      router.replace("/advertise")
    }
  }, [searchParams, router])

  const heroInView = useInView(heroRef, { once: true })
  const pricingInView = useInView(pricingRef, { once: true })
  const benefitsInView = useInView(benefitsRef, { once: true })
  
  const handleDurationChange = (packageId: string, durationIndex: number) => {
    setSelectedDurations(prev => ({
      ...prev,
      [packageId]: durationIndex
    }))
  }
  
  const handlePurchaseSuccess = () => {
    // Refresh the page or update UI as needed
    router.refresh()
  }

  const handlePurchaseError = (error: string) => {
    toast.error(error)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden">
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
            'bg-neutral-950 dark:bg-neutral-950',
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
                    whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(249, 115, 22, 0.4)" }} 
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 hover:from-orange-600 hover:via-yellow-500 hover:to-orange-600 text-black font-bold px-10 py-4 text-xl rounded-full shadow-2xl transition-all duration-300"
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

      {/* Benefits Section */}
      <motion.section
        ref={benefitsRef}
        className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={benefitsInView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={benefitsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="text-center mb-16"
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

      {/* Pricing Section */}
      <motion.section
        id="pricing"
        ref={pricingRef}
        className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={pricingInView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        <HexagonBackground 
          className="absolute inset-0 bg-neutral-950 dark:bg-neutral-950" 
          hexagonProps={{ 
            className: "before:bg-neutral-950 dark:before:bg-neutral-950 after:bg-neutral-950 dark:after:bg-neutral-950" 
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
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Flexible pricing options to suit businesses of all sizes
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            {pricingPackages.map((pkg, index) => {
              const Icon = pkg.icon
              const selectedDuration = pkg.durations[selectedDurations[pkg.packageId] || 0]
              const discount = Math.round(((selectedDuration.originalPrice - selectedDuration.price) / selectedDuration.originalPrice) * 100)
              
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
                      <Badge className="bg-gradient-to-r from-orange-500 to-yellow-400 text-black font-bold px-4 py-1 text-sm flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Most Popular
                      </Badge>
                    </motion.div>
                  )}
                  <Card className={cn(
                    "bg-neutral-900/60 border-gray-700/50 backdrop-blur-sm h-full relative overflow-hidden transition-all duration-500",
                    pkg.popular 
                      ? "border-2 border-orange-500/50 shadow-2xl shadow-orange-500/20" 
                      : "hover:border-orange-500/50"
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
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                          {pkg.slotsPerMonth} Slot{pkg.slotsPerMonth > 1 ? 's' : ''} per Month
                        </Badge>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          One-Time Payment
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 relative z-10">
                      {/* Duration Selection */}
                      <div className="mb-6">
                        <Tabs 
                          value={selectedDurations[pkg.packageId]?.toString() || "0"}
                          onValueChange={(value) => handleDurationChange(pkg.packageId, parseInt(value))}
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-4 bg-neutral-800/50 border border-gray-700/50">
                            {pkg.durations.map((duration, durIndex) => (
                              <TabsTrigger
                                key={durIndex}
                                value={durIndex.toString()}
                                className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-yellow-400 data-[state=active]:text-black data-[state=active]:font-bold"
                              >
                                {duration.label.split(' ')[0]}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>
                      </div>

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
                          One-time payment • No recurring charges
                        </div>
                        <div className="text-orange-400 text-sm font-semibold mt-1">
                          Get {pkg.slotsPerMonth * selectedDuration.months} slot{pkg.slotsPerMonth * selectedDuration.months > 1 ? 's' : ''} immediately ({pkg.slotsPerMonth} slot{pkg.slotsPerMonth > 1 ? 's' : ''} × {selectedDuration.months} month{selectedDuration.months > 1 ? 's' : ''})
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
                            {pkg.slotsPerMonth * selectedDuration.months} ad slot{pkg.slotsPerMonth * selectedDuration.months > 1 ? 's' : ''} (all slots unlocked immediately)
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
                            Featured placement in marketplace
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
                            Email support
                          </span>
                        </motion.li>
                      </ul>

                      <div className="w-full">
                        {isLoadingPaypal ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                          </div>
                        ) : paypalClientId ? (
                          <PayPalScriptProvider
                            options={{
                              clientId: paypalClientId,
                              currency: "EUR",
                              intent: "capture",
                            }}
                          >
                            <PayPalButtonWrapper
                              pkg={pkg}
                              durationIndex={selectedDurations[pkg.packageId] || 0}
                              onSuccess={handlePurchaseSuccess}
                              onError={handlePurchaseError}
                            />
                          </PayPalScriptProvider>
                        ) : (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full"
                          >
                            <Button
                              disabled
                              className={cn(
                                "w-full py-6 text-lg font-bold rounded-full transition-all duration-300",
                                pkg.popular
                                  ? "bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 hover:from-orange-600 hover:via-yellow-500 hover:to-orange-600 text-black shadow-2xl shadow-orange-500/30"
                                  : "bg-neutral-800 hover:bg-neutral-700 text-white border border-gray-700 hover:border-orange-500/50"
                              )}
                            >
                              PayPal Not Configured
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={pricingInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-16 text-center"
          >
            <Card className="bg-neutral-900/40 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <BarChart3 className="h-6 w-6 text-orange-500" />
                  <h3 className="text-2xl font-bold text-white">Need Custom Solutions?</h3>
                </div>
                <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                  Looking for a custom advertising package tailored to your specific needs? 
                  Contact our sales team to discuss enterprise solutions and bulk pricing options.
                </p>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    className="bg-transparent border-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500 px-8 py-3 rounded-full"
                  >
                    Contact Sales Team
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section
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
      </motion.section>
    </div>
  )
}
