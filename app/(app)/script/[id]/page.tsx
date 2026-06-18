"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Package,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
  Maximize2,
  ShoppingCart,
  MessageCircle,
  BookOpen,
  Github,
  Globe,
  HelpCircle,
  Star,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/componentss/ui/button";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/componentss/ui/tabs";
import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import { VerifiedIcon } from "@/componentss/shared/verified-icon";
import { ProductCard } from "@/componentss/marketplace/product-card";
import { isVerifiedCreator } from "@/lib/utils";
import { MARKETPLACE_SEED } from "@/lib/marketplace-seed";
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

// TODO: remove before production — build a Script shape from a MARKETPLACE_SEED
// item so the detail page renders against the demo seed when the DB is empty.
function scriptFromSeed(id: number): Script | null {
  const seed = MARKETPLACE_SEED.find((s) => Number(s.id) === id);
  if (!seed) return null;
  return {
    id: Number(seed.id),
    title: seed.title,
    description:
      "A premium FiveM resource handpicked for the FiveCrux marketplace. Fully optimized, regularly updated and ready to drop into your server.",
    price: seed.price,
    original_price: seed.originalPrice,
    currency_symbol: "$",
    category: seed.category,
    framework: seed.framework || [],
    seller_name: seed.seller || "Unknown",
    seller_email: "",
    seller_image: seed.sellerImage,
    seller_roles: null,
    features: [
      "Clean, optimized source code",
      "Easy drag-and-drop installation",
      "Fully configurable",
      "Regular updates & support",
    ],
    requirements: ["FiveM server", ...(seed.framework || [])],
    images: seed.coverImage ? [seed.coverImage] : [],
    videos: [],
    screenshots: [],
    cover_image: seed.coverImage,
    version: "1.0.0",
    last_updated: new Date().toISOString(),
    status: "approved",
    featured: seed.tag === "FEATURED",
    free: seed.free || seed.price === 0,
    downloads: 0,
    rating: seed.rating ?? 0,
    review_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tebexStoreToken: null,
    tebexPackageId: null,
  };
}

