"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { signIn, signOut } from "next-auth/react"
import {
  User,
  Package,
  Gift,
  Edit,
  Trash2,
  Plus,
  Eye,
  Settings,
  Download,
  Star,
  Calendar,
  DollarSign,
  Tag,
  Code,
  Sparkles,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentss/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/componentss/ui/avatar"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import AdsForm from "@/componentss/ads/ads-form"

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
  tags: string[]
  features: string[]
  requirements: string[]
  images: string[]
  videos: string[]
  screenshots: string[]
  cover_image?: string
  demo_url?: string
  documentation_url?: string
  support_url?: string
  version: string
  last_updated: string
  status: "pending" | "approved" | "rejected"
  rejection_reason?: string
  featured: boolean
  downloads: number
  rating: number
  review_count: number
  created_at: string
  updated_at: string
}

interface Giveaway {
  id: number
  title: string
  description: string
  total_value: string
  category: string
  end_date: string
  max_entries?: number
  difficulty: "Easy" | "Medium" | "Hard"
  featured: boolean
  auto_announce: boolean
  creator_name: string
  creator_email: string
  creator_id?: string
  images: string[]
  videos: string[]
  cover_image?: string
  tags: string[]
  rules: string[]
  status: "active" | "ended" | "cancelled" | "pending" | "approved" | "rejected"
  entries_count: number
  created_at: string
  updated_at: string
  rejection_reason?: string
}

