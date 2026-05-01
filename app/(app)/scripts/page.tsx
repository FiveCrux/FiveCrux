"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Search,
  Filter,
  ChevronDown,
  X,
  Zap,
  Code,
  DollarSign,
  Grid,
  List,
  Sparkles,
} from "lucide-react";
import { Button } from "@/componentss/ui/button";
import { Checkbox } from "@/componentss/ui/checkbox";
import { Slider } from "@/componentss/ui/slider";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";

import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import AdCard, { useRandomAds } from "@/componentss/ads/ad-card";
import { VerifiedIcon } from "@/componentss/shared/verified-icon";
import { isVerifiedCreator } from "@/lib/utils";
import FeaturedScriptsSection from "@/componentss/home/FeaturedScriptsSection";
import { cn } from "@/lib/utils";

// Lazy-load Three.js canvas to avoid SSR issues
const ParticleCanvas = dynamic(() => import("@/componentss/home/ParticleCanvas"), { ssr: false });

// ── Types ───────────────────────────────────────────────────────────────────
interface UIScript {
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
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ScriptsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const scriptsRef = useRef(null);
  const scriptsInView = useInView(scriptsRef, { once: true, margin: "-100px" });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [allScripts, setAllScripts] = useState<UIScript[]>([]);
  const [featuredScripts, setFeaturedScripts] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
  const [sortBy, setSortBy] = useState("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const categoryParam = searchParams.get("category") ?? "";
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    categoryParam ? [categoryParam] : []
  );

