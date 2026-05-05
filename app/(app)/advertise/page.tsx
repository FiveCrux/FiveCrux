"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/componentss/ui/tabs"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import dynamic from "next/dynamic"
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
  ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

// Lazy-load Three.js canvas to avoid SSR issues
const ParticleCanvas = dynamic(() => import("@/componentss/home/ParticleCanvas"), { ssr: false });

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
    accentColor: "#f97316",
    glowColor: "rgba(249,115,22,0.15)",
  },
  {
    title: "High Click-Through Rates",
    description: "Targeted audience ensures better engagement and conversions",
    icon: MousePointerClick,
    accentColor: "#eab308",
    glowColor: "rgba(234,179,8,0.15)",
  },
  {
    title: "Flexible Campaigns",
    description: "Choose your duration and adjust your strategy as needed",
    icon: Calendar,
    accentColor: "#f97316",
    glowColor: "rgba(249,115,22,0.15)",
  },
  {
    title: "Proven Results",
    description: "Join hundreds of satisfied advertisers growing their reach",
    icon: Award,
    accentColor: "#eab308",
    glowColor: "rgba(234,179,8,0.15)",
  }
]

// PayPal Button Wrapper Component for Ad Slots
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
  const totalSlots = pkg.slotsPerMonth

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

// PayPal Button Wrapper Component for Featured Script Slots
function FeaturedScriptPayPalButtonWrapper({
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
  const totalSlots = pkg.slotsPerMonth

  const createOrder = async () => {
    try {
      const response = await fetch("/api/paypal/create-featured-script-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: pkg.packageId,
          durationWeeks: duration.weeks || Math.round(duration.months * 4),
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
      const response = await fetch("/api/paypal/capture-featured-script-order", {
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
      toast.success(result.message || "Payment successful! Your featured script slots have been activated.")
      onSuccess()
    } catch (error) {
      console.error("Error capturing order:", error)
      onError(error instanceof Error ? error.message : "Failed to process payment")
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
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
        tagline: false,
      }}
    />
  )
}

function PricingCard({
  pkg,
  index,
  activeTab,
  selectedDurationIndex,
  pricingInView,
  isLoadingPaypal,
  paypalClientId,
  handlePurchaseSuccess,
  handlePurchaseError,
}: {
  pkg: PricingPackage;
  index: number;
  activeTab: "ads" | "featured-scripts";
  selectedDurationIndex: number;
  pricingInView: boolean;
  isLoadingPaypal: boolean;
  paypalClientId: string | null;
  handlePurchaseSuccess: () => void;
  handlePurchaseError: (error: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const Icon = pkg.icon;
  const selectedDuration = pkg.durations[selectedDurationIndex];
  const discount = Math.round(
    ((selectedDuration.originalPrice - selectedDuration.price) /
      selectedDuration.originalPrice) *
      100
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: -dy * 5, y: dx * 5 });
  }, []);

  const resetTilt = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  const accentColor = activeTab === "ads" ? "#f97316" : "#a855f7";
  const glowColor = activeTab === "ads" ? "rgba(249,115,22,0.15)" : "rgba(168,85,247,0.15)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={pricingInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: "1000px" }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={resetTilt}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: isHovered ? "transform 0.1s linear" : "transform 0.5s ease-out",
          transformStyle: "preserve-3d",
        }}
        className="relative h-full rounded-2xl overflow-hidden cursor-default"
      >
        <div
          className={cn(
            "relative h-full p-8 flex flex-col gap-6",
            "bg-[#080808] border border-white/5 rounded-2xl transition-colors duration-300",
            isHovered && "border-white/10"
          )}
        >
          {/* Top border sweep */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={pricingInView ? { scaleX: 1, opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
          />

          {/* Glow on hover */}
          {isHovered && (
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${glowColor} 0%, transparent 60%)`,
              }}
            />
          )}

          {pkg.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
              <Badge className={cn(
                "font-bold px-4 py-0.5 text-[10px] uppercase tracking-tighter flex items-center gap-1 border-none",
                activeTab === "ads" ? "bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.5)]" : "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]"
              )}>
                Most Popular
              </Badge>
            </div>
          )}

          <div className="flex justify-between items-start">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl"
              style={{
                background: `${accentColor}12`,
                border: `1px solid ${accentColor}30`,
              }}
            >
              <Icon className="h-6 w-6" style={{ color: accentColor }} />
            </div>
            {discount > 0 && (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] font-bold">
                SAVE {discount}%
              </Badge>
            )}
          </div>

          <div>
            <h3 className="text-white font-black text-2xl tracking-tighter uppercase">{pkg.name}</h3>
            <p className="text-neutral-500 text-sm mt-2 leading-relaxed">{pkg.description}</p>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tracking-tighter">€{selectedDuration.price}</span>
            <span className="text-neutral-600 text-sm line-through">€{selectedDuration.originalPrice}</span>
          </div>

          <div className="space-y-3 flex-grow">
            <div className="flex items-center gap-3 text-sm text-neutral-300">
              <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Check className="h-3 w-3 text-orange-500" />
              </div>
              <span>{pkg.slotsPerMonth} {activeTab === 'ads' ? 'Ad' : 'Featured'} Slot{pkg.slotsPerMonth > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-300">
              <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Check className="h-3 w-3 text-orange-500" />
              </div>
              <span>{activeTab === 'ads' ? 'Marketplace' : 'Homepage'} Placement</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-300">
              <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Check className="h-3 w-3 text-orange-500" />
              </div>
              <span>Analytics Dashboard</span>
            </div>
          </div>

          <div className="w-full pt-4">
            {isLoadingPaypal ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
              </div>
            ) : paypalClientId ? (
              <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "EUR", intent: "capture" }}>
                {activeTab === "ads" ? (
                  <PayPalButtonWrapper pkg={pkg} durationIndex={selectedDurationIndex} onSuccess={handlePurchaseSuccess} onError={handlePurchaseError} />
                ) : (
                  <FeaturedScriptPayPalButtonWrapper pkg={pkg} durationIndex={selectedDurationIndex} onSuccess={handlePurchaseSuccess} onError={handlePurchaseError} />
                )}
              </PayPalScriptProvider>
            ) : (
              <Button disabled className="w-full bg-neutral-900 border-white/5 text-neutral-500">PayPal Error</Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BenefitCard({ benefit, index, inView }: { benefit: any, index: number, inView: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const Icon = benefit.icon;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: -dy * 8, y: dx * 8 });
  }, []);

  const resetTilt = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: "1000px" }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={resetTilt}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: isHovered ? "transform 0.1s linear" : "transform 0.5s ease-out",
          transformStyle: "preserve-3d",
        }}
        className="relative h-full rounded-2xl overflow-hidden cursor-default"
      >
        <div
          className="relative h-full p-6 flex flex-col gap-5 bg-[#080808] border border-white/5 rounded-2xl"
        >
          <motion.div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${benefit.accentColor}, transparent)`,
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={inView ? { scaleX: 1, opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
          />

          {isHovered && (
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${benefit.glowColor} 0%, transparent 60%)`,
              }}
            />
          )}

          <div
            className="relative flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0"
            style={{
              background: `${benefit.accentColor}12`,
              border: `1px solid ${benefit.accentColor}30`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color: benefit.accentColor }} />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-white font-bold text-lg tracking-tight">{benefit.title}</h3>
            <p className="text-neutral-500 text-sm leading-relaxed">{benefit.description}</p>
          </div>

          <div
            className="mt-auto h-px w-8 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${benefit.accentColor}, transparent)`,
              opacity: isHovered ? 1 : 0.3,
              transition: "opacity 0.3s",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function AdvertisePage() {
  const heroRef = useRef(null)
  const pricingRef = useRef(null)
  const benefitsRef = useRef(null)
  const { resolvedTheme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()

  // State for selected tab (ad slots or featured script slots)
  const [activeTab, setActiveTab] = useState<"ads" | "featured-scripts">("ads")

  // State for selected duration index (shared across all packages)
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<number>(0)

  const [paypalClientId, setPaypalClientId] = useState<string | null>(null)
  const [isLoadingPaypal, setIsLoadingPaypal] = useState(true)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handlePurchaseSuccess = () => {
    // Refresh the page or update UI as needed
    router.refresh()
  }

  const handlePurchaseError = (error: string) => {
    toast.error(error)
  }

  // Get current packages based on active tab
  const currentPackages = activeTab === "ads" ? pricingPackages : featuredScriptPackages

  return (
    <div className="min-h-screen text-white overflow-hidden bg-black">
      <Navbar />

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{ background: "#000000" }}
      >
        {/* Three.js Particle Background */}
        {mounted && <ParticleCanvas />}

        {/* Radial Glow Orbs */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div
            className="absolute"
            style={{
              top: "20%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "700px",
              height: "700px",
              background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, rgba(234,179,8,0.05) 40%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="absolute"
            style={{
              top: "60%",
              left: "10%",
              width: "400px",
              height: "400px",
              background: "radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute"
            style={{
              top: "40%",
              right: "5%",
              width: "350px",
              height: "350px",
              background: "radial-gradient(circle, rgba(234,179,8,0.06) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        {/* Perspective Grid Floor */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ height: "45%", perspective: "800px" }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: "rotateX(70deg)",
              transformOrigin: "bottom center",
              backgroundImage: `
                linear-gradient(rgba(249,115,22,0.10) 1px, transparent 1px),
                linear-gradient(90deg, rgba(249,115,22,0.10) 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
              backgroundPosition: "center bottom",
              maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.3) 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.3) 100%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center pt-20">
          <AnimatePresence>
            {heroInView && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full border border-orange-500/25 bg-orange-500/8 text-xs font-semibold text-orange-400 uppercase tracking-widest"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                  </span>
                  Scale Your Business
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-[1.05] tracking-tighter"
                >
                  <span className="block text-white">Grow Your Reach</span>
                  <span
                    className="block mt-2"
                    style={{
                      background: "linear-gradient(90deg, #f97316 0%, #eab308 50%, #f97316 100%)",
                      backgroundSize: "200% auto",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Premium Ads
                  </span>
                </motion.h1>

                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="mx-auto mb-8 h-px w-48 origin-center"
                  style={{
                    background: "linear-gradient(90deg, transparent, #f97316, #eab308, transparent)",
                  }}
                />

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="text-base sm:text-lg md:text-xl text-neutral-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light"
                >
                  Reach thousands of active FiveM server owners, developers, and enthusiasts.
                  Our premium advertising platform delivers targeted visibility and proven results.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.65 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
                >
                  <motion.div
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <button
                      onClick={() => {
                        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className={cn(
                        "group relative overflow-hidden",
                        "inline-flex items-center gap-2.5",
                        "bg-orange-500 hover:bg-orange-400 text-black font-bold",
                        "px-8 py-3.5 rounded-xl text-sm tracking-wide",
                        "transition-all duration-200",
                        "shadow-[0_0_24px_rgba(249,115,22,0.35)] hover:shadow-[0_0_36px_rgba(249,115,22,0.55)]"
                      )}
                    >
                      <Zap className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                      View Pricing Plans
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-neutral-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <span className="text-[10px] uppercase tracking-widest font-medium">Pricing</span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.div>
      </section>
      {/* Pricing Section */}
      <section
        id="pricing"
        ref={pricingRef}
        className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{ background: "#000000" }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(249,115,22,0.04) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={pricingInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/[0.03] mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                Pricing Plans
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter mb-4">
              Choose Your{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #f97316, #eab308)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Advertising Plan
              </span>
            </h2>

            <p className="text-neutral-500 max-w-xl mx-auto text-sm leading-relaxed mb-12">
              Flexible pricing options to suit businesses of all sizes. Choose the perfect plan for your needs.
            </p>

            {/* Tabs for Ad Slots vs Featured Script Slots */}
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value as "ads" | "featured-scripts")
              setSelectedDurationIndex(0)
            }} className="w-full max-w-xl mx-auto mb-10">
              <TabsList className="grid w-full grid-cols-2 bg-neutral-900/50 border border-white/5 p-1 h-12 rounded-xl">
                <TabsTrigger
                  value="ads"
                  className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-black font-bold transition-all duration-300"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Ad Slots
                </TabsTrigger>
                <TabsTrigger
                  value="featured-scripts"
                  className="rounded-lg data-[state=active]:bg-purple-500 data-[state=active]:text-white font-bold transition-all duration-300"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Featured Slots
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Duration Selection */}
            <div className="mb-16">
              <Tabs
                value={selectedDurationIndex.toString()}
                onValueChange={(value) => setSelectedDurationIndex(parseInt(value))}
                className="w-full max-w-2xl mx-auto"
              >
                <TabsList className="grid w-full grid-cols-4 bg-transparent border-b border-white/5 h-14 rounded-none p-0">
                  {currentPackages[0].durations.map((duration, durIndex) => (
                    <TabsTrigger
                      key={durIndex}
                      value={durIndex.toString()}
                      className={cn(
                        "rounded-none border-b-2 border-transparent bg-transparent py-4 text-xs uppercase tracking-widest font-semibold text-neutral-500 transition-all duration-300",
                        "data-[state=active]:border-orange-500 data-[state=active]:text-white data-[state=active]:bg-orange-500/5"
                      )}
                    >
                      {duration.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </motion.div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {currentPackages.map((pkg, i) => (
              <PricingCard
                key={pkg.packageId}
                pkg={pkg}
                index={i}
                activeTab={activeTab}
                selectedDurationIndex={selectedDurationIndex}
                pricingInView={pricingInView}
                isLoadingPaypal={isLoadingPaypal}
                paypalClientId={paypalClientId}
                handlePurchaseSuccess={handlePurchaseSuccess}
                handlePurchaseError={handlePurchaseError}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section
        ref={benefitsRef}
        className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden border-t border-white/5"
        style={{ background: "#000000" }}
      >
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={benefitsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/[0.03] mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                The Benefits
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter mb-4">
              Why Advertise on{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #f97316, #eab308)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                FiveCrux?
              </span>
            </h2>

            <p className="text-neutral-500 max-w-xl mx-auto text-sm leading-relaxed">
              Connect with the most engaged FiveM community members and grow your server or brand effectively.
            </p>
          </motion.div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((benefit, i) => (
              <BenefitCard key={benefit.title} benefit={benefit} index={i} inView={benefitsInView} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
