"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useFrameworks } from "@/lib/use-frameworks";
import { PRICE_TIERS, classifyPriceTier } from "@/lib/price-tiers";
import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import AdCard, { useRandomAds } from "@/componentss/ads/ad-card";
import {
  ProductCard,
  type MarketProduct,
} from "@/componentss/marketplace/product-card";
import SideAdsFrame from "@/componentss/ads/side-banners";

// Module-level so the SSR seed initializer and the client fallback fetch map
// identically (no shape drift). Mirrors scripts-client's mapApiScript.
function mapApiProp(s: any) {
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
    framework: [] as string[],
    priceCategory: classifyPriceTier(s.price),
    tags: [] as string[],
    lastUpdated: s.updatedAt || s.createdAt,
    featured: false,
    free: Number(s.price) === 0,
  };
}

export function PropsClient({
  initialProps = [],
  initialAds = [],
}: {
  initialProps?: any[];
  initialAds?: any[];
}) {
  const router = useRouter();
  const filtersRef = useRef(null);
  const propsRef = useRef(null);

  const filtersInView = useInView(filtersRef, { once: true });
  const propsInView = useInView(propsRef, { once: true });
  const priceRangeInitialized = useRef(false);
  const propsShuffled = useRef(false);

  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
  const [sortBy, setSortBy] = useState("popular");

  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [selectedPriceCategories, setSelectedPriceCategories] = useState<
    string[]
  >([]);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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

  // Seed from server-fetched props so the catalog paints on first render (SSR).
  // No shuffle here — the initializer runs during SSR and again on the client,
  // so Math.random() would cause a hydration mismatch. Shuffle once after mount.
  const [allProps, setAllProps] = useState<UIProp[]>(
    () => (Array.isArray(initialProps) ? (initialProps.map(mapApiProp) as UIProp[]) : [])
  );
  const [ads, setAds] = useState<any[]>(Array.isArray(initialAds) ? initialAds : []);
  const [loading, setLoading] = useState(
    !(Array.isArray(initialProps) && initialProps.length > 0)
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Client-only one-time shuffle of the SSR-seeded catalog (avoids hydration drift).
  useEffect(() => {
    if (propsShuffled.current) return;
    setAllProps((prev) => {
      if (!prev.length) return prev;
      propsShuffled.current = true;
      return [...prev].sort(() => Math.random() - 0.5);
    });
  }, []);

  useEffect(() => {
    // Server already seeded the catalog → skip the props refetch, but still load
    // ads (ads aren't part of the SSR shell).
    const hasSeed = Array.isArray(initialProps) && initialProps.length > 0;
    const load = async () => {
      try {
        if (!hasSeed) setLoading(true);
        // Per-request timeout + allSettled so one slow/hanging endpoint
        // (e.g. ads when the DB is unreachable) never blocks the whole catalog.
        const fetchT = (url: string) => {
          const c = new AbortController();
          const t = setTimeout(() => c.abort(), 15000);
          return fetch(url, { cache: "no-store", signal: c.signal }).finally(() => clearTimeout(t));
        };
        const [propsR, adsR] = await Promise.allSettled([
          hasSeed ? Promise.resolve(null) : fetchT(`/api/props`),
          fetchT(`/api/ads/props`),
        ]);
        const propsRes = propsR.status === "fulfilled" ? propsR.value : null;
        const adsRes = adsR.status === "fulfilled" ? adsR.value : null;

        if (propsRes && propsRes.ok) {
          const data = await propsRes.json();
          const mappedProps = (data.props || []).map(mapApiProp) as UIProp[];
          // Fallback path (no seed): shuffle once on initial load.
          if (!propsShuffled.current) {
            propsShuffled.current = true;
            setAllProps([...mappedProps].sort(() => Math.random() - 0.5));
          } else {
            setAllProps(mappedProps);
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

  const frameworks = useFrameworks();
  const priceCategories = PRICE_TIERS;

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
    setSelectedFrameworks([]);
    setSelectedPriceCategories([]);
    setPriceRange([priceBounds.min, priceBounds.max]);
    setOnSaleOnly(false);
    setFreeOnly(false);
    setSearchQuery("");
    router.push("/props");
  }, [router, priceBounds]);

  const toggleFramework = useCallback(
    (value: string) => {
      const isActive = selectedFrameworks.includes(value);
      handleFrameworkChange(value, !isActive);
    },
    [selectedFrameworks, handleFrameworkChange]
  );

  const removeFilter = useCallback(
    (type: string, value: string | number) => {
      switch (type) {
        case "framework":
          handleFrameworkChange(value as string, false);
          break;
        case "priceCategory":
          handlePriceCategoryChange(value as string, false);
          break;
      }
    },
    [handleFrameworkChange, handlePriceCategoryChange]
  );

  const activeFiltersCount = useMemo(
    () =>
      selectedFrameworks.length +
      (priceRange[0] !== priceBounds.min || priceRange[1] !== priceBounds.max ? 1 : 0) +
      (onSaleOnly ? 1 : 0) +
      (freeOnly ? 1 : 0),
    [
      selectedFrameworks.length,
      priceRange,
      priceBounds,
      onSaleOnly,
      freeOnly,
    ]
  );

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
  }, [randomAds.map((ad) => ad.id).join(","), sortedProps.length]); // Only recalculate when ads or total count changes, not when filters change

  // Map a UIProp onto the shared MarketProduct shape consumed by ProductCard.
  const toMarketProduct = useCallback((prop: UIProp): MarketProduct => {
    const isFree = !!prop.free || prop.price === 0;
    return {
      id: prop.id,
      title: prop.title,
      framework: prop.framework,
      price: prop.price,
      originalPrice: prop.originalPrice,
      free: isFree,
      rating: typeof prop.rating === "number" ? prop.rating : undefined,
      seller: prop.seller,
      sellerImage: prop.seller_image || undefined,
      coverImage: prop.image,
      currencySymbol: prop.currency_symbol,
      tag: prop.featured ? "FEATURED" : isFree ? "FREE" : null,
      href: `/prop/${prop.id}`,
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] text-white">
      <SideAdsFrame>
        {/* ── Header ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-white/[0.06]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-orange-500/20 blur-[120px]" />
            <div className="absolute -top-12 right-1/4 h-72 w-72 rounded-full bg-yellow-400/10 blur-[120px]" />
          </div>
          <div className="relative mx-auto w-full px-2.5 py-12 lg:py-16">
            <motion.nav
              className="mb-4 flex items-center gap-2 text-sm text-white/55"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Link href="/" className="transition-colors hover:text-orange-400">
                Home
              </Link>
              <span>/</span>
              <span className="text-white/70">Props</span>
            </motion.nav>
            <motion.div
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
                  Props
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-base text-white/60">
                Browse our complete collection of premium FiveM props.
              </p>
              {!loading && (
                <p className="mt-4 text-sm text-white/50">
                  {sortedProps.length} {sortedProps.length === 1 ? "prop" : "props"} found
                </p>
              )}
            </motion.div>
          </div>
        </section>

        {/* ── Catalog ──────────────────────────────────────────────────── */}
        <section className="mx-auto w-full px-2.5 py-10">
          {/* Search + sort + filter toggle */}
          <motion.div
            ref={filtersRef}
            className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: -12 }}
            animate={filtersInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
              <input
                type="text"
                placeholder="Search props…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white placeholder-white/40 outline-none transition focus:border-orange-500/50 focus:bg-white/[0.06]"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/80 outline-none transition focus:border-orange-500/50 sm:w-48"
            >
              <option value="popular" className="bg-[#0d0d0f]">
                Most Popular
              </option>
              <option value="newest" className="bg-[#0d0d0f]">
                Newest First
              </option>
              <option value="price-low" className="bg-[#0d0d0f]">
                Price: Low to High
              </option>
              <option value="price-high" className="bg-[#0d0d0f]">
                Price: High to Low
              </option>
            </select>

            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                showFilters || selectedFrameworks.length > 0 || onSaleOnly || freeOnly
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
          </motion.div>

          {/* No category chips here — props have no sub-category (every prop
              is just Tebex's single "PROPS" listing), unlike Assets/Scripts. */}

          {/* Collapsible filters: framework + price + toggles */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
              >
                {/* Framework */}
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">
                  Framework
                </h3>
                <div className="mb-5 flex flex-wrap gap-2">
                  {frameworks.map((fw) => (
                    <button
                      key={fw.value}
                      onClick={() => toggleFramework(fw.value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase transition ${
                        selectedFrameworks.includes(fw.value)
                          ? "border-orange-500/60 bg-orange-500/15 text-orange-300"
                          : "border-white/15 bg-white/[0.04] text-white/60 hover:border-white/30"
                      }`}
                    >
                      {fw.label}
                    </button>
                  ))}
                </div>

                {/* Price range */}
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">
                  Price Range
                </h3>
                <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="range"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    step={1}
                    value={priceRange[0]}
                    onChange={(e) =>
                      setPriceRange([
                        Math.min(Number(e.target.value), priceRange[1]),
                        priceRange[1],
                      ])
                    }
                    className="w-full accent-orange-500"
                  />
                  <input
                    type="range"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    step={1}
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([
                        priceRange[0],
                        Math.max(Number(e.target.value), priceRange[0]),
                      ])
                    }
                    className="w-full accent-orange-500"
                  />
                </div>
                <div className="mb-5 flex justify-between text-xs text-white/50">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}</span>
                </div>

                {/* Toggles */}
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">
                  Options
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFreeOnly((v) => !v)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase transition ${
                      freeOnly
                        ? "border-green-500/60 bg-green-500/15 text-green-300"
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
                    On Sale Only
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filter pills + meta */}
          <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-white/50">
            <span>
              Showing {sortedProps.length} of {allProps.length} props
              {searchQuery && (
                <span className="text-orange-400">
                  {" "}
                  for <span className="font-semibold">{searchQuery}</span>
                </span>
              )}
            </span>

            {selectedFrameworks.map((framework) => {
              const frameworkObj = frameworks.find((f) => f.value === framework);
              return (
                <span
                  key={framework}
                  className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs text-blue-300"
                >
                  {frameworkObj?.label || framework}
                  <button
                    onClick={() => removeFilter("framework", framework)}
                    className="transition-colors hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            {(priceRange[0] !== priceBounds.min ||
              priceRange[1] !== priceBounds.max) && (
              <span className="flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-xs text-yellow-300">
                ${priceRange[0]}-${priceRange[1]}
                <button
                  onClick={() => setPriceRange([priceBounds.min, priceBounds.max])}
                  className="transition-colors hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {onSaleOnly && (
              <span className="flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs text-red-300">
                On Sale
                <button
                  onClick={() => setOnSaleOnly(false)}
                  className="transition-colors hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {freeOnly && (
              <span className="flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs text-green-300">
                Free
                <button
                  onClick={() => setFreeOnly(false)}
                  className="transition-colors hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-orange-400 hover:text-orange-300"
              >
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            )}
          </div>

          {/* Grid / states */}
          <motion.div
            ref={propsRef}
            initial={{ opacity: 0 }}
            animate={propsInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
          >
            {loading ? (
              <div className="grid justify-center gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),300px))] justify-items-center">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 w-full sm:max-w-[300px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
                  />
                ))}
              </div>
            ) : sortedProps.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-16 text-center">
                <h3 className="text-lg font-semibold text-white">
                  No props found
                </h3>
                <p className="mt-1 text-sm text-white/50">
                  Try adjusting your search or filters.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-400 px-5 py-2.5 text-sm font-bold text-black transition hover:from-orange-600 hover:to-yellow-500"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid justify-center gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),300px))] justify-items-center">
                {(() => {
                  const items: GridItem[] = [...paginatedProps];
                  // Insert ads at memoized positions (only if they fall within current page)
                  if (
                    randomAds.length > 0 &&
                    items.length > 0 &&
                    memoizedAdPositions.length > 0
                  ) {
                    const adPositions: Array<{ ad: any; position: number }> = [];

                    // Find which ads should appear on this page based on memoized positions
                    for (
                      let i = 0;
                      i < randomAds.length && i < memoizedAdPositions.length;
                      i++
                    ) {
                      const globalPosition = memoizedAdPositions[i];
                      // Check if this ad position falls within the current page
                      if (
                        globalPosition >= startIndex &&
                        globalPosition < endIndex
                      ) {
                        // Convert global position to local page position
                        const localPosition = globalPosition - startIndex;
                        adPositions.push({
                          ad: randomAds[i],
                          position: localPosition,
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
                  return items.map((item: GridItem) => {
                    // If it's an ad, render AdCard
                    if ("isAd" in item && item.isAd) {
                      return (
                        <div
                          key={`ad-${item.id}`}
                          className="w-full sm:max-w-[300px]"
                        >
                          <AdCard ad={item as any} variant="script" />
                        </div>
                      );
                    }

                    // Otherwise render the shared ProductCard
                    const prop = item as UIProp;
                    return (
                      <ProductCard
                        key={prop.id}
                        product={toMarketProduct(prop)}
                      />
                    );
                  });
                })()}
              </div>
            )}
          </motion.div>

          {/* Pagination */}
          {sortedProps.length > 0 && totalPages > 1 && (
            <motion.div
              className="mt-12 flex flex-wrap justify-center gap-2 px-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-orange-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      currentPage === pageNum
                        ? "bg-gradient-to-r from-orange-500 to-yellow-400 text-black"
                        : "border border-white/[0.08] bg-white/[0.04] text-white/80 hover:border-orange-500/50 hover:text-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              )}

              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-orange-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </motion.div>
          )}
        </section>
      </SideAdsFrame>
      </main>
      <Footer />
    </>
  );
}
