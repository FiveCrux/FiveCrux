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
  Images,
  BadgeCheck,
  LifeBuoy,
  ArrowRight,
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

// Build the unified, de-duplicated media list (cover first), reusing the exact
// ordering rules from the previous carousel implementation.
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

// Gallery-first bento hero. The large lead tile shows the active media item;
// the two smaller tiles and the thumbnail strip switch the active item.
const BentoGallery = ({
  media,
  title,
  categoryLabel,
}: {
  media: MediaItem[];
  title: string;
  categoryLabel: string;
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const active = media[activeIndex] ?? media[0];
  // Small bento tiles: the next two items after the lead (falls back to start).
  const small1 = media.length > 1 ? media[1] : null;
  const small2 = media.length > 2 ? media[2] : null;
  const extraCount = Math.max(0, media.length - 3);

  const Media = ({
    item,
    className = "",
    sizes,
  }: {
    item: MediaItem;
    className?: string;
    sizes?: string;
  }) => {
    if (item.type === "youtube" && item.youtubeId) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${item.youtubeId}?rel=0&modestbranding=1`}
          className={`h-full w-full bg-black ${className}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={`${title} - YouTube Video`}
        />
      );
    }
    if (item.type === "video") {
      return (
        <video
          src={item.url}
          controls
          preload="metadata"
          className={`h-full w-full bg-black object-contain ${className}`}
        />
      );
    }
    return (
      <Image
        src={item.url}
        alt={title}
        fill
        sizes={sizes || "100vw"}
        className={`object-cover ${className}`}
      />
    );
  };

  return (
    <>
      {/* Bento grid */}
      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-4 sm:grid-rows-2 sm:h-[440px]">
        {/* large lead */}
        <figure className={`group relative col-span-1 row-span-2 overflow-hidden rounded-[22px] border border-white/[0.07] ${small1 ? "sm:col-span-2 lg:col-span-3" : "sm:col-span-4"}`}>
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="block h-[280px] w-full sm:h-full"
          >
            <span className="relative block h-[280px] w-full sm:h-full">
              <Media
                item={active}
                sizes="(max-width: 1024px) 100vw, 75vw"
                className="transition duration-700 group-hover:scale-[1.03]"
              />
            </span>
            <span className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-transparent" />
            <span className="absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/85 ring-1 ring-white/10 backdrop-blur-md">
              {categoryLabel}
            </span>
          </button>
        </figure>

        {/* small 1 */}
        {small1 && (
          <figure className="group relative hidden overflow-hidden rounded-[22px] border border-white/[0.07] sm:block">
            <button
              type="button"
              onClick={() => setActiveIndex(1)}
              className="block h-full min-h-[140px] w-full"
            >
              <span className="relative block h-full min-h-[140px] w-full">
                <Media
                  item={small1}
                  sizes="25vw"
                  className="transition duration-700 group-hover:scale-[1.04]"
                />
              </span>
            </button>
          </figure>
        )}

        {/* small 2 */}
        {small2 && (
          <figure className="group relative hidden overflow-hidden rounded-[22px] border border-white/[0.07] sm:block">
            <button
              type="button"
              onClick={() => setActiveIndex(2)}
              className="block h-full min-h-[140px] w-full"
            >
              <span className="relative block h-full min-h-[140px] w-full">
                <Media
                  item={small2}
                  sizes="25vw"
                  className="transition duration-700 group-hover:scale-[1.04]"
                />
              </span>
              {extraCount > 0 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-100 transition group-hover:bg-black/65">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    <Images className="h-4 w-4" /> +{extraCount} more
                  </span>
                </span>
              )}
            </button>
          </figure>
        )}
      </section>

      {/* thumbnail strip */}
      {media.length > 1 && (
        <div
          className="mt-2.5 flex gap-2.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {media.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative h-16 w-28 flex-none overflow-hidden rounded-xl border object-cover transition ${
                index === activeIndex
                  ? "border-orange-500 opacity-100 ring-2 ring-orange-500/60"
                  : "border-white/[0.07] opacity-80 hover:opacity-100"
              }`}
            >
              {item.type === "youtube" ? (
                <span className="flex h-full w-full items-center justify-center bg-red-600">
                  <Play className="h-5 w-5 text-white" />
                </span>
              ) : item.type === "video" ? (
                <span className="flex h-full w-full items-center justify-center bg-neutral-800">
                  <Play className="h-5 w-5 text-orange-500" />
                </span>
              ) : (
                <Image
                  src={item.url}
                  alt={`${title} thumbnail ${index + 1}`}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute right-4 top-4 z-10 rounded-full bg-black/80 p-3 text-white transition-colors hover:bg-orange-500"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="relative flex h-full max-h-[90vh] w-full max-w-7xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {active.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.url}
                alt={title}
                className="max-h-[90vh] max-w-full object-contain"
              />
            ) : (
              <div className="aspect-video w-full max-w-5xl">
                <Media item={active} sizes="90vw" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

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
  // When server already seeded the item there's nothing to wait for — skip the spinner.
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [otherScripts, setOtherScripts] = useState<any[]>([]);
  const [loadingOtherScripts, setLoadingOtherScripts] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    // Server already provided the item (ISR) — skip the redundant initial fetch.
    if (initialData) {
      return;
    }
    const fetchScript = async () => {
      try {
        setLoading(true);
        // Abort a hanging/slow request (e.g. DB unreachable) after 8s so the page
        // falls back to the seed/error state instead of spinning forever.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(`/api/scripts/${scriptId}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Script not found");
          } else {
            setError("Failed to load script");
          }
          return;
        }

        const data = await response.json();
        if (!data || data.error) {
          setError("Script not found");
          return;
        }
        setScript(data);
      } catch (err) {
        // An aborted request (our own timeout) is expected — surface a load error.
        if ((err as any)?.name !== "AbortError") {
          console.error("Error fetching script:", err);
        }
        setError("Failed to load script");
      } finally {
        setLoading(false);
      }
    };

    if (scriptId) {
      fetchScript();
    }
  }, [scriptId]);

  // Fetch other scripts (excluding current one) for the "More Scripts" section.
  useEffect(() => {
    const fetchOtherScripts = async () => {
      try {
        setLoadingOtherScripts(true);
        const response = await fetch(`/api/scripts?limit=8`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch other scripts");
        }

        const data = await response.json();
        const filteredScripts = (data.scripts || [])
          .filter((s: any) => s.id !== Number(scriptId))
          .slice(0, 8)
          .map((s: any) => {
            const image =
              s.cover_image ||
              (s.images && s.images[0]) ||
              (s.screenshots && s.screenshots[0]) ||
              undefined;

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
              framework: Array.isArray(s.framework)
                ? s.framework
                : s.framework
                ? [s.framework]
                : [],
              href: `/script/${s.id}`,
            };
          });

        setOtherScripts(filteredScripts);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") console.error("Error fetching other scripts:", err);
        // No fallback — leave related empty so the section shows its own empty state.
        setOtherScripts([]);
      } finally {
        setLoadingOtherScripts(false);
      }
    };

    if (scriptId) {
      fetchOtherScripts();
    }
  }, [scriptId]);

  // Primary buy handler: Tebex Model B when available, else existing link behavior.
  const handleBuy = async () => {
    if (!script) return;

    // Tebex path: per-seller hosted checkout.
    if (script.tebexPackageId && script.tebexStoreToken) {
      try {
        setBuying(true);
        const res = await fetch("/api/tebex/basket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeToken: script.tebexStoreToken,
            packageId: script.tebexPackageId,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.checkoutUrl) {
          throw new Error(data?.error || "Failed to start checkout");
        }

        // Redirect the browser to the Tebex hosted checkout.
        window.location.href = data.checkoutUrl;
      } catch (err) {
        console.error("Tebex checkout error:", err);
        toast.error("Could not start checkout. Please try again.");
        setBuying(false);
      }
      return;
    }

    // Fallback: existing behavior — open the external purchase link if present.
    if (script.link) {
      window.open(script.link, "_blank", "noopener,noreferrer");
      return;
    }

    toast.error("No purchase option is available for this product yet.");
  };

  // Unified media list for the bento gallery — must be declared before any
  // early return to satisfy the rules of hooks (script may still be null).
  const media = useMemo(
    () =>
      script
        ? buildMedia(
            script.images || [],
            script.screenshots || [],
            script.videos || [],
            script.cover_image,
            script.youtube_video_link
          )
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
            <p className="text-gray-400 mb-6">
              {error || "The script you're looking for doesn't exist."}
            </p>
            <Button
              onClick={() => router.push("/scripts")}
              className="bg-orange-500 hover:bg-orange-600"
            >
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
    ? Math.round(
        ((script.original_price - script.price) / script.original_price) * 100
      )
    : 0;
  const verified = isVerifiedCreator(script.seller_roles);
  const currency = script.currency_symbol || "$";
  const canBuy = !!(
    (script.tebexPackageId && script.tebexStoreToken) ||
    script.link
  );
  const sellerInitial = script.seller_name
    ? script.seller_name.charAt(0).toUpperCase()
    : "?";
  const categoryLabel = script.category || "Script";
  const hasFeatures = script.features && script.features.length > 0;
  const hasRequirements = script.requirements && script.requirements.length > 0;
  const lastUpdated = script.last_updated
    ? new Date(script.last_updated).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] text-white antialiased [font-variant-numeric:tabular-nums]">
        <div className="mx-auto max-w-[1240px] px-5 pb-24 pt-20">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 py-5 text-[13px] text-white/55">
            <Link href="/scripts" className="transition hover:text-white/70">
              Marketplace
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/scripts" className="transition hover:text-white/70">
              Scripts
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate text-white/60">{script.title}</span>
          </nav>

          {/* Bento gallery hero */}
          {media.length > 0 ? (
            <BentoGallery
              media={media}
              title={script.title}
              categoryLabel={categoryLabel}
            />
          ) : (
            <div className="flex aspect-[21/9] items-center justify-center rounded-[22px] border border-white/[0.07] bg-white/[0.03]">
              <Package className="h-16 w-16 text-gray-600" />
            </div>
          )}

          {/* Title + meta + price/CTA bar */}
          <section className="mt-6 flex flex-col gap-6 rounded-[24px] border border-white/[0.07] bg-[#0e0e0e] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] lg:flex-row lg:items-center lg:gap-8 lg:p-7">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                  {categoryLabel}
                </span>
                {script.framework &&
                  script.framework.map((fw, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-300 ring-1 ring-sky-500/20"
                    >
                      {fw}
                    </span>
                  ))}
              </div>
              <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">
                {script.title}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="flex items-center gap-2 text-white/55">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[10px] font-black text-black">
                    {sellerInitial}
                  </span>
                  {script.seller_name}
                  {verified && <BadgeCheck className="h-4 w-4 text-orange-500" />}
                </span>
                {typeof script.rating === "number" && script.rating > 0 && (
                  <span className="flex items-center gap-1.5 text-white/55">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-white">
                      {script.rating.toFixed(1)}
                    </span>
                    {script.review_count > 0 && (
                      <span className="text-white/55">
                        ({script.review_count} reviews)
                      </span>
                    )}
                  </span>
                )}
                {script.downloads > 0 && (
                  <span className="flex items-center gap-1.5 text-white/55">
                    <Download className="h-4 w-4" />
                    <span>{script.downloads.toLocaleString()}</span> downloads
                  </span>
                )}
              </div>
            </div>

            {/* price + cta */}
            <div className="lg:w-[320px] lg:flex-none lg:border-l lg:border-white/[0.07] lg:pl-8">
              <div className="flex items-end gap-3">
                {isFree ? (
                  <span className="text-[38px] font-extrabold leading-none tracking-tight text-green-400">
                    Free
                  </span>
                ) : (
                  <>
                    <span className="text-[38px] font-extrabold leading-none tracking-tight">
                      {currency}
                      {script.price}
                    </span>
                    {script.original_price && (
                      <span className="mb-1 text-base text-white/55 line-through">
                        {currency}
                        {script.original_price}
                      </span>
                    )}
                    {script.original_price && discount > 0 && (
                      <span className="mb-1 rounded-md bg-emerald-500/12 px-2 py-0.5 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/25">
                        −{discount}%
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                <Button
                  onClick={handleBuy}
                  disabled={!canBuy || buying}
                  className="group flex h-auto w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                >
                  {buying ? (
                    <>
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-[18px] w-[18px]" />
                      {isFree ? "Get it Free" : "Buy Now"}
                    </>
                  )}
                </Button>
              </div>
              {canBuy ? (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-white/55">
                  <ShieldCheck className="h-3.5 w-3.5" /> Redirects to the seller store
                </p>
              ) : (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-white/55">
                  <AlertCircle className="h-3.5 w-3.5" /> No purchase link
                  available
                </p>
              )}
            </div>
          </section>

          {/* Body: content + seller */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
            {/* LEFT: content */}
            <div className="min-w-0">
              {/* Overview */}
              <section>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
                  Overview
                </h2>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-white/65">
                  {script.description}
                </p>
              </section>

              {/* Features */}
              {hasFeatures && (
                <section className="mt-9">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
                    Features
                  </h2>
                  <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {script.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                      >
                        <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg bg-orange-500/12 text-orange-500">
                          <Check className="h-4 w-4" />
                        </span>
                        <div className="text-sm font-semibold leading-snug text-white/85">
                          {feature}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Requirements */}
              {hasRequirements && (
                <section className="mt-9">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
                    Requirements
                  </h2>
                  <ul className="mt-4 divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                    {script.requirements.map((requirement, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-white/75"
                      >
                        <Check className="h-4 w-4 flex-none text-emerald-400" />
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* meta strip */}
              <section className="mt-9 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="border-r border-white/[0.05] p-4 text-center">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                    Version
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    v{script.version}
                  </div>
                </div>
                <div className="border-r border-white/[0.05] p-4 text-center">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                    Updated
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {lastUpdated || "—"}
                  </div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                    Downloads
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {script.downloads > 0
                      ? script.downloads.toLocaleString()
                      : "—"}
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT: seller card */}
            <aside className="lg:sticky lg:top-24 lg:h-fit">
              <div className="rounded-[22px] border border-white/[0.07] bg-[#0e0e0e] p-5">
                <div className="flex items-center gap-3">
                  {script.seller_image ? (
                    <span className="relative h-12 w-12 overflow-hidden rounded-2xl ring-2 ring-orange-500/40">
                      <Image
                        src={script.seller_image}
                        alt={script.seller_name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </span>
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-lg font-black text-black">
                      {sellerInitial}
                    </span>
                  )}
                  <div className="leading-tight">
                    <div className="flex items-center gap-1.5 font-semibold">
                      {script.seller_name}
                      {verified && (
                        <BadgeCheck className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    <div className="text-xs text-white/55">
                      {verified ? "Verified seller" : "Seller"}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white/[0.03] py-2.5">
                    <div className="text-sm font-bold">
                      {typeof script.rating === "number" && script.rating > 0
                        ? script.rating.toFixed(1)
                        : "—"}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-white/55">
                      Rating
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] py-2.5">
                    <div className="text-sm font-bold">
                      {script.review_count > 0 ? script.review_count : "—"}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-white/55">
                      Reviews
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] py-2.5">
                    <div className="text-sm font-bold">
                      {script.downloads > 0
                        ? script.downloads.toLocaleString()
                        : "—"}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-white/55">
                      Sales
                    </div>
                  </div>
                </div>
                {script.seller_id && (
                  <Link
                    href={`/seller/${script.seller_id}`}
                    className="mt-4 block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 text-center text-sm font-semibold transition hover:bg-white/[0.08]"
                  >
                    View store
                  </Link>
                )}
              </div>

              <div className="mt-4 rounded-[22px] border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <LifeBuoy className="h-4 w-4 text-orange-500" /> Support
                  included
                </div>
                <p className="mt-1.5 text-[13px] leading-snug text-white/55">
                  Active Discord, documentation and free updates from the seller.
                </p>
              </div>
            </aside>
          </div>

          {/* Related: More from seller */}
          <section className="mt-14">
            <div className="flex items-end justify-between">
              <h2 className="text-lg font-extrabold tracking-tight">
                More from {script.seller_name}
              </h2>
              <Link
                href="/scripts"
                className="flex items-center gap-1 text-sm font-semibold text-white/50 transition hover:text-white"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {loadingOtherScripts ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e0e0e]"
                  >
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
                  <Link
                    key={p.id}
                    href={p.href}
                    className="group overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e0e0e] transition hover:border-white/[0.14]"
                  >
                    <div className="relative h-36 overflow-hidden">
                      {p.coverImage ? (
                        <Image
                          src={p.coverImage}
                          alt={p.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 33vw"
                          className="object-cover transition duration-700 group-hover:scale-105"
                        />
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
                      <div className="truncate text-sm font-semibold">
                        {p.title}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-base font-bold">
                          {p.free || p.price === 0
                            ? "Free"
                            : `$${Number(p.price).toFixed(2)}`}
                        </span>
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
                <p className="text-gray-400">
                  No other scripts available at the moment.
                </p>
              </div>
            )}

            {/* Browse-all link preserved for navigation */}
            <div className="mt-10 text-center">
              <Link
                href="/scripts"
                className="inline-flex items-center gap-2 font-semibold text-orange-400 transition hover:text-orange-300"
              >
                Browse all scripts
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
