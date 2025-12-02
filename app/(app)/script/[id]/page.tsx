"use client";

import { useState, useEffect } from "react";
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
  CardHeader,
  CardTitle,
} from "@/componentss/ui/card";
import { Badge } from "@/componentss/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/componentss/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/componentss/ui/tabs";
import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import Loading from "./loading";

interface Script {
  id: number;
  title: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  framework?: string[];
  seller_name: string;
  seller_email: string;
  seller_id?: string;
  seller_image?: string;
  features: string[];
  requirements: string[];
  link?: string;
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

// Enhanced Media Carousel with Fullscreen
const MediaCarousel = ({
  images,
  screenshots,
  videos,
  title,
  coverImage,
}: {
  images: string[];
  screenshots: string[];
  videos: string[];
  title: string;
  coverImage?: string;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Combine all media, prioritize cover image first
  let allMedia = [...images, ...screenshots, ...videos];

  if (coverImage) {
    allMedia = allMedia.filter((media) => media !== coverImage);
    allMedia = [coverImage, ...allMedia];
  }

  if (allMedia.length === 0) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % allMedia.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
  };

  const isVideo = (url: string) => videos.includes(url);

  const MediaContent = ({
    media,
    index,
    className = "",
  }: {
    media: string;
    index: number;
    className?: string;
  }) => (
    <>
      {isVideo(media) ? (
        <video
          src={media}
          controls
          preload="metadata"
          className={`w-full h-full object-contain bg-neutral-900 ${className}`}
        />
      ) : (
        <img
          src={media}
          alt={`${title} - Media ${index + 1}`}
          className={`w-full h-full object-contain bg-neutral-900 ${className}`}
          loading="lazy"
        />
      )}
    </>
  );

  return (
    <>
      {/* Main Carousel */}
      <div className="sticky top-24">
        <div className="relative bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl overflow-hidden border-2 border-neutral-700 shadow-2xl">
          {/* Main Display */}
          <div className="relative aspect-video ">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <MediaContent
                  media={allMedia[currentIndex]}
                  index={currentIndex}
                />
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            {allMedia.length > 1 && (
              <>
                <motion.button
                  onClick={prevSlide}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-teal-400/80 text-white p-3 rounded-full transition-all z-10 backdrop-blur-sm"
                >
                  <ChevronLeft className="h-6 w-6" />
                </motion.button>
                <motion.button
                  onClick={nextSlide}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-teal-400/80 text-white p-3 rounded-full transition-all z-10 backdrop-blur-sm"
                >
                  <ChevronRight className="h-6 w-6" />
                </motion.button>
              </>
            )}

            {/* Fullscreen Button */}
            <motion.button
              onClick={() => setIsFullscreen(true)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="absolute top-4 right-4 bg-black/70 hover:bg-teal-400/80 text-white p-2 rounded-lg transition-all z-10 backdrop-blur-sm"
            >
              <Maximize2 className="h-5 w-5" />
            </motion.button>

            {/* Counter */}
            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm">
              {currentIndex + 1} / {allMedia.length}
            </div>
          </div>

          {/* Thumbnail Navigation */}
          {allMedia.length > 1 && (
            <div className="p-4 bg-neutral-800/50 border-t border-neutral-700">
              <div 
                className="thumbnail-scrollbar flex gap-3 overflow-x-auto pb-2"
                style={{
                  scrollbarWidth: 'thin',
                }}
              >
                {allMedia.map((media, index) => (
                  <motion.button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentIndex
                        ? "border-teal-400 ring-2 ring-teal-400/40"
                        : "border-gray-600 hover:border-teal-400/70"
                    }`}
                  >
                    {isVideo(media) ? (
                      <div className="relative w-full h-full bg-neutral-800 flex items-center justify-center">
                        <Play className="h-5 w-5 text-teal-400" />
                      </div>
                    ) : (
                      <img
                        src={media}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <motion.button
              onClick={() => setIsFullscreen(false)}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className="absolute top-4 right-4 bg-white/10 hover:bg-teal-400/80 text-white p-3 rounded-full transition-all backdrop-blur-sm z-10"
            >
              <X className="h-6 w-6" />
            </motion.button>

            {allMedia.length > 1 && (
              <>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevSlide();
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-teal-400/80 text-white p-4 rounded-full transition-all z-10 backdrop-blur-sm"
                >
                  <ChevronLeft className="h-8 w-8" />
                </motion.button>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextSlide();
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-teal-400/80 text-white p-4 rounded-full transition-all z-10 backdrop-blur-sm"
                >
                  <ChevronRight className="h-8 w-8" />
                </motion.button>
              </>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-6 py-3 rounded-full text-sm font-semibold backdrop-blur-sm">
              {currentIndex + 1} / {allMedia.length}
            </div>

            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
        console.log("Script detail data:", data);
        console.log("Script images:", data.images);
        console.log("Script cover_image:", data.cover_image);
        console.log("Script videos:", data.videos);
        console.log("Script screenshots:", data.screenshots);
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

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
          
        </div>
      </>
    );
  }

  if (error || !script) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Script Not Found</h1>
            <p className="text-gray-400 mb-6">
              {error || "The script you're looking for doesn't exist."}
            </p>
            <Button
              onClick={() => router.push("/scripts")}
              className="bg-teal-400/80 hover:bg-teal-500/80"
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
  const coverImage =
    script.cover_image ||
    (script.images && script.images[0]) ||
    (script.screenshots && script.screenshots[0]) ||
    (allMedia.length > 0 ? allMedia[0] : null);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .thumbnail-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .thumbnail-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
        }
        .thumbnail-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.8);
          border-radius: 2px;
        }
        .thumbnail-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 1);
        }
      `}} />
      <Navbar />
        <div className="min-h-screen bg-neutral-900 text-white">
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
            {/* Left Column - Media Carousel (Sticky) */}
            <motion.div
              className="lg:col-span-3"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              {allMedia.length > 0 ? (
                <MediaCarousel
                  images={script.images || []}
                  screenshots={script.screenshots || []}
                  videos={script.videos || []}
                  title={script.title}
                  coverImage={script.cover_image}
                />
              ) : (
                <div className="aspect-video bg-neutral-900 rounded-2xl flex items-center justify-center border-2 border-neutral-700">
                  <Package className="h-16 w-16 text-gray-600" />
                </div>
              )}
            </motion.div>

            {/* Right Column - All Information */}
            <motion.div
              className="lg:col-span-2 space-y-6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Header & Badges */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge className="bg-teal-500/15 text-teal-400/90 border-teal-500/30 font-semibold px-3 py-1">
                    {script.category}
                  </Badge>
                  {script.framework && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 font-semibold  px-3 py-1">
                      {script.framework.map((fw) => fw).join(", ")}
                    </Badge>
                  )}
                  {discount > 0 && (
                    <Badge className="bg-gradient-to-r from-red-600 to-red-500 text-white font-bold px-3 py-1">
                      -{discount}% OFF
                    </Badge>
                  )}
                </div>

                <h1 className="text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
                  {script.title}
                </h1>

                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  {script.description}
                </p>

                {/* Seller Card */}
                <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 border-2 border-neutral-700 mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 ring-2 ring-teal-400/40">
                        <AvatarImage
                          src={script.seller_image || "/placeholder-user.jpg"}
                        />
                        <AvatarFallback className="bg-gradient-to-r from-teal-400 to-teal-500 text-white font-bold text-lg">
                          {script.seller_name ? script.seller_name[0] : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-bold text-lg">
                            {script.seller_name}
                          </h3>
                          <CheckCircle className="h-5 w-5 text-teal-400" />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Verified Seller
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pricing Card */}
              <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 border-2 border-teal-500/20 shadow-xl shadow-teal-500/5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="flex items-baseline gap-3 mb-2">
                        <span className="text-3xl font-black bg-gradient-to-r from-teal-400 to-teal-300 bg-clip-text text-transparent">
                          ${script.price}
                        </span>
                        {script.original_price && (
                          <span className="text-2xl text-gray-500 line-through">
                            ${script.original_price}
                          </span>
                        )}
                      </div>
                      {discount > 0 && (
                        <div className="inline-flex bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                          Save $
                          {(script.original_price! - script.price).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-white font-bold py-6 text-lg shadow-lg shadow-teal-500/20"
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
                    <ShoppingCart className="mr-2 h-6 w-6" />
                    Buy Now
                  </Button>
                  {!script.link && (
                    <p className="text-sm text-gray-400 text-center mt-2">
                      No purchase link available
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Tabs Section - Full Width Below Gallery */}
          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 border-2 border-neutral-700">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-neutral-800/50 rounded-t-lg rounded-b-none p-0 h-auto gap-0">
                  <TabsTrigger
                    value="details"
                    className="data-[state=active]:bg-teal-400/80 data-[state=active]:text-white data-[state=active]:rounded-tl-lg rounded-tr-none rounded-bl-none rounded-br-none bg-neutral-800/50 text-white py-3 px-4 font-medium transition-all"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="features"
                    className="data-[state=active]:bg-teal-400/80 data-[state=active]:text-white rounded-none bg-neutral-800/50 text-white py-3 px-4 font-medium transition-all"
                  >
                    Features
                  </TabsTrigger>
                  <TabsTrigger
                    value="requirements"
                    className="data-[state=active]:bg-teal-400/80 data-[state=active]:text-white rounded-none bg-neutral-800/50 text-white py-3 px-4 font-medium transition-all"
                  >
                    Requirements
                  </TabsTrigger>
                  <TabsTrigger
                    value="support"
                    className="data-[state=active]:bg-teal-500 data-[state=active]:text-white data-[state=active]:rounded-tr-lg rounded-tl-none rounded-bl-none rounded-br-none bg-neutral-800/50 text-white py-3 px-4 font-medium transition-all"
                  >
                    Support
                  </TabsTrigger>
                </TabsList>

                {/* Script Details Tab */}
                <TabsContent value="details" className="mt-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-6 w-6 rounded-full bg-teal-400/80 flex items-center justify-center">
                        <Info className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-white text-xl font-bold">Script Details</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
                        <span className="text-gray-400 font-medium">Version</span>
                        <span className="text-white font-bold">
                          {script.version}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
                        <span className="text-gray-400 font-medium">
                          Last Updated
                        </span>
                        <span className="text-white font-bold">
                          {new Date(script.last_updated).toLocaleDateString()}
                        </span>
                      </div>
                      {script.framework && (
                        <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
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
                      <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
                        <span className="text-gray-400 font-medium">Downloads</span>
                        <span className="text-white font-bold">
                          {script.downloads || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
                        <span className="text-gray-400 font-medium">Rating</span>
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
                      <Package className="h-6 w-6 text-teal-400" />
                      <h3 className="text-white text-xl font-bold">Features & Capabilities</h3>
                    </div>
                    {script.features && script.features.length > 0 ? (
                      <div className="space-y-3">
                        {script.features.map((feature, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start gap-3 p-4 rounded-lg bg-neutral-800/50 hover:bg-neutral-800/70 transition-colors border border-neutral-700/50"
                          >
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300 leading-relaxed">
                              {feature}
                            </span>
                          </motion.div>
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
                      <AlertCircle className="h-6 w-6 text-teal-400" />
                      <h3 className="text-white text-xl font-bold">System Requirements</h3>
                    </div>
                    {script.requirements && script.requirements.length > 0 ? (
                      <div className="space-y-3">
                        {script.requirements.map((requirement, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-3 p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                          >
                            <Package className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            <span className="text-gray-300 leading-relaxed">
                              {requirement}
                            </span>
                          </motion.div>
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
                      <Info className="h-6 w-6 text-teal-400" />
                      <h3 className="text-white text-xl font-bold">Support & Documentation</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
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
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
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
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}