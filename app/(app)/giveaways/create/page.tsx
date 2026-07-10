"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
  Image as ImageLucide,
  CalendarClock,
  AlertCircle,
  Loader2,
  Eye,
  ShieldCheck,
  BadgeCheck,
  Youtube,
} from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Textarea } from "@/componentss/ui/textarea"
import { Badge } from "@/componentss/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentss/ui/select"
import { Switch } from "@/componentss/ui/switch"
import { Label } from "@/componentss/ui/label"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import { toast } from "sonner"
import { DateTimePicker } from "@/componentss/ui/date-time-picker"
import Link from "next/link"

export default function CreateGiveawayPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - BEFORE ANY CONDITIONAL RETURNS
  const formRef = useRef(null)
  const previewRef = useRef(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    endDate: undefined as Date | undefined,
    startDate: undefined as Date | undefined,
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

  const [prizes, setPrizes] = useState([{ id: 1, name: "", numberOfWinners: 1 }])

  const [media, setMedia] = useState({
    images: [] as string[],
    videos: [] as string[],
    coverImage: null as string | null,
  })
  const [youtubeVideoLink, setYoutubeVideoLink] = useState("")
  const [youtubeLinkError, setYoutubeLinkError] = useState("")
  const [selectedFiles, setSelectedFiles] = useState({
    coverImage: null as File | null,
    images: [] as File[],
    videos: [] as File[],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submiting, setSubmitting] = useState(false)
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideos, setUploadingVideos] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)

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

  useEffect(() => {
    if (!isScheduled) {
      setFormData(prev => ({
        ...prev,
        startDate: undefined
      }))
      // Also clear any startDate errors
      if (errors.startDate) {
        setErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors.startDate
          return newErrors
        })
      }
    }
  }, [isScheduled])

  // Redirect if not authenticated
  if (status === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-white"
        style={{ backgroundColor: "#0a0a0a" }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-[#f97316] mr-3" />
        <span className="text-white/60 text-sm font-medium">Loading...</span>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
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

    // Validate creator name (even though it's auto-filled, should still validate)
    if (!formData.creatorName.trim()) {
      newErrors.creatorName = "Creator name is required"
    }

    // Validate creator email (even though it's auto-filled, should still validate)
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

    // Validate cover image
    if (!media.coverImage && !selectedFiles.coverImage) {
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

    setSubmitting(true);
    try {

      const payload = {
        giveaway: {
          title: formData.title,
          description: formData.description,
          total_value: "0", // Deprecated — prizes carry their own info now
          end_date: formData.endDate ? formData.endDate.toISOString() : "",
          start_date: isScheduled && formData.startDate ? formData.startDate.toISOString() : null,
          featured: formData.featured,
          auto_announce: true,
          use_points: usePoints,
          creator_name: formData.creatorName,
          creator_email: formData.creatorEmail,
          images: media.images,
          videos: media.videos,
          cover_image: media.coverImage,
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

      const res = await fetch('/api/giveaways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success('Giveaway created successfully!');
        // Reset form
        setFormData({
          title: "",
          description: "",
          endDate: undefined,
          startDate: undefined,
          featured: false,
          autoAnnounce: true,
          creatorName: session?.user?.name || "",
          creatorEmail: session?.user?.email || "",
        })
        setUsePoints(false)
        setMedia({
          images: [],
          videos: [],
          coverImage: null,
        })
        setSelectedFiles({
          coverImage: null,
          images: [],
          videos: [],
        })
        setYoutubeVideoLink("")
        setYoutubeLinkError("")
        setRequirements([{ id: 1, type: "discord", description: "" }])
        setPrizes([{ id: 1, name: "", numberOfWinners: 1 }])
        setErrors({})
        setIsScheduled(false) // Reset scheduling toggle
        // Route to giveaways page
        router.push('/giveaways');
      } else {
        const error = await res.json();
        toast.error('Error: ' + (error.error || 'Failed to create giveaway'));
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Each requirement = 1 point. In points mode this is the max points a user
  // can collect; otherwise it's just the number of tasks they must complete.
  const totalPoints = requirements.length

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

  // ----- Live preview helpers (presentation only) -----
  const previewTitle = formData.title || "Your Giveaway Title"
  const totalWinners = prizes.reduce((sum, p) => sum + (Number(p.numberOfWinners) || 0), 0)
  const hostName = formData.creatorName || session?.user?.name || "You"
  const hostInitial = (hostName.trim().charAt(0) || "F").toUpperCase()
  const coverPreview = media.coverImage || media.images[0] || null

  const getEndsIn = (): string => {
    if (!formData.endDate) return "End date not set"
    const diff = formData.endDate.getTime() - Date.now()
    if (diff <= 0) return "Ended"
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (days > 0) return `Ends in ${days}d ${hours}h`
    if (hours > 0) return `Ends in ${hours}h ${minutes}m`
    return `Ends in ${minutes}m`
  }

  // Shared input class for the redesigned "field" look
  const fieldClass =
    "bg-[#0e0e0e] border border-white/[0.08] text-white placeholder:text-white/55 rounded-[14px] transition focus:border-[#f97316] focus-visible:ring-[3px] focus-visible:ring-[#f97316]/20"

  // Section header component (inline)
  const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2.5">
      <span className="text-[#f97316]">{icon}</span>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">{title}</h2>
      <div className="h-px flex-1 bg-white/[0.07]" />
    </div>
  )

  return (
    <>
      <Navbar />
      <div
        className="min-h-screen text-white relative overflow-hidden pb-16"
        style={{ backgroundColor: "#0a0a0a" }}
      >
        {/* subtle ambient glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(249, 115, 22, 0.07) 0%, transparent 60%)",
          }}
        />

        {/* Header */}
        <div className="relative max-w-7xl mx-auto pt-24 pb-8 px-4 sm:px-6 lg:px-10">
          <nav className="flex items-center space-x-2 text-[12px] font-medium tracking-wide mb-4">
            <Link href="/" className="text-white/25 hover:text-white transition-colors">
              Home
            </Link>
            <span className="text-white/25">/</span>
            <Link href="/giveaways" className="text-white/25 hover:text-white transition-colors">
              Giveaways
            </Link>
            <span className="text-white/25">/</span>
            <span className="text-white/55">Create</span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f97316]" /> New giveaway
              </span>
              <h1
                className="mt-4 text-[32px] md:text-[36px] font-extrabold tracking-tight text-white flex items-center gap-3"
                style={{ letterSpacing: "-0.5px" }}
              >
                <Gift className="h-8 w-8 text-[#f97316]" />
                <span>
                  <span className="text-[#f97316]">Create</span> Giveaway
                </span>
              </h1>
              <p className="text-[14px] text-white/55 font-medium mt-2 max-w-2xl">
                Set up an exciting giveaway for your community with custom requirements and amazing prizes.
              </p>
            </div>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-2">
          <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
            {/* ============ LEFT · FORM ============ */}
            <div ref={formRef}>
              <form onSubmit={handleSubmit} className="space-y-10">
                {/* ---------- Giveaway details ---------- */}
                <section>
                  <SectionHeader icon={<FileText className="h-4 w-4" />} title="Giveaway details" />
                  <div className="mt-5 space-y-5">
                    <div>
                      <Label htmlFor="title" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        Title *
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
                        className={`mt-2 px-4 py-3 text-[15px] font-medium ${fieldClass} ${errors.title ? 'border-red-500' : ''}`}
                        required
                      />
                      {errors.title && (
                        <p className="text-red-400 text-xs mt-1">{errors.title}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
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
                        className={`mt-2 px-4 py-3 text-sm leading-relaxed ${fieldClass} ${errors.description ? 'border-red-500' : ''}`}
                        required
                      />
                      {errors.description && (
                        <p className="text-red-400 text-xs mt-1">{errors.description}</p>
                      )}
                    </div>

                    {/* Creator name/email (kept; hidden on layout per original) */}
                    <div className=" grid-cols-1 hidden md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="creatorName" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                          Creator Name *
                        </Label>
                        <Input
                          id="creatorName"
                          value={formData.creatorName}
                          readOnly
                          className="mt-2 bg-white/[0.02] border-white/10 text-white/50 cursor-not-allowed rounded-[14px]"
                        />
                        <p className="text-xs text-white/55 mt-1">Automatically filled from your Discord account</p>
                      </div>

                      <div>
                        <Label htmlFor="creatorEmail" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                          Creator Email *
                        </Label>
                        <Input
                          id="creatorEmail"
                          type="email"
                          value={formData.creatorEmail}
                          readOnly
                          className="mt-2 bg-white/[0.02] border-white/10 text-white/50 cursor-not-allowed rounded-[14px]"
                        />
                        <p className="text-xs text-white/55 mt-1">Automatically filled from your Discord account</p>
                      </div>
                    </div>

                  </div>
                </section>

                {/* ---------- Prizes ---------- */}
                <section>
                  <SectionHeader icon={<Trophy className="h-4 w-4" />} title="Prizes" />
                  <div className="mt-5 space-y-4">
                    {prizes.map((prize, index) => (
                      <div
                        key={prize.id}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#f97316]/10 text-[#f97316] text-xs font-bold">
                              {index + 1}
                            </span>
                            <h4 className="text-white font-semibold text-sm">
                              {index === 0
                                ? "1st place"
                                : index === 1
                                  ? "2nd place"
                                  : index === 2
                                    ? "3rd place"
                                    : `${index + 1}th place`}
                            </h4>
                          </div>
                          {prizes.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePrize(prize.id)}
                              className="text-white/55 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4">
                          <div>
                            <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Prize Name</Label>
                            <Input
                              value={prize.name}
                              onChange={(e) => updatePrize(prize.id, "name", e.target.value)}
                              placeholder="Premium Script Bundle"
                              className={`mt-2 px-4 py-2.5 text-sm ${fieldClass}`}
                            />
                          </div>

                          <div>
                            <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Winners</Label>
                            <Input
                              type="number"
                              min="1"
                              value={prize.numberOfWinners || 1}
                              onChange={(e) => updatePrize(prize.id, "numberOfWinners", parseInt(e.target.value) || 1)}
                              placeholder="1"
                              className={`mt-2 px-4 py-2.5 text-sm tabular-nums ${fieldClass}`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addPrize}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f97316] transition hover:text-orange-400"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add prize
                    </button>
                  </div>
                </section>

                {/* ---------- Entry requirements ---------- */}
                <section>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#f97316]"><Target className="h-4 w-4" /></span>
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Entry requirements</h2>
                    <div className="h-px flex-1 bg-white/[0.07]" />
                    <Badge className="bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20 text-[11px] tabular-nums">
                      {totalPoints} {totalPoints === 1 ? "task" : "tasks"}
                    </Badge>
                  </div>

                  {/* Point system toggle */}
                  <div className="mt-5 flex items-start justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5">
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

                  <div className="mt-5 space-y-4">
                    {requirements.map((requirement, index) => (
                      <div
                        key={requirement.id}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-white font-semibold text-sm">Requirement {index + 1}</h4>
                          {requirements.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRequirement(requirement.id)}
                              className="text-white/55 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div>
                          <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Type</Label>
                          <Select
                            value={requirement.type}
                            onValueChange={(value) => updateRequirement(requirement.id, "type", value)}
                          >
                            <SelectTrigger className={`mt-2 ${fieldClass}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#141416] border-white/10">
                              {requirementTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.icon} {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="mt-4">
                          <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
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
                            className={`mt-2 px-4 py-2.5 text-sm ${fieldClass} ${errors[`requirement_${requirement.id}_description`] ? 'border-red-500' : ''}`}
                          />
                          {errors[`requirement_${requirement.id}_description`] && (
                            <p className="text-red-400 text-xs mt-1">{errors[`requirement_${requirement.id}_description`]}</p>
                          )}
                          {!errors[`requirement_${requirement.id}_description`] && requirement.type === "discord" && (
                            <p className="text-xs text-white/55 mt-1">
                              Enter your Discord server invite link (e.g., https://discord.gg/abc123)
                            </p>
                          )}
                          {!errors[`requirement_${requirement.id}_description`] && requirement.type === "youtube" && (
                            <p className="text-xs text-white/55 mt-1">
                              Enter your YouTube channel URL (e.g., https://youtube.com/@channel or https://youtu.be/videoId)
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addRequirement}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f97316] transition hover:text-orange-400"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add requirement
                    </button>
                  </div>
                </section>

                {/* ---------- Media ---------- */}
                <section>
                  <SectionHeader icon={<ImageLucide className="h-4 w-4" />} title="Media" />
                  <div className="mt-5 space-y-5">
                    {/* Cover image */}
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Cover image *</Label>
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
                        className={`mt-2 grid place-items-center rounded-[14px] border border-dashed border-white/[0.12] bg-[#0e0e0e] px-6 py-9 text-center transition ${
                          uploadingCoverImage
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:border-[#f97316]/50 cursor-pointer"
                        }`}
                      >
                        {uploadingCoverImage ? (
                          <>
                            <Loader2 className="h-6 w-6 text-[#f97316] mb-3 animate-spin" />
                            <p className="text-sm text-white/70">Uploading cover image...</p>
                          </>
                        ) : (
                          <>
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                              <Upload className="h-5 w-5 text-white/55" />
                            </div>
                            <p className="mt-3 text-sm font-medium">
                              Click to <span className="text-[#f97316]">browse</span>
                            </p>
                            <p className="mt-1 text-[11px] text-white/55">1280×720 · PNG, JPG up to 5MB</p>
                          </>
                        )}
                      </label>

                      {media.coverImage && (
                        <div className="mt-4">
                          <div className="relative group max-w-xs">
                            <img
                              src={media.coverImage}
                              alt="Cover image"
                              className="w-full h-32 object-cover rounded-xl ring-1 ring-white/10"
                            />
                            <button
                              type="button"
                              onClick={removeCoverImage}
                              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs ring-1 ring-white/15 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional images */}
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Screenshots</Label>
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
                        className={`mt-2 grid place-items-center rounded-[14px] border border-dashed border-white/[0.12] bg-[#0e0e0e] px-6 py-7 text-center transition ${
                          uploadingImages
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:border-[#f97316]/50 cursor-pointer"
                        }`}
                      >
                        {uploadingImages ? (
                          <>
                            <Loader2 className="h-6 w-6 text-[#f97316] mb-3 animate-spin" />
                            <p className="text-sm text-white/70">Uploading images...</p>
                          </>
                        ) : (
                          <>
                            <Plus className="h-5 w-5 text-white/50" />
                            <p className="mt-2 text-sm font-medium">Add screenshots</p>
                            <p className="mt-1 text-[11px] text-white/55">PNG, JPG up to 5MB each (max 10)</p>
                          </>
                        )}
                      </label>

                      {media.images.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {media.images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={typeof image === 'string' ? image : URL.createObjectURL(image)}
                                alt={`Image ${index + 1}`}
                                className="w-full aspect-video object-cover rounded-xl ring-1 ring-white/10"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setMedia(prev => ({
                                    ...prev,
                                    images: prev.images.filter((_, i) => i !== index)
                                  }))
                                }}
                                className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs ring-1 ring-white/15 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Videos */}
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Videos · optional</Label>
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
                        className={`mt-2 grid place-items-center rounded-[14px] border border-dashed border-white/[0.12] bg-[#0e0e0e] px-6 py-7 text-center transition ${
                          uploadingVideos
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:border-[#f97316]/50 cursor-pointer"
                        }`}
                      >
                        {uploadingVideos ? (
                          <>
                            <Loader2 className="h-6 w-6 text-[#f97316] mb-3 animate-spin" />
                            <p className="text-sm text-white/70">Uploading videos...</p>
                          </>
                        ) : (
                          <>
                            <Video className="h-5 w-5 text-white/50" />
                            <p className="mt-2 text-sm font-medium">Upload videos</p>
                            <p className="mt-1 text-[11px] text-white/55">MP4, WebM up to 50MB each (max 5)</p>
                          </>
                        )}
                      </label>

                      {media.videos.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {media.videos.map((video, index) => (
                            <div key={index} className="relative group">
                              <video
                                src={typeof video === 'string' ? video : URL.createObjectURL(video)}
                                className="w-full h-32 object-cover rounded-xl ring-1 ring-white/10"
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
                                className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs ring-1 ring-white/15 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* YouTube link */}
                    <div>
                      <Label htmlFor="youtubeVideoLink" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        YouTube video link · optional
                      </Label>
                      <div className="relative mt-2">
                        <Youtube className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
                        <Input
                          id="youtubeVideoLink"
                          value={youtubeVideoLink}
                          onChange={(e) => {
                            handleYoutubeLinkChange(e.target.value)
                            if (errors.youtubeVideoLink) {
                              setErrors(prev => {
                                const newErrors = { ...prev }
                                delete newErrors.youtubeVideoLink
                                return newErrors
                              })
                            }
                          }}
                          placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                          className={`py-3 pl-11 pr-4 text-sm ${fieldClass} ${errors.youtubeVideoLink ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.youtubeVideoLink && (
                        <p className="text-red-400 text-xs mt-1">{errors.youtubeVideoLink}</p>
                      )}
                      {youtubeLinkError && !errors.youtubeVideoLink && (
                        <p className="text-red-500 text-sm mt-1">{youtubeLinkError}</p>
                      )}
                      <p className="text-xs text-white/55 mt-2">
                        Provide a direct link to a YouTube video showcasing your giveaway.
                      </p>
                    </div>
                  </div>
                </section>

                {/* ---------- Schedule ---------- */}
                <section>
                  <SectionHeader icon={<CalendarClock className="h-4 w-4" />} title="Schedule" />
                  <div className="mt-5 space-y-5">
                    <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold">Schedule this giveaway?</div>
                        <div className="text-xs text-white/55">Set a future start date instead of going live now</div>
                      </div>
                      <Switch
                        checked={isScheduled}
                        onCheckedChange={(checked) => setIsScheduled(checked)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`${isScheduled ? 'block' : 'hidden'}`}>
                        <DateTimePicker
                          date={formData.startDate}
                          onDateChange={(date) => {
                            setFormData({ ...formData, startDate: date })
                            if (errors.startDate) {
                              setErrors(prev => {
                                const newErrors = { ...prev }
                                delete newErrors.startDate
                                return newErrors
                              })
                            }
                          }}
                          label="Start Date*(UTC)"
                          id="startDate"
                          disablePastDates={true}
                        />
                        {errors.startDate && (
                          <p className="text-red-400 text-xs mt-1">{errors.startDate}</p>
                        )}
                      </div>
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
                          label="End Date*(UTC)"
                          id="endDate"
                          disablePastDates={true}
                        />
                        {errors.endDate && (
                          <p className="text-red-400 text-xs mt-1">{errors.endDate}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* ---------- Submit ---------- */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      type="submit"
                      disabled={submiting}
                      className="flex-1 bg-[#f97316] hover:bg-orange-400 text-black font-bold py-3 text-base rounded-xl shadow-lg shadow-[#f97316]/20 transition disabled:opacity-60"
                    >
                      {submiting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating Giveaway...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Create Giveaway
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="px-8 py-3 sm:py-0 border-white/12 bg-transparent text-white/75 hover:text-white hover:bg-white/5 rounded-xl"
                    >
                      Save Draft
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            {/* ============ RIGHT · LIVE PREVIEW ============ */}
            <aside ref={previewRef} className="lg:sticky lg:top-24 lg:self-start">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                <Eye className="h-3.5 w-3.5" /> Live preview
              </div>

              {/* Giveaway card */}
              <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0e0e0e] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
                <div className="relative h-40">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-white/[0.04]">
                      <ImageIcon className="h-10 w-10 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/85 ring-1 ring-white/10 backdrop-blur-md">
                    Giveaway
                  </span>
                  {formData.featured && (
                    <span className="absolute right-3 top-3 rounded-full bg-[#f97316] px-2.5 py-1 text-[11px] font-bold text-black">
                      Featured
                    </span>
                  )}
                </div>

                <div className="px-5 pb-5 pt-4">
                  <h3 className="text-lg font-extrabold leading-tight tracking-tight">{previewTitle}</h3>
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-white/55">
                    {formData.description || "Your giveaway description will appear here..."}
                  </p>

                  {/* Prizes + entry summary */}
                  <div className="mt-4 flex items-end justify-between border-t border-white/[0.06] pt-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">Winners</div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="tabular-nums text-[26px] font-extrabold leading-none tracking-tight">{totalWinners}</span>
                        <span className="text-xs text-white/55">across {prizes.length} {prizes.length === 1 ? "prize" : "prizes"}</span>
                      </div>
                    </div>
                    <Badge className="bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20 tabular-nums">
                      {usePoints ? `up to ${totalPoints}pt` : `${totalPoints} ${totalPoints === 1 ? "task" : "tasks"}`}
                    </Badge>
                  </div>

                  {/* Ends in + entries */}
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4">
                    <div className="flex items-center gap-2 text-sm text-white/55">
                      <Clock className="h-4 w-4 text-[#f97316]" />
                      <span className="tabular-nums">{getEndsIn()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/55 justify-end">
                      <Users className="h-4 w-4" />
                      <span>Unlimited</span>
                    </div>
                  </div>

                  {/* Host */}
                  <div className="mt-4 flex items-center gap-2.5 border-t border-white/[0.06] pt-4">
                    {session?.user?.image ? (
                      <img src={session.user.image} alt={hostName} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#f97316] to-amber-400 text-[11px] font-black text-black">
                        {hostInitial}
                      </span>
                    )}
                    <div className="leading-tight">
                      <div className="flex items-center gap-1 text-[13px] font-semibold">
                        {hostName} <BadgeCheck className="h-3.5 w-3.5 text-[#f97316]" />
                      </div>
                      <div className="text-[11px] text-white/55">Host</div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-white/55">
                <Users className="h-3.5 w-3.5" /> This is exactly how it will appear to entrants.
              </p>

              <div className="mt-4 rounded-2xl border border-[#f97316]/20 bg-[#f97316]/[0.06] px-4 py-3.5">
                <p className="flex items-start gap-2 text-xs leading-relaxed text-white/70">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#f97316]" />
                  All submissions are reviewed by our team before going live.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
