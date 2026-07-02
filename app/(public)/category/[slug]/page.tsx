"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Filter, Grid, List, ChevronDown, Package } from "lucide-react"
import { useFrameworks } from "@/lib/use-frameworks"
import { PRICE_TIERS, PRICE_TIER_LABELS, classifyPriceTier } from "@/lib/price-tiers"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentss/ui/select"
import { Checkbox } from "@/componentss/ui/checkbox"
import { Slider } from "@/componentss/ui/slider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/componentss/ui/collapsible"
import { useParams } from "next/navigation"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import { ProductCard, type MarketProduct } from "@/componentss/marketplace/product-card"

interface Script {
  id: number
  title: string
  description: string
  price: number
  originalPrice?: number
  currency?: string
  currency_symbol?: string
  category: string
  framework?: string[]
  seller_name: string
  seller_email: string
  sellerId?: string
  tags: string[]
  features: string[]
  requirements: string[]
  images: string[]
  videos: string[]
  screenshots: string[]
  coverImage?: string
  demoUrl?: string
  documentationUrl?: string
  supportUrl?: string
  version: string
  lastUpdated: string
  status: "pending" | "approved" | "rejected"
  featured: boolean
  downloads: number
  rating: number
  reviewCount: number
  createdAt: string
  updatedAt: string
}

// Normalize a Script (live API shape) into the shared ProductCard MarketProduct shape.
function scriptToProduct(script: Script): MarketProduct {
  return {
    id: script.id,
    title: script.title,
    framework: script.framework,
    price: Number(script.price) || 0,
    originalPrice: script.originalPrice,
    free: Number(script.price) === 0,
    rating: typeof script.rating === "number" ? script.rating : Number(script.rating) || undefined,
    seller: script.seller_name,
    coverImage: script.coverImage,
    tag: script.featured ? "FEATURED" : Number(script.price) === 0 ? "FREE" : null,
    href: `/script/${script.id}`,
  }
}

