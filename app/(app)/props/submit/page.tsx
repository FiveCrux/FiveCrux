"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Code, Package, DollarSign, Image as ImageIcon, Sparkles } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Textarea } from "@/componentss/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Label } from "@/componentss/ui/label"
import Navbar from "@/componentss/shared/navbar"
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

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    discountPercentage: "0",
    zipFile: "",
  })

  const [media, setMedia] = useState<{ images: string[] }>({ images: [] })

  useEffect(() => {
    if (propId) {
      setIsEditMode(true)
      setIsLoadingProp(true)
      
      const fetchProp = async () => {
        try {
          const response = await fetch(`/api/props/${propId}`)
          if (response.ok) {
            const prop = await response.json()
            setFormData({
              name: prop.name || "",
              description: prop.description || "",
              price: prop.price?.toString() || "",
              discountPercentage: prop.discountPercentage?.toString() || "0",
              zipFile: prop.zipFile || "",
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
          setIsLoadingProp(false)
        }
      }
      fetchProp()
    }
  }, [propId, router])

  if (status === "loading" || isLoadingProp) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  const handleFileUpload = async (file: File, type: "image" | "zip", purpose: string) => {
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)
      formData.append("purpose", purpose)

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

  return (
    <>
      <Navbar />
      <div className="min-h-screen text-white pt-24 pb-12 bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
              {isEditMode ? "Edit Prop" : "Submit New Prop"}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-8">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-500" />
                    Basic Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Prop name"
                      className="mt-2 bg-gray-900 border-gray-700 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-white">Description *</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Prop description"
                      className="mt-2 bg-gray-900 border-gray-700 text-white"
                      rows={5}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Price (€) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="mt-2 bg-gray-900 border-gray-700 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-white">Discount Percentage (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.discountPercentage}
                        onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                        className="mt-2 bg-gray-900 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-white">File URL *</Label>
                    <Input
                      value={formData.zipFile}
                      onChange={(e) => setFormData({ ...formData, zipFile: e.target.value })}
                      placeholder="https://example.com/prop.zip"
                      className="mt-2 bg-gray-900 border-gray-700 text-white"
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-orange-500" />
                    Images
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {media.images.map((img, i) => (
                      <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
                        <img src={img} alt={`Image ${i}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                        >
                          X
                        </button>
                      </div>
                    ))}
                    {media.images.length < 10 && (
                      <label className="aspect-video rounded-lg border-2 border-dashed border-gray-600 hover:border-orange-500 flex flex-col items-center justify-center cursor-pointer bg-gray-900/50 hover:bg-gray-800/50 transition-colors">
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
                          <span className="text-sm text-gray-400">Add Images</span>
                        )}
                      </label>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-6 border-t border-gray-800">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-bold px-8 py-2 h-auto text-lg w-full md:w-auto"
                >
                  {isSubmitting ? "Submitting..." : isEditMode ? "Update Prop" : "Submit Prop"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  )
}
