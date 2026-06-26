"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import {
  Package,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Play,
  X,
  ShoppingCart,
  Star,
  ShieldCheck,
  Loader2,
  Zap,
  Check,
  Download,
  BadgeCheck,
  LifeBuoy,
  ArrowRight,
  Gift,
  MessageSquare,
  FileText,
  Tag,
} from "lucide-react";
import { Button } from "@/componentss/ui/button";
import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import { isVerifiedCreator } from "@/lib/utils";
import Link from "next/link";

interface Script {
  id: number;
  title: string;
  description: string;
  price: number;
  original_price?: number;
  currency?: string;
  currency_symbol?: string;
  category: string;
  framework?: string[];
  seller_name: string;
  seller_email: string;
  seller_id?: string;
  seller_image?: string;
  seller_roles?: string[] | null;
  features: string[];
  requirements: string[];
  link?: string;
  youtube_video_link?: string;
  other_links?: string[];
  images: string[];
  videos: string[];
  screenshots: string[];
  cover_image?: string;
  version: string;
  last_updated: string;
  status: "pending" | "approved" | "rejected";
  featured: boolean;
  free?: boolean;
  hidePrice?: boolean;
  downloads: number;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  // Tebex Model B (per-seller checkout). Nullable until the seller links their store.
  tebexStoreToken?: string | null;
  tebexPackageId?: string | null;
}

type MediaItem = {
  type: "image" | "video" | "youtube";
  url: string;
  youtubeId?: string;
};

const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

// Build the unified, de-duplicated media list (cover first).
function buildMedia(
  images: string[],
  screenshots: string[],
  videos: string[],
  coverImage?: string,
  youtubeVideoLink?: string
): MediaItem[] {
  let allMedia: MediaItem[] = [
    ...images.map((url) => ({ type: "image" as const, url })),
    ...screenshots.map((url) => ({ type: "image" as const, url })),
    ...videos.map((url) => ({ type: "video" as const, url })),
  ];

  if (youtubeVideoLink) {
    const youtubeId = getYouTubeVideoId(youtubeVideoLink);
    if (youtubeId) {
      allMedia.push({ type: "youtube", url: youtubeVideoLink, youtubeId });
    }
  }

  if (coverImage) {
    allMedia = allMedia.filter((media) => media.url !== coverImage);
    allMedia = [{ type: "image" as const, url: coverImage }, ...allMedia];
  }

  return allMedia;
}

// Renders a single media item (image / video / youtube) to fill its container.
function MediaView({ item, title, className = "", sizes }: { item: MediaItem; title: string; className?: string; sizes?: string }) {
  if (item.type === "youtube" && item.youtubeId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${item.youtubeId}?rel=0&modestbranding=1`}
        className={`h-full w-full bg-black ${className}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={`${title} - video`}
      />
    );
  }
  if (item.type === "video") {
    return <video src={item.url} controls preload="metadata" className={`h-full w-full bg-black object-contain ${className}`} />;
  }
  return <Image src={item.url} alt={title} fill sizes={sizes || "100vw"} className={`object-cover ${className}`} />;
}

