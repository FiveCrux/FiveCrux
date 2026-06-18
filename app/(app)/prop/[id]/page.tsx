"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Package, Download, Heart, Share2, Star, CheckCircle, ChevronRight, User, Calendar, FileArchive, ShoppingCart } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import { toast } from "sonner"
import { MARKETPLACE_SEED } from "@/lib/marketplace-seed"

// TODO: remove before production — seed fallback so the page is auditable with an empty dev DB.
function buildSeedProp(id: string | string[] | undefined) {
  const seed =
    MARKETPLACE_SEED.find((p) => p.category === "prop") ||
    MARKETPLACE_SEED.find((p) => p.category === "mlo") ||
    MARKETPLACE_SEED[0]
  return {
    id: typeof id === "string" ? id : seed.id,
    name: seed.title,
    description:
      "This is demo seed content rendered because the prop database returned no record. " +
      "A high-quality, fully optimized FiveM prop ready to drop into your server resources.",
    price: String(seed.price),
    discountedPrice:
      seed.originalPrice && seed.originalPrice > seed.price ? String(seed.price) : null,
    discountPercentage:
      seed.originalPrice && seed.originalPrice > seed.price
        ? String(Math.round((1 - seed.price / seed.originalPrice) * 100))
        : "0",
    images: seed.coverImage ? [seed.coverImage] : [],
    createdAt: new Date().toISOString(),
    hasPurchased: false,
    user: { name: seed.seller, profilePicture: seed.sellerImage },
    __seed: true,
  }
}

export default function PropDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()

  const [prop, setProp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [buyingTebex, setBuyingTebex] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    const fetchProp = async () => {
      try {
        // Abort a hanging/slow request (e.g. DB unreachable) after 8s so the page
        // falls back to seed instead of spinning forever.
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        const response = await fetch(`/api/props/${id}`, { signal: controller.signal })
        clearTimeout(timeoutId)
        if (response.ok) {
          const data = await response.json()
          setProp(data)
        } else {
          // SEED FALLBACK: empty/missing DB record in dev — render seed so the page is auditable.
          // TODO: remove before production
          setProp(buildSeedProp(id))
        }
      } catch (error) {
        // TODO: remove before production
        setProp(buildSeedProp(id))
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
  // Tebex Model B is available only when the prop carries seller webstore fields.
  const hasTebex = Boolean(prop.tebexPackageId && prop.tebexStoreToken)

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

  // Tebex Model B: create a basket against the seller's webstore and redirect to checkout.
  const handleTebexBuy = async () => {
    if (!session) {
      toast.error("Please log in to purchase props")
      router.push('/auth/signin')
      return
    }

    try {
      setBuyingTebex(true)
      const res = await fetch('/api/tebex/basket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeToken: prop.tebexStoreToken,
          packageId: prop.tebexPackageId,
        })
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        toast.error(data.error || "Failed to start checkout")
        setBuyingTebex(false)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      setBuyingTebex(false)
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
      <div className="min-h-screen text-white bg-[#0a0a0a] pt-24 pb-12 relative overflow-hidden">
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
            <span className="text-orange-400 truncate max-w-[200px]">{prop.name}</span>
          </div>

          {prop.__seed && (
            <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-300">
              Showing demo seed content (no matching prop found in the database).
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Media + Description */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-2xl border border-white/[0.08] bg-white/[0.04] overflow-hidden backdrop-blur-md shadow-2xl shadow-orange-500/5">
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
                  {isFree && (
                    <span className="absolute top-4 left-4 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-black shadow-lg">
                      FREE
                    </span>
                  )}
                </div>

                {/* Thumbnails */}
                {prop.images && prop.images.length > 1 && (
                  <div className="p-4 bg-black/40 border-t border-white/[0.08] overflow-x-auto custom-scrollbar">
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

              {/* Description */}
              <Card className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-white/[0.08] pb-4">
                    <Package className="text-orange-500" />
                    Description
                  </h2>
                  <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {prop.description}
                  </div>
                </CardContent>
              </Card>

              {/* Files & Technical */}
              <Card className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-white/[0.08] pb-4">
                    <FileArchive className="text-orange-500" />
                    Files & Technical
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-black/30 p-4 rounded-xl border border-white/[0.08]">
                      <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Format</div>
                      <div className="text-white font-medium">FiveM Prop (YDR/YTD)</div>
                    </div>
                    <div className="bg-black/30 p-4 rounded-xl border border-white/[0.08]">
                      <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">File Type</div>
                      <div className="text-white font-medium">ZIP Archive</div>
                    </div>
                    <div className="bg-black/30 p-4 rounded-xl border border-white/[0.08]">
                      <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Delivery</div>
                      <div className="text-white font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Instant
                      </div>
                    </div>
                    <div className="bg-black/30 p-4 rounded-xl border border-white/[0.08]">
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

            {/* Right Column: Purchase / Download panel */}
            <div className="space-y-6">
              <Card className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-black/40 border border-white/[0.08] sticky top-24 backdrop-blur-xl shadow-2xl shadow-orange-500/5 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-orange-500 to-yellow-400" />
                <CardContent className="p-6 md:p-8">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 uppercase tracking-widest px-3 py-1">
                      FiveM Prop
                    </Badge>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="h-4 w-4 fill-yellow-400" />
                      <span className="font-bold">5.0</span>
                      <span className="text-xs text-gray-400 ml-1">(0)</span>
                    </div>
                  </div>

                  <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
                    {prop.name}
                  </h1>

                  {/* Seller */}
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
                    {prop.createdAt && (
                      <div className="flex items-center gap-3 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Added on {new Date(prop.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Price */}
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

                  {/* Primary action */}
                  <div className="space-y-4 mb-8">
                    {prop.hasPurchased ? (
                      <Button
                        className="w-full py-7 text-lg font-bold rounded-2xl transition-all shadow-xl shadow-green-500/20 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-black hover:scale-[1.02] active:scale-95 group"
                        onClick={handleDownload}
                        disabled={downloading}
                      >
                        {downloading ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Download className="h-5 w-5 group-hover:animate-bounce" />
                            Download Prop File
                          </span>
                        )}
                      </Button>
                    ) : hasTebex ? (
                      <Button
                        className="w-full py-7 text-lg font-bold rounded-2xl transition-all shadow-xl shadow-orange-500/20 bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black hover:scale-[1.02] active:scale-95 group"
                        onClick={handleTebexBuy}
                        disabled={buyingTebex}
                      >
                        {buyingTebex ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                        ) : (
                          <span className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Buy Now
                          </span>
                        )}
                      </Button>
                    ) : (
                      <Button
                        className="w-full py-7 text-lg font-bold rounded-2xl transition-all shadow-xl shadow-orange-500/20 bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black hover:scale-[1.02] active:scale-95 group"
                        onClick={handleAddToCart}
                        disabled={addingToCart}
                      >
                        {addingToCart ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                        ) : (
                          <span className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            {isFree ? "Add to Library" : "Add to Cart"}
                          </span>
                        )}
                      </Button>
                    )}

                    <div className="flex gap-4">
                      <Button variant="outline" className="flex-1 py-6 border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-all">
                        <Heart className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" className="flex-1 py-6 border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-all">
                        <Share2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Trust badges */}
                  <div className="space-y-4 pt-6 border-t border-white/[0.08]">
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
