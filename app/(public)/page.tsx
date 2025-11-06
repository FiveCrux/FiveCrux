"use client"

import { useState, useRef, useEffect } from "react"
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import Link from "next/link"
import { useSession, signIn } from "next-auth/react"
import { useTheme } from "next-themes"
import Navbar from "@/componentss/shared/navbar"
import { Zap, Shield, Users, Star, ArrowRight, TrendingUp, Package, Code } from "lucide-react"
import { HexagonBackground } from "@/components/animate-ui/components/backgrounds/hexagon"
import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars"
import { cn } from "@/lib/utils"

interface Stats {
  totalScripts: number
  totalUsers: number
  totalGiveaways: number
  totalGiveawayValue: number
  totalDevelopers: number
  categoryCounts: Record<string, number>
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const { status } = useSession()
  const { resolvedTheme } = useTheme()
  const heroRef = useRef(null)
  const featuresRef = useRef(null)
  const statsRef = useRef(null)

  const { scrollYProgress } = useScroll()
  const heroInView = useInView(heroRef, { once: true })
  const featuresInView = useInView(featuresRef, { once: true })
  const statsInView = useInView(statsRef, { once: true })

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  // Fetch dynamic stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const statsRes = await fetch("/api/stats", { cache: "no-store" })

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])


  const platformFeatures = [
    {
      title: "Lightning Fast",
      description: "Optimized scripts that won't slow down your server",
      icon: Zap,
      gradient: "from-orange-500 to-orange-600",
    },
    {
      title: "Secure & Tested",
      description: "All scripts are thoroughly tested and security reviewed",
      icon: Shield,
      gradient: "from-yellow-400 to-yellow-500",
    },
    {
      title: "Community Driven",
      description: "Built by developers, for developers in the FiveM community",
      icon: Users,
      gradient: "from-orange-500 to-red-500",
    },
    {
      title: "Premium Quality",
      description: "Only the highest quality scripts make it to our marketplace",
      icon: Star,
      gradient: "from-yellow-400 to-orange-500",
    },
  ]

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden">
      <Navbar />

      {/* Enhanced Hero Section */}
      <motion.section
        ref={heroRef}
        className="relative py-20 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center"
        style={{ y, opacity }}
      >
        {/* Stars Background */}
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
                  <motion.h1
                    className="text-5xl md:text-8xl font-bold mb-6 leading-tight"
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
                    Premium FiveM
                    <br />
                    Marketplace
                  </motion.h1>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.4 }}
                  className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed"
                >
                  Discover the most advanced collection of{" "}
                  high-quality scripts
                  for your FiveM server. Built by experts, trusted by thousands. Plus enter amazing{" "}
                  giveaways
                  to win premium content!
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.6 }}
                  className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                >
                  <motion.div whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(249, 115, 22, 0.4)" }} whileTap={{ scale: 0.95 }}>
                    {status === "authenticated" ? (
                      <Link href="/scripts">
                        <Button size="lg" className="bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 hover:from-orange-600 hover:via-yellow-500 hover:to-orange-600 text-black font-bold px-10 py-4 text-xl rounded-full shadow-2xl transition-all duration-300">
                          Explore Scripts
                        </Button>
                      </Link>
                    ) : (
                      <Button size="lg" className="bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 hover:from-orange-600 hover:via-yellow-500 hover:to-orange-600 text-black font-bold px-10 py-4 text-xl rounded-full shadow-2xl transition-all duration-300" onClick={() => signIn("discord")}> 
                        Login to Explore
                      </Button>
                    )}
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(249, 115, 22, 0.3)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link href="/scripts/submit">
                      <Button
                        size="lg"
                        variant="outline"
                        className="bg-transparent border-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500 px-10 py-4 text-xl rounded-full backdrop-blur-sm transition-all duration-300 flex items-center gap-2"
                      >
                        <Code className="h-5 w-5" />
                        Submit Script
                      </Button>
                    </Link>
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Platform Features Section */}
      <motion.section
        ref={featuresRef}
        className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={featuresInView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        {/* Background decoration */}
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="text-center mb-20"
          >
            <Badge className="bg-gradient-to-r from-orange-500/20 to-yellow-400/20 text-orange-400 border-orange-500/30 mb-6 px-4 py-2 text-sm font-semibold">
              Why Choose Us
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 bg-gradient-to-r from-white via-orange-200 to-yellow-200 bg-clip-text text-transparent">
              Why Choose{" "}
              <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
                FiveHub
              </span>
              ?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              The most trusted marketplace for premium FiveM scripts and resources
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {platformFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -10 }}
                  className="group"
                >
                  <Card className="bg-neutral-900/40 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 backdrop-blur-sm h-full relative overflow-hidden">
                    <CardContent className="p-8 text-center relative z-10">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-white font-bold text-xl mb-3 group-hover:text-orange-400 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* Enhanced Stats Section */}
      <motion.section
        ref={statsRef}
        className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={statsInView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        {/* Background effects */}
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
            initial={{ opacity: 0, y: 50 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, staggerChildren: 0.1 }}
          >
            {[
              { 
                number: loading ? "..." : stats ? `${stats.totalScripts}+` : "0+", 
                label: "Premium Scripts",
                icon: Package,
                gradient: "from-orange-500 to-orange-600"
              },
              { 
                number: loading ? "..." : stats ? `${stats.totalDevelopers}+` : "0+", 
                label: "Trusted Developers",
                icon: Code,
                gradient: "from-yellow-400 to-yellow-500"
              },
              { 
                number: loading ? "..." : stats 
                  ? `${Math.round(stats.totalUsers / 1000)}K+` 
                  : "0+", 
                label: "Happy Customers",
                icon: Users,
                gradient: "from-orange-500 to-red-500"
              },
              { 
                number: loading ? "..." : stats && stats.totalGiveawayValue > 0
                  ? `$${Math.round(stats.totalGiveawayValue / 1000)}K+`
                  : "$0", 
                label: "Active Giveaways",
                icon: TrendingUp,
                gradient: "from-yellow-400 to-orange-500"
              },
            ].map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30, scale: 0.8 }}
                  animate={statsInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -10 }}
                  className="group"
                >
                  <Card className="bg-neutral-900/40 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 backdrop-blur-sm h-full relative overflow-hidden">
                    <CardContent className="p-8 relative z-10">
                      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${stat.gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <motion.div
                        className="text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
                        animate={statsInView ? { scale: [1, 1.1, 1] } : {}}
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
              )
            })}
          </motion.div>
        </div>
      </motion.section>

      {/* Call to Action Section */}
      <motion.section
        className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Background effects */}
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            transition={{ duration: 1 }}
          >
            <Badge className="bg-gradient-to-r from-orange-500/20 to-yellow-400/20 text-orange-400 border-orange-500/30 mb-6 px-4 py-2 text-sm font-semibold">
              Get Started
            </Badge>
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
              Ready to{" "}
              <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Transform
              </span>
              <br />
              Your Server?
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join thousands of server owners who trust{" "}
              <span className="text-orange-400 font-semibold">FiveHub</span> for their premium script needs. 
              Start building your dream server today!
            </p>
            <motion.div
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                className="group"
              >
                <Link href="/scripts">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 hover:from-orange-600 hover:via-yellow-500 hover:to-orange-600 text-black font-bold px-12 py-6 text-xl rounded-full shadow-2xl transition-all duration-300 flex items-center gap-3 group-hover:shadow-orange-500/50"
                  >
                    <Package className="h-6 w-6" />
                    Browse Scripts
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/scripts/submit">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-transparent border-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500 px-12 py-6 text-xl rounded-full backdrop-blur-sm transition-all duration-300"
                  >
                    Sell Your Scripts
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        className="border-t border-gray-800/50 relative overflow-hidden min-h-[400px]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <HexagonBackground 
          className="absolute inset-0 bg-neutral-950 dark:bg-neutral-950" 
          hexagonProps={{ 
            className: "before:bg-neutral-950 dark:before:bg-neutral-950 after:bg-neutral-950 dark:after:bg-neutral-950" 
          }} 
        />
        <div className="max-w-7xl mx-auto relative z-10 py-12 px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-4 gap-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, staggerChildren: 0.1 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h3 className="text-2xl font-bold mb-4">
                <span className="text-orange-500">Five</span>
                <span className="text-yellow-400">Hub</span>
              </h3>
              <p className="text-gray-400 mb-4 leading-relaxed">
                Your trusted source for premium FiveM scripts and resources. Built by developers, for developers.
              </p>
            </motion.div>

            {[
              {
                title: "Categories",
                links: [
                  { name: "Economy", href: "/scripts?category=economy" },
                  { name: "Vehicles", href: "/scripts?category=vehicles" },
                  { name: "Jobs", href: "/scripts?category=jobs" },
                  { name: "Housing", href: "/scripts?category=housing" },
                ],
              },
              {
                title: "Support",
                links: [
                  { name: "Help Center", href: "/help" },
                  { name: "Contact Us", href: "/contact" },
                  { name: "Discord", href: "/discord" },
                  { name: "Terms of Service", href: "/terms" },
                ],
              },
              {
                title: "Connect",
                links: [
                  { name: "Giveaways", href: "/giveaways" },
                  { name: "Submit Script", href: "/scripts/submit" },
                  { name: "For Developers", href: "/developers" },
                  { name: "API", href: "/api" },
                ],
              },
            ].map((section, sectionIndex) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: sectionIndex * 0.1 }}
              >
                <h4 className="text-white font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <motion.li
                      key={link.name}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: sectionIndex * 0.1 + linkIndex * 0.05 }}
                    >
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-orange-500 transition-colors duration-300 relative group"
                      >
                        {link.name}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="border-t border-gray-800/50 mt-8 pt-8 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <p className="text-gray-400">
              &copy; 2024 FiveHub. All rights reserved. Made with{" "}
              for the FiveM community.
            </p>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  )
}
