"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Star,
  Eye,
  Grid,
  List,
  ChevronDown,
  X,
  Sparkles,
  Zap,
  Code,
  DollarSign,
  Sliders,
} from "lucide-react";
import { Button } from "@/componentss/ui/button";
import { Input } from "@/componentss/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentss/ui/card";
import { Badge } from "@/componentss/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/componentss/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentss/ui/select";
import { Checkbox } from "@/componentss/ui/checkbox";
import { Slider } from "@/componentss/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/componentss/ui/collapsible";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import AdCard, { useRandomAds } from "@/componentss/ads/ad-card";
import { VerifiedIcon } from "@/componentss/shared/verified-icon";
import { isVerifiedCreator } from "@/lib/utils";
import Image from "next/image";
import { InfiniteMovingCards } from "@/componentss/ui/infinite-moving-cards";
import FeaturedScriptCard from "@/componentss/featured-scripts/featured-script-card";
import { MARKETPLACE_SEED } from "@/lib/marketplace-seed";
// Animated background particles - Client only to avoid hydration issues
const AnimatedParticles = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-orange-500/30 rounded-full"
          animate={{
            x: [0, i * 40 - 100],
            y: [0, i * 30 - 75],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 15 + i * 2,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.5,
          }}
          style={{
            left: `${20 + i * 15}%`,
            top: `${25 + i * 12}%`,
          }}
        />
      ))}
    </div>
  );
};

