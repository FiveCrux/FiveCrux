"use client"

import { useState, useRef, useEffect } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import {
  Gift,
  Clock,
  Users,
  Trophy,
  CheckCircle,
  Calendar,
  Share2,
  Heart,
  Flag,
  Award,
  Sparkles,
  Zap,
  Target,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Play,
  ImageIcon,
} from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Progress } from "@/componentss/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentss/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/componentss/ui/avatar"
import Link from "next/link"
import { useParams } from "next/navigation"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"

// Add CSS for spin animation
const spinStyle = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

// Animated background particles
const AnimatedParticles = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-20">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-yellow-500/20 rounded-full"
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

// Media Slider Component
const MediaSlider = ({ 
  images, 
  screenshots, 
  videos, 
  title 
}: { 
  images: string[], 
  screenshots: string[], 
  videos: string[], 
  title: string 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const allMedia = [...images, ...screenshots, ...videos]
  
  // Debug logging
  console.log('MediaSlider props:', { images, screenshots, videos, title });
  console.log('All media:', allMedia);
  
  if (allMedia.length === 0) return null

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % allMedia.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length)
  }

  const isVideo = (url: string) => {
    return videos.includes(url)
  }

  return (
    <div className="relative">
      {/* Main Slider */}
      <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden group">
        {allMedia.map((media, index) => (
          <motion.div
            key={index}
            className={`absolute inset-0 ${index === currentIndex ? 'block' : 'hidden'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: index === currentIndex ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {isVideo(media) ? (
              <video
                src={media}
                controls
                preload="metadata"
                className="w-full h-full object-contain bg-gray-800"
                onError={(e) => {
                  const target = e.target as HTMLVideoElement;
                  console.error('Video error:', target.error);
                  target.style.display = 'none';
                }}
                onLoadStart={() => console.log('Video loading started:', media)}
                onCanPlay={() => console.log('Video can play:', media)}
              />
            ) : (
              <img
                src={media}
                alt={`${title} - Media ${index + 1}`}
                className="w-full h-full object-contain bg-gray-800 transition-transform duration-500 hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            )}
          </motion.div>
        ))}
        
        {/* Navigation Arrows */}
        {allMedia.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
        
        {/* Media Counter */}
        {allMedia.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {allMedia.length}
          </div>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {allMedia.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {allMedia.map((media, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                index === currentIndex ? 'border-orange-500 scale-105' : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              {isVideo(media) ? (
                <div className="relative w-full h-full">
                  <video src={media} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                </div>
              ) : (
                <img
                  src={media}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper function to calculate time left
function calculateTimeLeft(endDate: string): string {
  const now = new Date()
  const end = new Date(endDate)
  const diff = end.getTime() - now.getTime()
  
  if (diff <= 0) return "Ended"
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function GiveawayDetailPage() {
  const params = useParams()
  const giveawayId = params.id as string

  console.log('GiveawayDetailPage rendered with ID:', giveawayId)

  const heroRef = useRef(null)
  const detailsRef = useRef(null)

  const heroInView = useInView(heroRef, { once: true })
  const detailsInView = useInView(detailsRef, { once: true })

  const [isEntered, setIsEntered] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<number[]>([])
  const [giveaway, setGiveaway] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch giveaway data
  useEffect(() => {
    const fetchGiveaway = async () => {
      try {
        setLoading(true)
        console.log('Fetching giveaway with ID:', giveawayId)
        const response = await fetch(`/api/giveaways/${giveawayId}`, { cache: "no-store" })
        
        console.log('Response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('Giveaway data:', data)
          setGiveaway(data)
        } else {
          const errorText = await response.text()
          console.error('Failed to fetch giveaway:', response.status, errorText)
          setError('Failed to load giveaway')
        }
      } catch (error) {
        setError('Error loading giveaway')
        console.error('Error fetching giveaway:', error)
      } finally {
        setLoading(false)
      }
    }

    if (giveawayId) {
      fetchGiveaway()
    }
  }, [giveawayId])

  // Check if user has already entered this giveaway
  useEffect(() => {
    const checkUserEntry = async () => {
      try {
        const response = await fetch(`/api/giveaways/${giveawayId}/entries?userOnly=true`)
        if (response.ok) {
          const data = await response.json()
          if (data.entry) {
            setIsEntered(true)
          }
        }
      } catch (error) {
        console.error('Error checking user entry:', error)
      }
    }

    if (giveawayId) {
      checkUserEntry()
    }
  }, [giveawayId])

  // Transform database data to match expected format
  const transformedGiveaway = {
    id: giveaway?.id || 1,
    title: giveaway?.title || "Test Giveaway",
    description: giveaway?.description || "This is a test giveaway description",
    value: giveaway?.total_value || "$500",
    entries: giveaway?.entries_count || 0,
    maxEntries: giveaway?.max_entries || 1000,
    timeLeft: calculateTimeLeft(giveaway?.end_date || "2024-12-31"),
    endDate: giveaway?.end_date || "2024-12-31",
    difficulty: giveaway?.difficulty || "Medium",
    category: giveaway?.category || "Scripts",
    createdAt: giveaway?.created_at || giveaway?.createdAt || new Date().toISOString(),
    updatedAt: giveaway?.updated_at || giveaway?.updatedAt || new Date().toISOString(),
    featured: giveaway?.featured || false,
    creator: {
      name: giveaway?.creator_name || giveaway?.creatorName || "Unknown Creator",
      email: giveaway?.creator_email || giveaway?.creatorEmail || "",
      id: giveaway?.creator_id || giveaway?.creatorId || "",
      avatar: giveaway?.creator_image || "/placeholder-user.jpg", // Discord profile picture or default
      verified: true, // You can implement verification logic later
      giveaways: 0, // This would need to be calculated from database
      followers: 0, // This would need to be calculated from database
    },
    prizes: giveaway?.prizes || [
      { position: 1, name: "First Prize", description: "Amazing first prize", value: "$300", winner: null },
      { position: 2, name: "Second Prize", description: "Great second prize", value: "$150", winner: null },
      { position: 3, name: "Third Prize", description: "Nice third prize", value: "$50", winner: null },
    ],
    requirements: giveaway?.requirements || [
      { id: 1, description: "Join Discord Server", type: "discord", points: 10, required: true, link: "https://discord.gg/test" },
      { id: 2, description: "Follow on Twitter", type: "follow", points: 5, required: false, link: "https://twitter.com/test" },
      { id: 3, description: "Share Giveaway", type: "share", points: 15, required: true, link: null },
    ],
    images: giveaway?.images || ["/cat.jpg"],
    videos: giveaway?.videos || [],
    cover_image: giveaway?.cover_image || "/cat.jpg",
  }

  // Auto-verify Discord requirements on page load
  useEffect(() => {
    const autoVerifyDiscordRequirements = async () => {
      if (!giveaway || !transformedGiveaway.requirements || autoVerificationDone) return;
      
      setAutoVerifying(true);
      
      const discordRequirements = transformedGiveaway.requirements.filter(
        (req: any) => req.type === "discord" && req.description
      );
      
      if (discordRequirements.length > 0) {
        // Fetch Discord servers once for all requirements
        await fetchUserDiscordServers();
        
        for (const requirement of discordRequirements) {
          try {
            // Always fetch and store server name for display
            const serverName = await extractDiscordServerName(requirement.description);
            if (serverName) {
              setServerNames(prev => ({ ...prev, [requirement.id]: serverName }));
            }
            
            // Check if user has already joined this server (using cached servers)
            const hasJoined = await checkUserJoinedServer(requirement.description);
            if (hasJoined) {
              setCompletedTasks(prev => [...prev, requirement.id]);
            }
          } catch (error) {
            console.error('Error auto-verifying Discord requirement:', error);
          }
        }
      }
      
      setAutoVerificationDone(true);
      setAutoVerifying(false);
    };
    
    autoVerifyDiscordRequirements();
  }, [giveaway, transformedGiveaway.requirements]);

  const relatedGiveaways = [
    {
      id: 2,
      title: "Custom Development Service",
      value: "$300",
      timeLeft: "5d 8h",
      image: "/cat.jpg",
      entries: 892,
    },
    {
      id: 3,
      title: "Server Setup Package",
      value: "$200",
      timeLeft: "1d 3h",
      image: "/cat.jpg",
      entries: 634,
    },
    {
      id: 4,
      title: "Premium Script Collection",
      value: "$150",
      timeLeft: "7d 12h",
      image: "/cat.jpg",
      entries: 1456,
    },
  ]

  const [openedDiscordTasks, setOpenedDiscordTasks] = useState<number[]>([])
  const [serverNames, setServerNames] = useState<{[key: number]: string}>({})
  const [loadingStates, setLoadingStates] = useState<{[key: number]: boolean}>({})
  const [autoVerifying, setAutoVerifying] = useState(false)
  const [userDiscordServers, setUserDiscordServers] = useState<any[]>([])
  const [discordServersLoaded, setDiscordServersLoaded] = useState(false)
  const [autoVerificationDone, setAutoVerificationDone] = useState(false)

  // Fetch user's Discord servers once and cache them
  const fetchUserDiscordServers = async (): Promise<any[]> => {
    if (discordServersLoaded && userDiscordServers.length > 0) {
      return userDiscordServers;
    }

    try {
      const response = await fetch('/api/user/discord-servers');
      if (!response.ok) return [];
      
      const data = await response.json();
      const guilds = data.guilds || [];
      
      setUserDiscordServers(guilds);
      setDiscordServersLoaded(true);
      return guilds;
    } catch (error) {
      console.error('Error fetching Discord servers:', error);
      return [];
    }
  }

  const handleTaskComplete = async (taskId: number) => {
    const task = transformedGiveaway.requirements.find((req: any) => req.id === taskId);
    
    if (!task) return;
    
    // Handle Discord server join - directly open the Discord invite link
    if (task.type === "discord" && task.description) {
      try {
        // Set loading state
        setLoadingStates(prev => ({ ...prev, [taskId]: true }));
        
        // Check if user has already joined this server
        const hasJoined = await checkUserJoinedServer(task.description);
        
        if (hasJoined) {
          // User has already joined, mark as completed
          setCompletedTasks([...completedTasks, taskId]);
          alert(`✅ You're already a member of this Discord server. Task completed!`);
          return;
        }
        
        // Open Discord invite in new tab
        window.open(task.description, '_blank');
        
        // Mark this task as opened
        if (!openedDiscordTasks.includes(taskId)) {
          setOpenedDiscordTasks([...openedDiscordTasks, taskId]);
        }
        
        // Show instructions to user
        alert("Discord invite opened! Please join the server and then click 'Verify Join' to check your membership.");
        
      } catch (error) {
        console.error('Error opening Discord link:', error);
        alert("Error opening Discord invite. Please try again.");
      } finally {
        // Clear loading state
        setLoadingStates(prev => ({ ...prev, [taskId]: false }));
      }
    } else {
      // For non-Discord tasks, just mark as completed
      if (!completedTasks.includes(taskId)) {
        setCompletedTasks([...completedTasks, taskId]);
      }
    }
  }

  // Check if user has joined the Discord server
  const checkUserJoinedServer = async (discordLink: string): Promise<boolean> => {
    try {
      // Extract invite code from Discord link - be more lenient with URL parsing
      let inviteCode = null;
      
      try {
        const url = new URL(discordLink);
        inviteCode = url.pathname.split('/').pop();
      } catch (urlError) {
        // If URL parsing fails, try to extract invite code from the string directly
        const match = discordLink.match(/(?:discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)([a-zA-Z0-9]+)/);
        if (match) {
          inviteCode = match[1];
        }
      }
      
      if (!inviteCode) return false;
      
      // Get server ID from invite code
      const serverId = await getServerIdFromInvite(inviteCode);
      if (!serverId) return false;
      
      // Use cached Discord servers (fetch only if not already loaded)
      const userGuilds = await fetchUserDiscordServers();
      
      // Check if user is a member of this server
      return userGuilds.some((guild: any) => guild.id === serverId);
      
    } catch (error) {
      console.error('Error checking server membership:', error);
      return false;
    }
  }

  // Get server ID from Discord invite code
  const getServerIdFromInvite = async (inviteCode: string): Promise<string | null> => {
    try {
      const response = await fetch(`https://discord.com/api/invites/${inviteCode}?with_counts=true`);
      if (response.ok) {
        const data = await response.json();
        return data.guild?.id || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching server ID from invite:', error);
      return null;
    }
  }

  // Helper function to extract Discord server name from invite link
  const extractDiscordServerName = async (link: string): Promise<string | null> => {
    try {
      const url = new URL(link);
      const inviteCode = url.pathname.split('/').pop();
      
      if (!inviteCode) return null;
      
      // Try to fetch server info from Discord API
      try {
        const response = await fetch(`https://discord.com/api/invites/${inviteCode}?with_counts=true`);
        if (response.ok) {
          const data = await response.json();
          return data.guild?.name || null;
        }
      } catch (apiError) {
        console.log('Could not fetch server name from Discord API:', apiError);
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting Discord server name:', error);
      return null;
    }
  }

  const handleMarkDone = (taskId: number) => {
    if (!completedTasks.includes(taskId)) {
      setCompletedTasks([...completedTasks, taskId]);
    }
  }

  // Helper function to extract Discord server name from invite link (for display)
  const extractServerNameFromLink = (link: string): string => {
    try {
      const url = new URL(link);
      const inviteCode = url.pathname.split('/').pop();
      
      if (!inviteCode) return "Discord Server";
      
      // Return a formatted version of the invite code for display
      return `Server (${inviteCode})`;
    } catch (error) {
      return "Discord Server";
    }
  }

  // Helper function to validate Discord invite links
  const isValidDiscordLink = (link: string): boolean => {
    try {
      const url = new URL(link);
      return (
        url.hostname === 'discord.gg' ||
        url.hostname === 'discord.com' ||
        url.hostname === 'discordapp.com'
      ) && url.pathname.includes('/invite/');
    } catch (error) {
      return false;
    }
  }

  const handleEnterGiveaway = async () => {
    const requiredTasks = transformedGiveaway.requirements.filter((req: any) => req.required)
    const completedRequired = requiredTasks.every((task: any) => completedTasks.includes(task.id))

    if (!completedRequired) {
      alert("Please complete all required tasks first!")
      return
    }

    try {
      const response = await fetch(`/api/giveaways/${giveawayId}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setIsEntered(true)
        // Refresh the giveaway data to update entry count
        window.location.reload()
      } else {
        alert(data.error || "Failed to enter giveaway")
      }
    } catch (error) {
      console.error('Error entering giveaway:', error)
      alert("Failed to enter giveaway. Please try again.")
    }
  }

  const totalPoints = transformedGiveaway.requirements.reduce((sum: any, req: any) => sum + req.points, 0)
  const earnedPoints = transformedGiveaway.requirements
    .filter((req: any) => completedTasks.includes(req.id))
    .reduce((sum: any, req: any) => sum + req.points, 0)

  const progressPercentage = (transformedGiveaway.entries / transformedGiveaway.maxEntries) * 100

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-xl">Loading giveaway...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  // Error state - show fallback content instead of error page
  if (error || !giveaway) {
    console.log('Showing fallback content due to error:', error, 'or no giveaway data')
    // Continue with fallback data instead of showing error page
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: spinStyle }} />
      <div className="relative z-50">
        <Navbar />
      </div>
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        <AnimatedParticles />

        {/* Animated background */}
        <div className="fixed inset-0 -z-10">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"
            animate={{
              background: [
                "radial-gradient(circle at 20% 50%, rgba(234, 179, 8, 0.03) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.03) 0%, transparent 50%)",
                "radial-gradient(circle at 40% 80%, rgba(234, 179, 8, 0.03) 0%, transparent 50%)",
              ],
            }}
            transition={{
              duration: 10,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-50">
          {/* Hero Section */}
          <motion.section
            ref={heroRef}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
          {/* Media Gallery */}
          {((transformedGiveaway.images && transformedGiveaway.images.length > 0) || (transformedGiveaway.videos && transformedGiveaway.videos.length > 0)) && (
            <section className="mb-16">
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                  <ImageIcon className="h-8 w-8 text-orange-500" />
                  Media Gallery
                </h2>
                
                <MediaSlider 
                  images={transformedGiveaway.images || []}
                  screenshots={[]}
                  videos={transformedGiveaway.videos || []}
                  title={transformedGiveaway.title}
                />
              </motion.div>
            </section>
          )}

          {/* Giveaway Info */}
          <div className="space-y-6">
              <motion.div
                initial={{ opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{transformedGiveaway.category}</Badge>
                  <Badge
                    className={`${
                      transformedGiveaway.difficulty === "Easy"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : transformedGiveaway.difficulty === "Medium"
                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                    }`}
                  >
                    {transformedGiveaway.difficulty}
                  </Badge>
                  {transformedGiveaway.featured && <Badge className="bg-orange-500 text-white">Featured</Badge>}
                </div>

                <h1 className="text-4xl font-bold text-white mb-4">{transformedGiveaway.title}</h1>

                <div className="flex items-center gap-4 mb-4">
                  <motion.div
                    className="text-3xl font-bold text-yellow-400"
                    animate={{
                      textShadow: ["0 0 0px currentColor", "0 0 20px currentColor", "0 0 0px currentColor"],
                    }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  >
                    {transformedGiveaway.value}
                  </motion.div>
                  <div className="text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-semibold text-orange-500">{transformedGiveaway.timeLeft}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="h-4 w-4" />
                      <span>{transformedGiveaway.entries.toLocaleString()} entries</span>
                    </div>
                  </div>
                </div>

                <p className="text-gray-300 text-lg leading-relaxed mb-6">{transformedGiveaway.description}</p>

                {/* Creator Info */}
                <motion.div
                  className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 mb-6 backdrop-blur-sm"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={transformedGiveaway.creator.avatar || "/cat.jpg"} />
                      <AvatarFallback className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold">
                        {transformedGiveaway.creator.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold">{transformedGiveaway.creator.name}</h3>
                        {transformedGiveaway.creator.verified && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }}>
                            <Award className="h-4 w-4 text-yellow-400" />
                          </motion.div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{transformedGiveaway.creator.giveaways} giveaways</span>
                        <span>{transformedGiveaway.creator.followers.toLocaleString()} followers</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Created on {new Date(transformedGiveaway.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:text-white">
                      Follow
                    </Button>
                  </div>
                </motion.div>
              </motion.div>

              {/* Entry Progress */}
              <motion.div
                className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Entry Progress</h3>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {earnedPoints}/{totalPoints} points
                  </Badge>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>{transformedGiveaway.entries.toLocaleString()} entries</span>
                    <span>{transformedGiveaway.maxEntries.toLocaleString()} max</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2 bg-gray-700" />
                </div>

                <div className="space-y-4">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleEnterGiveaway}
                      disabled={isEntered}
                      className={`w-full ${
                        isEntered
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
                      } text-black font-bold py-3 text-lg shadow-lg`}
                    >
                      {isEntered ? (
                        <>
                          <Trophy className="mr-2 h-5 w-5" />
                          Entered!
                        </>
                      ) : (
                        <>
                          <Gift className="mr-2 h-5 w-5" />
                          Enter Giveaway
                        </>
                      )}
                    </Button>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-3">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outline"
                        className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-yellow-500"
                        onClick={() => setIsWishlisted(!isWishlisted)}
                      >
                        <Heart className={`mr-2 h-4 w-4 ${isWishlisted ? "fill-current text-red-500" : ""}`} />
                        {isWishlisted ? "Saved" : "Save"}
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outline"
                        className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-yellow-500"
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-6 pt-6 border-t border-gray-700/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Sparkles className="h-4 w-4" />
                      <span>{(transformedGiveaway.entries * 0.8).toFixed(0)} participants</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Target className="h-4 w-4" />
                      <span>76% completion rate</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Share2 className="h-4 w-4" />
                      <span>{(transformedGiveaway.entries * 0.4).toFixed(0)} shares</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>Ends {new Date(transformedGiveaway.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.section>

          {/* Detailed Information Tabs */}
          <motion.section
            ref={detailsRef}
            className="mb-16"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Tabs defaultValue="tasks" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-gray-800/30 border border-gray-700/50 backdrop-blur-sm">
                <TabsTrigger value="tasks" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                  Tasks
                </TabsTrigger>
                <TabsTrigger
                  value="prizes"
                  className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
                >
                  Prizes
                </TabsTrigger>
                <TabsTrigger value="rules" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                  Rules
                </TabsTrigger>
                <TabsTrigger value="stats" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                  Stats
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="mt-6">
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Target className="h-5 w-5 text-yellow-400" />
                      Entry Tasks
                      {autoVerifying && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                          Checking Discord memberships...
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {transformedGiveaway.requirements.map((task: any, index: number) => (
                      <motion.div
                        key={task.id}
                        className={`p-4 rounded-lg border transition-all duration-300 ${
                          completedTasks.includes(task.id)
                            ? "bg-green-500/10 border-green-500/30"
                            : "bg-gray-700/30 border-gray-600/50 hover:border-yellow-500/50"
                        }`}
                        initial={{ opacity: 1, x: 0 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ x: 5 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <motion.div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                completedTasks.includes(task.id) ? "bg-green-500 border-green-500" : "border-gray-500"
                              }`}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              {completedTasks.includes(task.id) && <CheckCircle className="h-4 w-4 text-white" />}
                            </motion.div>
                            <div>
                              <h4 className="text-white font-medium flex items-center gap-2">
                                {task.type === "discord" && task.description ? (
                                  <>
                                    Join Discord Server
                                    {serverNames[task.id] && (
                                      <span className="text-sm text-gray-400 font-normal ml-2">
                                        ({serverNames[task.id]})
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  task.description
                                )}
                                {task.required && (
                                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                    Required
                                  </Badge>
                                )}
                              </h4>
                              <p className="text-sm text-gray-400">
                                {task.type === "discord" && "Join our community server"}
                                {task.type === "follow" && "Follow us for updates"}
                                {task.type === "share" && "Help spread the word"}
                                {task.type === "tag" && "Tag friends to increase your chances"}
                                {task.type === "subscribe" && "Get notified about new giveaways"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              +{task.points} pts
                            </Badge>
                            {!completedTasks.includes(task.id) && (
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  size="sm"
                                  onClick={() => handleTaskComplete(task.id)}
                                  disabled={loadingStates[task.id] || autoVerifying}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {loadingStates[task.id] ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-black mr-1"></div>
                                      Checking...
                                    </>
                                  ) : task.type === "discord" && task.description ? (
                                    openedDiscordTasks.includes(task.id) ? (
                                      "Reopen Discord"
                                    ) : (
                                      <>
                                        <ExternalLink className="mr-1 h-3 w-3" />
                                        Join Discord
                                      </>
                                    )
                                  ) : task.link ? (
                                    <>
                                      <ExternalLink className="mr-1 h-3 w-3" />
                                      Complete
                                    </>
                                  ) : (
                                    "Mark Done"
                                  )}
                                </Button>
                              </motion.div>
                            )}
                            
                            {/* Show "Verify Join" button for Discord tasks after they've been opened */}
                            {task.type === "discord" && task.description && !completedTasks.includes(task.id) && openedDiscordTasks.includes(task.id) && (
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  size="sm"
                                  disabled={loadingStates[task.id] || autoVerifying}
                                  onClick={async () => {
                                    setLoadingStates(prev => ({ ...prev, [task.id]: true }));
                                    try {
                                      // Refresh Discord servers to get latest membership status
                                      setDiscordServersLoaded(false);
                                      const hasJoined = await checkUserJoinedServer(task.description);
                                      if (hasJoined) {
                                        setCompletedTasks([...completedTasks, task.id]);
                                        alert(`✅ Verified! You're a member of this Discord server. Task completed!`);
                                      } else {
                                        alert("❌ You haven't joined the Discord server yet. Please join first and try again.");
                                      }
                                    } catch (error) {
                                      console.error('Error verifying Discord membership:', error);
                                      alert("Error verifying Discord membership. Please try again.");
                                    } finally {
                                      setLoadingStates(prev => ({ ...prev, [task.id]: false }));
                                    }
                                  }}
                                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {loadingStates[task.id] ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                      Verifying...
                                    </>
                                  ) : (
                                    "Verify Join"
                                  )}
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prizes" className="mt-6">
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-400" />
                      Prize Pool
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {transformedGiveaway.prizes.map((prize: any, index: number) => (
                      <motion.div
                        key={prize.position}
                        className="bg-gray-700/30 rounded-lg p-6 border border-gray-600/50"
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="text-3xl">
                              {prize.position === 1 ? "🥇" : prize.position === 2 ? "🥈" : "🥉"}
                            </div>
                            <div>
                              <h3 className="text-white font-bold text-lg">{prize.name}</h3>
                              <p className="text-gray-400">{prize.description}</p>
                            </div>
                          </div>
                          <motion.div
                            className="text-2xl font-bold text-yellow-400"
                            animate={{
                              textShadow: ["0 0 0px currentColor", "0 0 15px currentColor", "0 0 0px currentColor"],
                            }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.3 }}
                          >
                            {prize.value}
                          </motion.div>
                        </div>
                        {prize.winner ? (
                          <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span>Won by {prize.winner}</span>
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm">Winner will be announced soon</div>
                        )}
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rules" className="mt-6">
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Flag className="h-5 w-5 text-yellow-400" />
                      Giveaway Rules
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        "Must be 18+ or have parental consent",
                        "One entry per person",
                        "Complete all required tasks to qualify",
                        "Winners will be contacted via Discord",
                        "Prizes must be claimed within 48 hours"
                      ].map((rule, index) => (
                        <motion.div
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-700/30"
                          initial={{ opacity: 1, x: 0 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-yellow-400 text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="text-gray-300">{rule}</span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stats" className="mt-6">
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      Giveaway Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-gray-700/30 rounded-lg p-4">
                          <h4 className="text-white font-semibold mb-2">Participation</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total Entries:</span>
                              <span className="text-white font-semibold">
                                {transformedGiveaway.entries.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Unique Participants:</span>
                              <span className="text-white font-semibold">
                                {(transformedGiveaway.entries * 0.8).toFixed(0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Completion Rate:</span>
                              <span className="text-white font-semibold">76%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-gray-700/30 rounded-lg p-4">
                          <h4 className="text-white font-semibold mb-2">Engagement</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Shares:</span>
                              <span className="text-white font-semibold">
                                {(transformedGiveaway.entries * 0.4).toFixed(0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Time Remaining:</span>
                              <span className="text-orange-500 font-semibold">{transformedGiveaway.timeLeft}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </motion.section>


          {/* Related Giveaways */}
          <motion.section
            className="mb-16"
            initial={{ opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-400" />
              More Giveaways
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedGiveaways.map((giveaway, index) => (
                <motion.div
                  key={giveaway.id}
                  initial={{ opacity: 1, y: 0 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  viewport={{ once: true }}
                >
                  <Link href={`/giveaway/${giveaway.id}`}>
                    <Card className="bg-gray-800/30 border-gray-700/50 hover:border-yellow-500/50 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                      <CardHeader className="p-0">
                        <div className="relative overflow-hidden rounded-t-lg">
                          <img
                            src={giveaway.image || "/cat.jpg"}
                            alt={giveaway.title}
                            className="w-full h-48 object-cover transition-transform duration-300 hover:scale-110"
                          />
                          <div className="absolute top-3 right-3 bg-yellow-500 text-black px-2 py-1 rounded-full text-sm font-bold">
                            {giveaway.value}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <h3 className="text-white font-semibold mb-2 hover:text-yellow-400 transition-colors">
                          {giveaway.title}
                        </h3>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-orange-500">
                            <Clock className="h-4 w-4" />
                            <span>{giveaway.timeLeft}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400">
                            <Users className="h-4 w-4" />
                            <span>{giveaway.entries}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
      <Footer />
    </>
  )
}
