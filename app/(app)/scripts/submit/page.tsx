"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFrameworks } from "@/lib/use-frameworks"
import {
  Upload,
  Plus,
  X,
  FileText,
  Sparkles,
  ImageIcon,
  Video,
  Package,
  Tag,
  ListChecks,
  Store,
  Eye,
  Youtube,
  Link as LinkIcon,
  Info,
  ShieldCheck,
  Users,
  BadgeCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Textarea } from "@/componentss/ui/textarea"
import { Badge } from "@/componentss/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentss/ui/select"
import { Switch } from "@/componentss/ui/switch"
import { Label } from "@/componentss/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/componentss/ui/popover"
import { Checkbox } from "@/componentss/ui/checkbox"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import { toast } from "sonner"
import { CurrencySelect, type Currency } from "@/componentss/currency-select"
import * as countryData from "country-data-list"

export default function SubmitScriptPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const scriptId = searchParams.get('edit')

  // All hooks must be called at the top level, before any conditional returns
  const formRef = useRef(null)
  const previewRef = useRef(null)

  // State declarations
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoadingScript, setIsLoadingScript] = useState(false)
  const [isFree, setIsFree] = useState(false)
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false)
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false)
  const [uploadingVideos, setUploadingVideos] = useState(false)

  // Form state (must be declared before effects that reference setters)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "",
    framework: [] as string[],
    sellerName: session?.user?.name || "",
    sellerEmail: session?.user?.email || "",
    featured: false,
    currency: "",
    currencySymbol: "",
    tebexStoreToken: "",
    tebexPackageId: "",
  })

  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)

  // Dynamic categories (DB-managed) for the category dropdown.
  const [scriptCategories, setScriptCategories] = useState<{ value: string; label: string }[]>([])
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d) =>
          Array.isArray(d?.categories) &&
          setScriptCategories(d.categories.map((c: any) => ({ value: c.slug, label: c.name })))
      )
      .catch(() => {})
  }, [])

  // Dynamic frameworks (DB-managed) for the framework picker.
  const frameworks = useFrameworks()

  const [features, setFeatures] = useState([{ id: 1, text: "" }])
  const [requirements, setRequirements] = useState([{ id: 1, text: "" }])
  const [otherLinks, setOtherLinks] = useState([{ id: 1, text: "" }])
  const [link, setLink] = useState("")
  const [youtubeVideoLink, setYoutubeVideoLink] = useState("")
  const [youtubeLinkError, setYoutubeLinkError] = useState("")
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

  // Update form data when session loads
  useEffect(() => {
    if (session?.user && !isEditMode) {
      setFormData(prev => ({
        ...prev,
        sellerName: session.user?.name || "",
        sellerEmail: session.user?.email || "",
      }))
    }
  }, [session, isEditMode])

  // Fetch script data for edit mode (runs after state is initialized)
  useEffect(() => {
    if (scriptId) {
      setIsEditMode(true)
      setIsLoadingScript(true)

      const fetchScript = async () => {
        const c = new AbortController()
        const t = setTimeout(() => c.abort(), 15000)
        try {
          const response = await fetch(`/api/scripts/${scriptId}`, { signal: c.signal })
          clearTimeout(t)
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
              featured: script.featured || false,
              currency: script.currency || "",
              currencySymbol: script.currency_symbol || "",
              tebexStoreToken: script.tebexStoreToken || script.tebex_store_token || "",
              tebexPackageId: script.tebexPackageId || script.tebex_package_id || "",
            })

            // Set selected currency if it exists
            if (script.currency) {
              const currency = countryData.currencies.all.find((c: any) => c.code === script.currency)
              if (currency) {
                setSelectedCurrency({
                  code: currency.code || "",
                  name: currency.name || "",
                  symbol: (currency as any).symbol || currency.code || "",
                })
              }
            }

            // Set features
            if (script.features && script.features.length > 0) {
              setFeatures(script.features.map((feature: string, index: number) => ({ id: index + 1, text: feature })))
            }

            // Set requirements
            if (script.requirements && script.requirements.length > 0) {
              setRequirements(script.requirements.map((req: string, index: number) => ({ id: index + 1, text: req })))
            }

            // Set link
            if (script.link) {
              setLink(script.link)
            }

            // Set other links
            if (script.other_links && script.other_links.length > 0) {
              setOtherLinks(script.other_links.map((link: string, index: number) => ({ id: index + 1, text: link })))
            } else {
              setOtherLinks([{ id: 1, text: "" }])
            }

            // Set YouTube video link
            if (script.youtube_video_link) {
              setYoutubeVideoLink(script.youtube_video_link)
            }

            // Set media
            setMedia({
              images: script.images || [],
              videos: script.videos || [],
              screenshots: script.screenshots || [],
              coverImage: script.cover_image || null,
              thumbnail: null,
            })

            // Set free status from database
            setIsFree(script.free === true || script.free === 1)
          } else {
            console.error('Failed to fetch script')
            router.push('/scripts/submit')
          }
        } catch (error) {
          console.error('Error fetching script:', error)
          router.push('/scripts/submit')
        } finally {
          clearTimeout(t)
          setIsLoadingScript(false)
        }
      }

      fetchScript()
    }
  }, [scriptId, router])

  // Redirect if not authenticated
  if (status === "loading" || isLoadingScript) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="flex items-center gap-3 text-gray-300">
          <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

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

  const addOtherLink = () => {
    const newId = Math.max(...otherLinks.map((l) => l.id)) + 1
    setOtherLinks([...otherLinks, { id: newId, text: "" }])
  }

  const removeOtherLink = (id: number) => {
    setOtherLinks(otherLinks.filter((l) => l.id !== id))
  }

  const updateOtherLink = (id: number, text: string) => {
    setOtherLinks(otherLinks.map((l) => (l.id === id ? { ...l, text } : l)))
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

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setUploadingScreenshots(true)
    const newScreenshots: string[] = []
    try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (media.screenshots.length + newScreenshots.length >= 10) {
        toast.warning("Maximum 10 screenshots allowed")
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
    } finally {
      setUploadingScreenshots(false)
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
      }
    } finally {
      setUploadingCoverImage(false)
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

  // Validate YouTube URL
  const validateYouTubeUrl = (url: string): boolean => {
    if (!url.trim()) return true

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    return youtubeRegex.test(url)
  }

  const handleYoutubeLinkChange = (value: string) => {
    setYoutubeVideoLink(value)
    if (value.trim() && !validateYouTubeUrl(value)) {
      setYoutubeLinkError("Please enter a valid YouTube URL (youtube.com or youtu.be)")
    } else {
      setYoutubeLinkError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate YouTube link if provided
    if (youtubeVideoLink.trim() && !validateYouTubeUrl(youtubeVideoLink)) {
      setYoutubeLinkError("Please enter a valid YouTube URL (youtube.com or youtu.be)")
      toast.error("Please fix the YouTube video link before submitting")
      return
    }

    setIsSubmitting(true)

    try {
      const scriptData = {
        ...formData,
        price: isFree ? 0 : Number.parseFloat(formData.price),
        original_price: isFree ? null : (formData.originalPrice ? Number.parseFloat(formData.originalPrice) : null),
        currency: isFree ? null : (formData.currency || null),
        currency_symbol: isFree ? null : (formData.currencySymbol || null),
        free: isFree,
        seller_name: formData.sellerName,
        seller_email: formData.sellerEmail,
        features: features.filter((f) => f.text.trim()).map((f) => f.text.trim()),
        requirements: requirements.filter((r) => r.text.trim()).map((r) => r.text.trim()),
        link: link.trim() || null,
        other_links: otherLinks.filter((l) => l.text.trim()).map((l) => l.text.trim()),
        images: media.images,
        videos: media.videos,
        screenshots: media.screenshots,
        cover_image: media.coverImage,
        youtube_video_link: youtubeVideoLink.trim() || null,
        // Tebex Headless integration (per-seller webstore). Optional; null until linked.
        tebexStoreToken: formData.tebexStoreToken.trim() || null,
        tebexPackageId: formData.tebexPackageId.trim() || null,
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
          toast.success("Script updated successfully!")
          router.push('/profile')
        } else {
          toast.success("Script submitted successfully!", {
            description: "It will be reviewed before being published."
          })
          router.push('/profile')
        }
      } else {
        throw new Error(isEditMode ? "Failed to update script" : "Failed to submit script")
      }
    } catch (error) {
      console.error("Error submitting script:", error)
      toast.error(isEditMode ? "Error updating script. Please try again." : "Error submitting script. Please try again.")
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

  // ---- Live preview derived values (bound to existing form state) ----
  const previewCurrencySymbol = selectedCurrency?.symbol || formData.currencySymbol || "$"
  const previewCover = media.coverImage || media.screenshots[0] || null
  const previewFrameworks = formData.framework
    .map((fw) => frameworks.find((f) => f.value === fw)?.label)
    .filter(Boolean) as string[]
  const previewCategoryLabel = scriptCategories.find((c) => c.value === formData.category)?.label
  const previewSellerInitial = (formData.sellerName || "?").trim().charAt(0).toUpperCase() || "?"

  // ---- Shared field className matching the approved Live Preview design ----
  const fieldClass =
    "bg-[#0e0e0e] border border-white/[0.08] rounded-[14px] text-white placeholder:text-white/55 focus:border-orange-500 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 transition-colors"

  // Reusable labeled section header
  const SectionHeader = ({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) => (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-orange-500" />
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">{title}</h2>
      <div className="h-px flex-1 bg-white/[0.07]" />
    </div>
  )

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                {isEditMode ? "Edit · Live Preview" : "New listing · Live Preview"}
              </span>
              <h1 className="mt-4 text-[28px] font-extrabold leading-none tracking-tight sm:text-[34px]">
                {isEditMode ? "Edit script listing" : "New script listing"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-white/[0.12] bg-transparent px-5 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/5 hover:text-white"
              >
                Save draft
              </Button>
              <Button
                type="submit"
                form="submit-script-form"
                disabled={isSubmitting}
                className="group inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-bold text-black hover:bg-orange-400 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Submitting..."}
                  </>
                ) : (
                  <>
                    {isEditMode ? "Update listing" : "Submit for review"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_400px]">
            {/* ============ LEFT · FORM ============ */}
            <div ref={formRef}>
              <form id="submit-script-form" onSubmit={handleSubmit} className="space-y-10">
                {/* ---------------- Basics ---------------- */}
                <section>
                  <SectionHeader icon={FileText} title="Basics" />
                  <div className="mt-5 space-y-5">
                    <div>
                      <Label htmlFor="title" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        Title *
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter your script title"
                        className={cn("mt-2 w-full px-4 py-3 text-[15px] font-medium h-auto", fieldClass)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        Short description *
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe your script in detail..."
                        rows={3}
                        className={cn("mt-2 w-full px-4 py-3 text-sm leading-relaxed text-white/85", fieldClass)}
                        required
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="category" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                          Category *
                        </Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger className={cn("mt-2 px-4 py-3 text-sm h-auto", fieldClass)}>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0d0d0f] border-white/[0.08] text-white">
                            {scriptCategories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                          Framework *
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "mt-2 w-full justify-between px-4 py-3 text-sm h-auto hover:text-white",
                                fieldClass,
                                "hover:bg-white/[0.04]",
                                formData.framework.length === 0 && "text-white/55"
                              )}
                            >
                              {formData.framework.length > 0
                                ? `${formData.framework.length} framework${formData.framework.length > 1 ? 's' : ''} selected`
                                : "Select frameworks"}
                              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[220px] p-0 bg-[#0d0d0f] border-white/[0.08]" align="start">
                            <div className="p-2 space-y-2">
                              {frameworks.map((fw) => {
                                const checked = formData.framework.includes(fw.value)
                                return (
                                  <label
                                    key={fw.value}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.06] cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(checked) => {
                                        const next = checked
                                          ? [...formData.framework, fw.value]
                                          : formData.framework.filter((v) => v !== fw.value)
                                        setFormData({ ...formData, framework: next })
                                      }}
                                      className="border-white/[0.2] data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                    />
                                    <span className="text-sm text-white">{fw.label}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {formData.framework.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {formData.framework.map((fwValue) => {
                              const fw = frameworks.find((f) => f.value === fwValue)
                              return fw ? (
                                <Badge
                                  key={fwValue}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-orange-500"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  {fw.label}
                                </Badge>
                              ) : null
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Seller name / email (auto-filled, hidden as in original) */}
                    <div className="grid-cols-1 hidden md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sellerName" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                          Your Name *
                        </Label>
                        <Input
                          id="sellerName"
                          value={formData.sellerName}
                          readOnly
                          className={cn("mt-2 text-gray-400 cursor-not-allowed h-auto px-4 py-3", fieldClass)}
                        />
                        <p className="text-xs text-gray-500 mt-1">Automatically filled from your Discord account</p>
                      </div>

                      <div>
                        <Label htmlFor="sellerEmail" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                          Email Address *
                        </Label>
                        <Input
                          id="sellerEmail"
                          type="email"
                          value={formData.sellerEmail}
                          readOnly
                          className={cn("mt-2 text-gray-400 cursor-not-allowed h-auto px-4 py-3", fieldClass)}
                        />
                        <p className="text-xs text-gray-500 mt-1">Automatically filled from your Discord account</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ---------------- Media ---------------- */}
                <section>
                  <SectionHeader icon={ImageIcon} title="Media" />
                  <div className="mt-5 space-y-5">
                    {/* Cover image */}
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Cover image *</Label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageUpload}
                        className="hidden"
                        id="cover-image-upload"
                        disabled={uploadingCoverImage}
                      />
                      <label
                        htmlFor="cover-image-upload"
                        className={cn(
                          "mt-2 grid place-items-center rounded-[14px] border border-dashed border-white/[0.12] bg-[#0e0e0e] px-6 py-9 text-center transition-colors block",
                          uploadingCoverImage ? "opacity-50 cursor-not-allowed" : "hover:border-orange-500/50 cursor-pointer"
                        )}
                      >
                        {uploadingCoverImage ? (
                          <>
                            <Loader2 className="mx-auto h-11 w-11 animate-spin text-orange-500" />
                            <p className="mt-3 text-sm font-medium text-orange-400">Uploading cover image...</p>
                          </>
                        ) : (
                          <>
                            <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                              <Upload className="h-5 w-5 text-white/55" />
                            </div>
                            <p className="mt-3 text-sm font-medium">
                              Drag &amp; drop or <span className="text-orange-500">browse</span>
                            </p>
                            <p className="mt-1 text-[11px] text-white/55">1280×720 · PNG/JPG up to 5MB</p>
                          </>
                        )}
                      </label>

                      {media.coverImage && (
                        <div className="mt-4">
                          <div className="relative group">
                            <img
                              src={media.coverImage}
                              alt="Cover image"
                              className="w-full h-48 object-cover rounded-xl ring-1 ring-white/10"
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

                    {/* Screenshots */}
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Screenshots *</Label>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                        className="hidden"
                        id="screenshot-upload"
                        disabled={uploadingScreenshots}
                      />
                      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {media.screenshots.map((screenshot, index) => (
                          <div key={index} className="relative group aspect-video overflow-hidden rounded-xl ring-1 ring-white/10">
                            <img
                              src={screenshot}
                              alt={`Screenshot ${index + 1}`}
                              className="h-full w-full object-cover"
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
                        <label
                          htmlFor="screenshot-upload"
                          className={cn(
                            "grid aspect-video place-items-center rounded-xl border border-dashed border-white/[0.12] text-white/55 transition-colors",
                            uploadingScreenshots ? "opacity-50 cursor-not-allowed" : "hover:border-orange-500/50 hover:text-white/70 cursor-pointer"
                          )}
                        >
                          {uploadingScreenshots ? (
                            <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                          ) : (
                            <Plus className="h-5 w-5" />
                          )}
                        </label>
                      </div>
                      <p className="mt-2 text-[11px] text-white/55">PNG, JPG up to 5MB each (max 10 images)</p>
                    </div>

                    {/* Demo videos */}
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Demo videos · optional</Label>
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
                        className={cn(
                          "mt-2 grid place-items-center rounded-[14px] border border-dashed border-white/[0.12] bg-[#0e0e0e] px-6 py-6 text-center transition-colors block",
                          uploadingVideos ? "opacity-50 cursor-not-allowed" : "hover:border-orange-500/50 cursor-pointer"
                        )}
                      >
                        {uploadingVideos ? (
                          <>
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
                            <p className="mt-2 text-sm text-orange-400">Uploading videos...</p>
                          </>
                        ) : (
                          <>
                            <Video className="mx-auto h-8 w-8 text-white/55" />
                            <p className="mt-2 text-sm font-medium">Upload demo videos</p>
                            <p className="mt-1 text-[11px] text-white/55">MP4, MOV up to 4.5MB each</p>
                          </>
                        )}
                      </label>

                      {media.videos.length > 0 && (
                        <div className="mt-4 space-y-4">
                          {media.videos.map((video, index) => (
                            <div key={index} className="relative group">
                              <video src={video} controls className="w-full rounded-xl ring-1 ring-white/10" />
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

                    {/* YouTube preview */}
                    <div>
                      <Label htmlFor="youtube-video-link" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        YouTube preview · optional
                      </Label>
                      <div className="relative mt-2">
                        <Youtube className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
                        <Input
                          id="youtube-video-link"
                          type="url"
                          value={youtubeVideoLink}
                          onChange={(e) => handleYoutubeLinkChange(e.target.value)}
                          placeholder="https://youtube.com/watch?v=…"
                          className={cn(
                            "w-full py-3 pl-11 pr-4 text-sm h-auto",
                            fieldClass,
                            youtubeLinkError && "border-red-500 focus:border-red-500"
                          )}
                        />
                      </div>
                      {youtubeLinkError && <p className="mt-1 text-sm text-red-400">{youtubeLinkError}</p>}
                    </div>
                  </div>
                </section>

                {/* ---------------- Pricing ---------------- */}
                <section>
                  <SectionHeader icon={Tag} title="Pricing" />
                  <div className="mt-5 space-y-5">
                    {/* Free toggle */}
                    <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold">Free download</div>
                        <div className="text-xs text-white/55">Release at no cost</div>
                      </div>
                      <Switch
                        id="isFree"
                        checked={isFree}
                        onCheckedChange={(checked) => {
                          setIsFree(checked)
                          if (checked) {
                            // Clear price and currency when setting to free
                            setFormData({
                              ...formData,
                              price: "0",
                              originalPrice: "",
                              currency: "",
                              currencySymbol: ""
                            })
                            setSelectedCurrency(null)
                          }
                        }}
                      />
                    </div>

                    {/* Currency */}
                    <div className={cn("transition-opacity", isFree && "opacity-50 pointer-events-none")}>
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Currency *</Label>
                      <div className="mt-2">
                        <CurrencySelect
                          value={formData.currency}
                          onValueChange={(value) => {
                            const currency = countryData.currencies.all.find((c: any) => c.code === value)
                            setFormData({
                              ...formData,
                              currency: value,
                              currencySymbol: (currency as any)?.symbol || currency?.code || ""
                            })
                          }}
                          onCurrencySelect={(currency) => {
                            setSelectedCurrency(currency)
                            setFormData({
                              ...formData,
                              currency: currency.code,
                              currencySymbol: currency.symbol
                            })
                          }}
                          placeholder="Select currency"
                          disabled={isFree}
                          currencies="all"
                          variant="default"
                          className={cn(
                            "bg-[#0e0e0e] border-white/[0.08] text-white",
                            isFree && "cursor-not-allowed opacity-50"
                          )}
                        />
                      </div>
                    </div>

                    {/* Price / Original */}
                    <div className={cn("grid gap-5 sm:grid-cols-2 transition-opacity", isFree && "opacity-50 pointer-events-none")}>
                      <div>
                        <Label htmlFor="price" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                          Price *
                        </Label>
                        <div className={cn("mt-2 flex items-center px-4", fieldClass)}>
                          <span className="text-sm text-white/55">{previewCurrencySymbol}</span>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            placeholder="25.99"
                            className="w-full border-0 bg-transparent py-3 pl-2 text-[15px] font-semibold tabular-nums shadow-none focus-visible:ring-0 h-auto px-0"
                            required={!isFree}
                            disabled={isFree || !selectedCurrency}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="originalPrice" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                          Original · optional
                        </Label>
                        <div className={cn("mt-2 flex items-center px-4", fieldClass)}>
                          <span className="text-sm text-white/55">{previewCurrencySymbol}</span>
                          <Input
                            id="originalPrice"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.originalPrice}
                            onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                            placeholder="35.99"
                            className="w-full border-0 bg-transparent py-3 pl-2 text-[15px] font-medium tabular-nums text-white/70 shadow-none focus-visible:ring-0 h-auto px-0"
                            disabled={isFree || !selectedCurrency}
                          />
                        </div>
                      </div>
                    </div>

                    {discount > 0 && !isFree && (
                      <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-semibold text-green-400">
                          {discount}% Discount · Save {previewCurrencySymbol}
                          {(Number.parseFloat(formData.originalPrice) - Number.parseFloat(formData.price)).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                {/* ---------------- Details ---------------- */}
                <section>
                  <SectionHeader icon={ListChecks} title="Details" />
                  <div className="mt-5 space-y-5">
                    {/* Features */}
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Features</Label>
                      <div className="mt-2 space-y-2">
                        {features.map((feature) => (
                          <div key={feature.id} className="flex items-center gap-2">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-500">
                              <CheckCircle className="h-4 w-4" />
                            </span>
                            <Input
                              value={feature.text}
                              onChange={(e) => updateFeature(feature.id, e.target.value)}
                              placeholder="Describe a key feature..."
                              className={cn("w-full px-4 py-2.5 text-sm h-auto", fieldClass)}
                            />
                            {features.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeFeature(feature.id)}
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/55 transition-colors hover:bg-white/5 hover:text-white/70"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addFeature}
                        className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 transition-colors hover:text-orange-400"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add feature
                      </button>
                    </div>

                    {/* Requirements */}
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Requirements</Label>
                      <div className="mt-2 space-y-2">
                        {requirements.map((requirement) => (
                          <div key={requirement.id} className="flex items-center gap-2">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-white/55">
                              <Package className="h-4 w-4" />
                            </span>
                            <Input
                              value={requirement.text}
                              onChange={(e) => updateRequirement(requirement.id, e.target.value)}
                              placeholder="e.g., oxmysql, ox_lib v3+..."
                              className={cn("w-full px-4 py-2.5 text-sm h-auto", fieldClass)}
                            />
                            {requirements.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRequirement(requirement.id)}
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/55 transition-colors hover:bg-white/5 hover:text-white/70"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addRequirement}
                        className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 transition-colors hover:text-orange-400"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add requirement
                      </button>
                    </div>

                    {/* Purchase link */}
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        Link for purchase
                      </Label>
                      <div className="relative mt-2">
                        <LinkIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
                        <Input
                          value={link}
                          onChange={(e) => setLink(e.target.value)}
                          placeholder="https://demo.example.com"
                          type="url"
                          className={cn("w-full py-3 pl-11 pr-4 text-sm h-auto", fieldClass)}
                        />
                      </div>
                      <p className="mt-2 text-xs text-white/55">
                        The link customers visit when they click <b className="text-orange-500">Buy Now</b>.
                      </p>
                    </div>

                    {/* Other links */}
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        Documentation / other links <span className="text-white/55">· optional</span>
                      </Label>
                      <div className="mt-2 space-y-2">
                        {otherLinks.map((otherLink) => (
                          <div key={otherLink.id} className="flex items-center gap-2">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-white/55">
                              <LinkIcon className="h-4 w-4" />
                            </span>
                            <Input
                              value={otherLink.text}
                              onChange={(e) => updateOtherLink(otherLink.id, e.target.value)}
                              placeholder="https://docs.yourscript.dev"
                              className={cn("w-full px-4 py-2.5 text-sm h-auto", fieldClass)}
                            />
                            {otherLinks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeOtherLink(otherLink.id)}
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/55 transition-colors hover:bg-white/5 hover:text-white/70"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addOtherLink}
                        className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 transition-colors hover:text-orange-400"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add link
                      </button>
                    </div>
                  </div>
                </section>

                {/* ---------------- Tebex ---------------- */}
                <section>
                  <SectionHeader icon={Store} title="Tebex · Optional" />
                  <div className="mt-5 space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="tebexStoreToken" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                          Store token
                        </Label>
                        <Input
                          id="tebexStoreToken"
                          value={formData.tebexStoreToken}
                          onChange={(e) => setFormData({ ...formData, tebexStoreToken: e.target.value })}
                          placeholder="tbx_••••••••"
                          className={cn("mt-2 w-full px-4 py-3 text-sm h-auto", fieldClass)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="tebexPackageId" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                          Package ID
                        </Label>
                        <Input
                          id="tebexPackageId"
                          value={formData.tebexPackageId}
                          onChange={(e) => setFormData({ ...formData, tebexPackageId: e.target.value })}
                          placeholder="5829104"
                          className={cn("mt-2 w-full px-4 py-3 text-sm tabular-nums h-auto", fieldClass)}
                        />
                      </div>
                    </div>
                    <p className="flex items-start gap-2 text-xs leading-relaxed text-white/55">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/55" />
                      Add these to sell this script directly via your Tebex store.
                    </p>
                  </div>
                </section>

                {/* Mobile submit actions */}
                <div className="space-y-4 lg:hidden">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-full bg-orange-500 py-3 text-base font-bold text-black hover:bg-orange-400 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {isEditMode ? "Updating..." : "Submitting..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        {isEditMode ? "Update Script" : "Submit Script"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-full border-white/[0.12] bg-transparent text-gray-300 hover:border-orange-500 hover:bg-white/[0.04] hover:text-white"
                  >
                    Save Draft
                  </Button>
                </div>
              </form>
            </div>

            {/* ============ RIGHT · LIVE PREVIEW ============ */}
            <aside ref={previewRef} className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                <Eye className="h-3.5 w-3.5" /> Live preview
              </div>

              {/* product card */}
              <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0e0e0e] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
                <div className="relative h-40 bg-white/[0.04]">
                  {previewCover ? (
                    <img src={previewCover} alt="Cover preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <ImageIcon className="h-10 w-10 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-transparent" />
                  {previewCategoryLabel && (
                    <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/85 ring-1 ring-white/10 backdrop-blur-md">
                      {previewCategoryLabel}
                    </span>
                  )}
                  {isFree ? (
                    <span className="absolute right-3 top-3 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-black">Free</span>
                  ) : (
                    discount > 0 && (
                      <span className="absolute right-3 top-3 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-black">-{discount}%</span>
                    )
                  )}
                </div>
                <div className="px-5 pb-5 pt-4">
                  <h3 className="text-lg font-extrabold leading-tight tracking-tight">
                    {formData.title || "Untitled script"}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-white/55">
                    {formData.description || "No description yet."}
                  </p>

                  {previewFrameworks.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {previewFrameworks.map((label) => (
                        <span key={label} className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-white/65">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-end justify-between border-t border-white/[0.06] pt-4">
                    <div className="flex items-baseline gap-2">
                      {isFree ? (
                        <span className="text-[26px] font-extrabold leading-none tracking-tight tabular-nums text-orange-500">Free</span>
                      ) : (
                        <>
                          <span className="text-[26px] font-extrabold leading-none tracking-tight tabular-nums">
                            {previewCurrencySymbol}{formData.price || "0.00"}
                          </span>
                          {formData.originalPrice && (
                            <span className="text-sm text-white/55 line-through tabular-nums">
                              {previewCurrencySymbol}{formData.originalPrice}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <button type="button" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-orange-400">
                      Buy
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-2.5 border-t border-white/[0.06] pt-4">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[11px] font-black text-black">
                      {previewSellerInitial}
                    </span>
                    <div className="leading-tight">
                      <div className="flex items-center gap-1 text-[13px] font-semibold">
                        {formData.sellerName || "Your Name"}
                        <BadgeCheck className="h-3.5 w-3.5 text-orange-500" />
                      </div>
                      <div className="text-[11px] text-white/55">Verified seller</div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-white/55">
                <Users className="h-3.5 w-3.5" /> This is exactly how buyers will see your listing.
              </p>

              <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/[0.06] px-4 py-3.5">
                <p className="flex items-start gap-2 text-xs leading-relaxed text-white/70">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  All submissions are reviewed by our team before going live. This usually takes 1-3 business days.
                </p>
              </div>
            </aside>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}
