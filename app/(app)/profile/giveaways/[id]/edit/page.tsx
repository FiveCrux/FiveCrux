"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Gift,
  Upload,
  Plus,
  X,
  Users,
  Trophy,
  Sparkles,
  ImageIcon,
  Video,
  FileText,
  Clock,
  Target,
  Zap,
  Star,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Textarea } from "@/componentss/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentss/ui/select"
import { Switch } from "@/componentss/ui/switch"
import { Label } from "@/componentss/ui/label"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import { toast } from "sonner"
import FileUpload from "@/componentss/shared/file-upload"
import { CurrencySelect } from "@/componentss/currency-select"

// Animated background particles
const AnimatedParticles = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-yellow-500/30 rounded-full"
          animate={{
            x: [0, Math.random() * 100 - 50],
            y: [0, Math.random() * 100 - 50],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: Math.random() * 4 + 3,
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

export default function EditGiveawayPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const giveawayId = params.id as string

  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - BEFORE ANY CONDITIONAL RETURNS
  const formRef = useRef(null)
  const previewRef = useRef(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    value: "",
    endDate: "",
    featured: false,
    autoAnnounce: true,
    creatorName: session?.user?.name || "",
    creatorEmail: session?.user?.email || "",
    currency: "USD",
    currencySymbol: "$",
  })

  const [requirements, setRequirements] = useState([
    { id: 1, type: "discord", description: "", points: 1, required: true },
  ])

  const [prizes, setPrizes] = useState([{ id: 1, name: "", description: "", value: "", position: 1 }])

  const [media, setMedia] = useState({
    images: [] as (File | string)[],
    videos: [] as (File | string)[],
    coverImage: null as File | string | null,
  })
  const [selectedFiles, setSelectedFiles] = useState({
    coverImage: null as File | null,
    images: [] as File[],
    videos: [] as File[],
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Update form data when session loads
  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        creatorName: session.user?.name || "",
        creatorEmail: session.user?.email || "",
      }))
    }
  }, [session])

  // Fetch giveaway data for editing
  useEffect(() => {
    const fetchGiveaway = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/giveaways/${giveawayId}`)
        
        if (response.ok) {
          const giveaway = await response.json()
          console.log('Fetched giveaway for editing:', giveaway)
          console.log('Giveaway images:', giveaway.images)
          console.log('Giveaway videos:', giveaway.videos)
          console.log('Giveaway cover_image:', giveaway.cover_image)
          
          // Prefill form data
          setFormData({
            title: giveaway.title || "",
            description: giveaway.description || "",
            value: giveaway.total_value || giveaway.totalValue || "",
            endDate: giveaway.end_date || giveaway.endDate || "",
            featured: giveaway.featured || false,
            autoAnnounce: giveaway.auto_announce || giveaway.autoAnnounce || true,
            creatorName: giveaway.creator_name || giveaway.creatorName || session?.user?.name || "",
            creatorEmail: giveaway.creator_email || giveaway.creatorEmail || session?.user?.email || "",
            currency: giveaway.currency || "USD",
            currencySymbol: giveaway.currency_symbol || giveaway.currencySymbol || "$",
          })

          // Prefill requirements
          if (giveaway.requirements && giveaway.requirements.length > 0) {
            setRequirements(giveaway.requirements.map((req: any, index: number) => ({
              id: index + 1,
              type: req.type || "discord",
              description: req.description || "",
              points: req.points || 1,
              required: req.required !== undefined ? req.required : true,
            })))
          }

          // Prefill prizes
          if (giveaway.prizes && giveaway.prizes.length > 0) {
            setPrizes(giveaway.prizes.map((prize: any, index: number) => ({
              id: index + 1,
              name: prize.name || "",
              description: prize.description || "",
              value: prize.value || "",
              position: prize.position || index + 1,
            })))
          }

          // Prefill media
          if (giveaway.images && giveaway.images.length > 0) {
            console.log('Setting images:', giveaway.images)
            setMedia(prev => ({
              ...prev,
              images: giveaway.images,
            }))
          }

          if (giveaway.videos && giveaway.videos.length > 0) {
            console.log('Setting videos:', giveaway.videos)
            setMedia(prev => ({
              ...prev,
              videos: giveaway.videos,
            }))
          }

          if (giveaway.cover_image || giveaway.coverImage) {
            console.log('Setting cover image:', giveaway.cover_image || giveaway.coverImage)
            setMedia(prev => ({
              ...prev,
              coverImage: giveaway.cover_image || giveaway.coverImage,
            }))
          }
        } else {
          console.error('Failed to fetch giveaway:', response.status)
          router.push('/profile')
        }
      } catch (error) {
        console.error('Error fetching giveaway:', error)
        router.push('/profile')
      } finally {
        setLoading(false)
      }
    }

    if (giveawayId) {
      fetchGiveaway()
    }
  }, [giveawayId, session, router])

  // Redirect if not authenticated
  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading giveaway data...</p>
        </div>
      </div>
    )
  }

  const requirementTypes = [
    { value: "discord", label: "Join Discord", icon: "💬" },
    { value: "youtube", label: "Subscribe Youtube", icon: "🎥" }
  ]

  const addRequirement = () => {
    const newId = Math.max(...requirements.map((r) => r.id)) + 1
    setRequirements([...requirements, { id: newId, type: "discord", description: "", points: 1, required: false }])
  }

  const removeRequirement = (id: number) => {
    setRequirements(requirements.filter((r) => r.id !== id))
  }

  const updateRequirement = (id: number, field: string, value: any) => {
    if (field === "description") {
      const requirement = requirements.find((r) => r.id === id)
      // If type is youtube, validate that it's a YouTube URL
      if (requirement?.type === "youtube" && value) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
        if (!youtubeRegex.test(value)) {
          toast.error("Please enter a valid YouTube URL (e.g., https://youtube.com/@channel or https://youtu.be/...)")
          return
        }
      }
    }
    setRequirements(requirements.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const addPrize = () => {
    const newId = Math.max(...prizes.map((p) => p.id)) + 1
    setPrizes([...prizes, { id: newId, name: "", description: "", value: "", position: prizes.length + 1 }])
  }

  const removePrize = (id: number) => {
    setPrizes(prizes.filter((p) => p.id !== id))
  }

  const updatePrize = (id: number, field: string, value: any) => {
    setPrizes(prizes.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate YouTube requirements have valid YouTube URLs
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
      for (const requirement of requirements) {
        if (requirement.type === "youtube" && requirement.description) {
          if (!youtubeRegex.test(requirement.description)) {
            toast.error(`Please enter a valid YouTube URL for the "${requirementTypes.find(t => t.value === requirement.type)?.label}" requirement`)
            setSaving(false)
            return
          }
        }
      }
      // Process media - combine existing URLs with newly uploaded files
      const finalImages: string[] = []
      const finalVideos: string[] = []
      let finalCoverImage: string | null = null

      // Process existing images (URLs) and new images (Files)
      for (const item of media.images) {
        if (typeof item === 'string') {
          // Existing URL
          finalImages.push(item)
        } else {
          // New file - upload it
          const url = await handleFileUpload(item, "image", "screenshot")
          if (url) {
            finalImages.push(url)
          }
        }
      }

      // Process existing videos (URLs) and new videos (Files)
      for (const item of media.videos) {
        if (typeof item === 'string') {
          // Existing URL
          finalVideos.push(item)
        } else {
          // New file - upload it
          const url = await handleFileUpload(item, "video", "demo")
          if (url) {
            finalVideos.push(url)
          }
        }
      }

      // Process cover image
      if (media.coverImage) {
        if (typeof media.coverImage === 'string') {
          // Existing URL
          finalCoverImage = media.coverImage
        } else {
          // New file - upload it
          const url = await handleFileUpload(media.coverImage, "image", "cover")
          if (url) {
            finalCoverImage = url
          }
        }
      }

      const payload = {
        giveaway: {
          title: formData.title,
          description: formData.description,
          total_value: formData.value, // Only numeric value
          currency: formData.currency || "USD",
          currency_symbol: formData.currencySymbol || "$",
          end_date: formData.endDate,
          featured: formData.featured,
          auto_announce: formData.autoAnnounce,
          creator_name: formData.creatorName,
          creator_email: formData.creatorEmail,
          images: finalImages,
          videos: finalVideos,
          cover_image: finalCoverImage,
          tags: [],
          rules: [],
          status: "active",
        },
        requirements,
        prizes,
      };

      const res = await fetch(`/api/giveaways/${giveawayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.needsReapproval) {
          toast.success('Giveaway updated successfully!', {
            description: 'It has been moved to pending status and will require admin approval before going live again.'
          });
        } else {
          toast.success('Giveaway updated successfully!');
        }
        router.push('/profile');
      } else {
        const errorData = await res.json();
        toast.error(`Error updating giveaway: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalPoints = requirements.reduce((sum, req) => sum + req.points, 0)

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
        // Read response as text first (can only read once)
        const textError = await response.text()
        let errorMessage = "Upload failed"
        try {
          // Try to parse as JSON
          const error = JSON.parse(textError)
          errorMessage = error.error || errorMessage
        } catch {
          // If JSON parsing fails, use the text as error message
          errorMessage = textError || errorMessage
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      return result.url
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(`Failed to upload ${type}: ${error instanceof Error ? error.message : "Unknown error"}`)
      return null
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newImages: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (media.images.length + newImages.length >= 10) {
        toast.warning("Maximum 10 images allowed")
        break
      }

      const url = await handleFileUpload(file, "image", "screenshot")
      if (url) {
        newImages.push(url)
      }
    }

    if (newImages.length > 0) {
      setMedia(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }))
    }
  }

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newVideos: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (media.videos.length + newVideos.length >= 5) {
        toast.warning("Maximum 5 videos allowed")
        break
      }

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

  const removeCoverImage = () => {
    setMedia(prev => ({
      ...prev,
      coverImage: null
    }))
  }

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
                "radial-gradient(circle at 20% 50%, rgba(234, 179, 8, 0.05) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.05) 0%, transparent 50%)",
                "radial-gradient(circle at 40% 80%, rgba(234, 179, 8, 0.05) 0%, transparent 50%)",
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
          className="bg-gradient-to-r from-yellow-400/10 to-orange-500/10 py-12 px-4 sm:px-6 lg:px-8 border-b border-gray-800/50"
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
              <Gift className="inline mr-3 text-yellow-400" />
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Edit Giveaway
              </span>
            </motion.h1>
            <motion.p
              className="text-xl text-gray-300 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Set up an exciting giveaway for your community with custom requirements and amazing prizes!
            </motion.p>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <motion.div
              ref={formRef}
              className="lg:col-span-2 space-y-8"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-yellow-400" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="title" className="text-white font-medium">
                        Giveaway Title *
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter an exciting title for your giveaway"
                        className="mt-2 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500"
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
                        placeholder="Describe your giveaway in detail..."
                        rows={4}
                        className="mt-2 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="creatorName" className="text-white font-medium">
                          Creator Name *
                        </Label>
                        <Input
                          id="creatorName"
                          value={formData.creatorName}
                          readOnly
                          className="mt-2 bg-gray-800/50 border-gray-600 text-gray-300 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Automatically filled from your Discord account</p>
                      </div>

                      <div>
                        <Label htmlFor="creatorEmail" className="text-white font-medium">
                          Creator Email *
                        </Label>
                        <Input
                          id="creatorEmail"
                          type="email"
                          value={formData.creatorEmail}
                          readOnly
                          className="mt-2 bg-gray-800/50 border-gray-600 text-gray-300 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Automatically filled from your Discord account</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="value" className="text-white font-medium">
                          Total Value *
                        </Label>
                        <div className="mt-2 flex flex-col gap-2">
                          <CurrencySelect
                            value={formData.currency}
                            onValueChange={(value) =>
                              setFormData({ ...formData, currency: value })
                            }
                            onCurrencySelect={(currency) =>
                              setFormData({
                                ...formData,
                                currency: currency.code,
                                currencySymbol: currency.symbol,
                              })
                            }
                            placeholder="Select currency"
                            disabled={false}
                            currencies="all"
                            variant="default"
                            className="bg-gray-900/50 border-gray-700 text-white"
                          />
                          <Input
                            id="value"
                            type="number"
                            min="0"
                            value={formData.value}
                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            placeholder="150"
                            className="bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="endDate" className="text-white font-medium">
                          End Date *
                        </Label>
                        <Input
                          id="endDate"
                          type="datetime-local"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="mt-2 bg-gray-900/50 border-gray-700 text-white focus:border-yellow-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="featured"
                          checked={formData.featured}
                          onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                        />
                        <Label htmlFor="featured" className="text-white">
                          Featured Giveaway (+$10)
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="autoAnnounce"
                          checked={formData.autoAnnounce}
                          onCheckedChange={(checked) => setFormData({ ...formData, autoAnnounce: checked })}
                        />
                        <Label htmlFor="autoAnnounce" className="text-white">
                          Auto-announce winner
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Entry Requirements */}
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-yellow-400" />
                        Entry Requirements
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        {totalPoints} total points
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {requirements.map((requirement, index) => (
                      <motion.div
                        key={requirement.id}
                        className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-white font-medium">Requirement {index + 1}</h4>
                          <div className="flex items-center gap-2">
                            {requirement.required && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Required</Badge>
                            )}
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
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-white text-sm">Type</Label>
                            <Select
                              value={requirement.type}
                              onValueChange={(value) => updateRequirement(requirement.id, "type", value)}
                            >
                              <SelectTrigger className="mt-1 bg-gray-900/50 border-gray-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-gray-700">
                                {requirementTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-white text-sm">Points</Label>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={requirement.points}
                              onChange={(e) =>
                                updateRequirement(requirement.id, "points", Number.parseInt(e.target.value))
                              }
                              className="mt-1 bg-gray-900/50 border-gray-600 text-white"
                            />
                          </div>

                          <div className="flex items-end">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={requirement.required}
                                onCheckedChange={(checked) => updateRequirement(requirement.id, "required", checked)}
                              />
                              <Label className="text-white text-sm">Required</Label>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <Label className="text-white text-sm">
                            {requirement.type === "discord" 
                              ? "Discord Server Link" 
                              : requirement.type === "youtube"
                              ? "YouTube Channel Link"
                              : "Description"}
                          </Label>
                          <Input
                            type={requirement.type === "youtube" ? "url" : "text"}
                            value={requirement.description}
                            onChange={(e) => updateRequirement(requirement.id, "description", e.target.value)}
                            placeholder={
                              requirement.type === "discord" 
                                ? "https://discord.gg/your-server" 
                                : requirement.type === "youtube"
                                ? "https://youtube.com/@channel or https://youtu.be/..."
                                : "Describe what users need to do..."
                            }
                            className="mt-1 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400"
                          />
                          {requirement.type === "discord" && (
                            <p className="text-xs text-gray-400 mt-1">
                              Enter your Discord server invite link (e.g., https://discord.gg/abc123)
                            </p>
                          )}
                          {requirement.type === "youtube" && (
                            <p className="text-xs text-gray-400 mt-1">
                              Enter your YouTube channel URL (e.g., https://youtube.com/@channel or https://youtu.be/videoId)
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    <Button
                      type="button"
                      onClick={addRequirement}
                      variant="outline"
                      className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-yellow-500"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Requirement
                    </Button>
                  </CardContent>
                </Card>

                {/* Prizes */}
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-400" />
                      Prizes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {prizes.map((prize, index) => (
                      <motion.div
                        key={prize.id}
                        className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-white font-medium">
                            {index === 0
                              ? "🥇 1st Place"
                              : index === 1
                                ? "🥈 2nd Place"
                                : index === 2
                                  ? "🥉 3rd Place"
                                  : `${index + 1}th Place`}
                          </h4>
                          {prizes.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePrize(prize.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-white text-sm">Prize Name</Label>
                            <Input
                              value={prize.name}
                              onChange={(e) => updatePrize(prize.id, "name", e.target.value)}
                              placeholder="Premium Script Bundle"
                              className="mt-1 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400"
                            />
                          </div>

                          <div>
                            <Label className="text-white text-sm">Value</Label>
                            <Input
                              value={prize.value}
                              onChange={(e) => updatePrize(prize.id, "value", e.target.value)}
                              placeholder="$50"
                              className="mt-1 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400"
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <Label className="text-white text-sm">Description</Label>
                          <Textarea
                            value={prize.description}
                            onChange={(e) => updatePrize(prize.id, "description", e.target.value)}
                            placeholder="Describe the prize in detail..."
                            rows={2}
                            className="mt-1 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400"
                          />
                        </div>
                      </motion.div>
                    ))}

                    <Button
                      type="button"
                      onClick={addPrize}
                      variant="outline"
                      className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-yellow-500"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Prize
                    </Button>
                  </CardContent>
                </Card>

                {/* Media Upload */}
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-yellow-400" />
                      Media & Images
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
                        id="cover-upload"
                      />
                      <label
                        htmlFor="cover-upload"
                        className="mt-2 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-yellow-500 transition-colors cursor-pointer block"
                      >
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Click to upload cover image</p>
                        <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                      </label>
                      
                      {/* Display cover image */}
                      {media.coverImage && (
                        <div className="mt-4">
                          <div className="relative group max-w-xs">
                            <img
                              src={typeof media.coverImage === 'string' ? media.coverImage : URL.createObjectURL(media.coverImage)}
                              alt="Cover image"
                              className="w-full h-32 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={removeCoverImage}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-white font-medium">Additional Images</Label>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="mt-2 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-yellow-500 transition-colors cursor-pointer block"
                      >
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Upload additional images</p>
                        <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB each (max 10 images)</p>
                      </label>
                      
                      {/* Display uploaded images */}
                      {media.images.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {media.images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={typeof image === 'string' ? image : URL.createObjectURL(image)}
                                alt={`Image ${index + 1}`}
                                className="w-full h-24 object-cover rounded"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setMedia(prev => ({
                                    ...prev,
                                    images: prev.images.filter((_, i) => i !== index)
                                  }))
                                }}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-white font-medium">Videos (Optional)</Label>
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
                        className="mt-2 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-yellow-500 transition-colors cursor-pointer block"
                      >
                        <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Upload videos</p>
                        <p className="text-sm text-gray-500 mt-2">MP4, WebM up to 4.5 mb each (max 5 videos)</p>
                      </label>
                      
                      {/* Display uploaded videos */}
                      {media.videos.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {media.videos.map((video, index) => (
                            <div key={index} className="relative group">
                              <video
                                src={typeof video === 'string' ? video : URL.createObjectURL(video)}
                                className="w-full h-32 object-cover rounded"
                                controls
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setMedia(prev => ({
                                    ...prev,
                                    videos: prev.videos.filter((_, i) => i !== index)
                                  }))
                                }}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
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
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold py-3 text-lg shadow-lg"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Update Giveaway
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-8 border-gray-600 text-gray-300 hover:text-white hover:border-yellow-500"
                    onClick={() => router.push('/profile')}
                  >
                    Cancel
                  </Button>
                </motion.div>
              </form>
            </motion.div>

            {/* Preview Section */}
            <motion.div
              ref={previewRef}
              className="lg:col-span-1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="sticky top-24 space-y-6">
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      Live Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-500" />
                      </div>

                      <div>
                        <h3 className="text-white font-bold text-lg">{formData.title || "Your Giveaway Title"}</h3>
                        <p className="text-gray-400 text-sm mt-2">
                          {formData.description || "Your giveaway description will appear here..."}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          {formData.value || "$0"} Value
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-white font-semibold text-sm">Requirements:</h4>
                        {requirements.map((req, index) => (
                          <div key={req.id} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-gray-300">
                              {req.description || requirementTypes.find((t) => t.value === req.type)?.label}
                            </span>
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                              {req.points}pt
                            </Badge>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formData.endDate
                              ? `Ends ${new Date(formData.endDate).toLocaleDateString()}`
                              : "End date not set"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                          <Users className="h-4 w-4" />
                          <span>Unlimited entries</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-gray-400">
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span>Use high-quality images to attract more participants</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span>Set reasonable requirements to maximize engagement</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span>Featured giveaways get 3x more visibility</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span>Add multiple prizes to increase excitement</span>
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
