"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Link as LinkIcon, Plus, Check } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Textarea } from "@/componentss/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentss/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/componentss/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import FileUpload from "@/componentss/shared/file-upload"

interface FeaturedBannerFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  slotUniqueId?: string | null
}

// Fill a Featured slot with a custom banner — same shape/UX as the Ads form
// (title + description + category placement + link + image), but it publishes
// straight into the purchased featured slot instead of the ad slots.
export default function FeaturedBannerForm({ isOpen, onClose, onSuccess, slotUniqueId }: FeaturedBannerFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    link_url: "",
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Placement options (where the banner shows) = Assets + product categories +
  // Props + Giveaways, fetched from the DB — same list as the Ads form.
  const [placementOptions, setPlacementOptions] = useState<{ value: string; label: string }[]>([
    { value: "scripts", label: "Assets" },
    { value: "props", label: "Props" },
    { value: "giveaways", label: "Giveaways" },
  ])
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!Array.isArray(d?.categories)) return
        setPlacementOptions([
          { value: "scripts", label: "Assets" },
          ...d.categories.map((c: any) => ({ value: c.slug, label: c.name })),
          { value: "props", label: "Props" },
          { value: "giveaways", label: "Giveaways" },
        ])
      })
      .catch(() => {})
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n })
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.title.trim()) e.title = "Title is required"
    if (!formData.description.trim()) e.description = "Description is required"
    if (!formData.category) e.category = "Category is required"
    if (!formData.link_url.trim()) e.link_url = "Link URL is required"
    if (!selectedImage) e.image = "Banner image is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent | React.MouseEvent) => {
    ev.preventDefault()
    if (!validate()) {
      toast({ title: "Validation Error", description: "Please fix the errors before submitting.", variant: "destructive" as any })
      return
    }
    setIsSubmitting(true)
    try {
      // Upload the banner image first.
      let imageUrl = ""
      if (selectedImage) {
        const fd = new FormData()
        fd.append("file", selectedImage)
        fd.append("type", "image")
        fd.append("purpose", "ad_creative")
        const up = await fetch("/api/upload", { method: "POST", body: fd })
        if (up.ok) imageUrl = (await up.json()).url
      }
      if (!imageUrl) throw new Error("Image upload failed")

      const res = await fetch("/api/users/featured-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slot_unique_id: slotUniqueId || null,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          link_url: formData.link_url,
          image_url: imageUrl,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to publish featured banner")
      }
      toast({ title: "Featured banner published!", description: "It's live in your featured slot now." })
      setFormData({ title: "", description: "", category: "", link_url: "" })
      setSelectedImage(null)
      setErrors({})
      onSuccess()
      onClose()
    } catch (err) {
      toast({
        title: "Failed to publish banner",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive" as any,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0d0d0d] border-white/[0.08] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Feature a Banner</DialogTitle>
          <DialogDescription className="text-white/50">
            Upload a banner to feature in this slot — title, description, where it shows, link and image.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Title */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">Banner Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter banner title..."
                className={`bg-white/[0.04] border-white/[0.08] text-white ${errors.title ? "border-red-500" : ""}`}
              />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">Description *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe your banner..."
                className={`bg-white/[0.04] border-white/[0.08] text-white ${errors.description ? "border-red-500" : ""}`}
                rows={3}
              />
              {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            </div>

            {/* Category / placement */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">Category *</label>
              <Select value={formData.category} onValueChange={(v) => handleInputChange("category", v)}>
                <SelectTrigger className={`bg-white/[0.04] border-white/[0.08] text-white ${errors.category ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d0f] border-white/[0.08]">
                  {placementOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-white/[0.06]">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
            </div>

            {/* Link URL */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">Link URL *</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-4 w-4" />
                <Input
                  value={formData.link_url}
                  onChange={(e) => handleInputChange("link_url", e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                  className={`bg-white/[0.04] border-white/[0.08] text-white pl-10 ${errors.link_url ? "border-red-500" : ""}`}
                />
              </div>
              {errors.link_url && <p className="text-red-400 text-xs mt-1">{errors.link_url}</p>}
            </div>

            {/* Image */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">Banner Image *</label>
              {errors.image && <p className="text-red-400 text-xs mb-2">{errors.image}</p>}
              <FileUpload
                onFileSelect={(file: File) => { setSelectedImage(file); setErrors((p) => { const n = { ...p }; delete n.image; return n }) }}
                onFileRemove={() => setSelectedImage(null)}
                selectedFile={selectedImage}
                accept="image/*"
                maxSize={5}
                className="w-full"
                purpose="ad"
              />
            </div>
          </motion.div>

          {/* Footer — matches the Ads form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex gap-3 pt-4 border-t border-white/[0.08]"
          >
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-400 text-black font-bold flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                  Publishing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Feature Banner
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/[0.1] text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              Cancel
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
