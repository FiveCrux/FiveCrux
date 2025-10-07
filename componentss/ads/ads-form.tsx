"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, Upload, Link, DollarSign, Tag, Calendar, Plus } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Textarea } from "@/componentss/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentss/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/componentss/ui/dialog"
import { Badge } from "@/componentss/ui/badge"
import FileUpload from "@/componentss/shared/file-upload"

interface AdsFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AdsForm({ isOpen, onClose, onSuccess }: AdsFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    link_url: "",
    image_url: "",
    priority: 1,
    status: "pending"
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      const response = await fetch('/api/users/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          image_url: imageUrl
        })
      })

      if (response.ok) {
        onSuccess()
        onClose()
        // Reset form
        setFormData({
          title: "",
          description: "",
          category: "",
          link_url: "",
          image_url: "",
          priority: 1,
          status: "pending"
        })
        setSelectedImage(null)
      } else {
        const error = await response.json()
        console.error('Error creating ad:', error)
        alert('Failed to create ad. Please try again.')
      }
    } catch (error) {
      console.error('Error creating ad:', error)
      alert('Failed to create ad. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Create New Ad</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new advertisement to promote your content
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
            </div>

            {/* Priority */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Priority
              </label>
              <Select 
                value={formData.priority.toString()} 
                onValueChange={(value) => handleInputChange('priority', parseInt(value))}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="1" className="text-white hover:bg-gray-600">Low (1)</SelectItem>
                  <SelectItem value="2" className="text-white hover:bg-gray-600">Medium (2)</SelectItem>
                  <SelectItem value="3" className="text-white hover:bg-gray-600">High (3)</SelectItem>
                </SelectContent>
              </Select>
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
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Ad...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ad
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
        </form>
      </DialogContent>
    </Dialog>
  )
}
