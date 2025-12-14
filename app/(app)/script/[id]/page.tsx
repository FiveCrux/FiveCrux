"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/componentss/ui/accordion";
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
}: {
  images: string[];
  screenshots: string[];
  videos: string[];
  title: string;
  coverImage?: string;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
          className={`w-full h-full object-contain bg-black ${className}`}
        />
      ) : (
        <img
          src={media}
          alt={`${title} - Media ${index + 1}`}
          className={`w-full h-full object-contain bg-black ${className}`}
          loading="lazy"
        />
      )}
    </>
  );

  return (
    <>
      {/* Main Carousel */}
      <div className="sticky top-24">
        <div className="relative bg-black rounded-lg overflow-hidden border border-orange-500/30 shadow-xl">
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
            <div className="p-4 bg-neutral-900 border-t border-orange-500/30">
              <div
                className="thumbnail-scrollbar flex gap-3 overflow-x-auto pb-2"
                style={{
                  scrollbarWidth: "thin",
                }}
              >
                {allMedia.map((media, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-24 h-16 rounded overflow-hidden border-2 transition-colors ${
                      index === currentIndex
                        ? "border-orange-500"
                        : "border-neutral-700 hover:border-orange-500/50"
                    }`}
                  >
                    {isVideo(media) ? (
                      <div className="relative w-full h-full bg-neutral-800 flex items-center justify-center">
                        <Play className="h-5 w-5 text-orange-500" />
                      </div>
                    ) : (
                      <img
                        src={media}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
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

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
      `,
        }}
      />
      <Navbar />
      <div className="min-h-screen bg-neutral-900 text-white">
        {/* Hero Section with Background Image */}
        <div
          className="relative text-white"
          style={{
            backgroundImage: `${
              script.cover_image ? `url(${script.cover_image})` : "none"
            }`,
            backgroundSize: "cover",
            backgroundPosition: "center 70%",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Overlay to reduce background image opacity */}
          <div className="absolute inset-0 bg-black/60 pointer-events-none" />

          {/* Gradient fade from middle to bottom - completely dark */}
          <div className="absolute inset-x-0 top-1/3 bottom-0 bg-gradient-to-b from-transparent via-neutral-900 to-neutral-900 pointer-events-none z-[1]" />

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
                  {allMedia.length > 0 ? (
                    <MediaCarousel
                      images={script.images || []}
                      screenshots={script.screenshots || []}
                      videos={script.videos || []}
                      title={script.title}
                      coverImage={script.cover_image}
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
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 font-semibold px-3 py-1">
                        {script.category}
                      </Badge>
                      {script.framework && (
                        <Badge className="bg-neutral-800 text-gray-300 border-neutral-700 font-semibold px-3 py-1">
                          {script.framework.map((fw) => fw).join(", ")}
                        </Badge>
                      )}
                      {discount > 0 && (
                        <Badge className="bg-red-600 text-white font-bold px-3 py-1">
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

                  {/* Pricing Card */}
                  <Card className="bg-neutral-800 border border-orange-500/30 shadow-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <div className="flex items-baseline gap-3 mb-2">
                            <span className="text-3xl font-black text-orange-500">
                              {script.currency_symbol || "$"}{script.price}
                            </span>
                            {script.original_price && (
                              <span className="text-2xl text-gray-500 line-through">
                                {script.currency_symbol || "$"}{script.original_price}
                              </span>
                            )}
                          </div>
                          {discount > 0 && (
                            <div className="inline-flex bg-red-500 text-white px-3 py-1 rounded text-sm font-bold">
                              Save {script.currency_symbol || "$"}
                              {(script.original_price! - script.price).toFixed(
                                2
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-lg shadow-lg"
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

        {/* FAQs Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 align-middle justify-center">
          <h2 className="text-4xl font-bold mb-8">FAQs</h2>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-2xl">Where can I Download this Script?</AccordionTrigger>
            <AccordionContent>
            After your purchase, your package will appear on the Keymaster. You can download the package or transfer your license.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger className="text-2xl">How does this system work?</AccordionTrigger>
            <AccordionContent>
            All resources are encrypted by Cfx.re and linked to your personal Cfx.re account. This process is automated and instant. Purchases are tied to your Cfx.re account, not a specific license key. If you buy a package, it will work for all of your keys. If another Cfx.re account needs access, you need to transfer your license on the Keymaster.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger className="text-2xl">Can I resell this Script?</AccordionTrigger>
            <AccordionContent>
            No. Tebex Limited is the only authorized reseller of CRUX assets. Any external offers or websites claiming to sell our products are unauthorized and violate copyright laws. If you find CRUX assets outside our store, they are likely scams and could pose security risks. To guarantee authenticity and protection, all our assets are delivered exclusively through the Cfx Escrow system.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger className="text-2xl">Where can I get support?</AccordionTrigger>
            <AccordionContent>
            Our official support is available through our Discord server, where our team is ready to assist you with technical issues and questions 24/7.
            </AccordionContent>
          </AccordionItem>
          
        </Accordion>
        </div>
      </div>
      <Footer />
    </>
  );
}
