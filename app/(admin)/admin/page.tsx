"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Users,
  Package,
  Gift,
  Megaphone,
  Settings,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Shield,
  Crown,
  UserCheck,
  AlertTriangle,
  FileText,
  Info,
  User as UserIcon,
  ExternalLink,
  ImageIcon,
  Calendar,
  AlertCircle,
  Target,
  Trophy,
  Star,
  Tag,
} from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentss/ui/tabs"
import { Checkbox } from "@/componentss/ui/checkbox"
import { Input } from "@/componentss/ui/input"
import { Textarea } from "@/componentss/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentss/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/componentss/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/componentss/ui/alert-dialog"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import FileUpload from "@/componentss/shared/file-upload"

interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  username: string | null
  roles: string[]
  created_at?: string
}

interface Script {
  id: number
  title: string
  description: string
  price: number
  original_price?: number
  category: string
  framework?: string | string[]
  status: string
  seller_name: string
  seller_email: string
  seller_id?: string
  features: string[]
  requirements: string[]
  links: string[]
  images: string[]
  videos: string[]
  screenshots: string[]
  cover_image?: string
  featured: boolean
  downloads: number
  rating: number
  review_count: number
  created_at: string
  updated_at: string
  rejection_reason?: string
}

// Giveaway interface for admin popup
interface Giveaway {
  id: number
  title: string
  description: string
  total_value: string
  category: string
  difficulty: string
  status: string
  creator_name: string
  creator_email: string
  creator_id?: string
  end_date: string
  maxEntries?: number // Maximum number of entries allowed
  featured: boolean
  auto_announce: boolean
  images: string[]
  videos: string[]
  coverImage?: string // Database field is cover_image but mapped to coverImage
  tags: string[]
  rules: string[]
  requirements: any[]
  prizes: any[]
  created_at: string
  updated_at: string
  rejection_reason?: string
  entriesCount?: number // Current number of entries
  submittedAt?: string // When it was submitted for review
  approvedAt?: string // When it was approved
  rejectedAt?: string // When it was rejected
  approvedBy?: string // Who approved it
  rejectedBy?: string // Who rejected it
  adminNotes?: string // Admin notes
}

interface Ad {
  id: number
  title: string
  description: string
  category: string
  status: string
  priority: number
  created_at: string
  rejection_reason?: string
}