export default function CategoryPage() {
  const params = useParams()
  const categorySlug = params.slug as string

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [priceRange, setPriceRange] = useState([0, 100])
  const [sortBy, setSortBy] = useState("popular")
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([])
  const [selectedPriceCategories, setSelectedPriceCategories] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  // Dynamic category name from the DB (falls back to the static map / slug).
  const [dbCategoryName, setDbCategoryName] = useState<string | null>(null)
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const m = Array.isArray(d?.categories)
          ? d.categories.find((c: any) => c.slug?.toLowerCase() === categorySlug?.toLowerCase())
          : null
        if (m) setDbCategoryName(m.name)
      })
      .catch(() => {})
  }, [categorySlug])

  // Category information
  const categoryInfo = {
    economy: {
      name: "Economy Scripts",
      description: "Banking systems, shops, businesses, and financial management scripts",
    },
    vehicles: {
      name: "Vehicle Scripts",
      description: "Car dealerships, garages, vehicle management, and automotive scripts",
    },
    jobs: {
      name: "Job Scripts",
      description: "Police, EMS, mechanic, and other career-based roleplay scripts",
    },
    housing: {
      name: "Housing Scripts",
      description: "Property systems, apartments, real estate, and housing management",
    },
    medical: {
      name: "Medical Scripts",
      description: "Hospital systems, medical equipment, and healthcare scripts",
    },
    police: {
      name: "Police Scripts",
      description: "Law enforcement tools, MDT systems, and police equipment",
    },
    utilities: {
      name: "Utility Scripts",
      description: "Admin tools, utilities, and helper scripts for server management",
    },
    core: {
      name: "Core Scripts",
      description: "Framework scripts, core systems, and essential server components",
    },
  }

  const baseCategory =
    categoryInfo[categorySlug as keyof typeof categoryInfo] ||
    {
      name: `${categorySlug ? categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1) : "All"} Products`,
      description: "Browse premium FiveM resources hand-picked for your server.",
    }
  const currentCategory = { ...baseCategory, name: dbCategoryName || baseCategory.name }

  useEffect(() => {
    const fetchScripts = async () => {
      // 8s timeout guard — DB may be absent in dev, so never infinite-spin.
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 15000)
      try {
        setLoading(true)
        const response = await fetch(`/api/scripts?status=all`, { signal: c.signal })

        if (!response.ok) {
          console.error("Failed to fetch scripts")
          return
        }

        const data = await response.json()
        const categoryScripts = (data.scripts || []).filter((script: Script) =>
          script.category.toLowerCase() === categorySlug.toLowerCase()
        )
        setScripts(categoryScripts)
      } catch (error) {
        if ((error as any)?.name !== "AbortError") console.error("Error fetching scripts:", error)
      } finally {
        clearTimeout(t)
        setLoading(false)
      }
    }

    fetchScripts()
  }, [categorySlug])

  const frameworks = [{ value: "All Frameworks", label: "All Frameworks" }, ...useFrameworks()]
  const priceCategories = PRICE_TIERS

  const handleFrameworkChange = (framework: string, checked: boolean) => {
    if (checked) {
      setSelectedFrameworks([...selectedFrameworks, framework])
    } else {
      setSelectedFrameworks(selectedFrameworks.filter((f) => f !== framework))
    }
  }

  const handlePriceCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedPriceCategories([...selectedPriceCategories, category])
    } else {
      setSelectedPriceCategories(selectedPriceCategories.filter((c) => c !== category))
    }
  }

  const sourceProducts: MarketProduct[] = useMemo(
    () => scripts.map(scriptToProduct),
    [scripts]
  )

  // Filter and sort products (works against the normalized MarketProduct shape).
  const filteredAndSortedScripts = useMemo(() => {
    let filtered = sourceProducts.filter((product) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          product.title.toLowerCase().includes(query) ||
          (product.seller?.toLowerCase().includes(query) ?? false)

        if (!matchesSearch) return false
      }

      // Framework filter
      if (selectedFrameworks.length > 0 && !selectedFrameworks.includes("All Frameworks")) {
        if (!product.framework || product.framework.length === 0) return false
        const hasMatch = product.framework.some((fw) =>
          selectedFrameworks.some((sel) => sel.toLowerCase() === fw.toLowerCase())
        )
        if (!hasMatch) return false
      }

      // Price range filter
      if (product.price < priceRange[0] || product.price > priceRange[1]) {
        return false
      }

      // Price category filter
      if (selectedPriceCategories.length > 0) {
        if (!selectedPriceCategories.includes(classifyPriceTier(product.price))) {
          return false
        }
      }

      return true
    })

    // Sort
    switch (sortBy) {
      case "popular":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case "price-low":
        filtered.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filtered.sort((a, b) => b.price - a.price)
        break
      case "newest":
        filtered.sort((a, b) => Number(b.id) - Number(a.id))
        break
      default:
        break
    }

    return filtered
  }, [sourceProducts, searchQuery, selectedFrameworks, selectedPriceCategories, priceRange, sortBy])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-orange-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#0a0a0a] text-white">
      <Navbar />

      {/* Header */}
      <section className="px-3 pt-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-sm font-semibold text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> Category
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{currentCategory.name}</h1>
          <p className="mt-3 max-w-2xl text-base text-white/55 sm:text-lg">{currentCategory.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/55">
            <span className="font-semibold text-white/70">{filteredAndSortedScripts.length}</span>
            <span>products found</span>
            <span className="text-white/20">•</span>
            <span>
              Category: {categorySlug ? categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1) : "All"}
            </span>
          </div>
        </div>
      </section>

      {/* Filters and Search */}
      <section className="mt-8 px-3 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-xl border-white/[0.08] bg-white/[0.04] pl-11 text-white backdrop-blur-md placeholder:text-white/55 focus-visible:border-orange-500/50 focus-visible:ring-orange-500/20"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-11 w-full rounded-xl border-white/[0.08] bg-white/[0.04] text-white backdrop-blur-md sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="border-white/[0.08] bg-[#0d0d0f] text-white">
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`flex h-11 w-11 items-center justify-center transition ${
                  viewMode === "grid" ? "bg-orange-500 text-black" : "text-white/60 hover:bg-white/10"
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`flex h-11 w-11 items-center justify-center transition ${
                  viewMode === "list" ? "bg-orange-500 text-black" : "text-white/60 hover:bg-white/10"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="rounded-xl border-white/[0.08] bg-white/[0.04] text-white/80 backdrop-blur-md hover:bg-white/10 hover:text-white"
              >
                <Filter className="mr-2 h-4 w-4" />
                Advanced Filters
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="grid grid-cols-1 gap-6 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-md md:grid-cols-3">
                {/* Framework Filter */}
                <div>
                  <h3 className="mb-3 font-semibold text-white">Framework</h3>
                  <div className="space-y-2.5">
                    {frameworks.map((framework) => (
                      <div key={framework.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={framework.value}
                          checked={selectedFrameworks.includes(framework.value)}
                          onCheckedChange={(checked) => handleFrameworkChange(framework.value, checked as boolean)}
                          className="border-white/20 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500"
                        />
                        <label htmlFor={framework.value} className="text-sm text-white/70">
                          {framework.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Category Filter */}
                <div>
                  <h3 className="mb-3 font-semibold text-white">Price Category</h3>
                  <div className="space-y-2.5">
                    {priceCategories.map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={category}
                          checked={selectedPriceCategories.includes(category)}
                          onCheckedChange={(checked) => handlePriceCategoryChange(category, checked as boolean)}
                          className="border-white/20 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500"
                        />
                        <label htmlFor={category} className="text-sm text-white/70">
                          {PRICE_TIER_LABELS[category]}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div>
                  <h3 className="mb-3 font-semibold text-white">Price Range</h3>
                  <div className="space-y-4">
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-white/50">
                      <span>${priceRange[0]}</span>
                      <span>${priceRange[1]}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

        </div>
      </section>

      {/* Products Grid / List */}
      <main className="mx-auto mt-10 max-w-7xl px-3 pb-20 sm:px-6">
        {filteredAndSortedScripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] py-20 text-center backdrop-blur-md">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
              <Package className="h-7 w-7 text-orange-400" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">No products found</h3>
            <p className="text-sm text-white/55">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "flex flex-col items-center gap-6 sm:items-stretch"
            }
          >
            {filteredAndSortedScripts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                className={viewMode === "grid" ? "w-full sm:max-w-[280px]" : "w-full sm:max-w-none"}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
