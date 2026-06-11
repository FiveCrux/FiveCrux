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
  LayoutGrid,
  Tag,
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
import { ProductCard } from "@/componentss/ui/product-card";
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
  const scriptsShuffled = useRef(false);

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
  const [activeTab, setActiveTab] = useState<"all" | "featured" | "onsale">("all");

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
    free?: boolean;
  };

  type GridItem = UIScript | (any & { isAd: boolean });

  const [allScripts, setAllScripts] = useState<UIScript[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredScripts, setFeaturedScripts] = useState<any[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

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
              `Script ${s.id} (${s.title}): cover_image=${s.cover_image
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
              free: s.free || false,
            };
          });
          console.log("Mapped scripts:", mappedScripts);

          // Shuffle the array to randomize order only on initial page load
          if (!scriptsShuffled.current) {
            const shuffledScripts = [...mappedScripts].sort(() => Math.random() - 0.5);
            setAllScripts(shuffledScripts);
            scriptsShuffled.current = true;
          } else {
            // If already shuffled, just set the scripts without shuffling again
            setAllScripts(mappedScripts);
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
            free: item.scriptFree || false,
            seller: item.scriptSellerName || "",
            seller_name: item.scriptSellerName || "",
            seller_image: item.scriptSellerImage || null,
            seller_roles: item.scriptSellerRoles || null,
          }));

          // Shuffle the array to randomize starting position
          const shuffledScripts = [...mappedScripts].sort(() => Math.random() - 0.5);
          setFeaturedScripts(shuffledScripts);
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
    { id: "scripts", name: "Scripts" },
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

      if (freeOnly && !script.free) {
        return false;
      }

      if (activeTab === "featured" && !script.featured) {
        return false;
      }

      if (activeTab === "onsale" && script.discount === 0) {
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
    freeOnly,
    activeTab,
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

  // Pagination logic
  const totalPages = Math.ceil(sortedScripts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedScripts = sortedScripts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
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
    setFreeOnly(false);
    setSearchQuery("");
    setActiveTab("all");
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

  // Get random ads for scripts page
  const randomAds = useRandomAds(ads, 2);

  // Memoize ad positions based on current sorted scripts and ads
  // This ensures positions are stable when filters change (only recalculates when scripts or ads actually change)
  const memoizedAdPositions = useMemo(() => {
    if (randomAds.length === 0 || sortedScripts.length === 0) {
      return [];
    }

    const positions: number[] = [];
    const usedPositions = new Set<number>();

    // Generate random positions for each ad based on current sorted scripts
    for (let i = 0; i < randomAds.length; i++) {
      let attempts = 0;
      let position: number;

      do {
        position = Math.floor(Math.random() * sortedScripts.length);
        attempts++;
      } while (usedPositions.has(position) && attempts < 100);

      if (usedPositions.has(position)) {
        for (let j = 0; j < sortedScripts.length; j++) {
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
  }, [randomAds.map(ad => ad.id).join(','), sortedScripts.length]); // Only recalculate when ads or total count changes, not when filters change

  return (
    <>
      <Navbar />
      <div
        className="min-h-screen text-white relative overflow-hidden pb-16"
        style={{
          backgroundColor: "#0d0d0f",
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            radial-gradient(circle at 50% 0%, rgba(249, 115, 22, 0.07) 0%, transparent 60%)
          `,
          backgroundSize: "60px 100%, 100% 100%",
        }}
      >
        {/* Hero Section */}
        <motion.div
          className="max-w-7xl mx-auto pt-24 pb-8 px-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-white/5"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="space-y-1">
            <nav className="flex items-center space-x-2 text-[12px] font-medium tracking-wide mb-3">
              <Link href="/" className="text-white/25 hover:text-white transition-colors">
                Home
              </Link>
              <span className="text-white/25">/</span>
              <span className="text-white/45">Scripts</span>
            </nav>
            <h1 className="text-[36px] font-bold tracking-tight text-white" style={{ letterSpacing: "-0.5px" }}>
              <span className="text-[#f97316]">All</span> Scripts
            </h1>
            <p className="text-[14px] text-white/35 font-medium">
              Browse our complete collection of premium FiveM scripts
            </p>
          </div>
          <div className="flex items-center gap-4">
            {!loading && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#f97316] bg-[#f97316]/10 border border-[#f97316]/15">
                <Zap className="h-3.5 w-3.5 fill-[#f97316]" />
                <span>{sortedScripts.length} scripts found</span>
              </div>
            )}
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
                speed="fast"
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

        {/* Tabs Row */}
        <div className="max-w-7xl mx-auto px-10 pt-8 flex gap-2.5">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-200 ${
              activeTab === "all"
                ? "bg-[#f97316] border-[#f97316] text-white shadow-lg shadow-[#f97316]/20"
                : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            All Scripts
          </button>
          <button
            onClick={() => setActiveTab("featured")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-200 ${
              activeTab === "featured"
                ? "bg-[#f97316] border-[#f97316] text-white shadow-lg shadow-[#f97316]/20"
                : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            Featured
          </button>
          <button
            onClick={() => setActiveTab("onsale")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-200 ${
              activeTab === "onsale"
                ? "bg-[#f97316] border-[#f97316] text-white shadow-lg shadow-[#f97316]/20"
                : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white"
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            On Sale
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-10 py-8">
          <div className="flex flex-col gap-6">
            {/* Main Content */}
            <motion.div
              ref={scriptsRef}
              className="flex-1"
              initial={{ opacity: 0, y: 20 }}
              animate={scriptsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
            >
              {/* Filters Bar & Search/Sort */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-y border-white/5 mb-6 relative z-50">
                {/* Left: Filter dropdown pills */}
                <div ref={filterContainerRef} className="flex flex-wrap gap-2.5 items-center relative z-50">
                  {/* Categories Filter */}
                  <Collapsible
                    open={openFilter === "categories"}
                    onOpenChange={(open) =>
                      setOpenFilter(open ? "categories" : null)
                    }
                  >
                    <div className="relative z-[60]">
                      <CollapsibleTrigger asChild>
                        <button
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all duration-200 ${
                            selectedCategories.length > 0
                              ? "border-[#f97316]/40 bg-[#f97316]/5 text-white"
                              : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                          }`}
                        >
                          <Filter className="h-3.5 w-3.5 text-[#f97316]" />
                          Categories
                          {selectedCategories.length > 0 && (
                            <span className="ml-0.5 bg-[#f97316] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                              {selectedCategories.length}
                            </span>
                          )}
                          <ChevronDown
                            className={`ml-1 h-3.5 w-3.5 transition-transform duration-300 text-white/40 ${
                              openFilter === "categories" ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="absolute z-[200] mt-2 left-0 bg-[#111113] border border-white/10 rounded-lg p-4 shadow-xl min-w-[200px]">
                        <div className="space-y-2">
                          {categories.map((category) => (
                            <div
                              key={category.id}
                              className="flex items-center space-x-2"
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
                            </div>
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
                        <button
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all duration-200 ${
                            selectedFrameworks.length > 0
                              ? "border-[#f97316]/40 bg-[#f97316]/5 text-white"
                              : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                          }`}
                        >
                          <Code className="h-3.5 w-3.5 text-[#f97316]" />
                          Framework
                          {selectedFrameworks.length > 0 && (
                            <span className="ml-0.5 bg-[#f97316] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                              {selectedFrameworks.length}
                            </span>
                          )}
                          <ChevronDown
                            className={`ml-1 h-3.5 w-3.5 transition-transform duration-300 text-white/40 ${
                              openFilter === "framework" ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="absolute z-[200] mt-2 left-0 bg-[#111113] border border-white/10 rounded-lg p-4 shadow-xl min-w-[200px]">
                        <div className="space-y-2">
                          {frameworks.map((framework) => (
                            <div
                              key={framework.value}
                              className="flex items-center space-x-2"
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
                            </div>
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
                        <button
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all duration-200 ${
                            priceRange[0] !== priceBounds.min ||
                            priceRange[1] !== priceBounds.max ||
                            freeOnly
                              ? "border-[#f97316]/40 bg-[#f97316]/5 text-white"
                              : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                          }`}
                        >
                          <DollarSign className="h-3.5 w-3.5 text-[#f97316]" />
                          Price
                          {(priceRange[0] !== priceBounds.min ||
                            priceRange[1] !== priceBounds.max) && (
                              <span className="text-[#f97316] font-semibold text-[10px]">
                                {` ${priceRange[0]}-${priceRange[1]}`}
                              </span>
                            )}
                          {freeOnly && (
                            <span className="text-[#f97316] font-semibold text-[10px]">
                              , Free
                            </span>
                          )}
                          <ChevronDown
                            className={`ml-1 h-3.5 w-3.5 transition-transform duration-300 text-white/40 ${
                              openFilter === "price" ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="absolute z-[200] mt-2 left-0 bg-[#111113] border border-white/10 rounded-lg p-4 shadow-xl min-w-[250px]">
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
                          <div className="border-t border-white/10 pt-4">
                            <div className="flex items-center space-x-2">
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
                                <Zap className="h-4 w-4 text-[#f97316]" />
                                Free Only
                              </label>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>

                  {/* On Sale Checkbox */}
                  <label
                    className={`flex items-center cursor-pointer border px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 ${
                      onSaleOnly
                        ? "border-[#f97316]/40 bg-[#f97316]/5 text-white"
                        : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                    }`}
                  >
                    <Checkbox
                      id="on-sale"
                      checked={onSaleOnly}
                      onCheckedChange={(checked) =>
                        setOnSaleOnly(checked as boolean)
                      }
                      className="mr-2 border-white/20 data-[state=checked]:bg-[#f97316] data-[state=checked]:border-[#f97316]"
                    />
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-[#f97316]" />
                      On Sale Only
                    </span>
                  </label>

                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-white/40 hover:text-[#f97316] hover:bg-transparent h-auto py-1 px-2 text-xs"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                {/* Right: Search and Sort */}
                <div className="flex items-center gap-3 w-full md:w-auto md:justify-end">
                  {/* Search Input */}
                  <div className="relative flex-1 md:w-[200px] lg:w-[240px] max-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-3.5 w-3.5" />
                    <input
                      type="text"
                      placeholder="Search scripts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/30 text-[12px] focus:outline-none focus:border-[#f97316]/50 transition-colors"
                      style={{ borderRadius: "9px" }}
                    />
                  </div>

                  {/* Sort Dropdown */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-white/[0.03] border-white/10 text-white/50 text-[12px] rounded-full px-3.5 py-1.5 flex items-center gap-1.5 focus:ring-0 focus:ring-offset-0 focus:outline-none h-8 w-fit [&>span]:line-clamp-1 border">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111113] border-white/10 text-white">
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters List */}
              <AnimatePresence>
                {activeFiltersCount > 0 && (
                  <motion.div
                    className="mb-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex flex-wrap gap-2">
                      {selectedCategories.map((category) => (
                        <Badge
                          key={category}
                          variant="secondary"
                          className="bg-white/[0.04] text-white/60 border-white/10 flex items-center gap-1 rounded-full text-[11px]"
                        >
                          {categories.find((c) => c.id === category)?.name}
                          <button
                            onClick={() => removeFilter("category", category)}
                            className="hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {selectedFrameworks.map((framework) => {
                        const frameworkObj = frameworks.find(
                          (f) => f.value === framework
                        );
                        return (
                          <Badge
                            key={framework}
                            variant="secondary"
                            className="bg-white/[0.04] text-white/60 border-white/10 flex items-center gap-1 rounded-full text-[11px]"
                          >
                            {frameworkObj?.label || framework}
                            <button
                              onClick={() => removeFilter("framework", framework)}
                              className="hover:text-white transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                      {(priceRange[0] !== priceBounds.min || priceRange[1] !== priceBounds.max) && (
                        <Badge
                          variant="secondary"
                          className="bg-white/[0.04] text-white/60 border-white/10 flex items-center gap-1 rounded-full text-[11px]"
                        >
                          Price: {priceRange[0]}-{priceRange[1]}
                          <button
                            onClick={() => setPriceRange([priceBounds.min, priceBounds.max])}
                            className="hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {onSaleOnly && (
                        <Badge
                          variant="secondary"
                          className="bg-white/[0.04] text-white/60 border-white/10 flex items-center gap-1 rounded-full text-[11px]"
                        >
                          On Sale
                          <button
                            onClick={() => setOnSaleOnly(false)}
                            className="hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {freeOnly && (
                        <Badge
                          variant="secondary"
                          className="bg-white/[0.04] text-white/60 border-white/10 flex items-center gap-1 rounded-full text-[11px]"
                        >
                          Free
                          <button
                            onClick={() => setFreeOnly(false)}
                            className="hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results Count Text */}
              {!loading && (
                <div className="mb-6">
                  <p className="text-[12px] text-white/30 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-[#f97316]" />
                    Showing {sortedScripts.length} of {allScripts.length} scripts
                    {searchQuery && (
                      <span>
                        {" "}for <span className="text-[#f97316] font-medium">&quot;{searchQuery}&quot;</span>
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Scripts Grid/List */}
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[18px]"
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
                        className={`bg-neutral-900 border-2 border-neutral-700/50 backdrop-blur-sm rounded-lg overflow-hidden ${viewMode === "list"
                          ? "flex flex-row"
                          : "flex flex-col"
                          }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        {/* Image Skeleton */}
                        <div
                          className={`bg-neutral-800/50 animate-pulse ${viewMode === "list"
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
                        ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[18px]"
                        : "space-y-4"
                    }
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, staggerChildren: 0.1 }}
                  >
                    {(() => {
                      const items: GridItem[] = [...paginatedScripts];
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

                        // Otherwise render script
                        const script = item as UIScript;
                        // Derive badge
                        const scriptBadge = script.featured
                          ? "featured" as const
                          : script.discount > 0
                            ? "sale" as const
                            : undefined;
                        // Build price string
                        const scriptPrice = script.free
                          ? "Free"
                          : `${script.currency_symbol || "$"}${script.price}`;
                        return (
                          <motion.div
                            key={script.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Link href={`/script/${script.id}`} style={{ display: "block" }}>
                              <ProductCard
                                image={script.image || "/placeholder.jpg"}
                                imageAlt={script.title}
                                badge={scriptBadge}
                                tags={script.framework ?? []}
                                title={script.title}
                                author={`By ${script.seller}`}
                                authorImage={script.seller_image}
                                authorInitials={script.seller ? script.seller[0].toUpperCase() : "?"}
                                verified={isVerifiedCreator(script.seller_roles)}
                                rating={script.rating ?? 0}
                                reviewCount={script.reviews ?? 0}
                                price={scriptPrice}
                                onViewDetails={() => { }}
                              />
                            </Link>
                          </motion.div>
                        );
                      });
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pagination */}
              {sortedScripts.length > 0 && totalPages > 1 && (
                <motion.div
                  className="flex justify-center mt-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex space-x-2">
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