export function ScriptDetailClient({
  initialData,
  id,
}: {
  initialData: Script | null;
  id: string;
}) {
  const params = useParams();
  const router = useRouter();
  const scriptId = (id ?? (params.id as string)) as string;

  const [script, setScript] = useState<Script | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [otherScripts, setOtherScripts] = useState<any[]>([]);
  const [loadingOtherScripts, setLoadingOtherScripts] = useState(true);
  const [buying, setBuying] = useState(false);
  const [activeMedia, setActiveMedia] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (initialData) return;
    const fetchScript = async () => {
      try {
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(`/api/scripts/${scriptId}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          setError(response.status === 404 ? "Script not found" : "Failed to load script");
          return;
        }
        const data = await response.json();
        if (!data || data.error) {
          setError("Script not found");
          return;
        }
        setScript(data);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") console.error("Error fetching script:", err);
        setError("Failed to load script");
      } finally {
        setLoading(false);
      }
    };
    if (scriptId) fetchScript();
  }, [scriptId]);

  // Fetch other scripts (excluding current one) for the "More from seller" row.
  useEffect(() => {
    const fetchOtherScripts = async () => {
      try {
        setLoadingOtherScripts(true);
        const response = await fetch(`/api/scripts?limit=8`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to fetch other scripts");
        const data = await response.json();
        const filteredScripts = (data.scripts || [])
          .filter((s: any) => s.id !== Number(scriptId))
          .slice(0, 8)
          .map((s: any) => {
            const image = s.cover_image || (s.images && s.images[0]) || (s.screenshots && s.screenshots[0]) || undefined;
            return {
              id: s.id,
              title: s.title,
              price: s.price,
              originalPrice: s.original_price,
              free: s.free || s.price === 0,
              rating: s.rating,
              seller: s.seller_name || "Unknown",
              sellerImage: s.seller_image,
              coverImage: image,
              framework: Array.isArray(s.framework) ? s.framework : s.framework ? [s.framework] : [],
              href: `/script/${s.id}`,
            };
          });
        setOtherScripts(filteredScripts);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") console.error("Error fetching other scripts:", err);
        setOtherScripts([]);
      } finally {
        setLoadingOtherScripts(false);
      }
    };
    if (scriptId) fetchOtherScripts();
  }, [scriptId]);

  // Primary buy handler: Tebex Model B when available, else existing link behavior.
  const handleBuy = async () => {
    if (!script) return;
    if (script.tebexPackageId && script.tebexStoreToken) {
      try {
        setBuying(true);
        const res = await fetch("/api/tebex/basket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeToken: script.tebexStoreToken, packageId: script.tebexPackageId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.checkoutUrl) throw new Error(data?.error || "Failed to start checkout");
        window.location.href = data.checkoutUrl;
      } catch (err) {
        console.error("Tebex checkout error:", err);
        toast.error("Could not start checkout. Please try again.");
        setBuying(false);
      }
      return;
    }
    if (script.link) {
      window.open(script.link, "_blank", "noopener,noreferrer");
      return;
    }
    toast.error("No purchase option is available for this product yet.");
  };

  const media = useMemo(
    () =>
      script
        ? buildMedia(script.images || [], script.screenshots || [], script.videos || [], script.cover_image, script.youtube_video_link)
        : [],
    [script]
  );

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen text-white flex items-center justify-center bg-[#0a0a0a]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500" />
        </div>
      </>
    );
  }

  if (error || !script) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen text-white flex items-center justify-center bg-[#0a0a0a]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Script Not Found</h1>
            <p className="text-gray-400 mb-6">{error || "The script you're looking for doesn't exist."}</p>
            <Button onClick={() => router.push("/scripts")} className="bg-orange-500 hover:bg-orange-600">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Scripts
            </Button>
          </div>
        </div>
      </>
    );
  }

  const isFree = script.free || script.price === 0;
  const discount = script.original_price
    ? Math.round(((script.original_price - script.price) / script.original_price) * 100)
    : 0;
  const verified = isVerifiedCreator(script.seller_roles);
  const currency = script.currency_symbol || "$";
  const canBuy = !!((script.tebexPackageId && script.tebexStoreToken) || script.link);
  const sellerInitial = script.seller_name ? script.seller_name.charAt(0).toUpperCase() : "?";
  const categoryLabel = script.category || "Script";
  const hasFeatures = script.features && script.features.length > 0;
  const hasRequirements = script.requirements && script.requirements.length > 0;
  const extLinks = (script.other_links || []).filter(Boolean);
  const active = media[activeMedia] ?? media[0];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] text-white antialiased [font-variant-numeric:tabular-nums]">
        <div className="mx-auto max-w-[1200px] px-5 pb-24 pt-20">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 py-5 text-[13px] text-white/55">
            <Link href="/scripts" className="transition hover:text-white/70">Marketplace</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/scripts" className="transition hover:text-white/70">Scripts</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate text-white/60">{script.title}</span>
          </nav>

          {/* Tworst/Piko grid: media + details (left), title + buy card (right) */}
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_380px]">
            {/* LEFT — media + details */}
            <div className="min-w-0">
              {/* Media frame */}
              {media.length > 0 ? (
                <>
                  <div className="overflow-hidden rounded-[20px] border border-white/[0.07]">
                    <button
                      type="button"
                      onClick={() => setIsFullscreen(true)}
                      className="group relative block h-[300px] w-full sm:h-[400px]"
                    >
                      <MediaView item={active} title={script.title} sizes="(max-width:1024px) 100vw, 760px" className="transition duration-700 group-hover:scale-[1.03]" />
                      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                      <span className="absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/85 ring-1 ring-white/10 backdrop-blur-md">
                        {categoryLabel}
                      </span>
                    </button>
                  </div>
                  {/* Thumbnails */}
                  {media.length > 1 && (
                    <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {media.map((m, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveMedia(i)}
                          className={`relative h-[52px] w-20 flex-shrink-0 overflow-hidden rounded-lg border transition ${
                            i === activeMedia ? "border-orange-500 opacity-100" : "border-white/[0.08] opacity-50 hover:opacity-100"
                          }`}
                        >
                          {m.type === "youtube" ? (
                            <span className="flex h-full w-full items-center justify-center bg-white/[0.04] text-red-400">
                              <Play className="h-4 w-4 fill-current" />
                            </span>
                          ) : m.type === "video" ? (
                            <span className="flex h-full w-full items-center justify-center bg-white/[0.04] text-white/60">
                              <Play className="h-4 w-4" />
                            </span>
                          ) : (
                            <Image src={m.url} alt="" fill sizes="80px" className="object-cover" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-[300px] items-center justify-center rounded-[20px] border border-white/[0.07] bg-white/[0.03] sm:h-[400px]">
                  <Package className="h-16 w-16 text-gray-600" />
                </div>
              )}

              {/* Details */}
              <section className="mt-8">
                <h3 className="text-lg font-bold">Details</h3>
                {hasFeatures && (
                  <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {script.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm leading-snug text-white/65">
                        <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg bg-orange-500/12 text-orange-500">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
                {script.description && (
                  <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-white/55">{script.description}</p>
                )}
              </section>

              {/* Requirements */}
              {hasRequirements && (
                <section className="mt-8">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Requirements</h3>
                  <ul className="mt-3 divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                    {script.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-center gap-3 px-4 py-3 text-sm text-white/75">
                        <Check className="h-4 w-4 flex-none text-emerald-400" />
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* RIGHT — title + buy card (sticky) */}
            <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:h-fit">
              <h1 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-[30px]">{script.title}</h1>

              {/* Seller + rating line */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/55">
                <span className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[10px] font-black text-black">
                    {sellerInitial}
                  </span>
                  {script.seller_name}
                  {verified && <BadgeCheck className="h-4 w-4 text-orange-500" />}
                </span>
                {typeof script.rating === "number" && script.rating > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-white">{script.rating.toFixed(1)}</span>
                    {script.review_count > 0 && <span>({script.review_count})</span>}
                  </span>
                )}
                {script.downloads > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Download className="h-4 w-4" /> {script.downloads.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {script.framework?.map((fw, idx) => (
                  <span key={idx} className="rounded-full border border-white/[0.1] bg-white/[0.06] px-3.5 py-1 text-[11px] font-bold text-white/55">
                    {fw}
                  </span>
                ))}
                {isFree && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-bold text-emerald-400">
                    FREE
                  </span>
                )}
              </div>

              {/* Buy card — orange clip-path price header + CTA + perks */}
              <div className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.02]">
                <div
                  className="relative bg-gradient-to-br from-orange-500 to-orange-600 px-6 pb-9 pt-5"
                  style={{ clipPath: "polygon(0 0,100% 0,100% 74%,0 100%)" }}
                >
                  {!script.hidePrice && !isFree && script.original_price && discount > 0 && (
                    <span className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-orange-600">
                      −{discount}%
                    </span>
                  )}
                  <small className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/85">
                    {script.hidePrice ? "Premium resource" : isFree ? "Free download" : "One-time purchase"}
                  </small>
                  <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[40px] font-black leading-none tracking-tight text-white">
                    {script.hidePrice ? (
                      <span className="text-[26px]">See price on seller store</span>
                    ) : isFree ? (
                      "Free"
                    ) : (
                      <>
                        {currency}
                        {script.price}
                        {script.original_price && (
                          <del className="text-[17px] font-normal text-white/60">
                            {currency}
                            {script.original_price}
                          </del>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="-mt-3 flex flex-col gap-4 px-6 pb-6">
                  <div className="flex items-center gap-2.5">
                    <Button
                      onClick={handleBuy}
                      disabled={!canBuy || buying}
                      className="group flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 font-bold text-white shadow-[0_4px_20px_rgba(249,115,22,0.3)] transition hover:from-orange-400 hover:to-orange-500 disabled:opacity-50"
                    >
                      {buying ? (
                        <>
                          <Loader2 className="h-[18px] w-[18px] animate-spin" /> Processing…
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-[18px] w-[18px]" />
                          {isFree ? "Get it Free" : "Buy Now"}
                        </>
                      )}
                    </Button>
                    {script.link && (
                      <a
                        href={script.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Seller store"
                        className="grid h-[52px] w-[52px] flex-none place-items-center rounded-full border border-white/[0.13] text-white/45 transition hover:border-orange-500/40 hover:text-white"
                      >
                        <Gift className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5 text-[13.5px] text-white/70">
                      <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg bg-orange-500/12 text-orange-500"><Zap className="h-3.5 w-3.5" /></span>
                      Instant access right after checkout
                    </div>
                    <div className="flex items-center gap-2.5 text-[13.5px] text-white/70">
                      <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg bg-orange-500/12 text-orange-500"><ShieldCheck className="h-3.5 w-3.5" /></span>
                      Secure checkout on the seller store
                    </div>
                    <div className="flex items-center gap-2.5 text-[13.5px] text-white/70">
                      <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg bg-orange-500/12 text-orange-500"><LifeBuoy className="h-3.5 w-3.5" /></span>
                      Updates &amp; support from the seller
                    </div>
                  </div>
                  {!canBuy && (
                    <p className="flex items-center justify-center gap-1.5 text-[12px] text-white/55">
                      <AlertCircle className="h-3.5 w-3.5" /> No purchase link available yet
                    </p>
                  )}
                </div>
              </div>

              {/* Bulk discounts — points buyers to the seller for multi-license pricing */}
              {script.link && (
                <div className="flex flex-col gap-2 rounded-xl border border-orange-500/12 bg-orange-500/[0.04] p-4">
                  <div className="flex items-center gap-2 text-[13px] font-bold">
                    <Tag className="h-4 w-4 text-orange-500" /> BULK DISCOUNTS
                  </div>
                  <p className="text-xs leading-relaxed text-white/40">
                    Buying multiple? Contact the seller for multi-license pricing.
                  </p>
                  <a
                    href={script.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-black/20 px-3 text-xs font-semibold text-white/55 transition hover:text-white"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Contact the seller
                  </a>
                </div>
              )}

              {/* External links */}
              {(script.youtube_video_link || extLinks.length > 0) && (
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/45">Links</div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {script.youtube_video_link && (
                      <a href={script.youtube_video_link} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/15">
                        <Play className="h-3.5 w-3.5" /> YouTube
                      </a>
                    )}
                    {extLinks.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.05] px-3.5 text-xs font-semibold text-white/55 transition hover:text-white">
                        <FileText className="h-3.5 w-3.5" /> Link {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Seller store link */}
              {script.seller_id && (
                <Link href={`/seller/${script.seller_id}`} className="block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 text-center text-sm font-semibold transition hover:bg-white/[0.08]">
                  View seller store
                </Link>
              )}
            </aside>
          </div>

          {/* Related: More from seller */}
          <section className="mt-16">
            <div className="flex items-end justify-between">
              <h2 className="text-lg font-extrabold tracking-tight">More from {script.seller_name}</h2>
              <Link href="/scripts" className="flex items-center gap-1 text-sm font-semibold text-white/50 transition hover:text-white">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {loadingOtherScripts ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e0e0e]">
                    <div className="h-36 animate-pulse bg-white/[0.06]" />
                    <div className="space-y-2 p-4">
                      <div className="h-4 animate-pulse rounded bg-white/[0.06]" />
                      <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : otherScripts.length > 0 ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {otherScripts.slice(0, 6).map((p) => (
                  <Link key={p.id} href={p.href} className="group overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e0e0e] transition hover:border-white/[0.14]">
                    <div className="relative h-36 overflow-hidden">
                      {p.coverImage ? (
                        <Image src={p.coverImage} alt={p.title} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/[0.04]">
                          <Package className="h-10 w-10 text-white/15" />
                        </div>
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-white/10 backdrop-blur-md">
                        {(p.framework && p.framework[0]) || "Script"}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="truncate text-sm font-semibold">{p.title}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-base font-bold">{p.free || p.price === 0 ? "Free" : `$${Number(p.price).toFixed(2)}`}</span>
                        {typeof p.rating === "number" && p.rating > 0 && (
                          <span className="flex items-center gap-1 text-xs text-white/55">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {p.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[20px] border border-white/[0.07] bg-white/[0.02] py-12 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-gray-500" />
                <p className="text-gray-400">No other scripts available at the moment.</p>
              </div>
            )}

            <div className="mt-10 text-center">
              <Link href="/scripts" className="inline-flex items-center gap-2 font-semibold text-orange-400 transition hover:text-orange-300">
                Browse all scripts <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Fullscreen media lightbox */}
      {isFullscreen && active && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setIsFullscreen(false)}>
          <button type="button" onClick={() => setIsFullscreen(false)} className="absolute right-4 top-4 z-10 rounded-full bg-black/80 p-3 text-white transition-colors hover:bg-orange-500">
            <X className="h-6 w-6" />
          </button>
          <div className="relative flex h-full max-h-[90vh] w-full max-w-7xl items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {active.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.url} alt={script.title} className="max-h-[90vh] max-w-full object-contain" />
            ) : (
              <div className="aspect-video w-full max-w-5xl">
                <MediaView item={active} title={script.title} sizes="90vw" />
              </div>
            )}
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}
