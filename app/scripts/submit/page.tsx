"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, useInView } from "framer-motion"
import {
  Upload,
  Plus,
  X,
  Code,
  FileText,
  Sparkles,
  ImageIcon,
  Video,
  ExternalLink,
  Package,
  Zap,
  Star,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Tag,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"

// Animated background particles
const AnimatedParticles = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-orange-500/30 rounded-full"
          animate={{
            x: [0, Math.random() * 100 - 50],
            y: [0, Math.random() * 100 - 50],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: Math.random() * 8 + 12,
            repeat: Number.POSITIVE_INFINITY,
            delay: Math.random() * 3,
          }}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  )
}

export default function SubmitScriptPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const scriptId = searchParams.get('edit')

  // All hooks must be called at the top level, before any conditional returns
  const formRef = useRef(null)
  const previewRef = useRef(null)
  const formInView = useInView(formRef, { once: true })
  const previewInView = useInView(previewRef, { once: true })
  
  // State declarations
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoadingScript, setIsLoadingScript] = useState(false)

  // Form state (must be declared before effects that reference setters)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "",
    framework: [] as string[],
    sellerName: "",
    sellerEmail: "",
    demoUrl: "",
    documentationUrl: "",
    supportUrl: "",
    featured: false,
  })

  const [features, setFeatures] = useState([{ id: 1, text: "" }])
  const [requirements, setRequirements] = useState([{ id: 1, text: "" }])
  const [tags, setTags] = useState([{ id: 1, text: "" }])
  const [media, setMedia] = useState<{
    images: string[]
    videos: string[]
    screenshots: string[]
    coverImage: string | null
    thumbnail: string | null
  }>({
    images: [],
    videos: [],
    screenshots: [],
    coverImage: null,
    thumbnail: null,
  })

  // Fetch script data for edit mode (runs after state is initialized)
  useEffect(() => {
    if (scriptId) {
      setIsEditMode(true)
      setIsLoadingScript(true)
      
      const fetchScript = async () => {
        try {
          const response = await fetch(`/api/scripts/${scriptId}`)
          if (response.ok) {
            const script = await response.json()
            
            // Populate form with existing script data
            setFormData({
              title: script.title || "",
              description: script.description || "",
              price: script.price?.toString() || "",
              originalPrice: script.original_price?.toString() || "",
              category: script.category || "",
              framework: Array.isArray(script.framework) ? script.framework : (script.framework ? [script.framework] : []),
              sellerName: script.seller_name || "",
              sellerEmail: script.seller_email || "",
              demoUrl: script.demo_url || "",
              documentationUrl: script.documentation_url || "",
              supportUrl: script.support_url || "",
              featured: script.featured || false,
            })
            
            // Set features
            if (script.features && script.features.length > 0) {
              setFeatures(script.features.map((feature: string, index: number) => ({ id: index + 1, text: feature })))
            }
            
            // Set requirements
            if (script.requirements && script.requirements.length > 0) {
              setRequirements(script.requirements.map((req: string, index: number) => ({ id: index + 1, text: req })))
            }
            
            // Set tags
            if (script.tags && script.tags.length > 0) {
              setTags(script.tags.map((tag: string, index: number) => ({ id: index + 1, text: tag })))
            }
            
            // Set media
            setMedia({
              images: script.images || [],
              videos: script.videos || [],
              screenshots: script.screenshots || [],
              coverImage: script.cover_image || null,
              thumbnail: null,
            })
          } else {
            console.error('Failed to fetch script')
            router.push('/scripts/submit')
          }
        } catch (error) {
          console.error('Error fetching script:', error)
          router.push('/scripts/submit')
        } finally {
          setIsLoadingScript(false)
        }
      }
      
      fetchScript()
    }
  }, [scriptId, router])

  // Check if user has verified_creator role
  const hasVerifiedCreatorRole = session?.user && 
    (session.user as any).roles && 
    (session.user as any).roles.includes('verified_creator')

  // Redirect if not authenticated or doesn't have verified_creator role
  if (status === "loading" || isLoadingScript) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  if (!hasVerifiedCreatorRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-orange-200">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Verified Creator Access Required
              </h1>
              <p className="text-gray-600 mb-6">
                Only verified creators can submit scripts. Please contact an admin to get verified creator access.
              </p>
              <Button 
                onClick={() => router.push('/')}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg"
              >
                Go Back Home
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const scriptCategories = [
    { value: "economy", label: "Economy & Banking" },
    { value: "vehicles", label: "Vehicles & Transportation" },
    { value: "jobs", label: "Jobs & Careers" },
    { value: "housing", label: "Housing & Real Estate" },
    { value: "medical", label: "Medical & Healthcare" },
    { value: "police", label: "Police & Law Enforcement" },
    { value: "utilities", label: "Utilities & Tools" },
    { value: "core", label: "Core & Framework" },
    { value: "ui", label: "UI & Interface" },
    { value: "roleplay", label: "Roleplay & Immersion" },
  ]

  const frameworks = [
    { value: "qbcore", label: "QBCore" },
    { value: "qbox", label: "Qbox" },
    { value: "esx", label: "ESX" },
    { value: "ox", label: "OX" },
    { value: "standalone", label: "Standalone" },
  ]

  const addFeature = () => {
    const newId = Math.max(...features.map((f) => f.id)) + 1
    setFeatures([...features, { id: newId, text: "" }])
  }

  const removeFeature = (id: number) => {
    setFeatures(features.filter((f) => f.id !== id))
  }

  const updateFeature = (id: number, text: string) => {
    setFeatures(features.map((f) => (f.id === id ? { ...f, text } : f)))
  }

  const addRequirement = () => {
    const newId = Math.max(...requirements.map((r) => r.id)) + 1
    setRequirements([...requirements, { id: newId, text: "" }])
  }

  const removeRequirement = (id: number) => {
    setRequirements(requirements.filter((r) => r.id !== id))
  }

  const updateRequirement = (id: number, text: string) => {
    setRequirements(requirements.map((r) => (r.id === id ? { ...r, text } : r)))
  }

  const addTag = () => {
    const newId = Math.max(...tags.map((t) => t.id)) + 1
    setTags([...tags, { id: newId, text: "" }])
  }

  const removeTag = (id: number) => {
    setTags(tags.filter((t) => t.id !== id))
  }

  const updateTag = (id: number, text: string) => {
    setTags(tags.map((t) => (t.id === id ? { ...t, text } : t)))
  }

  const handleFileUpload = async (file: File, type: "image" | "video", purpose: string = "screenshot") => {
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
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const result = await response.json()
      return result.url
    } catch (error) {
      console.error("Upload error:", error)
      alert(`Failed to upload ${type}: ${error instanceof Error ? error.message : "Unknown error"}`)
      return null
    }
  }

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newScreenshots: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (media.screenshots.length + newScreenshots.length >= 10) {
        alert("Maximum 10 screenshots allowed")
        break
      }

      const url = await handleFileUpload(file, "image", "screenshot")
      if (url) {
        newScreenshots.push(url)
      }
    }

    if (newScreenshots.length > 0) {
      setMedia(prev => ({
        ...prev,
        screenshots: [...prev.screenshots, ...newScreenshots]
      }))
    }
  }

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const url = await handleFileUpload(file, "image", "cover")
    if (url) {
      setMedia(prev => ({
        ...prev,
        coverImage: url
      }))
    }
  }

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newVideos: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const url = await handleFileUpload(file, "video", "demo")
      if (url) {
        newVideos.push(url)
      }
    }

    if (newVideos.length > 0) {
      setMedia(prev => ({
        ...prev,
        videos: [...prev.videos, ...newVideos]
      }))
    }
  }

  const removeScreenshot = (index: number) => {
    setMedia(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index)
    }))
  }

  const removeVideo = (index: number) => {
    setMedia(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index)
    }))
  }

  const removeCoverImage = () => {
    setMedia(prev => ({
      ...prev,
      coverImage: null
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const scriptData = {
        ...formData,
        price: Number.parseFloat(formData.price),
        original_price: formData.originalPrice ? Number.parseFloat(formData.originalPrice) : null,
        seller_name: formData.sellerName,
        seller_email: formData.sellerEmail,
        demo_url: formData.demoUrl,
        documentation_url: formData.documentationUrl,
        support_url: formData.supportUrl,
        features: features.filter((f) => f.text.trim()).map((f) => f.text.trim()),
        requirements: requirements.filter((r) => r.text.trim()).map((r) => r.text.trim()),
        tags: tags.filter((t) => t.text.trim()).map((t) => t.text.trim()),
        images: media.images,
        videos: media.videos,
        screenshots: media.screenshots,
        cover_image: media.coverImage,
        status: "pending" as const,
      }

      let response
      if (isEditMode && scriptId) {
        // Update existing script
        console.log('PATCH submit payload', scriptData)
        response = await fetch(`/api/scripts/${scriptId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(scriptData),
        })
        const debugText = await response.clone().text().catch(() => '')
        console.log('PATCH response status', response.status, debugText)
      } else {
        // Create new script
        response = await fetch("/api/scripts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(scriptData),
        })
      }

      if (response.ok) {
        if (isEditMode) {
          alert("Script updated successfully!")
          router.push('/profile')
        } else {
          alert("Script submitted successfully! It will be reviewed before being published.")
          router.push('/profile')
        }
      } else {
        throw new Error(isEditMode ? "Failed to update script" : "Failed to submit script")
      }
    } catch (error) {
      console.error("Error submitting script:", error)
      alert(isEditMode ? "Error updating script. Please try again." : "Error submitting script. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const discount =
    formData.originalPrice && formData.price
      ? Math.round(
          ((Number.parseFloat(formData.originalPrice) - Number.parseFloat(formData.price)) /
            Number.parseFloat(formData.originalPrice)) *
            100,
        )
      : 0

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        <AnimatedParticles />

        {/* Animated background */}
        <div className="fixed inset-0 -z-10">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"
            animate={{
              background: [
                "radial-gradient(circle at 20% 50%, rgba(249, 115, 22, 0.05) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 20%, rgba(234, 179, 8, 0.05) 0%, transparent 50%)",
                "radial-gradient(circle at 40% 80%, rgba(249, 115, 22, 0.05) 0%, transparent 50%)",
              ],
            }}
            transition={{
              duration: 10,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        </div>

        {/* Header */}
        <motion.div
          className="bg-gradient-to-r from-orange-500/10 to-yellow-400/10 py-12 px-4 sm:px-6 lg:px-8 border-b border-gray-800/50"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="max-w-7xl mx-auto text-center">
            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Code className="inline mr-3 text-orange-500" />
              <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
                Submit Your Script
              </span>
            </motion.h1>
            <motion.p
              className="text-xl text-gray-300 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Share your amazing FiveM script with the community and start earning from your creations!
            </motion.p>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <motion.div
              ref={formRef}
              className="lg:col-span-2 space-y-8"
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-orange-500" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="title" className="text-white font-medium">
                        Script Title *
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter your script title"
                        className="mt-2 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-white font-medium">
                        Description *
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe your script in detail..."
                        rows={4}
                        className="mt-2 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category" className="text-white font-medium">
                          Category *
                        </Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger className="mt-2 bg-gray-900/50 border-gray-700 text-white">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            {scriptCategories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-white font-medium">Frameworks *</Label>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {frameworks.map((fw) => {
                            const checked = formData.framework.includes(fw.value)
                            return (
                              <label key={fw.value} className="flex items-center gap-2 text-sm text-gray-200">
                                <input
                                  type="checkbox"
                                  className="accent-orange-500"
                                  checked={checked}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? [...formData.framework, fw.value]
                                      : formData.framework.filter((v) => v !== fw.value)
                                    setFormData({ ...formData, framework: next })
                                  }}
                                />
                                {fw.label}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sellerName" className="text-white font-medium">
                          Your Name *
                        </Label>
                        <Input
                          id="sellerName"
                          value={formData.sellerName}
                          onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                          placeholder="Your display name"
                          className="mt-2 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="sellerEmail" className="text-white font-medium">
                          Email Address *
                        </Label>
                        <Input
                          id="sellerEmail"
                          type="email"
                          value={formData.sellerEmail}
                          onChange={(e) => setFormData({ ...formData, sellerEmail: e.target.value })}
                          placeholder="your@email.com"
                          className="mt-2 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing */}
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-orange-500" />
                      Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="price" className="text-white font-medium">
                          Price (USD) *
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          placeholder="25.99"
                          className="mt-2 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="originalPrice" className="text-white font-medium">
                          Original Price (Optional)
                        </Label>
                        <Input
                          id="originalPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.originalPrice}
                          onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                          placeholder="35.99"
                          className="mt-2 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                        />
                      </div>

                    </div>

                    {discount > 0 && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-green-400 font-semibold">
                            {discount}% Discount - Save $
                            {(Number.parseFloat(formData.originalPrice) - Number.parseFloat(formData.price)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="featured"
                        checked={formData.featured}
                        onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                      />
                      <Label htmlFor="featured" className="text-white">
                        Request Featured Listing (+$20 review fee)
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Features */}
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-500" />
                      Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {features.map((feature, index) => (
                      <motion.div
                        key={feature.id}
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Input
                          value={feature.text}
                          onChange={(e) => updateFeature(feature.id, e.target.value)}
                          placeholder="Describe a key feature..."
                          className="flex-1 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                        />
                        {features.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFeature(feature.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </motion.div>
                    ))}

                    <Button
                      type="button"
                      onClick={addFeature}
                      variant="outline"
                      className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-orange-500"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Feature
                    </Button>
                  </CardContent>
                </Card>

                {/* Requirements */}
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Package className="h-5 w-5 text-orange-500" />
                      Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {requirements.map((requirement, index) => (
                      <motion.div
                        key={requirement.id}
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Input
                          value={requirement.text}
                          onChange={(e) => updateRequirement(requirement.id, e.target.value)}
                          placeholder="e.g., QBCore Framework, MySQL Database..."
                          className="flex-1 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                        />
                        {requirements.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRequirement(requirement.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </motion.div>
                    ))}

                    <Button
                      type="button"
                      onClick={addRequirement}
                      variant="outline"
                      className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-orange-500"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Requirement
                    </Button>
                  </CardContent>
                </Card>

                {/* Tags */}
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Tag className="h-5 w-5 text-orange-500" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {tags.map((tag, index) => (
                      <motion.div
                        key={tag.id}
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Input
                          value={tag.text}
                          onChange={(e) => updateTag(tag.id, e.target.value)}
                          placeholder="e.g., Banking, Economy, ATM..."
                          className="flex-1 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                        />
                        {tags.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTag(tag.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </motion.div>
                    ))}

                    <Button
                      type="button"
                      onClick={addTag}
                      variant="outline"
                      className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-orange-500"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Tag
                    </Button>
                  </CardContent>
                </Card>

                {/* Links */}
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-orange-500" />
                      Links & Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="demoUrl" className="text-white font-medium">
                        Demo URL
                      </Label>
                      <Input
                        id="demoUrl"
                        type="url"
                        value={formData.demoUrl}
                        onChange={(e) => setFormData({ ...formData, demoUrl: e.target.value })}
                        placeholder="https://your-demo-site.com"
                        className="mt-2 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="documentationUrl" className="text-white font-medium">
                        Documentation URL
                      </Label>
                      <Input
                        id="documentationUrl"
                        type="url"
                        value={formData.documentationUrl}
                        onChange={(e) => setFormData({ ...formData, documentationUrl: e.target.value })}
                        placeholder="https://docs.your-script.com"
                        className="mt-2 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="supportUrl" className="text-white font-medium">
                        Support URL
                      </Label>
                      <Input
                        id="supportUrl"
                        type="url"
                        value={formData.supportUrl}
                        onChange={(e) => setFormData({ ...formData, supportUrl: e.target.value })}
                        placeholder="https://discord.gg/your-server"
                        className="mt-2 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Media Upload */}
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-orange-500" />
                      Media & Screenshots
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-white font-medium">Cover Image *</Label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageUpload}
                        className="hidden"
                        id="cover-image-upload"
                      />
                      <label
                        htmlFor="cover-image-upload"
                        className="mt-2 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-orange-500 transition-colors cursor-pointer block"
                      >
                        <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Upload cover image</p>
                        <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB (will be displayed on scripts listing)</p>
                      </label>
                      
                      {/* Display uploaded cover image */}
                      {media.coverImage && (
                        <div className="mt-4">
                          <div className="relative group">
                            <img
                              src={media.coverImage}
                              alt="Cover image"
                              className="w-full h-48 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={removeCoverImage}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-white font-medium">Screenshots *</Label>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                        className="hidden"
                        id="screenshot-upload"
                      />
                      <label
                        htmlFor="screenshot-upload"
                        className="mt-2 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-orange-500 transition-colors cursor-pointer block"
                      >
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Upload script screenshots</p>
                        <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB each (max 10 images)</p>
                      </label>
                      
                      {/* Display uploaded screenshots */}
                      {media.screenshots.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {media.screenshots.map((screenshot, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={screenshot}
                                alt={`Screenshot ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => removeScreenshot(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-white font-medium">Demo Videos (Optional)</Label>
                      <input
                        type="file"
                        multiple
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                        id="video-upload"
                      />
                      <label
                        htmlFor="video-upload"
                        className="mt-2 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-orange-500 transition-colors cursor-pointer block"
                      >
                        <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Upload demo videos</p>
                        <p className="text-sm text-gray-500 mt-2">MP4, MOV up to 50MB each</p>
                      </label>
                      
                      {/* Display uploaded videos */}
                      {media.videos.length > 0 && (
                        <div className="mt-4 space-y-4">
                          {media.videos.map((video, index) => (
                            <div key={index} className="relative group">
                              <video
                                src={video}
                                controls
                                className="w-full rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => removeVideo(index)}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <motion.div className="flex gap-4" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-bold py-3 text-lg shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Settings className="mr-2 h-5 w-5 animate-spin" />
                        {isEditMode ? 'Updating...' : 'Submitting...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        {isEditMode ? 'Update Script' : 'Submit Script'}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-8 border-gray-600 text-gray-300 hover:text-white hover:border-orange-500"
                  >
                    Save Draft
                  </Button>
                </motion.div>
              </form>
            </motion.div>

            {/* Preview Section */}
            <motion.div
              ref={previewRef}
              className="lg:col-span-1"
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="sticky top-24 space-y-6">
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-500" />
                      Live Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Screenshots Preview */}
                      {media.screenshots.length > 0 ? (
                        <div className="aspect-video bg-gray-700 rounded-lg overflow-hidden">
                          <img
                            src={media.screenshots[0]}
                            alt="Main screenshot"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-gray-500" />
                        </div>
                      )}
                      
                      {/* Additional Screenshots */}
                      {media.screenshots.length > 1 && (
                        <div className="grid grid-cols-3 gap-2">
                          {media.screenshots.slice(1, 4).map((screenshot, index) => (
                            <div key={index} className="aspect-square bg-gray-700 rounded-lg overflow-hidden">
                              <img
                                src={screenshot}
                                alt={`Screenshot ${index + 2}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {media.screenshots.length > 4 && (
                            <div className="aspect-square bg-gray-700 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-sm">+{media.screenshots.length - 4}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <h3 className="text-white font-bold text-lg">{formData.title || "Your Script Title"}</h3>
                        <p className="text-gray-400 text-sm mt-2">
                          {formData.description || "Your script description will appear here..."}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-orange-500 font-bold text-xl">${formData.price || "0.00"}</span>
                          {formData.originalPrice && (
                            <span className="text-gray-500 line-through text-sm">${formData.originalPrice}</span>
                          )}
                        </div>
                        {discount > 0 && <Badge className="bg-red-500 text-white">-{discount}%</Badge>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {formData.category && (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                            {scriptCategories.find((c) => c.value === formData.category)?.label}
                          </Badge>
                        )}
                        {formData.framework && formData.framework.length > 0 && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {formData.framework.map(fw => frameworks.find((f) => f.value === fw)?.label).filter(Boolean).join(', ')}
                          </Badge>
                        )}
                        {formData.featured && <Badge className="bg-yellow-500 text-black">Featured</Badge>}
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-white font-semibold text-sm">Features:</h4>
                        {features
                          .filter((f) => f.text.trim())
                          .map((feature, index) => (
                            <div key={feature.id} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-gray-300">{feature.text}</span>
                            </div>
                          ))}
                      </div>

                      <div className="pt-4 border-t border-gray-700">
                        <div className="text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            <span>By {formData.sellerName || "Your Name"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      Submission Guidelines
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-gray-400">
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span>All scripts are reviewed before publication</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span>Include clear screenshots and documentation</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span>Review process takes 1-3 business days</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span>We take 15% commission on sales</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
