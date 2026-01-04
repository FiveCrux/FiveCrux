"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
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
  Settings,
  ArrowLeft,
  Save,
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
import { CurrencySelect, type Currency } from "@/componentss/currency-select"
import * as countryData from "country-data-list"
import { cn } from "@/lib/utils"

interface Script {
  id: number
  title: string
  description: string
  price: number
  original_price?: number
  category: string
  framework?: string
  seller_name: string
  seller_email: string
  seller_id?: string
  features: string[]
  requirements: string[]
  link?: string
  other_links?: string[]
  images: string[]
  videos: string[]
  screenshots: string[]
  cover_image?: string
  last_updated: string
  status: "pending" | "approved" | "rejected"
  featured: boolean
  downloads: number
  rating: number
  review_count: number
  created_at: string
  updated_at: string
}

const scriptCategories = [
  { value: "scripts", label: "Scripts" },
  { value: "maps", label: "Maps" },
  { value: "props", label: "Props" },
  { value: "clothing", label: "Clothing" },
  { value: "economy", label: "Economy" },
  { value: "vehicles", label: "Vehicles" }
]
const frameworks = [
  { value: "qbcore", label: "QBCore" },
  { value: "qbox", label: "Qbox" },
  { value: "esx", label: "ESX" },
  { value: "ox", label: "OX" },
  { value: "vrp", label: "VRP" },
  { value: "standalone", label: "Standalone" },
]

