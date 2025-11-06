"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { Search, Filter, Star, Eye, Grid, List, ChevronDown, X, Sparkles, Zap, Code, DollarSign, Sliders } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentss/ui/select"
import { Checkbox } from "@/componentss/ui/checkbox"
import { Slider } from "@/componentss/ui/slider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/componentss/ui/collapsible"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import AdCard, { useRandomAds } from "@/componentss/ads/ad-card"

// Animated background particles - Client only to avoid hydration issues
const AnimatedParticles = () => {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) return null
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-orange-500/30 rounded-full"
          animate={{
            x: [0, (i * 40) - 100],
            y: [0, (i * 30) - 75],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 15 + (i * 2),
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.5,
          }}
          style={{
            left: `${20 + (i * 15)}%`,
            top: `${25 + (i * 12)}%`,
          }}
        />
      ))}
    </div>
  )
}

export default function ScriptsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const filtersRef = useRef(null)
  const scriptsRef = useRef(null)
  const filterContainerRef = useRef<HTMLDivElement>(null)

  const filtersInView = useInView(filtersRef, { once: true })
  const scriptsInView = useInView(scriptsRef, { once: true })

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [priceRange, setPriceRange] = useState<number[]>([0, 100])
  const [sortBy, setSortBy] = useState("popular")
  const categoryParam = searchParams.get("category") ?? ""

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => (categoryParam ? [categoryParam] : []))

  useEffect(() => {
    setSelectedCategories(categoryParam ? [categoryParam] : [])
  }, [categoryParam])

  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([])
  const [selectedPriceCategories, setSelectedPriceCategories] = useState<string[]>([])
  const [onSaleOnly, setOnSaleOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [openFilter, setOpenFilter] = useState<string | null>(null)

  type UIScript = {
    id: number
    title: string
    description: string
    price: number
    originalPrice?: number
    rating: number
    reviews: number
    image: string
    category: string
    categoryName: string
    seller: string
    discount: number
    framework?: string[]
    priceCategory: string
    tags: string[]
    lastUpdated: string
  }

  type GridItem = UIScript | (any & { isAd: boolean })

  const [allScripts, setAllScripts] = useState<UIScript[]>([])
  const [ads, setAds] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        console.log("Loading scripts...")
        const [scriptsRes, adsRes] = await Promise.all([
          fetch(`/api/scripts`, { cache: "no-store" }),
          fetch(`/api/ads/scripts`, { cache: "no-store" })
        ])
        
        if (scriptsRes.ok) {
          const data = await scriptsRes.json()
          console.log("Scripts API data:", data)
          console.log("Scripts count:", data.scripts?.length || 0)
          
          const mappedScripts = (data.scripts || []).map((s: any) => {
            const image = s.cover_image || (s.images && s.images[0]) || (s.screenshots && s.screenshots[0]) || "/placeholder.jpg"
            console.log(`Script ${s.id} (${s.title}): cover_image=${s.cover_image}, images=${JSON.stringify(s.images)}, screenshots=${JSON.stringify(s.screenshots)}, final image=${image}`)
            return {
              id: s.id,
              title: s.title,
              description: s.description,
              price: Number(s.price) || 0,
              originalPrice: s.original_price ? Number(s.original_price) : undefined,
              rating: s.rating || 0,
              reviews: s.review_count || 0,
              image: image,
              category: s.category,
              categoryName: s.category,
              seller: s.seller_name,
              discount: s.original_price ? Math.max(0, Math.round(((Number(s.original_price) - Number(s.price)) / Number(s.original_price)) * 100)) : 0,
              framework: Array.isArray(s.framework) ? s.framework : (s.framework ? [s.framework] : []),
              priceCategory: Number(s.price) <= 15 ? "Budget" : Number(s.price) <= 30 ? "Standard" : "Premium",
              tags: (s.tags || []) as string[],
              lastUpdated: s.updated_at,
            }
          })
          console.log("Mapped scripts:", mappedScripts)
          setAllScripts(mappedScripts)
        }

        if (adsRes.ok) {
          const adsData = await adsRes.json()
          setAds(adsData.ads || [])
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }
    load()
  }, [])

  const categories = [
    { id: "economy", name: "Economy" },
    { id: "vehicles", name: "Vehicles" },
    { id: "jobs", name: "Jobs" },
    { id: "housing", name: "Housing" },
    { id: "medical", name: "Medical" },
    { id: "police", name: "Police" },
    { id: "utilities", name: "Utilities" },
    { id: "core", name: "Core" },
  ]

  const frameworks = [
    { value: "All Frameworks", label: "All Frameworks" },
    { value: "qbcore", label: "QBCore" },
    { value: "qbox", label: "Qbox" },
    { value: "esx", label: "ESX" },
    { value: "ox", label: "OX" },
    { value: "standalone", label: "Standalone" }
  ]
  const priceCategories = ["Budget", "Standard", "Premium"]

  // Real-time filtering logic
  const filteredScripts = useMemo(() => {
    return allScripts.filter((script) => {
      if (
        searchQuery &&
        !script.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !script.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !script.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      ) {
        return false
      }

      if (selectedCategories.length > 0 && !selectedCategories.includes(script.category)) {
        return false
      }

      if (selectedFrameworks.length > 0 && !selectedFrameworks.includes("All Frameworks")) {
        if (!script.framework || script.framework.length === 0) return false
        const hasMatch = script.framework.some((fw: string) => selectedFrameworks.includes(fw))
        if (!hasMatch) return false
      }

      if (selectedPriceCategories.length > 0 && !selectedPriceCategories.includes(script.priceCategory)) {
        return false
      }

      if (priceRange && priceRange.length === 2) {
        if (script.price < priceRange[0] || script.price > priceRange[1]) {
          return false
        }
      }

      if (onSaleOnly && script.discount === 0) {
        return false
      }

      return true
    })
  }, [
    allScripts,
    searchQuery,
    selectedCategories,
    selectedFrameworks,
    selectedPriceCategories,
    priceRange,
    onSaleOnly,
  ])



  // Sorting logic
  const sortedScripts = useMemo(() => {
    const scripts = [...filteredScripts]
    switch (sortBy) {
      case "price-low":
        return scripts.sort((a, b) => a.price - b.price)
      case "price-high":
        return scripts.sort((a, b) => b.price - a.price)
      case "rating":
        return scripts.sort((a, b) => b.rating - a.rating)
      case "newest":
        return scripts.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      default:
        return scripts.sort((a, b) => b.reviews - a.reviews)
    }
  }, [filteredScripts, sortBy])

  // Debug logging removed for production

  const handleCategoryChange = useCallback((category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, category])
    } else {
      setSelectedCategories(prev => prev.filter((c) => c !== category))
    }
  }, [])

  const handleFrameworkChange = useCallback((framework: string, checked: boolean) => {
    if (checked) {
      setSelectedFrameworks(prev => [...prev, framework])
    } else {
      setSelectedFrameworks(prev => prev.filter((f) => f !== framework))
    }
  }, [])

  const handlePriceCategoryChange = useCallback((category: string, checked: boolean) => {
    if (checked) {
      setSelectedPriceCategories(prev => [...prev, category])
    } else {
      setSelectedPriceCategories(prev => prev.filter((c) => c !== category))
    }
  }, [])

  const clearAllFilters = useCallback(() => {
    setSelectedCategories([])
    setSelectedFrameworks([])
    setSelectedPriceCategories([])
    setPriceRange([0, 100])
    setOnSaleOnly(false)
    setSearchQuery("")
    router.push("/scripts")
  }, [router])

  const removeFilter = useCallback((type: string, value: string | number) => {
    switch (type) {
      case "category":
        handleCategoryChange(value as string, false)
        break
      case "framework":
        handleFrameworkChange(value as string, false)
        break
      case "priceCategory":
        handlePriceCategoryChange(value as string, false)
        break
    }
  }, [handleCategoryChange, handleFrameworkChange, handlePriceCategoryChange])

  const activeFiltersCount = useMemo(() => 
    selectedCategories.length +
    selectedFrameworks.length +
    selectedPriceCategories.length +
    (onSaleOnly ? 1 : 0),
    [selectedCategories.length, selectedFrameworks.length, selectedPriceCategories.length, onSaleOnly]
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        filterContainerRef.current &&
        !filterContainerRef.current.contains(target) &&
        openFilter !== null
      ) {
        setOpenFilter(null)
      }
    }

    if (openFilter !== null) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [openFilter])

  // Get random ads for scripts page
  const randomAds = useRandomAds(ads, 2)

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        <AnimatedParticles />

        {/* Animated background */}
        <div className="fixed inset-0 -z-10">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"
            animate={{
              background: [
                "radial-gradient(circle at 20% 50%, rgba(249, 115, 22, 0.05) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 20%, rgba(234, 179, 8, 0.05) 0%, transparent 50%)",
                "radial-gradient(circle at 40% 80%, rgba(249, 115, 22, 0.05) 0%, transparent 50%)",
              ],
            }}
            transition={{
              duration: 8,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        </div>

        {/* Header */}
        <motion.div
          className="bg-gray-900/30 backdrop-blur-xl py-8 px-4 sm:px-6 lg:px-8 border-b border-gray-800/50 mt-11"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="max-w-7xl mx-auto">
            <motion.nav
              className="flex items-center space-x-2 text-sm text-gray-400 mb-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link href="/" className="hover:text-orange-500 transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-white">All Scripts</span>
            </motion.nav>

            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
                All Scripts
              </span>
            </motion.h1>

            <motion.p
              className="text-gray-400 mb-4 text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Browse our complete collection of premium FiveM scripts
            </motion.p>

            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                {sortedScripts.length} scripts found
              </div>
              {activeFiltersCount > 0 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400">{activeFiltersCount} filters active</span>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-8">
            {/* Main Content */}
            <motion.div
              ref={scriptsRef}
              className="flex-1"
              initial={{ opacity: 0, x: 50 }}
              animate={scriptsInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
            >
              {/* Filters Bar */}
              <motion.div
                ref={filtersRef}
                className="mb-6 relative z-30"
                initial={{ opacity: 0, y: -20 }}
                animate={filtersInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8 }}
              >
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-xl">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                      {/* Filter Header */}
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.05 }}>
                          <Filter className="h-5 w-5 text-orange-500" />
                          <span className="text-white font-semibold">Filters</span>
                          {activeFiltersCount > 0 && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.1 }}>
                              <Badge className="bg-orange-500 text-white">{activeFiltersCount}</Badge>
                            </motion.div>
                          )}
                        </motion.div>
                        {activeFiltersCount > 0 && (
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearAllFilters}
                              className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
                            >
                              Clear All
                            </Button>
                          </motion.div>
                        )}
                      </div>

                      {/* Horizontal Filters */}
                      <div ref={filterContainerRef} className="flex flex-wrap gap-3 items-start">
                        {/* Categories Filter */}
                        <Collapsible open={openFilter === "categories"} onOpenChange={(open) => setOpenFilter(open ? "categories" : null)}>
                          <div className="relative z-30">
                            <CollapsibleTrigger asChild>
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="outline"
                                  className={`bg-gradient-to-r from-gray-800/80 to-gray-900/80 border-2 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
                                    openFilter === "categories"
                                      ? "border-orange-500 bg-gradient-to-r from-orange-500/20 to-orange-600/20 shadow-orange-500/50"
                                      : "border-gray-600/50 hover:border-orange-500/70 hover:from-gray-700/80 hover:to-gray-800/80"
                                  }`}
                                >
                                  <span className="text-sm font-medium flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    Categories
                                  </span>
                                  <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-300 ${openFilter === "categories" ? "rotate-180" : ""}`} />
                                </Button>
                              </motion.div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="absolute z-[100] mt-2 left-0 bg-gray-900 border border-gray-700/50 rounded-lg p-4 shadow-xl min-w-[200px]">
                            <div className="space-y-2">
                              {categories.map((category) => (
                                <motion.div
                                  key={category.id}
                                  className="flex items-center space-x-2"
                                  whileHover={{ x: 5 }}
                                >
                                  <Checkbox
                                    id={`category-${category.id}`}
                                    checked={selectedCategories.includes(category.id)}
                                    onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                                  />
                                  <label
                                    htmlFor={`category-${category.id}`}
                                    className="text-sm text-gray-300 hover:text-white transition-colors cursor-pointer"
                                  >
                                    {category.name}
                                  </label>
                                </motion.div>
                              ))}
                            </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>

                        {/* Framework Filter */}
                        <Collapsible open={openFilter === "framework"} onOpenChange={(open) => setOpenFilter(open ? "framework" : null)}>
                          <div className="relative z-30">
                            <CollapsibleTrigger asChild>
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="outline"
                                  className={`bg-gradient-to-r from-gray-800/80 to-gray-900/80 border-2 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
                                    openFilter === "framework"
                                      ? "border-orange-500 bg-gradient-to-r from-orange-500/20 to-orange-600/20 shadow-orange-500/50"
                                      : "border-gray-600/50 hover:border-orange-500/70 hover:from-gray-700/80 hover:to-gray-800/80"
                                  }`}
                                >
                                  <span className="text-sm font-medium flex items-center gap-2">
                                    <Code className="h-4 w-4" />
                                    Framework
                                  </span>
                                  <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-300 ${openFilter === "framework" ? "rotate-180" : ""}`} />
                                </Button>
                              </motion.div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="absolute z-[100] mt-2 left-0 bg-gray-900 border border-gray-700/50 rounded-lg p-4 shadow-xl min-w-[200px]">
                            <div className="space-y-2">
                              {frameworks.map((framework) => (
                                <motion.div
                                  key={framework.value}
                                  className="flex items-center space-x-2"
                                  whileHover={{ x: 5 }}
                                >
                                  <Checkbox
                                    id={`framework-${framework.value}`}
                                    checked={selectedFrameworks.includes(framework.value)}
                                    onCheckedChange={(checked) => handleFrameworkChange(framework.value, checked as boolean)}
                                  />
                                  <label
                                    htmlFor={`framework-${framework.value}`}
                                    className="text-sm text-gray-300 hover:text-white transition-colors cursor-pointer"
                                  >
                                    {framework.label}
                                  </label>
                                </motion.div>
                              ))}
                            </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>

                        {/* Price Range Filter */}
                        <Collapsible open={openFilter === "priceRange"} onOpenChange={(open) => setOpenFilter(open ? "priceRange" : null)}>
                          <div className="relative z-30">
                            <CollapsibleTrigger asChild>
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="outline"
                                  className={`bg-gradient-to-r from-gray-800/80 to-gray-900/80 border-2 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
                                    openFilter === "priceRange"
                                      ? "border-orange-500 bg-gradient-to-r from-orange-500/20 to-orange-600/20 shadow-orange-500/50"
                                      : "border-gray-600/50 hover:border-orange-500/70 hover:from-gray-700/80 hover:to-gray-800/80"
                                  }`}
                                >
                                  <span className="text-sm font-medium flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    Price Range
                                  </span>
                                  <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-300 ${openFilter === "priceRange" ? "rotate-180" : ""}`} />
                                </Button>
                              </motion.div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="absolute z-[100] mt-2 left-0 bg-gray-900 border border-gray-700/50 rounded-lg p-4 shadow-xl min-w-[200px]">
                            <div className="space-y-3">
                              {priceCategories.map((category) => (
                                <motion.div
                                  key={category}
                                  className="flex items-center space-x-2"
                                  whileHover={{ x: 5 }}
                                >
                                  <Checkbox
                                    id={`price-${category}`}
                                    checked={selectedPriceCategories.includes(category)}
                                    onCheckedChange={(checked) => handlePriceCategoryChange(category, checked as boolean)}
                                  />
                                  <label
                                    htmlFor={`price-${category}`}
                                    className="text-sm text-gray-300 hover:text-white transition-colors cursor-pointer"
                                  >
                                    {category} {category === "Budget" && "($0-$15)"}
                                    {category === "Standard" && "($15-$30)"}
                                    {category === "Premium" && "($30+)"}
                                  </label>
                                </motion.div>
                              ))}
                            </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>

                        {/* Custom Price Range */}
                        <Collapsible open={openFilter === "customPrice"} onOpenChange={(open) => setOpenFilter(open ? "customPrice" : null)}>
                          <div className="relative z-30">
                            <CollapsibleTrigger asChild>
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="outline"
                                  className={`bg-gradient-to-r from-gray-800/80 to-gray-900/80 border-2 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
                                    openFilter === "customPrice"
                                      ? "border-orange-500 bg-gradient-to-r from-orange-500/20 to-orange-600/20 shadow-orange-500/50"
                                      : "border-gray-600/50 hover:border-orange-500/70 hover:from-gray-700/80 hover:to-gray-800/80"
                                  }`}
                                >
                                  <span className="text-sm font-medium flex items-center gap-2">
                                    <Sliders className="h-4 w-4" />
                                    Custom: ${priceRange[0]}-${priceRange[1]}
                                  </span>
                                  <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-300 ${openFilter === "customPrice" ? "rotate-180" : ""}`} />
                                </Button>
                              </motion.div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="absolute z-[100] mt-2 left-0 bg-gray-900 border border-gray-700/50 rounded-lg p-4 shadow-xl min-w-[250px]">
                              <Slider value={priceRange} onValueChange={setPriceRange} max={100} step={1} className="w-full" />
                            </CollapsibleContent>
                          </div>
                        </Collapsible>

                        {/* On Sale Only Filter */}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="outline"
                            className={`bg-gradient-to-r from-gray-800/80 to-gray-900/80 border-2 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
                              onSaleOnly
                                ? "border-orange-500 bg-gradient-to-r from-orange-500/20 to-orange-600/20 shadow-orange-500/50"
                                : "border-gray-600/50 hover:border-orange-500/70 hover:from-gray-700/80 hover:to-gray-800/80"
                            }`}
                            onClick={() => setOnSaleOnly(!onSaleOnly)}
                          >
                            <Checkbox
                              id="on-sale"
                              checked={onSaleOnly}
                              onCheckedChange={(checked) => setOnSaleOnly(checked as boolean)}
                              className="mr-2"
                            />
                            <span className="text-sm font-medium flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              On Sale Only
                            </span>
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              {/* Search and Sort Bar */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 mb-6 relative z-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex-1 relative group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4  " />
                  <Input
                    type="search"
                    placeholder="Search scripts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-900/30 border-gray-700/50 text-white placeholder-gray-400 focus:border-orange-500 focus:bg-gray-900/50 transition-all duration-300"
                  />
                </div>
                <motion.div whileHover={{ scale: 1.02 }}>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48 bg-gray-900/30 border-gray-700/50 text-white backdrop-blur-sm">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900/95 border-gray-700/50 backdrop-blur-xl">
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
                <div className="flex border border-gray-700/50 rounded-md backdrop-blur-sm">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className={viewMode === "grid" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={viewMode === "list" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>

              {/* Active Filters */}
              <AnimatePresence>
                {activeFiltersCount > 0 && (
                  <motion.div
                    className="mb-6"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="flex flex-wrap gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ staggerChildren: 0.05 }}
                    >
                      {selectedCategories.map((category, index) => (
                        <motion.div
                          key={category}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          <Badge
                            variant="secondary"
                            className="bg-orange-500/20 text-orange-400 border-orange-500/30 flex items-center gap-1 backdrop-blur-sm"
                          >
                            {categories.find((c) => c.id === category)?.name}
                            <motion.button
                              onClick={() => removeFilter("category", category)}
                              className="hover:text-white transition-colors"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.8 }}
                            >
                              <X className="h-3 w-3" />
                            </motion.button>
                          </Badge>
                        </motion.div>
                      ))}
                      {selectedFrameworks.map((framework, index) => {
                        const frameworkObj = frameworks.find(f => f.value === framework)
                        return (
                          <motion.div
                            key={framework}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.05 }}
                          >
                            <Badge
                              variant="secondary"
                              className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1 backdrop-blur-sm"
                            >
                              {frameworkObj?.label || framework}
                              <motion.button
                                onClick={() => removeFilter("framework", framework)}
                                className="hover:text-white transition-colors"
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.8 }}
                              >
                                <X className="h-3 w-3" />
                              </motion.button>
                            </Badge>
                          </motion.div>
                        )
                      })}
                      {selectedPriceCategories.map((category, index) => (
                        <motion.div
                          key={category}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          <Badge
                            variant="secondary"
                            className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex items-center gap-1 backdrop-blur-sm"
                          >
                            {category}
                            <motion.button
                              onClick={() => removeFilter("priceCategory", category)}
                              className="hover:text-white transition-colors"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.8 }}
                            >
                              <X className="h-3 w-3" />
                            </motion.button>
                          </Badge>
                        </motion.div>
                      ))}
                      {onSaleOnly && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          <Badge
                            variant="secondary"
                            className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1 backdrop-blur-sm"
                          >
                            On Sale
                            <motion.button
                              onClick={() => setOnSaleOnly(false)}
                              className="hover:text-white transition-colors"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.8 }}
                            >
                              <X className="h-3 w-3" />
                            </motion.button>
                          </Badge>
                        </motion.div>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results Count */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-gray-400 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  Showing {sortedScripts.length} of {allScripts.length} scripts
                  {searchQuery && (
                    <span className="text-orange-500">
                      for <span className="font-semibold">{searchQuery}</span>
                    </span>
                  )}
                </p>
              </motion.div>

              {/* Scripts Grid/List */}
              <AnimatePresence mode="wait">
                {sortedScripts.length === 0 ? (
                  <motion.div
                    className="text-center py-20"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="mb-6"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                    >
                      <Search className="h-16 w-16 text-gray-600 mx-auto" />
                    </motion.div>
                    <p className="text-gray-400 text-xl mb-6">No scripts found matching your criteria</p>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={clearAllFilters}
                        className="bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-semibold"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Clear All Filters
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : (
                                    <motion.div
                    className={
                      viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"
                    }
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, staggerChildren: 0.1 }}
                  >
                                        {(() => {
                      const items: GridItem[] = [...sortedScripts];
                      // Insert ads at deterministic positions to avoid hydration issues
                      if (randomAds.length > 0) {
                        const adPositions = [];
                        for (let i = 0; i < randomAds.length; i++) {
                          // Use deterministic positioning based on index to avoid hydration issues
                          const position = Math.floor((i * (items.length + 1)) / randomAds.length);
                          adPositions.push({ ad: randomAds[i], position });
                        }
                        // Sort by position in descending order to avoid index shifting
                        adPositions.sort((a, b) => b.position - a.position);
                        adPositions.forEach(({ ad, position }) => {
                          items.splice(position, 0, { ...ad, isAd: true } as GridItem);
                        });
                      }
                      return items.map((item: GridItem, index) => {
                        // If it's an ad, render AdCard
                        if ('isAd' in item && item.isAd) {
                          return (
                            <motion.div
                              key={`ad-${item.id}`}
                              initial={{ opacity: 0, y: 50 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: index * 0.05 }}
                              whileHover={{ y: -5, scale: 1.02 }}
                            >
                              <AdCard ad={item as any} variant="script" />
                            </motion.div>
                          );
                        }
                        
                        // Otherwise render script
                        const script = item as UIScript;
                        return (
                          <motion.div
                            key={script.id}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className="group"
                      >
                        <Card
                          className={`bg-gray-800/30 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 cursor-pointer h-full backdrop-blur-sm relative overflow-hidden ${viewMode === "list" ? "flex" : ""}`}
                        >
                          {/* Animated background on hover */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            initial={false}
                          />

                          <CardHeader className={`p-0 relative ${viewMode === "list" ? "w-48 flex-shrink-0" : ""}`}>
                            <div className="relative overflow-hidden">
                              <motion.img
                                src={script.image || "/placeholder.jpg"}
                                alt={script.title}
                                className={`object-cover transition-transform duration-500 group-hover:scale-110 ${viewMode === "list" ? "w-full h-32 rounded-l-lg" : "w-full h-48 rounded-t-lg"}`}
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/placeholder.jpg";
                                }}
                              />
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                initial={false}
                              />
                              {script.discount > 0 && (
                                <motion.div
                                  className="absolute top-2 left-2"
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  whileHover={{ scale: 1.1, rotate: 5 }}
                                >
                                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold">
                                    -{script.discount}%
                                  </Badge>
                                </motion.div>
                              )}
                              <motion.div
                                className="absolute top-2 right-2"
                                initial={{ scale: 0, rotate: 180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: index * 0.05 + 0.1 }}
                                whileHover={{ scale: 1.1 }}
                              >
                                <div className="flex flex-wrap gap-1">
                                  {script.framework?.map((fw, idx) => (
                                    <Badge key={idx} className="bg-black/80 text-white backdrop-blur-sm text-xs">{fw}</Badge>
                                  ))}
                                </div>
                              </motion.div>
                            </div>
                          </CardHeader>

                          <CardContent className={`p-4 relative z-10 ${viewMode === "list" ? "flex-1" : ""}`}>
                            <div className={viewMode === "list" ? "flex justify-between h-full" : ""}>
                              <div className={viewMode === "list" ? "flex-1 pr-4" : ""}>
                                <CardTitle className="text-white text-lg mb-2 group-hover:text-orange-500 transition-colors duration-300">
                                  <Link href={`/script/${script.id}`} className="hover:underline">
                                    {script.title}
                                  </Link>
                                </CardTitle>
                                <CardDescription className="text-gray-400 text-sm mb-3 leading-relaxed">
                                  {script.description}
                                </CardDescription>
                                <div className="flex items-center mb-3">
                                  <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                      <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05 + i * 0.02 }}
                                      >
                                        <Star
                                          className={`h-4 w-4 ${
                                            i < Math.floor(Number(script.rating) || 0)
                                              ? "text-yellow-400 fill-current"
                                              : "text-gray-600"
                                          }`}
                                        />
                                      </motion.div>
                                    ))}
                                  </div>
                                  <span className="text-sm text-gray-400 ml-2">
                                    {(Number(script.rating) || 0).toFixed(1)} ({script.reviews})
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-3">
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ scale: 1.05 }}
                                  >
                                    <Badge
                                      variant="secondary"
                                      className="text-xs bg-gray-700/50 text-gray-300 backdrop-blur-sm"
                                    >
                                      {script.categoryName}
                                    </Badge>
                                  </motion.div>
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 + 0.05 }}
                                    whileHover={{ scale: 1.05 }}
                                  >
                                    <Badge
                                      variant="secondary"
                                      className="text-xs bg-gray-700/50 text-gray-300 backdrop-blur-sm"
                                    >
                                      {script.priceCategory}
                                    </Badge>
                                  </motion.div>
                                </div>
                                <div className="text-xs text-gray-500">by {script.seller}</div>
                              </div>
                              <div
                                className={`${viewMode === "list" ? "flex flex-col justify-between items-end" : "flex items-center justify-between mt-4"}`}
                              >
                                <div
                                  className={`${viewMode === "list" ? "text-right mb-4" : "flex items-center space-x-2"}`}
                                >
                                  <motion.span
                                    className="text-orange-500 font-bold text-lg"
                                    animate={{
                                      textShadow: [
                                        "0 0 0px currentColor",
                                        "0 0 10px currentColor",
                                        "0 0 0px currentColor",
                                      ],
                                    }}
                                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.1 }}
                                  >
                                    ${script.price}
                                  </motion.span>
                                  {script.originalPrice && (
                                    <span className="text-gray-500 line-through text-sm">${script.originalPrice}</span>
                                  )}
                                </div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Link href={`/script/${script.id}`}>
                                    <Button
                                      size="sm"
                                      className="bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-semibold shadow-lg"
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </Button>
                                  </Link>
                                </motion.div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                        );
                      });
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pagination */}
              {sortedScripts.length > 0 && (
                <motion.div
                  className="flex justify-center mt-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex space-x-2">
                    {["Previous", "1", "2", "3", "Next"].map((item, index) => (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant={item === "1" ? "default" : "outline"}
                          className={
                            item === "1"
                              ? "bg-orange-500 text-white"
                              : "bg-gray-900/30 border-gray-700/50 text-white hover:bg-orange-500 hover:border-orange-500 backdrop-blur-sm"
                          }
                        >
                          {item}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
