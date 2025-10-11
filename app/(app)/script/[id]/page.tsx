"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useParams, useRouter } from "next/navigation"
import {
  Star,
  ShoppingCart,
  Heart,
  Share2,
  Download,
  Shield,
  Clock,
  Users,
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
} from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentss/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/componentss/ui/avatar"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import ReviewSection from "@/componentss/shared/review-section"

interface Script {
  id: number
  title: string
  description: string
  price: number
  original_price?: number
  category: string
  framework?: string
  seller_name: string
  seller_email: string
  seller_id?: string
  seller_image?: string
  features: string[]
  requirements: string[]
  links: string[]
  images: string[]
  videos: string[]
  screenshots: string[]
  cover_image?: string
  version: string
  last_updated: string
  status: "pending" | "approved" | "rejected"
  featured: boolean
  downloads: number
  rating: number
  review_count: number
  created_at: string
  updated_at: string
}

// Media Slider Component
const MediaSlider = ({ images, screenshots, videos, title }: { 
  images: string[], 
  screenshots: string[], 
  videos: string[], 
  title: string 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const allMedia = [...images, ...screenshots, ...videos]
  
  // Debug logging
  console.log('MediaSlider props:', { images, screenshots, videos, title });
  console.log('All media:', allMedia);
  
  if (allMedia.length === 0) return null

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % allMedia.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length)
  }

  const isVideo = (url: string) => {
    return videos.includes(url)
  }

  return (
    <div className="relative">
      {/* Main Slider */}
      <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
        {allMedia.map((media, index) => (
          <motion.div
            key={index}
            className={`absolute inset-0 ${index === currentIndex ? 'block' : 'hidden'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: index === currentIndex ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          >
                         {isVideo(media) ? (
               <video
                 src={media}
                 controls
                 preload="metadata"
                 className="w-full h-full object-contain bg-gray-800"
                 onError={(e) => {
                   const target = e.target as HTMLVideoElement;
                   console.error('Video error:', target.error);
                   target.style.display = 'none';
                 }}
                 onLoadStart={() => console.log('Video loading started:', media)}
                 onCanPlay={() => console.log('Video can play:', media)}
               />
             ) : (
               <img
                 src={media}
                 alt={`${title} - Media ${index + 1}`}
                 className="w-full h-full object-contain bg-gray-800 transition-transform duration-500 hover:scale-105"
                 loading="lazy"
                 onError={(e) => {
                   const target = e.target as HTMLImageElement;
                   target.style.display = 'none';
                 }}
               />
             )}
          </motion.div>
        ))}
        
        {/* Navigation Arrows */}
        {allMedia.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
        
        {/* Slide Counter */}
        <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {allMedia.length}
        </div>
      </div>
      
      {/* Thumbnail Navigation */}
      {allMedia.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {allMedia.map((media, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex 
                  ? 'border-orange-500 scale-105' 
                  : 'border-gray-600 hover:border-gray-400'
              }`}
            >
                             {isVideo(media) ? (
                 <div className="relative w-full h-full bg-gray-800 flex items-center justify-center">
                   <Play className="h-4 w-4 text-white" />
                 </div>
               ) : (
                 <img
                   src={media}
                   alt={`Thumbnail ${index + 1}`}
                   className="w-full h-full object-contain bg-gray-800"
                   onError={(e) => {
                     const target = e.target as HTMLImageElement;
                     target.style.display = 'none';
                   }}
                 />
               )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ScriptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const scriptId = params.id as string

  const [script, setScript] = useState<Script | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [selectedTab, setSelectedTab] = useState("overview")

  useEffect(() => {
    const fetchScript = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/scripts/${scriptId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Script not found")
          } else {
            setError("Failed to load script")
          }
          return
        }

        const data = await response.json()
        console.log("Script detail data:", data);
        console.log("Script images:", data.images);
        console.log("Script cover_image:", data.cover_image);
        console.log("Script videos:", data.videos);
        console.log("Script screenshots:", data.screenshots);
        setScript(data)
      } catch (err) {
        setError("Failed to load script")
        console.error("Error fetching script:", err)
      } finally {
        setLoading(false)
      }
    }

    if (scriptId) {
      fetchScript()
    }
  }, [scriptId])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
      </>
    )
  }

  if (error || !script) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
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
    )
  }

  const discount = script.original_price ? Math.round(((script.original_price - script.price) / script.original_price) * 100) : 0
  const allMedia = [...(script.images || []), ...(script.videos || []), ...(script.screenshots || [])]
  const coverImage = script.cover_image || (script.images && script.images[0]) || (script.screenshots && script.screenshots[0]) || (allMedia.length > 0 ? allMedia[0] : null)

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <motion.section
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Cover Image */}
            <div>
              <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={script.title}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="eager"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center ${coverImage ? 'hidden' : ''}`}>
                  <Package className="h-12 w-12 text-gray-500" />
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">{script.category}</Badge>
                  {script.framework && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{script.framework}</Badge>
                  )}
                  {discount > 0 && <Badge className="bg-red-500 text-white">-{discount}% OFF</Badge>}
                </div>

                <h1 className="text-4xl font-bold text-white mb-4">{script.title}</h1>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                                                  className={`h-5 w-5 ${
                            i < Math.floor(Number(script.rating) || 0) ? "text-yellow-400 fill-current" : "text-gray-600"
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-white font-semibold">{(Number(script.rating) || 0).toFixed(1)}</span>
                  <span className="text-gray-400">({script.review_count || 0} reviews)</span>
                  <span className="text-gray-400">•</span>
                                              <span className="text-gray-400">{script.downloads || 0} downloads</span>
                </div>

                <p className="text-gray-300 text-lg leading-relaxed mb-6">{script.description}</p>

                {/* Seller Info */}
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={script.seller_image || "/placeholder-user.jpg"} />
                      <AvatarFallback className="bg-gradient-to-r from-orange-500 to-yellow-400 text-black font-bold">
                        {script.seller_name ? script.seller_name[0] : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold">{script.seller_name}</h3>
                        <CheckCircle className="h-4 w-4 text-yellow-400" />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>Verified Seller</span>
                        <span>Joined {new Date(script.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing and Actions */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-orange-500">
                      ${script.price}
                    </span>
                    {script.original_price && (
                      <span className="text-xl text-gray-500 line-through">${script.original_price}</span>
                    )}
                  </div>
                  {discount > 0 && (
                    <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      Save ${(script.original_price! - script.price).toFixed(2)}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Button className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-bold py-3 text-lg">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-orange-500"
                      onClick={() => setIsWishlisted(!isWishlisted)}
                    >
                      <Heart className={`mr-2 h-4 w-4 ${isWishlisted ? "fill-current text-red-500" : ""}`} />
                      {isWishlisted ? "Wishlisted" : "Wishlist"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-orange-500"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="mt-6 pt-6 border-t border-gray-700/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Download className="h-4 w-4" />
                      <span>Instant Download</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Shield className="h-4 w-4" />
                      <span>Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>Lifetime Updates</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users className="h-4 w-4" />
                      <span>24/7 Support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Media Slider */}
          {((script.images && script.images.length > 0) || (script.screenshots && script.screenshots.length > 0) || (script.videos && script.videos.length > 0)) && (
            <section className="mb-16">
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                  <ImageIcon className="h-8 w-8 text-orange-500" />
                  Media Gallery
                </h2>
                
                <MediaSlider 
                  images={script.images || []}
                  screenshots={script.screenshots || []}
                  videos={script.videos || []}
                  title={script.title}
                />
              </motion.div>
            </section>
          )}

          {/* Detailed Information Tabs */}
          <section className="mb-16">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-gray-800/30 border border-gray-700/50">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="features"
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                >
                  Features
                </TabsTrigger>
                <TabsTrigger
                  value="requirements"
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                >
                  Requirements
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                >
                  Reviews
                </TabsTrigger>
                <TabsTrigger
                  value="support"
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                >
                  Support
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Info className="h-5 w-5 text-orange-500" />
                      Script Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                      <p className="text-gray-300 leading-relaxed">{script.description}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-white font-semibold mb-3">Script Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Version:</span>
                            <span className="text-white">{script.version}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Last Updated:</span>
                            <span className="text-white">{new Date(script.last_updated).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Downloads:</span>
                            <span className="text-white">{(script.downloads || 0).toLocaleString()}</span>
                          </div>
                          {script.framework && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Framework:</span>
                              <span className="text-white">{script.framework}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="features" className="mt-6">
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Package className="h-5 w-5 text-orange-500" />
                      Features & Capabilities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {script.features.map((feature, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors"
                        >
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="requirements" className="mt-6">
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      System Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {script.requirements.map((requirement, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/30"
                        >
                          <Package className="h-5 w-5 text-blue-500" />
                          <span className="text-gray-300">{requirement}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <ReviewSection 
                  itemId={script.id}
                  itemType="script"
                  itemTitle={script.title}
                />
              </TabsContent>

              <TabsContent value="support" className="mt-6">
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-orange-500" />
                      Support & Documentation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/30">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <h4 className="text-white font-semibold">Documentation</h4>
                            <p className="text-sm text-gray-400">Complete setup and usage guide</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/30">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <h4 className="text-white font-semibold">Discord Support</h4>
                            <p className="text-sm text-gray-400">24/7 community support</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/30">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <h4 className="text-white font-semibold">Lifetime Updates</h4>
                            <p className="text-sm text-gray-400">Free updates for life</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/30">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <h4 className="text-white font-semibold">Installation Help</h4>
                            <p className="text-sm text-gray-400">Step-by-step installation</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-4">
                      {script.links && script.links.length > 0 ? (
                        script.links.map((link, index) => (
                          <Button 
                            key={index}
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => window.open(link, '_blank')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Link {index + 1}
                          </Button>
                        ))
                      ) : (
                        <p className="text-gray-400">No links available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
      <Footer />
    </>
  )
}
