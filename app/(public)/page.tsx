"use client"

import { useState, useRef, useEffect } from "react"
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Progress } from "@/componentss/ui/progress"
import Link from "next/link"
import { useSession, signIn } from "next-auth/react"
import Navbar from "@/componentss/shared/navbar"


export default function HomePage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const { status } = useSession()
  const heroRef = useRef(null)
  const categoriesRef = useRef(null)
  const giveawaysRef = useRef(null)
  const featuresRef = useRef(null)
  const statsRef = useRef(null)

  const { scrollYProgress } = useScroll()
  const heroInView = useInView(heroRef, { once: true })
  const categoriesInView = useInView(categoriesRef, { once: true })
  const giveawaysInView = useInView(giveawaysRef, { once: true })
  const featuresInView = useInView(featuresRef, { once: true })
  const statsInView = useInView(statsRef, { once: true })

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const scriptCategories = [
    {
      id: "economy",
      name: "Economy",
      description: "Banking, shops, businesses, and financial systems",
      scriptCount: 45,
      color: "from-orange-500 to-orange-600",
      image: "/cat.jpg",
      popular: ["Banking System", "ATM Scripts", "Business Management"],
    },
    {
      id: "vehicles",
      name: "Vehicles",
      description: "Car dealerships, garages, and vehicle management",
      scriptCount: 32,
      color: "from-yellow-400 to-yellow-500",
      image: "/cat.jpg",
      popular: ["Car Dealership", "Vehicle Keys", "Garage System"],
    },
    {
      id: "jobs",
      name: "Jobs & Careers",
      description: "Police, EMS, mechanic, and other job scripts",
      scriptCount: 28,
      color: "from-orange-600 to-red-500",
      image: "/cat.jpg",
      popular: ["Police MDT", "EMS System", "Mechanic Job"],
    },
    {
      id: "housing",
      name: "Housing & Real Estate",
      description: "Property systems, apartments, and real estate",
      scriptCount: 19,
      color: "from-yellow-500 to-orange-400",
      image: "/cat.jpg",
      popular: ["Housing System", "Real Estate", "Apartment Manager"],
    },
    {
      id: "medical",
      name: "Medical & Healthcare",
      description: "Hospital systems, medical equipment, and health",
      scriptCount: 15,
      color: "from-red-500 to-pink-500",
      image: "/cat.jpg",
      popular: ["Hospital System", "Medical Records", "Pharmacy"],
    },
    {
      id: "police",
      name: "Police & Law Enforcement",
      description: "Police tools, MDT systems, and law enforcement",
      scriptCount: 23,
      color: "from-blue-500 to-blue-600",
      image: "/cat.jpg",
      popular: ["Police MDT", "Evidence System", "Jail System"],
    },
    {
      id: "utilities",
      name: "Utilities & Tools",
      description: "Admin tools, utilities, and helper scripts",
      scriptCount: 31,
      color: "from-gray-500 to-gray-600",
      image: "/cat.jpg",
      popular: ["Admin Menu", "Player Management", "Server Tools"],
    },
    {
      id: "core",
      name: "Core & Framework",
      description: "Core systems, frameworks, and essential scripts",
      scriptCount: 18,
      color: "from-purple-500 to-purple-600",
      image: "/cat.jpg",
      popular: ["Inventory System", "Character System", "Core Framework"],
    },
  ]

  const featuredGiveaways = [
    {
      id: 1,
      title: "Ultimate Script Bundle",
      description: "Win 10+ premium scripts worth $500+",
      value: "$500",
      entries: 3247,
      maxEntries: 5000,
      timeLeft: "2d 14h",
      image: "/cat.jpg",
      featured: true,
    },
    {
      id: 2,
      title: "Custom Development Service",
      description: "Free custom script development",
      value: "$300",
      entries: 1892,
      maxEntries: 2500,
      timeLeft: "5d 8h",
      image: "/cat.jpg",
      featured: false,
    },
    {
      id: 3,
      title: "Server Setup Package",
      description: "Complete server setup with scripts",
      value: "$200",
      entries: 1634,
      maxEntries: 2000,
      timeLeft: "1d 3h",
      image: "/cat.jpg",
      featured: true,
    },
  ]

  const platformFeatures = [
    {
      title: "Lightning Fast",
      description: "Optimized scripts that won't slow down your server",
      color: "text-orange-500",
    },
    {
      title: "Secure & Tested",
      description: "All scripts are thoroughly tested and security reviewed",
      color: "text-yellow-400",
    },
    {
      title: "Community Driven",
      description: "Built by developers, for developers in the FiveM community",
      color: "text-orange-500",
    },
    {
      title: "Premium Quality",
      description: "Only the highest quality scripts make it to our marketplace",
      color: "text-yellow-400",
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <Navbar />

      {/* Enhanced Hero Section */}
      <motion.section
        ref={heroRef}
        className="relative py-20 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center"
        style={{ y, opacity }}
      >
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

                  <motion.div
                    className="flex items-center justify-center gap-4 mb-8"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                  >
                    <Badge className="bg-gradient-to-r from-orange-500 to-yellow-400 text-black font-bold px-4 py-2 text-lg">
                      200+ Scripts
                    </Badge>
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold px-4 py-2 text-lg">
                      $2.5K+ Giveaways
                    </Badge>
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold px-4 py-2 text-lg">
                      25K+ Users
                    </Badge>
                  </motion.div>
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
                    whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(234, 179, 8, 0.3)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link href="/giveaways">
                      <Button
                        size="lg"
                        variant="outline"
                        className="bg-transparent border-2 border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 hover:border-yellow-400 px-10 py-4 text-xl rounded-full backdrop-blur-sm transition-all duration-300"
                      >
                        View Giveaways
                      </Button>
                    </Link>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(249, 115, 22, 0.2)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link href="/scripts/submit">
                      <Button
                        size="lg"
                        variant="outline"
                        className="bg-transparent border-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500 px-10 py-4 text-xl rounded-full backdrop-blur-sm transition-all duration-300"
                      >
                        Submit Script
                      </Button>
                    </Link>
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Enhanced floating orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-48 h-48 bg-gradient-to-r from-orange-500/20 to-yellow-400/20 rounded-full blur-xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.7, 0.3],
            x: [-20, 20, -20],
            y: [-10, 10, -10],
          }}
          transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-36 h-36 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-full blur-xl"
          animate={{
            scale: [1.3, 1, 1.3],
            opacity: [0.7, 0.3, 0.7],
            x: [20, -20, 20],
            y: [10, -10, 10],
          }}
          transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-24 h-24 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-full blur-xl"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 0.8, 0.4],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY }}
        />
      </motion.section>

      {/* Platform Features Section */}
      <motion.section
        ref={featuresRef}
        className="py-20 px-4 sm:px-6 lg:px-8 relative"
        initial={{ opacity: 0 }}
        animate={featuresInView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Why Choose{" "}
              FiveHub
              ?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              The most trusted marketplace for premium FiveM scripts and resources
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {platformFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -10 }}
                className="group"
              >
                <Card className="bg-gray-800/30 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 backdrop-blur-sm h-full">
                  <CardContent className="p-6 text-center">
                    <h3 className="text-white font-bold text-lg mb-3 group-hover:text-orange-500 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Featured Giveaways Section */}
      <motion.section
        ref={giveawaysRef}
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-gray-900/30 to-black/30 backdrop-blur-sm relative"
        initial={{ opacity: 0 }}
        animate={giveawaysInView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={giveawaysInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="text-center mb-16"
          >
            <motion.div
              className="flex items-center justify-center gap-4 mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={giveawaysInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.3 }}
            >
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold px-4 py-2 text-lg">
                Hot Giveaways
              </Badge>
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Win Amazing{" "}
              Prizes
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              Enter our exciting giveaways to win premium scripts, custom development services, and exclusive packages!
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/giveaways">
                <Button className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 text-black font-bold px-8 py-3 text-lg shadow-lg">
                  View All Giveaways
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredGiveaways.map((giveaway, index) => (
              <motion.div
                key={giveaway.id}
                initial={{ opacity: 0, y: 50 }}
                animate={giveawaysInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 hover:border-yellow-400/50 transition-all duration-500 backdrop-blur-sm overflow-hidden h-full">
                  <CardHeader className="p-0 relative">
                    <div className="relative overflow-hidden">
                      <motion.img
                        src={giveaway.image}
                        alt={giveaway.title}
                        className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <motion.div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {giveaway.featured && (
                        <motion.div
                          className="absolute top-3 left-3"
                        >
                          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold">
                            Featured
                          </Badge>
                        </motion.div>
                      )}

                      <motion.div
                        className="absolute top-3 right-3"
                      >
                        <Badge className="bg-gradient-to-r from-green-400 to-emerald-500 text-black font-bold text-lg">
                          {giveaway.value}
                        </Badge>
                      </motion.div>

                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center justify-between text-white/90">
                          <div className="flex items-center text-orange-500">
                            <span className="font-semibold text-sm">{giveaway.timeLeft}</span>
                          </div>
                          <div className="flex items-center text-gray-300">
                            <span className="text-sm">{giveaway.entries.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <CardTitle className="text-white text-lg mb-3 group-hover:text-yellow-400 transition-colors">
                      {giveaway.title}
                    </CardTitle>
                    <CardDescription className="text-gray-400 mb-4 text-sm">{giveaway.description}</CardDescription>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-2">
                        <span>{giveaway.entries.toLocaleString()} entries</span>
                        <span>{giveaway.maxEntries.toLocaleString()} max</span>
                      </div>
                      <div className="relative">
                        <Progress
                          value={(giveaway.entries / giveaway.maxEntries) * 100}
                          className="h-2 bg-gray-700/50"
                        />
                      </div>
                    </div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Link href={`/giveaway/${giveaway.id}`}>
                        <Button className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold shadow-lg">
                          Enter Giveaway
                        </Button>
                      </Link>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Script Categories */}
      <motion.section
        ref={categoriesRef}
        className="py-20 px-4 sm:px-6 lg:px-8 relative"
        initial={{ opacity: 0 }}
        animate={categoriesInView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={categoriesInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Browse by{" "}
              Category
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Find exactly what you need with our organized script categories
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {scriptCategories.map((category, index) => {
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 50, rotateX: -15 }}
                  animate={categoriesInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  whileHover={{
                    scale: 1.05,
                    z: 50,
                  }}
                  className="perspective-1000"
                >
                  <Link href={`/scripts?category=${category.id}`}>
                    <Card className="bg-gray-800/50 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 group cursor-pointer h-full backdrop-blur-sm relative overflow-hidden">
                      <CardHeader className="p-0 relative">
                        <div className="relative overflow-hidden rounded-t-lg h-48">
                          <motion.img
                            src={category.image || "/cat.jpg"}
                            alt={category.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.5 }}
                          />
                          <motion.div
                            className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-60`}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div whileHover={{ scale: 1.2, rotate: 360 }} transition={{ duration: 0.5 }}>
                              {category.name}
                            </motion.div>
                          </div>
                          <motion.div
                            className="absolute top-3 right-3 bg-black/80 text-white px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm"
                            whileHover={{ scale: 1.1 }}
                          >
                            {category.scriptCount} scripts
                          </motion.div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6 relative z-10">
                        <CardTitle className="text-white text-xl mb-3 group-hover:text-orange-500 transition-colors duration-300">
                          {category.name}
                        </CardTitle>
                        <CardDescription className="text-gray-400 text-sm mb-4 leading-relaxed">
                          {category.description}
                        </CardDescription>
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-orange-500">Popular Scripts:</h4>
                          <ul className="space-y-2">
                            {category.popular.map((script, scriptIndex) => (
                              <motion.li
                                key={scriptIndex}
                                initial={{ opacity: 0, x: -20 }}
                                animate={categoriesInView ? { opacity: 1, x: 0 } : {}}
                                transition={{ delay: index * 0.1 + scriptIndex * 0.05 }}
                                className="text-xs text-gray-400 flex items-center group-hover:text-gray-300 transition-colors"
                              >
                                {script}
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* Enhanced Stats Section */}
      <motion.section
        ref={statsRef}
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-gray-900/50 to-black/50 backdrop-blur-sm relative"
        initial={{ opacity: 0 }}
        animate={statsInView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
            initial={{ opacity: 0, y: 50 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, staggerChildren: 0.2 }}
          >
            {[
              { number: "200+", label: "Premium Scripts" },
              { number: "50+", label: "Trusted Developers" },
              { number: "25K+", label: "Happy Customers" },
              { number: "$2.5K+", label: "Active Giveaways" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={statsInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ scale: 1.1, y: -10 }}
                className="group"
              >
                <motion.div
                  className={`text-4xl md:text-6xl font-bold mb-2`}
                >
                  {stat.number}
                </motion.div>
                <div className="text-gray-400 font-medium flex items-center justify-center gap-2 group-hover:text-white transition-colors">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Call to Action Section */}
      <motion.section
        className="py-20 px-4 sm:px-6 lg:px-8 relative"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to{" "}
              Transform
              Your Server?
            </h2>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              Join thousands of server owners who trust FiveHub for their premium script needs. Start building your
              dream server today!
            </p>
            <motion.div
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/scripts">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-bold px-10 py-4 text-xl rounded-full shadow-2xl"
                  >
                    Browse Scripts
                  </Button>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/scripts/submit">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-transparent border-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500 px-10 py-4 text-xl rounded-full backdrop-blur-sm"
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
        className="bg-black/80 border-t border-gray-800/50 py-12 px-4 sm:px-6 lg:px-8 backdrop-blur-xl relative"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="max-w-7xl mx-auto">
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
