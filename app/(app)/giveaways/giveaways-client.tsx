"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import {
  Gift,
  Clock,
  Users,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import Link from "next/link";
import AdCard, { useRandomAds } from "@/componentss/ads/ad-card";
import { toast } from "sonner";
import SideAdsFrame from "@/componentss/ads/side-banners";

// Live countdown, isolated into its own component so the 1-second tick only
// re-renders this tiny <span> — NOT the whole page. (Previously the parent held
// the ticking `now` state, so every card remounted every second, reloading all
// card images = the "cards keep re-loading" flicker.)
function fmtTimeLeftShort(diff: number) {
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days >= 1) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 1) return `${hours}h ${mins}m left`;
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  return `${mins}m ${secs}s left`;
}
function fmtTimeLeft(diff: number) {
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days >= 1) return `Ends in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours >= 1) return `Ends in ${hours} hour${hours === 1 ? "" : "s"}`;
  const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
  return `Ends in ${mins} min${mins === 1 ? "" : "s"}`;
}
function Countdown({ endDate, short = false }: { endDate: string; short?: boolean }) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(endDate).getTime() - now;
  return <>{short ? fmtTimeLeftShort(diff) : fmtTimeLeft(diff)}</>;
}

// Module-level so the SSR seed and the client fallback map identically.
function mapApiGiveaway(g: any) {
  return {
    id: g.id,
    title: g.title,
    description: g.description,
    totalValue: g.total_value,
    currency_symbol: g.currency_symbol,
    entries: g.entries_count || 0,
    maxEntries: g.max_entries || 0,
    timeLeft: "",
    endDate: g.end_date,
    start_date: g.start_date || null,
    is_upcoming: g.is_upcoming || false,
    image: g.cover_image || (g.images && g.images[0]) || "/placeholder.jpg",
    requirements:
      (g.requirements && g.requirements.map((r: any) => r.description)) || [],
    difficulty: g.difficulty,
    category: g.category,
    featured: g.featured,
    trending: false,
    creator: g.creator_name,
    creatorImage: g.creator_image,
    creator_roles: g.creator_roles || null,
    tags: g.tags || [],
  };
}

export function GiveawaysClient({
  initialGiveaways = [],
  initialAds = [],
}: {
  initialGiveaways?: any[];
  initialAds?: any[];
}) {
  const giveawaysRef = useRef(null);
  const giveawaysInView = useInView(giveawaysRef, { once: true });

  const [enteredGiveaways, setEnteredGiveaways] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("ending-soon");
  const [filterBy, setFilterBy] = useState("all");
  const [ads, setAds] = useState<any[]>(Array.isArray(initialAds) ? initialAds : []);
  const [activeTab, setActiveTab] = useState<"active" | "ended">("active");

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
    start_date?: string | null;
    is_upcoming?: boolean;
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

  // Seed from server-fetched giveaways so the grid paints on first render (SSR).
  const [activeGiveaways, setActiveGiveaways] = useState<UIGiveaway[]>(
    () => (Array.isArray(initialGiveaways) ? (initialGiveaways.map(mapApiGiveaway) as UIGiveaway[]) : [])
  );
  const [loading, setLoading] = useState(
    !(Array.isArray(initialGiveaways) && initialGiveaways.length > 0)
  );

  // Get random ads for giveaways page
  const randomAds = useRandomAds(ads, 2);

  useEffect(() => {
    // Server already seeded giveaways + ads → skip those refetches. ALWAYS fetch
    // the user's entries (session-specific, can't be part of the SSR shell).
    const hasSeed = Array.isArray(initialGiveaways) && initialGiveaways.length > 0;
    const load = async () => {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 15000);
      let gotGiveaways = hasSeed;
      try {
        if (!hasSeed) setLoading(true);
        const [giveawaysRes, adsRes, entriesRes] = await Promise.all([
          hasSeed ? Promise.resolve(null) : fetch(`/api/giveaways`, { cache: "no-store", signal: c.signal }),
          hasSeed ? Promise.resolve(null) : fetch(`/api/promotions/giveaways`, { cache: "no-store", signal: c.signal }),
          fetch(`/api/users/giveaway-entries`, { cache: "no-store", signal: c.signal }),
        ]);
        clearTimeout(t);

        if (giveawaysRes && giveawaysRes.ok) {
          const data = await giveawaysRes.json();
          const list = Array.isArray(data) ? data : data.giveaways || [];
          if (list.length > 0) {
            gotGiveaways = true;
            setActiveGiveaways(list.map(mapApiGiveaway) as UIGiveaway[]);
          }
        } else if (giveawaysRes) {
          console.error("Failed to fetch giveaways:", giveawaysRes.status);
        }

        if (adsRes && adsRes.ok) {
          const adsData = await adsRes.json();
          setAds(adsData.ads || []);
        }

        // Fetch user's entered giveaways (if logged in)
        if (entriesRes.ok) {
          const entriesData = await entriesRes.json();
          if (entriesData.entries) {
            setEnteredGiveaways(entriesData.entries.map((entry: any) => entry.giveawayId));
          }
        } else if (entriesRes.status === 401) {
          // User not logged in, that's okay
          setEnteredGiveaways([]);
        }
      } catch (error) {
        if ((error as any)?.name !== "AbortError")
          console.error("Error loading giveaways:", error);
      } finally {
        clearTimeout(t);
        // On empty/error/timeout (and no seed), show the clean empty state.
        if (!gotGiveaways) {
          setActiveGiveaways([]);
        }
        setLoading(false);
      }
    };
    load();
  }, []);

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

  // Everything below is derived from the giveaway data + filters/tab. Memoized
  // so re-renders don't re-run the random ad placement below (that was
  // reshuffling the whole grid's order — the "cards keep changing" bug).
  const { featuredGiveaway, gridActiveGiveaways, endedFilteredGiveaways, liveCount, gridList } = useMemo(() => {
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

    // FEATURED = a giveaway an admin actually flagged as featured. No fallback
    // to the first active one — never label an ordinary giveaway "FEATURED".
    const featuredGiveaway =
      activeFilteredGiveaways.find((g) => g.featured) || null;

    // Grid shows the remaining active giveaways (featured pulled out).
    const gridActiveGiveaways = featuredGiveaway
      ? activeFilteredGiveaways.filter((g) => g.id !== featuredGiveaway.id)
      : activeFilteredGiveaways;

    const gridList: GridItem[] =
      activeTab === "active" ? [...gridActiveGiveaways] : [...endedFilteredGiveaways];

    // Insert ads at random positions (preserved logic) — computed once per
    // data/tab/ads change, not on every render.
    if (!loading && randomAds.length > 0 && gridList.length > 0) {
      const adPositions: { ad: any; position: number }[] = [];
      for (let i = 0; i < randomAds.length; i++) {
        const position = Math.floor(Math.random() * (gridList.length + 1));
        adPositions.push({ ad: randomAds[i], position });
      }
      adPositions.sort((a, b) => b.position - a.position);
      adPositions.forEach(({ ad, position }) => {
        gridList.splice(position, 0, { ...ad, isAd: true });
      });
    }

    return {
      featuredGiveaway,
      gridActiveGiveaways,
      endedFilteredGiveaways,
      liveCount: activeFilteredGiveaways.length,
      gridList,
    };
  }, [activeGiveaways, searchQuery, filterBy, activeTab, randomAds, loading]);

  // Format an entries count like "3,400".
  const fmt = (n: number) => (n || 0).toLocaleString();

  // ---- Reusable card (matches approved mockup) ----
  const GiveawayCard = ({
    giveaway,
    index,
    ended,
  }: {
    giveaway: UIGiveaway;
    index: number;
    ended?: boolean;
  }) => {
    const isEntered = enteredGiveaways.includes(giveaway.id);
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={giveawaysInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: index * 0.06 }}
        style={{ opacity: ended ? 0.6 : 1, filter: ended ? "grayscale(1)" : "none" }}
        className="group card overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-all duration-200 hover:-translate-y-1 hover:border-[#f97316]/40"
      >
        <Link href={`/giveaway/${giveaway.id}`} className="block">
          {/* Image */}
          <div className="relative h-44">
            <Image
              src={giveaway.image || "/cat.jpg"}
              alt={giveaway.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            {/* Value chip (top-left) — only when a real value is set */}
            {giveaway.totalValue &&
              giveaway.totalValue !== "0" &&
              giveaway.totalValue !== "0.00" && (
                <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
                  {`${giveaway.currency_symbol || "$"}${giveaway.totalValue}`}{" "}
                  <span className="font-medium text-white/55">value</span>
                </span>
              )}
            {/* Live / Ended chip (top-right) */}
            {ended ? (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white/70 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white/40" /> Ended
              </span>
            ) : (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f97316]" /> Live
              </span>
            )}
          </div>

          {/* Body */}
          <div className="p-5">
            <h4 className="text-base font-bold leading-snug text-white line-clamp-1">
              {giveaway.title}
            </h4>
            {/* Host row */}
            <div className="mt-2 flex items-center gap-2 text-sm text-white/50">
              {giveaway.creatorImage ? (
                <span className="relative h-5 w-5 overflow-hidden rounded-full bg-white/10">
                  <Image
                    src={giveaway.creatorImage}
                    alt={giveaway.creator || "Host"}
                    fill
                    className="object-cover"
                    sizes="20px"
                  />
                </span>
              ) : (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[10px] font-bold text-white/80">
                  {giveaway.creator?.charAt(0).toUpperCase() || "U"}
                </span>
              )}
              <span className="truncate">{giveaway.creator || "Unknown"}</span>
            </div>
            {/* Meta row */}
            <div className="mt-4 flex items-center gap-4 border-t border-white/[0.06] pt-4 text-sm text-white/55">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {fmt(giveaway.entries)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> <Countdown endDate={giveaway.endDate} short />
              </span>
            </div>
          </div>
        </Link>
        {/* Action */}
        <div className="px-5 pb-5">
          {ended ? (
            <button
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-semibold text-white/55"
            >
              Ended
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                enterGiveaway(giveaway.id);
              }}
              disabled={isEntered}
              className={
                isEntered
                  ? "w-full cursor-default rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-2.5 text-sm font-semibold text-emerald-400"
                  : "btn w-full rounded-xl bg-[#f97316] py-2.5 text-sm font-semibold text-black transition-colors hover:bg-orange-400"
              }
            >
              {isEntered ? "Registered!" : "Enter Giveaway"}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  // ---- Skeleton card ----
  const SkeletonCard = ({ index }: { index: number }) => (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
      <div className="h-44 w-full animate-pulse bg-white/[0.04]" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.05]" />
        <div className="flex gap-4 border-t border-white/[0.06] pt-4">
          <div className="h-4 w-16 animate-pulse rounded bg-white/[0.05]" />
          <div className="h-4 w-20 animate-pulse rounded bg-white/[0.05]" />
        </div>
        <div className="h-9 w-full animate-pulse rounded-xl bg-white/[0.05]" />
      </div>
    </div>
  );

  return (
    <>
      <Navbar />
      <div
        className="min-h-screen text-white"
        style={{
          backgroundColor: "#0a0a0a",
          backgroundImage: `radial-gradient(circle at 50% 0%, rgba(249, 115, 22, 0.06) 0%, transparent 55%)`,
        }}
      >
        <SideAdsFrame>
        <main className="mx-auto w-full px-6 pb-24 pt-28">
          {/* HEADER */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
                {loading ? "Loading giveaways…" : `${liveCount} live giveaway${liveCount === 1 ? "" : "s"}`}
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                Giveaways
              </h1>
              <p className="mt-2 text-white/55">
                Enter to win premium assets, Maps, and full server packs — free.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 text-sm">
              <button
                onClick={() => setActiveTab("active")}
                className={
                  activeTab === "active"
                    ? "rounded-lg bg-white/10 px-4 py-1.5 font-semibold text-white"
                    : "rounded-lg px-4 py-1.5 text-white/50 hover:text-white"
                }
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab("ended")}
                className={
                  activeTab === "ended"
                    ? "rounded-lg bg-white/10 px-4 py-1.5 font-semibold text-white"
                    : "rounded-lg px-4 py-1.5 text-white/50 hover:text-white"
                }
              >
                Ended
              </button>
            </div>
          </div>

          {/* FEATURED (active tab only) */}
          {!loading && activeTab === "active" && featuredGiveaway && (
            <div className="card mb-12 grid overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-all duration-200 md:grid-cols-2">
              <Link
                href={`/giveaway/${featuredGiveaway.id}`}
                className="relative block min-h-[260px]"
              >
                <Image
                  src={featuredGiveaway.image || "/cat.jpg"}
                  alt={featuredGiveaway.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0a0a]/30 md:to-[#0a0a0a]" />
                <span className="absolute left-4 top-4 rounded-md bg-[#f97316] px-2.5 py-1 text-xs font-bold text-black">
                  FEATURED
                </span>
              </Link>
              <div className="flex flex-col justify-center gap-5 p-8 sm:p-10">
                <div>
                  <h2 className="text-2xl font-extrabold sm:text-3xl">
                    {featuredGiveaway.title}
                  </h2>
                  <p className="mt-2 text-white/55 line-clamp-2">
                    {featuredGiveaway.description}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                  {featuredGiveaway.totalValue &&
                    featuredGiveaway.totalValue !== "0" &&
                    featuredGiveaway.totalValue !== "0.00" && (
                      <>
                        <div>
                          <span className="text-2xl font-extrabold text-white">
                            {`${featuredGiveaway.currency_symbol || "$"}${featuredGiveaway.totalValue}`}
                          </span>{" "}
                          <span className="text-white/55">prize value</span>
                        </div>
                        <span className="h-4 w-px bg-white/10" />
                      </>
                    )}
                  <span className="flex items-center gap-1.5 text-white/60">
                    <Users className="h-4 w-4" /> {fmt(featuredGiveaway.entries)} entries
                  </span>
                  <span className="flex items-center gap-1.5 text-white/60">
                    <Clock className="h-4 w-4 text-[#f97316]" />{" "}
                    <Countdown endDate={featuredGiveaway.endDate} />
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => enterGiveaway(featuredGiveaway.id)}
                    disabled={enteredGiveaways.includes(featuredGiveaway.id)}
                    className={
                      enteredGiveaways.includes(featuredGiveaway.id)
                        ? "btn flex cursor-default items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-3 font-semibold text-emerald-400"
                        : "btn flex items-center gap-2 rounded-xl bg-[#f97316] px-6 py-3 font-semibold text-black transition-colors hover:bg-orange-400"
                    }
                  >
                    {enteredGiveaways.includes(featuredGiveaway.id)
                      ? "Registered!"
                      : "Enter Giveaway"}
                    {!enteredGiveaways.includes(featuredGiveaway.id) && (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </button>
                  <span className="text-sm text-white/55">
                    Hosted by {featuredGiveaway.creator || "FiveCrux"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* GRID HEADER */}
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {activeTab === "active" ? "All giveaways" : "Ended giveaways"}
            </h3>
            {!loading && (
              <span className="text-sm text-white/55">
                Showing {gridList.filter((it) => !("isAd" in it && it.isAd)).length}
              </span>
            )}
          </div>

          {/* GRID */}
          <motion.div
            ref={giveawaysRef}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            initial={{ opacity: 0 }}
            animate={giveawaysInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
          >
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={index} index={index} />
              ))
            ) : gridList.length === 0 ? (
              <div className="col-span-full">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
                  {activeTab === "active" ? (
                    <Gift className="mx-auto mb-4 h-14 w-14 text-white/25" />
                  ) : (
                    <Clock className="mx-auto mb-4 h-14 w-14 text-white/25" />
                  )}
                  <h3 className="mb-2 text-xl font-semibold text-white">
                    {activeTab === "active"
                      ? "No Giveaways Found"
                      : "No Ended Giveaways"}
                  </h3>
                  <p className="mb-6 text-white/55">
                    {searchQuery
                      ? `No giveaways match "${searchQuery}". Try adjusting your search.`
                      : activeTab === "active"
                      ? "There are currently no active giveaways. Check back soon!"
                      : "There are currently no ended giveaways."}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 hover:border-[#f97316]/50 hover:text-white"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              </div>
            ) : (
              gridList.map((item: GridItem, index) => {
                if ("isAd" in item && item.isAd) {
                  return (
                    <motion.div
                      key={`ad-${item.id}`}
                      initial={{ opacity: 0, y: 24 }}
                      animate={giveawaysInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: index * 0.06 }}
                      whileHover={{ y: -4 }}
                    >
                      <AdCard ad={item as any} variant="giveaway" />
                    </motion.div>
                  );
                }
                return (
                  <GiveawayCard
                    key={item.id}
                    giveaway={item as UIGiveaway}
                    index={index}
                    ended={activeTab === "ended"}
                  />
                );
              })
            )}
          </motion.div>
        </main>
        </SideAdsFrame>
      </div>
      <Footer />
    </>
  );
}