export default function PropsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filtersRef = useRef(null);
  const propsRef = useRef(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  const filtersInView = useInView(filtersRef, { once: true });
  const propsInView = useInView(propsRef, { once: true });
  const priceRangeInitialized = useRef(false);
  const propsShuffled = useRef(false);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
  const [sortBy, setSortBy] = useState("popular");
  const categoryParam = searchParams.get("category") ?? "";

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    categoryParam ? [categoryParam] : []
  );

  useEffect(() => {
    setSelectedCategories(categoryParam ? [categoryParam] : []);
  }, [categoryParam]);

  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [selectedPriceCategories, setSelectedPriceCategories] = useState<
    string[]
  >([]);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  type UIProp = {
    id: number;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    currency?: string;
    currency_symbol?: string;
    rating: number;
    reviews: number;
    image: string;
    category: string;
    categoryName: string;
    seller: string;
    seller_id?: string;
    seller_image?: string | null;
    seller_roles?: string[] | null;
    discount: number;
    framework?: string[];
    priceCategory: string;
    tags: string[];
    lastUpdated: string;
    featured?: boolean;
    free?: boolean;
  };

  type GridItem = UIProp | (any & { isAd: boolean });

  const [allProps, setAllProps] = useState<UIProp[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        console.log("Loading props...");
        const [propsRes, adsRes] = await Promise.all([
          fetch(`/api/props`, { cache: "no-store" }),
          fetch(`/api/ads/props`, { cache: "no-store" }),
        ]);

        if (propsRes.ok) {
          const data = await propsRes.json();
          console.log("Props API data:", data);
          console.log("Props count:", data.props?.length || 0);

          const mappedProps = (data.props || []).map((s: any) => {
            const image = (s.images && s.images[0]) || "/placeholder.jpg";
            return {
              id: s.id,
              title: s.name,
              description: s.description,
              price: Number(s.discountedPrice || s.price) || 0,
              originalPrice: Number(s.price),
              currency: "EUR",
              currency_symbol: "€",
              rating: 5,
              reviews: 0,
              image: image,
              category: "props",
              categoryName: "Props",
              seller: s.user?.name || s.user?.username || "FiveCrux",
              seller_image: s.user?.profilePicture || s.user?.image || null,
              seller_roles: s.user?.roles || null,
              discount: Number(s.discountPercentage) || 0,
              framework: [],
              priceCategory:
                Number(s.price) <= 15
                  ? "Budget"
                  : Number(s.price) <= 30
                  ? "Standard"
                  : "Premium",
              tags: [],
              lastUpdated: s.updatedAt || s.createdAt,
              featured: false,
              free: Number(s.price) === 0,
            };
          });
          console.log("Mapped props:", mappedProps);
          
          // Shuffle the array to randomize order only on initial page load
          if (!propsShuffled.current) {
            const shuffledProps = [...mappedProps].sort(() => Math.random() - 0.5);
            setAllProps(shuffledProps);
            propsShuffled.current = true;
          } else {
            // If already shuffled, just set the props without shuffling again
            setAllProps(mappedProps);
          }
        }

        if (adsRes.ok) {
          const adsData = await adsRes.json();
          setAds(adsData.ads || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Demo fallback: when the API returns no props (empty DB / local dev), show the
  // scraped marketplace seed so the page can be audited populated. Real data always wins.
  // Prefer category 'prop', then fill with 'mlo'/'clothing'. All are surfaced under the
  // page's single "props" category so the existing filters keep working.
  // TODO: remove before production.
  const seedProps: UIProp[] = useMemo(() => {
    const PROP_CATEGORIES = ["prop", "mlo", "clothing"];
    const ordered = [...MARKETPLACE_SEED]
      .filter((p) => PROP_CATEGORIES.includes(p.category))
      .sort(
        (a, b) =>
          PROP_CATEGORIES.indexOf(a.category) -
          PROP_CATEGORIES.indexOf(b.category)
      );
    return ordered.map((p) => ({
      id: Number(p.id),
      title: p.title,
      description: "",
      price: p.price,
      originalPrice: p.originalPrice,
      currency_symbol: "$",
      rating: p.rating ?? 0,
      reviews: 0,
      image: p.coverImage || "/placeholder.jpg",
      category: "props",
      categoryName: "Props",
      seller: p.seller || "Unknown",
      seller_image: p.sellerImage || null,
      seller_roles: null,
      discount:
        p.originalPrice && p.originalPrice > p.price
          ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
          : 0,
      framework: p.framework || [],
      priceCategory:
        p.price <= 15 ? "Budget" : p.price <= 30 ? "Standard" : "Premium",
      tags: [],
      lastUpdated: "",
      featured: p.tag === "FEATURED",
      free: !!p.free || p.price === 0,
    }));
  }, []);

  useEffect(() => {
    if (!loading && allProps.length === 0) {
      setAllProps(seedProps);
    }
  }, [loading, allProps.length, seedProps]);

  const categories = [
    { id: "props", name: "Props" },
    { id: "maps", name: "Maps" },
    { id: "props", name: "Props" },
    { id: "clothing", name: "Clothing" },
    { id: "economy", name: "Economy" },
    { id: "vehicles", name: "Vehicles" },
  ];


  const frameworks = [
    { value: "qbcore", label: "QBCore" },
    { value: "qbox", label: "Qbox" },
    { value: "esx", label: "ESX" },
    { value: "ox", label: "OX" },
    { value: "vrp", label: "VRP" },
    { value: "standalone", label: "Standalone" },
  ]
  const priceCategories = ["Budget", "Standard", "Premium"];

  // Calculate min and max prices from props for dynamic slider range
  const priceBounds = useMemo(() => {
    if (allProps.length === 0) return { min: 0, max: 1000 };
    const prices = allProps.map((s) => s.price).filter((p) => p > 0);
    if (prices.length === 0) return { min: 0, max: 1000 };
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    // Round to nice numbers
    const roundedMin = Math.floor(min / 10) * 10; // Round down to nearest 10
    const roundedMax = Math.ceil(max / 10) * 10; // Round up to nearest 10
    return { min: roundedMin, max: roundedMax };
  }, [allProps]);

  // Initialize price range when props are loaded (only once)
  useEffect(() => {
    if (allProps.length > 0 && !priceRangeInitialized.current && priceBounds.max > 0) {
      setPriceRange([priceBounds.min, priceBounds.max]);
      priceRangeInitialized.current = true;
    }
  }, [allProps.length, priceBounds.min, priceBounds.max]);

  // Real-time filtering logic
  const filteredProps = useMemo(() => {
    return allProps.filter((prop) => {
      if (
        searchQuery &&
        !prop.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !prop.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !prop.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ) {
        return false;
      }

      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(prop.category)
      ) {
        return false;
      }

      if (
        selectedFrameworks.length > 0 &&
        !selectedFrameworks.includes("All Frameworks")
      ) {
        if (!prop.framework || prop.framework.length === 0) return false;
        const hasMatch = prop.framework.some((fw: string) =>
          selectedFrameworks.includes(fw)
        );
        if (!hasMatch) return false;
      }

      // Only apply price filter if range is not at full bounds
      if (priceRange && priceRange.length === 2) {
        const isAtFullRange = 
          priceRange[0] === priceBounds.min && 
          priceRange[1] === priceBounds.max;
        if (!isAtFullRange) {
          if (prop.price < priceRange[0] || prop.price > priceRange[1]) {
            return false;
          }
        }
      }

      if (onSaleOnly && prop.discount === 0) {
        return false;
      }

      if (freeOnly && !prop.free) {
        return false;
      }

      return true;
    });
  }, [
    allProps,
    searchQuery,
    selectedCategories,
    selectedFrameworks,
    priceRange,
    priceBounds,
    onSaleOnly,
    freeOnly,
  ]);

  // Sorting logic
  const sortedProps = useMemo(() => {
    const props = [...filteredProps];
    switch (sortBy) {
      case "price-low":
        return props.sort((a, b) => a.price - b.price);
      case "price-high":
        return props.sort((a, b) => b.price - a.price);
      case "rating":
        return props.sort((a, b) => b.rating - a.rating);
      case "newest":
        return props.sort(
          (a, b) =>
            new Date(b.lastUpdated).getTime() -
            new Date(a.lastUpdated).getTime()
        );
      default:
        return props.sort((a, b) => b.reviews - a.reviews);
    }
  }, [filteredProps, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(sortedProps.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProps = sortedProps.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProps, sortBy]);

  // Debug logging removed for production

  const handleCategoryChange = useCallback(
    (category: string, checked: boolean) => {
      if (checked) {
        setSelectedCategories((prev) => [...prev, category]);
      } else {
        setSelectedCategories((prev) => prev.filter((c) => c !== category));
      }
    },
    []
  );

  const handleFrameworkChange = useCallback(
    (framework: string, checked: boolean) => {
      if (checked) {
        setSelectedFrameworks((prev) => [...prev, framework]);
      } else {
        setSelectedFrameworks((prev) => prev.filter((f) => f !== framework));
      }
    },
    []
  );

  const handlePriceCategoryChange = useCallback(
    (category: string, checked: boolean) => {
      if (checked) {
        setSelectedPriceCategories((prev) => [...prev, category]);
      } else {
        setSelectedPriceCategories((prev) =>
          prev.filter((c) => c !== category)
        );
      }
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedFrameworks([]);
    setSelectedPriceCategories([]);
    setPriceRange([priceBounds.min, priceBounds.max]);
    setOnSaleOnly(false);
    setFreeOnly(false);
    setSearchQuery("");
    router.push("/props");
  }, [router, priceBounds]);

  const removeFilter = useCallback(
    (type: string, value: string | number) => {
      switch (type) {
        case "category":
          handleCategoryChange(value as string, false);
          break;
        case "framework":
          handleFrameworkChange(value as string, false);
          break;
        case "priceCategory":
          handlePriceCategoryChange(value as string, false);
          break;
      }
    },
    [handleCategoryChange, handleFrameworkChange, handlePriceCategoryChange]
  );

  const activeFiltersCount = useMemo(
    () =>
      selectedCategories.length +
      selectedFrameworks.length +
      (priceRange[0] !== priceBounds.min || priceRange[1] !== priceBounds.max ? 1 : 0) +
      (onSaleOnly ? 1 : 0) +
      (freeOnly ? 1 : 0),
    [
      selectedCategories.length,
      selectedFrameworks.length,
      priceRange,
      priceBounds,
      onSaleOnly,
      freeOnly,
    ]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        filterContainerRef.current &&
        !filterContainerRef.current.contains(target) &&
        openFilter !== null
      ) {
        setOpenFilter(null);
      }
    };

    if (openFilter !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [openFilter]);

  // Get random ads for props page
  const randomAds = useRandomAds(ads, 2);
  
  // Memoize ad positions based on current sorted props and ads
  // This ensures positions are stable when filters change (only recalculates when props or ads actually change)
  const memoizedAdPositions = useMemo(() => {
    if (randomAds.length === 0 || sortedProps.length === 0) {
      return [];
    }
    
    const positions: number[] = [];
    const usedPositions = new Set<number>();
    
    // Generate random positions for each ad based on current sorted props
    for (let i = 0; i < randomAds.length; i++) {
      let attempts = 0;
      let position: number;
      
      do {
        position = Math.floor(Math.random() * sortedProps.length);
        attempts++;
      } while (usedPositions.has(position) && attempts < 100);
      
      if (usedPositions.has(position)) {
        for (let j = 0; j < sortedProps.length; j++) {
          if (!usedPositions.has(j)) {
            position = j;
            break;
          }
        }
      }
      
      usedPositions.add(position);
      positions.push(position);
    }
    
    return positions.sort((a, b) => a - b);
  }, [randomAds.map(ad => ad.id).join(','), sortedProps.length]); // Only recalculate when ads or total count changes, not when filters change

  return (
    <>
      <Navbar />
      <div className="min-h-screen text-white relative overflow-hidden">
        <AnimatedParticles />

        {/* Animated background */}
        <div className="fixed inset-0 -z-10">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-gray-300 via-gray-600 to-gray-300"
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
          className="bg-neutral-850 backdrop-blur-xl py-8 px-4 sm:px-6 lg:px-8 border-b border-neutral-800/50 mt-11"
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
              <Link
                href="/"
                className="hover:text-orange-500 transition-colors"
              >
                Home
              </Link>
              <span>/</span>
              <span className="text-white">All Props</span>
            </motion.nav>

            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
                All Props
              </span>
            </motion.h1>

            <motion.p
              className="text-gray-400 mb-4 text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Browse our complete collection of premium FiveM props
            </motion.p>

            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {!loading && (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  {sortedProps.length} props found
                </div>
              )}
              {activeFiltersCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400">
                    {activeFiltersCount} filters active
                  </span>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>



        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-8">
            {/* Main Content */}
            <motion.div
              ref={propsRef}
              className="flex-1"
              initial={{ opacity: 0, x: 50 }}
              animate={propsInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
            >
              {/* Filters Bar */}
              <motion.div
                ref={filtersRef}
                className="mb-6 relative z-50"
                initial={{ opacity: 0, y: -20 }}
                animate={filtersInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8 }}
              >
                <Card className="bg-neutral-800/30 border-neutral-700/50 backdrop-blur-xl relative z-50">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                      {/* Filter Header */}
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <motion.div
                          className="flex items-center gap-2"
                          whileHover={{ scale: 1.05 }}
                        >
                          <Filter className="h-5 w-5 text-orange-500" />
                          <span className="text-white font-semibold">
                            Filters
                          </span>
                          {activeFiltersCount > 0 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              whileHover={{ scale: 1.1 }}
                            >
                              <Badge className="bg-orange-500 text-white">
                                {activeFiltersCount}
                              </Badge>
                            </motion.div>
                          )}
                        </motion.div>
                        {activeFiltersCount > 0 && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
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
                      <div
                        ref={filterContainerRef}
                        className="flex flex-wrap gap-3 items-start relative z-50"
                      >
                        {/* Categories Filter */}
                        <Collapsible
                          open={openFilter === "categories"}
                          onOpenChange={(open) =>
                            setOpenFilter(open ? "categories" : null)
                          }
                        >
                          <div className="relative z-[60]">
                            <CollapsibleTrigger asChild>
                              <motion.div
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  variant="outline"
                                  className={`bg-gradient-to-br from-gray-800 to-gray-900 border-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-lg transition-all duration-300 ${
                                    openFilter === "categories" ||
                                    selectedCategories.length > 0
                                      ? "border-orange-500 bg-gradient-to-br from-orange-500/20 to-orange-600/20 shadow-orange-500/50"
                                      : "border-neutral-600/50 hover:border-orange-500/70"
                                  }`}
                                >
                                  <span className="text-sm font-semibold flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-orange-400" />
                                    Categories
                                    {selectedCategories.length > 0 && (
                                      <span className="ml-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                        {selectedCategories.length}
                                      </span>
                                    )}
                                  </span>
                                  <ChevronDown
                                    className={`ml-2 h-4 w-4 transition-transform duration-300 text-orange-400 ${
                                      openFilter === "categories"
                                        ? "rotate-180"
                                        : ""
                                    }`}
                                  />
                                </Button>
                              </motion.div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="absolute z-[200] mt-2 left-0 bg-neutral-900 border border-neutral-700/50 rounded-lg p-4 shadow-xl min-w-[200px]">
                              <div className="space-y-2">
                                {categories.map((category) => (
                                  <motion.div
                                    key={category.id}
                                    className="flex items-center space-x-2"
                                    whileHover={{ x: 5 }}
                                  >
                                    <Checkbox
                                      id={`category-${category.id}`}
                                      checked={selectedCategories.includes(
                                        category.id
                                      )}
                                      onCheckedChange={(checked) =>
                                        handleCategoryChange(
                                          category.id,
                                          checked as boolean
                                        )
                                      }
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
                        <Collapsible
                          open={openFilter === "framework"}
                          onOpenChange={(open) =>
                            setOpenFilter(open ? "framework" : null)
                          }
                        >
                          <div className="relative z-[60]">
                            <CollapsibleTrigger asChild>
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  variant="outline"
                                  className={`bg-gradient-to-r from-gray-800/80 to-gray-900/80 border-2 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
                                    openFilter === "framework"
                                      ? "border-orange-500 bg-gradient-to-r from-orange-500/20 to-orange-600/20 shadow-orange-500/50"
                                      : "border-neutral-600/50 hover:border-orange-500/70 hover:from-gray-700/80 hover:to-gray-800/80"
                                  }`}
                                >
                                  <span className="text-sm font-medium flex items-center gap-2">
                                    <Code className="h-4 w-4" />
                                    Framework
                                  </span>
                                  <ChevronDown
                                    className={`ml-2 h-4 w-4 transition-transform duration-300 ${
                                      openFilter === "framework"
                                        ? "rotate-180"
                                        : ""
                                    }`}
                                  />
                                </Button>
                              </motion.div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="absolute z-[200] mt-2 left-0 bg-neutral-900 border border-neutral-700/50 rounded-lg p-4 shadow-xl min-w-[200px]">
                              <div className="space-y-2">
                                {frameworks.map((framework) => (
                                  <motion.div
                                    key={framework.value}
                                    className="flex items-center space-x-2"
                                    whileHover={{ x: 5 }}
                                  >
                                    <Checkbox
                                      id={`framework-${framework.value}`}
                                      checked={selectedFrameworks.includes(
                                        framework.value
                                      )}
                                      onCheckedChange={(checked) =>
                                        handleFrameworkChange(
                                          framework.value,
                                          checked as boolean
                                        )
                                      }
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

                        {/* Price Filter - Combined */}
                        <Collapsible
                          open={openFilter === "price"}
                          onOpenChange={(open) =>
                            setOpenFilter(open ? "price" : null)
                          }
                        >
                          <div className="relative z-[60]">
                            <CollapsibleTrigger asChild>
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  variant="outline"
                                  className={`bg-gradient-to-r from-gray-800/80 to-gray-900/80 border-2 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
                                    openFilter === "price" ||
                                    priceRange[0] !== priceBounds.min ||
                                    priceRange[1] !== priceBounds.max ||
                                    freeOnly
                                      ? "border-orange-500 bg-gradient-to-r from-orange-500/20 to-orange-600/20 shadow-orange-500/50"
                                      : "border-neutral-600/50 hover:border-orange-500/70 hover:from-gray-700/80 hover:to-gray-800/80"
                                  }`}
                                >
                                  <span className="text-sm font-medium flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    Price
                                    {(priceRange[0] !== priceBounds.min ||
                                      priceRange[1] !== priceBounds.max) && (
                                      <span className="text-orange-400">
                                        {` ${priceRange[0]}-${priceRange[1]}`}
                                      </span>
                                    )}
                                    {freeOnly && (
                                      <span className="text-orange-400">
                                        {priceRange[0] !== priceBounds.min || priceRange[1] !== priceBounds.max ? ", " : " "}Free
                                      </span>
                                    )}
                                  </span>
                                  <ChevronDown
                                    className={`ml-2 h-4 w-4 transition-transform duration-300 ${
                                      openFilter === "price" ? "rotate-180" : ""
                                    }`}
                                  />
                                </Button>
                              </motion.div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="absolute z-[200] mt-2 left-0 bg-neutral-900 border border-neutral-700/50 rounded-lg p-4 shadow-xl min-w-[250px]">
                              <div className="space-y-4">
                                {/* Price Range */}
                                <div>
                                  <h4 className="text-white font-semibold mb-3 text-sm">
                                    Price Range
                                  </h4>
                                  <Slider
                                    value={priceRange}
                                    onValueChange={setPriceRange}
                                    max={priceBounds.max}
                                    min={priceBounds.min}
                                    step={1}
                                    className="w-full mb-2"
                                  />
                                  <div className="flex justify-between text-sm text-gray-400">
                                    <span>{priceRange[0]}</span>
                                    <span>{priceRange[1]}</span>
                                  </div>
                                </div>
                                
                                {/* Free Toggle */}
                                <div className="border-t border-neutral-700/50 pt-4">
                                  <motion.div
                                    className="flex items-center space-x-2"
                                    whileHover={{ x: 5 }}
                                  >
                                    <Checkbox
                                      id="free-only"
                                      checked={freeOnly}
                                      onCheckedChange={(checked) =>
                                        setFreeOnly(checked as boolean)
                                      }
                                    />
                                    <label
                                      htmlFor="free-only"
                                      className="text-sm text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
                                    >
                                      <Zap className="h-4 w-4 text-orange-400" />
                                      Free Only
                                    </label>
                                  </motion.div>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>

                        {/* On Sale Only Filter */}
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <label
                            className={`flex items-center cursor-pointer bg-gradient-to-r from-gray-800/80 to-gray-900/80 border-2 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
                              onSaleOnly
                                ? "border-orange-500 bg-gradient-to-r from-orange-500/20 to-orange-600/20 shadow-orange-500/50"
                                : "border-neutral-600/50 hover:border-orange-500/70 hover:from-gray-700/80 hover:to-gray-800/80"
                            }`}
                          >
                            <Checkbox
                              id="on-sale"
                              checked={onSaleOnly}
                              onCheckedChange={(checked) =>
                                setOnSaleOnly(checked as boolean)
                              }
                              className="mr-2"
                            />
                            <span className="text-sm font-medium flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              On Sale Only
                            </span>
                          </label>
                        </motion.div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              {/* Search and Sort Bar */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 mb-6 relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex-1 relative group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4  " />
                  <Input
                    type="search"
                    placeholder="Search props..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-neutral-900/30 border-neutral-700/50 text-white placeholder-gray-400 focus:border-orange-500 focus:bg-neutral-900/50 transition-all duration-300"
                  />
                </div>
                <motion.div whileHover={{ scale: 1.02 }}>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48 bg-neutral-900/30 border-neutral-700/50 text-white backdrop-blur-sm">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900/95 border-neutral-700/50 backdrop-blur-xl">
                      <SelectItem value="popular" className="text-white">
                        Most Popular
                      </SelectItem>
                      <SelectItem value="newest" className="text-white">
                        Newest First
                      </SelectItem>
                      <SelectItem value="price-low" className="text-white">
                        Price: Low to High
                      </SelectItem>
                      <SelectItem value="price-high" className="text-white">
                        Price: High to Low
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
                {/* <div className="hidden sm:flex border border-neutral-700/50 rounded-md backdrop-blur-sm">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className={
                        viewMode === "grid"
                          ? "bg-orange-500 text-white"
                          : "text-gray-400 hover:text-white"
                      }
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={
                        viewMode === "list"
                          ? "bg-orange-500 text-white"
                          : "text-gray-400 hover:text-white"
                      }
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div> */}
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
                        const frameworkObj = frameworks.find(
                          (f) => f.value === framework
                        );
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
                                onClick={() =>
                                  removeFilter("framework", framework)
                                }
                                className="hover:text-white transition-colors"
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.8 }}
                              >
                                <X className="h-3 w-3" />
                              </motion.button>
                            </Badge>
                          </motion.div>
                        );
                      })}
                      {(priceRange[0] !== priceBounds.min || priceRange[1] !== priceBounds.max) && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          <Badge
                            variant="secondary"
                            className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex items-center gap-1 backdrop-blur-sm"
                          >
                            Price: {priceRange[0]}-{priceRange[1]}
                            <motion.button
                              onClick={() => setPriceRange([priceBounds.min, priceBounds.max])}
                              className="hover:text-white transition-colors"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.8 }}
                            >
                              <X className="h-3 w-3" />
                            </motion.button>
                          </Badge>
                        </motion.div>
                      )}
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
                      {freeOnly && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          <Badge
                            variant="secondary"
                            className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1 backdrop-blur-sm"
                          >
                            Free
                            <motion.button
                              onClick={() => setFreeOnly(false)}
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
              {!loading && (
                <motion.div
                  className="mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-gray-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    Showing {sortedProps.length} of {allProps.length} props
                    {searchQuery && (
                      <span className="text-orange-500">
                        for <span className="font-semibold">{searchQuery}</span>
                      </span>
                    )}
                  </p>
                </motion.div>
              )}

              {/* Props Grid/List */}
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                        : "space-y-4"
                    }
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, staggerChildren: 0.1 }}
                  >
                    {Array.from({ length: 6 }).map((_, index) => (
                      <motion.div
                        key={index}
                        className={`bg-neutral-900 border-2 border-neutral-700/50 backdrop-blur-sm rounded-lg overflow-hidden ${
                          viewMode === "list"
                            ? "flex flex-row"
                            : "flex flex-col"
                        }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        {/* Image Skeleton */}
                        <div
                          className={`bg-neutral-800/50 animate-pulse ${
                            viewMode === "list"
                              ? "w-56 flex-shrink-0 h-full"
                              : "w-full h-52"
                          }`}
                        />
                        {/* Content Skeleton */}
                        <div className="flex flex-col flex-1 p-3 space-y-3">
                          <div className="space-y-2">
                            <div className="h-5 bg-neutral-800/50 rounded animate-pulse w-3/4" />
                            <div className="h-4 bg-neutral-800/50 rounded animate-pulse w-1/2" />
                          </div>
                          <div className="flex gap-2">
                            <div className="h-5 w-16 bg-neutral-800/50 rounded animate-pulse" />
                            <div className="h-5 w-16 bg-neutral-800/50 rounded animate-pulse" />
                          </div>
                          <div className="h-4 bg-neutral-800/50 rounded animate-pulse w-2/3" />
                          <div className="h-6 bg-neutral-800/50 rounded animate-pulse w-20" />
                          <div className="mt-auto pt-2">
                            <div className="h-8 bg-neutral-800/50 rounded animate-pulse w-full" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : sortedProps.length === 0 ? (
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
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    >
                      <Search className="h-16 w-16 text-gray-600 mx-auto" />
                    </motion.div>
                    <p className="text-gray-400 text-xl mb-6">
                      No props found matching your criteria
                    </p>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
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
                      viewMode === "grid"
                        ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                        : "space-y-4"
                    }
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, staggerChildren: 0.1 }}
                  >
                    {(() => {
                      const items: GridItem[] = [...paginatedProps];
                      // Insert ads at memoized positions (only if they fall within current page)
                      if (randomAds.length > 0 && items.length > 0 && memoizedAdPositions.length > 0) {
                        const adPositions: Array<{ ad: any; position: number }> = [];
                        
                        // Find which ads should appear on this page based on memoized positions
                        for (let i = 0; i < randomAds.length && i < memoizedAdPositions.length; i++) {
                          const globalPosition = memoizedAdPositions[i];
                          // Check if this ad position falls within the current page
                          if (globalPosition >= startIndex && globalPosition < endIndex) {
                            // Convert global position to local page position
                            const localPosition = globalPosition - startIndex;
                            adPositions.push({ 
                              ad: randomAds[i], 
                              position: localPosition 
                            });
                          }
                        }
                        
                        // Sort by position in descending order to avoid index shifting when inserting
                        adPositions.sort((a, b) => b.position - a.position);
                        adPositions.forEach(({ ad, position }) => {
                          items.splice(position, 0, {
                            ...ad,
                            isAd: true,
                          } as GridItem);
                        });
                      }
                      return items.map((item: GridItem, index) => {
                        // If it's an ad, render AdCard
                        if ("isAd" in item && item.isAd) {
                          return (
                            <AdCard
                              key={`ad-${item.id}`}
                              ad={item as any}
                              variant="script"
                            />
                          );
                        }

                        // Otherwise render prop
                        const prop = item as UIProp;
                        return (
                          <motion.div key={prop.id} className="group" whileHover={{ y: -5, scale: 1.02 }}>
                            <Link href={`/props/${prop.id}`}>
                              <Card
                                className={`bg-neutral-900 border-neutral-700/50 hover:border-white cursor-pointer h-full backdrop-blur-sm relative overflow-hidden shadow-2xl rounded-lg transition-all duration-300 ${
                                  viewMode === "list"
                                    ? "flex flex-row"
                                    : "flex flex-col"
                                }`}
                              >
                                {/* Image Section */}
                                <CardHeader
                                  className={`p-0 overflow-hidden relative ${
                                    viewMode === "list"
                                      ? "w-56 flex-shrink-0 rounded-l-lg"
                                      : "rounded-t-lg"
                                  }`}
                                >
                                  <Image
                                    src={prop.image || "/placeholder.jpg"}
                                    alt={prop.title}
                                    width={400}
                                    height={256}
                                    className={`object-cover w-full ${
                                      viewMode === "list" ? "h-full" : "h-52"
                                    }`}
                                  />
                                  {prop.featured && (
                                    <Badge className="absolute top-2 left-2 bg-yellow-500 text-black font-semibold shadow-lg">
                                      Featured
                                    </Badge>
                                  )}
                                </CardHeader>

                                {/* Content Section */}
                                <div className="flex flex-col flex-1">
                                  <CardContent className="p-3 flex-1 space-y-2">
                                    {/* Title */}
                                    <CardTitle className="text-base font-bold text-white leading-tight line-clamp-2">
                                      {prop.title}
                                    </CardTitle>


                                    {/* Framework Badges */}
                                    {prop.framework &&
                                      prop.framework.length > 0 && (
                                        <motion.div
                                          className="flex flex-wrap gap-1"
                                          // initial={{ scale: 0, rotate: 180 }}
                                          // animate={{ scale: 1, rotate: 0 }}
                                        >
                                          {prop.framework.map((fw, idx) => (
                                            <motion.div
                                              key={idx}
                                              
                                            >
                                              <Badge className="bg-neutral-800/95 text-white backdrop-blur-sm text-[10px] font-bold border border-neutral-600/50 rounded px-1.5 py-0.5 uppercase tracking-wide shadow-lg hover:bg-neutral-800/95 hover:text-white">
                                                <span className="mr-1 text-xs">
                                                  •
                                                </span>
                                                {fw}
                                              </Badge>
                                            </motion.div>
                                          ))}
                                        </motion.div>
                                      )}
                                      
                                    {/* Description */}
                                    <CardDescription className="text-neutral-400 text-xs leading-snug flex items-center gap-1.5 flex-row">
                                      <Avatar className="h-4 w-4 flex-shrink-0">
                                        <AvatarImage
                                          src={prop.seller_image || "/placeholder-user.jpg"}
                                          alt={prop.seller}
                                        />
                                        <AvatarFallback className="bg-orange-500 text-white text-[8px] font-bold">
                                          {(prop.seller && prop.seller !== "FiveCrux") ? prop.seller[0].toUpperCase() : "5"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="whitespace-nowrap">By {prop.seller}</span>
                                      {isVerifiedCreator(prop.seller_roles) && (
                                        <VerifiedIcon size="sm" className="flex-shrink-0" />
                                      )}
                                    </CardDescription>
                                    {/* Price */}
                                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                                      {prop.free ? (
                                        <span className="text-orange-500 text-xl font-bold">Free</span>
                                      ) : (
                                        <>
                                          {prop.discount > 0 && prop.originalPrice ? (
                                            <>
                                              <span className="text-gray-500 text-sm line-through">
                                                {prop.currency_symbol || "$"}{prop.originalPrice}
                                              </span>
                                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs font-semibold px-2 py-0.5">
                                                -{prop.discount}%
                                              </Badge>
                                            </>
                                          ) : null}
                                          <span className="text-orange-500 text-xl font-bold">
                                            {prop.currency_symbol || "$"}{prop.price}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </CardContent>

                                  {/* Button Section */}
                                  <div className="px-3 pb-3 mt-auto">
                                    <Button
                                      variant="outline"
                                      className="w-full bg-white text-black hover:bg-gray-300 hover:border-gray-300 hover:text-black transition-colors duration-200 font-semibold text-xs py-1.5 h-auto"
                                    >
                                      View Details
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            </Link>
                          </motion.div>
                        );
                      });
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pagination */}
              {sortedProps.length > 0 && totalPages > 1 && (
                <motion.div
                  className="flex justify-center mt-12 px-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex flex-wrap justify-center gap-2">
                    {/* Previous Button */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="bg-neutral-900/30 border-neutral-700/50 text-white hover:bg-orange-500 hover:border-orange-500 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </Button>
                    </motion.div>

                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <motion.div
                        key={pageNum}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: pageNum * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant={currentPage === pageNum ? "default" : "outline"}
                          onClick={() => setCurrentPage(pageNum)}
                          className={
                            currentPage === pageNum
                              ? "bg-orange-500 text-white"
                              : "bg-neutral-900/30 border-neutral-700/50 text-white hover:bg-orange-500 hover:border-orange-500 backdrop-blur-sm"
                          }
                        >
                          {pageNum}
                        </Button>
                      </motion.div>
                    ))}

                    {/* Next Button */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (totalPages + 1) * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="bg-neutral-900/30 border-neutral-700/50 text-white hover:bg-orange-500 hover:border-orange-500 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
