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
  Loader2,
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
import { DateTimePicker } from "@/componentss/ui/date-time-picker"

// Animated background particles
const AnimatedParticles = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(15)].map((_, i) => (
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
    endDate: undefined as Date | undefined,
    featured: false,
    autoAnnounce: true,
    creatorName: session?.user?.name || "",
    creatorEmail: session?.user?.email || "",
  })

  // Entry mode: OFF = must join ALL requirements (equal single entry);
  // ON = each requirement joined earns 1 point, more points = higher win chance.
  const [usePoints, setUsePoints] = useState(false)

  const [requirements, setRequirements] = useState([
    { id: 1, type: "discord", description: "" },
  ])

  // Live "which server is this" preview as the creator types a Discord invite —
  // same resolver the submit API uses, just called client-side for feedback.
  const [discordPreviews, setDiscordPreviews] = useState<Record<number, {
    link: string
    loading: boolean
    serverName?: string
    serverIcon?: string
  }>>({})

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    requirements.forEach((req) => {
      if (req.type !== "discord" || !req.description.trim()) return
      const cached = discordPreviews[req.id]
      if (cached?.link === req.description) return
      const link = req.description
      const timer = setTimeout(async () => {
        setDiscordPreviews((prev) => ({ ...prev, [req.id]: { link, loading: true } }))
        try {
          const res = await fetch(`/api/discord/resolve-invite?link=${encodeURIComponent(link)}`)
          const data = await res.json()
          setDiscordPreviews((prev) => ({
            ...prev,
            [req.id]: { link, loading: false, serverName: data?.serverName || undefined, serverIcon: data?.serverIcon || undefined },
          }))
        } catch {
          setDiscordPreviews((prev) => ({ ...prev, [req.id]: { link, loading: false } }))
        }
      }, 600)
      timers.push(timer)
    })
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirements])

  const [prizes, setPrizes] = useState([{ id: 1, name: "", numberOfWinners: 1 }])

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

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideos, setUploadingVideos] = useState(false)
  const [youtubeVideoLink, setYoutubeVideoLink] = useState("")
  const [youtubeLinkError, setYoutubeLinkError] = useState("")

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
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 15000)
      try {
        setLoading(true)
        const response = await fetch(`/api/giveaways/${giveawayId}`, { signal: c.signal })
        clearTimeout(t)

        if (response.ok) {
          const giveaway = await response.json()
          console.log('Fetched giveaway for editing:', giveaway)
          console.log('Giveaway images:', giveaway.images)
          console.log('Giveaway videos:', giveaway.videos)
          console.log('Giveaway cover_image:', giveaway.cover_image)
          
          // Prefill form data
          const endDateValue = giveaway.end_date || giveaway.endDate
          setFormData({
            title: giveaway.title || "",
            description: giveaway.description || "",
            endDate: endDateValue ? new Date(endDateValue) : undefined,
            featured: giveaway.featured || false,
            autoAnnounce: giveaway.auto_announce || giveaway.autoAnnounce || true,
            creatorName: giveaway.creator_name || giveaway.creatorName || session?.user?.name || "",
            creatorEmail: giveaway.creator_email || giveaway.creatorEmail || session?.user?.email || "",
          })

          // Prefill point-system mode
          setUsePoints(giveaway.use_points ?? giveaway.usePoints ?? false)

          // Prefill requirements
          if (giveaway.requirements && giveaway.requirements.length > 0) {
            setRequirements(giveaway.requirements.map((req: any, index: number) => ({
              id: index + 1,
              type: req.type || "discord",
              description: req.description || "",
            })))
          }

          // Prefill prizes
          if (giveaway.prizes && giveaway.prizes.length > 0) {
            setPrizes(giveaway.prizes.map((prize: any, index: number) => ({
              id: index + 1,
              name: prize.name || "",
              numberOfWinners: prize.numberOfWinners || prize.number_of_winners || 1,
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

          // Prefill YouTube video link
          if (giveaway.youtube_video_link || giveaway.youtubeVideoLink) {
            setYoutubeVideoLink(giveaway.youtube_video_link || giveaway.youtubeVideoLink || "")
          }
        } else {
          console.error('Failed to fetch giveaway:', response.status)
          router.push('/profile')
        }
      } catch (error) {
        console.error('Error fetching giveaway:', error)
        router.push('/profile')
      } finally {
        clearTimeout(t)
        setLoading(false)
      }
    }

    if (giveawayId) {
      fetchGiveaway()
    }
  }, [giveawayId, session, router])

  // Redirect if not authenticated
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-spin" />
          <p className="text-white/60">Loading giveaway data...</p>
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
    setRequirements([...requirements, { id: newId, type: "discord", description: "" }])
  }

  const removeRequirement = (id: number) => {
    setRequirements(requirements.filter((r) => r.id !== id))
  }

  const updateRequirement = (id: number, field: string, value: any) => {
    setRequirements(requirements.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const addPrize = () => {
    const newId = Math.max(...prizes.map((p) => p.id)) + 1
    setPrizes([...prizes, { id: newId, name: "", numberOfWinners: 1 }])
  }

  const removePrize = (id: number) => {
    setPrizes(prizes.filter((p) => p.id !== id))
  }

  const updatePrize = (id: number, field: string, value: any) => {
    setPrizes(prizes.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const validateYouTubeUrl = (url: string): boolean => {
    if (!url.trim()) return true // Empty is valid (optional field)
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    return youtubeRegex.test(url.trim())
  }

  const handleYoutubeLinkChange = (value: string) => {
    setYoutubeVideoLink(value)
    if (value.trim() && !validateYouTubeUrl(value)) {
      setYoutubeLinkError("Please enter a valid YouTube video URL (e.g., https://www.youtube.com/watch?v=...)")
    } else {
      setYoutubeLinkError("")
    }
    // Clear error from errors state
    if (errors.youtubeVideoLink) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.youtubeVideoLink
        return newErrors
      })
    }
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
    } else if (formData.description.trim().length > 2000) {
      newErrors.description = "Description must be less than 2000 characters"
    }

    // Validate creator name
    if (!formData.creatorName.trim()) {
      newErrors.creatorName = "Creator name is required"
    }

    // Validate creator email
    if (!formData.creatorEmail.trim()) {
      newErrors.creatorEmail = "Creator email is required"
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.creatorEmail)) {
        newErrors.creatorEmail = "Please enter a valid email address"
      }
    }

    // Validate end date
    if (!formData.endDate) {
      newErrors.endDate = "End date is required"
    } else {
      const now = new Date()
      if (formData.endDate <= now) {
        newErrors.endDate = "End date must be in the future"
      }
    }

    // Validate cover image (must have existing or new image)
    const hasCoverImage = media.coverImage || selectedFiles.coverImage
    if (!hasCoverImage) {
      newErrors.coverImage = "Cover image is required"
    }

    // Validate image file if selected
    if (selectedFiles.coverImage) {
      const maxSize = 5 * 1024 * 1024 // 5MB in bytes
      if (selectedFiles.coverImage.size > maxSize) {
        newErrors.coverImage = "Cover image size must be less than 5MB"
      }
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      if (!validTypes.includes(selectedFiles.coverImage.type)) {
        newErrors.coverImage = "Cover image must be JPEG, PNG, WebP, or GIF format"
      }
    }

    // Validate requirements
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    const discordRegex = /^(https?:\/\/)?(www\.)?(discord\.(gg|com|io)|discordapp\.com)\/.+/
    
    requirements.forEach((requirement, index) => {
      if (!requirement.description.trim()) {
        newErrors[`requirement_${requirement.id}_description`] = `Requirement ${index + 1} link is required`
      } else if (requirement.type === "youtube" && !youtubeRegex.test(requirement.description.trim())) {
        newErrors[`requirement_${requirement.id}_description`] = `Requirement ${index + 1} must be a valid YouTube URL`
      } else if (requirement.type === "discord" && !discordRegex.test(requirement.description.trim())) {
        newErrors[`requirement_${requirement.id}_description`] = `Requirement ${index + 1} must be a valid Discord invite link`
      }
    })

    // Validate YouTube video link if provided (optional field)
    if (youtubeVideoLink.trim() && !validateYouTubeUrl(youtubeVideoLink)) {
      newErrors.youtubeVideoLink = "Please enter a valid YouTube video URL"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      toast.error("Please fix the errors in the form before submitting.")
      return
    }

    setSaving(true);

    try {
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
          total_value: "0", // Deprecated — prizes carry their own info now
          end_date: formData.endDate ? formData.endDate.toISOString() : "",
          featured: formData.featured,
          auto_announce: formData.autoAnnounce,
          use_points: usePoints,
          creator_name: formData.creatorName,
          creator_email: formData.creatorEmail,
          images: finalImages,
          videos: finalVideos,
          cover_image: finalCoverImage,
          youtube_video_link: youtubeVideoLink.trim() || null,
          tags: [],
          rules: [],
          status: "active",
        },
        // Each requirement earns 1 point. Points-off → all required (must join
        // everything); points-on → optional, and more joined = higher odds.
        requirements: requirements.map((r) => ({
          type: r.type,
          description: r.description,
          link: r.description,
          points: 1,
          required: !usePoints,
        })),
        prizes: prizes.map((p, i) => ({
          name: p.name,
          number_of_winners: p.numberOfWinners || 1,
          position: i + 1,
          value: "0",
        })),
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

  // Each requirement = 1 point. In points mode this is the max points a user
  // can collect; otherwise it's just the number of tasks they must complete.
  const totalPoints = requirements.length
  const totalWinners = prizes.reduce((sum, p) => sum + (Number(p.numberOfWinners) || 0), 0)

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

    setUploadingCoverImage(true)
    try {
      const file = files[0]
      const url = await handleFileUpload(file, "image", "cover")
      if (url) {
        setMedia(prev => ({
          ...prev,
          coverImage: url
        }))
        setSelectedFiles(prev => ({
          ...prev,
          coverImage: file
        }))
        // Clear error when image is uploaded
        if (errors.coverImage) {
          setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.coverImage
            return newErrors
          })
        }
      }
    } finally {
      setUploadingCoverImage(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setUploadingImages(true)
    const newImages: string[] = []
    try {
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
    } finally {
      setUploadingImages(false)
    }
  }

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setUploadingVideos(true)
    const newVideos: string[] = []
    try {
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
    } finally {
      setUploadingVideos(false)
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
      <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
        <AnimatedParticles />

        {/* Ambient background glow */}
        <div className="fixed inset-0 -z-10 bg-[#0a0a0a]">
          <div className="absolute top-0 left-1/4 w-[40rem] h-[40rem] bg-orange-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[35rem] h-[35rem] bg-yellow-500/5 rounded-full blur-[120px]" />
        </div>

        {/* Header */}
        <motion.div
          className="relative py-12 px-4 sm:px-6 lg:px-8 border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-sm"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 mb-5 backdrop-blur"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Gift className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-white/70">Edit Mode</span>
            </motion.div>
            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
                Edit Giveaway
              </span>
            </motion.h1>
            <motion.p
              className="text-base sm:text-xl text-white/60 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Update your community giveaway with custom requirements and amazing prizes!
            </motion.p>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
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
                <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur-xl rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-orange-500" />
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
                        onChange={(e) => {
                          setFormData({ ...formData, title: e.target.value })
                          if (errors.title) {
                            setErrors(prev => {
                              const newErrors = { ...prev }
                              delete newErrors.title
                              return newErrors
                            })
                          }
                        }}
                        placeholder="Enter an exciting title for your giveaway"
                        className={`mt-2 bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 focus:border-orange-500 focus-visible:ring-orange-500/40 ${errors.title ? 'border-red-500' : ''}`}
                        required
                      />
                      {errors.title && (
                        <p className="text-red-400 text-xs mt-1">{errors.title}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-white font-medium">
                        Description *
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => {
                          setFormData({ ...formData, description: e.target.value })
                          if (errors.description) {
                            setErrors(prev => {
                              const newErrors = { ...prev }
                              delete newErrors.description
                              return newErrors
                            })
                          }
                        }}
                        placeholder="Describe your giveaway in detail..."
                        rows={4}
                        className={`mt-2 bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 focus:border-orange-500 focus-visible:ring-orange-500/40 ${errors.description ? 'border-red-500' : ''}`}
                        required
                      />
                      {errors.description && (
                        <p className="text-red-400 text-xs mt-1">{errors.description}</p>
                      )}
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
                          className="mt-2 bg-white/[0.02] border-white/[0.06] text-white/50 cursor-not-allowed"
                        />
                        <p className="text-xs text-white/55 mt-1">Automatically filled from your Discord account</p>
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
                          className="mt-2 bg-white/[0.02] border-white/[0.06] text-white/50 cursor-not-allowed"
                        />
                        <p className="text-xs text-white/55 mt-1">Automatically filled from your Discord account</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <DateTimePicker
                          date={formData.endDate}
                          onDateChange={(date) => {
                            setFormData({ ...formData, endDate: date })
                            if (errors.endDate) {
                              setErrors(prev => {
                                const newErrors = { ...prev }
                                delete newErrors.endDate
                                return newErrors
                              })
                            }
                          }}
                          label="End Date*"
                          id="endDate"
                          disablePastDates={true}
                        />
                        {errors.endDate && (
                          <p className="text-red-400 text-xs mt-1">{errors.endDate}</p>
                        )}
                      </div>
                    </div>

                    {/* <div className="flex items-center justify-between">
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
                    </div> */}
                  </CardContent>
                </Card>

                {/* Prizes & Requirements (combined) */}
                <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur-xl rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-orange-500" />
                      Prizes & Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Prizes</h3>

                    <div className="divide-y divide-white/[0.08]">
                      {prizes.map((prize, index) => (
                        <motion.div
                          key={prize.id}
                          className="py-4 first:pt-0"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-medium">
                              {index === 0
                                ? "1st"
                                : index === 1
                                  ? "2nd"
                                  : index === 2
                                    ? "3rd"
                                    : `${index + 1}th`}
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

                          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4">
                            <div>
                              <Label className="text-white text-sm">Prize Name</Label>
                              <Input
                                value={prize.name}
                                onChange={(e) => updatePrize(prize.id, "name", e.target.value)}
                                placeholder="Premium Script Bundle"
                                className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 focus:border-orange-500 focus-visible:ring-orange-500/40"
                              />
                            </div>

                            <div>
                              <Label className="text-white text-sm">Winners</Label>
                              <Input
                                type="number"
                                min="1"
                                value={prize.numberOfWinners || 1}
                                onChange={(e) => updatePrize(prize.id, "numberOfWinners", parseInt(e.target.value) || 1)}
                                placeholder="1"
                                className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 focus:border-orange-500 focus-visible:ring-orange-500/40"
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      onClick={addPrize}
                      variant="outline"
                      className="w-full bg-white/[0.02] border-white/[0.08] text-white/70 hover:text-white hover:border-orange-500 hover:bg-orange-500/10"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Prize
                    </Button>

                    {/* Entry requirements (same section) */}
                    <div className="mt-8 flex items-center gap-2.5 border-t border-white/[0.08] pt-6">
                      <span className="text-orange-500"><Target className="h-4 w-4" /></span>
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Entry Requirements</h3>
                      <div className="h-px flex-1 bg-white/[0.07]" />
                      <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[11px] tabular-nums">
                        {totalPoints} {totalPoints === 1 ? "task" : "tasks"}
                      </Badge>
                    </div>

                    {/* Point system toggle */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold">Point system (weighted odds)</div>
                        <div className="mt-0.5 text-xs leading-relaxed text-white/55">
                          {usePoints
                            ? "ON — each Discord joined = 1 point. The more a user joins, the higher their chance to win."
                            : "OFF — everyone must join ALL servers to enter, and each entrant has an equal chance."}
                        </div>
                      </div>
                      <Switch checked={usePoints} onCheckedChange={setUsePoints} />
                    </div>

                    <div className="divide-y divide-white/[0.08] border-t border-white/[0.08]">
                      {requirements.map((requirement, index) => (
                        <motion.div
                          key={requirement.id}
                          className="py-4"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-medium">Requirement {index + 1}</h4>
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

                          <div>
                            <Label className="text-white text-sm">Type</Label>
                            <Select
                              value={requirement.type}
                              onValueChange={(value) => updateRequirement(requirement.id, "type", value)}
                            >
                              <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-white focus:ring-orange-500/40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0d0d0f] border-white/[0.08] text-white">
                                {requirementTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                              onChange={(e) => {
                                updateRequirement(requirement.id, "description", e.target.value)
                                if (errors[`requirement_${requirement.id}_description`]) {
                                  setErrors(prev => {
                                    const newErrors = { ...prev }
                                    delete newErrors[`requirement_${requirement.id}_description`]
                                    return newErrors
                                  })
                                }
                              }}
                              placeholder={
                                requirement.type === "discord"
                                  ? "https://discord.gg/your-server"
                                  : requirement.type === "youtube"
                                  ? "https://youtube.com/@channel or https://youtu.be/..."
                                  : "Describe what users need to do..."
                              }
                              className={`mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 focus:border-orange-500 focus-visible:ring-orange-500/40 ${errors[`requirement_${requirement.id}_description`] ? 'border-red-500' : ''}`}
                            />
                            {errors[`requirement_${requirement.id}_description`] && (
                              <p className="text-red-400 text-xs mt-1">{errors[`requirement_${requirement.id}_description`]}</p>
                            )}
                            {!errors[`requirement_${requirement.id}_description`] && requirement.type === "discord" && (
                              <p className="text-xs text-white/55 mt-1">
                                Enter your Discord server invite link (e.g., https://discord.gg/abc123)
                              </p>
                            )}
                            {requirement.type === "discord" && discordPreviews[requirement.id]?.link === requirement.description && (
                              <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                                {discordPreviews[requirement.id].loading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                                    <span className="text-xs text-white/50">Looking up server…</span>
                                  </>
                                ) : discordPreviews[requirement.id].serverName ? (
                                  <>
                                    {discordPreviews[requirement.id].serverIcon ? (
                                      <img src={discordPreviews[requirement.id].serverIcon} alt="" className="h-6 w-6 rounded-full" />
                                    ) : (
                                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[10px] font-bold text-white/60">
                                        {discordPreviews[requirement.id].serverName!.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                    <span className="text-sm font-semibold text-white">{discordPreviews[requirement.id].serverName}</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-red-400">Couldn&apos;t find that server — check the invite link</span>
                                )}
                              </div>
                            )}
                            {!errors[`requirement_${requirement.id}_description`] && requirement.type === "youtube" && (
                              <p className="text-xs text-white/55 mt-1">
                                Enter your YouTube channel URL (e.g., https://youtube.com/@channel or https://youtu.be/videoId)
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      onClick={addRequirement}
                      variant="outline"
                      className="w-full bg-white/[0.02] border-white/[0.08] text-white/70 hover:text-white hover:border-orange-500 hover:bg-orange-500/10"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Requirement
                    </Button>
                  </CardContent>
                </Card>

                {/* Media Upload */}
                <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur-xl rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-orange-500" />
                      Media & Images
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-white font-medium">Cover Image *</Label>
                      {errors.coverImage && (
                        <p className="text-red-400 text-xs mt-1 mb-2">{errors.coverImage}</p>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageUpload}
                        className="hidden"
                        id="cover-upload"
                        disabled={uploadingCoverImage}
                      />
                      <label
                        htmlFor="cover-upload"
                        className={`mt-2 border-2 border-dashed rounded-xl p-8 text-center transition-colors block bg-white/[0.02] ${
                          uploadingCoverImage
                            ? "opacity-50 cursor-not-allowed border-white/[0.08]"
                            : errors.coverImage
                            ? "border-red-500 cursor-pointer"
                            : "border-white/[0.12] hover:border-orange-500 hover:bg-orange-500/[0.04] cursor-pointer"
                        }`}
                      >
                        {uploadingCoverImage ? (
                          <>
                            <Loader2 className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-spin" />
                            <p className="text-orange-400">Uploading cover image...</p>
                          </>
                        ) : (
                          <>
                            <Upload className="h-12 w-12 text-white/55 mx-auto mb-4" />
                            <p className="text-white/60">Click to upload cover image</p>
                            <p className="text-sm text-white/55 mt-2">1280×720 · PNG, JPG up to 5MB</p>
                          </>
                        )}
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
                        disabled={uploadingImages}
                      />
                      <label
                        htmlFor="image-upload"
                        className={`mt-2 border-2 border-dashed border-white/[0.12] rounded-xl p-8 text-center transition-colors block bg-white/[0.02] ${
                          uploadingImages
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:border-orange-500 hover:bg-orange-500/[0.04] cursor-pointer"
                        }`}
                      >
                        {uploadingImages ? (
                          <>
                            <Loader2 className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-spin" />
                            <p className="text-orange-400">Uploading images...</p>
                          </>
                        ) : (
                          <>
                            <Upload className="h-12 w-12 text-white/55 mx-auto mb-4" />
                            <p className="text-white/60">Upload additional images</p>
                            <p className="text-sm text-white/55 mt-2">PNG, JPG up to 5MB each (max 10 images)</p>
                          </>
                        )}
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
                        disabled={uploadingVideos}
                      />
                      <label
                        htmlFor="video-upload"
                        className={`mt-2 border-2 border-dashed border-white/[0.12] rounded-xl p-8 text-center transition-colors block bg-white/[0.02] ${
                          uploadingVideos
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:border-orange-500 hover:bg-orange-500/[0.04] cursor-pointer"
                        }`}
                      >
                        {uploadingVideos ? (
                          <>
                            <Loader2 className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-spin" />
                            <p className="text-orange-400">Uploading videos...</p>
                          </>
                        ) : (
                          <>
                            <Video className="h-12 w-12 text-white/55 mx-auto mb-4" />
                            <p className="text-white/60">Upload videos</p>
                            <p className="text-sm text-white/55 mt-2">MP4, WebM up to 4.5 mb each (max 5 videos)</p>
                          </>
                        )}
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

                    <div>
                      <Label htmlFor="youtubeVideoLink" className="text-white font-medium">
                        YouTube Video Link (Optional)
                      </Label>
                      <Input
                        id="youtubeVideoLink"
                        value={youtubeVideoLink}
                        onChange={(e) => handleYoutubeLinkChange(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                        className={`mt-2 bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 focus:border-orange-500 focus-visible:ring-orange-500/40 ${errors.youtubeVideoLink ? 'border-red-500' : ''}`}
                      />
                      {errors.youtubeVideoLink && (
                        <p className="text-red-400 text-xs mt-1">{errors.youtubeVideoLink}</p>
                      )}
                      {youtubeLinkError && !errors.youtubeVideoLink && (
                        <p className="text-red-500 text-sm mt-1">{youtubeLinkError}</p>
                      )}
                      <p className="text-sm text-white/55 mt-2">
                        Provide a direct link to a YouTube video showcasing your giveaway.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <motion.div className="flex flex-col sm:flex-row gap-4" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-bold py-3 text-lg shadow-lg shadow-orange-500/20"
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
                    className="px-8 bg-white/[0.02] border-white/[0.08] text-white/70 hover:text-white hover:border-orange-500 hover:bg-orange-500/10"
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
                <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur-xl rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-500" />
                      Live Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="aspect-video bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-white/55" />
                      </div>

                      <div>
                        <h3 className="text-white font-bold text-lg">{formData.title || "Your Giveaway Title"}</h3>
                        <p className="text-white/50 text-sm mt-2">
                          {formData.description || "Your giveaway description will appear here..."}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">Winners</div>
                          <div className="mt-1 flex items-baseline gap-1.5">
                            <span className="tabular-nums text-2xl font-bold leading-none">{totalWinners}</span>
                            <span className="text-xs text-white/55">across {prizes.length} {prizes.length === 1 ? "prize" : "prizes"}</span>
                          </div>
                        </div>
                        <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30">
                          {usePoints ? `up to ${totalPoints}pt` : `${totalPoints} ${totalPoints === 1 ? "task" : "tasks"}`}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-white font-semibold text-sm">Requirements:</h4>
                        {requirements.map((req, index) => (
                          <div key={req.id} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-white/70">
                              {req.description || requirementTypes.find((t) => t.value === req.type)?.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-white/[0.08]">
                        <div className="flex items-center gap-2 text-sm text-white/50">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formData.endDate
                              ? `Ends ${formData.endDate.toLocaleDateString()} at ${formData.endDate.toLocaleTimeString()}`
                              : "End date not set"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/50 mt-1">
                          <Users className="h-4 w-4" />
                          <span>Unlimited entries</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur-xl rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-white/50">
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
