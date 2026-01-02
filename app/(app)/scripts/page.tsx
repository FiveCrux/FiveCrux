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

export default function ScriptsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filtersRef = useRef(null);
  const scriptsRef = useRef(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  const filtersInView = useInView(filtersRef, { once: true });
  const scriptsInView = useInView(scriptsRef, { once: true });
  const priceRangeInitialized = useRef(false);

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
  const [searchQuery, setSearchQuery] = useState("");
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  type UIScript = {
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
  };

  type GridItem = UIScript | (any & { isAd: boolean });

  const [allScripts, setAllScripts] = useState<UIScript[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredScripts, setFeaturedScripts] = useState<any[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        console.log("Loading scripts...");
        const [scriptsRes, adsRes] = await Promise.all([
          fetch(`/api/scripts`, { cache: "no-store" }),
          fetch(`/api/ads/scripts`, { cache: "no-store" }),
        ]);

        if (scriptsRes.ok) {
          const data = await scriptsRes.json();
          console.log("Scripts API data:", data);
          console.log("Scripts count:", data.scripts?.length || 0);

          const mappedScripts = (data.scripts || []).map((s: any) => {
            const image =
              s.cover_image ||
              (s.images && s.images[0]) ||
              (s.screenshots && s.screenshots[0]) ||
              "/placeholder.jpg";
            console.log(
              `Script ${s.id} (${s.title}): cover_image=${
                s.cover_image
              }, images=${JSON.stringify(
                s.images
              )}, screenshots=${JSON.stringify(
                s.screenshots
              )}, final image=${image}`
            );
            return {
              id: s.id,
              title: s.title,
              description: s.description,
              price: Number(s.price) || 0,
              originalPrice: s.original_price
                ? Number(s.original_price)
                : undefined,
              currency: s.currency,
              currency_symbol: s.currency_symbol,
              rating: s.rating || 0,
              reviews: s.review_count || 0,
              image: image,
              category: s.category,
              categoryName: s.category,
              seller: s.seller_name,
              seller_id: s.seller_id,
              seller_image: s.seller_image || null,
              seller_roles: s.seller_roles || null,
              discount: s.original_price
                ? Math.max(
                    0,
                    Math.round(
                      ((Number(s.original_price) - Number(s.price)) /
                        Number(s.original_price)) *
                        100
                    )
                  )
                : 0,
              framework: Array.isArray(s.framework)
                ? s.framework
                : s.framework
                ? [s.framework]
                : [],
              priceCategory:
                Number(s.price) <= 15
                  ? "Budget"
                  : Number(s.price) <= 30
                  ? "Standard"
                  : "Premium",
              tags: (s.tags || []) as string[],
              lastUpdated: s.updated_at,
              featured: s.featured || false,
            };
          });
          console.log("Mapped scripts:", mappedScripts);
          setAllScripts(mappedScripts);
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

  // Fetch featured scripts
  useEffect(() => {
    const fetchFeaturedScripts = async () => {
      try {
        setScriptsLoading(true);
        const response = await fetch("/api/featured-scripts?status=active", { cache: "no-store" });

        if (response.ok) {
          const data = await response.json();
          const featuredScriptsData = data.featuredScripts || [];
          // Map API response to match the expected format
          const mappedScripts = featuredScriptsData.map((item: any) => ({
            id: item.scriptId,
            featuredScriptId: item.id, // Store the featured script ID for tracking
            title: item.scriptTitle || "",
            description: item.scriptDescription || "",
            cover_image: item.scriptCoverImage || "/placeholder.jpg",
            framework: Array.isArray(item.scriptFramework) ? item.scriptFramework : item.scriptFramework ? [item.scriptFramework] : [],
            price: item.scriptPrice || 0,
            original_price: item.scriptPrice || 0,
            currency_symbol: item.scriptCurrencySymbol || "$",
          }));
          setFeaturedScripts(mappedScripts);
        }
      } catch (error) {
        console.error("Error fetching featured scripts:", error);
      } finally {
        setScriptsLoading(false);
      }
    };

    fetchFeaturedScripts();
  }, []);

  const categories = [
    { id: "economy", name: "Economy" },
    { id: "vehicles", name: "Vehicles" },
    { id: "jobs", name: "Jobs" },
    { id: "housing", name: "Housing" },
    { id: "medical", name: "Medical" },
    { id: "police", name: "Police" },
    { id: "utilities", name: "Utilities" },
    { id: "core", name: "Core" },
  ];

  const frameworks = [
    { value: "All Frameworks", label: "All Frameworks" },
    { value: "qbcore", label: "QBCore" },
    { value: "qbox", label: "Qbox" },
    { value: "esx", label: "ESX" },
    { value: "ox", label: "OX" },
    { value: "standalone", label: "Standalone" },
  ];
  const priceCategories = ["Budget", "Standard", "Premium"];

  // Calculate min and max prices from scripts for dynamic slider range
  const priceBounds = useMemo(() => {
    if (allScripts.length === 0) return { min: 0, max: 1000 };
    const prices = allScripts.map((s) => s.price).filter((p) => p > 0);
    if (prices.length === 0) return { min: 0, max: 1000 };
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    // Round to nice numbers
    const roundedMin = Math.floor(min / 10) * 10; // Round down to nearest 10
    const roundedMax = Math.ceil(max / 10) * 10; // Round up to nearest 10
    return { min: roundedMin, max: roundedMax };
  }, [allScripts]);

  // Initialize price range when scripts are loaded (only once)
  useEffect(() => {
    if (allScripts.length > 0 && !priceRangeInitialized.current && priceBounds.max > 0) {
      setPriceRange([priceBounds.min, priceBounds.max]);
      priceRangeInitialized.current = true;
    }
  }, [allScripts.length, priceBounds.min, priceBounds.max]);

  // Real-time filtering logic
  const filteredScripts = useMemo(() => {
    return allScripts.filter((script) => {
      if (
        searchQuery &&
        !script.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !script.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !script.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ) {
        return false;
      }

      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(script.category)
      ) {
        return false;
      }

      if (
        selectedFrameworks.length > 0 &&
        !selectedFrameworks.includes("All Frameworks")
      ) {
        if (!script.framework || script.framework.length === 0) return false;
        const hasMatch = script.framework.some((fw: string) =>
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
          if (script.price < priceRange[0] || script.price > priceRange[1]) {
            return false;
          }
        }
      }

      if (onSaleOnly && script.discount === 0) {
        return false;
      }

      return true;
    });
  }, [
    allScripts,
    searchQuery,
    selectedCategories,
    selectedFrameworks,
    priceRange,
    priceBounds,
    onSaleOnly,
  ]);

  // Sorting logic
  const sortedScripts = useMemo(() => {
    const scripts = [...filteredScripts];
    switch (sortBy) {
      case "price-low":
        return scripts.sort((a, b) => a.price - b.price);
      case "price-high":
        return scripts.sort((a, b) => b.price - a.price);
      case "rating":
        return scripts.sort((a, b) => b.rating - a.rating);
      case "newest":
        return scripts.sort(
          (a, b) =>
            new Date(b.lastUpdated).getTime() -
            new Date(a.lastUpdated).getTime()
        );
      default:
        return scripts.sort((a, b) => b.reviews - a.reviews);
    }
  }, [filteredScripts, sortBy]);

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
    setSearchQuery("");
    router.push("/scripts");
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
      (onSaleOnly ? 1 : 0),
    [
      selectedCategories.length,
      selectedFrameworks.length,
      priceRange,
      priceBounds,
      onSaleOnly,
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

  // Get random ads for scripts page
  const randomAds = useRandomAds(ads, 2);

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
              {!loading && (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  {sortedScripts.length} scripts found
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

        {/* Featured scripts Section */}
        <motion.section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-center mb-12"
            >
              <Badge className="bg-gradient-to-r from-orange-500/20 to-yellow-400/20 text-orange-400 border-orange-500/30 mb-6 px-4 py-2 text-sm font-semibold">
                Featured Scripts
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center gap-0 justify-center sm:gap-3">
                <Zap className="h-10 w-10 text-orange-500" />
                Featured Scripts
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Check out our most popular and featured scripts
              </p>
            </motion.div>

            {scriptsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-neutral-900 border-2 border-neutral-700/50 rounded-xl h-96 animate-pulse" />
                ))}
              </div>
            ) : featuredScripts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No featured scripts available at the moment.</p>
              </div>
            ) : featuredScripts.length > 3 ? (
              <InfiniteMovingCards
                items={featuredScripts}
                direction="left"
                speed="slow"
                pauseOnHover={true}
                className="max-w-7xl"
                renderItem={(item, index) => (
                  <FeaturedScriptCard
                    item={item}
                    index={index}
                    style={{
                      width: "calc((100vw - 8rem) / 3)",
                      minWidth: "320px",
                      maxWidth: "400px",
                    }}
                  />
                )}
              />
            ) : (
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex md:grid md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-6 min-w-max md:min-w-0">
                  {featuredScripts.map((item, index) => (
                    <FeaturedScriptCard
                      key={item.id}
                      item={item}
                      index={index}
                      className="flex-shrink-0 w-[320px] md:w-auto"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.section>

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
                                    priceRange[1] !== priceBounds.max
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
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>

                        {/* On Sale Only Filter */}
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="outline"
                            className={`bg-gradient-to-r from-gray-800/80 to-gray-900/80 border-2 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
                              onSaleOnly
                                ? "border-orange-500 bg-gradient-to-r from-orange-500/20 to-orange-600/20 shadow-orange-500/50"
                                : "border-neutral-600/50 hover:border-orange-500/70 hover:from-gray-700/80 hover:to-gray-800/80"
                            }`}
                            onClick={() => setOnSaleOnly(!onSaleOnly)}
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
                          </Button>
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
                    placeholder="Search scripts..."
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
                      <SelectItem value="rating" className="text-white">
                        Highest Rated
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
                    Showing {sortedScripts.length} of {allScripts.length} scripts
                    {searchQuery && (
                      <span className="text-orange-500">
                        for <span className="font-semibold">{searchQuery}</span>
                      </span>
                    )}
                  </p>
                </motion.div>
              )}

              {/* Scripts Grid/List */}
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
                ) : sortedScripts.length === 0 ? (
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
                      No scripts found matching your criteria
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
                      const items: GridItem[] = [...sortedScripts];
                      // Insert ads at deterministic positions to avoid hydration issues
                      if (randomAds.length > 0) {
                        const adPositions = [];
                        for (let i = 0; i < randomAds.length; i++) {
                          // Use deterministic positioning based on index to avoid hydration issues
                          const position = Math.floor(
                            (i * (items.length + 1)) / randomAds.length
                          );
                          adPositions.push({ ad: randomAds[i], position });
                        }
                        // Sort by position in descending order to avoid index shifting
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

                        // Otherwise render script
                        const script = item as UIScript;
                        return (
                          <motion.div key={script.id} className="group" whileHover={{ y: -5, scale: 1.02 }}>
                            <Link href={`/script/${script.id}`}>
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
                                    src={script.image || "/placeholder.jpg"}
                                    alt={script.title}
                                    width={400}
                                    height={256}
                                    className={`object-cover w-full ${
                                      viewMode === "list" ? "h-full" : "h-52"
                                    }`}
                                  />
                                  {script.featured && (
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
                                      {script.title}
                                    </CardTitle>


                                    {/* Framework Badges */}
                                    {script.framework &&
                                      script.framework.length > 0 && (
                                        <motion.div
                                          className="flex flex-wrap gap-1"
                                          // initial={{ scale: 0, rotate: 180 }}
                                          // animate={{ scale: 1, rotate: 0 }}
                                        >
                                          {script.framework.map((fw, idx) => (
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
                                          src={script.seller_image || "/placeholder-user.jpg"}
                                          alt={script.seller}
                                        />
                                        <AvatarFallback className="bg-orange-500 text-white text-[8px] font-bold">
                                          {script.seller ? script.seller[0].toUpperCase() : "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="whitespace-nowrap">By {script.seller}</span>
                                      {isVerifiedCreator(script.seller_roles) && (
                                        <VerifiedIcon size="sm" className="flex-shrink-0" />
                                      )}
                                    </CardDescription>
                                    {/* Price */}
                                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                                      {script.discount > 0 && script.originalPrice ? (
                                        <>
                                          <span className="text-gray-500 text-sm line-through">
                                            {script.currency_symbol || "$"}{script.originalPrice}
                                          </span>
                                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs font-semibold px-2 py-0.5">
                                            -{script.discount}%
                                          </Badge>
                                        </>
                                      ) : null}
                                      <span className="text-orange-500 text-xl font-bold">
                                        {script.currency_symbol || "$"}{script.price}
                                      </span>
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
                              : "bg-neutral-900/30 border-neutral-700/50 text-white hover:bg-orange-500 hover:border-orange-500 backdrop-blur-sm"
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
  );
}
