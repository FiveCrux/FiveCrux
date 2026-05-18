"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Package, Download, Heart, Share2, Star, CheckCircle, ChevronRight, DollarSign } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import { toast } from "sonner"

export default function PropDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  
  const [prop, setProp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    const fetchProp = async () => {
      try {
        const response = await fetch(`/api/props/${id}`)
        if (response.ok) {
          const data = await response.json()
          setProp(data)
        } else {
          toast.error("Failed to load prop details")
          router.push('/props')
        }
      } catch (error) {
        toast.error("Error loading prop")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchProp()
    }
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!prop) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Prop not found</div>
  }

  const isFree = parseFloat(prop.price) === 0
  const finalPrice = prop.discountedPrice ? parseFloat(prop.discountedPrice) : parseFloat(prop.price)
  const hasDiscount = parseFloat(prop.discountPercentage) > 0

  const handleAddToCart = async () => {
    if (!session) {
      toast.error("Please log in to purchase props")
      router.push('/auth/signin')
      return
    }

    try {
      setAddingToCart(true)
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'prop',
          itemId: prop.id,
          title: prop.name,
          price: finalPrice
        })
      })

      if (res.ok) {
        toast.success("Added to cart!")
        router.push('/cart')
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to add to cart")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setAddingToCart(false)
    }
  }

  const handleDownload = async () => {
    try {
      setDownloading(true)
      const res = await fetch(`/api/props/${prop.id}/download`)
      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || "Failed to download prop")
        return
      }
      const data = await res.json()
      if (data.downloadUrl) {
        const link = document.createElement('a')
        link.href = data.downloadUrl
        link.setAttribute('download', `${prop.name}.zip`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        toast.success("Download started!")
      } else {
        toast.error("Download URL not found")
      }
    } catch (err) {
      toast.error("Failed to start download")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen text-white bg-black pt-24 pb-12 relative overflow-hidden">
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-500/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-yellow-500/10 blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-gray-400 mb-8 space-x-2">
            <span className="hover:text-white cursor-pointer" onClick={() => router.push('/')}>Home</span>
            <ChevronRight className="h-4 w-4" />
            <span className="hover:text-white cursor-pointer" onClick={() => router.push('/props')}>Props</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-orange-400 truncate">{prop.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Media */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-gray-900/50 border-gray-800 overflow-hidden backdrop-blur-sm">
                <div className="aspect-video relative group bg-black/50">
                  {prop.images && prop.images.length > 0 ? (
                    <img 
                      src={prop.images[activeImage]} 
                      alt={prop.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                      <Package className="h-16 w-16 mb-4 opacity-50" />
                      <span>No images available</span>
                    </div>
                  )}
                  {hasDiscount && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full font-bold shadow-lg">
                      -{prop.discountPercentage}%
                    </div>
                  )}
                </div>
                
                {/* Thumbnails */}
                {prop.images && prop.images.length > 1 && (
                  <div className="p-4 bg-gray-900/80 border-t border-gray-800 overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                      {prop.images.map((img: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImage(idx)}
                          className={`relative w-20 h-14 rounded-md overflow-hidden border-2 transition-all ${
                            activeImage === idx ? 'border-orange-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Description */}
              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
                    <Package className="text-orange-500" />
                    Prop Details
                  </h2>
                  <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
                    {prop.description}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Checkout Info */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-gray-900/90 to-black border-gray-800 sticky top-24 backdrop-blur-xl">
                <CardContent className="p-6 md:p-8">
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 mb-4 uppercase tracking-widest">
                    FiveM Prop
                  </Badge>
                  
                  <h1 className="text-3xl font-bold text-white mb-2 leading-tight">
                    {prop.name}
                  </h1>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-6 pb-6 border-b border-gray-800">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-orange-500 fill-orange-500" />
                      <span className="text-white font-medium">5.0</span>
                      <span>(0 reviews)</span>
                    </div>
                  </div>

                  <div className="mb-8">
                    {isFree ? (
                      <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                        FREE
                      </div>
                    ) : (
                      <div className="flex items-end gap-3">
                        <span className="text-4xl font-black text-white">
                          €{finalPrice.toFixed(2)}
                        </span>
                        {hasDiscount && (
                          <span className="text-xl text-gray-500 line-through mb-1">
                            €{parseFloat(prop.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 mb-8">
                    {prop.hasPurchased ? (
                      <Button 
                        className="w-full py-6 text-lg font-bold rounded-xl transition-all shadow-xl shadow-green-500/20 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-black hover:scale-[1.02]"
                        onClick={handleDownload}
                        disabled={downloading}
                      >
                        {downloading ? "Downloading..." : "Download Prop File"}
                      </Button>
                    ) : (
                      <Button 
                        className="w-full py-6 text-lg font-bold rounded-xl transition-all shadow-xl shadow-orange-500/20 bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black hover:scale-[1.02]"
                        onClick={handleAddToCart}
                        disabled={addingToCart}
                      >
                        {addingToCart ? "Adding..." : isFree ? "Add to Library" : "Add to Cart"}
                      </Button>
                    )}
                    
                    <div className="flex gap-4">
                      <Button variant="outline" className="flex-1 border-gray-700 bg-gray-900/50 hover:bg-gray-800">
                        <Heart className="h-5 w-5 mr-2" />
                        Wishlist
                      </Button>
                      <Button variant="outline" className="flex-1 border-gray-700 bg-gray-900/50 hover:bg-gray-800">
                        <Share2 className="h-5 w-5 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                    <div className="flex items-center gap-3 text-gray-300">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm">Instant Delivery</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm">Optimized Performance</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm">Premium Support</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
