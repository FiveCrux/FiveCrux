"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import {
  Package,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  ArrowLeft,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
  Maximize2,
  Download,
  ShoppingCart,
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
import { isVerifiedCreator } from "@/lib/utils";
import Loading from "./loading";
import Link from "next/link";
import Image from "next/image";

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
  images: string[];
  videos: string[];
  screenshots: string[];
  cover_image?: string;
  version: string;
  last_updated: string;
  status: "pending" | "approved" | "rejected";
  featured: boolean;
  downloads: number;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

// Xbox-Themed Media Carousel with Minimal Animations
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
  const thumbnailRef = useRef<HTMLDivElement>(null);

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    
    // Match various YouTube URL formats
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

  // Check if a media item is a YouTube video
  const isYouTubeVideo = (media: string): boolean => {
    return media === youtubeVideoLink && !!youtubeVideoLink;
  };

  // Create media items array with YouTube video as special type
  type MediaItem = {
    type: 'image' | 'video' | 'youtube';
    url: string;
    youtubeId?: string;
  };

  let allMedia: MediaItem[] = [
    ...images.map(url => ({ type: 'image' as const, url })),
    ...screenshots.map(url => ({ type: 'image' as const, url })),
    ...videos.map(url => ({ type: 'video' as const, url })),
  ];

  // Add YouTube video if present
  if (youtubeVideoLink) {
    const youtubeId = getYouTubeVideoId(youtubeVideoLink);
    if (youtubeId) {
      allMedia.push({ type: 'youtube', url: youtubeVideoLink, youtubeId });
    }
  }

  // Handle cover image
  if (coverImage) {
    allMedia = allMedia.filter((media) => media.url !== coverImage);
    allMedia = [{ type: 'image' as const, url: coverImage }, ...allMedia];
  }

  if (allMedia.length === 0) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % allMedia.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
  };

  const isVideo = (media: MediaItem) => media.type === 'video';

  const MediaContent = ({
    media,
    index,
    className = "",
  }: {
    media: MediaItem;
    index: number;
    className?: string;
  }) => {
    if (media.type === 'youtube' && media.youtubeId) {
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
        className={`w-full h-full object-contain bg-black ${className}`}
        loading="lazy"
      />
    );
  };

  return (
    <>
      {/* Main Carousel */}
      <div className="lg:sticky lg:top-24">
        <div className="relative bg-transparent rounded-lg overflow-hidden">
          {/* Main Display */}
          <div className="relative aspect-video">
            <div className="absolute inset-0">
              <MediaContent
                media={allMedia[currentIndex]}
                index={currentIndex}
              />
            </div>

            {/* Navigation Arrows */}
            {allMedia.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-orange-500 text-white p-3 rounded transition-colors z-10"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-orange-500 text-white p-3 rounded transition-colors z-10"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-4 right-4 bg-black/80 hover:bg-orange-500 text-white p-2 rounded transition-colors z-10"
            >
              <Maximize2 className="h-5 w-5" />
            </button>

            {/* Counter */}
            <div className="absolute bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded text-sm font-semibold">
              {currentIndex + 1} / {allMedia.length}
            </div>
          </div>

          {/* Thumbnail Navigation */}
          {allMedia.length > 1 && (
            <div className="p-4 bg-transparent ">
              <div
                ref={thumbnailRef}
                className="thumbnail-scrollbar flex gap-3 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing select-none"
                style={{
                  scrollbarWidth: "none",
                }}
                onMouseDown={(e) => {
                  if (!thumbnailRef.current) return;
                  setIsDragging(true);
                  setStartX(e.pageX - thumbnailRef.current.offsetLeft);
                  setScrollLeft(thumbnailRef.current.scrollLeft);
                }}
                onMouseLeave={() => {
                  setIsDragging(false);
                }}
                onMouseUp={() => {
                  setIsDragging(false);
                }}
                onMouseMove={(e) => {
                  if (!isDragging || !thumbnailRef.current) return;
                  e.preventDefault();
                  const x = e.pageX - thumbnailRef.current.offsetLeft;
                  const walk = (x - startX) * 2; // Scroll speed multiplier
                  thumbnailRef.current.scrollLeft = scrollLeft - walk;
                }}
              >
                {allMedia.map((media, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      // Prevent click when dragging
                      if (isDragging) {
                        e.preventDefault();
                        return;
                      }
                      setCurrentIndex(index);
                    }}
                    onMouseDown={(e) => {
                      // Allow dragging to work
                      if (e.button === 0) {
                        e.preventDefault();
                      }
                    }}
                    className={`flex-shrink-0 w-24 h-16 rounded overflow-hidden border-2 transition-colors ${
                      index === currentIndex
                        ? "border-orange-500"
                        : "border-neutral-700 hover:border-orange-500/50"
                    } ${isDragging ? "pointer-events-none" : ""}`}
                  >
                    {media.type === 'youtube' ? (
                      <div className="relative w-full h-full bg-red-600 flex items-center justify-center">
                        <Play className="h-5 w-5 text-white" />
                        <div className="absolute top-0.5 right-0.5">
                          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        </div>
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
            className="absolute top-4 right-4 bg-black/80 hover:bg-orange-500 text-white p-3 rounded transition-colors z-10"
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
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-orange-500 text-white p-4 rounded transition-colors z-10"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-orange-500 text-white p-4 rounded transition-colors z-10"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded text-sm font-semibold">
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

  useEffect(() => {
    const fetchScript = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/scripts/${scriptId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Script not found");
          } else {
            setError("Failed to load script");
          }
          return;
        }

        const data = await response.json();
        setScript(data);
      } catch (err) {
        setError("Failed to load script");
        console.error("Error fetching script:", err);
      } finally {
        setLoading(false);
      }
    };

    if (scriptId) {
      fetchScript();
    }
  }, [scriptId]);

  // Fetch other scripts (excluding current one)
  useEffect(() => {
    const fetchOtherScripts = async () => {
      try {
        setLoadingOtherScripts(true);
        const response = await fetch(`/api/scripts?limit=8`, { cache: "no-store" });
        
        if (!response.ok) {
          console.error("Failed to fetch other scripts");
          return;
        }

        const data = await response.json();
        // Filter out current script and map to UI format
        const filteredScripts = (data.scripts || [])
          .filter((s: any) => s.id !== Number(scriptId))
          .slice(0, 6)
          .map((s: any) => {
            const image =
              s.cover_image ||
              (s.images && s.images[0]) ||
              (s.screenshots && s.screenshots[0]) ||
              "/placeholder.jpg";
            
            return {
              id: s.id,
              title: s.title,
              description: s.description,
              price: s.price,
              currency_symbol: s.currency_symbol || "$",
              image: image,
              seller: s.seller_name || "Unknown",
              seller_roles: s.seller_roles,
              framework: Array.isArray(s.framework) ? s.framework : (s.framework ? [s.framework] : []),
            };
          });
        
        setOtherScripts(filteredScripts);
      } catch (err) {
        console.error("Error fetching other scripts:", err);
      } finally {
        setLoadingOtherScripts(false);
      }
    };

    if (scriptId) {
      fetchOtherScripts();
    }
  }, [scriptId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
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
  
  const hasMedia = allMedia.length > 0 || script.youtube_video_link;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .thumbnail-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .thumbnail-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `,
        }}
      />
      <Navbar />
      <div className="min-h-screen text-white ">
        {/* Hero Section with Background Image */}
        <div
          className="relative text-white"
          style={{
            backgroundImage: `${
              script.cover_image ? `url(${script.cover_image})` : "none"
            }`,
            backgroundSize: "cover",
            backgroundPosition: "center 80%",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Overlay to reduce background image opacity */}
          <div className="absolute inset-0 bg-[#131313] pointer-events-none" />

          {/* Gradient fade from middle to bottom - completely dark */}
          <div className="absolute inset-x-0 top-[15%] bottom-0 bg-[#131313] pointer-events-none z-[1]" />

          {/* Content */}
          <div className="relative z-10">
            {/* Back Button */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-4">
              <Button
                onClick={() => router.push("/scripts")}
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-neutral-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Scripts
              </Button>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left Column - Media Carousel */}
                <div className="lg:col-span-3">
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
                    <div className="aspect-video bg-black rounded-lg flex items-center justify-center border border-orange-500/30">
                      <Package className="h-16 w-16 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Right Column - Information */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Header & Badges */}
                  <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 font-semibold px-3 py-1">
                        {script.category}
                      </Badge>
                  <div>
                    <h1 className="text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
                      {script.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      
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
                    </div>
                    <p className="text-gray-300 text-lg leading-relaxed mb-6">
                      {script.description}
                    </p>

                  
                  </div>

                  {/* Pricing Card */}
                  <Card className="bg-transparent border-none">
                    <CardContent className="p-6 space-y-6">
                      {/* Price Section */}
                      <div className="space-y-3">
                        <div className="flex items-end gap-3 flex-wrap">
                          {script.original_price && (
                            <span className="text-xl text-gray-500 line-through font-medium">
                              {script.currency_symbol || "$"}{script.original_price}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-4xl font-black text-white leading-none">
                              {script.currency_symbol || "$"}{script.price}
                            </span>
                            {script.original_price && (
                              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-lg">
                                -{discount}% OFF
                              </Badge>
                            )}
                          </div>
                        </div>
                        {script.original_price && (
                          <p className="text-sm text-gray-400">
                            Save {script.currency_symbol || "$"}{(script.original_price - script.price).toFixed(2)}
                          </p>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />

                      {/* Button Section */}
                      <div className="space-y-3">
                        <Button
                          className="w-full bg:white text-black hover:bg-gray-300 hover:border-gray-300 hover:text-black font-bold py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg"
                          onClick={() => {
                            if (script.link) {
                              window.open(
                                script.link,
                                "_blank",
                                "noopener,noreferrer"
                              );
                            }
                          }}
                          disabled={!script.link}
                        >
                          <ShoppingCart className="mr-2 h-5 w-5" />
                          Buy Now
                        </Button>
                        {!script.link && (
                          <div className="text-center py-2">
                            <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              No purchase link available
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                    {/* Seller Card */}
                    <Card className="bg-neutral-800 border border-neutral-700 mb-6">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-14 w-14 ring-2 ring-orange-500/40">
                            <AvatarImage
                              src={
                                script.seller_image || "/placeholder-user.jpg"
                              }
                            />
                            <AvatarFallback className="bg-orange-500 text-white font-bold text-lg">
                              {script.seller_name ? script.seller_name[0] : "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-white font-bold text-lg">
                                {script.seller_name}
                              </h3>
                              {isVerifiedCreator(script.seller_roles) && (
                                <VerifiedIcon size="md" />
                              )}
                            </div>
                            {isVerifiedCreator(script.seller_roles) && (
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                                  Verified Creator
                                </span>
                              </div>
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

        {/* Tabs Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="mt-8">
            <Card className="bg-neutral-800 border border-neutral-700">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-neutral-900 p-0 h-auto gap-0">
                  <TabsTrigger
                    value="details"
                    className="data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-neutral-900 text-white py-3 px-4 font-medium transition-colors"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="features"
                    className="data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-neutral-900 text-white py-3 px-4 font-medium transition-colors"
                  >
                    Features
                  </TabsTrigger>
                  <TabsTrigger
                    value="requirements"
                    className="data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-neutral-900 text-white py-3 px-4 font-medium transition-colors"
                  >
                    Requirements
                  </TabsTrigger>
                  <TabsTrigger
                    value="support"
                    className="data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-neutral-900 text-white py-3 px-4 font-medium transition-colors"
                  >
                    Support
                  </TabsTrigger>
                </TabsList>

                {/* Script Details Tab */}
                <TabsContent value="details" className="mt-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-6 w-6 rounded bg-orange-500 flex items-center justify-center">
                        <Info className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-white text-xl font-bold">
                        Script Details
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-neutral-900 rounded">
                        <span className="text-gray-400 font-medium">
                          Version
                        </span>
                        <span className="text-white font-bold">
                          {script.version}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-neutral-900 rounded">
                        <span className="text-gray-400 font-medium">
                          Last Updated
                        </span>
                        <span className="text-white font-bold">
                          {new Date(script.last_updated).toLocaleDateString()}
                        </span>
                      </div>
                      {script.framework && (
                        <div className="flex justify-between items-center p-3 bg-neutral-900 rounded">
                          <span className="text-gray-400 font-medium">
                            Framework
                          </span>
                          <span className="text-white font-bold">
                            {Array.isArray(script.framework)
                              ? script.framework.join(", ")
                              : script.framework}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center p-3 bg-neutral-900 rounded">
                        <span className="text-gray-400 font-medium">
                          Downloads
                        </span>
                        <span className="text-white font-bold">
                          {script.downloads || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-neutral-900 rounded">
                        <span className="text-gray-400 font-medium">
                          Rating
                        </span>
                        <span className="text-white font-bold flex items-center gap-1">
                          {script.rating > 0
                            ? `${script.rating.toFixed(1)} ⭐`
                            : "No ratings yet"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>

                {/* Features Tab */}
                <TabsContent value="features" className="mt-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Package className="h-6 w-6 text-orange-500" />
                      <h3 className="text-white text-xl font-bold">
                        Features & Capabilities
                      </h3>
                    </div>
                    {script.features && script.features.length > 0 ? (
                      <div className="space-y-3">
                        {script.features.map((feature, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-4 rounded bg-neutral-900 border border-neutral-700"
                          >
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300 leading-relaxed">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No features listed.</p>
                    )}
                  </CardContent>
                </TabsContent>

                {/* Requirements Tab */}
                <TabsContent value="requirements" className="mt-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <AlertCircle className="h-6 w-6 text-orange-500" />
                      <h3 className="text-white text-xl font-bold">
                        System Requirements
                      </h3>
                    </div>
                    {script.requirements && script.requirements.length > 0 ? (
                      <div className="space-y-3">
                        {script.requirements.map((requirement, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-4 rounded bg-neutral-900 border border-neutral-700"
                          >
                            <Package className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            <span className="text-gray-300 leading-relaxed">
                              {requirement}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No requirements listed.</p>
                    )}
                  </CardContent>
                </TabsContent>

                {/* Support Tab */}
                <TabsContent value="support" className="mt-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Info className="h-6 w-6 text-orange-500" />
                      <h3 className="text-white text-xl font-bold">
                        Support & Documentation
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 p-4 rounded bg-neutral-900 border border-neutral-700">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="text-white font-semibold mb-1">
                            Documentation
                          </h4>
                          <p className="text-sm text-gray-400">
                            Complete setup and usage guide
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 rounded bg-neutral-900 border border-neutral-700">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="text-white font-semibold mb-1">
                            Installation Help
                          </h4>
                          <p className="text-sm text-gray-400">
                            Step-by-step installation
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>

        {/* More Scripts Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">More Scripts</h2>
            <p className="text-gray-400">Discover other premium FiveM scripts</p>
          </div>

          {loadingOtherScripts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-neutral-900 border-2 border-neutral-700/50 h-full">
                  <CardHeader className="p-0">
                    <div className="w-full h-52 bg-neutral-800 animate-pulse" />
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    <div className="h-4 bg-neutral-800 rounded animate-pulse" />
                    <div className="h-4 bg-neutral-800 rounded w-2/3 animate-pulse" />
                    <div className="h-3 bg-neutral-800 rounded w-1/2 animate-pulse" />
                    <div className="h-6 bg-neutral-800 rounded w-1/3 animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : otherScripts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherScripts.map((otherScript) => (
                <motion.div
                  key={otherScript.id}
                  className="group"
                  whileHover={{ y: -5, scale: 1.02 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Link href={`/script/${otherScript.id}`}>
                    <Card className="bg-neutral-900 border-2 border-neutral-700/50 hover:border-orange-500 cursor-pointer h-full backdrop-blur-sm relative overflow-hidden shadow-2xl rounded-lg transition-all duration-300 flex flex-col">
                      {/* Image Section */}
                      <CardHeader className="p-0 overflow-hidden rounded-t-lg">
                        <Image
                          src={otherScript.image || "/placeholder.jpg"}
                          alt={otherScript.title}
                          width={400}
                          height={256}
                          className="object-cover w-full h-52"
                        />
                      </CardHeader>

                      {/* Content Section */}
                      <div className="flex flex-col flex-1">
                        <CardContent className="p-3 flex-1 space-y-2">
                          {/* Title */}
                          <CardTitle className="text-base font-bold text-white leading-tight line-clamp-2">
                            {otherScript.title}
                          </CardTitle>

                          {/* Framework Badges */}
                          {otherScript.framework &&
                            otherScript.framework.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {otherScript.framework.map((fw: string, idx: number) => (
                                  <Badge
                                    key={idx}
                                    className="bg-neutral-800/95 text-white backdrop-blur-sm text-[10px] font-bold border border-neutral-600/50 rounded px-1.5 py-0.5 uppercase tracking-wide shadow-lg"
                                  >
                                    <span className="mr-1 text-xs">•</span>
                                    {fw}
                                  </Badge>
                                ))}
                              </div>
                            )}

                          {/* Description */}
                          <CardDescription className="text-white text-xs leading-snug line-clamp-2 flex items-center gap-1.5">
                            <span>By {otherScript.seller}</span>
                            {isVerifiedCreator(otherScript.seller_roles) && (
                              <VerifiedIcon size="sm" />
                            )}
                          </CardDescription>

                          {/* Price */}
                          <CardDescription className="text-orange-500 text-xl font-bold pt-1">
                            {otherScript.currency_symbol || "$"}
                            {otherScript.price}
                          </CardDescription>
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
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No other scripts available at the moment.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
