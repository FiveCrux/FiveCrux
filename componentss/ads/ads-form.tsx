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
  const isEditMode = !!editData

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
    // You can upload the image here and get the URL
    // For now, we'll just store the file
  }

  const handleDeleteCurrentImage = () => {
    setImageDeleted(true)
    setFormData(prev => ({
      ...prev,
      image_url: ""
    }))
  }

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // First upload image if selected
      let imageUrl = formData.image_url
      if (selectedImage) {
        const formData = new FormData()
        formData.append('file', selectedImage)
        formData.append('folder', 'ads')
        
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
      <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            {isEditMode ? "Edit Ad" : "Create New Ad"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
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
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Ad Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter ad title..."
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Description *
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your ad..."
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Category *
              </label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="scripts" className="text-white hover:bg-gray-600">Scripts</SelectItem>
                  <SelectItem value="giveaways" className="text-white hover:bg-gray-600">Giveaways</SelectItem>
                  <SelectItem value="both" className="text-white hover:bg-gray-600">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Link URL */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Link URL *
              </label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  value={formData.link_url}
                  onChange={(e) => handleInputChange('link_url', e.target.value)}
                  placeholder="https://example.com"
                  className="bg-gray-700 border-gray-600 text-white pl-10"
                  type="url"
                  required
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Ad Image
              </label>
              
              {/* Show existing image preview with delete button when editing and image exists */}
              {isEditMode && formData.image_url && !imageDeleted && !selectedImage ? (
                <div className="p-3 border border-gray-600 rounded-lg bg-gray-700/30">
                  <p className="text-xs text-gray-400 mb-2">Current Image:</p>
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
                    className="w-full border-red-600 text-red-400 hover:bg-red-900/20 hover:text-red-300"
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
                  {selectedImage && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-900/20 text-green-400">
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
            className="flex gap-3 pt-4 border-t border-gray-700"
          >
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
