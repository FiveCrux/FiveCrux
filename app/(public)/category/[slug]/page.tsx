"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Filter, Star, ShoppingCart, Grid, List, ChevronDown } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentss/ui/select"
import { Checkbox } from "@/componentss/ui/checkbox"
import { Slider } from "@/componentss/ui/slider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/componentss/ui/collapsible"
import Link from "next/link"
import { useParams } from "next/navigation"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"

interface Script {
  id: number
  title: string
  description: string
  price: number
  original_price?: number
  category: string
  framework?: string[]
  seller_name: string
  seller_email: string
  seller_id?: string
  tags: string[]
  features: string[]
  requirements: string[]
  images: string[]
  videos: string[]
  screenshots: string[]
  cover_image?: string
  demo_url?: string
  documentation_url?: string
  support_url?: string
  version: string
  last_updated: string
  status: "pending" | "approved" | "rejected"
  featured: boolean
  downloads: number
  rating: number
  review_count: number
  created_at: string
  updated_at: string
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

  const currentCategory = categoryInfo[categorySlug as keyof typeof categoryInfo] || categoryInfo.economy

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/scripts?status=all`)
        
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
        console.error("Error fetching scripts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchScripts()
  }, [categorySlug])

  const frameworks = [
    { value: "All Frameworks", label: "All Frameworks" },
    { value: "qbcore", label: "QBCore" },
    { value: "qbox", label: "Qbox" },
    { value: "esx", label: "ESX" },
    { value: "ox", label: "OX" },
    { value: "standalone", label: "Standalone" }
  ]
  const priceCategories = ["Budget ($0-$15)", "Standard ($15-$30)", "Premium ($30+)"]

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

  // Filter and sort scripts
  const filteredAndSortedScripts = useMemo(() => {
    let filtered = scripts.filter((script) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          script.title.toLowerCase().includes(query) ||
          script.description.toLowerCase().includes(query) ||
          script.tags.some(tag => tag.toLowerCase().includes(query))
        
        if (!matchesSearch) return false
      }

      // Framework filter
      if (selectedFrameworks.length > 0 && !selectedFrameworks.includes("All Frameworks")) {
        if (!script.framework || script.framework.length === 0) return false
        const hasMatch = script.framework.some((fw) => selectedFrameworks.includes(fw))
        if (!hasMatch) return false
      }

      // Price range filter
      if (script.price < priceRange[0] || script.price > priceRange[1]) {
        return false
      }

      // Price category filter
      if (selectedPriceCategories.length > 0) {
        const priceCategory = script.price <= 15 ? "Budget ($0-$15)" : 
                            script.price <= 30 ? "Standard ($15-$30)" : "Premium ($30+)"
        if (!selectedPriceCategories.includes(priceCategory)) {
          return false
        }
      }

      return true
    })

    // Sort scripts
    switch (sortBy) {
      case "popular":
        filtered.sort((a, b) => b.downloads - a.downloads)
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
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      default:
        break
    }

    return filtered
  }, [scripts, searchQuery, selectedFrameworks, selectedPriceCategories, priceRange, sortBy])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">{currentCategory.name}</h1>
            <p className="text-gray-400 text-lg mb-6">{currentCategory.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{filteredAndSortedScripts.length} scripts found</span>
              <span>•</span>
              <span>Category: {categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)}</span>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="mb-8 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search scripts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800/30 border-gray-700 text-white placeholder-gray-400"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4">
              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48 bg-gray-800/30 border-gray-700 text-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode */}
              <div className="flex border border-gray-700 rounded-lg">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="bg-gray-800/30 border-gray-700 text-white hover:bg-gray-700"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="bg-gray-800/30 border-gray-700 text-white hover:bg-gray-700"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white">
                  <Filter className="mr-2 h-4 w-4" />
                  Advanced Filters
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Framework Filter */}
                  <div>
                    <h3 className="text-white font-semibold mb-3">Framework</h3>
                    <div className="space-y-2">
                      {frameworks.map((framework) => (
                        <div key={framework.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={framework.value}
                            checked={selectedFrameworks.includes(framework.value)}
                            onCheckedChange={(checked) => handleFrameworkChange(framework.value, checked as boolean)}
                            className="border-gray-600"
                          />
                          <label htmlFor={framework.value} className="text-sm text-gray-300">
                            {framework.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Category Filter */}
                  <div>
                    <h3 className="text-white font-semibold mb-3">Price Category</h3>
                    <div className="space-y-2">
                      {priceCategories.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={category}
                            checked={selectedPriceCategories.includes(category)}
                            onCheckedChange={(checked) => handlePriceCategoryChange(category, checked as boolean)}
                            className="border-gray-600"
                          />
                          <label htmlFor={category} className="text-sm text-gray-300">
                            {category}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Range Filter */}
                  <div>
                    <h3 className="text-white font-semibold mb-3">Price Range</h3>
                    <div className="space-y-4">
                      <Slider
                        value={priceRange}
                        onValueChange={setPriceRange}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>${priceRange[0]}</span>
                        <span>${priceRange[1]}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Scripts Grid/List */}
          {filteredAndSortedScripts.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-white mb-2">No scripts found</h3>
              <p className="text-gray-400">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {filteredAndSortedScripts.map((script) => {
                const discount = script.original_price ? Math.round(((script.original_price - script.price) / script.original_price) * 100) : 0
                const coverImage = script.cover_image || "/placeholder.jpg"

                return (
                  <Card key={script.id} className="bg-gray-800/30 border-gray-700/50 hover:border-orange-500/50 transition-all duration-300">
                    <CardHeader className="p-0">
                      <div className="relative overflow-hidden rounded-t-lg">
                        <img
                          src={coverImage}
                          alt={script.title}
                          className="w-full h-48 object-cover transition-transform duration-300 hover:scale-110"
                          loading="lazy"
                        />
                        {discount > 0 && (
                          <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                            -{discount}%
                          </Badge>
                        )}
                        {script.featured && (
                          <Badge className="absolute top-2 left-2 bg-yellow-500 text-black">
                            Featured
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                          {script.category}
                        </Badge>
                         {script.framework && script.framework.length > 0 && (
                           <div className="flex flex-wrap gap-1">
                             {script.framework.map((fw, idx) => (
                               <Badge key={idx} variant="secondary" className="bg-gray-700/50 text-gray-300 text-xs">
                                 {fw}
                               </Badge>
                             ))}
                           </div>
                         )}
                      </div>
                      
                      <Link href={`/script/${script.id}`}>
                        <CardTitle className="text-white hover:text-orange-500 transition-colors cursor-pointer mb-2">
                          {script.title}
                        </CardTitle>
                      </Link>
                      
                      <CardDescription className="text-gray-400 mb-3 line-clamp-2">
                        {script.description}
                      </CardDescription>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                                                             className={`h-4 w-4 ${
                                 i < Math.floor(Number(script.rating) || 0) ? "text-yellow-400 fill-current" : "text-gray-600"
                               }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-400">({script.review_count || 0})</span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-400">{script.downloads || 0} downloads</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-orange-500">${script.price}</span>
                          {script.original_price && (
                            <span className="text-sm text-gray-500 line-through">${script.original_price}</span>
                          )}
                        </div>
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Add to Cart
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