  useEffect(() => {
    setSelectedCategories(categoryParam ? [categoryParam] : []);
  }, [categoryParam]);

  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);

  const scriptsShuffled = useRef(false);
  const priceRangeInitialized = useRef(false);

  // ── Fetch Data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [scriptsRes, adsRes] = await Promise.all([
          fetch(`/api/scripts`, { cache: "no-store" }),
          fetch(`/api/ads/scripts`, { cache: "no-store" }),
        ]);

        if (scriptsRes.ok) {
          const data = await scriptsRes.json();
          const mappedScripts = (data.scripts || []).map((s: any) => {
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
                ? Math.max(0, Math.round(((Number(s.original_price) - Number(s.price)) / Number(s.original_price)) * 100))
                : 0,
              framework: Array.isArray(s.framework) ? s.framework : s.framework ? [s.framework] : [],
              priceCategory: Number(s.price) <= 15 ? "Budget" : Number(s.price) <= 30 ? "Standard" : "Premium",
              tags: (s.tags || []) as string[],
              lastUpdated: s.updated_at,
              featured: s.featured || false,
              free: s.free || false,
            };
          });

          if (!scriptsShuffled.current) {
            setAllScripts([...mappedScripts].sort(() => Math.random() - 0.5));
            scriptsShuffled.current = true;
          } else {
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

  useEffect(() => {
    const fetchFeaturedScripts = async () => {
      try {
        setScriptsLoading(true);
        const response = await fetch("/api/featured-scripts?status=active", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          const mapped = (data.featuredScripts || []).map((item: any) => ({
            id: item.scriptId,
            featuredScriptId: item.id,
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
          setFeaturedScripts([...mapped].sort(() => Math.random() - 0.5));
        }
      } catch (error) {
        console.error("Error fetching featured scripts:", error);
      } finally {
        setScriptsLoading(false);
      }
    };
    fetchFeaturedScripts();
  }, []);

  // ── Logic ─────────────────────────────────────────────────────────────────
  const priceBounds = useMemo(() => {
    if (allScripts.length === 0) return { min: 0, max: 1000 };
    const prices = allScripts.map((s) => s.price).filter((p) => p > 0);
    if (prices.length === 0) return { min: 0, max: 1000 };
    const min = Math.floor(Math.min(...prices) / 10) * 10;
    const max = Math.ceil(Math.max(...prices) / 10) * 10;
    return { min, max };
  }, [allScripts]);

  useEffect(() => {
    if (allScripts.length > 0 && !priceRangeInitialized.current && priceBounds.max > 0) {
      setPriceRange([priceBounds.min, priceBounds.max]);
      priceRangeInitialized.current = true;
    }
  }, [allScripts.length, priceBounds.min, priceBounds.max]);

  const filteredScripts = useMemo(() => {
    return allScripts.filter((script) => {
      if (searchQuery && !script.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !script.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !script.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(script.category)) return false;
      if (selectedFrameworks.length > 0) {
        if (!script.framework || !script.framework.some((fw: string) => selectedFrameworks.includes(fw))) return false;
      }
      if (priceRange && priceRange.length === 2) {
        const isAtFullRange = priceRange[0] === priceBounds.min && priceRange[1] === priceBounds.max;
        if (!isAtFullRange && (script.price < priceRange[0] || script.price > priceRange[1])) return false;
      }
      if (onSaleOnly && script.discount === 0) return false;
      if (freeOnly && !script.free) return false;
      return true;
    });
  }, [allScripts, searchQuery, selectedCategories, selectedFrameworks, priceRange, priceBounds, onSaleOnly, freeOnly]);

  const sortedScripts = useMemo(() => {
    const scripts = [...filteredScripts];
    switch (sortBy) {
      case "price-low": return scripts.sort((a, b) => a.price - b.price);
      case "price-high": return scripts.sort((a, b) => b.price - a.price);
      case "rating": return scripts.sort((a, b) => b.rating - a.rating);
      case "newest": return scripts.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
      default: return scripts.sort((a, b) => b.reviews - a.reviews);
    }
  }, [filteredScripts, sortBy]);

  const totalPages = Math.ceil(sortedScripts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedScripts = sortedScripts.slice(startIndex, endIndex);

  useEffect(() => { setCurrentPage(1); }, [filteredScripts, sortBy]);

  const clearAllFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedFrameworks([]);
    setPriceRange([priceBounds.min, priceBounds.max]);
    setOnSaleOnly(false);
    setFreeOnly(false);
    setSearchQuery("");
    router.push("/scripts");
  }, [router, priceBounds]);

  const removeFilter = useCallback((type: string, value: string) => {
    if (type === "category") setSelectedCategories(prev => prev.filter(c => c !== value));
    if (type === "framework") setSelectedFrameworks(prev => prev.filter(f => f !== value));
  }, []);

  const activeFiltersCount = useMemo(() =>
    selectedCategories.length + selectedFrameworks.length +
    (priceRange[0] !== priceBounds.min || priceRange[1] !== priceBounds.max ? 1 : 0) +
    (onSaleOnly ? 1 : 0) + (freeOnly ? 1 : 0),
    [selectedCategories.length, selectedFrameworks.length, priceRange, priceBounds, onSaleOnly, freeOnly]
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterContainerRef.current && !filterContainerRef.current.contains(e.target as Node) && openFilter !== null) {
        setOpenFilter(null);
      }
    };
    if (openFilter !== null) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [openFilter]);

  const randomAds = useRandomAds(ads, 2);
  const memoizedAdPositions = useMemo(() => {
    if (randomAds.length === 0 || sortedScripts.length === 0) return [];
    const positions: number[] = [];
    const used = new Set<number>();
    for (let i = 0; i < randomAds.length; i++) {
      let attempts = 0, pos;
      do { pos = Math.floor(Math.random() * sortedScripts.length); attempts++; }
      while (used.has(pos) && attempts < 100);
      if (used.has(pos)) { for (let j = 0; j < sortedScripts.length; j++) { if (!used.has(j)) { pos = j; break; } } }
      used.add(pos);
      positions.push(pos);
    }
    return positions.sort((a, b) => a - b);
  }, [randomAds.map(ad => ad.id).join(','), sortedScripts.length]);

  // ── Render Helpers ────────────────────────────────────────────────────────
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
  ];

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#000000" }}>
      <Navbar />

      {/* ── Background & Particles ─────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {mounted && <ParticleCanvas />}
        {/* Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 blur-[100px] rounded-full" />
      </div>

      {/* ── Perspective Grid Floor (Hero context) ──────────────────── */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 pointer-events-none z-0 overflow-hidden"
        style={{ height: "400px", perspective: "1000px" }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: "rotateX(75deg)",
            transformOrigin: "top center",
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.08) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            backgroundPosition: "center top",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Page Header (Hero) ──────────────────────────────────────── */}
      <header className="relative z-10 pt-40 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-6 text-xs font-semibold text-neutral-500 uppercase tracking-widest"
        >
          <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
          <span className="text-neutral-700">/</span>
          <span className="text-orange-500">Marketplace</span>
        </motion.nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 w-fit"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Premium Marketplace</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter"
            >
              All <span className="gradient-text">Scripts</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-neutral-500 max-w-lg text-lg leading-relaxed"
            >
              Explore our curated selection of high-performance FiveM resources,
              engineered for excellence.
            </motion.p>
          </div>

          {!loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-6"
            >
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">{allScripts.length}</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Available</span>
              </div>
              <div className="h-10 w-px bg-neutral-800" />
              <div className="flex flex-col">
                <span className="text-3xl font-black text-orange-500">{activeFiltersCount}</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Active Filters</span>
              </div>
            </motion.div>
          )}
        </div>
      </header>

      {/* ── Featured Section ────────────────────────────────────────── */}
      <FeaturedScriptsSection scripts={featuredScripts} loading={scriptsLoading} />

      {/* ── Main Marketplace Content ────────────────────────────────── */}
      <main className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" ref={scriptsRef}>

        {/* Horizontal Rule with glow */}
        <div className="w-full h-px bg-neutral-900 relative mb-12">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col gap-6 mb-10">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">

            {/* Filter Buttons Group */}
            <div ref={filterContainerRef} className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 mr-4 text-xs font-bold text-neutral-500 uppercase tracking-widest border-r border-neutral-800 pr-4">
                <Filter className="h-3 w-3 text-orange-500" />
                Filter by
              </div>

              {/* Category Dropdown */}
              <div className="relative">
                <Button
                  onClick={() => setOpenFilter(openFilter === "categories" ? null : "categories")}
                  className={cn(
                    "bg-neutral-900/50 border text-white border-neutral-800 hover:border-orange-500/50 hover:text-black  text-xs font-semibold h-10 px-4",
                    (selectedCategories.length > 0 || openFilter === "categories") && "border-orange-500/40 bg-orange-500/5 text-orange-400 hover:text-black"
                  )}
                >
                  Categories
                  {selectedCategories.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-orange-500 text-black text-[10px] font-black">{selectedCategories.length}</span>
                  )}
                  <ChevronDown className={cn("ml-2 h-3 w-3 transition-transform duration-200", openFilter === "categories" && "rotate-180")} />
                </Button>
                <AnimatePresence>
                  {openFilter === "categories" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute top-full left-0 mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl p-4 z-[100] shadow-2xl"
                    >
                      <div className="flex flex-col gap-2">
                        {categories.map((c) => (
                          <label key={c.id} className="flex items-center gap-3 cursor-pointer group py-1">
                            <Checkbox
                              checked={selectedCategories.includes(c.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedCategories([...selectedCategories, c.id]);
                                else setSelectedCategories(selectedCategories.filter(x => x !== c.id));
                              }}
                            />
                            <span className="text-sm text-neutral-400 group-hover:text-white transition-colors">{c.name}</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Framework Dropdown */}
              <div className="relative">
                <Button
                  onClick={() => setOpenFilter(openFilter === "framework" ? null : "framework")}
                  className={cn(
                    "bg-neutral-900/50 border text-white border-neutral-800 hover:border-orange-500/50 hover:text-black  text-xs font-semibold h-10 px-4",
                    (selectedFrameworks.length > 0 || openFilter === "framework") && "border-orange-500/40 bg-orange-500/5 text-orange-400 hover:text-black"
                  )}
                >
                  Framework
                  {selectedFrameworks.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-orange-500 text-black text-[10px] font-black">{selectedFrameworks.length}</span>
                  )}
                  <ChevronDown className={cn("ml-2 h-3 w-3 transition-transform duration-200", openFilter === "framework" && "rotate-180")} />
                </Button>
                <AnimatePresence>
                  {openFilter === "framework" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute top-full left-0 mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl p-4 z-[100] shadow-2xl"
                    >
                      <div className="flex flex-col gap-2">
                        {frameworks.map((f) => (
                          <label key={f.value} className="flex items-center gap-3 cursor-pointer group py-1">
                            <Checkbox
                              checked={selectedFrameworks.includes(f.value)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedFrameworks([...selectedFrameworks, f.value]);
                                else setSelectedFrameworks(selectedFrameworks.filter(x => x !== f.value));
                              }}
                            />
                            <span className="text-sm text-neutral-400 group-hover:text-white transition-colors">{f.label}</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Price Dropdown */}
              <div className="relative">
                <Button
                  onClick={() => setOpenFilter(openFilter === "price" ? null : "price")}
                  className={cn(
                    "bg-neutral-900/50 border text-white border-neutral-800 hover:border-orange-500/50 hover:text-black  text-xs font-semibold h-10 px-4",
                    (priceRange[0] !== priceBounds.min || priceRange[1] !== priceBounds.max || freeOnly) && "border-orange-500/40 bg-orange-500/5 text-orange-400 hover:text-black"
                  )}
                >
                  Price
                  <ChevronDown className={cn("ml-2 h-3 w-3 transition-transform duration-200", openFilter === "price" && "rotate-180")} />
                </Button>
                <AnimatePresence>
                  {openFilter === "price" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute top-full left-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-xl p-6 z-[100] shadow-2xl"
                    >
                      <div className="flex flex-col gap-6">
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Range: ${priceRange[0]} - ${priceRange[1]}</p>
                          <Slider
                            value={priceRange}
                            onValueChange={setPriceRange}
                            max={priceBounds.max}
                            min={priceBounds.min}
                            step={1}
                            className="py-4"
                          />
                        </div>
                        <div className="h-px bg-neutral-800" />
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <Checkbox
                            checked={freeOnly}
                            onCheckedChange={(v) => setFreeOnly(!!v)}
                          />
                          <span className="text-sm text-neutral-400 group-hover:text-white transition-colors">Free Scripts Only</span>
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* On Sale toggle */}
              <Button
                onClick={() => setOnSaleOnly(!onSaleOnly)}
                className={cn(
                  "bg-neutral-900/50 border text-white border-neutral-800 hover:border-orange-500/50 hover:text-black  text-xs font-semibold h-10 px-4",
                  onSaleOnly && "border-orange-500/40 bg-orange-500/5 text-orange-400 hover:text-black"
                )}
              >
                <Zap className={cn("mr-2 h-3 w-3", onSaleOnly ? "text-orange-500" : "text-neutral-500")} />
                On Sale
              </Button>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  onClick={clearAllFilters}
                  className="text-[10px] font-black text-orange-500 hover:text-orange-400 uppercase tracking-widest px-4"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Search and Sort */}
            <div className="flex items-center gap-3">
              <div className="relative group flex-1 md:w-64 lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-600 group-focus-within:text-orange-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search scripts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900/40 border text-white border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500/50 transition-all placeholder:text-neutral-700"
                />
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-neutral-900/40 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-400 outline-none focus:border-orange-500/50 transition-all pr-10 cursor-pointer"
                >
                  <option value="popular">Most Popular</option>
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-600 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          <AnimatePresence>
            {activeFiltersCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 pt-2"
              >
                {selectedCategories.map(c => (
                  <FilterChip key={c} label={categories.find(x => x.id === c)?.name || c} onRemove={() => removeFilter("category", c)} />
                ))}
                {selectedFrameworks.map(f => (
                  <FilterChip key={f} label={frameworks.find(x => x.value === f)?.label || f} onRemove={() => removeFilter("framework", f)} />
                ))}
                {(priceRange[0] !== priceBounds.min || priceRange[1] !== priceBounds.max) && (
                  <FilterChip label={`$${priceRange[0]}-${priceRange[1]}`} onRemove={() => setPriceRange([priceBounds.min, priceBounds.max])} />
                )}
                {onSaleOnly && <FilterChip label="On Sale" onRemove={() => setOnSaleOnly(false)} />}
                {freeOnly && <FilterChip label="Free" onRemove={() => setFreeOnly(false)} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Bar */}
        {!loading && (
          <div className="flex items-center justify-between mb-8 text-xs font-bold text-neutral-600 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-orange-500" />
              Showing <span className="text-white">{sortedScripts.length}</span> scripts
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setViewMode("grid")} className={cn("p-1.5 rounded transition-colors", viewMode === "grid" ? "text-orange-500 bg-orange-500/10" : "text-neutral-700 hover:text-neutral-400")}><Grid className="h-4 w-4" /></button>
              <button onClick={() => setViewMode("list")} className={cn("p-1.5 rounded transition-colors", viewMode === "list" ? "text-orange-500 bg-orange-500/10" : "text-neutral-700 hover:text-neutral-400")}><List className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {/* ── Scripts Grid ───────────────────────────────────────────── */}
        <div className={cn(
          "grid gap-6",
          viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
        )}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} viewMode={viewMode} />)
          ) : (
            <>
              {paginatedScripts.length > 0 ? (
                <>
                  {/* Insert Ads logic */}
                  {(() => {
                    const items: any[] = [...paginatedScripts];
                    if (randomAds.length > 0 && memoizedAdPositions.length > 0) {
                      const toInsert: any[] = [];
                      for (let i = 0; i < randomAds.length; i++) {
                        const gp = memoizedAdPositions[i];
                        if (gp >= startIndex && gp < endIndex) toInsert.push({ ad: randomAds[i], pos: gp - startIndex });
                      }
                      toInsert.sort((a, b) => b.pos - a.pos).forEach(({ ad, pos }) => {
                        items.splice(pos, 0, { ...ad, isAd: true });
                      });
                    }
                    return items.map((item, idx) => (
                      <motion.div
                        key={item.isAd ? `ad-${item.id}` : item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={scriptsInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.5, delay: (idx % 4) * 0.1 }}
                      >
                        {item.isAd ? (
                          <AdCard ad={item} variant="script" />
                        ) : (
                          <ScriptCard script={item} viewMode={viewMode} />
                        )}
                      </motion.div>
                    ));
                  })()}
                </>
              ) : (
                <div className="col-span-full py-32 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 mb-6">
                    <Search className="h-6 w-6 text-neutral-700" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No scripts found</h3>
                  <p className="text-neutral-500 mb-8 max-w-xs mx-auto">We couldn&apos;t find any scripts matching your current filters.</p>
                  <Button onClick={clearAllFilters} className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-8">Clear All Filters</Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Pagination ─────────────────────────────────────────────── */}
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </main>

      <Footer />
    </div>
  );
}

// ── Internal Components ──────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[10px] font-black text-orange-400 uppercase tracking-widest group">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function ScriptCard({ script, viewMode }: { script: UIScript; viewMode: "grid" | "list" }) {
  return (
    <Link href={`/script/${script.id}`} className="block group h-full">
      <div className={cn(
        "relative bg-[#080808] border border-neutral-800/60 rounded-2xl overflow-hidden transition-all duration-500 group-hover:border-orange-500/40 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(249,115,22,0.05)] h-full flex",
        viewMode === "grid" ? "flex-col" : "flex-row"
      )}>
        {/* Image Area */}
        <div className={cn(
          "relative overflow-hidden",
          viewMode === "grid" ? "aspect-video w-full" : "w-64 flex-shrink-0"
        )}>
          <Image
            src={script.image}
            alt={script.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

          {script.featured && (
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-orange-500 text-black text-[9px] font-black uppercase tracking-widest shadow-lg">
              Featured
            </div>
          )}

          {script.discount > 0 && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-red-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg">
              -{script.discount}%
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-5 flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-white font-bold text-base leading-tight group-hover:text-orange-400 transition-colors line-clamp-1">
              {script.title}
            </h3>

            <div className="flex items-center gap-2">
              <div className="relative w-4 h-4 rounded-full overflow-hidden border border-neutral-800">
                <Image src={script.seller_image || "/placeholder-user.jpg"} alt={script.seller} fill className="object-cover" />
              </div>
              <span className="text-[10px] text-neutral-500 font-semibold">{script.seller}</span>
              {isVerifiedCreator(script.seller_roles) && <VerifiedIcon size="sm" className="h-3 w-3" />}
            </div>
          </div>

          {/* Frameworks */}
          <div className="flex flex-wrap gap-1.5">
            {script.framework?.map((fw) => (
              <span key={fw} className="text-[9px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
                {fw}
              </span>
            ))}
          </div>

          {/* Price & CTA */}
          <div className="mt-auto flex items-center justify-between pt-4 border-t border-neutral-900">
            <div className="flex flex-col">
              {script.free ? (
                <span className="text-lg font-black text-orange-500 uppercase tracking-tighter">Free</span>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-white">{script.currency_symbol || "$"}{script.price}</span>
                  {script.originalPrice && script.originalPrice > script.price && (
                    <span className="text-[10px] text-neutral-600 line-through">${script.originalPrice}</span>
                  )}
                </div>
              )}
            </div>

            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-black transition-all duration-300">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard({ viewMode }: { viewMode: "grid" | "list" }) {
  return (
    <div className={cn(
      "bg-[#080808] border border-neutral-800/60 rounded-2xl overflow-hidden h-[340px] flex",
      viewMode === "grid" ? "flex-col" : "flex-row"
    )}>
      <div className={cn("bg-neutral-900 animate-pulse", viewMode === "grid" ? "aspect-video w-full" : "w-64 flex-shrink-0")} />
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="h-5 w-3/4 bg-neutral-900 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-neutral-900 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-4 w-12 bg-neutral-900 rounded animate-pulse" />
          <div className="h-4 w-12 bg-neutral-900 rounded animate-pulse" />
        </div>
        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="h-6 w-16 bg-neutral-900 rounded animate-pulse" />
          <div className="h-8 w-8 bg-neutral-900 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-16">
      <Button
        variant="ghost"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white"
      >
        Prev
      </Button>
      {Array.from({ length: totalPages }).map((_, i) => {
        const page = i + 1;
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              "w-8 h-8 rounded-lg text-xs font-black transition-all",
              currentPage === page ? "bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]" : "text-neutral-500 hover:bg-neutral-900 hover:text-white"
            )}
          >
            {page}
          </button>
        );
      })}
      <Button
        variant="ghost"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white"
      >
        Next
      </Button>
    </div>
  );
}