interface Ad {
  id: number
  title: string
  description: string
  image_url?: string
  link_url?: string
  category: string
  status: "pending" | "approved" | "rejected"
  rejection_reason?: string
  priority: number
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [scripts, setScripts] = useState<Script[]>([])
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [giveawayEntries, setGiveawayEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalScripts: 0,
    totalGiveaways: 0,
    totalAds: 0,
    totalDownloads: 0,
    totalEarnings: 0,
    totalEntries: 0,
  })
  const [showAdsForm, setShowAdsForm] = useState(false)
  const [editingAd, setEditingAd] = useState<any>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    fetchUserData()
  }, [status])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      
      // Debug: Log user roles
      console.log("Profile - User roles:", (session?.user as any)?.roles)
      
      // Fetch user's scripts from the new user-specific endpoint
      const scriptsResponse = await fetch("/api/users/scripts", {
        credentials: 'include'
      })
      console.log("Profile - Scripts response:", scriptsResponse.status)
      let scriptsData = { scripts: [] }
      if (scriptsResponse.ok) {
        scriptsData = await scriptsResponse.json()
        console.log("Profile - Scripts data:", scriptsData)
        setScripts(scriptsData.scripts || [])
      } else {
        console.error("Profile - Scripts API error:", await scriptsResponse.text())
      }

      // Fetch user's giveaways from the new user-specific endpoint
      const giveawaysResponse = await fetch("/api/users/giveaways", {
        credentials: 'include'
      })
      console.log("Profile - Giveaways response:", giveawaysResponse.status)
      let giveawaysData = { giveaways: [] }
      if (giveawaysResponse.ok) {
        giveawaysData = await giveawaysResponse.json()
        console.log("Profile - Giveaways data:", giveawaysData)
        setGiveaways(giveawaysData.giveaways || [])
      } else {
        console.error("Profile - Giveaways API error:", await giveawaysResponse.text())
      }

      // Fetch user's ads
      const adsResponse = await fetch("/api/users/advertisements", {
        credentials: 'include'
      })
      let adsData = { ads: [] }
      if (adsResponse.ok) {
        adsData = await adsResponse.json()
        setAds(adsData.ads || [])
      } else {
        console.error("Profile - Ads API error:", await adsResponse.text())
      }

      // Fetch user's giveaway entries
      const entriesResponse = await fetch("/api/users/giveaway-entries", {
        credentials: 'include'
      })
      let entriesData = { entries: [] }
      if (entriesResponse.ok) {
        entriesData = await entriesResponse.json()
        setGiveawayEntries(entriesData.entries || [])
      }

      // Calculate stats based on the data we already fetched
      const sArr = scriptsData.scripts || []
      const gArr = giveawaysData.giveaways || []
      const aArr = adsData.ads || []
      const eArr = entriesData.entries || []
      const totalDownloads = sArr.reduce((sum: number, script: any) => sum + (script.downloads || 0), 0)
      const totalEarnings = sArr.reduce((sum: number, script: any) => sum + ((script.downloads || 0) * Number(script.price)), 0)
      
      const finalStats = {
        totalScripts: sArr.length,
        totalGiveaways: gArr.length,
        totalAds: aArr.length,
        totalDownloads: totalDownloads,
        totalEarnings: totalEarnings,
        totalEntries: eArr.length,
      }
      
      console.log("Profile - Final stats:", finalStats);
      setStats(finalStats);

    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditScript = (scriptId: number) => {
    router.push(`/scripts/submit?edit=${scriptId}`)
  }

  const handleEditGiveaway = (giveawayId: number) => {
    router.push(`/profile/giveaways/${giveawayId}/edit`)
  }

  const handleEditAd = (adId: number) => {
    const ad = ads.find(a => a.id === adId)
    if (ad) {
      setEditingAd(ad)
      setShowAdsForm(true)
    }
  }

  const handleDeleteScript = async (scriptId: number) => {
    if (!confirm("Are you sure you want to delete this script?")) return

    try {
      const response = await fetch(`/api/users/scripts?id=${scriptId}`, {
        method: "DELETE",
        credentials: 'include'
      })

      if (response.ok) {
        setScripts(scripts.filter(script => script.id !== scriptId))
        // Update stats without full page refresh
        setStats(prevStats => ({
          ...prevStats,
          totalScripts: prevStats.totalScripts - 1
        }))
      } else {
        alert("Failed to delete script")
      }
    } catch (error) {
      console.error("Error deleting script:", error)
      alert("Error deleting script")
    }
  }

  const handleDeleteGiveaway = async (giveawayId: number) => {
    if (!confirm("Are you sure you want to delete this giveaway?")) return

    try {
      const response = await fetch(`/api/users/giveaways?id=${giveawayId}`, {
        method: "DELETE",
        credentials: 'include'
      })

      if (response.ok) {
        setGiveaways(giveaways.filter(giveaway => giveaway.id !== giveawayId))
        // Update stats without full page refresh
        setStats(prevStats => ({
          ...prevStats,
          totalGiveaways: prevStats.totalGiveaways - 1
        }))
      } else {
        alert("Failed to delete giveaway")
      }
    } catch (error) {
      console.error("Error deleting giveaway:", error)
      alert("Error deleting giveaway")
    }
  }

  const handleDeleteAd = async (adId: number) => {
    if (!confirm("Are you sure you want to delete this ad?")) return

    try {
      console.log("Attempting to delete ad with ID:", adId)
      console.log("Session:", session)
      
      const url = `/api/users/advertisements?id=${adId}`
      console.log("DELETE URL:", url)
      
      const response = await fetch(url, {
        method: "DELETE",
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      console.log("Response status:", response.status)
      console.log("Response ok:", response.ok)

      if (response.ok) {
        const result = await response.json()
        console.log("Delete result:", result)
        setAds(ads.filter(ad => ad.id !== adId))
        // Update stats without full component refresh
        setStats(prevStats => ({
          ...prevStats,
          totalAds: prevStats.totalAds - 1
        }))
        alert("Ad deleted successfully!")
      } else {
        const errorText = await response.text()
        console.error("Delete failed:", response.status, errorText)
        alert(`Failed to delete ad: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error("Error deleting ad:", error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Network error: ${errorMessage}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "rejected":
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "ended":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const handleAdCreated = () => {
    // Refresh ads data after creating/updating an ad
    fetchUserData()
    setEditingAd(null)
  }

  if (status === "loading" || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
      </>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500/10 to-yellow-400/10 py-12 px-4 sm:px-6 lg:px-8 border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="flex items-center gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Avatar className="h-20 w-20">
                <AvatarImage src={session.user?.image || ""} />
                <AvatarFallback className="bg-orange-500 text-white text-2xl">
                  {session.user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold">{session.user?.name}</h1>
                <p className="text-gray-400">{session.user?.email}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex flex-wrap gap-2">
                    {(session.user as any)?.roles?.length > 0 ? (
                      (session.user as any).roles.map((role: string) => (
                        <Badge 
                          key={role}
                          className={`${
                            role === 'founder' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                            role === 'admin' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            role === 'verified_creator' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            role === 'moderator' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            role === 'crew' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}
                        >
                          {role === 'verified_creator' ? 'Verified Creator' : 
                           role === 'moderator' ? 'Moderator' :
                           role.charAt(0).toUpperCase() + role.slice(1)}
                        </Badge>
                      ))
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        Loading roles...
                      </Badge>
                    )}
                  </div>
                  <span className="text-gray-500">Member since {new Date().toLocaleDateString()}</span>
                  {/* Debug session button removed */}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 bg-gray-800/50">
              <TabsTrigger value="overview" className="data-[state=active]:bg-orange-500">
                <User className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="scripts" className="data-[state=active]:bg-orange-500">
                <Package className="h-4 w-4 mr-2" />
                Scripts ({stats.totalScripts})
              </TabsTrigger>
              <TabsTrigger value="giveaways" className="data-[state=active]:bg-orange-500">
                <Gift className="h-4 w-4 mr-2" />
                Giveaways ({stats.totalGiveaways})
              </TabsTrigger>
              <TabsTrigger value="ads" className="data-[state=active]:bg-orange-500">
                <Tag className="h-4 w-4 mr-2" />
                Ads ({stats.totalAds})
              </TabsTrigger>
              <TabsTrigger value="entries" className="data-[state=active]:bg-orange-500">
                <Sparkles className="h-4 w-4 mr-2" />
                Entries ({stats.totalEntries})
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-orange-500">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-gray-800/30 border-gray-700/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/20 rounded-lg">
                          <Package className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Total Scripts</p>
                          <p className="text-2xl font-bold">{stats.totalScripts}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800/30 border-gray-700/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/20 rounded-lg">
                          <Gift className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Total Giveaways</p>
                          <p className="text-2xl font-bold">{stats.totalGiveaways}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800/30 border-gray-700/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                          <Download className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Total Downloads</p>
                          <p className="text-2xl font-bold">{stats.totalDownloads}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800/30 border-gray-700/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/20 rounded-lg">
                          <DollarSign className="h-6 w-6 text-yellow-500" />
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Total Earnings</p>
                          <p className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-orange-500" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {scripts.slice(0, 3).map((script) => (
                        <div key={script.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                          <div className="flex items-center gap-4">
                            <Package className="h-5 w-5 text-orange-500" />
                            <div>
                              <p className="font-medium">{script.title}</p>
                              <p className="text-sm text-gray-400">Script • {new Date(script.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(script.status)}>
                            {script.status}
                          </Badge>
                        </div>
                      ))}
                      {giveaways.slice(0, 3).map((giveaway) => (
                        <div key={giveaway.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                          <div className="flex items-center gap-4">
                            <Gift className="h-5 w-5 text-green-500" />
                            <div>
                              <p className="font-medium">{giveaway.title}</p>
                              <p className="text-sm text-gray-400">Giveaway • {new Date(giveaway.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(giveaway.status)}>
                            {giveaway.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Scripts Tab */}
            <TabsContent value="scripts" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">My Scripts</h2>
                  <Button
                    onClick={() => router.push("/scripts/submit")}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Script
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {scripts.map((script) => (
                    <Card key={script.id} className="bg-gray-800/30 border-gray-700/50 hover:border-orange-500/50 transition-colors">
                      <CardContent className="p-6">
                        <div className="aspect-video bg-gray-700 rounded-lg mb-4 overflow-hidden">
                          {script.cover_image || (script.screenshots && script.screenshots.length > 0) ? (
                            <img
                              src={script.cover_image || script.screenshots[0]}
                              alt={script.title}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-12 w-12 text-gray-500" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h3 className="font-bold text-lg">{script.title}</h3>
                            <p className="text-gray-400 text-sm line-clamp-2">{script.description}</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-orange-500" />
                              <span className="font-bold">${script.price}</span>
                            </div>
                            <Badge className={getStatusColor(script.status)}>
                              {script.status}
                            </Badge>
                          </div>

                          {script.status === "rejected" && script.rejection_reason && (
                            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-red-400 text-sm font-medium">Rejection Reason:</p>
                                  <p className="text-red-300 text-sm mt-1">{script.rejection_reason}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Download className="h-4 w-4" />
                            <span>{script.downloads} downloads</span>
                            <Star className="h-4 w-4" />
                            <span>{(Number(script.rating) || 0).toFixed(1)} ({script.review_count || 0} reviews)</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => router.push(`/script/${script.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => handleEditScript(script.id)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => handleDeleteScript(script.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {scripts.length === 0 && (
                  <Card className="bg-gray-800/30 border-gray-700/50">
                    <CardContent className="p-12 text-center">
                      <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">No scripts yet</h3>
                      <p className="text-gray-400 mb-4">Start creating your first script to showcase your work</p>
                      <Button
                        onClick={() => router.push("/scripts/submit")}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Script
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </TabsContent>

            {/* Giveaways Tab */}
            <TabsContent value="giveaways" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">My Giveaways</h2>
                  <Button
                    onClick={() => router.push("/giveaways/create")}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Giveaway
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {giveaways.map((giveaway) => (
                    <Card key={giveaway.id} className="bg-gray-800/30 border-gray-700/50 hover:border-green-500/50 transition-colors">
                      <CardContent className="p-6">
                        <div className="aspect-video bg-gray-700 rounded-lg mb-4 overflow-hidden">
                          {giveaway.cover_image || (giveaway.images && giveaway.images.length > 0) ? (
                            <img
                              src={giveaway.cover_image || giveaway.images[0]}
                              alt={giveaway.title}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Gift className="h-12 w-12 text-gray-500" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h3 className="font-bold text-lg">{giveaway.title}</h3>
                            <p className="text-gray-400 text-sm line-clamp-2">{giveaway.description}</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-500" />
                              <span className="font-bold">{giveaway.total_value}</span>
                            </div>
                            <Badge className={getStatusColor(giveaway.status)}>
                              {giveaway.status}
                            </Badge>
                          </div>

                          {giveaway.status === "rejected" && giveaway.rejection_reason && (
                            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-red-400 text-sm font-medium">Rejection Reason:</p>
                                  <p className="text-red-300 text-sm mt-1">{giveaway.rejection_reason}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="h-4 w-4" />
                            <span>Ends {new Date(giveaway.end_date).toLocaleDateString()}</span>
                            <Tag className="h-4 w-4" />
                            <span>{giveaway.entries_count} entries</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => router.push(`/giveaway/${giveaway.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => handleEditGiveaway(giveaway.id)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => handleDeleteGiveaway(giveaway.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {giveaways.length === 0 && (
                  <Card className="bg-gray-800/30 border-gray-700/50">
                    <CardContent className="p-12 text-center">
                      <Gift className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">No giveaways yet</h3>
                      <p className="text-gray-400 mb-4">Start creating your first giveaway to engage with the community</p>
                      <Button
                        onClick={() => router.push("/giveaways/create")}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Giveaway
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </TabsContent>

            {/* Ads Tab */}
            <TabsContent value="ads" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">My Ads</h2>
                  <Button 
                    onClick={() => setShowAdsForm(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Ad
                  </Button>
                </div>

                {ads.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ads.map((ad) => (
                      <Card key={ad.id} className="bg-gray-800/30 border-gray-700/50 hover:border-orange-500/50 transition-all duration-300">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                              {ad.category}
                            </Badge>
                            <Badge className={`text-xs ${getStatusColor(ad.status)}`}>
                              {ad.status}
                            </Badge>
                          </div>
                          <CardTitle className="text-white text-lg line-clamp-2">
                            {ad.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                            {ad.description}
                          </p>
                          {ad.image_url && (
                            <div className="w-full h-32 rounded-lg overflow-hidden mb-4">
                              <img
                                src={ad.image_url}
                                alt={ad.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}
                          {ad.status === "rejected" && ad.rejection_reason && (
                            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-red-400 text-sm font-medium">Rejection Reason:</p>
                                  <p className="text-red-300 text-sm mt-1">{ad.rejection_reason}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              Created: {new Date(ad.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                type="button"
                                onClick={() => handleEditAd(ad.id)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                type="button"
                                onClick={() => handleDeleteAd(ad.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-gray-800/30 border-gray-700/50">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Tag className="h-16 w-16 text-gray-500 mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">No ads yet</h3>
                      <p className="text-gray-400 text-center mb-6">
                        Start creating your first ad to promote your content
                      </p>
                      <Button 
                        onClick={() => setShowAdsForm(true)}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Ad
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </TabsContent>

            {/* Entries Tab */}
            <TabsContent value="entries" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="grid gap-6">
                  {giveawayEntries.map((entry, index) => (
                    <Card key={entry.id} className="bg-gray-800/30 border-gray-700/50">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              {entry.giveaway_cover && (
                                <img
                                  src={entry.giveaway_cover}
                                  alt={entry.giveaway_title}
                                  className="w-16 h-16 rounded-lg object-cover"
                                />
                              )}
                              <div>
                                <h3 className="text-lg font-semibold text-white">{entry.giveaway_title}</h3>
                                <p className="text-sm text-gray-400">
                                  Entered on {new Date(entry.entry_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <Badge className={`${
                                entry.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                entry.status === 'winner' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                              </Badge>
                              <span className="text-gray-400">
                                Points: {entry.points_earned}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => router.push(`/giveaway/${entry.giveaway_id}`)}
                              className="border-gray-600 text-gray-300 hover:text-white hover:border-orange-500"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {giveawayEntries.length === 0 && (
                    <Card className="bg-gray-800/30 border-gray-700/50">
                      <CardContent className="p-12 text-center">
                        <Sparkles className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">No entries yet</h3>
                        <p className="text-gray-400 mb-4">Start entering giveaways to win amazing prizes</p>
                        <Button
                          onClick={() => router.push("/giveaways")}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          Browse Giveaways
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </motion.div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Settings className="h-5 w-5 text-orange-500" />
                      Account Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                          <input
                            type="text"
                            value={session.user?.name || ""}
                            disabled
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                          <input
                            type="email"
                            value={session.user?.email || ""}
                            disabled
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Account Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                          <p className="text-2xl font-bold text-orange-500">{stats.totalScripts}</p>
                          <p className="text-sm text-gray-400">Scripts</p>
                        </div>
                        <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                          <p className="text-2xl font-bold text-green-500">{stats.totalGiveaways}</p>
                          <p className="text-sm text-gray-400">Giveaways</p>
                        </div>
                        <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                          <p className="text-2xl font-bold text-blue-500">{stats.totalDownloads}</p>
                          <p className="text-sm text-gray-400">Downloads</p>
                        </div>
                        <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                          <p className="text-2xl font-bold text-yellow-500">${stats.totalEarnings.toFixed(2)}</p>
                          <p className="text-sm text-gray-400">Earnings</p>
                        </div>
                        <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                          <p className="text-2xl font-bold text-purple-500">{stats.totalEntries}</p>
                          <p className="text-sm text-gray-400">Entries</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
      
      {/* Ads Form Dialog */}
      <AdsForm 
        isOpen={showAdsForm}
        onClose={() => {
          setShowAdsForm(false)
          setEditingAd(null)
        }}
        onSuccess={handleAdCreated}
        editData={editingAd}
      />
    </>
  )
}
