"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Image from "next/image"
import {
  Package,
  ChevronRight,
  ShoppingCart,
  Zap,
  ShieldCheck,
  BadgeCheck,
  LifeBuoy,
  Check,
  Loader2,
  X,
  ArrowRight,
} from "lucide-react"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import Link from "next/link"
import { toast } from "sonner"

export function PropDetailClient({
  initialData,
  id: idProp,
}: {
  initialData: any
  id: string
}) {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const id = idProp ?? (params.id as string)

  const [prop, setProp] = useState<any>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [addingToCart, setAddingToCart] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const fetchProp = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)
        const response = await fetch(`/api/props/${id}`, { signal: controller.signal })
        clearTimeout(timeoutId)
        if (response.ok) {
          const data = await response.json()
          if (data && !data.error) setProp(data)
          else if (!initialData) setProp(null)
        } else if (!initialData) {
          setProp(null)
        }
      } catch {
        if (!initialData) setProp(null)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchProp()
  }, [id, initialData])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500" />
        </div>
      </>
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
  const hasDiscount = parseFloat(prop.discountPercentage) > 0
  const discount = Math.round(parseFloat(prop.discountPercentage) || 0)
  const currency = prop.currencySymbol || "€"
  const images: string[] = Array.isArray(prop.images) ? prop.images.filter(Boolean) : []
  const activeSrc = images[activeImage] ?? images[0] ?? null
  const sellerName = prop.user?.name || prop.user?.username || "FiveCrux"
  const sellerInitial = sellerName.charAt(0).toUpperCase()
  const price = parseFloat(prop.price) || 0
  const finalPrice = prop.discountedPrice ? parseFloat(prop.discountedPrice) : price

  const handleAddToCart = async () => {
    if (!session) {
      toast.error("Please log in to purchase props")
      router.push("/auth/signin")
      return
    }
    try {
      setAddingToCart(true)
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType: "prop", itemId: prop.id, title: prop.name, price: finalPrice }),
      })
      if (res.ok) {
        toast.success("Added to cart!")
        router.push("/cart")
      } else {
        const error = await res.json().catch(() => ({}))
        toast.error(error.error || "Failed to add to cart")
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setAddingToCart(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] text-white antialiased [font-variant-numeric:tabular-nums]">
        <div className="mx-auto max-w-[1200px] px-5 pb-24 pt-20">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 py-5 text-[13px] text-white/55">
            <Link href="/props" className="transition hover:text-white/70">Marketplace</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/props" className="transition hover:text-white/70">Props</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate text-white/60">{prop.name}</span>
          </nav>

          {/* Tworst grid: media + details (left), title + buy card (right) */}
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_380px]">
            {/* LEFT — media + details */}
            <div className="min-w-0">
              {images.length > 0 ? (
                <>
                  <div className="overflow-hidden rounded-[20px] border border-white/[0.07]">
                    <button type="button" onClick={() => setIsFullscreen(true)} className="group relative block h-[300px] w-full sm:h-[400px]">
                      <Image src={activeSrc as string} alt={prop.name} fill sizes="(max-width:1024px) 100vw, 760px" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
                      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                      <span className="absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/85 ring-1 ring-white/10 backdrop-blur-md">
                        FiveM Prop
                      </span>
                    </button>
                  </div>
                  {images.length > 1 && (
                    <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {images.map((src, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveImage(i)}
                          className={`relative h-[52px] w-20 flex-shrink-0 overflow-hidden rounded-lg border transition ${i === activeImage ? "border-orange-500 opacity-100" : "border-white/[0.08] opacity-50 hover:opacity-100"}`}
                        >
                          <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-[300px] items-center justify-center rounded-[20px] border border-white/[0.07] bg-white/[0.03] sm:h-[400px]">
                  <Package className="h-16 w-16 text-gray-600" />
                </div>
              )}

              {/* Details */}
              <section className="mt-8">
                <h3 className="text-lg font-bold">Details</h3>
                {prop.description ? (
                  <div className="mt-3 whitespace-pre-line break-words [overflow-wrap:anywhere] text-[15px] leading-relaxed text-white/55" dangerouslySetInnerHTML={{ __html: prop.description }} />
                ) : (
                  <p className="mt-3 text-[15px] text-white/55">No description provided.</p>
                )}
                <h3 className="mt-8 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">What&apos;s included</h3>
                <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {["Instant digital delivery", "FiveM resource — drop-in ready", "Lifetime access to the file", "Updates from the seller"].map((f) => (
                    <li key={f} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm leading-snug text-white/65">
                      <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg bg-orange-500/12 text-orange-500">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* RIGHT — title + buy card (sticky) */}
            <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:h-fit">
              <h1 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-[30px]">{prop.name}</h1>

              {/* Seller line */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/55">
                <span className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[10px] font-black text-black">
                    {sellerInitial}
                  </span>
                  {sellerName}
                  <BadgeCheck className="h-4 w-4 text-orange-500" />
                </span>
              </div>

              {/* Tag */}
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full border border-white/[0.1] bg-white/[0.06] px-3.5 py-1 text-[11px] font-bold text-white/55">FiveM Prop</span>
                {isFree && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-bold text-emerald-400">FREE</span>
                )}
              </div>

              {/* Buy card — orange clip-path price header + CTA + perks */}
              <div className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.02]">
                <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 px-6 pb-12 pt-5" style={{ clipPath: "polygon(0 0,100% 0,100% 82%,0 100%)" }}>
                  {!isFree && hasDiscount && discount > 0 && (
                    <span className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-orange-600">−{discount}%</span>
                  )}
                  <small className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/85">
                    {isFree ? "Free download" : "One-time purchase"}
                  </small>
                  <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[40px] font-black leading-none tracking-tight text-white">
                    {isFree ? (
                      "Free"
                    ) : (
                      <>
                        {currency}{finalPrice.toFixed(2)}
                        {hasDiscount && (
                          <del className="text-[17px] font-normal text-white/60">{currency}{price.toFixed(2)}</del>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-1 flex flex-col gap-4 px-6 pb-6">
                  {prop.hasPurchased ? (
                    <div className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 py-3.5 font-bold text-black">
                      <BadgeCheck className="h-[18px] w-[18px]" /> Purchased — sent to your email
                    </div>
                  ) : (
                    <button
                      onClick={handleAddToCart}
                      disabled={addingToCart}
                      className="group flex h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 font-bold text-white shadow-[0_4px_20px_rgba(249,115,22,0.3)] transition hover:from-orange-400 hover:to-orange-500 disabled:opacity-50"
                    >
                      {addingToCart ? (
                        <><Loader2 className="h-[18px] w-[18px] animate-spin" /> Adding…</>
                      ) : (
                        <><ShoppingCart className="h-[18px] w-[18px]" /> {isFree ? "Get it Free" : "Add to Cart"}</>
                      )}
                    </button>
                  )}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5 text-[13.5px] text-white/70">
                      <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg bg-orange-500/12 text-orange-500"><Zap className="h-3.5 w-3.5" /></span>
                      Instant delivery to your email
                    </div>
                    <div className="flex items-center gap-2.5 text-[13.5px] text-white/70">
                      <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg bg-orange-500/12 text-orange-500"><ShieldCheck className="h-3.5 w-3.5" /></span>
                      Secure checkout via Tebex
                    </div>
                    <div className="flex items-center gap-2.5 text-[13.5px] text-white/70">
                      <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg bg-orange-500/12 text-orange-500"><LifeBuoy className="h-3.5 w-3.5" /></span>
                      Updates &amp; support included
                    </div>
                  </div>
                </div>
              </div>

              {/* Browse more */}
              <Link href="/props" className="block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 text-center text-sm font-semibold transition hover:bg-white/[0.08]">
                Browse more props
              </Link>
            </aside>
          </div>
        </div>
      </main>

      {/* Fullscreen image lightbox */}
      {isFullscreen && activeSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setIsFullscreen(false)}>
          <button type="button" onClick={() => setIsFullscreen(false)} className="absolute right-4 top-4 z-10 rounded-full bg-black/80 p-3 text-white transition-colors hover:bg-orange-500">
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeSrc} alt={prop.name} className="max-h-[90vh] max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      <Footer />
    </>
  )
}
