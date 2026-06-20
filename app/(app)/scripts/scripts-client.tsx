"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Zap,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/componentss/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentss/ui/select";
import { Slider } from "@/componentss/ui/slider";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import AdCard, { useRandomAds } from "@/componentss/ads/ad-card";
import { ProductCard, type MarketProduct } from "@/componentss/marketplace/product-card";

// Map a raw /api/scripts item onto the UI script shape used throughout this page.
// Shared by the server-seeded initial scripts and the client-side refetch so the
// shape stays identical (no transform drift).
function mapApiScript(s: any) {
  const image =
    s.cover_image ||
    (s.images && s.images[0]) ||
    (s.screenshots && s.screenshots[0]) ||
    "/placeholder.jpg";
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    price: Number(s.price) || 0,
    originalPrice: s.original_price ? Number(s.original_price) : undefined,
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
}

export function ScriptsClient({ initialScripts = [] }: { initialScripts: any[] }) {
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
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") ?? "");
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  // Sync search box with the ?search= URL param (e.g. coming from the homepage hero search).
  useEffect(() => {
    setSearchQuery(searchParams.get("search") ?? "");
  }, [searchParams]);
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

  // Seed from server-fetched scripts so the catalog renders on first paint (SSR).
  // IMPORTANT: do NOT shuffle here — the useState initializer runs during SSR and
  // again on the client; Math.random() would differ → hydration mismatch. We seed
  // in stable order and shuffle once AFTER mount (client-only) in the effect below.
  const [allScripts, setAllScripts] = useState<UIScript[]>(() => {
    return Array.isArray(initialScripts)
      ? (initialScripts.map(mapApiScript) as UIScript[])
      : [];
  });

  // Client-only one-time shuffle of the SSR-seeded catalog (avoids hydration drift).
  useEffect(() => {
    if (scriptsShuffled.current) return;
    setAllScripts((prev) => {
      if (!prev.length) return prev;
      scriptsShuffled.current = true;
      return [...prev].sort(() => Math.random() - 0.5);
    });
  }, []);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(
    !(Array.isArray(initialScripts) && initialScripts.length > 0)
  );
  const [featuredScripts, setFeaturedScripts] = useState<any[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    // When the server already seeded the catalog, skip the scripts refetch but
    // still load ads (ads aren't part of the SSR shell).
    const hasSeed = Array.isArray(initialScripts) && initialScripts.length > 0;
    const load = async () => {
      try {
        setLoading(true);
        // Per-request 8s timeout + allSettled so one slow/hanging endpoint
        // (e.g. ads when the DB is unreachable) never blocks the whole catalog.
        const fetchT = (url: string) => {
          const c = new AbortController();
          const t = setTimeout(() => c.abort(), 15000);
          return fetch(url, { cache: "no-store", signal: c.signal }).finally(() => clearTimeout(t));
        };
        const [scriptsR, adsR] = await Promise.allSettled([
          hasSeed ? Promise.resolve(null) : fetchT(`/api/scripts`),
          fetchT(`/api/ads/scripts`),
        ]);
        const scriptsRes = scriptsR.status === "fulfilled" ? scriptsR.value : null;
        const adsRes = adsR.status === "fulfilled" ? adsR.value : null;

        if (scriptsRes && scriptsRes.ok) {
          const data = await scriptsRes.json();
          const mappedScripts = (data.scripts || []).map(mapApiScript);

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

        if (adsRes && adsRes.ok) {
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
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 15000);
        const response = await fetch("/api/featured-scripts?status=active", { cache: "no-store", signal: c.signal });
        clearTimeout(t);

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
        if ((error as any)?.name !== "AbortError") console.error("Error fetching featured scripts:", error);
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

  // Map a UIScript onto the shared MarketProduct shape consumed by ProductCard.
  const toMarketProduct = useCallback((s: UIScript): MarketProduct => {
    const isFree = !!s.free || s.price === 0;
    return {
      id: s.id,
      title: s.title,
      framework: s.framework,
      price: s.price,
      originalPrice: s.originalPrice,
      free: isFree,
      rating: typeof s.rating === "number" && s.rating > 0 ? s.rating : undefined,
      seller: s.seller,
      sellerImage: s.seller_image ?? undefined,
      coverImage: s.image && s.image !== "/placeholder.jpg" ? s.image : undefined,
      tag: s.featured ? "FEATURED" : isFree ? "FREE" : null,
      href: `/script/${s.id}`,
    };
  }, []);

  // Featured items come from /api/featured-scripts with a slightly different shape.
  const featuredProducts: MarketProduct[] = useMemo(() => {
    return featuredScripts.map((item: any) => {
      const isFree = !!item.free || Number(item.price) === 0;
      return {
        id: item.id,
        title: item.title,
        framework: Array.isArray(item.framework) ? item.framework : [],
        price: Number(item.price) || 0,
        originalPrice:
          item.original_price && Number(item.original_price) > Number(item.price)
            ? Number(item.original_price)
            : undefined,
        free: isFree,
        rating: undefined,
        seller: item.seller_name || item.seller,
        sellerImage: item.seller_image ?? undefined,
        coverImage:
          item.cover_image && item.cover_image !== "/placeholder.jpg"
            ? item.cover_image
            : undefined,
        tag: "FEATURED",
        href: `/script/${item.id}`,
      } as MarketProduct;
    });
  }, [featuredScripts]);

  const hasActiveFilters = activeFiltersCount > 0 || searchQuery.length > 0 || activeTab !== "all";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] text-white">
        {/* ── Page header ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-white/[0.06]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-orange-500/20 blur-[120px]" />
            <div className="absolute -top-12 right-1/4 h-72 w-72 rounded-full bg-yellow-400/10 blur-[120px]" />
          </div>
          <motion.div
            className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-8 pt-24 sm:px-6 sm:flex-row sm:items-end sm:justify-between lg:px-8"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <span className="mb-3 inline-block rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-400">
                Marketplace
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                <span className="text-[#f97316]">Scripts</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/50 sm:text-base">
                Browse our complete collection of premium FiveM scripts.
              </p>
            </div>
            {!loading && (
              <div className="flex w-fit items-center gap-1.5 rounded-full border border-[#f97316]/15 bg-[#f97316]/10 px-3 py-1.5 text-xs font-semibold text-[#f97316]">
                <Zap className="h-3.5 w-3.5 fill-[#f97316]" />
                <span>{sortedScripts.length} scripts found</span>
              </div>
            )}
          </motion.div>
        </section>

        {/* ── Catalog ──────────────────────────────────────────────────── */}
        <section ref={scriptsRef} className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Featured scripts — compact horizontal-scroll row */}
          {!scriptsLoading && featuredProducts.length > 0 && (
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold text-white">Featured Scripts</h2>
              </div>
              <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {featuredProducts.map((product) => (
                  <ProductCard key={`featured-${product.id}`} product={product} />
                ))}
              </div>
            </div>
          )}

          {/* Search + sort + filter toggle */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
              <input
                type="text"
                placeholder="Search scripts…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white placeholder-white/40 outline-none transition focus:border-orange-500/50 focus:bg-white/[0.06]"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger aria-label="Sort scripts by" className="h-auto w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/70 focus:ring-0 focus:ring-offset-0 focus:outline-none sm:w-[190px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#111113] text-white">
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Filters toggle */}
            <button
              onClick={() => setOpenFilter((s) => (s === "panel" ? null : "panel"))}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                openFilter === "panel" || activeFiltersCount > 0
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                  : "border-white/[0.08] bg-white/[0.04] text-white/70 hover:border-white/20"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-black">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Tab chips */}
          <div className="mb-4 flex flex-wrap gap-2">
            {([
              { id: "all", label: "All Scripts" },
              { id: "featured", label: "Featured" },
              { id: "onsale", label: "On Sale" },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-orange-500 to-yellow-400 text-black"
                    : "border border-white/[0.08] bg-white/[0.04] text-white/70 hover:border-orange-500/40 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category chips */}
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategories([])}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                selectedCategories.length === 0
                  ? "bg-gradient-to-r from-orange-500 to-yellow-400 text-black"
                  : "border border-white/[0.08] bg-white/[0.04] text-white/70 hover:border-orange-500/40 hover:text-white"
              }`}
            >
              All
            </button>
            {categories.map((cat) => {
              const active = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id, !active)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    active
                      ? "bg-gradient-to-r from-orange-500 to-yellow-400 text-black"
                      : "border border-white/[0.08] bg-white/[0.04] text-white/70 hover:border-orange-500/40 hover:text-white"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Collapsible filter panel: frameworks + price + free/on-sale */}
          <AnimatePresence initial={false}>
            {openFilter === "panel" && (
              <motion.div
                ref={filterContainerRef}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]"
              >
                <div className="grid gap-6 p-5 md:grid-cols-3">
                  {/* Frameworks */}
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Framework</h3>
                    <div className="flex flex-wrap gap-2">
                      {frameworks.map((fw) => {
                        const active = selectedFrameworks.includes(fw.value);
                        return (
                          <button
                            key={fw.value}
                            onClick={() => handleFrameworkChange(fw.value, !active)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase transition ${
                              active
                                ? "border-orange-500/60 bg-orange-500/15 text-orange-300"
                                : "border-white/15 bg-white/[0.04] text-white/60 hover:border-white/30"
                            }`}
                          >
                            {fw.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price range */}
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Price Range</h3>
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={priceBounds.max}
                      min={priceBounds.min}
                      step={1}
                      className="w-full"
                    />
                    <div className="mt-2 flex justify-between text-xs text-white/50">
                      <span>${priceRange[0]}</span>
                      <span>${priceRange[1]}</span>
                    </div>
                  </div>

                  {/* Free / On sale toggles */}
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Pricing</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFreeOnly((v) => !v)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase transition ${
                          freeOnly
                            ? "border-orange-500/60 bg-orange-500/15 text-orange-300"
                            : "border-white/15 bg-white/[0.04] text-white/60 hover:border-white/30"
                        }`}
                      >
                        Free Only
                      </button>
                      <button
                        onClick={() => setOnSaleOnly((v) => !v)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase transition ${
                          onSaleOnly
                            ? "border-orange-500/60 bg-orange-500/15 text-orange-300"
                            : "border-white/15 bg-white/[0.04] text-white/60 hover:border-white/30"
                        }`}
                      >
                        On Sale
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filter chips + result meta */}
          <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-white/50">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#f97316]" />
              {sortedScripts.length} of {allScripts.length} scripts
              {searchQuery && (
                <span>
                  {" "}for <span className="font-medium text-[#f97316]">&quot;{searchQuery}&quot;</span>
                </span>
              )}
            </span>

            <AnimatePresence>
              {selectedCategories.map((category) => (
                <motion.button
                  key={`chip-cat-${category}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => removeFilter("category", category)}
                  className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/60 hover:text-white"
                >
                  {categories.find((c) => c.id === category)?.name}
                  <X className="h-3 w-3" />
                </motion.button>
              ))}
              {selectedFrameworks.map((framework) => (
                <motion.button
                  key={`chip-fw-${framework}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => removeFilter("framework", framework)}
                  className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/60 hover:text-white"
                >
                  {frameworks.find((f) => f.value === framework)?.label || framework}
                  <X className="h-3 w-3" />
                </motion.button>
              ))}
              {(priceRange[0] !== priceBounds.min || priceRange[1] !== priceBounds.max) && (
                <motion.button
                  key="chip-price"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setPriceRange([priceBounds.min, priceBounds.max])}
                  className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/60 hover:text-white"
                >
                  ${priceRange[0]}-${priceRange[1]}
                  <X className="h-3 w-3" />
                </motion.button>
              )}
              {freeOnly && (
                <motion.button
                  key="chip-free"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setFreeOnly(false)}
                  className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/60 hover:text-white"
                >
                  Free
                  <X className="h-3 w-3" />
                </motion.button>
              )}
              {onSaleOnly && (
                <motion.button
                  key="chip-sale"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setOnSaleOnly(false)}
                  className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/60 hover:text-white"
                >
                  On Sale
                  <X className="h-3 w-3" />
                </motion.button>
              )}
            </AnimatePresence>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-orange-400 hover:text-orange-300"
              >
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            )}
          </div>

          {/* Grid / states */}
          {loading ? (
            <div className="grid justify-center gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))] justify-items-center">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 w-full max-w-[280px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
                />
              ))}
            </div>
          ) : sortedScripts.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-16 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-white/20" />
              <h3 className="text-lg font-semibold text-white">No scripts found</h3>
              <p className="mt-1 text-sm text-white/50">Try adjusting your search or filters.</p>
              <Button
                onClick={clearAllFilters}
                className="mt-6 bg-gradient-to-r from-orange-500 to-yellow-400 font-semibold text-black hover:from-orange-600 hover:to-yellow-500"
              >
                Clear All Filters
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={scriptsInView ? { opacity: 1 } : { opacity: 1 }}
              transition={{ duration: 0.4 }}
              // auto-fill at the card's native 280px width so columns only form when
              // there is room — keeps the fixed-width ProductCard responsive without overflow.
              className="grid justify-center gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))] justify-items-center"
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

                  // Otherwise render script via the shared marketplace ProductCard
                  const script = item as UIScript;
                  return (
                    <motion.div
                      key={script.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.04, 0.4) }}
                      className="w-full max-w-[280px]"
                    >
                      <ProductCard product={toMarketProduct(script)} className="w-full" />
                    </motion.div>
                  );
                });
              })()}
            </motion.div>
          )}

          {/* Pagination */}
          {sortedScripts.length > 0 && totalPages > 1 && (
            <motion.div
              className="mt-12 flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-orange-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[40px] rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      currentPage === pageNum
                        ? "bg-gradient-to-r from-orange-500 to-yellow-400 text-black"
                        : "border border-white/[0.08] bg-white/[0.04] text-white/70 hover:border-orange-500/50 hover:text-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-orange-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
