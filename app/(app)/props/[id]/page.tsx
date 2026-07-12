"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import Image from "next/image"
import {
  Package,
  Download,
  Star,
  CheckCircle,
  ChevronRight,
  User,
  Calendar,
  ShoppingCart,
  Zap,
  ShieldCheck,
  BadgeCheck,
  Images,
  LifeBuoy,
} from "lucide-react"
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
  const [buyingTebex, setBuyingTebex] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    const fetchProp = async () => {
      try {
        // Abort a hanging/slow request (e.g. DB unreachable) after 8s so the page
        // falls back to seed instead of spinning forever.
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)
        const response = await fetch(`/api/props/${id}`, { signal: controller.signal })
        clearTimeout(timeoutId)
        if (response.ok) {
          const data = await response.json()
          setProp(data && !data.error ? data : null)
        } else {
          // No matching record (404 / empty DB) — show the not-found state.
          setProp(null)
        }
      } catch (error) {
        // Network error / abort / timeout — show the not-found state.
        setProp(null)
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
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-5 text-white">
          <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.04] p-10 text-center backdrop-blur-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10">
              <Package className="h-8 w-8 text-orange-400" />
            </div>
            <h1 className="mb-2 text-2xl font-extrabold tracking-tight">Prop not found</h1>
            <p className="mb-7 text-sm text-white/55">
              The prop you&apos;re looking for doesn&apos;t exist or is no longer available.
            </p>
            <button
              onClick={() => router.push("/props")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
            >
              Browse props
            </button>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const isFree = parseFloat(prop.price) === 0
  const finalPrice = prop.discountedPrice ? parseFloat(prop.discountedPrice) : parseFloat(prop.price)
  const hasDiscount = parseFloat(prop.discountPercentage) > 0
  // Tebex Model B is available only when the prop carries seller webstore fields.
  const hasTebex = Boolean(prop.tebexPackageId && prop.tebexStoreToken)

  const images: string[] = Array.isArray(prop.images) ? prop.images : []
  const hasImages = images.length > 0
  const sellerName = prop.user?.name || prop.user?.username || "FiveCrux Community"
  const sellerAvatar = prop.user?.profilePicture || prop.user?.image || null
  const sellerInitial = sellerName.charAt(0).toUpperCase()
  // Bento tiles: main lead = active image; the next two distinct images fill the small tiles.
  const leadImage = hasImages ? images[activeImage] : null
  const smallTile1 = hasImages ? images[(activeImage + 1) % images.length] : null
  const smallTile2 = hasImages ? images[(activeImage + 2) % images.length] : null
  const extraCount = Math.max(images.length - 3, 0)

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

  // Primary CTA — preserves button priority: purchased→Download, else hasTebex→Buy Now, else Add to Cart.
  const renderPrimaryCta = () => {
    if (prop.hasPurchased) {
      return (
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 py-3.5 font-bold text-black transition hover:from-green-600 hover:to-emerald-600 disabled:opacity-70"
        >
          {downloading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
          ) : (
            <>
              <Download className="h-[18px] w-[18px] group-hover:animate-bounce" /> Download Prop File
            </>
          )}
        </button>
      )
    }
    if (hasTebex) {
      return (
        <button
          onClick={handleTebexBuy}
          disabled={buyingTebex}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 font-bold text-black transition hover:bg-orange-400 disabled:opacity-70"
        >
          {buyingTebex ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
          ) : (
            <>
              <Zap className="h-[18px] w-[18px]" /> Buy via Tebex
            </>
          )}
        </button>
      )
    }
    return (
      <button
        onClick={handleAddToCart}
        disabled={addingToCart}
        className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 font-bold text-black transition hover:bg-orange-400 disabled:opacity-70"
      >
        {addingToCart ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
        ) : (
          <>
            <ShoppingCart className="h-[18px] w-[18px]" /> {isFree ? "Add to Library" : "Add to Cart"}
          </>
        )}
      </button>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] text-white pt-20 [font-variant-numeric:tabular-nums]">
        <div className="mx-auto max-w-[1240px] px-5 pb-24">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 py-5 text-[13px] text-white/55">
            <span className="cursor-pointer transition hover:text-white/70" onClick={() => router.push('/')}>Home</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="cursor-pointer transition hover:text-white/70" onClick={() => router.push('/props')}>Props</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate max-w-[220px] text-white/60">{prop.name}</span>
          </nav>

          {/* ===== BENTO GALLERY HERO ===== */}
          <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-4 sm:grid-rows-2 sm:h-[440px]">
            {/* large lead */}
            <figure className={`group relative col-span-1 row-span-2 overflow-hidden rounded-[22px] border border-white/[0.07] ${images.length > 1 ? "sm:col-span-2 lg:col-span-3" : "sm:col-span-4"}`}>
              {leadImage ? (
                <motion.div key={activeImage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full w-full">
                  <Image
                    src={leadImage}
                    alt={prop.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 75vw"
                    className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  />
                </motion.div>
              ) : (
                <div className="flex h-[280px] w-full flex-col items-center justify-center bg-black/50 text-gray-500 sm:h-full">
                  <Package className="mb-3 h-14 w-14 opacity-50" />
                  <span>No images available</span>
                </div>
              )}
              {!leadImage && <div className="min-h-[280px] sm:min-h-[420px]" />}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-transparent" />
              {hasDiscount && (
                <span className="absolute right-4 top-4 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-bold text-black shadow-lg backdrop-blur-md">
                  −{prop.discountPercentage}%
                </span>
              )}
              {isFree && (
                <span className="absolute left-4 top-4 rounded-full bg-green-500 px-2.5 py-1 text-[11px] font-bold text-black shadow-lg">
                  FREE
                </span>
              )}
              {leadImage && !isFree && !hasDiscount && (
                <span className="absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/85 ring-1 ring-white/10 backdrop-blur-md">
                  FiveM Prop
                </span>
              )}
            </figure>

            {/* small tile 1 */}
            <figure className={`group relative hidden min-h-[140px] overflow-hidden rounded-[22px] border border-white/[0.07] ${images.length > 1 ? "sm:block" : ""}`}>
              {smallTile1 ? (
                <Image
                  src={smallTile1}
                  alt=""
                  fill
                  sizes="25vw"
                  className="object-cover transition duration-700 group-hover:scale-[1.04]"
                />
              ) : (
                <div className="h-full w-full bg-white/[0.03]" />
              )}
            </figure>

            {/* small tile 2 */}
            <figure className={`group relative hidden min-h-[140px] overflow-hidden rounded-[22px] border border-white/[0.07] ${images.length > 1 ? "sm:block" : ""}`}>
              {smallTile2 ? (
                <Image
                  src={smallTile2}
                  alt=""
                  fill
                  sizes="25vw"
                  className="object-cover transition duration-700 group-hover:scale-[1.04]"
                />
              ) : (
                <div className="h-full w-full bg-white/[0.03]" />
              )}
              {extraCount > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition group-hover:opacity-100">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Images className="h-4 w-4" /> +{extraCount} more
                  </span>
                </div>
              )}
            </figure>
          </section>

          {/* thumbnail strip — switches the main tile */}
          {images.length > 1 && (
            <div className="hide-scroll mt-2.5 flex gap-2.5 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`relative h-16 w-28 flex-none overflow-hidden rounded-xl border object-cover transition ${
                    activeImage === idx
                      ? 'border-orange-500/60 opacity-100 ring-2 ring-orange-500/60'
                      : 'border-white/[0.07] opacity-80 hover:opacity-100'
                  }`}
                >
                  <Image src={img} alt="" fill sizes="112px" className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* ===== TITLE + PRICE BAR ===== */}
          <section className="mt-6 flex flex-col gap-6 rounded-[24px] border border-white/[0.07] bg-[#0e0e0e] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] lg:flex-row lg:items-center lg:gap-8 lg:p-7">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                  FiveM Prop
                </span>
              </div>
              <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">
                {prop.name}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="flex items-center gap-2 text-white/55">
                  {sellerAvatar ? (
                    <span className="relative grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-white/10">
                      <Image src={sellerAvatar} alt={sellerName} fill sizes="24px" className="object-cover" />
                    </span>
                  ) : (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[10px] font-black text-black">
                      {sellerInitial}
                    </span>
                  )}
                  {sellerName} <BadgeCheck className="h-4 w-4 text-orange-500" />
                </span>
                <span className="flex items-center gap-1.5 text-white/55">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-white">5.0</span>
                  <span className="text-white/55">(0 reviews)</span>
                </span>
                {prop.createdAt && (
                  <span className="flex items-center gap-1.5 text-white/55">
                    <Calendar className="h-4 w-4" /> Added {new Date(prop.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* price + cta */}
            <div className="lg:w-[320px] lg:flex-none lg:border-l lg:border-white/[0.07] lg:pl-8">
              {isFree ? (
                <span className="text-[38px] font-extrabold leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                  FREE
                </span>
              ) : (
                <div className="flex items-end gap-3">
                  <span className="text-[38px] font-extrabold leading-none tracking-tight">
                    €{finalPrice.toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <span className="mb-1 text-base text-white/55 line-through">
                      €{parseFloat(prop.price).toFixed(2)}
                    </span>
                  )}
                  {hasDiscount && (
                    <span className="mb-1 rounded-md bg-emerald-500/12 px-2 py-0.5 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/25">
                      −{prop.discountPercentage}%
                    </span>
                  )}
                </div>
              )}
              <div className="mt-4 flex flex-col gap-2.5">
                {renderPrimaryCta()}
              </div>
              {prop.purchaseCheckFailed && !prop.hasPurchased && (
                <p className="mt-2 text-center text-[12px] text-amber-400/80">
                  Couldn&apos;t verify your purchase status — if you already own this, refresh before buying again.
                </p>
              )}
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-white/55">
                <ShieldCheck className="h-3.5 w-3.5" /> Instant delivery · escrow protected
              </p>
            </div>
          </section>

          {/* ===== BODY: content + seller ===== */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
            {/* LEFT: content */}
            <div className="min-w-0">
              {/* description */}
              <section>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Overview</h2>
                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-white/65">
                  {prop.description}
                </p>
              </section>

              {/* what's included */}
              <section className="mt-9">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">What&apos;s included</h2>
                <ul className="mt-4 divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  <li className="flex items-center gap-3 px-4 py-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-400" /> Instant digital delivery
                  </li>
                  <li className="flex items-center gap-3 px-4 py-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-400" /> FiveM resource ready
                  </li>
                  <li className="flex items-center gap-3 px-4 py-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-400" /> Verified high optimization
                  </li>
                </ul>
              </section>

              {/* files & technical */}
              <section className="mt-9">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Files &amp; technical</h2>
                <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] sm:grid-cols-4">
                  <div className="border-r border-white/[0.05] p-4 text-center">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">Format</div>
                    <div className="mt-1 text-sm font-semibold">YDR / YTD</div>
                  </div>
                  <div className="border-white/[0.05] p-4 text-center sm:border-r">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">File Type</div>
                    <div className="mt-1 text-sm font-semibold">ZIP Archive</div>
                  </div>
                  <div className="border-r border-t border-white/[0.05] p-4 text-center sm:border-t-0">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">Delivery</div>
                    <div className="mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold">
                      <CheckCircle className="h-4 w-4 text-emerald-400" /> Instant
                    </div>
                  </div>
                  <div className="border-t border-white/[0.05] p-4 text-center sm:border-t-0">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">Optimized</div>
                    <div className="mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold">
                      <CheckCircle className="h-4 w-4 text-emerald-400" /> High
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT: seller card (sticky) */}
            <aside className="lg:sticky lg:top-24 lg:h-fit">
              <div className="rounded-[22px] border border-white/[0.07] bg-[#0e0e0e] p-5">
                <div className="flex items-center gap-3">
                  {sellerAvatar ? (
                    <span className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-white/10">
                      <Image src={sellerAvatar} alt={sellerName} fill sizes="48px" className="object-cover" />
                    </span>
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-lg font-black text-black">
                      {sellerInitial}
                    </span>
                  )}
                  <div className="leading-tight">
                    <div className="flex items-center gap-1.5 font-semibold">
                      {sellerName} <BadgeCheck className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="text-xs text-white/55">Verified seller</div>
                  </div>
                </div>
                <button className="mt-4 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 text-sm font-semibold transition hover:bg-white/[0.08]">
                  View store
                </button>
              </div>

              <div className="mt-4 rounded-[22px] border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <LifeBuoy className="h-4 w-4 text-orange-500" /> Support included
                </div>
                <p className="mt-1.5 text-[13px] leading-snug text-white/55">
                  Active Discord, documentation and free updates for the lifetime of this resource.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />

      <style jsx global>{`
        .hide-scroll::-webkit-scrollbar {
          display: none;
        }
        .hide-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  )
}
