"use client"

import { useRef } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
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
  Award
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

interface PricingTier {
  name: string
  price: number
  period: string
  description: string
  features: string[]
  popular?: boolean
  gradient: string
  icon: typeof Zap
  cta: string
  impressions?: string
  clicks?: string
  duration?: string
}

const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    price: 49,
    period: "per week",
    description: "Perfect for small businesses and individual creators",
    features: [
      "10,000+ impressions per week",
      "Featured placement in marketplace",
      "Basic analytics dashboard",
      "Email support",
      "7-day campaign duration",
      "Standard ad placement"
    ],
    gradient: "from-gray-600 to-gray-700",
    icon: Target,
    cta: "Get Started",
    impressions: "10K+",
    clicks: "500+",
    duration: "7 days"
  },
  {
    name: "Premium",
    price: 149,
    period: "per week",
    description: "Ideal for growing businesses with higher visibility needs",
    features: [
      "50,000+ impressions per week",
      "Premium featured placement",
      "Advanced analytics & insights",
      "Priority email support",
      "14-day campaign duration",
      "Top banner placement",
      "Click-through rate optimization",
      "A/B testing capabilities"
    ],
    popular: true,
    gradient: "from-orange-500 to-yellow-400",
    icon: TrendingUp,
    cta: "Choose Premium",
    impressions: "50K+",
    clicks: "2.5K+",
    duration: "14 days"
  },
  {
    name: "Enterprise",
    price: 399,
    period: "per week",
    description: "Maximum exposure for established brands and agencies",
    features: [
      "150,000+ impressions per week",
      "Exclusive premium placement",
      "Real-time analytics dashboard",
      "24/7 dedicated support",
      "30-day campaign duration",
      "Multiple ad placements",
      "Custom targeting options",
      "Performance optimization",
      "Dedicated account manager",
      "Custom reporting"
    ],
    gradient: "from-yellow-400 via-orange-500 to-red-500",
    icon: Sparkles,
    cta: "Contact Sales",
    impressions: "150K+",
    clicks: "7.5K+",
    duration: "30 days"
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

  const heroInView = useInView(heroRef, { once: true })
  const pricingInView = useInView(pricingRef, { once: true })
  const benefitsInView = useInView(benefitsRef, { once: true })

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
            {pricingTiers.map((tier, index) => {
              const Icon = tier.icon
  return (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 50 }}
                  animate={pricingInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.8, delay: index * 0.15 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="relative"
                >
                  {tier.popular && (
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
                    tier.popular 
                      ? "border-2 border-orange-500/50 shadow-2xl shadow-orange-500/20" 
                      : "hover:border-orange-500/50"
                  )}>
                    <CardHeader className="p-8 pb-4 relative z-10">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${tier.gradient} mb-6`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-3xl font-bold text-white mb-2">
                        {tier.name}
                      </CardTitle>
                      <CardDescription className="text-gray-400 text-base">
                        {tier.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 relative z-10">
                      <div className="mb-8">
                        <div className="flex items-baseline gap-2 mb-2">
                          <motion.span
                            className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
                            animate={pricingInView ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ delay: index * 0.15 + 0.3, duration: 0.5 }}
                          >
                            ${tier.price}
                          </motion.span>
                          <span className="text-gray-400 text-lg">/{tier.period}</span>
                        </div>
                        {tier.impressions && (
                          <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4 text-orange-500" />
                              <span>{tier.impressions} impressions</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MousePointerClick className="h-4 w-4 text-yellow-400" />
                              <span>{tier.clicks} clicks</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <ul className="space-y-4 mb-8">
                        {tier.features.map((feature, featureIndex) => (
                          <motion.li
                            key={featureIndex}
                            initial={{ opacity: 0, x: -20 }}
                            animate={pricingInView ? { opacity: 1, x: 0 } : {}}
                            transition={{ delay: index * 0.15 + featureIndex * 0.05 }}
                            className="flex items-start gap-3"
                          >
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${tier.gradient} flex items-center justify-center mt-0.5`}>
                              <Check className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                          </motion.li>
                        ))}
                      </ul>

                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full"
                      >
                        <Button
                          className={cn(
                            "w-full py-6 text-lg font-bold rounded-full transition-all duration-300",
                            tier.popular
                              ? "bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 hover:from-orange-600 hover:via-yellow-500 hover:to-orange-600 text-black shadow-2xl shadow-orange-500/30"
                              : "bg-neutral-800 hover:bg-neutral-700 text-white border border-gray-700 hover:border-orange-500/50"
                          )}
                        >
                          {tier.cta}
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </motion.div>
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