// Media Carousel with swipe / fullscreen support.
const MediaCarousel = ({
  images,
  screenshots,
  videos,
  title,
  coverImage,
  youtubeVideoLink,
}: {
  images: string[];
  screenshots: string[];
  videos: string[];
  title: string;
  coverImage?: string;
  youtubeVideoLink?: string;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragDistance, setDragDistance] = useState(0);
  const [isMainDragging, setIsMainDragging] = useState(false);
  const [mainStartX, setMainStartX] = useState(0);
  const [mainDragDistance, setMainDragDistance] = useState(0);
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const mainImageRef = useRef<HTMLDivElement>(null);

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

  type MediaItem = {
    type: "image" | "video" | "youtube";
    url: string;
    youtubeId?: string;
  };

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

  if (allMedia.length === 0) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % allMedia.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
  };

  const isVideo = (media: MediaItem) => media.type === "video";

  const MediaContent = ({
    media,
    index,
    className = "",
  }: {
    media: MediaItem;
    index: number;
    className?: string;
  }) => {
    if (media.type === "youtube" && media.youtubeId) {
      return (
        <div className={`w-full h-full bg-black ${className}`}>
          <iframe
            src={`https://www.youtube.com/embed/${media.youtubeId}?rel=0&modestbranding=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`${title} - YouTube Video`}
          />
        </div>
      );
    }

    if (isVideo(media)) {
      return (
        <video
          src={media.url}
          controls
          preload="metadata"
          className={`w-full h-full object-contain bg-black ${className}`}
        />
      );
    }

    return (
      <img
        src={media.url}
        alt={`${title} - Media ${index + 1}`}
        className={`w-full h-full object-cover bg-black ${className}`}
        loading="lazy"
      />
    );
  };

  return (
    <>
      {/* Main Carousel */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
        <div className="relative bg-transparent overflow-hidden">
          {/* Main Display */}
          <div
            ref={mainImageRef}
            className="relative aspect-video"
            onMouseDown={(e) => {
              if (allMedia.length <= 1) return;
              setIsMainDragging(true);
              setMainDragDistance(0);
              setMainStartX(e.pageX);
            }}
            onMouseUp={() => {
              if (isMainDragging && Math.abs(mainDragDistance) > 50) {
                if (mainDragDistance < 0) {
                  nextSlide();
                } else {
                  prevSlide();
                }
              }
              setIsMainDragging(false);
              setMainDragDistance(0);
            }}
            onMouseLeave={() => {
              setIsMainDragging(false);
              setMainDragDistance(0);
            }}
            onMouseMove={(e) => {
              if (!isMainDragging) return;
              const distance = e.pageX - mainStartX;
              setMainDragDistance(distance);
            }}
            onTouchStart={(e) => {
              if (allMedia.length <= 1) return;
              setIsMainDragging(true);
              setMainDragDistance(0);
              setMainStartX(e.touches[0].pageX);
            }}
            onTouchEnd={() => {
              if (isMainDragging && Math.abs(mainDragDistance) > 50) {
                if (mainDragDistance < 0) {
                  nextSlide();
                } else {
                  prevSlide();
                }
              }
              setIsMainDragging(false);
              setMainDragDistance(0);
            }}
            onTouchMove={(e) => {
              if (!isMainDragging) return;
              const distance = e.touches[0].pageX - mainStartX;
              setMainDragDistance(distance);
            }}
          >
            <div className="absolute inset-0">
              <MediaContent media={allMedia[currentIndex]} index={currentIndex} />
            </div>

            {/* Navigation Arrows */}
            {allMedia.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-orange-500 text-white p-3 rounded-full transition-colors z-10"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-orange-500 text-white p-3 rounded-full transition-colors z-10"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-4 right-4 bg-black/70 hover:bg-orange-500 text-white p-2 rounded-full transition-colors z-10"
            >
              <Maximize2 className="h-5 w-5" />
            </button>

            {/* Counter */}
            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-semibold">
              {currentIndex + 1} / {allMedia.length}
            </div>
          </div>

          {/* Thumbnail Navigation */}
          {allMedia.length > 1 && (
            <div className="p-4 bg-transparent">
              <div
                ref={thumbnailRef}
                className="thumbnail-scrollbar flex gap-3 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing select-none"
                style={{ scrollbarWidth: "none" }}
                onMouseDown={(e) => {
                  if (!thumbnailRef.current) return;
                  setIsDragging(true);
                  setDragDistance(0);
                  setStartX(e.pageX - thumbnailRef.current.offsetLeft);
                  setScrollLeft(thumbnailRef.current.scrollLeft);
                }}
                onMouseLeave={() => {
                  setIsDragging(false);
                  setDragDistance(0);
                }}
                onMouseUp={() => {
                  setIsDragging(false);
                  setDragDistance(0);
                }}
                onMouseMove={(e) => {
                  if (!isDragging || !thumbnailRef.current) return;
                  e.preventDefault();
                  const x = e.pageX - thumbnailRef.current.offsetLeft;
                  const walk = (x - startX) * 2;
                  const distance = Math.abs(x - startX);
                  setDragDistance(distance);
                  thumbnailRef.current.scrollLeft = scrollLeft - walk;
                }}
                onTouchStart={(e) => {
                  if (!thumbnailRef.current) return;
                  setIsDragging(true);
                  setDragDistance(0);
                  setStartX(e.touches[0].pageX - thumbnailRef.current.offsetLeft);
                  setScrollLeft(thumbnailRef.current.scrollLeft);
                }}
                onTouchEnd={() => {
                  setIsDragging(false);
                  setDragDistance(0);
                }}
                onTouchMove={(e) => {
                  if (!isDragging || !thumbnailRef.current) return;
                  e.preventDefault();
                  const x = e.touches[0].pageX - thumbnailRef.current.offsetLeft;
                  const walk = (x - startX) * 2;
                  const distance = Math.abs(x - startX);
                  setDragDistance(distance);
                  thumbnailRef.current.scrollLeft = scrollLeft - walk;
                }}
              >
                {allMedia.map((media, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      if (dragDistance > 5) {
                        e.preventDefault();
                        return;
                      }
                      setCurrentIndex(index);
                    }}
                    className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === currentIndex
                        ? "border-orange-500"
                        : "border-white/10 hover:border-orange-500/50"
                    }`}
                  >
                    {media.type === "youtube" ? (
                      <div className="relative w-full h-full bg-red-600 flex items-center justify-center">
                        <Play className="h-5 w-5 text-white" />
                      </div>
                    ) : isVideo(media) ? (
                      <div className="relative w-full h-full bg-neutral-800 flex items-center justify-center">
                        <Play className="h-5 w-5 text-orange-500" />
                      </div>
                    ) : (
                      <img
                        src={media.url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 bg-black/80 hover:bg-orange-500 text-white p-3 rounded-full transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {allMedia.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-orange-500 text-white p-4 rounded-full transition-colors z-10"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-orange-500 text-white p-4 rounded-full transition-colors z-10"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full text-sm font-semibold">
            {currentIndex + 1} / {allMedia.length}
          </div>

          <div
            className="w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-7xl max-h-full">
              <MediaContent
                media={allMedia[currentIndex]}
                index={currentIndex}
                className="max-h-[90vh]"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default function ScriptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scriptId = params.id as string;

  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otherScripts, setOtherScripts] = useState<any[]>([]);
  const [loadingOtherScripts, setLoadingOtherScripts] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    const fetchScript = async () => {
      try {
        setLoading(true);
        // Abort a hanging/slow request (e.g. DB unreachable) after 8s so the page
        // falls back to the seed/error state instead of spinning forever.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(`/api/scripts/${scriptId}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          // TODO: remove before production — fall back to demo seed when the DB
          // has no matching script (e.g. empty dev database / 404).
          const seeded = scriptFromSeed(Number(scriptId));
          if (seeded) {
            setScript(seeded);
            setError(null);
            return;
          }
          if (response.status === 404) {
            setError("Script not found");
          } else {
            setError("Failed to load script");
          }
          return;
        }

        const data = await response.json();
        // TODO: remove before production — guard against an empty/null payload.
        if (!data || (data && data.error)) {
          const seeded = scriptFromSeed(Number(scriptId));
          if (seeded) {
            setScript(seeded);
            return;
          }
        }
        setScript(data);
      } catch (err) {
        console.error("Error fetching script:", err);
        // TODO: remove before production — seed fallback on network/parse error.
        const seeded = scriptFromSeed(Number(scriptId));
        if (seeded) {
          setScript(seeded);
          setError(null);
        } else {
          setError("Failed to load script");
        }
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
        console.error("Error fetching other scripts:", err);
        // TODO: remove before production — seed fallback for related section.
        const seeded = MARKETPLACE_SEED.filter(
          (s) => Number(s.id) !== Number(scriptId)
        )
          .slice(0, 8)
          .map((s) => ({
            id: s.id,
            title: s.title,
            price: s.price,
            originalPrice: s.originalPrice,
            free: s.free || s.price === 0,
            rating: s.rating,
            seller: s.seller,
            sellerImage: s.sellerImage,
            coverImage: s.coverImage,
            framework: s.framework || [],
            href: `/script/${s.id}`,
          }));
        setOtherScripts(seeded);
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

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500" />
        </div>
      </>
    );
  }

  if (error || !script) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen text-white flex items-center justify-center">
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
  const allMedia = [
    ...(script.images || []),
    ...(script.videos || []),
    ...(script.screenshots || []),
  ];
  const hasMedia = allMedia.length > 0 || !!script.youtube_video_link;
  const verified = isVerifiedCreator(script.seller_roles);
  const currency = script.currency_symbol || "$";
  const canBuy = !!(
    (script.tebexPackageId && script.tebexStoreToken) ||
    script.link
  );

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .thumbnail-scrollbar::-webkit-scrollbar { display: none; }
        .thumbnail-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
      <Navbar />
      <div className="min-h-screen text-white bg-[#0a0a0a]">
        {/* Ambient hero glow built from the cover image */}
        <div className="relative">
          {script.cover_image && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[480px] opacity-30 blur-2xl"
              style={{
                backgroundImage: `url(${script.cover_image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-[#0a0a0a]/40 via-[#0a0a0a]/80 to-[#0a0a0a]" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
            {/* Back Button */}
            <Button
              onClick={() => router.push("/scripts")}
              variant="ghost"
              className="mb-6 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Scripts
            </Button>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left Column - Media + Title */}
              <div className="lg:col-span-2 space-y-6">
                {hasMedia ? (
                  <MediaCarousel
                    images={script.images || []}
                    screenshots={script.screenshots || []}
                    videos={script.videos || []}
                    title={script.title}
                    coverImage={script.cover_image}
                    youtubeVideoLink={script.youtube_video_link}
                  />
                ) : (
                  <div className="aspect-video bg-white/[0.04] rounded-2xl flex items-center justify-center border border-white/[0.08]">
                    <Package className="h-16 w-16 text-gray-600" />
                  </div>
                )}

                {/* Title block */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/30 font-semibold px-3 py-1 capitalize">
                      {script.category}
                    </Badge>
                    {script.framework &&
                      script.framework.map((fw, idx) => (
                        <Badge
                          key={idx}
                          className="bg-white/10 text-white border border-white/15 text-[10px] font-bold rounded px-2 py-0.5 uppercase tracking-wide hover:bg-white/10"
                        >
                          {fw}
                        </Badge>
                      ))}
                  </div>
                  <h1 className="text-3xl lg:text-5xl font-black text-white mb-4 leading-tight">
                    {script.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {typeof script.rating === "number" && script.rating > 0 && (
                      <span className="flex items-center gap-1.5 font-semibold text-yellow-400">
                        <Star className="h-4 w-4 fill-yellow-400" />
                        {script.rating.toFixed(1)}
                        {script.review_count > 0 && (
                          <span className="text-gray-500 font-normal">
                            ({script.review_count} reviews)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description card */}
                <Card className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-md rounded-2xl">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-white mb-3">
                      About this product
                    </h2>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                      {script.description}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Sticky purchase panel */}
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-24 space-y-4">
                  {/* Purchase Card */}
                  <Card className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-md rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
                    <CardContent className="p-6 space-y-5">
                      {/* Price */}
                      <div className="space-y-2">
                        {isFree ? (
                          <span className="text-4xl font-black text-green-400 leading-none">
                            Free
                          </span>
                        ) : (
                          <>
                            <div className="flex items-end gap-3 flex-wrap">
                              {script.original_price && (
                                <span className="text-xl text-gray-500 line-through font-medium">
                                  {currency}
                                  {script.original_price}
                                </span>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-4xl font-black text-white leading-none">
                                  {currency}
                                  {script.price}
                                </span>
                                {script.original_price && discount > 0 && (
                                  <Badge className="bg-gradient-to-r from-orange-500 to-yellow-400 text-black px-2.5 py-1 rounded-md text-xs font-bold">
                                    -{discount}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {script.original_price && (
                              <p className="text-sm text-gray-400">
                                Save {currency}
                                {(script.original_price - script.price).toFixed(2)}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      <div className="h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />

                      {/* Buy Button */}
                      <Button
                        onClick={handleBuy}
                        disabled={!canBuy || buying}
                        className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-black hover:from-orange-400 hover:to-yellow-300 font-bold py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl disabled:opacity-50"
                      >
                        {buying ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="mr-2 h-5 w-5" />
                            {isFree ? "Get it Free" : "Buy Now"}
                          </>
                        )}
                      </Button>

                      {!canBuy && (
                        <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          No purchase link available
                        </p>
                      )}

                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <ShieldCheck className="h-4 w-4 text-green-500" />
                        Secure checkout
                      </div>
                    </CardContent>
                  </Card>

                  {/* Seller Card */}
                  <Card className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-md rounded-2xl">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 ring-2 ring-orange-500/40">
                          <AvatarImage
                            src={script.seller_image || "/placeholder-user.jpg"}
                          />
                          <AvatarFallback className="bg-orange-500 text-white font-bold text-lg">
                            {script.seller_name ? script.seller_name[0] : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-bold text-lg truncate">
                              {script.seller_name}
                            </h3>
                            {verified && <VerifiedIcon size="md" />}
                          </div>
                          {verified && (
                            <span className="flex items-center gap-1 text-sm text-gray-400">
                              <span className="w-2 h-2 bg-green-500 rounded-full" />
                              Verified Creator
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section - Features / Requirements / Support */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <Card className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-md rounded-2xl overflow-hidden">
            {(() => {
              const hasFeatures = script.features && script.features.length > 0;
              const hasRequirements =
                script.requirements && script.requirements.length > 0;
              const hasSupport =
                script.other_links && script.other_links.length > 0;

              const visibleTabsCount =
                (hasFeatures ? 1 : 0) +
                (hasRequirements ? 1 : 0) +
                (hasSupport ? 1 : 0);

              if (visibleTabsCount === 0) return null;

              const gridClassMap: Record<number, string> = {
                1: "grid-cols-1",
                2: "grid-cols-2",
                3: "grid-cols-3",
              };
              const gridClass = gridClassMap[visibleTabsCount] || "grid-cols-1";

              const defaultTab = hasFeatures
                ? "features"
                : hasRequirements
                ? "requirements"
                : "Other Links";

              return (
                <Tabs
                  key={`tabs-${visibleTabsCount}`}
                  defaultValue={defaultTab}
                  className="w-full"
                >
                  <TabsList
                    className={`grid w-full ${gridClass} bg-white/[0.03] p-0 h-auto gap-0`}
                  >
                    {hasFeatures && (
                      <TabsTrigger
                        value="features"
                        className="data-[state=active]:bg-orange-500 data-[state=active]:text-black text-white py-3 px-4 font-medium transition-colors"
                      >
                        Features
                      </TabsTrigger>
                    )}
                    {hasRequirements && (
                      <TabsTrigger
                        value="requirements"
                        className="data-[state=active]:bg-orange-500 data-[state=active]:text-black text-white py-3 px-4 font-medium transition-colors"
                      >
                        Requirements
                      </TabsTrigger>
                    )}
                    {hasSupport && (
                      <TabsTrigger
                        value="Other Links"
                        className="data-[state=active]:bg-orange-500 data-[state=active]:text-black text-white py-3 px-4 font-medium transition-colors"
                      >
                        Support
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {hasFeatures && (
                    <TabsContent value="features" className="mt-0">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                          <Package className="h-6 w-6 text-orange-500" />
                          <h3 className="text-white text-xl font-bold">
                            Features &amp; Capabilities
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {script.features.map((feature, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]"
                            >
                              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-300 leading-relaxed">
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </TabsContent>
                  )}

                  {hasRequirements && (
                    <TabsContent value="requirements" className="mt-0">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                          <AlertCircle className="h-6 w-6 text-orange-500" />
                          <h3 className="text-white text-xl font-bold">
                            System Requirements
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {script.requirements.map((requirement, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]"
                            >
                              <Package className="h-5 w-5 text-blue-500 flex-shrink-0" />
                              <span className="text-gray-300 leading-relaxed">
                                {requirement}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </TabsContent>
                  )}

                  {hasSupport && (
                    <TabsContent value="Other Links" className="mt-0">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                          <Info className="h-6 w-6 text-orange-500" />
                          <h3 className="text-white text-xl font-bold">
                            Other Links
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {script.other_links!.map((link, index) => {
                            const getLinkInfo = (url: string) => {
                              const lowerUrl = url.toLowerCase();
                              let domain = "";
                              try {
                                const urlObj = new URL(
                                  url.startsWith("http") ? url : `https://${url}`
                                );
                                domain = urlObj.hostname.replace("www.", "");
                              } catch {
                                domain = lowerUrl;
                              }

                              if (
                                domain.includes("discord") ||
                                lowerUrl.includes("discord.gg")
                              )
                                return { label: "Discord", icon: MessageCircle };
                              if (
                                domain.includes("youtube") ||
                                domain.includes("youtu.be")
                              )
                                return { label: "YouTube", icon: Play };
                              if (domain.includes("github"))
                                return { label: "GitHub", icon: Github };
                              if (
                                domain.includes("docs") ||
                                domain.includes("documentation") ||
                                domain.includes("wiki")
                              )
                                return { label: "Documentation", icon: BookOpen };
                              if (
                                domain.includes("support") ||
                                domain.includes("help")
                              )
                                return { label: "Support", icon: HelpCircle };

                              const cleaned = domain.split(".")[0];
                              return {
                                label:
                                  cleaned.charAt(0).toUpperCase() +
                                    cleaned.slice(1) || "External Link",
                                icon: Globe,
                              };
                            };

                            const linkInfo = getLinkInfo(link);
                            const IconComponent = linkInfo.icon;

                            return (
                              <motion.a
                                key={index}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-orange-500/40 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer group"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                              >
                                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                                  <IconComponent className="h-6 w-6 text-orange-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-white font-semibold mb-1 group-hover:text-orange-400 transition-colors">
                                    {linkInfo.label}
                                  </h4>
                                  <p className="text-sm text-gray-400 truncate">
                                    {link
                                      .replace(/^https?:\/\//, "")
                                      .replace(/^www\./, "")}
                                  </p>
                                </div>
                                <ExternalLink className="h-5 w-5 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </motion.a>
                            );
                          })}
                        </div>
                      </CardContent>
                    </TabsContent>
                  )}
                </Tabs>
              );
            })()}
          </Card>
        </div>

        {/* More Scripts Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              More Scripts
            </h2>
            <p className="text-gray-400">Discover other premium FiveM scripts</p>
          </div>

          {loadingOtherScripts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.04] overflow-hidden"
                >
                  <div className="h-36 bg-white/[0.06] animate-pulse" />
                  <div className="p-3.5 space-y-2">
                    <div className="h-4 bg-white/[0.06] rounded animate-pulse" />
                    <div className="h-4 bg-white/[0.06] rounded w-2/3 animate-pulse" />
                    <div className="h-6 bg-white/[0.06] rounded w-1/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : otherScripts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
              {otherScripts.map((p) => (
                <ProductCard key={p.id} product={p} className="w-full max-w-[320px]" />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">
                No other scripts available at the moment.
              </p>
            </div>
          )}

          {/* Browse-all link preserved for navigation */}
          <div className="mt-10 text-center">
            <Link
              href="/scripts"
              className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-semibold"
            >
              Browse all scripts
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
