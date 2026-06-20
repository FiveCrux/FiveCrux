"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Package,
  DollarSign,
  Image as ImageIcon,
  Sparkles,
  FileArchive,
  ShieldCheck,
  X,
  Upload,
  Store,
  Eye,
  Users,
  BadgeCheck,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Textarea } from "@/componentss/ui/textarea"
import { Label } from "@/componentss/ui/label"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import { toast } from "sonner"

export default function SubmitPropPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const propId = searchParams.get('edit')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoadingProp, setIsLoadingProp] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingZip, setUploadingZip] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    discountPercentage: "0",
    zipFile: "",
    tebexStoreToken: "",
    tebexPackageId: "",
  })

  const [media, setMedia] = useState<{ images: string[] }>({ images: [] })

  useEffect(() => {
    if (propId) {
      setIsEditMode(true)
      setIsLoadingProp(true)

      const fetchProp = async () => {
        const c = new AbortController()
        const t = setTimeout(() => c.abort(), 15000)
        try {
          const response = await fetch(`/api/props/${propId}`, { signal: c.signal })
          if (response.ok) {
            const prop = await response.json()
            setFormData({
              name: prop.name || "",
              description: prop.description || "",
              price: prop.price?.toString() || "",
              discountPercentage: prop.discountPercentage?.toString() || "0",
              zipFile: prop.zipFile || "",
              tebexStoreToken: prop.tebexStoreToken || "",
              tebexPackageId: prop.tebexPackageId || "",
            })
            setMedia({ images: prop.images || [] })
          } else {
            toast.error("Failed to load prop")
            router.push('/props/submit')
          }
        } catch (error) {
          toast.error("Failed to load prop")
          router.push('/props/submit')
        } finally {
          clearTimeout(t)
          setIsLoadingProp(false)
        }
      }
      fetchProp()
    }
  }, [propId, router])

  if (status === "loading" || isLoadingProp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
          <span className="text-gray-400">Loading...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  const handleFileUpload = async (file: File, type: "image" | "zip", purpose: string, userId?: string) => {
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)
      formData.append("purpose", purpose)
      if (userId) {
        formData.append("userId", userId)
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const result = await response.json()
      return result.url
    } catch (error) {
      toast.error(`Failed to upload file`)
      return null
    }
  }

  const handleImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setUploadingImages(true)
    const newImages: string[] = []
    try {
      for (let i = 0; i < files.length; i++) {
        if (media.images.length + newImages.length >= 10) {
          toast.warning("Maximum 10 images allowed")
          break
        }
        const url = await handleFileUpload(files[i], "image", "prop_image")
        if (url) newImages.push(url)
      }

      if (newImages.length > 0) {
        setMedia(prev => ({ images: [...prev.images, ...newImages] }))
      }
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (index: number) => {
    setMedia(prev => ({
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingZip(true)
    try {
      const userId = (session?.user as any)?.id
      const url = await handleFileUpload(file, "zip", "prop_zip", userId)
      if (url) {
        setFormData(prev => ({ ...prev, zipFile: url }))
        toast.success("ZIP file uploaded successfully")
      }
    } finally {
      setUploadingZip(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.tebexPackageId.trim()) {
      toast.error("Tebex Package ID is required (create the package + upload the ZIP on Tebex first)")
      return
    }

    setIsSubmitting(true)

    try {
      const propData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        discountPercentage: parseFloat(formData.discountPercentage || "0"),
        images: media.images,
        zipFile: "", // delivery is via Tebex now; no in-app file
        tebexStoreToken: null,
        tebexPackageId: formData.tebexPackageId.trim(),
      }

      const url = isEditMode && propId ? `/api/props/${propId}` : "/api/props"
      const method = isEditMode ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(propData),
      })

      if (response.ok) {
        toast.success(isEditMode ? "Prop updated successfully!" : "Prop submitted successfully!")
        router.push('/profile')
      } else {
        throw new Error("Failed to submit prop")
      }
    } catch (error) {
      toast.error("Error submitting prop. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---- styles ----
  const micro = "text-[11px] font-semibold tracking-[0.16em] uppercase"
  const fieldClass =
    "mt-2 bg-[#0e0e0e] border-white/[0.08] text-white placeholder:text-white/55 rounded-[14px] focus-visible:ring-[3px] focus-visible:ring-orange-500/[0.18] focus-visible:ring-offset-0 focus-visible:border-orange-500 transition"

  // ---- live-preview derived values ----
  const priceNum = parseFloat(formData.price)
  const hasPrice = formData.price !== "" && !Number.isNaN(priceNum)
  const discountNum = parseFloat(formData.discountPercentage || "0") || 0
  const isFree = hasPrice && priceNum === 0
  const hasDiscount = hasPrice && discountNum > 0 && !isFree
  const discountedPrice = hasDiscount ? priceNum * (1 - discountNum / 100) : priceNum
  const coverImage = media.images[0]
  const sellerName = session?.user?.name || "You"
  const sellerImage = session?.user?.image || ""
  const sellerInitial = sellerName.charAt(0).toUpperCase()

  // ---- reusable section header ----
  const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2.5">
      <span className="text-orange-500">{icon}</span>
      <h2 className={`${micro} text-white/55`}>{title}</h2>
      <div className="h-px flex-1 bg-white/[0.07]" />
    </div>
  )

  return (
    <>
      <Navbar />
      <div className="min-h-screen text-white pt-24 pb-20 bg-[#0a0a0a] relative overflow-hidden">
        {/* ambient glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[40rem] rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-yellow-400/5 blur-[120px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className={`inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 ${micro} text-orange-400`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {isEditMode ? "Editing your prop" : "Add to the marketplace"}
                </span>
                <h1 className="mt-4 text-[34px] sm:text-4xl font-extrabold leading-none tracking-tight">
                  {isEditMode ? "Edit prop listing" : "New prop listing"}
                </h1>
                <p className="mt-3 text-gray-400 max-w-xl text-sm">
                  Share your FiveM prop with the community. Fill in the details and watch the preview update live.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_400px]">
                {/* ============ LEFT · FORM ============ */}
                <div className="space-y-10">
                  {/* Basics */}
                  <section>
                    <SectionHeader icon={<Package className="h-4 w-4" />} title="Basics" />
                    <div className="mt-5 space-y-5">
                      <div>
                        <Label className={`${micro} text-white/50`}>Name *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Prop name"
                          className={`${fieldClass} px-4 py-3 text-[15px] font-medium`}
                          required
                        />
                      </div>
                      <div>
                        <Label className={`${micro} text-white/50`}>Description *</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Describe your prop, what it includes, and how to use it"
                          className={`${fieldClass} px-4 py-3 text-sm leading-relaxed text-white/85 resize-y`}
                          rows={5}
                          required
                        />
                      </div>
                    </div>
                  </section>

                  {/* Images */}
                  <section>
                    <SectionHeader icon={<ImageIcon className="h-4 w-4" />} title="Images" />
                    <div className="mt-5 space-y-4">
                      <p className="text-sm text-white/55">
                        Add up to 10 preview images. The first image is used as the cover thumbnail.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                        {media.images.map((img, i) => (
                          <div
                            key={i}
                            className="relative aspect-video rounded-xl overflow-hidden bg-black/40 ring-1 ring-white/10 group"
                          >
                            <img src={img} alt={`Image ${i}`} className="w-full h-full object-cover" />
                            {i === 0 && (
                              <span className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white/85 ring-1 ring-white/10 backdrop-blur-md">
                                Cover
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              aria-label="Remove image"
                              className="absolute top-1.5 right-1.5 bg-red-500/90 hover:bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        {media.images.length < 10 && (
                          <label className="aspect-video rounded-xl border border-dashed border-white/15 hover:border-orange-500/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white/[0.02] hover:bg-orange-500/5 transition-colors text-center text-white/55 hover:text-white/70">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={handleImagesUpload}
                              disabled={uploadingImages}
                            />
                            {uploadingImages ? (
                              <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" />
                            ) : (
                              <>
                                <ImageIcon className="w-5 h-5" />
                                <span className="text-xs sm:text-sm">Add Images</span>
                              </>
                            )}
                          </label>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Delivery note — the prop file lives on Tebex, not here */}
                  <section>
                    <SectionHeader icon={<FileArchive className="h-4 w-4" />} title="File delivery" />
                    <div className="mt-5 rounded-[14px] border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">
                      The prop <span className="text-white/80">ZIP is uploaded on Tebex</span> when you create its
                      package (use the Tebex <span className="text-white/80">“File Download”</span> option). On payment,
                      Tebex emails the buyer the download automatically. Just paste the
                      <span className="text-white/80"> Tebex Package ID</span> below.
                    </div>
                  </section>

                  {/* Pricing */}
                  <section>
                    <SectionHeader icon={<DollarSign className="h-4 w-4" />} title="Pricing" />
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      <div>
                        <Label className={`${micro} text-white/50`}>Price (€) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          placeholder="0.00"
                          className={`${fieldClass} px-4 py-3 text-[15px] font-semibold tabular-nums`}
                          required
                        />
                      </div>
                      <div>
                        <Label className={`${micro} text-white/50`}>Discount Percentage (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.discountPercentage}
                          onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                          className={`${fieldClass} px-4 py-3 text-[15px] font-medium tabular-nums`}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Tebex package — required (drives delivery + price) */}
                  <section>
                    <SectionHeader icon={<Store className="h-4 w-4" />} title="Tebex Package" />
                    <div className="mt-5 space-y-5">
                      <div>
                        <Label className={`${micro} text-white/50`}>Tebex Package ID *</Label>
                        <Input
                          value={formData.tebexPackageId}
                          onChange={(e) => setFormData({ ...formData, tebexPackageId: e.target.value })}
                          placeholder="e.g. 654321"
                          className={`${fieldClass} px-4 py-3 text-sm tabular-nums`}
                          required
                        />
                      </div>
                      <p className="text-sm text-white/55">
                        The ID of the package backing this prop in the FiveCrux Tebex store (where you uploaded the ZIP).
                        The buyer <span className="text-white/80">price is pulled live from Tebex</span> and the file
                        is delivered by Tebex on payment.
                      </p>
                    </div>
                  </section>
                </div>

                {/* ============ RIGHT · LIVE PREVIEW ============ */}
                <aside className="lg:sticky lg:top-24 lg:self-start">
                  <div className={`mb-3 flex items-center gap-2 ${micro} text-white/55`}>
                    <Eye className="h-3.5 w-3.5" /> Live preview
                  </div>

                  {/* product card */}
                  <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0e0e0e] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
                    <div className="relative h-40 bg-white/[0.03]">
                      {coverImage ? (
                        <img src={coverImage} alt="Cover preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/25">
                          <ImageIcon className="h-7 w-7" />
                          <span className="text-[11px]">Cover image preview</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-transparent" />
                      <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/85 ring-1 ring-white/10 backdrop-blur-md">
                        Prop
                      </span>
                      {(isFree || hasDiscount) && (
                        <span className="absolute right-3 top-3 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-black">
                          {isFree ? "FREE" : `-${discountNum}%`}
                        </span>
                      )}
                    </div>
                    <div className="px-5 pb-5 pt-4">
                      <h3 className="text-lg font-extrabold leading-tight tracking-tight">
                        {formData.name || "Untitled prop"}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-white/55">
                        {formData.description || "No description yet."}
                      </p>

                      <div className="mt-4 flex items-end justify-between border-t border-white/[0.06] pt-4">
                        <div className="flex items-baseline gap-2">
                          {isFree ? (
                            <span className="text-[26px] font-extrabold leading-none tracking-tight tabular-nums">
                              Free
                            </span>
                          ) : (
                            <>
                              <span className="text-[26px] font-extrabold leading-none tracking-tight tabular-nums">
                                €{hasPrice ? discountedPrice.toFixed(2) : "0.00"}
                              </span>
                              {hasDiscount && (
                                <span className="text-sm text-white/55 line-through tabular-nums">
                                  €{priceNum.toFixed(2)}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <span className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-black">
                          Buy
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-2.5 border-t border-white/[0.06] pt-4">
                        {sellerImage ? (
                          <img
                            src={sellerImage}
                            alt={sellerName}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[11px] font-black text-black">
                            {sellerInitial}
                          </span>
                        )}
                        <div className="leading-tight">
                          <div className="flex items-center gap-1 text-[13px] font-semibold">
                            {sellerName}
                            <BadgeCheck className="h-3.5 w-3.5 text-orange-500" />
                          </div>
                          <div className="text-[11px] text-white/55">Seller</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-white/55">
                    <Users className="h-3.5 w-3.5" /> This is exactly how buyers will see your listing.
                  </p>

                  <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/[0.06] px-4 py-3.5">
                    <p className="flex items-start gap-2 text-xs leading-relaxed text-white/70">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                      All submissions are{" "}
                      <span className="font-semibold text-white">reviewed by our team before going live</span> on the
                      marketplace. You will be notified once your prop is approved.
                    </p>
                  </div>

                  {/* Submit */}
                  <div className="mt-5">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="group inline-flex w-full items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-bold px-6 py-3 h-auto text-base rounded-full shadow-lg shadow-orange-500/20 disabled:opacity-60"
                    >
                      {isSubmitting ? "Submitting..." : isEditMode ? "Update Prop" : "Submit for review"}
                      {!isSubmitting && (
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      )}
                    </Button>
                  </div>
                </aside>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  )
}
