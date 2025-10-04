"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, useInView } from "framer-motion"
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
import FileUpload from "@/components/file-upload"

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

export default function CreateGiveawayPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - BEFORE ANY CONDITIONAL RETURNS
  const formRef = useRef(null)
  const previewRef = useRef(null)
  const formInView = useInView(formRef, { once: true })
  const previewInView = useInView(previewRef, { once: true })

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    value: "",
    category: "",
    endDate: "",
    maxEntries: "",
    difficulty: "Easy",
    featured: false,
    autoAnnounce: true,
  })

  const [requirements, setRequirements] = useState([
    { id: 1, type: "discord", description: "Join our Discord server", points: 1, required: true },
  ])

  const [prizes, setPrizes] = useState([{ id: 1, name: "", description: "", value: "", position: 1 }])

  const [media, setMedia] = useState({
    images: [],
    videos: [],
    coverImage: null,
    thumbnail: null,
  })
  const [selectedFiles, setSelectedFiles] = useState({
    coverImage: null as File | null,
    images: [] as File[],
    videos: [] as File[],
  })

  const [errors, setErrors] = useState({})

  // Check if user has verified_creator role
  const hasVerifiedCreatorRole = session?.user && 
    (session.user as any).roles && 
    (session.user as any).roles.includes('verified_creator')

  // Redirect if not authenticated or doesn't have verified_creator role
  if (status === "loading") {
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
                Only verified creators can create giveaways. Please contact an admin to get verified creator access.
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

  const requirementTypes = [
    { value: "discord", label: "Join Discord", icon: "💬" },
    { value: "follow", label: "Follow Social Media", icon: "👥" },
    { value: "share", label: "Share Post", icon: "📤" },
    { value: "tag", label: "Tag Friends", icon: "🏷️" },
    { value: "purchase", label: "Make Purchase", icon: "🛒" },
    { value: "review", label: "Leave Review", icon: "⭐" },
    { value: "subscribe", label: "Subscribe Newsletter", icon: "📧" },
    { value: "custom", label: "Custom Task", icon: "✨" },
  ]

  const addRequirement = () => {
    const newId = Math.max(...requirements.map((r) => r.id)) + 1
    setRequirements([...requirements, { id: newId, type: "discord", description: "", points: 1, required: false }])
  }

  const removeRequirement = (id: number) => {
    setRequirements(requirements.filter((r) => r.id !== id))
  }

  const updateRequirement = (id: number, field: string, value: any) => {
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

    try {
      // Upload cover image if selected
      let coverImageUrl = ""
      if (selectedFiles.coverImage) {
        const formData = new FormData()
        formData.append("file", selectedFiles.coverImage)
        
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          coverImageUrl = uploadResult.url
        } else {
          alert("Failed to upload cover image")
          return
        }
      }

      // Upload images if selected
      const imageUrls = []
      for (const file of selectedFiles.images) {
        const formData = new FormData()
        formData.append("file", file)
        
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          imageUrls.push(uploadResult.url)
        }
      }

      // Upload videos if selected
      const videoUrls = []
      for (const file of selectedFiles.videos) {
        const formData = new FormData()
        formData.append("file", file)
        
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          videoUrls.push(uploadResult.url)
        }
      }

      const payload = {
        giveaway: {
          title: formData.title,
          description: formData.description,
          total_value: formData.value,
          category: formData.category,
          end_date: formData.endDate,
          max_entries: formData.maxEntries ? Number(formData.maxEntries) : null,
          difficulty: formData.difficulty,
          featured: formData.featured,
          auto_announce: formData.autoAnnounce,
          creator_name: "Admin",
          creator_email: "admin@example.com",
          images: imageUrls,
          videos: videoUrls,
          cover_image: coverImageUrl,
          tags: [],
          rules: [],
          status: "active",
        },
        requirements,
        prizes,
      };

      const res = await fetch('/api/giveaways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert('Giveaway created successfully!');
        // Reset form
        setFormData({
          title: "",
          description: "",
          value: "",
          category: "",
          endDate: "",
          maxEntries: "",
          difficulty: "Easy",
          featured: false,
          autoAnnounce: true,
        })
        setSelectedFiles({
          coverImage: null,
          images: [],
          videos: [],
        })
        setRequirements([{ id: 1, type: "discord", description: "Join our Discord server", points: 1, required: true }])
        setPrizes([{ id: 1, name: "", description: "", value: "", position: 1 }])
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'Failed to create giveaway'));
      }
    } catch (err: any) {
      alert('Network error: ' + err.message);
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
                Create Giveaway
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
              animate={formInView ? { opacity: 1, x: 0 } : {}}
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
                        <Label htmlFor="value" className="text-white font-medium">
                          Total Value *
                        </Label>
                        <Input
                          id="value"
                          value={formData.value}
                          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                          placeholder="$150"
                          className="mt-2 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500"
                          required
                        />
                      </div>

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
                            <SelectItem value="scripts">Script Bundle</SelectItem>
                            <SelectItem value="development">Development Service</SelectItem>
                            <SelectItem value="server">Server Setup</SelectItem>
                            <SelectItem value="custom">Custom Prize</SelectItem>
                            <SelectItem value="cash">Cash Prize</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                      <div>
                        <Label htmlFor="maxEntries" className="text-white font-medium">
                          Max Entries
                        </Label>
                        <Input
                          id="maxEntries"
                          type="number"
                          value={formData.maxEntries}
                          onChange={(e) => setFormData({ ...formData, maxEntries: e.target.value })}
                          placeholder="1000"
                          className="mt-2 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="difficulty" className="text-white font-medium">
                          Difficulty
                        </Label>
                        <Select
                          value={formData.difficulty}
                          onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                        >
                          <SelectTrigger className="mt-2 bg-gray-900/50 border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
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
                          <Label className="text-white text-sm">Description</Label>
                          <Input
                            value={requirement.description}
                            onChange={(e) => updateRequirement(requirement.id, "description", e.target.value)}
                            placeholder="Describe what users need to do..."
                            className="mt-1 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400"
                          />
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
                      <Label className="text-white font-medium mb-2 block">Cover Image *</Label>
                      <FileUpload
                        onFileSelect={(file) => setSelectedFiles(prev => ({ ...prev, coverImage: file }))}
                        onFileRemove={() => setSelectedFiles(prev => ({ ...prev, coverImage: null }))}
                        selectedFile={selectedFiles.coverImage}
                        accept="image/*"
                        maxSize={5}
                      />
                    </div>

                    <div>
                      <Label className="text-white font-medium">Thumbnail Image *</Label>
                      <div className="mt-2 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-yellow-500 transition-colors cursor-pointer">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Click to upload thumbnail image</p>
                        <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-white font-medium mb-2 block">Additional Images</Label>
                      <FileUpload
                        onFileSelect={(file) => setSelectedFiles(prev => ({ ...prev, images: [...prev.images, file] }))}
                        onFileRemove={() => setSelectedFiles(prev => ({ ...prev, images: prev.images.slice(0, -1) }))}
                        selectedFile={selectedFiles.images.length > 0 ? selectedFiles.images[selectedFiles.images.length - 1] : null}
                        accept="image/*"
                        maxSize={5}
                      />
                      {selectedFiles.images.length > 0 && (
                        <div className="mt-2 text-sm text-gray-400">
                          {selectedFiles.images.length} image(s) selected
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-white font-medium mb-2 block">Videos (Optional)</Label>
                      <FileUpload
                        onFileSelect={(file) => setSelectedFiles(prev => ({ ...prev, videos: [...prev.videos, file] }))}
                        onFileRemove={() => setSelectedFiles(prev => ({ ...prev, videos: prev.videos.slice(0, -1) }))}
                        selectedFile={selectedFiles.videos.length > 0 ? selectedFiles.videos[selectedFiles.videos.length - 1] : null}
                        accept="video/*"
                        maxSize={50}
                      />
                      {selectedFiles.videos.length > 0 && (
                        <div className="mt-2 text-sm text-gray-400">
                          {selectedFiles.videos.length} video(s) selected
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <motion.div className="flex gap-4" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold py-3 text-lg shadow-lg"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Create Giveaway
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-8 border-gray-600 text-gray-300 hover:text-white hover:border-yellow-500"
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
              initial={{ opacity: 0, x: 50 }}
              animate={previewInView ? { opacity: 1, x: 0 } : {}}
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
                        <Badge
                          className={`${
                            formData.difficulty === "Easy"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : formData.difficulty === "Medium"
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                : "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}
                        >
                          {formData.difficulty}
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
                          <span>
                            {formData.maxEntries ? `Max ${formData.maxEntries} entries` : "Unlimited entries"}
                          </span>
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
