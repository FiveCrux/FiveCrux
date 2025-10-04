"use client"

import { useEffect, useState, useRef, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from "react"
import Image from "next/image"
import { motion, useInView, AnimatePresence } from "framer-motion"
import {
  Gift,
  Clock,
  Users,
  Trophy,
  Sparkles,
  Zap,
  Star,
  TrendingUp,
  Target,
  Award,
  Crown,
  Flame,
  ChevronRight,
  Filter,
  Search,
  SortAsc,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import Link from "next/link"
import AdCard, { useRandomAds } from "@/components/ad-card"

// Animated background particles
const AnimatedParticles = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
          animate={{
            x: [0, Math.random() * 200 - 100],
            y: [0, Math.random() * 200 - 100],
            opacity: [0, 1, 0],
            scale: [0, Math.random() * 2 + 1, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 4,
            repeat: Number.POSITIVE_INFINITY,
            delay: Math.random() * 3,
          }}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  )
}

// Floating 3D elements
type FloatingElementProps = { delay?: number; size?: number; icon: any; color?: string }
const FloatingElement = ({ delay = 0, size = 60, icon: Icon, color = "text-yellow-400" }: FloatingElementProps) => {
  return (
    <motion.div
      className={`absolute ${color} opacity-10`}
      animate={{
        y: [-20, 20, -20],
        x: [-10, 10, -10],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration: 20,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
        delay,
      }}
      style={{
        width: size,
        height: size,
        left: `${Math.random() * 80 + 10}%`,
        top: `${Math.random() * 80 + 10}%`,
      }}
    >
      <Icon className="w-full h-full" />
    </motion.div>
  )
}

export default function GiveawaysPage() {
  const heroRef = useRef(null)
  const giveawaysRef = useRef(null)
  const statsRef = useRef(null)

  const heroInView = useInView(heroRef, { once: true })
  const giveawaysInView = useInView(giveawaysRef, { once: true })
  const statsInView = useInView(statsRef, { once: true })

  const [enteredGiveaways, setEnteredGiveaways] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("ending-soon")
  const [filterBy, setFilterBy] = useState("all")
  const [ads, setAds] = useState<any[]>([])

  type UIGiveaway = {
    id: number
    title: string
    description: string
    totalValue: string
    entries: number
    maxEntries: number
    timeLeft: string
    endDate: string
    image: string
    requirements: string[]
    difficulty: string
    category: string
    featured: boolean
    trending: boolean
    creator: string
    tags: string[]
  }

  type GridItem = UIGiveaway | (any & { isAd: boolean })

  const [activeGiveaways, setActiveGiveaways] = useState<UIGiveaway[]>([])

  // Get random ads for giveaways page
  const randomAds = useRandomAds(ads, 2)

  useEffect(() => {
    const load = async () => {
      try {
        const [giveawaysRes, adsRes] = await Promise.all([
          fetch(`/api/giveaways`, { cache: "no-store" }),
          fetch(`/api/ads/giveaways`, { cache: "no-store" })
        ])
        
        if (giveawaysRes.ok) {
          const data = await giveawaysRes.json()
          console.log('Giveaways API response:', data)
          const list = Array.isArray(data) ? data : data.giveaways || []
          setActiveGiveaways(
            list.map((g: any) => ({
              id: g.id,
              title: g.title,
              description: g.description,
              totalValue: g.total_value,
              entries: g.entries_count || 0,
              maxEntries: g.max_entries || 0,
              timeLeft: "", // can be computed from end_date if needed
              endDate: g.end_date,
              image: g.cover_image || (g.images && g.images[0]) || "/placeholder.jpg",
              requirements: (g.requirements && g.requirements.map((r: any) => r.description)) || [],
              difficulty: g.difficulty,
              category: g.category,
              featured: g.featured,
              trending: false,
              creator: g.creator_name,
              tags: g.tags || [],
            }))
          )
        } else {
          console.error('Failed to fetch giveaways:', giveawaysRes.status)
        }

        if (adsRes.ok) {
          const adsData = await adsRes.json()
          setAds(adsData.ads || [])
        }
      } catch (error) {
        console.error('Error loading giveaways:', error)
      }
    }
    load()
  }, [])

  const recentWinners = [
    {
      id: 1,
      winner: "PlayerOne",
      prize: "Banking System Bundle",
      value: "$75",
      date: "2024-01-08",
      avatar: "/cat.jpg",
      verified: true,
    },
    {
      id: 2,
      winner: "ScriptLover",
      prize: "Custom Vehicle Pack",
      value: "$120",
      date: "2024-01-07",
      avatar: "/cat.jpg",
      verified: false,
    },
    {
      id: 3,
      winner: "DevMaster",
      prize: "Development Service",
      value: "$300",
      date: "2024-01-06",
      avatar: "/cat.jpg",
      verified: true,
    },
    {
      id: 4,
      winner: "ServerKing",
      prize: "Complete Setup Package",
      value: "$200",
      date: "2024-01-05",
      avatar: "/cat.jpg",
      verified: true,
    },
  ]

  const stats = [
    { label: "Active Giveaways", value: activeGiveaways.length.toString(), icon: Gift, color: "text-yellow-400" },
    { label: "Total Prize Value", value: `$${activeGiveaways.reduce((sum, g) => sum + parseInt(g.totalValue?.replace(/[^0-9]/g, '') || '0'), 0).toLocaleString()}`, icon: Trophy, color: "text-orange-500" },
    { label: "Happy Winners", value: "150+", icon: Crown, color: "text-yellow-400" },
    { label: "Community Members", value: "25K+", icon: Users, color: "text-orange-500" },
  ]

  const enterGiveaway = async (giveawayId: number) => {
    try {
      const response = await fetch(`/api/giveaways/${giveawayId}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        if (!enteredGiveaways.includes(giveawayId)) {
          setEnteredGiveaways([...enteredGiveaways, giveawayId])
        }
        // Refresh the page to update entry counts
        window.location.reload()
      } else {
        alert(data.error || "Failed to enter giveaway")
      }
    } catch (error) {
      console.error('Error entering giveaway:', error)
      alert("Failed to enter giveaway. Please try again.")
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "Medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "Hard":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const filteredGiveaways = activeGiveaways.filter((giveaway) => {
    if (searchQuery && !giveaway.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (filterBy === "featured" && !giveaway.featured) {
      return false
    }
    if (filterBy === "trending" && !giveaway.trending) {
      return false
    }
    return true
  })

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        <AnimatedParticles />

        {/* Floating 3D Elements */}
        {[...Array(8)].map((_, i) => (
          <FloatingElement
            key={i}
            delay={i * 2}
            size={30 + Math.random() * 40}
            icon={[Gift, Trophy, Star, Crown, Sparkles, Zap][Math.floor(Math.random() * 6)]}
            color={["text-yellow-400", "text-orange-500", "text-red-400"][Math.floor(Math.random() * 3)]}
          />
        ))}

        {/* Animated background */}
        <div className="fixed inset-0 -z-10">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"
            animate={{
              background: [
                "radial-gradient(circle at 20% 50%, rgba(234, 179, 8, 0.08) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.08) 0%, transparent 50%)",
                "radial-gradient(circle at 40% 80%, rgba(234, 179, 8, 0.08) 0%, transparent 50%)",
              ],
            }}
            transition={{
              duration: 12,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        </div>

        {/* Hero Section */}
        <motion.section
          ref={heroRef}
          className="relative py-20 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center"
          initial={{ opacity: 0, y: 50 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
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
                      transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY }}
                      style={{
                        background: "linear-gradient(45deg, #f59e0b, #f97316, #eab308, #f59e0b)",
                        backgroundSize: "400% 400%",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      Epic Giveaways
                    </motion.h1>
                    <motion.div
                      className="flex items-center justify-center gap-4 mb-6"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                    >
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold px-4 py-2 text-lg">
                        <Flame className="mr-2 h-5 w-5" />
                        ${activeGiveaways.reduce((sum, g) => sum + parseInt(g.totalValue?.replace(/[^0-9]/g, '') || '0'), 0).toLocaleString()}+ in Prizes
                      </Badge>
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold px-4 py-2 text-lg">
                        <Crown className="mr-2 h-5 w-5" />
                        {activeGiveaways.length} Active
                      </Badge>
                    </motion.div>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed"
                  >
                    Enter incredible giveaways to win{" "}
                    <motion.span
                      className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 font-bold"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                    >
                      premium FiveM scripts
                    </motion.span>
                    , custom development services, and exclusive server packages!
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
                        className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 text-black font-bold px-10 py-4 text-xl rounded-full shadow-2xl transition-all duration-300"
                      >
                        <Gift className="mr-3 h-6 w-6" />
                        Browse Giveaways
                      </Button>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(234, 179, 8, 0.3)" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link href="/giveaways/create">
                        <Button
                          size="lg"
                          variant="outline"
                          className="bg-transparent border-2 border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 hover:border-yellow-400 px-10 py-4 text-xl rounded-full backdrop-blur-sm transition-all duration-300"
                        >
                          <Sparkles className="mr-3 h-6 w-6" />
                          Create Giveaway
                        </Button>
                      </Link>
                    </motion.div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Floating orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-40 h-40 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-full blur-xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-xl"
            animate={{
              scale: [1.3, 1, 1.3],
              opacity: [0.7, 0.3, 0.7],
            }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
          />
        </motion.section>

        {/* Stats Section */}
        <motion.section
          ref={statsRef}
          className="py-16 px-4 sm:px-6 lg:px-8 relative"
          initial={{ opacity: 0 }}
          animate={statsInView ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
        >
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-8"
              initial={{ opacity: 0, y: 50 }}
              animate={statsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, staggerChildren: 0.2 }}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30, scale: 0.8 }}
                  animate={statsInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  whileHover={{ scale: 1.1, y: -10 }}
                  className="group text-center"
                >
                  <motion.div
                    className={`text-5xl md:text-6xl font-bold ${stat.color} mb-2`}
                    animate={{
                      textShadow: ["0 0 10px currentColor", "0 0 30px currentColor", "0 0 10px currentColor"],
                    }}
                    transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, delay: index * 0.5 }}
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-gray-400 font-medium flex items-center justify-center gap-2 group-hover:text-white transition-colors">
                    <stat.icon className="h-5 w-5" />
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search and Filter Bar */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="search"
                    placeholder="Search giveaways..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-400 focus:border-yellow-500 backdrop-blur-sm"
                  />
                </div>
                <Select value={filterBy} onValueChange={setFilterBy}>
                  <SelectTrigger className="w-48 bg-gray-900/50 border-gray-700/50 text-white backdrop-blur-sm">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900/95 border-gray-700/50 backdrop-blur-xl">
                    <SelectItem value="all">All Giveaways</SelectItem>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="trending">Trending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48 bg-gray-900/50 border-gray-700/50 text-white backdrop-blur-sm">
                    <SortAsc className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900/95 border-gray-700/50 backdrop-blur-xl">
                    <SelectItem value="ending-soon">Ending Soon</SelectItem>
                    <SelectItem value="highest-value">Highest Value</SelectItem>
                    <SelectItem value="most-entries">Most Entries</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800/30 border border-gray-700/50 backdrop-blur-sm">
              <TabsTrigger
                value="active"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-orange-500 data-[state=active]:text-black"
              >
                <Gift className="mr-2 h-4 w-4" />
                Active Giveaways
              </TabsTrigger>
              <TabsTrigger
                value="winners"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-orange-500 data-[state=active]:text-black"
              >
                <Trophy className="mr-2 h-4 w-4" />
                Recent Winners
              </TabsTrigger>
              <TabsTrigger
                value="rules"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-orange-500 data-[state=active]:text-black"
              >
                <Star className="mr-2 h-4 w-4" />
                Rules & Info
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-8">
              <motion.div
                ref={giveawaysRef}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                initial={{ opacity: 0 }}
                animate={giveawaysInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.8, staggerChildren: 0.1 }}
              >
                {(() => {
                  const items: GridItem[] = [...filteredGiveaways];
                  
                  // Show message if no giveaways
                  if (items.length === 0) {
                    return (
                      <motion.div
                        className="col-span-full text-center py-12"
                        initial={{ opacity: 0, y: 50 }}
                        animate={giveawaysInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8 }}
                      >
                        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-8 backdrop-blur-sm">
                          <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-white mb-2">No Giveaways Found</h3>
                          <p className="text-gray-400 mb-6">
                            {searchQuery 
                              ? `No giveaways match "${searchQuery}". Try adjusting your search.`
                              : "There are currently no active giveaways. Check back soon!"
                            }
                          </p>
                          {searchQuery && (
                            <Button
                              onClick={() => setSearchQuery("")}
                              variant="outline"
                              className="border-gray-600 text-gray-300 hover:text-white hover:border-yellow-500"
                            >
                              Clear Search
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  }
                  
                  // Insert ads at random positions
                  if (randomAds.length > 0) {
                    const adPositions = [];
                    for (let i = 0; i < randomAds.length; i++) {
                      const position = Math.floor(Math.random() * (items.length + 1));
                      adPositions.push({ ad: randomAds[i], position });
                    }
                    // Sort by position in descending order to avoid index shifting
                    adPositions.sort((a, b) => b.position - a.position);
                    adPositions.forEach(({ ad, position }) => {
                      items.splice(position, 0, { ...ad, isAd: true });
                    });
                  }
                  return items.map((item: GridItem, index) => {
                    // If it's an ad, render AdCard
                    if ('isAd' in item && item.isAd) {
                      return (
                        <motion.div
                          key={`ad-${item.id}`}
                          initial={{ opacity: 0, y: 50 }}
                          animate={giveawaysInView ? { opacity: 1, y: 0 } : {}}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                          whileHover={{ y: -10, scale: 1.02 }}
                        >
                          <AdCard ad={item as any} variant="giveaway" />
                        </motion.div>
                      );
                    }
                    
                    // Otherwise render giveaway
                    const giveaway = item;
                    return (
                      <motion.div
                        key={giveaway.id}
                        initial={{ opacity: 0, y: 50 }}
                        animate={giveawaysInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        whileHover={{ y: -10, scale: 1.02 }}
                        className="group"
                      >
                        <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 hover:border-yellow-400/50 transition-all duration-500 backdrop-blur-sm relative overflow-hidden h-full">
                          {/* Animated background on hover */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            initial={false}
                          />

                          <CardHeader className="p-0 relative">
                            <div className="relative overflow-hidden">
                              <motion.img
                                src={giveaway.image || "/cat.jpg"}
                                alt={giveaway.title}
                                className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                              />
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                                initial={false}
                              />

                              {/* Badges */}
                              <div className="absolute top-3 left-3 flex gap-2">
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  whileHover={{ scale: 1.1, rotate: 5 }}
                                >
                                  <Badge className={getDifficultyColor(giveaway.difficulty)}>{giveaway.difficulty}</Badge>
                                </motion.div>
                                {giveaway.featured && (
                                  <motion.div
                                    initial={{ scale: 0, rotate: 180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: index * 0.1 + 0.1 }}
                                    whileHover={{ scale: 1.1 }}
                                  >
                                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold">
                                      <Crown className="mr-1 h-3 w-3" />
                                      Featured
                                    </Badge>
                                  </motion.div>
                                )}
                                {giveaway.trending && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: index * 0.1 + 0.2 }}
                                    whileHover={{ scale: 1.1 }}
                                  >
                                    <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold">
                                      <TrendingUp className="mr-1 h-3 w-3" />
                                      Trending
                                    </Badge>
                                  </motion.div>
                                )}
                              </div>

                              <motion.div
                                className="absolute top-3 right-3"
                                initial={{ scale: 0, rotate: 180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: index * 0.1 + 0.3 }}
                                whileHover={{ scale: 1.1 }}
                              >
                                <Badge className="bg-gradient-to-r from-green-400 to-emerald-500 text-black font-bold text-lg px-3 py-1">
                                  ${giveaway.totalValue}
                                </Badge>
                              </motion.div>

                              {/* Creator info overlay */}
                              <div className="absolute bottom-3 left-3 right-3">
                                <div className="flex items-center gap-2 text-white/90">
                                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-black font-bold text-sm">
                                    {giveaway.creator?.[0] || 'U'}
                                  </div>
                                  <span className="text-sm font-medium">{giveaway.creator || 'Unknown Creator'}</span>
                                </div>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="p-6 relative z-10">
                            <CardTitle className="text-white text-xl mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                              <Link href={`/giveaway/${giveaway.id}`} className="hover:underline">
                                {giveaway.title}
                              </Link>
                            </CardTitle>
                            <CardDescription className="text-gray-400 mb-4 leading-relaxed line-clamp-3">
                              {giveaway.description}
                            </CardDescription>

                            {/* Progress Bar */}
                            <div className="mb-4">
                              <div className="flex justify-between text-sm text-gray-400 mb-2">
                                <span>{(giveaway.entries || 0).toLocaleString()} entries</span>
                                <span>{(giveaway.maxEntries || '∞').toString()}</span>
                              </div>
                              <div className="relative">
                                <Progress
                                  value={((giveaway.entries || 0) / (giveaway.maxEntries || 1)) * 100}
                                  className="h-3 bg-gray-700/50"
                                />
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-full"
                                  animate={{ opacity: [0.5, 1, 0.5] }}
                                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                                />
                              </div>
                            </div>

                            {/* Time and Stats */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center text-orange-500">
                                <Clock className="mr-2 h-4 w-4" />
                                <span className="font-semibold">{giveaway.timeLeft}</span>
                              </div>
                              <div className="flex items-center text-gray-400">
                                <Users className="mr-2 h-4 w-4" />
                                <span>{(giveaway.entries || 0).toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 mb-4">
                              {giveaway.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                                <motion.div
                                  key={tagIndex}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: index * 0.1 + tagIndex * 0.05 }}
                                  whileHover={{ scale: 1.05 }}
                                >
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-gray-700/50 text-gray-300 backdrop-blur-sm"
                                  >
                                    {tag}
                                  </Badge>
                                </motion.div>
                              ))}
                            </div>

                            {/* Requirements Preview */}
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-white mb-2 flex items-center">
                                <Target className="mr-1 h-4 w-4 text-yellow-400" />
                                Requirements:
                              </h4>
                              <ul className="space-y-1">
                                {giveaway.requirements.slice(0, 2).map((req: string, reqIndex: number) => (
                                  <li key={reqIndex} className="text-sm text-gray-400 flex items-center">
                                    <motion.div
                                      className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-2"
                                      animate={{ scale: [1, 1.3, 1] }}
                                      transition={{
                                        duration: 2,
                                        repeat: Number.POSITIVE_INFINITY,
                                        delay: reqIndex * 0.3,
                                      }}
                                    />
                                    {req}
                                  </li>
                                ))}
                                {giveaway.requirements.length > 2 && (
                                  <li className="text-sm text-gray-500">+{giveaway.requirements.length - 2} more...</li>
                                )}
                              </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                              <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button
                                  onClick={() => enterGiveaway(giveaway.id)}
                                  disabled={enteredGiveaways.includes(giveaway.id)}
                                  className={`w-full ${
                                    enteredGiveaways.includes(giveaway.id)
                                      ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                      : "bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600"
                                  } text-black font-bold shadow-lg transition-all duration-300`}
                                >
                                  {enteredGiveaways.includes(giveaway.id) ? (
                                    <>
                                      <Trophy className="mr-2 h-4 w-4" />
                                      Entered!
                                    </>
                                  ) : (
                                    <>
                                      <Gift className="mr-2 h-4 w-4" />
                                      Enter Now
                                    </>
                                  )}
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link href={`/giveaway/${giveaway.id}`}>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="border-gray-600 text-gray-300 hover:text-white hover:border-yellow-500 backdrop-blur-sm"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </motion.div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  });
                })()}
              </motion.div>
            </TabsContent>

            <TabsContent value="winners" className="mt-8">
              <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Trophy className="mr-2 h-5 w-5 text-yellow-400" />
                    Recent Winners
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Congratulations to our recent giveaway winners!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentWinners.map((winner, index) => (
                      <motion.div
                        key={winner.id}
                        className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg backdrop-blur-sm border border-gray-700/30"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 5 }}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <Image
                                src={winner.avatar || "/cat.jpg"}
                              alt={winner.winner}
                              width={40}
                              height={40}
                              className="w-12 h-12 rounded-full border-2 border-yellow-400/50"
                            />
                            {winner.verified && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <Award className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="text-white font-semibold flex items-center gap-2">
                              {winner.winner}
                              {winner.verified && (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                  Verified
                                </Badge>
                              )}
                            </h4>
                            <p className="text-gray-400 text-sm">{winner.prize}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <motion.div
                            className="text-yellow-400 font-bold text-lg"
                            animate={{
                              textShadow: ["0 0 0px currentColor", "0 0 10px currentColor", "0 0 0px currentColor"],
                            }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.3 }}
                          >
                            {winner.value}
                          </motion.div>
                          <div className="text-gray-500 text-sm">{winner.date}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rules" className="mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Giveaway Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-gray-300">
                    <div>
                      <h4 className="text-white font-semibold mb-2">Eligibility</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Must be 18+ or have parental consent</li>
                        <li>• One entry per person per giveaway</li>
                        <li>• Must complete all requirements to qualify</li>
                        <li>• Account must be in good standing</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">Selection Process</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Winners selected randomly from qualified entries</li>
                        <li>• Drawing occurs within 24 hours of giveaway end</li>
                        <li>• Winners notified via Discord and email</li>
                        <li>• 48 hours to claim prize or new winner selected</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">How to Enter</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-gray-300">
                    <div>
                      <h4 className="text-white font-semibold mb-2">Step 1: Meet Requirements</h4>
                      <p className="text-sm">Complete all listed requirements for the giveaway you want to enter.</p>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">Step 2: Click &quot;Enter&quot;</h4>
                      <p className="text-sm">Click the &quot;Enter Giveaway&quot; button to submit your entry.</p>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">Step 3: Wait for Results</h4>
                      <p className="text-sm">Winners are announced on our Discord server and website.</p>
                    </div>
                    <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
                      <h4 className="text-yellow-400 font-semibold mb-2">Pro Tip</h4>
                      <p className="text-sm">
                        Join our Discord server to get notified about new giveaways and increase your chances of
                        winning!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </>
  )
}
