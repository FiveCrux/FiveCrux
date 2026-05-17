"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Package, Download, Heart, Share2, Star, CheckCircle, ChevronRight, DollarSign, User, Calendar, FileArchive } from "lucide-react"
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
              <Card className="bg-gray-900/50 border-gray-800 overflow-hidden backdrop-blur-sm shadow-2xl shadow-orange-500/5">
                <div className="aspect-video relative group bg-black/50">
                  {prop.images && prop.images.length > 0 ? (
                    <motion.img 
                      key={activeImage}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
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
                  <div className="p-4 bg-gray-900/80 border-t border-gray-800 overflow-x-auto custom-scrollbar">
                    <div className="flex gap-3 min-w-max">
                      {prop.images.map((img: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImage(idx)}
                          className={`relative w-24 h-16 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                            activeImage === idx ? 'border-orange-500 scale-105 opacity-100 shadow-lg shadow-orange-500/20' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Description & Technical Info */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                  <CardContent className="p-6 md:p-8">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
                      <Package className="text-orange-500" />
                      Description
                    </h2>
                    <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {prop.description}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                  <CardContent className="p-6 md:p-8">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
                      <FileArchive className="text-orange-500" />
                      Files & Technical
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-black/30 p-4 rounded-xl border border-gray-800">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Format</div>
                        <div className="text-white font-medium">FiveM Prop (YDR/YTD)</div>
                      </div>
                      <div className="bg-black/30 p-4 rounded-xl border border-gray-800">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">File Type</div>
                        <div className="text-white font-medium">ZIP Archive</div>
                      </div>
                      <div className="bg-black/30 p-4 rounded-xl border border-gray-800">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Delivery</div>
                        <div className="text-white font-medium flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Instant
                        </div>
                      </div>
                      <div className="bg-black/30 p-4 rounded-xl border border-gray-800">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Optimized</div>
                        <div className="text-white font-medium flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          High Efficiency
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Column: Checkout Info */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-gray-900/90 to-black border-gray-800 sticky top-24 backdrop-blur-xl shadow-2xl shadow-orange-500/5 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-orange-500 to-yellow-400" />
                <CardContent className="p-6 md:p-8">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 uppercase tracking-widest px-3 py-1">
                      FiveM Prop
                    </Badge>
                    <div className="flex items-center gap-1 text-orange-400">
                      <Star className="h-4 w-4 fill-orange-500" />
                      <span className="font-bold">5.0</span>
                    </div>
                  </div>
                  
                  <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
                    {prop.name}
                  </h1>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-yellow-400 p-0.5 shadow-lg shadow-orange-500/20">
                        <div className="h-full w-full rounded-full bg-gray-900 overflow-hidden">
                          {prop.user?.image || prop.user?.profilePicture ? (
                            <img 
                              src={prop.user?.profilePicture || prop.user?.image} 
                              alt={prop.user?.name || "Creator"} 
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <User className="h-6 w-6 text-orange-500" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-orange-500 font-bold uppercase tracking-[0.2em] mb-0.5">Verified Creator</span>
                        <span className="text-base font-bold text-white group-hover:text-orange-400 transition-colors">
                          {prop.user?.name || prop.user?.username || "FiveCrux Community"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Added on {new Date(prop.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/5">
                    {isFree ? (
                      <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                        FREE
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="text-gray-400 text-sm mb-1 uppercase tracking-tighter">Total Price</div>
                        <div className="flex items-end gap-3">
                          <span className="text-5xl font-black text-white">
                            €{finalPrice.toFixed(2)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xl text-gray-500 line-through mb-1">
                              €{parseFloat(prop.price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 mb-8">
                    <Button 
                      className="w-full py-7 text-lg font-bold rounded-2xl transition-all shadow-xl shadow-orange-500/20 bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black hover:scale-[1.02] active:scale-95 group"
                      onClick={handleAddToCart}
                      disabled={addingToCart}
                    >
                      {addingToCart ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Download className="h-5 w-5 group-hover:animate-bounce" />
                          {isFree ? "Add to Library" : "Add to Cart"}
                        </span>
                      )}
                    </Button>
                    
                    <div className="flex gap-4">
                      <Button variant="outline" className="flex-1 py-6 border-gray-700 bg-gray-900/50 hover:bg-gray-800 rounded-xl transition-all">
                        <Heart className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" className="flex-1 py-6 border-gray-700 bg-gray-900/50 hover:bg-gray-800 rounded-xl transition-all">
                        <Share2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-gray-800">
                    <div className="flex items-center gap-3 text-gray-300">
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <span className="text-sm">Instant Digital Delivery</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300">
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <span className="text-sm">FiveM Resource Ready</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300">
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <span className="text-sm">Verified High Optimization</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.5);
        }
      `}</style>
    </>
  )
}
