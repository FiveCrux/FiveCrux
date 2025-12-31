"use client";

import {
  useEffect,
  useState,
  useRef,
  JSXElementConstructor,
  Key,
  ReactElement,
  ReactNode,
  ReactPortal,
} from "react";
import Image from "next/image";
import { motion, useInView, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/componentss/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentss/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/componentss/ui/avatar";
import { Badge } from "@/componentss/ui/badge";
import { Progress } from "@/componentss/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/componentss/ui/tabs";
import { Input } from "@/componentss/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentss/ui/select";
import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import { VerifiedIcon } from "@/componentss/shared/verified-icon";
import { isVerifiedCreator } from "@/lib/utils";
import Link from "next/link";
import AdCard, { useRandomAds } from "@/componentss/ads/ad-card";
import {
  useGiveaways,
  usePromotedGiveaways,
  useUserGiveawayEntries,
} from "@/hooks/use-giveaways-queries";
import { toast } from "sonner";

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
  );
};

// Floating 3D elements
type FloatingElementProps = {
  delay?: number;
  size?: number;
  icon: any;
  color?: string;
};
const FloatingElement = ({
  delay = 0,
  size = 60,
  icon: Icon,
  color = "text-yellow-400",
}: FloatingElementProps) => {
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
  );
};

export default function GiveawaysPage() {
  const heroRef = useRef(null);
  const giveawaysRef = useRef(null);
  const statsRef = useRef(null);

  const heroInView = useInView(heroRef, { once: true });
  const giveawaysInView = useInView(giveawaysRef, { once: true });
  const statsInView = useInView(statsRef, { once: true });

  const [enteredGiveaways, setEnteredGiveaways] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("ending-soon");
  const [filterBy, setFilterBy] = useState("all");
  const [ads, setAds] = useState<any[]>([]);

  type UIGiveaway = {
    id: number;
    title: string;
    description: string;
    totalValue: string;
    currency_symbol?: string;
    entries: number;
    maxEntries: number;
    timeLeft: string;
    endDate: string;
    image: string;
    requirements: string[];
    difficulty: string;
    category: string;
    featured: boolean;
    trending: boolean;
    creator: string;
    creatorImage?: string;
    creator_roles?: string[] | null;
    tags: string[];
  };

  type GridItem = UIGiveaway | (any & { isAd: boolean });

  const [activeGiveaways, setActiveGiveaways] = useState<UIGiveaway[]>([]);
  const [loading, setLoading] = useState(true);

  // Get random ads for giveaways page
  const randomAds = useRandomAds(ads, 2);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [giveawaysRes, adsRes, entriesRes] = await Promise.all([
          fetch(`/api/giveaways`, { cache: "no-store" }),
          fetch(`/api/promotions/giveaways`, { cache: "no-store" }),
          fetch(`/api/users/giveaway-entries`, { cache: "no-store" }),
        ]);

        if (giveawaysRes.ok) {
          const data = await giveawaysRes.json();
          console.log("Giveaways API response:", data);
          const list = Array.isArray(data) ? data : data.giveaways || [];
          setActiveGiveaways(
            list.map((g: any) => ({
              id: g.id,
              title: g.title,
              description: g.description,
              totalValue: g.total_value,
              currency_symbol: g.currency_symbol,
              entries: g.entries_count || 0,
              maxEntries: g.max_entries || 0,
              timeLeft: "", // can be computed from end_date if needed
              endDate: g.end_date,
              image:
                g.cover_image ||
                (g.images && g.images[0]) ||
                "/placeholder.jpg",
              requirements:
                (g.requirements &&
                  g.requirements.map((r: any) => r.description)) ||
                [],
              difficulty: g.difficulty,
              category: g.category,
              featured: g.featured,
              trending: false,
              creator: g.creator_name,
              creatorImage: g.creator_image,
              creator_roles: g.creator_roles || null,
              tags: g.tags || [],
            }))
          );
        } else {
          console.error("Failed to fetch giveaways:", giveawaysRes.status);
        }

        if (adsRes.ok) {
          const adsData = await adsRes.json();
          setAds(adsData.ads || []);
        }

        // Fetch user's entered giveaways (if logged in)
        if (entriesRes.ok) {
          const entriesData = await entriesRes.json();
          if (entriesData.entries) {
            const enteredIds = entriesData.entries.map(
              (entry: any) => entry.giveawayId
            );
            setEnteredGiveaways(enteredIds);
          }
        } else if (entriesRes.status === 401) {
          // User not logged in, that's okay
          setEnteredGiveaways([]);
        }
      } catch (error) {
        console.error("Error loading giveaways:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
  ];

  const stats = [
    {
      label: "Active Giveaways",
      value: activeGiveaways.length.toString(),
      icon: Gift,
      color: "text-yellow-400",
    },
    {
      label: "Total Prize Value",
      value: `$${activeGiveaways
        .reduce(
          (sum, g) =>
            sum + parseInt(g.totalValue?.replace(/[^0-9]/g, "") || "0"),
          0
        )
        .toLocaleString()}`,
      icon: Trophy,
      color: "text-orange-500",
    },
    {
      label: "Happy Winners",
      value: "150+",
      icon: Crown,
      color: "text-yellow-400",
    },
    {
      label: "Community Members",
      value: "25K+",
      icon: Users,
      color: "text-orange-500",
    },
  ];

  const enterGiveaway = async (giveawayId: number) => {
    try {
      const response = await fetch(`/api/giveaways/${giveawayId}/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        if (!enteredGiveaways.includes(giveawayId)) {
          setEnteredGiveaways([...enteredGiveaways, giveawayId]);
        }
        // Refresh the page to update entry counts
        window.location.reload();
      } else {
        toast.error(data.error || "Failed to enter giveaway");
      }
    } catch (error) {
      console.error("Error entering giveaway:", error);
      toast.error("Failed to enter giveaway. Please try again.");
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "Hard":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const filteredGiveaways = activeGiveaways.filter((giveaway) => {
    if (
      searchQuery &&
      !giveaway.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (filterBy === "featured" && !giveaway.featured) {
      return false;
    }
    if (filterBy === "trending" && !giveaway.trending) {
      return false;
    }
    return true;
  });

  // Filter active giveaways (not ended)
  const activeFilteredGiveaways = filteredGiveaways.filter((giveaway) => {
    const isEnded =
      new Date(giveaway.endDate).getTime() <= new Date().getTime();
    return !isEnded;
  });

  // Filter ended giveaways
  const endedFilteredGiveaways = filteredGiveaways.filter((giveaway) => {
    const isEnded =
      new Date(giveaway.endDate).getTime() <= new Date().getTime();
    return isEnded;
  });

  return (
    <>
      <Navbar />
      <div className="min-h-screen text-white relative overflow-hidden">

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
              <span className="text-white">All Giveaways</span>
            </motion.nav>

            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
                All Giveaways
              </span>
            </motion.h1>

            <motion.p
              className="text-gray-400 mb-4 text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Browse our complete collection of premium FiveM giveaways
            </motion.p>

            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {/* {!loading && (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  {sortedScripts.length} scripts found
                </div>
              )} */}
              {/* {activeFiltersCount > 0 && (
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
              )} */}
            </motion.div>
          </div>
        </motion.div>

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
            <TabsList className="flex sm:grid sm:grid-cols-3 w-full bg-gray-800/30 border border-gray-700/50 overflow-hidden backdrop-blur-sm rounded-2xl h-auto items-stretch p-1 gap-1">
              <TabsTrigger
                value="active"
                className="flex-1 sm:flex-none h-10 inline-flex items-center justify-center rounded-xl font-bold text-xs sm:text-sm py-2 px-2 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-none data-[state=active]:translate-y-0"
              >
                <Gift className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Active</span>
                <span className="hidden sm:inline"> Giveaways</span>
              </TabsTrigger>

              <TabsTrigger
                value="ended"
                className="flex-1 sm:flex-none h-10 inline-flex items-center justify-center rounded-xl font-bold text-xs sm:text-sm py-2 px-2 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-none data-[state=active]:translate-y-0"
              >
                <Clock className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Ended</span>
                <span className="hidden sm:inline"> Giveaways</span>
              </TabsTrigger>

              <TabsTrigger
                value="rules"
                className="flex-1 sm:flex-none h-10 inline-flex items-center justify-center rounded-xl font-bold text-xs sm:text-sm py-2 px-2 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-none data-[state=active]:translate-y-0"
              >
                <Star className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Rules</span>
                <span className="hidden sm:inline"> & Info</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-8">
              <motion.div
                ref={giveawaysRef}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                initial={{ opacity: 0 }}
                animate={giveawaysInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.8, staggerChildren: 0.1 }}
              >
                {loading ? (
                  // Skeleton loaders
                  Array.from({ length: 6 }).map((_, index) => (
                    <motion.div
                      key={index}
                      className="bg-transparent border-gray-700/50 backdrop-blur-sm rounded-xl overflow-hidden h-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {/* Image Skeleton */}
                      <div className="w-full h-32 bg-gray-800/50 animate-pulse rounded-t-xl" />

                      {/* Content Skeleton */}
                      <div className="p-3 space-y-3">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-800/50 rounded animate-pulse w-3/4" />
                          <div className="h-3 bg-gray-800/50 rounded animate-pulse w-full" />
                          <div className="h-3 bg-gray-800/50 rounded animate-pulse w-2/3" />
                        </div>

                        {/* Badges Skeleton */}
                        <div className="flex gap-2">
                          <div className="h-5 w-16 bg-gray-800/50 rounded animate-pulse" />
                          <div className="h-5 w-20 bg-gray-800/50 rounded animate-pulse" />
                        </div>

                        {/* Stats Skeleton */}
                        <div className="flex items-center justify-between">
                          <div className="h-4 w-20 bg-gray-800/50 rounded animate-pulse" />
                          <div className="h-4 w-16 bg-gray-800/50 rounded animate-pulse" />
                        </div>

                        {/* Tags Skeleton */}
                        <div className="flex gap-1">
                          <div className="h-5 w-16 bg-gray-800/50 rounded animate-pulse" />
                          <div className="h-5 w-20 bg-gray-800/50 rounded animate-pulse" />
                        </div>

                        {/* Requirements Skeleton */}
                        <div className="space-y-1">
                          <div className="h-3 w-24 bg-gray-800/50 rounded animate-pulse" />
                          <div className="h-3 w-full bg-gray-800/50 rounded animate-pulse" />
                        </div>

                        {/* Button Skeleton */}
                        <div className="h-8 bg-gray-800/50 rounded animate-pulse w-full" />
                      </div>
                    </motion.div>
                  ))
                ) : (() => {
                  const items: GridItem[] = [...activeFilteredGiveaways];

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
                          <h3 className="text-xl font-semibold text-white mb-2">
                            No Giveaways Found
                          </h3>
                          <p className="text-gray-400 mb-6">
                            {searchQuery
                              ? `No giveaways match "${searchQuery}". Try adjusting your search.`
                              : "There are currently no active giveaways. Check back soon!"}
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
                      const position = Math.floor(
                        Math.random() * (items.length + 1)
                      );
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
                    if ("isAd" in item && item.isAd) {
                      return (
                        <motion.div
                          key={`ad-${item.id}`}
                          initial={{ opacity: 0, y: 50 }}
                          animate={giveawaysInView ? { opacity: 1, y: 0 } : {}}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                          whileHover={{ y: -8, scale: 1.02 }}
                        >
                          <AdCard ad={item as any} variant="giveaway" />
                        </motion.div>
                      );
                    }

                    // Otherwise render giveaway
                    const giveaway = item;
                    const isEnded =
                      new Date(giveaway.endDate).getTime() <=
                      new Date().getTime();
                    return (
                      <motion.div
                        key={giveaway.id}
                        className="group"
                        whileHover={{ y: -5, scale: 1.02 }}
                        initial={{ opacity: 0, y: 50 }}
                        animate={giveawaysInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                      >
                        <Link href={`/giveaway/${giveaway.id}`}>
                          <Card
                            className={`bg-neutral-900 hover:border-white cursor-pointer h-full backdrop-blur-sm relative overflow-hidden shadow-2xl rounded-lg transition-all duration-300 flex flex-col ${isEnded ? "grayscale opacity-60" : ""
                              }`}
                          >
                            {/* Image Section */}
                            <CardHeader className="p-0 overflow-hidden rounded-t-lg relative">
                              <Image
                                src={giveaway.image || "/cat.jpg"}
                                alt={giveaway.title}
                                width={400}
                                height={256}
                                className="object-cover w-full h-52"
                              />
                              {/* Ended Overlay */}
                              {isEnded && (
                                <div className="absolute inset-0 z-50 pointer-events-none rounded-t-lg overflow-hidden flex items-center justify-center bg-black/50">
                                  <img
                                    src="/ended.png"
                                    alt="Ended"
                                    className="w-24 h-24 object-contain opacity-90"
                                  />
                                </div>
                              )}
                            </CardHeader>

                            {/* Content Section */}
                            <div className="flex flex-col flex-1">
                              <CardContent className="p-3 flex-1 space-y-2">
                                {/* Title */}
                                <CardTitle className="text-base font-bold text-white leading-tight line-clamp-2">
                                  {giveaway.title}
                                </CardTitle>

                                {/* Category Badge */}
                                {giveaway.category && (
                                  <div className="flex flex-wrap gap-1">
                                    <Badge className="bg-neutral-800/95 text-white backdrop-blur-sm text-[10px] font-bold border border-neutral-600/50 rounded px-1.5 py-0.5 uppercase tracking-wide shadow-lg">
                                      <span className="mr-1 text-xs">•</span>
                                      {giveaway.category}
                                    </Badge>
                                  </div>
                                )}

                                {/* Description */}
                                <CardDescription className="text-neutral-400 text-xs leading-snug line-clamp-2 flex items-center gap-1.5">
                                  <span>By {giveaway.creator || "Unknown Creator"}</span>
                                  {isVerifiedCreator(giveaway.creator_roles) && (
                                    <VerifiedIcon size="sm" />
                                  )}
                                </CardDescription>

                                {/* Value */}
                                <CardDescription className="text-orange-500 text-xl font-bold pt-1">
                                  {giveaway.currency_symbol || "$"}
                                  {giveaway.totalValue}
                                </CardDescription>
                              </CardContent>

                              {/* Button Section */}
                              <div className="px-3 pb-3 mt-auto">
                                {!isEnded ? (
                                  <Button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      enterGiveaway(giveaway.id);
                                    }}
                                    disabled={enteredGiveaways.includes(giveaway.id)}
                                    variant="outline"
                                    className={`w-full bg-white text-black hover:bg-gray-300 hover:border-gray-300 hover:text-black transition-colors duration-200 font-semibold text-xs py-1.5 h-auto ${enteredGiveaways.includes(giveaway.id)
                                        ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                                        : ""
                                      }`}
                                  >
                                    {enteredGiveaways.includes(giveaway.id) ? (
                                      <>
                                        <Trophy className="mr-1.5 h-3.5 w-3.5" />
                                        Registered!
                                      </>
                                    ) : (
                                      "View Details"
                                    )}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    disabled
                                    className="w-full bg-neutral-800 text-neutral-500 cursor-not-allowed font-semibold text-xs py-1.5 h-auto"
                                  >
                                    Ended
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    );
                  });
                })()}

              </motion.div>
            </TabsContent>

            <TabsContent value="ended" className="mt-8">
              <motion.div
                ref={giveawaysRef}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                initial={{ opacity: 0 }}
                animate={giveawaysInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.8, staggerChildren: 0.1 }}
              >
                {loading ? (
                  // Skeleton loaders
                  Array.from({ length: 6 }).map((_, index) => (
                    <motion.div
                      key={index}
                      className="bg-transparent border-gray-700/50 backdrop-blur-sm rounded-xl overflow-hidden h-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {/* Image Skeleton */}
                      <div className="w-full h-32 bg-gray-800/50 animate-pulse rounded-t-xl" />

                      {/* Content Skeleton */}
                      <div className="p-3 space-y-3">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-800/50 rounded animate-pulse w-3/4" />
                          <div className="h-3 bg-gray-800/50 rounded animate-pulse w-full" />
                          <div className="h-3 bg-gray-800/50 rounded animate-pulse w-2/3" />
                        </div>

                        {/* Badges Skeleton */}
                        <div className="flex gap-2">
                          <div className="h-5 w-16 bg-gray-800/50 rounded animate-pulse" />
                          <div className="h-5 w-20 bg-gray-800/50 rounded animate-pulse" />
                        </div>

                        {/* Stats Skeleton */}
                        <div className="flex items-center justify-between">
                          <div className="h-4 w-20 bg-gray-800/50 rounded animate-pulse" />
                          <div className="h-4 w-16 bg-gray-800/50 rounded animate-pulse" />
                        </div>

                        {/* Tags Skeleton */}
                        <div className="flex gap-1">
                          <div className="h-5 w-16 bg-gray-800/50 rounded animate-pulse" />
                          <div className="h-5 w-20 bg-gray-800/50 rounded animate-pulse" />
                        </div>

                        {/* Requirements Skeleton */}
                        <div className="space-y-1">
                          <div className="h-3 w-24 bg-gray-800/50 rounded animate-pulse" />
                          <div className="h-3 w-full bg-gray-800/50 rounded animate-pulse" />
                        </div>

                        {/* Button Skeleton */}
                        <div className="h-8 bg-gray-800/50 rounded animate-pulse w-full" />
                      </div>
                    </motion.div>
                  ))
                ) : (() => {
                  const items: GridItem[] = [...endedFilteredGiveaways];

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
                          <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-white mb-2">
                            No Ended Giveaways
                          </h3>
                          <p className="text-gray-400 mb-6">
                            {searchQuery
                              ? `No ended giveaways match "${searchQuery}". Try adjusting your search.`
                              : "There are currently no ended giveaways."}
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
                      const position = Math.floor(
                        Math.random() * (items.length + 1)
                      );
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
                    if ("isAd" in item && item.isAd) {
                      return (
                        <motion.div
                          key={`ad-${item.id}`}
                          initial={{ opacity: 0, y: 50 }}
                          animate={giveawaysInView ? { opacity: 1, y: 0 } : {}}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                          whileHover={{ y: -8, scale: 1.02 }}
                        >
                          <AdCard ad={item as any} variant="giveaway" />
                        </motion.div>
                      );
                    }

                    // Otherwise render giveaway
                    const giveaway = item;
                    const isEnded =
                      new Date(giveaway.endDate).getTime() <=
                      new Date().getTime();
                    return (
                      <motion.div
                        key={giveaway.id}
                        className="group"
                        whileHover={{ y: -5, scale: 1.02 }}
                        initial={{ opacity: 0, y: 50 }}
                        animate={giveawaysInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                      >
                        <Link href={`/giveaway/${giveaway.id}`}>
                          <Card
                            className={`bg-neutral-900 border-2 border-neutral-700/50 cursor-pointer h-full backdrop-blur-sm relative overflow-hidden shadow-2xl rounded-lg transition-all duration-300 flex flex-col ${isEnded ? "grayscale opacity-60" : ""
                              }`}
                          >
                            {/* Image Section */}
                            <CardHeader className="p-0 overflow-hidden rounded-t-lg relative">
                              <Image
                                src={giveaway.image || "/cat.jpg"}
                                alt={giveaway.title}
                                width={400}
                                height={256}
                                className="object-cover w-full h-52"
                              />
                              {/* Ended Overlay */}
                              {isEnded && (
                                <div className="absolute inset-0 z-50 pointer-events-none rounded-t-lg overflow-hidden flex items-center justify-center bg-black/50">
                                  <img
                                    src="/ended.png"
                                    alt="Ended"
                                    className="w-24 h-24 object-contain opacity-90"
                                  />
                                </div>
                              )}
                            </CardHeader>

                            {/* Content Section */}
                            <div className="flex flex-col flex-1">
                              <CardContent className="p-3 flex-1 space-y-2">
                                {/* Title */}
                                <CardTitle className="text-base font-bold text-white leading-tight line-clamp-2">
                                  {giveaway.title}
                                </CardTitle>

                                {/* Category Badge */}
                                {giveaway.category && (
                                  <div className="flex flex-wrap gap-1">
                                    <Badge className="bg-neutral-800/95 text-white backdrop-blur-sm text-[10px] font-bold border border-neutral-600/50 rounded px-1.5 py-0.5 uppercase tracking-wide shadow-lg">
                                      <span className="mr-1 text-xs">•</span>
                                      {giveaway.category}
                                    </Badge>
                                  </div>
                                )}

                                {/* Description */}
                                <CardDescription className="text-neutral-400 text-xs  flex flex-row items-center gap-1.5">
                                  <Avatar className="h-4 w-4">
                                    <AvatarImage
                                      src={
                                        giveaway.creatorImage || "/placeholder-user.jpg"
                                      }
                                    />
                                    <AvatarFallback className="text-[8px]">
                                      {giveaway.creator?.charAt(0).toUpperCase() || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>By {giveaway.creator || "Unknown Creator"}</span>
                                  {isVerifiedCreator(giveaway.creator_roles) && (
                                    <VerifiedIcon size="sm" />
                                  )}
                                </CardDescription>

                                {/* Value */}
                                <CardDescription className="text-orange-500 text-xl font-bold pt-1">
                                  {giveaway.currency_symbol || "$"}
                                  {giveaway.totalValue}
                                </CardDescription>
                              </CardContent>

                              {/* Button Section */}
                              <div className="px-3 pb-3 mt-auto">
                                {!isEnded ? (
                                  <Button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      enterGiveaway(giveaway.id);
                                    }}
                                    disabled={enteredGiveaways.includes(giveaway.id)}
                                    variant="outline"
                                    className={`w-full bg-white text-black hover:bg-gray-300 hover:border-gray-300 hover:text-black transition-colors duration-200 font-semibold text-xs py-1.5 h-auto ${enteredGiveaways.includes(giveaway.id)
                                        ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                                        : ""
                                      }`}
                                  >
                                    {enteredGiveaways.includes(giveaway.id) ? (
                                      <>
                                        <Trophy className="mr-1.5 h-3.5 w-3.5" />
                                        Registered!
                                      </>
                                    ) : (
                                      "View Details"
                                    )}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    disabled
                                    className="w-full bg-neutral-800 text-neutral-500 cursor-not-allowed font-semibold text-xs py-1.5 h-auto"
                                  >
                                    Ended
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    );
                  });
                })()}
              </motion.div>
            </TabsContent>



            <TabsContent value="rules" className="mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Giveaway Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-gray-300">
                    <div>
                      <h4 className="text-white font-semibold mb-2">
                        Eligibility
                      </h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Must be 18+ or have parental consent</li>
                        <li>• One entry per person per giveaway</li>
                        <li>• Must complete all requirements to qualify</li>
                        <li>• Account must be in good standing</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">
                        Selection Process
                      </h4>
                      <ul className="space-y-1 text-sm">
                        <li>
                          • Winners selected randomly from qualified entries
                        </li>
                        <li>
                          • Drawing occurs within 24 hours of giveaway end
                        </li>
                        <li>• Winners notified via Discord and email</li>
                        <li>
                          • 48 hours to claim prize or new winner selected
                        </li>
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
                      <h4 className="text-white font-semibold mb-2">
                        Step 1: Meet Requirements
                      </h4>
                      <p className="text-sm">
                        Complete all listed requirements for the giveaway you
                        want to enter.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">
                        Step 2: Click &quot;Enter&quot;
                      </h4>
                      <p className="text-sm">
                        Click the &quot;Enter Giveaway&quot; button to submit
                        your entry.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">
                        Step 3: Wait for Results
                      </h4>
                      <p className="text-sm">
                        Winners are announced on our Discord server and website.
                      </p>
                    </div>
                    <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
                      <h4 className="text-yellow-400 font-semibold mb-2">
                        Pro Tip
                      </h4>
                      <p className="text-sm">
                        Join our Discord server to get notified about new
                        giveaways and increase your chances of winning!
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
  );
}
