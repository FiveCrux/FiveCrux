"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Package, DollarSign, Image as ImageIcon, Sparkles, FileArchive, ShieldCheck, X, Upload, Store } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Textarea } from "@/componentss/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card"
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
        const t = setTimeout(() => c.abort(), 3000)
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
    setIsSubmitting(true)

    try {
      const propData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        discountPercentage: parseFloat(formData.discountPercentage || "0"),
        images: media.images,
        zipFile: formData.zipFile || "https://example.com/placeholder.zip", // Fallback for testing
        tebexStoreToken: formData.tebexStoreToken.trim() || null,
        tebexPackageId: formData.tebexPackageId.trim() || null,
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

  const cardClass = "bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/30"
  const inputClass = "mt-2 bg-black/40 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus-visible:ring-orange-500/60 focus-visible:ring-offset-0 focus-visible:border-orange-500/50"

  return (
    <>
      <Navbar />
      <div className="min-h-screen text-white pt-24 pb-16 bg-[#0a0a0a] relative overflow-hidden">
        {/* ambient glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[40rem] rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-yellow-400/5 blur-[120px]" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-medium text-orange-400 mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                {isEditMode ? "Editing your prop" : "Add to the marketplace"}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
                {isEditMode ? "Edit Prop" : "Submit New Prop"}
              </h1>
              <p className="mt-3 text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
                Share your FiveM prop with the community. Fill in the details below and upload your files.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* Basics */}
              <Card className={cardClass}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3 text-lg">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                      <Package className="h-5 w-5" />
                    </span>
                    Basics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label className="text-gray-200">Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Prop name"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-gray-200">Description *</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your prop, what it includes, and how to use it"
                      className={`${inputClass} resize-y`}
                      rows={5}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Media / Images */}
              <Card className={cardClass}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3 text-lg">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                      <ImageIcon className="h-5 w-5" />
                    </span>
                    Images
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-400">Add up to 10 preview images. The first image is used as the thumbnail.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {media.images.map((img, i) => (
                      <div key={i} className="relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10 group">
                        <img src={img} alt={`Image ${i}`} className="w-full h-full object-cover" />
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
                      <label className="aspect-video rounded-xl border-2 border-dashed border-white/15 hover:border-orange-500 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-black/30 hover:bg-orange-500/5 transition-colors text-center">
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
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-xs sm:text-sm text-gray-400">Add Images</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Files / Upload */}
              <Card className={cardClass}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3 text-lg">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                      <FileArchive className="h-5 w-5" />
                    </span>
                    Files
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Label className="text-gray-200">Prop ZIP File *</Label>
                  <div className="flex flex-col sm:flex-row items-stretch gap-4">
                    <label className="flex-1 max-w-full sm:max-w-xs border-2 border-dashed border-white/15 hover:border-orange-500 rounded-xl p-4 cursor-pointer bg-black/30 hover:bg-orange-500/5 transition-colors flex flex-col items-center justify-center text-center h-32">
                      <input
                        type="file"
                        accept=".zip,application/zip,application/x-zip-compressed"
                        className="hidden"
                        onChange={handleZipUpload}
                        disabled={uploadingZip}
                      />
                      {uploadingZip ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" />
                          <span className="text-sm text-gray-400">Uploading...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-gray-400" />
                          <span className="text-sm text-gray-400">
                            {formData.zipFile ? "Change ZIP File" : "Upload ZIP File"}
                          </span>
                        </div>
                      )}
                    </label>
                    {formData.zipFile && (
                      <div className="flex-1 min-w-0 flex flex-col justify-center sm:h-32 text-sm text-green-400 bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                        <span className="font-semibold mb-1">File ready:</span>
                        <a href={formData.zipFile} target="_blank" rel="noopener noreferrer" className="text-white font-medium hover:underline truncate block" title={formData.zipFile.split('/').pop()}>
                          {formData.zipFile.split('/').pop()}
                        </a>
                        <div className="mt-2">
                          <Input
                            value={formData.zipFile}
                            readOnly
                            className="h-8 text-xs bg-black/40 border-white/10 text-gray-300 rounded-lg"
                            onClick={(e) => e.currentTarget.select()}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card className={cardClass}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3 text-lg">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                      <DollarSign className="h-5 w-5" />
                    </span>
                    Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <Label className="text-gray-200">Price (€) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-gray-200">Discount Percentage (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.discountPercentage}
                        onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tebex (optional) */}
              <Card className={cardClass}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3 text-lg">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                      <Store className="h-5 w-5" />
                    </span>
                    Tebex (optional)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-sm text-gray-400">Add these to sell this prop directly via your Tebex store</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <Label className="text-gray-200">Tebex Store Token</Label>
                      <Input
                        value={formData.tebexStoreToken}
                        onChange={(e) => setFormData({ ...formData, tebexStoreToken: e.target.value })}
                        placeholder="Your Tebex webstore token"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-200">Tebex Package ID</Label>
                      <Input
                        value={formData.tebexPackageId}
                        onChange={(e) => setFormData({ ...formData, tebexPackageId: e.target.value })}
                        placeholder="Tebex package ID"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Review note */}
              <div className="flex items-start gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/[0.06] p-4">
                <ShieldCheck className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">
                  All submissions are <span className="font-semibold text-white">reviewed by our team before going live</span> on the marketplace. You will be notified once your prop is approved.
                </p>
              </div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-bold px-8 py-3 h-auto text-base sm:text-lg rounded-xl w-full sm:w-auto shadow-lg shadow-orange-500/20 disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting..." : isEditMode ? "Update Prop" : "Submit Prop"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  )
}