export default function EditScriptPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const scriptId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [script, setScript] = useState<Script | null>(null)
  const [isFree, setIsFree] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "",
    framework: "",
    sellerName: session?.user?.name || "",
    sellerEmail: session?.user?.email || "",
    featured: false,
    currency: "",
    currencySymbol: "",
  })

  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)

  const [features, setFeatures] = useState([{ id: 1, text: "" }])
  const [requirements, setRequirements] = useState([{ id: 1, text: "" }])
  const [otherLinks, setOtherLinks] = useState([{ id: 1, text: "" }])
  const [link, setLink] = useState("")
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

  const [errors, setErrors] = useState({})
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false)
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false)
  const [uploadingVideos, setUploadingVideos] = useState(false)

  const fetchScript = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/scripts/${scriptId}`)
      
      if (!response.ok) {
        throw new Error("Script not found")
      }

      const scriptData = await response.json()
      
      // Check if user owns this script
      if (scriptData.seller_id !== (session?.user as any)?.id) {
        router.push("/profile")
        return
      }

      setScript(scriptData)
      
      // Populate form data
      setFormData({
        title: scriptData.title,
        description: scriptData.description,
        price: scriptData.price.toString(),
        originalPrice: scriptData.original_price?.toString() || "",
        category: scriptData.category,
        framework: scriptData.framework || "",
        sellerName: scriptData.seller_name,
        sellerEmail: scriptData.seller_email,
        featured: scriptData.featured,
        currency: scriptData.currency || "",
        currencySymbol: scriptData.currency_symbol || "",
      })
      
      // Set selected currency if it exists
      if (scriptData.currency) {
        const currency = countryData.currencies.all.find((c: any) => c.code === scriptData.currency)
        if (currency) {
          setSelectedCurrency({
            code: currency.code || "",
            name: currency.name || "",
            symbol: (currency as any).symbol || currency.code || "",
          })
        }
      }

      // Populate arrays
      setFeatures(scriptData.features.map((feature: string, index: number) => ({ id: index + 1, text: feature })))
      setRequirements(scriptData.requirements.map((req: string, index: number) => ({ id: index + 1, text: req })))
      setLink(scriptData.link || "")
      
      // Set other links
      if (scriptData.other_links && scriptData.other_links.length > 0) {
        setOtherLinks(scriptData.other_links.map((link: string, index: number) => ({ id: index + 1, text: link })))
      } else {
        setOtherLinks([{ id: 1, text: "" }])
      }
      
      setMedia({
        images: scriptData.images || [],
        videos: scriptData.videos || [],
        screenshots: scriptData.screenshots || [],
        coverImage: scriptData.cover_image || null,
        thumbnail: null,
      })

      // Set free status from database
      setIsFree(scriptData.free === true || scriptData.free === 1)

    } catch (error) {
      console.error("Error fetching script:", error)
      router.push("/profile")
    } finally {
      setLoading(false)
    }
  }, [scriptId, session?.user, router])

  // Update form data when session loads
  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        sellerName: session.user?.name || "",
        sellerEmail: session.user?.email || "",
      }))
    }
  }, [session])

  useEffect(() => {
    if (status === "loading") return
    
    if (!session) {
      router.push("/")
      return
    }

    fetchScript()
  }, [session, status, router, scriptId, fetchScript])


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

  const removeCoverImage = () => {
    setMedia(prev => ({
      ...prev,
      coverImage: null
    }))
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

  const addFeature = () => {
    const newId = Math.max(...features.map((f) => f.id), 0) + 1
    setFeatures([...features, { id: newId, text: "" }])
  }

  const removeFeature = (id: number) => {
    setFeatures(features.filter((f) => f.id !== id))
  }

  const updateFeature = (id: number, text: string) => {
    setFeatures(features.map((f) => (f.id === id ? { ...f, text } : f)))
  }

  const addRequirement = () => {
    const newId = Math.max(...requirements.map((r) => r.id), 0) + 1
    setRequirements([...requirements, { id: newId, text: "" }])
  }

  const removeRequirement = (id: number) => {
    setRequirements(requirements.filter((r) => r.id !== id))
  }

  const updateRequirement = (id: number, text: string) => {
    setRequirements(requirements.map((r) => (r.id === id ? { ...r, text } : r)))
  }

  const addOtherLink = () => {
    const newId = Math.max(...otherLinks.map((l) => l.id), 0) + 1
    setOtherLinks([...otherLinks, { id: newId, text: "" }])
  }

  const removeOtherLink = (id: number) => {
    setOtherLinks(otherLinks.filter((l) => l.id !== id))
  }

  const updateOtherLink = (id: number, text: string) => {
    setOtherLinks(otherLinks.map((l) => (l.id === id ? { ...l, text } : l)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

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
        last_updated: new Date().toISOString(),
      }

      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scriptData),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.needsReapproval) {
          toast.success("Script updated successfully!", {
            description: "It has been moved to pending status and will require admin approval before going live again."
          })
        } else {
          toast.success("Script updated successfully!")
        }
        router.push("/profile")
      } else {
        throw new Error("Failed to update script")
      }
    } catch (error) {
      console.error("Error updating script:", error)
      toast.error("Error updating script. Please try again.")
    } finally {
      setSaving(false)
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

  if (status === "loading" || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
      </>
    )
  }

  if (!session || !script) {
    return null
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen text-white relative overflow-hidden">
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
        <div className="bg-gradient-to-r from-orange-500/10 to-yellow-400/10 py-8 px-4 sm:px-6 lg:px-8 border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Button
                variant="outline"
                onClick={() => router.push("/profile")}
                className="bg-gray-800/50 border-gray-700 text-white hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Profile
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Edit Script</h1>
                <p className="text-gray-400">Update your script information</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-500" />
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
                      placeholder="Enter script title..."
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
                      placeholder="Describe your script..."
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
                      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger className="mt-2 bg-gray-900/50 border-gray-700 text-white focus:border-orange-500">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {scriptCategories.map((category) => (
                            <SelectItem key={category.value} value={category.value} className="text-white">
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="framework" className="text-white font-medium">
                        Framework
                      </Label>
                      <Select value={formData.framework} onValueChange={(value) => setFormData({ ...formData, framework: value })}>
                        <SelectTrigger className="mt-2 bg-gray-900/50 border-gray-700 text-white focus:border-orange-500">
                          <SelectValue placeholder="Select framework" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {frameworks.map((framework) => (
                            <SelectItem key={framework.value} value={framework.value} className="text-white">
                              {framework.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  {/* Free Toggle */}
                  <div className="flex items-center space-x-2 pb-4 border-b border-gray-700">
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
                    <Label htmlFor="isFree" className="text-white font-medium cursor-pointer">
                      Free Script
                    </Label>
                  </div>

                  <div className="space-y-4">
                    <div className={cn("transition-opacity", isFree && "opacity-50 pointer-events-none")}>
                      <Label className="text-white font-medium">
                        Currency *
                      </Label>
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
                            "bg-gray-900/50 border-gray-700 text-white",
                            isFree && "cursor-not-allowed opacity-50"
                          )}
                        />
                      </div>
                    </div>

                    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity", isFree && "opacity-50 pointer-events-none")}>
                      <div>
                        <Label htmlFor="price" className={cn("text-white font-medium", isFree && "text-gray-500")}>
                          Price *
                        </Label>
                        <div className="relative mt-2">
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            placeholder="25.99"
                            className={cn(
                              "pr-10 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500",
                              isFree && "cursor-not-allowed opacity-50 bg-gray-800/30"
                            )}
                            required={!isFree}
                            disabled={isFree || !selectedCurrency}
                          />
                          {selectedCurrency && !isFree && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                              {selectedCurrency.symbol}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="originalPrice" className={cn("text-white font-medium", isFree && "text-gray-500")}>
                          Original Price (Optional)
                        </Label>
                        <div className="relative mt-2">
                          <Input
                            id="originalPrice"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.originalPrice}
                            onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                            placeholder="35.99"
                            className={cn(
                              "pr-10 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500",
                              isFree && "cursor-not-allowed opacity-50 bg-gray-800/30"
                            )}
                            disabled={isFree || !selectedCurrency}
                          />
                          {selectedCurrency && !isFree && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                              {selectedCurrency.symbol}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {discount > 0 && !isFree && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-green-400 font-semibold">
                          {discount}% Discount - Save {selectedCurrency?.symbol || "$"}
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
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeFeature(feature.id)}
                        className="text-red-400 hover:text-red-300 border-red-500/30"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                  <Button type="button" variant="outline" onClick={addFeature} className="w-full border-dashed">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Feature
                  </Button>
                </CardContent>
              </Card>

              {/* Requirements */}
              <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {requirements.map((req, index) => (
                    <motion.div
                      key={req.id}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Input
                        value={req.text}
                        onChange={(e) => updateRequirement(req.id, e.target.value)}
                        placeholder="Add a requirement..."
                        className="flex-1 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeRequirement(req.id)}
                        className="text-red-400 hover:text-red-300 border-red-500/30"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                  <Button type="button" variant="outline" onClick={addRequirement} className="w-full border-dashed">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Requirement
                  </Button>
                </CardContent>
              </Card>

              {/* Other Links */}
              <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-orange-500" />
                    Other Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {otherLinks.map((otherLink, index) => (
                    <motion.div
                      key={otherLink.id}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Input
                        value={otherLink.text}
                        onChange={(e) => updateOtherLink(otherLink.id, e.target.value)}
                        placeholder="https://example.com/documentation"
                        className="flex-1 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                      />
                      {otherLinks.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeOtherLink(otherLink.id)}
                          className="text-red-400 hover:text-red-300 border-red-500/30"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                  <Button type="button" variant="outline" onClick={addOtherLink} className="w-full border-dashed">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Link
                  </Button>
                </CardContent>
              </Card>

              {/* Link */}
              <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ExternalLink className="h-7 w-5 text-orange-500" />
                    Link For Purchase
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://demo.example.com"
                    className="bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
                    type="url"
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    Add the link you want your customers to visit when they click <b className="text-orange-500">Buy Now</b>.
                  </p>
                </CardContent>
              </Card>

              {/* Media & Screenshots */}
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
                      disabled={uploadingCoverImage}
                    />
                    <label
                      htmlFor="cover-image-upload"
                      className={`mt-2 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center transition-colors block ${
                        uploadingCoverImage 
                          ? "opacity-50 cursor-not-allowed" 
                          : "hover:border-orange-500 cursor-pointer"
                      }`}
                    >
                      {uploadingCoverImage ? (
                        <>
                          <Loader2 className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-spin" />
                          <p className="text-orange-400">Uploading cover image...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-400">Upload cover image</p>
                          <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB (will be displayed on scripts listing)</p>
                        </>
                      )}
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
                      disabled={uploadingScreenshots}
                    />
                    <label
                      htmlFor="screenshot-upload"
                      className={`mt-2 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center transition-colors block ${
                        uploadingScreenshots 
                          ? "opacity-50 cursor-not-allowed" 
                          : "hover:border-orange-500 cursor-pointer"
                      }`}
                    >
                      {uploadingScreenshots ? (
                        <>
                          <Loader2 className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-spin" />
                          <p className="text-orange-400">Uploading screenshots...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-400">Upload script screenshots</p>
                          <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB each (max 10 images)</p>
                        </>
                      )}
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
                      disabled={uploadingVideos}
                    />
                    <label
                      htmlFor="video-upload"
                      className={`mt-2 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center transition-colors block ${
                        uploadingVideos 
                          ? "opacity-50 cursor-not-allowed" 
                          : "hover:border-orange-500 cursor-pointer"
                      }`}
                    >
                      {uploadingVideos ? (
                        <>
                          <Loader2 className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-spin" />
                          <p className="text-orange-400">Uploading videos...</p>
                        </>
                      ) : (
                        <>
                          <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-400">Upload demo videos</p>
                          <p className="text-sm text-gray-500 mt-2">MP4, MOV up to 4.5 mb each</p>
                        </>
                      )}
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
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-bold py-3 text-lg shadow-lg disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Settings className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/profile")}
                  className="px-8 border-gray-600 text-gray-300 hover:text-white hover:border-orange-500"
                >
                  Cancel
                </Button>
              </motion.div>
            </div>

            {/* Preview Section */}
            <div className="lg:col-span-1">
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
                          {isFree ? (
                            <span className="text-orange-500 font-bold text-xl">Free</span>
                          ) : (
                            <>
                              <span className="text-orange-500 font-bold text-xl">{selectedCurrency?.symbol || "$"}{formData.price || "0.00"}</span>
                              {formData.originalPrice && (
                                <span className="text-gray-500 line-through text-sm">{selectedCurrency?.symbol || "$"}{formData.originalPrice}</span>
                              )}
                            </>
                          )}
                        </div>
                        {discount > 0 && !isFree && <Badge className="bg-red-500 text-white">-{discount}%</Badge>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {formData.category && (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                            {scriptCategories.find((c) => c.value === formData.category)?.label}
                          </Badge>
                        )}
                        {formData.framework && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {frameworks.find((f) => f.value === formData.framework)?.label}
                          </Badge>
                        )}
                        {formData.featured && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            Featured
                          </Badge>
                        )}
                      </div>

                      {features.filter((f) => f.text.trim()).length > 0 && (
                        <div>
                          <h4 className="text-white font-semibold mb-2">Features:</h4>
                          <ul className="space-y-1">
                            {features
                              .filter((f) => f.text.trim())
                              .slice(0, 3)
                              .map((feature, index) => (
                                <li key={index} className="text-gray-400 text-sm flex items-center gap-2">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  {feature.text}
                                </li>
                              ))}
                            {features.filter((f) => f.text.trim()).length > 3 && (
                              <li className="text-gray-500 text-sm">
                                +{features.filter((f) => f.text.trim()).length - 3} more features
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  )
}