// Updated role options to the requested set. Values should match DB enum (lowercase/underscored).
const roleOptions = [
  { value: "founder", label: "Founder", icon: Crown, color: "bg-indigo-500" },
  { value: "verified_creator", label: "Verified Creator", icon: UserCheck, color: "bg-emerald-500" },
  { value: "crew", label: "Crew", icon: Users, color: "bg-sky-500" },
  { value: "admin", label: "Admin", icon: Shield, color: "bg-red-500" },
  { value: "moderator", label: "Moderator", icon: Shield, color: "bg-yellow-500" },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [users, setUsers] = useState<User[]>([])
  const [scripts, setScripts] = useState<Script[]>([])
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editingRoles, setEditingRoles] = useState<string[]>([])
  const [showAdDialog, setShowAdDialog] = useState(false)
  const [newAd, setNewAd] = useState({
    title: "",
    description: "",
    image_url: "",
    link_url: "",
    category: "",
    status: "active",
    priority: 1,
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [activeScriptFilter, setActiveScriptFilter] = useState("all")
  const [rejectingScript, setRejectingScript] = useState<number | null>(null)
  const [viewingScript, setViewingScript] = useState<Script | null>(null)
  const [viewingGiveaway, setViewingGiveaway] = useState<Giveaway | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [activeGiveawayFilter, setActiveGiveawayFilter] = useState("all")
  const [rejectingGiveaway, setRejectingGiveaway] = useState<number | null>(null)
  const [giveawayRejectionReason, setGiveawayRejectionReason] = useState("")
  const [activeAdFilter, setActiveAdFilter] = useState("all")
  const [rejectingAd, setRejectingAd] = useState<number | null>(null)
  const [adRejectionReason, setAdRejectionReason] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (adsFilter?: string) => {
    try {
      setLoading(true)
      console.log("Loading admin data...")
      
      const adsUrl = adsFilter && adsFilter !== "all" 
        ? `/api/admin/ads?type=${adsFilter}`
        : "/api/admin/ads"
      
      const [usersRes, scriptsRes, giveawaysRes, adsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/scripts"),
        fetch("/api/admin/giveaways"),
        fetch(adsUrl),
      ])

      console.log("API responses:", {
        users: usersRes.status,
        scripts: scriptsRes.status,
        giveaways: giveawaysRes.status,
        ads: adsRes.status
      })

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        console.log("Users data:", usersData)
        setUsers(usersData.users || [])
      } else {
        console.error("Users API error:", usersRes.status, await usersRes.text())
      }

      if (scriptsRes.ok) {
        const scriptsData = await scriptsRes.json()
        console.log("Scripts data:", scriptsData)
        setScripts(scriptsData.scripts || [])
      } else {
        console.error("Scripts API error:", scriptsRes.status, await scriptsRes.text())
      }

      if (giveawaysRes.ok) {
        const giveawaysData = await giveawaysRes.json()
        setGiveaways(giveawaysData.giveaways || [])
      }

      if (adsRes.ok) {
        const adsData = await adsRes.json()
        setAds(adsData.data || [])
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setEditingRoles([...editingRoles, role])
    } else {
      setEditingRoles(editingRoles.filter(r => r !== role))
    }
  }

  const saveUserRoles = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: editingRoles }),
      })

      if (response.ok) {
        setUsers(users.map(user => 
          user.id === selectedUser.id 
            ? { ...user, roles: editingRoles }
            : user
        ))
        setSelectedUser(null)
        setEditingRoles([])
      }
    } catch (error) {
      console.error("Error updating user roles:", error)
    }
  }

  const createAd = async () => {
    try {
      let imageUrl = ""
      
      // Upload image if selected
      if (selectedImage) {
        const formData = new FormData()
        formData.append("file", selectedImage)
        
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          imageUrl = uploadResult.url
        } else {
          console.error("Failed to upload image")
          return
        }
      }

      const adData = {
        ...newAd,
        image_url: imageUrl,
      }

      const response = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adData),
      })

      if (response.ok) {
        const result = await response.json()
        setAds([...ads, { ...adData, id: result.adId, created_at: new Date().toISOString() }])
        setNewAd({
          title: "",
          description: "",
          image_url: "",
          link_url: "",
          category: "",
          status: "active",
          priority: 1,
        })
        setSelectedImage(null)
        setShowAdDialog(false)
      }
    } catch (error) {
      console.error("Error creating ad:", error)
    }
  }

  const deleteAd = async (adId: number) => {
    try {
      const response = await fetch(`/api/ads/${adId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setAds(ads.filter(ad => ad.id !== adId))
      }
    } catch (error) {
      console.error("Error deleting ad:", error)
    }
  }

  const stats = {
    totalUsers: users.length,
    totalScripts: scripts.length,
    totalGiveaways: giveaways.length,
    totalAds: ads.length,
    pendingScripts: scripts.filter(s => s.status === "pending").length,
    activeAds: ads.filter(a => a.status === "active").length,
  }

  // Filter scripts based on active filter
  const filteredScripts = scripts.filter(script => {
    if (activeScriptFilter === "all") return true
    return script.status === activeScriptFilter
  })

  // Filter giveaways based on active filter
  const filteredGiveaways = giveaways.filter(giveaway => {
    if (activeGiveawayFilter === "all") return true
    return giveaway.status === activeGiveawayFilter
  })

  // Handle script approval/rejection
  const handleScriptAction = async (scriptId: number, status: "approved" | "rejected") => {
    try {
      const updateData: any = { status }
      
      if (status === "rejected" && rejectionReason) {
        updateData.reason = rejectionReason
      }
      
      const response = await fetch("/api/admin/scripts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId, ...updateData }),
      })

      if (response.ok) {
        // Update local state
        setScripts(scripts.map(script => 
          script.id === scriptId 
            ? { ...script, status, rejection_reason: status === "rejected" ? rejectionReason : undefined }
            : script
        ))
        
        if (status === "rejected") {
          setRejectingScript(null)
          setRejectionReason("")
        }
        
        // Reload data to get updated information
        loadData()
        
        // If script was approved, show success message and redirect to scripts page
        if (status === "approved") {
          alert("Script approved successfully! Redirecting to scripts page...")
          window.location.href = "/scripts"
        }
      }
    } catch (error) {
      console.error("Error updating script:", error)
    }
  }

  // Handle giveaway approval/rejection
  const handleGiveawayAction = async (giveawayId: number, status: "approved" | "rejected") => {
    try {
      const updateData: any = { status }
      
      if (status === "rejected" && giveawayRejectionReason) {
        updateData.reason = giveawayRejectionReason
      }
      
      const response = await fetch("/api/admin/giveaways", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giveawayId, ...updateData }),
      })

      if (response.ok) {
        // Update local state
        setGiveaways(giveaways.map(giveaway => 
          giveaway.id === giveawayId 
            ? { ...giveaway, status, rejection_reason: status === "rejected" ? giveawayRejectionReason : undefined }
            : giveaway
        ))
        
        if (status === "rejected") {
          setRejectingGiveaway(null)
          setGiveawayRejectionReason("")
        }
        
        // Reload data to get updated information
        loadData()
        
        // If giveaway was approved, show success message and redirect to giveaways page
        if (status === "approved") {
          alert("Giveaway approved successfully! Redirecting to giveaways page...")
          window.location.href = "/giveaways"
        }
      }
    } catch (error) {
      console.error("Error updating giveaway:", error)
    }
  }

  // Handle ad approval/rejection
  const handleAdAction = async (adId: number, status: "approved" | "rejected") => {
    try {
      const updateData: any = { 
        action: status === "approved" ? "approve" : "reject",
        adId 
      }
      
      if (status === "rejected" && adRejectionReason) {
        updateData.rejectionReason = adRejectionReason
      }
      
      const response = await fetch("/api/admin/ads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        // Update local state
        setAds(ads.map(ad => 
          ad.id === adId 
            ? { ...ad, status, rejection_reason: status === "rejected" ? adRejectionReason : undefined }
            : ad
        ))
        
        if (status === "rejected") {
          setRejectingAd(null)
          setAdRejectionReason("")
        }
        
        // Reload data to get updated information
        loadData()
        
        // If ad was approved, show success message
        if (status === "approved") {
          alert("Ad approved successfully!")
        }
      }
    } catch (error) {
      console.error("Error updating ad:", error)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
                Admin Dashboard
              </span>
            </h1>
            <p className="text-gray-400">Manage users, scripts, giveaways, and advertisements</p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-400">Total Users</p>
                    <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-400">Total Scripts</p>
                    <p className="text-2xl font-bold text-white">{stats.totalScripts}</p>
                  </div>
                  <Package className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-400">Total Giveaways</p>
                    <p className="text-2xl font-bold text-white">{stats.totalGiveaways}</p>
                  </div>
                  <Gift className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-400">Active Ads</p>
                    <p className="text-2xl font-bold text-white">{stats.activeAds}</p>
                  </div>
                  <Megaphone className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-gray-800/30 border border-gray-700/50">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Users
              </TabsTrigger>
              <TabsTrigger value="scripts" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Scripts
              </TabsTrigger>
              <TabsTrigger value="giveaways" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Giveaways
              </TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Content
              </TabsTrigger>
              <TabsTrigger value="ads" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Ads
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-500" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {scripts.slice(0, 5).map((script) => (
                        <div key={script.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/30">
                          <Package className="h-5 w-5 text-green-400" />
                          <div className="flex-1">
                            <p className="text-white font-medium">{script.title}</p>
                            <p className="text-sm text-gray-400">by {script.seller_name}</p>
                          </div>
                          <Badge variant="secondary" className="bg-gray-600 text-gray-300">
                            {script.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* System Status */}
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Settings className="h-5 w-5 text-orange-500" />
                      System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                        <span className="text-gray-300">Pending Scripts</span>
                        <Badge className="bg-yellow-500 text-white">{stats.pendingScripts}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                        <span className="text-gray-300">Active Ads</span>
                        <Badge className="bg-green-500 text-white">{stats.activeAds}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                        <span className="text-gray-300">Total Giveaways</span>
                        <Badge className="bg-purple-500 text-white">{stats.totalGiveaways}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-500" />
                    User Management
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage user roles and permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-700/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 flex items-center justify-center">
                            <span className="text-black font-bold">{user.name?.[0] || "U"}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.name || "Unknown"}</p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {user.roles.map((role) => {
                              const roleOption = roleOptions.find(r => r.value === role)
                              return roleOption ? (
                                <Badge key={role} className={`${roleOption.color} text-white`}>
                                  {roleOption.label}
                                </Badge>
                              ) : null
                            })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user)
                              setEditingRoles([...user.roles])
                            }}
                            className="border-gray-600 text-gray-300 hover:text-white"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scripts" className="mt-6">
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-500" />
                    Script Management
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Review and manage pending scripts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={activeScriptFilter === "all" ? "default" : "outline"}
                        onClick={() => setActiveScriptFilter("all")}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        All ({scripts.length})
                      </Button>
                      <Button
                        variant={activeScriptFilter === "pending" ? "default" : "outline"}
                        onClick={() => setActiveScriptFilter("pending")}
                        className="bg-yellow-500 hover:bg-yellow-600"
                      >
                        Pending ({scripts.filter(s => s.status === "pending").length})
                      </Button>
                      <Button
                        variant={activeScriptFilter === "approved" ? "default" : "outline"}
                        onClick={() => setActiveScriptFilter("approved")}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        Approved ({scripts.filter(s => s.status === "approved").length})
                      </Button>
                      <Button
                        variant={activeScriptFilter === "rejected" ? "default" : "outline"}
                        onClick={() => setActiveScriptFilter("rejected")}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Rejected ({scripts.filter(s => s.status === "rejected").length})
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {filteredScripts.map((script) => (
                      <div key={script.id} className="border border-gray-700/50 rounded-lg p-4 bg-gray-700/20">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">{script.title}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">Seller:</span>
                                <p className="text-white">{script.seller_name}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Category:</span>
                                <p className="text-white">{script.category}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Price:</span>
                                <p className="text-white">${script.price}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Framework:</span>
                                <p className="text-white">{script.framework || "N/A"}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <span className="text-gray-400">Description:</span>
                              <p className="text-white text-sm mt-1 line-clamp-2">{script.description}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge 
                              className={
                                script.status === "pending" ? "bg-yellow-500 text-white" :
                                script.status === "approved" ? "bg-green-500 text-white" :
                                "bg-red-500 text-white"
                              }
                            >
                              {script.status}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(script.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        {script.status === "pending" && (
                          <div className="flex gap-2 pt-4 border-t border-gray-700/50">
                            <Button
                              onClick={() => handleScriptAction(script.id, "approved")}
                              className="bg-green-500 hover:bg-green-600"
                              size="sm"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => setRejectingScript(script.id)}
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:text-red-300"
                              size="sm"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                            <Button
                              onClick={() => setViewingScript(script)}
                              variant="outline"
                              size="sm"
                              className="border-gray-600 text-gray-300 hover:text-white"
                            >
                              View Details
                            </Button>
                          </div>
                        )}
                        
                        {script.status === "rejected" && script.rejection_reason && (
                          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded">
                            <span className="text-red-400 text-sm font-medium">Rejection Reason:</span>
                            <p className="text-red-300 text-sm mt-1">{script.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {filteredScripts.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No scripts found with the selected filter.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="giveaways" className="mt-6">
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Gift className="h-5 w-5 text-purple-500" />
                    Giveaway Management
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Review and manage pending giveaways
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={activeGiveawayFilter === "all" ? "default" : "outline"}
                        onClick={() => setActiveGiveawayFilter("all")}
                        className="bg-purple-500 hover:bg-purple-600"
                      >
                        All ({giveaways.length})
                      </Button>
                      <Button
                        variant={activeGiveawayFilter === "pending" ? "default" : "outline"}
                        onClick={() => setActiveGiveawayFilter("pending")}
                        className="bg-yellow-500 hover:bg-yellow-600"
                      >
                        Pending ({giveaways.filter(g => g.status === "pending").length})
                      </Button>
                      <Button
                        variant={activeGiveawayFilter === "approved" ? "default" : "outline"}
                        onClick={() => setActiveGiveawayFilter("approved")}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        Approved ({giveaways.filter(g => g.status === "approved").length})
                      </Button>
                      <Button
                        variant={activeGiveawayFilter === "rejected" ? "default" : "outline"}
                        onClick={() => setActiveGiveawayFilter("rejected")}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Rejected ({giveaways.filter(g => g.status === "rejected").length})
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {filteredGiveaways.map((giveaway) => (
                      <div key={giveaway.id} className="border border-gray-700/50 rounded-lg p-4 bg-gray-700/20">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">{giveaway.title}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">Creator:</span>
                                <p className="text-white">{giveaway.creator_name}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Category:</span>
                                <p className="text-white">{giveaway.category}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Total Value:</span>
                                <p className="text-white">${giveaway.total_value}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Difficulty:</span>
                                <p className="text-white">{giveaway.difficulty || "N/A"}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <span className="text-gray-400">Description:</span>
                              <p className="text-white text-sm mt-1 line-clamp-2">{giveaway.description}</p>
                            </div>
                            {giveaway.status === "rejected" && giveaway.rejection_reason && (
                              <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                                <span className="text-red-400 text-sm font-medium">Rejection Reason:</span>
                                <p className="text-red-200 text-sm mt-1">{giveaway.rejection_reason}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge 
                              className={
                                giveaway.status === "pending" ? "bg-yellow-500 text-white" :
                                giveaway.status === "approved" ? "bg-green-500 text-white" :
                                "bg-red-500 text-white"
                              }
                            >
                              {giveaway.status}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(giveaway.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                          <div className="flex gap-2 mt-4">
                          <Button
                            onClick={() => setViewingGiveaway(giveaway)}
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-300 hover:text-white"
                          >
                            View Details
                          </Button>
                          {giveaway.status === "pending" && (
                            <>
                            <Button
                              onClick={() => handleGiveawayAction(giveaway.id, "approved")}
                              className="bg-green-500 hover:bg-green-600"
                              size="sm"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => setRejectingGiveaway(giveaway.id)}
                              variant="destructive"
                              size="sm"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                            </>
                        )}
                        </div>
                      </div>
                    ))}
                    
                    {filteredGiveaways.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No giveaways found with the selected filter.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Scripts */}
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Package className="h-5 w-5 text-green-500" />
                      Scripts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {scripts.slice(0, 5).map((script) => (
                        <div key={script.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                          <div>
                            <p className="text-white font-medium">{script.title}</p>
                            <p className="text-sm text-gray-400">by {script.seller_name}</p>
                          </div>
                          <Badge variant="secondary" className="bg-gray-600 text-gray-300">
                            {script.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Giveaways */}
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Gift className="h-5 w-5 text-purple-500" />
                      Giveaways
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {giveaways.slice(0, 5).map((giveaway) => (
                        <div key={giveaway.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                          <div>
                            <p className="text-white font-medium">{giveaway.title}</p>
                            <p className="text-sm text-gray-400">by {giveaway.creator_name}</p>
                          </div>
                          <Badge variant="secondary" className="bg-gray-600 text-gray-300">
                            {giveaway.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="ads" className="mt-6">
              <div className="space-y-6">
                {/* Filter Tabs */}
                <div className="flex gap-2">
                  <Button
                    variant={activeAdFilter === "all" ? "default" : "outline"}
                    onClick={() => {
                      setActiveAdFilter("all")
                      loadData("all")
                    }}
                    className={activeAdFilter === "all" ? "bg-orange-500 hover:bg-orange-600" : "border-gray-600 text-gray-300"}
                  >
                    All Ads
                  </Button>
                  <Button
                    variant={activeAdFilter === "pending" ? "default" : "outline"}
                    onClick={() => {
                      setActiveAdFilter("pending")
                      loadData("pending")
                    }}
                    className={activeAdFilter === "pending" ? "bg-orange-500 hover:bg-orange-600" : "border-gray-600 text-gray-300"}
                  >
                    Pending
                  </Button>
                  <Button
                    variant={activeAdFilter === "approved" ? "default" : "outline"}
                    onClick={() => {
                      setActiveAdFilter("approved")
                      loadData("approved")
                    }}
                    className={activeAdFilter === "approved" ? "bg-orange-500 hover:bg-orange-600" : "border-gray-600 text-gray-300"}
                  >
                    Approved
                  </Button>
                  <Button
                    variant={activeAdFilter === "rejected" ? "default" : "outline"}
                    onClick={() => {
                      setActiveAdFilter("rejected")
                      loadData("rejected")
                    }}
                    className={activeAdFilter === "rejected" ? "bg-orange-500 hover:bg-orange-600" : "border-gray-600 text-gray-300"}
                  >
                    Rejected
                  </Button>
                </div>

                <Card className="bg-gray-800/30 border-gray-700/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-orange-500" />
                        Advertisement Management
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Review and manage advertisement submissions
                      </CardDescription>
                    </div>
                    <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
                      <DialogTrigger asChild>
                        <Button className="bg-orange-500 hover:bg-orange-600">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Ad
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-800 border-gray-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">Create New Advertisement</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Add a new advertisement to the platform
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm text-gray-300">Title</label>
                            <Input
                              value={newAd.title}
                              onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-300">Description</label>
                            <Textarea
                              value={newAd.description}
                              onChange={(e) => setNewAd({ ...newAd, description: e.target.value })}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-300 mb-2 block">Advertisement Image</label>
                            <FileUpload
                              onFileSelect={setSelectedImage}
                              onFileRemove={() => setSelectedImage(null)}
                              selectedFile={selectedImage}
                              accept="image/*"
                              maxSize={5}
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-300">Link URL</label>
                            <Input
                              value={newAd.link_url}
                              onChange={(e) => setNewAd({ ...newAd, link_url: e.target.value })}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-300">Category</label>
                            <Select value={newAd.category} onValueChange={(value) => setNewAd({ ...newAd, category: value })}>
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-700 border-gray-600">
                                <SelectItem value="scripts">Scripts</SelectItem>
                                <SelectItem value="giveaways">Giveaways</SelectItem>
                                <SelectItem value="general">General</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm text-gray-300">Priority</label>
                            <Input
                              type="number"
                              value={newAd.priority}
                              onChange={(e) => setNewAd({ ...newAd, priority: parseInt(e.target.value) })}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={createAd} className="bg-orange-500 hover:bg-orange-600">
                              Create Ad
                            </Button>
                            <Button variant="outline" onClick={() => setShowAdDialog(false)} className="border-gray-600 text-gray-300">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ads
                      .filter(ad => {
                        if (activeAdFilter === "all") return true
                        // For pending ads, they might not have a status field or it might be null
                        if (activeAdFilter === "pending") return !ad.status || ad.status === "pending"
                        if (activeAdFilter === "approved") return ad.status === "approved" || ad.status === "active"
                        if (activeAdFilter === "rejected") return ad.status === "rejected"
                        return true
                      })
                      .map((ad) => (
                      <div key={ad.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-700/30">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-400/20 flex items-center justify-center">
                            <Megaphone className="h-6 w-6 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{ad.title}</p>
                            <p className="text-sm text-gray-400">{ad.description}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="secondary" className="bg-gray-600 text-gray-300">
                                {ad.category}
                              </Badge>
                              <Badge variant="secondary" className="bg-gray-600 text-gray-300">
                                Priority: {ad.priority}
                              </Badge>
                            </div>
                            {ad.rejection_reason && (
                              <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-sm">
                                <strong>Rejection Reason:</strong> {ad.rejection_reason}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            ad.status === "approved" || ad.status === "active" ? "bg-green-500 text-white" :
                            ad.status === "rejected" ? "bg-red-500 text-white" :
                            "bg-yellow-500 text-white"
                          }>
                            {ad.status || "pending"}
                          </Badge>
                          {(!ad.status || ad.status === "pending") && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAdAction(ad.id, "approved")}
                                className="bg-green-500 hover:bg-green-600 text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectingAd(ad.id)}
                                className="border-red-500/50 text-red-400 hover:text-red-300"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Rejection Dialog */}
              <Dialog open={rejectingAd !== null} onOpenChange={() => setRejectingAd(null)}>
                <DialogContent className="bg-gray-800 border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Reject Advertisement</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Please provide a reason for rejecting this advertisement.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      value={adRejectionReason}
                      onChange={(e) => setAdRejectionReason(e.target.value)}
                      placeholder="Enter rejection reason..."
                      className="bg-gray-700 border-gray-600 text-white"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAdAction(rejectingAd!, "rejected")}
                        className="bg-red-500 hover:bg-red-600 text-white"
                        disabled={!adRejectionReason.trim()}
                      >
                        Reject Advertisement
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRejectingAd(null)
                          setAdRejectionReason("")
                        }}
                        className="border-gray-600 text-gray-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Role Management Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Manage User Roles</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select roles for {selectedUser?.name || "this user"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {roleOptions.map((role) => (
              <div key={role.value} className="flex items-center space-x-3">
                <Checkbox
                  id={role.value}
                  checked={editingRoles.includes(role.value)}
                  onCheckedChange={(checked) => handleRoleChange(role.value, checked as boolean)}
                />
                <label htmlFor={role.value} className="flex items-center gap-2 text-white cursor-pointer">
                  <div className={`w-4 h-4 rounded ${role.color}`}></div>
                  <role.icon className="h-4 w-4" />
                  {role.label}
                </label>
              </div>
            ))}
            <div className="flex gap-2 pt-4">
              <Button onClick={saveUserRoles} className="bg-orange-500 hover:bg-orange-600">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setSelectedUser(null)} className="border-gray-600 text-gray-300">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Script Rejection Dialog */}
      <Dialog open={!!rejectingScript} onOpenChange={() => setRejectingScript(null)}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Script</DialogTitle>
            <DialogDescription className="text-gray-400">
              Please provide a reason for rejecting this script
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300">Rejection Reason</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleScriptAction(rejectingScript!, "rejected")}
                className="bg-red-500 hover:bg-red-600"
                disabled={!rejectionReason.trim()}
              >
                Reject Script
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setRejectingScript(null)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Giveaway Rejection Dialog */}
      <Dialog open={!!rejectingGiveaway} onOpenChange={() => setRejectingGiveaway(null)}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Giveaway</DialogTitle>
            <DialogDescription className="text-gray-400">
              Please provide a reason for rejecting this giveaway
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300">Rejection Reason</label>
              <Textarea
                value={giveawayRejectionReason}
                onChange={(e) => setGiveawayRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleGiveawayAction(rejectingGiveaway!, "rejected")}
                className="bg-red-500 hover:bg-red-600"
                disabled={!giveawayRejectionReason.trim()}
              >
                Reject Giveaway
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setRejectingGiveaway(null)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Script Details Dialog */}
      <Dialog open={!!viewingScript} onOpenChange={() => setViewingScript(null)}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Script Details
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Complete information about the script submission
            </DialogDescription>
          </DialogHeader>
          {viewingScript && (
            <div className="space-y-8">
              {/* Cover Image */}
              {viewingScript.cover_image && (
                <div className="relative">
                  <img 
                    src={viewingScript.cover_image} 
                    alt={viewingScript.title}
                    className="w-full h-64 object-cover rounded-lg border border-gray-700"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge 
                      className={
                        viewingScript.status === "pending" ? "bg-yellow-500 text-white" :
                        viewingScript.status === "approved" ? "bg-green-500 text-white" :
                        "bg-red-500 text-white"
                      }
                    >
                      {viewingScript.status}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div>
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Info className="h-5 w-5 text-orange-500" />
                      Basic Information
                    </h3>
                    <div className="space-y-4">
                    <div>
                        <span className="text-gray-400 text-sm font-medium">Title:</span>
                        <p className="text-white text-lg font-semibold">{viewingScript.title}</p>
                    </div>
                    <div>
                        <span className="text-gray-400 text-sm font-medium">Description:</span>
                        <p className="text-white text-sm leading-relaxed bg-gray-900/50 p-3 rounded-lg">
                          {viewingScript.description}
                        </p>
                    </div>
                      <div className="grid grid-cols-2 gap-4">
                    <div>
                          <span className="text-gray-400 text-sm font-medium">Category:</span>
                      <p className="text-white">{viewingScript.category}</p>
                    </div>
                    <div>
                          <span className="text-gray-400 text-sm font-medium">Framework:</span>
                          <p className="text-white">
                            {Array.isArray(viewingScript.framework) 
                              ? viewingScript.framework.join(", ") 
                              : viewingScript.framework || "N/A"
                            }
                          </p>
                    </div>
                  </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-400 text-sm font-medium">Price:</span>
                          <p className="text-white font-semibold">${viewingScript.price}</p>
                </div>
                        {viewingScript.original_price && (
                <div>
                            <span className="text-gray-400 text-sm font-medium">Original Price:</span>
                            <p className="text-white line-through">${viewingScript.original_price}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                    <div>
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <UserIcon className="h-5 w-5 text-orange-500" />
                      Seller Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-gray-400 text-sm font-medium">Seller Name:</span>
                      <p className="text-white">{viewingScript.seller_name}</p>
                    </div>
                    <div>
                        <span className="text-gray-400 text-sm font-medium">Seller Email:</span>
                        <p className="text-white">{viewingScript.seller_email}</p>
                    </div>
                      <div className="grid grid-cols-2 gap-4">
                    <div>
                          <span className="text-gray-400 text-sm font-medium">Downloads:</span>
                          <p className="text-white">{viewingScript.downloads || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm font-medium">Rating:</span>
                          <p className="text-white">{viewingScript.rating || 0}/5</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Features */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Star className="h-5 w-5 text-orange-500" />
                      Features
                    </h3>
                    {viewingScript.features && viewingScript.features.length > 0 ? (
                      <div className="space-y-2">
                        {viewingScript.features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-white text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm bg-gray-900/50 p-3 rounded-lg">
                        No features provided
                      </div>
                    )}
                  </div>

                  {/* Requirements */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Settings className="h-5 w-5 text-orange-500" />
                      Requirements
                    </h3>
                    {viewingScript.requirements && viewingScript.requirements.length > 0 ? (
                      <div className="space-y-2">
                        {viewingScript.requirements.map((requirement, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span className="text-white text-sm">{requirement}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm bg-gray-900/50 p-3 rounded-lg">
                        No requirements provided
                      </div>
                    )}
                  </div>

                  {/* Links */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-orange-500" />
                      Links & Resources
                    </h3>
                    {viewingScript.links && viewingScript.links.length > 0 ? (
                      <div className="space-y-2">
                        {viewingScript.links.map((link, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-400 hover:text-blue-300 border-blue-500/50"
                              onClick={() => window.open(link, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Link {index + 1}
                            </Button>
                            <span className="text-gray-400 text-sm truncate max-w-xs">{link}</span>
                    </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm bg-gray-900/50 p-3 rounded-lg">
                        No links provided
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Media Section */}
              {(viewingScript.images?.length > 0 || viewingScript.videos?.length > 0 || viewingScript.screenshots?.length > 0) && (
                    <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-orange-500" />
                    Media & Screenshots
                  </h3>
                  
                  {/* Images */}
                  {viewingScript.images && viewingScript.images.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium text-white mb-3">Images</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {viewingScript.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={image} 
                              alt={`Image ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-700 cursor-pointer hover:border-orange-500 transition-colors"
                              onClick={() => window.open(image, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <ExternalLink className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Screenshots */}
                  {viewingScript.screenshots && viewingScript.screenshots.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium text-white mb-3">Screenshots</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {viewingScript.screenshots.map((screenshot, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={screenshot} 
                              alt={`Screenshot ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-700 cursor-pointer hover:border-orange-500 transition-colors"
                              onClick={() => window.open(screenshot, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <ExternalLink className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos */}
                  {viewingScript.videos && viewingScript.videos.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium text-white mb-3">Videos</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {viewingScript.videos.map((video, index) => (
                          <div key={index} className="relative group">
                            <video 
                              src={video}
                              controls
                              className="w-full h-48 object-cover rounded-lg border border-gray-700"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="border-t border-gray-700/50 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  Metadata
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-gray-400 text-sm font-medium">Created:</span>
                      <p className="text-white">{new Date(viewingScript.created_at).toLocaleDateString()}</p>
                    </div>
                  <div>
                    <span className="text-gray-400 text-sm font-medium">Updated:</span>
                    <p className="text-white">{new Date(viewingScript.updated_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm font-medium">Reviews:</span>
                    <p className="text-white">{viewingScript.review_count || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm font-medium">Featured:</span>
                    <p className="text-white">{viewingScript.featured ? "Yes" : "No"}</p>
                  </div>
                </div>
              </div>
              
              {/* Rejection Reason */}
              {viewingScript.status === "rejected" && viewingScript.rejection_reason && (
                <div className="border-t border-gray-700/50 pt-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    Rejection Reason
                  </h3>
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                    <p className="text-red-300">{viewingScript.rejection_reason}</p>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              {viewingScript.status === "pending" && (
                <div className="flex gap-4 pt-6 border-t border-gray-700/50">
                  <Button
                    onClick={() => {
                      handleScriptAction(viewingScript.id, "approved")
                      setViewingScript(null)
                    }}
                    className="bg-green-500 hover:bg-green-600 flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Script
                  </Button>
                  <Button
                    onClick={() => {
                      setViewingScript(null)
                      setRejectingScript(viewingScript.id)
                    }}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:text-red-300 flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Script
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Giveaway Details Dialog */}
      <Dialog open={!!viewingGiveaway} onOpenChange={() => setViewingGiveaway(null)}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-500" />
              Giveaway Details
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Complete information about the giveaway submission
            </DialogDescription>
          </DialogHeader>
          {viewingGiveaway && (
            <div className="space-y-8">
              {/* Cover Image */}
              {(viewingGiveaway as any).coverImage && (
                <div className="relative">
                  <img 
                    src={(viewingGiveaway as any).coverImage} 
                    alt={viewingGiveaway.title}
                    className="w-full h-64 object-cover rounded-lg border border-gray-700"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge 
                      className={
                        viewingGiveaway.status === "pending" ? "bg-yellow-500 text-white" :
                        viewingGiveaway.status === "approved" ? "bg-green-500 text-white" :
                        "bg-red-500 text-white"
                      }
                    >
                      {viewingGiveaway.status}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Info className="h-5 w-5 text-purple-500" />
                      Basic Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-gray-400 text-sm font-medium">Title:</span>
                        <p className="text-white text-lg font-semibold">{viewingGiveaway.title}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm font-medium">Description:</span>
                        <p className="text-white text-sm leading-relaxed bg-gray-900/50 p-3 rounded-lg">
                          {viewingGiveaway.description}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-400 text-sm font-medium">Difficulty:</span>
                          <p className="text-white">{viewingGiveaway.difficulty}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm font-medium">Max Entries:</span>
                          <p className="text-white">{(viewingGiveaway as any).maxEntries || "Unlimited"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-400 text-sm font-medium">Total Value:</span>
                          <p className="text-white font-semibold">${viewingGiveaway.total_value}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm font-medium">End Date:</span>
                          <p className="text-white">{new Date(viewingGiveaway.end_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-400 text-sm font-medium">Featured:</span>
                          <p className="text-white">{viewingGiveaway.featured ? "Yes (+$10)" : "No"}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm font-medium">Auto Announce:</span>
                          <p className="text-white">{viewingGiveaway.auto_announce ? "Yes" : "No"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <UserIcon className="h-5 w-5 text-purple-500" />
                      Creator Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-gray-400 text-sm font-medium">Creator Name:</span>
                        <p className="text-white">{viewingGiveaway.creator_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm font-medium">Creator Email:</span>
                        <p className="text-white">{viewingGiveaway.creator_email}</p>
                      </div>
                      {(viewingGiveaway as any).creator_id && (
                        <div>
                          <span className="text-gray-400 text-sm font-medium">Creator ID:</span>
                          <p className="text-white font-mono text-sm">{viewingGiveaway.creator_id}</p>
                        </div>
                      )}
                      {(viewingGiveaway as any).entriesCount !== undefined && (
                        <div>
                          <span className="text-gray-400 text-sm font-medium">Current Entries:</span>
                          <p className="text-white font-semibold">{(viewingGiveaway as any).entriesCount}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Requirements */}
                  {viewingGiveaway.requirements && viewingGiveaway.requirements.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-500" />
                        Entry Requirements
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                          {viewingGiveaway.requirements.reduce((sum: number, req: any) => sum + (req.points || 0), 0)} total points
                        </Badge>
                      </h3>
                      <div className="space-y-3">
                        {viewingGiveaway.requirements.map((requirement: any, index: number) => (
                          <div key={index} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-white font-medium">Requirement {index + 1}</span>
                                {requirement.required && (
                                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Required</Badge>
                                )}
                              </div>
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                {requirement.points || 0} points
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <span className="text-gray-400 text-sm font-medium">Type:</span>
                                <p className="text-white capitalize">{requirement.type}</p>
                              </div>
                              <div>
                                <span className="text-gray-400 text-sm font-medium">Description:</span>
                                <p className="text-white text-sm">{requirement.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prizes */}
                  {viewingGiveaway.prizes && viewingGiveaway.prizes.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-purple-500" />
                        Prizes ({viewingGiveaway.prizes.length})
                      </h3>
                      <div className="space-y-3">
                        {viewingGiveaway.prizes.map((prize: any, index: number) => (
                          <div key={index} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="text-white font-medium">
                                  {index === 0 ? "🥇 1st Place" : 
                                   index === 1 ? "🥈 2nd Place" : 
                                   index === 2 ? "🥉 3rd Place" : 
                                   `${index + 1}th Place`}
                                </span>
                              </div>
                              {prize.value && (
                                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                  ${prize.value}
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div>
                                <span className="text-gray-400 text-sm font-medium">Prize Name:</span>
                                <p className="text-white font-medium">{prize.name}</p>
                              </div>
                              <div>
                                <span className="text-gray-400 text-sm font-medium">Description:</span>
                                <p className="text-white text-sm">{prize.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rules */}
                  {viewingGiveaway.rules && viewingGiveaway.rules.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-purple-500" />
                        Rules
                      </h3>
                      <div className="space-y-2">
                        {viewingGiveaway.rules.map((rule: string, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span className="text-white text-sm">{rule}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags Section */}
              {viewingGiveaway.tags && viewingGiveaway.tags.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-purple-500" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {viewingGiveaway.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Media Section */}
              {(viewingGiveaway.images?.length > 0 || viewingGiveaway.videos?.length > 0 || (viewingGiveaway as any).coverImage) && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-purple-500" />
                    Media & Content
                  </h3>
                  
                  {/* Cover Image */}
                  {(viewingGiveaway as any).coverImage && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium text-white mb-3">Cover Image</h4>
                      <div className="max-w-md">
                        <div className="relative group">
                          <img 
                            src={(viewingGiveaway as any).coverImage} 
                            alt="Cover Image"
                            className="w-full h-48 object-cover rounded-lg border border-gray-700 cursor-pointer hover:border-purple-500 transition-colors"
                            onClick={() => window.open((viewingGiveaway as any).coverImage, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <ExternalLink className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Additional Images */}
                  {viewingGiveaway.images && viewingGiveaway.images.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium text-white mb-3">
                        Additional Images ({viewingGiveaway.images.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {viewingGiveaway.images.map((image: string, index: number) => (
                          <div key={index} className="relative group">
                            <img 
                              src={image} 
                              alt={`Image ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-700 cursor-pointer hover:border-purple-500 transition-colors"
                              onClick={() => window.open(image, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <ExternalLink className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos */}
                  {viewingGiveaway.videos && viewingGiveaway.videos.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium text-white mb-3">
                        Videos ({viewingGiveaway.videos.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {viewingGiveaway.videos.map((video: string, index: number) => (
                          <div key={index} className="relative group">
                            <video 
                              src={video}
                              controls
                              className="w-full h-48 object-cover rounded-lg border border-gray-700"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="border-t border-gray-700/50 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  Metadata & Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-gray-400 text-sm font-medium">Created:</span>
                    <p className="text-white">{new Date(viewingGiveaway.created_at).toLocaleDateString()}</p>
                    <p className="text-gray-500 text-xs">{new Date(viewingGiveaway.created_at).toLocaleTimeString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm font-medium">Updated:</span>
                    <p className="text-white">{new Date(viewingGiveaway.updated_at).toLocaleDateString()}</p>
                    <p className="text-gray-500 text-xs">{new Date(viewingGiveaway.updated_at).toLocaleTimeString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm font-medium">Status:</span>
                    <p className="text-white">{viewingGiveaway.status}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm font-medium">Giveaway ID:</span>
                    <p className="text-white font-mono text-sm">#{viewingGiveaway.id}</p>
                  </div>
                </div>
                
                {/* Additional metadata if available */}
                {(viewingGiveaway as any).submittedAt && (
                  <div className="mt-4 pt-4 border-t border-gray-700/30">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-gray-400 text-sm font-medium">Submitted:</span>
                        <p className="text-white">{new Date((viewingGiveaway as any).submittedAt).toLocaleDateString()}</p>
                      </div>
                      {(viewingGiveaway as any).approvedAt && (
                        <div>
                          <span className="text-gray-400 text-sm font-medium">Approved:</span>
                          <p className="text-white">{new Date((viewingGiveaway as any).approvedAt).toLocaleDateString()}</p>
                        </div>
                      )}
                      {(viewingGiveaway as any).rejectedAt && (
                        <div>
                          <span className="text-gray-400 text-sm font-medium">Rejected:</span>
                          <p className="text-white">{new Date((viewingGiveaway as any).rejectedAt).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Notes */}
              {(viewingGiveaway as any).adminNotes && (
                <div className="border-t border-gray-700/50 pt-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-500" />
                    Admin Notes
                  </h3>
                  <div className="bg-gray-900/50 border border-gray-600/50 rounded-lg p-4">
                    <p className="text-white text-sm leading-relaxed">{(viewingGiveaway as any).adminNotes}</p>
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {viewingGiveaway.status === "rejected" && viewingGiveaway.rejection_reason && (
                <div className="border-t border-gray-700/50 pt-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    Rejection Reason
                  </h3>
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                    <p className="text-red-300">{viewingGiveaway.rejection_reason}</p>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              {viewingGiveaway.status === "pending" && (
                <div className="flex gap-4 pt-6 border-t border-gray-700/50">
                  <Button
                    onClick={() => {
                      handleGiveawayAction(viewingGiveaway.id, "approved")
                      setViewingGiveaway(null)
                    }}
                    className="bg-green-500 hover:bg-green-600 flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Giveaway
                  </Button>
                  <Button
                    onClick={() => {
                      setViewingGiveaway(null)
                      setRejectingGiveaway(viewingGiveaway.id)
                    }}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:text-red-300 flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Giveaway
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  )
}


