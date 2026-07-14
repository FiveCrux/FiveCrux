"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Upload, Link, DollarSign, Tag, Calendar, Plus } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Textarea } from "@/componentss/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentss/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/componentss/ui/dialog"
import { Badge } from "@/componentss/ui/badge"
import { useToast } from "@/hooks/use-toast"
import FileUpload from "@/componentss/shared/file-upload"

interface AdsFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editData?: {
    id: number
    title: string
    description: string
    category: string
    link_url: string
    image_url: string
    priority: number
    status: string
  }
  slotUniqueId?: string | null
}

export default function AdsForm({ isOpen, onClose, onSuccess, editData, slotUniqueId }: AdsFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    link_url: "",
    image_url: "",
    status: "pending"
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageDeleted, setImageDeleted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isEditMode = !!editData

  // Placement options = where the ad shows. "Assets" is the scripts landing,
  // then every product category (so an ad can target e.g. the Maps page),
  // then Props and Giveaways. Categories are fetched from the DB (same list as
  // the navbar) so this stays in sync as categories change.
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

  // Update form data when editData changes
  useEffect(() => {
    if (editData) {
      setFormData({
        title: editData.title || "",
        description: editData.description || "",
        category: editData.category || "",
        link_url: editData.link_url || "",
        image_url: editData.image_url || "",
        status: editData.status || "pending"
      })
      setImageDeleted(false)
      setSelectedImage(null)
      setErrors({})
    } else {
      // Reset form when not in edit mode
      setFormData({
        title: "",
        description: "",
        category: "",
        link_url: "",
        image_url: "",
        status: "pending"
      })
      setImageDeleted(false)
      setSelectedImage(null)
      setErrors({})
    }
  }, [editData])

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageUpload = (file: File) => {
    setSelectedImage(file)
    // Clear image error when a new image is selected
    if (errors.image) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.image
        return newErrors
      })
    }
  }

  const handleDeleteCurrentImage = () => {
    setImageDeleted(true)
    setFormData(prev => ({
      ...prev,
      image_url: ""
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate title
    if (!formData.title.trim()) {
      newErrors.title = "Title is required"
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters"
    } else if (formData.title.trim().length > 100) {
      newErrors.title = "Title must be less than 100 characters"
    }

    // Validate description
    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters"
    } else if (formData.description.trim().length > 500) {
      newErrors.description = "Description must be less than 500 characters"
    }

    // Validate category
    if (!formData.category) {
      newErrors.category = "Category is required"
    } else if (!['scripts', 'giveaways', 'props'].includes(formData.category)) {
      newErrors.category = "Please select a valid category"
    }

    // Validate link URL
    if (!formData.link_url.trim()) {
      newErrors.link_url = "Link URL is required"
    } else {
      try {
        const url = new URL(formData.link_url)
        if (!['http:', 'https:'].includes(url.protocol)) {
          newErrors.link_url = "URL must start with http:// or https://"
        }
      } catch {
        newErrors.link_url = "Please enter a valid URL"
      }
    }

    // Validate image
    const hasImage = selectedImage || (formData.image_url && !imageDeleted)
    if (!hasImage) {
      newErrors.image = "An image is required for the advertisement"
    }

    // Validate image file if selected
    if (selectedImage) {
      const maxSize = 5 * 1024 * 1024 // 5MB in bytes
      if (selectedImage.size > maxSize) {
        newErrors.image = "Image size must be less than 5MB"
      }
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      if (!validTypes.includes(selectedImage.type)) {
        newErrors.image = "Image must be JPEG, PNG, WebP, or GIF format"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault()
    
    // Validate form before submission
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form before submitting.',
        variant: 'destructive' as any,
      })
      return
    }

    setIsSubmitting(true)

    try {
      // First upload image if selected
      let imageUrl = formData.image_url
      if (selectedImage) {
        const formData = new FormData()
        formData.append('file', selectedImage)
        formData.append('type', 'image')
        formData.append('purpose', 'ad_creative')

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          imageUrl = uploadData.url
        }
      }

      // Submit ad data
      const url = isEditMode ? '/api/users/advertisements' : '/api/users/advertisements'
      const method = isEditMode ? 'PATCH' : 'POST'
      const body = isEditMode 
        ? JSON.stringify({
            adId: editData!.id,
            ...formData,
            image_url: imageUrl,
            slot_unique_id: slotUniqueId || null
          })
        : JSON.stringify({
            ...formData,
            image_url: imageUrl,
            slot_unique_id: slotUniqueId || null
          })

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body
      })

      if (response.ok) {
        onSuccess()
        // Show success toast without refreshing the page
        toast({
          title: isEditMode ? "Ad updated" : "Ad created",
          description: isEditMode
            ? "Your advertisement has been updated successfully."
            : "Your advertisement has been created successfully.",
        })
        onClose()
        // Reset form
        setFormData({
          title: "",
          description: "",
          category: "",
          link_url: "",
          image_url: "",
          status: "pending"
        })
        setSelectedImage(null)
        setImageDeleted(false)
        setErrors({})
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error('Error creating ad:', error)
        toast({
          title: 'Failed to create ad',
          description: typeof error?.error === 'string' ? error.error : 'Please try again.',
          variant: 'destructive' as any,
        })
      }
    } catch (error) {
      console.error('Error creating ad:', error)
      toast({
        title: 'Failed to create ad',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive' as any,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0d0d0d] border-white/[0.08] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            {isEditMode ? "Edit Ad" : "Create New Ad"}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            {isEditMode 
              ? "Update your advertisement details" 
              : "Create a new advertisement to promote your content"
            }
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
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Ad Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => {
                  handleInputChange('title', e.target.value)
                  if (errors.title) {
                    setErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors.title
                      return newErrors
                    })
                  }
                }}
                placeholder="Enter ad title..."
                className={`bg-white/[0.04] border-white/[0.08] text-white ${errors.title ? 'border-red-500' : ''}`}
                required
              />
              {errors.title && (
                <p className="text-red-400 text-xs mt-1">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Description *
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => {
                  handleInputChange('description', e.target.value)
                  if (errors.description) {
                    setErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors.description
                      return newErrors
                    })
                  }
                }}
                placeholder="Describe your ad..."
                className={`bg-white/[0.04] border-white/[0.08] text-white ${errors.description ? 'border-red-500' : ''}`}
                rows={3}
                required
              />
              {errors.description && (
                <p className="text-red-400 text-xs mt-1">{errors.description}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Category *
              </label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => {
                  handleInputChange('category', value)
                  if (errors.category) {
                    setErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors.category
                      return newErrors
                    })
                  }
                }}
              >
                <SelectTrigger className={`bg-white/[0.04] border-white/[0.08] text-white ${errors.category ? 'border-red-500' : ''}`}>
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
              {errors.category && (
                <p className="text-red-400 text-xs mt-1">{errors.category}</p>
              )}
            </div>

            {/* Link URL */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Link URL *
              </label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-4 w-4" />
                <Input
                  value={formData.link_url}
                  onChange={(e) => {
                    handleInputChange('link_url', e.target.value)
                    if (errors.link_url) {
                      setErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.link_url
                        return newErrors
                      })
                    }
                  }}
                  placeholder="https://example.com"
                  className={`bg-white/[0.04] border-white/[0.08] text-white pl-10 ${errors.link_url ? 'border-red-500' : ''}`}
                  type="url"
                  required
                />
              </div>
              {errors.link_url && (
                <p className="text-red-400 text-xs mt-1">{errors.link_url}</p>
              )}
            </div>

            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Ad Image *
              </label>
              {errors.image && (
                <p className="text-red-400 text-xs mb-2">{errors.image}</p>
              )}
              
              {/* Show existing image preview with delete button when editing and image exists */}
              {isEditMode && formData.image_url && !imageDeleted && !selectedImage ? (
                <div className="p-3 border border-white/[0.08] rounded-lg bg-white/[0.04]">
                  <p className="text-xs text-white/50 mb-2">Current Image:</p>
                  <img
                    src={formData.image_url}
                    alt="Current ad"
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteCurrentImage}
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <X className="h-3 w-3 mr-2" />
                    Delete Image
                  </Button>
                </div>
              ) : (
                <>
                  {/* Show upload box when no existing image or image was deleted */}
                  <FileUpload
                    onFileSelect={handleImageUpload}
                    onFileRemove={() => setSelectedImage(null)}
                    selectedFile={selectedImage}
                    accept="image/*"
                    maxSize={5}
                    className="w-full"
                    purpose="ad"
                  />
                  <p className="mt-1.5 text-xs text-white/45">
                    Recommended 1200×800px (landscape), PNG/JPG/WebP up to 5MB
                  </p>
                  {selectedImage && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {selectedImage.name}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedImage(null)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            
          </motion.div>

          {/* Submit Buttons */}
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
                  {isEditMode ? "Updating Ad..." : "Creating Ad..."}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {isEditMode ? "Update Ad" : "Create Ad"}
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
