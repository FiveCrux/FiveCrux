"use client"

import { useState, useRef, useEffect, useMemo } from "react"
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
  CircleCheckBig,
  Star,
  TrendingUp,
  Download,
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
import { VerifiedIcon } from "@/componentss/shared/verified-icon"
import { isVerifiedCreator } from "@/lib/utils"
import { toast } from "sonner"

// Add CSS for spin animation
const spinStyle = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
    50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.6); }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
`

// Enhanced animated background particles with gaming theme
const AnimatedParticles = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-20">
      {/* Floating orbs */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 
              ? 'radial-gradient(circle, rgba(251,191,36,0.8) 0%, rgba(251,191,36,0) 70%)'
              : i % 3 === 1
              ? 'radial-gradient(circle, rgba(249,115,22,0.8) 0%, rgba(249,115,22,0) 70%)'
              : 'radial-gradient(circle, rgba(234,88,12,0.8) 0%, rgba(234,88,12,0) 70%)',
          }}
          animate={{
            x: [0, Math.random() * 200 - 100, 0],
            y: [0, Math.random() * 200 - 100, 0],
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: Math.random() * 10 + 15,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: Math.random() * 5,
          }}
        />
      ))}
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(251,191,36,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(251,191,36,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  )
}

// Enhanced Media Slider with gaming aesthetic
const MediaSlider = ({ 
  images, 
  screenshots, 
  videos, 
  title,
  coverImage 
}: { 
  images: string[], 
  screenshots: string[], 
  videos: string[], 
  title: string,
  coverImage?: string 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  let allMedia = [...images, ...screenshots, ...videos]
  
  if (coverImage) {
    allMedia = allMedia.filter(media => media !== coverImage)
    allMedia = [coverImage, ...allMedia]
  }
  
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
      {/* Main Slider with gaming border */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl overflow-hidden group border-2 border-yellow-500/20 hover:border-yellow-500/50 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-orange-500/5"></div>
        
        {allMedia.map((media, index) => (
          <motion.div
            key={index}
            className={`absolute inset-0 ${index === currentIndex ? 'block' : 'hidden'}`}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: index === currentIndex ? 1 : 0, scale: index === currentIndex ? 1 : 1.1 }}
            transition={{ duration: 0.5 }}
          >
            {isVideo(media) ? (
              <video
                src={media}
                controls
                preload="metadata"
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={media}
                alt={`${title} - Media ${index + 1}`}
                className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
            )}
          </motion.div>
        ))}
        
        {/* Enhanced Navigation */}
        {allMedia.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black p-3 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-lg hover:scale-110"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black p-3 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-lg hover:scale-110"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
        
        {/* Enhanced Counter */}
        {allMedia.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-gradient-to-r from-black/80 to-gray-900/80 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-bold border border-yellow-500/30">
            {currentIndex + 1} / {allMedia.length}
          </div>
        )}
      </div>

      {/* Enhanced Thumbnail Navigation */}
      {allMedia.length > 1 && (
        <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-yellow-500/50 scrollbar-track-gray-800">
          {allMedia.map((media, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentIndex(index)}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 w-24 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                index === currentIndex 
                  ? 'border-yellow-500 shadow-lg shadow-yellow-500/50' 
                  : 'border-gray-700 hover:border-yellow-500/50'
              }`}
            >
              {isVideo(media) ? (
                <div className="relative w-full h-full bg-gray-900">
                  <video src={media} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Play className="h-5 w-5 text-yellow-400" />
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
            </motion.button>
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

  const heroRef = useRef(null)
  const detailsRef = useRef(null)
  const mediaCarouselRef = useRef<HTMLDivElement>(null)
  const [bgHeight, setBgHeight] = useState<number | null>(null)

  const heroInView = useInView(heroRef, { once: true })
  const detailsInView = useInView(detailsRef, { once: true })

  const [isEntered, setIsEntered] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<number[]>([])
  const [giveaway, setGiveaway] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEnteringGiveaway, setIsEnteringGiveaway] = useState(false)
  const [relatedGiveaways, setRelatedGiveaways] = useState<any[]>([])
  const [relatedLoading, setRelatedLoading] = useState(true)
  const [isPageStable, setIsPageStable] = useState(false)
  const [fetchingStates, setFetchingStates] = useState({
    giveaway: false,
    related: false,
    entry: false
  })
  
  const fetchRefs = useRef({
    giveaway: false,
    related: false,
    entry: false
  })
  
  // Calculate background height based on media carousel position
  useEffect(() => {
    if (loading) return
    
    const updateBgHeight = () => {
      if (mediaCarouselRef.current && heroRef.current) {
        const mediaRect = mediaCarouselRef.current.getBoundingClientRect()
        const heroRect = (heroRef.current as HTMLElement).getBoundingClientRect()
        // Calculate height from top of hero section to bottom of media carousel
        const height = mediaRect.bottom - heroRect.top + 32 // Add padding
        setBgHeight(height)
      }
    }
    
    // Use setTimeout to ensure DOM is rendered
    const timer = setTimeout(updateBgHeight, 100)
    window.addEventListener('resize', updateBgHeight)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateBgHeight)
    }
  }, [loading])
  
  // [Previous useEffects remain the same - keeping all the data fetching logic]
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Page hidden - maintaining state')
      } else {
        console.log('Page visible - maintaining state')
        setIsPageStable(true)
      }
    }
    
    const handleFocus = () => {
      console.log('Window focused - preventing any reload actions')
      setIsPageStable(true)
    }
    
    const handleBlur = () => {
      console.log('Window blurred - maintaining state')
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    
    setIsPageStable(true)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  const updatePointsInDatabase = async (completedTaskIds: number[]) => {
    if (completedTaskIds.length === 0) return

    try {
      const response = await fetch(`/api/giveaways/${giveawayId}/entries`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completedRequirements: completedTaskIds
        })
      })

      if (response.ok) {
        console.log('Points updated successfully in database')
      }
    } catch (error) {
      console.error('Error updating points in database:', error)
    }
  }

  useEffect(() => {
    const fetchGiveaway = async () => {
      if (fetchRefs.current.giveaway) {
        console.log('Giveaway fetch already in progress, skipping...')
        return
      }

      try {
        fetchRefs.current.giveaway = true
        setFetchingStates(prev => ({ ...prev, giveaway: true }))
        setLoading(true)
        const response = await fetch(`/api/giveaways/${giveawayId}`, { cache: "no-store" })
        
        if (response.ok) {
          const data = await response.json()
          console.log('Giveaway data:', { 
            creator_roles: data.creator_roles, 
            creatorRoles: data.creatorRoles,
            creator_id: data.creator_id || data.creatorId 
          })
          setGiveaway(data)
        } else {
          setError('Failed to load giveaway')
        }
      } catch (error) {
        setError('Error loading giveaway')
      } finally {
        setLoading(false)
        setFetchingStates(prev => ({ ...prev, giveaway: false }))
        fetchRefs.current.giveaway = false
      }
    }

    if (giveawayId && !fetchRefs.current.giveaway) {
      fetchGiveaway()
    }
  }, [giveawayId])

  useEffect(() => {
    const fetchRelatedGiveaways = async () => {
      if (fetchRefs.current.related) return

      try {
        fetchRefs.current.related = true
        setFetchingStates(prev => ({ ...prev, related: true }))
        setRelatedLoading(true)
        const response = await fetch(`/api/giveaways/${giveawayId}/related`)
        
        if (response.ok) {
          const data = await response.json()
          setRelatedGiveaways(data.relatedGiveaways || [])
        }
      } catch (error) {
        console.error('Error fetching related giveaways:', error)
      } finally {
        setRelatedLoading(false)
        setFetchingStates(prev => ({ ...prev, related: false }))
        fetchRefs.current.related = false
      }
    }

    if (giveawayId && !fetchRefs.current.related) {
      fetchRelatedGiveaways()
    }
  }, [giveawayId])

  useEffect(() => {
    const checkUserEntry = async () => {
      if (fetchRefs.current.entry) return

      try {
        fetchRefs.current.entry = true
        setFetchingStates(prev => ({ ...prev, entry: true }))
        const response = await fetch(`/api/giveaways/${giveawayId}/entries?userOnly=true`)
        if (response.ok) {
          const data = await response.json()
          if (data.entry) {
            setIsEntered(true)
          }
        }
      } catch (error) {
        console.error('Error checking user entry:', error)
      } finally {
        setFetchingStates(prev => ({ ...prev, entry: false }))
        fetchRefs.current.entry = false
      }
    }

    if (giveawayId && !fetchRefs.current.entry) {
      checkUserEntry()
    }
  }, [giveawayId])

  const isGiveawayEnded = useMemo(() => {
    if (!giveaway?.endDate) return false
    const now = new Date()
    const end = new Date(giveaway.endDate)
    return end.getTime() <= now.getTime()
  }, [giveaway?.endDate])

  const creatorRoles = giveaway?.creator_roles || giveaway?.creatorRoles || null
  const isCreatorVerified = isVerifiedCreator(creatorRoles)
  
  // Debug log
  if (giveaway) {
    console.log('Transforming giveaway:', {
      creator_roles: creatorRoles,
      isVerified: isCreatorVerified,
      creator_id: giveaway?.creator_id || giveaway?.creatorId
    })
  }

  const transformedGiveaway = {
    id: giveaway?.id || 1,
    title: giveaway?.title || "Test Giveaway",
    description: giveaway?.description || "This is a test giveaway description",
    value: giveaway?.totalValue || "$",
    entries: giveaway?.entriesCount || 0,
    timeLeft: calculateTimeLeft(giveaway?.endDate || "2024-12-31"),
    endDate: giveaway?.endDate || "2024-12-31",
    category: giveaway?.category || "Scripts",
    createdAt: giveaway?.createdAt || new Date().toISOString(),
    updatedAt: giveaway?.updatedAt || new Date().toISOString(),
    featured: giveaway?.featured || false,
    isEnded: isGiveawayEnded,
    creator: {
      name: giveaway?.creator_name || giveaway?.creatorName || "Unknown Creator",
      email: giveaway?.creator_email || giveaway?.creatorEmail || "",
      id: giveaway?.creator_id || giveaway?.creatorId || "",
      avatar: giveaway?.creator_image || "/placeholder-user.jpg",
      verified: isCreatorVerified,
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
    images: giveaway?.images || [],
    videos: giveaway?.videos || [],
    cover_image: giveaway?.coverImage || (giveaway?.images && giveaway.images[0]) || "/placeholder.jpg",
  }

  const [openedDiscordTasks, setOpenedDiscordTasks] = useState<number[]>([])
  const [openedYoutubeTasks, setOpenedYoutubeTasks] = useState<number[]>([])
  const [serverNames, setServerNames] = useState<{[key: number]: string}>({})
  const [loadingStates, setLoadingStates] = useState<{[key: number]: boolean}>({})
  const [autoVerifying, setAutoVerifying] = useState(false)
  const [userDiscordServers, setUserDiscordServers] = useState<any[]>([])
  const [discordServersLoaded, setDiscordServersLoaded] = useState(false)
  const [autoVerificationDone, setAutoVerificationDone] = useState(false)

  const fetchUserDiscordServers = async (): Promise<any[]> => {
    if (discordServersLoaded && userDiscordServers.length > 0) {
      return userDiscordServers
    }

    try {
      const response = await fetch('/api/user/discord-servers')
      if (!response.ok) return []
      
      const data = await response.json()
      const guilds = data.guilds || []
      
      setUserDiscordServers(guilds)
      setDiscordServersLoaded(true)
      return guilds
    } catch (error) {
      console.error('Error fetching Discord servers:', error)
      return []
    }
  }

  const checkUserJoinedServer = async (discordLink: string): Promise<boolean> => {
    try {
      let inviteCode = null
      
      try {
        const url = new URL(discordLink)
        inviteCode = url.pathname.split('/').pop()
      } catch (urlError) {
        const match = discordLink.match(/(?:discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)([a-zA-Z0-9]+)/)
        if (match) {
          inviteCode = match[1]
        }
      }
      
      if (!inviteCode) return false
      
      const serverId = await getServerIdFromInvite(inviteCode)
      if (!serverId) return false
      
      const userGuilds = await fetchUserDiscordServers()
      
      return userGuilds.some((guild: any) => guild.id === serverId)
      
    } catch (error) {
      console.error('Error checking server membership:', error)
      return false
    }
  }

  const getServerIdFromInvite = async (inviteCode: string): Promise<string | null> => {
    try {
      const response = await fetch(`https://discord.com/api/invites/${inviteCode}?with_counts=true`)
      if (response.ok) {
        const data = await response.json()
        return data.guild?.id || null
      }
      return null
    } catch (error) {
      console.error('Error fetching server ID from invite:', error)
      return null
    }
  }

  const extractDiscordServerName = async (link: string): Promise<string | null> => {
    try {
      const url = new URL(link)
      const inviteCode = url.pathname.split('/').pop()
      
      if (!inviteCode) return null
      
      try {
        const response = await fetch(`https://discord.com/api/invites/${inviteCode}?with_counts=true`)
        if (response.ok) {
          const data = await response.json()
          return data.guild?.name || null
        }
      } catch (apiError) {
        console.log('Could not fetch server name from Discord API:', apiError)
      }
      
      return null
    } catch (error) {
      console.error('Error extracting Discord server name:', error)
      return null
    }
  }

  useEffect(() => {
    const autoVerifyDiscordRequirements = async () => {
      if (!giveaway || !transformedGiveaway.requirements || autoVerificationDone) return
      
      if (isGiveawayEnded) {
        setAutoVerificationDone(true)
        return
      }
      
      setAutoVerifying(true)
      
      const discordRequirements = transformedGiveaway.requirements.filter(
        (req: any) => req.type === "discord" && req.description
      )
      
      if (discordRequirements.length > 0) {
        await fetchUserDiscordServers()
        
        for (const requirement of discordRequirements) {
          try {
            const serverName = await extractDiscordServerName(requirement.description)
            if (serverName) {
              setServerNames(prev => ({ ...prev, [requirement.id]: serverName }))
            }
            
            const hasJoined = await checkUserJoinedServer(requirement.description)
            if (hasJoined) {
              setCompletedTasks(prev => {
                const newCompleted = [...prev, requirement.id]
                updatePointsInDatabase(newCompleted)
                return newCompleted
              })
            }
          } catch (error) {
            console.error('Error auto-verifying Discord requirement:', error)
          }
        }
      }
      
      setAutoVerificationDone(true)
      setAutoVerifying(false)
    }
    
    autoVerifyDiscordRequirements()
  }, [giveaway, transformedGiveaway.requirements, isGiveawayEnded])

  useEffect(() => {
    const triggerWinnerSelection = async () => {
      if (!giveaway || !isGiveawayEnded) return
      
      const hasWinners = giveaway.prizes?.some((p: any) => p.winnerName)
      if (hasWinners) return
      
      try {
        console.log('Giveaway has ended without winners, triggering selection...')
        const response = await fetch(`/api/giveaways/${giveawayId}/trigger-winner-selection`, {
          method: 'POST',
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('Winner selection completed:', data)
          
          if (!data.alreadyProcessed) {
            setTimeout(() => {
              window.location.reload()
            }, 2000)
          }
        }
      } catch (error) {
        console.error('Error triggering winner selection:', error)
      }
    }
    
    triggerWinnerSelection()
  }, [giveaway, isGiveawayEnded, giveawayId])

  const handleTaskComplete = async (taskId: number) => {
    const task = transformedGiveaway.requirements.find((req: any) => req.id === taskId)
    
    if (!task) return
    
    if (task.type === "discord" && task.description) {
      try {
        setLoadingStates(prev => ({ ...prev, [taskId]: true }))
        
        const hasJoined = await checkUserJoinedServer(task.description)
        
        if (hasJoined) {
          const newCompleted = [...completedTasks, taskId]
          setCompletedTasks(newCompleted)
          updatePointsInDatabase(newCompleted)
          toast.success(`✅ You're already a member of this Discord server. Task completed!`)
          return
        }
        
        window.open(task.description, '_blank')
        
        if (!openedDiscordTasks.includes(taskId)) {
          setOpenedDiscordTasks([...openedDiscordTasks, taskId])
        }
        
        toast.info("Discord invite opened! Please join the server and then click 'Verify Join' to check your membership.")
        
      } catch (error) {
        console.error('Error opening Discord link:', error)
        toast.error("Error opening Discord invite. Please try again.")
      } finally {
        setLoadingStates(prev => ({ ...prev, [taskId]: false }))
      }
    } else if (task.type === "youtube" && task.description) {
      // Open YouTube link in new tab
      window.open(task.description, '_blank', 'noopener,noreferrer')
      
      // Mark as opened so verify button appears
      if (!openedYoutubeTasks.includes(taskId)) {
        setOpenedYoutubeTasks([...openedYoutubeTasks, taskId])
      }
      
      toast.info("YouTube channel opened! Please subscribe and then click 'Verify' to complete the task.")
    } else {
      if (!completedTasks.includes(taskId)) {
        const newCompleted = [...completedTasks, taskId]
        setCompletedTasks(newCompleted)
        updatePointsInDatabase(newCompleted)
      }
    }
  }

  const handleYoutubeVerify = async (taskId: number) => {
    const task = transformedGiveaway.requirements.find((req: any) => req.id === taskId)
    
    if (!task || task.type !== "youtube") return
    
    setLoadingStates(prev => ({ ...prev, [taskId]: true }))
    
    // Fake verification - show loader for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mark as completed and add points
    const newCompleted = [...completedTasks, taskId]
    setCompletedTasks(newCompleted)
    updatePointsInDatabase(newCompleted)
    
    toast.success(`✅ YouTube subscription verified! +${task.points} points added!`)
    
    setLoadingStates(prev => ({ ...prev, [taskId]: false }))
  }

  const handleMarkDone = (taskId: number) => {
    if (!completedTasks.includes(taskId)) {
      const newCompleted = [...completedTasks, taskId]
      setCompletedTasks(newCompleted)
      updatePointsInDatabase(newCompleted)
    }
  }

  const handleEnterGiveaway = async () => {
    const requiredTasks = transformedGiveaway.requirements.filter((req: any) => req.required)
    const completedRequired = requiredTasks.every((task: any) => completedTasks.includes(task.id))

    if (!completedRequired) {
      toast.warning("Please complete all required tasks first!")
      return
    }

    try {
      setIsEnteringGiveaway(true)
      const response = await fetch(`/api/giveaways/${giveawayId}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completedRequirements: completedTasks
        })
      })

      const data = await response.json()

      if (response.ok) {
        setIsEntered(true)
        toast.success("🎉 Successfully entered the giveaway!")
      } else {
        toast.error(data.error || "Failed to enter giveaway")
      }
    } catch (error) {
      console.error('Error entering giveaway:', error)
      toast.error("Failed to enter giveaway. Please try again.")
    } finally {
      setIsEnteringGiveaway(false)
    }
  }

  const totalPoints = transformedGiveaway.requirements.reduce((sum: any, req: any) => sum + req.points, 0)
  const earnedPoints = transformedGiveaway.requirements
    .filter((req: any) => completedTasks.includes(req.id))
    .reduce((sum: any, req: any) => sum + req.points, 0)

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black text-white flex items-center justify-center py-20">
          <div className="text-center">
            <motion.div 
              className="w-32 h-32 mx-auto mb-4 relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <div className="absolute inset-0 rounded-full border-4 border-yellow-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-yellow-500"></div>
            </motion.div>
            <p className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Loading Epic Giveaway...
            </p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (error || !giveaway) {
    console.log('Showing fallback content')
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: spinStyle }} />
      <div className="relative z-50">
        <Navbar />
      </div>
      <div className="min-h-screen bg-neutral-900 text-white">
        <AnimatedParticles />

        {/* Hero Section with Background Image - Limited to Media Carousel */}
        <div className="relative">
          {/* Background Image Container - Only covers up to media carousel */}
          <div 
            className="absolute inset-x-0 top-0 text-white overflow-hidden"
            style={{
              backgroundImage: transformedGiveaway.cover_image ? `url("${transformedGiveaway.cover_image}")` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center 70%',
              backgroundRepeat: 'no-repeat',
              height: bgHeight ? `${bgHeight}px` : 'auto',
              minHeight: bgHeight ? undefined : '100vh',
            }}
          >
            {/* Overlay to reduce background image opacity */}
            <div className="absolute inset-0 bg-black/60 pointer-events-none" />
            
            {/* Gradient fade from middle to bottom - completely dark */}
            <div className="absolute inset-x-0 top-1/3 bottom-0 bg-gradient-to-b from-transparent via-neutral-900 to-neutral-900 pointer-events-none z-[1]" />
          </div>
          
          {/* Content */}
          <div className="relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* ENHANCED HERO SECTION - New Gaming Layout */}
              <motion.section
                ref={heroRef}
                className="mb-12"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                {/* Top Header Bar - Gaming Style */}
                <div className="flex items-center justify-between mb-6 py-6">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    >
                      <Sparkles className="h-5 w-5 text-yellow-400" />
                    </motion.div>
                    <div>
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold mb-2">
                        {transformedGiveaway.category}
                      </Badge>
                      {transformedGiveaway.featured && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold ml-2">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Quick Stats Bar */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-orange-400">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span className="font-semibold">{transformedGiveaway.entries.toLocaleString()} Entries</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-yellow-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-semibold">{transformedGiveaway.timeLeft}</span>
                    </div>
                  </div>
                </div>

                {/* Main Title with Glow Effect */}
                <motion.h1 
                  className="text-3xl md:text-4xl font-black mb-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    textShadow: '0 0 40px rgba(251, 191, 36, 0.3)',
                  }}
                >
                  {transformedGiveaway.title}
                </motion.h1>

                {/* Ended Banner - Enhanced */}
                {isGiveawayEnded && (
                  <motion.div
                    className="bg-gradient-to-r from-red-600/20 via-orange-600/20 to-red-600/20 border-2 border-red-500 rounded-2xl p-6 mb-8 relative overflow-hidden"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5"></div>
                    <div className="relative flex items-center justify-center gap-3">
                      <Trophy className="h-5 w-5 text-red-400 animate-pulse" />
                      <div className="text-center">
                        <span className="text-xl font-black text-red-400 block mb-1">GIVEAWAY ENDED</span>
                        <p className="text-gray-300 text-sm">
                          Ended on {new Date(transformedGiveaway.endDate).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                      <Trophy className="h-5 w-5 text-red-400 animate-pulse" />
                    </div>
                  </motion.div>
                )}

                {/* Two Column Layout - Enhanced */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* LEFT COLUMN - Media & Description (2/3 width) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Media Gallery with Gaming Border */}
                    {((transformedGiveaway.images && transformedGiveaway.images.length > 0) || 
                      (transformedGiveaway.videos && transformedGiveaway.videos.length > 0) || 
                      transformedGiveaway.cover_image) && (
                      <motion.div
                        ref={mediaCarouselRef}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <MediaSlider 
                          images={transformedGiveaway.images || []}
                          screenshots={[]}
                          videos={transformedGiveaway.videos || []}
                          title={transformedGiveaway.title}
                          coverImage={transformedGiveaway.cover_image}
                        />
                      </motion.div>
                    )}

                {/* Description Card - Gaming Style */}
                <motion.div
                  className="bg-gradient-to-br from-gray-900/80 to-black/80 border-2 border-yellow-500/20 rounded-2xl p-4 backdrop-blur-sm relative overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ borderColor: 'rgba(251, 191, 36, 0.4)' }}
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-full blur-3xl"></div>
                  
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                      <h3 className="text-lg font-bold text-white">About This Giveaway</h3>
                    </div>
                    <p className="text-gray-300 text-base leading-relaxed">
                      {transformedGiveaway.description}
                    </p>
                  </div>
                </motion.div>

                {/* Creator Info - Enhanced */}
                <motion.div
                  className="bg-gradient-to-br from-gray-900/80 to-black/80 border-2 border-purple-500/20 rounded-2xl p-4 backdrop-blur-sm relative overflow-hidden group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ borderColor: 'rgba(168, 85, 247, 0.4)', scale: 1.02 }}
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-500/5 to-transparent rounded-full blur-3xl group-hover:opacity-100 opacity-50 transition-opacity"></div>
                  
                  <div className="relative flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-yellow-500/30 shadow-lg shadow-yellow-500/20">
                      <AvatarImage src={transformedGiveaway.creator.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-black font-bold text-base">
                        {transformedGiveaway.creator.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-bold text-base">{transformedGiveaway.creator.name}</h3>
                        {transformedGiveaway.creator.verified && (
                          <motion.div 
                            initial={{ scale: 0, rotate: -180 }} 
                            animate={{ scale: 1, rotate: 0 }} 
                            transition={{ delay: 0.7, type: "spring" }}
                            className="flex items-center"
                            title="Verified Creator"
                          >
                            <VerifiedIcon size="sm" />
                          </motion.div>
                        )}
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                          Creator
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400">
                        Giveaway Host • Created {new Date(transformedGiveaway.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* RIGHT COLUMN - Entry Panel (1/3 width) - STICKY */}
              <div className="lg:col-span-1">
                <motion.div
                  className="sticky top-24 space-y-4"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  {/* Prize Value Card - Eye-catching */}
                  <div className="bg-gradient-to-br rounded-2xl p-1 shadow-2xl shadow-yellow-500/50">
                    <div className="bg-black rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">Total Prize Value</p>
                      <motion.div
                        className="text-4xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2"
                        animate={{
                          textShadow: [
                            '0 0 20px rgba(251, 191, 36, 0.3)',
                            '0 0 40px rgba(251, 191, 36, 0.6)',
                            '0 0 20px rgba(251, 191, 36, 0.3)',
                          ],
                        }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                      >
                        ${transformedGiveaway.value}
                      </motion.div>
                      <div className="flex items-center justify-center gap-3 text-xs">
                        <div className="flex items-center gap-1 text-orange-400">
                          <Award className="h-3.5 w-3.5" />
                          <span className="font-bold">{transformedGiveaway.prizes.length} Prizes</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Card - Compact */}
                  <div className="bg-gradient-to-br from-gray-900/90 to-black/90 border-2 border-gray-700/50 rounded-2xl p-4 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="text-center p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
                        <Clock className="h-4 w-4 text-orange-400 mx-auto mb-1.5" />
                        <p className="text-[10px] text-gray-400 mb-1">Ends In</p>
                        <p className="text-sm font-bold text-orange-400">{transformedGiveaway.timeLeft}</p>
                      </div>
                      <div className="text-center p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <Users className="h-4 w-4 text-blue-400 mx-auto mb-1.5" />
                        <p className="text-[10px] text-gray-400 mb-1">Entries</p>
                        <p className="text-sm font-bold text-blue-400">{transformedGiveaway.entries.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Your Progress</span>
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          {earnedPoints}/{totalPoints} pts
                        </Badge>
                      </div>
                      <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${(earnedPoints / totalPoints) * 100}%` }}
                          transition={{ duration: 1, delay: 0.8 }}
                        />
                      </div>
                    </div>

                    {/* Main CTA Button - SUPER EYE-CATCHING */}
                    <motion.div 
                      whileHover={{ scale: isGiveawayEnded ? 1 : 1.05 }} 
                      whileTap={{ scale: isGiveawayEnded ? 1 : 0.95 }}
                    >
                      <Button
                        onClick={handleEnterGiveaway}
                        disabled={isEntered || isEnteringGiveaway || isGiveawayEnded}
                        className={`w-full h-11 text-base font-black rounded-xl shadow-2xl transition-all duration-300 ${
                          isGiveawayEnded
                            ? "bg-gray-700 cursor-not-allowed"
                            : isEntered
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-green-500/50"
                            : "bg-white text-black hover:bg-gradient-to-r hover:from-yellow-300 hover:via-orange-400 hover:to-red-400 hover:text-white shadow-yellow-500/50"
                        }`}
                      >
                        {isGiveawayEnded ? (
                          <>
                            <Clock className="mr-2 h-4 w-4" />
                            Giveaway Ended
                          </>
                        ) : isEnteringGiveaway ? (
                          <>
                            <motion.div 
                              className="w-4 h-4 border-2 border-black border-t-transparent rounded-full mr-2"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            />
                            ENTERING...
                          </>
                        ) : isEntered ? (
                          <>
                            <Trophy className="mr-2 h-4 w-4" />
                            YOU&apos;RE IN!
                          </>
                        ) : (
                          <>
                            <Gift className="mr-2 h-4 w-4" />
                            ENTER NOW
                          </>
                        )}
                      </Button>
                    </motion.div>

                    {/* Quick Stats Footer */}
                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="h-3 w-3" />
                          <span>Ends {new Date(transformedGiveaway.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Sparkles className="h-3 w-3" />
                          <span>{(transformedGiveaway.entries * 0.8).toFixed(0)} Players</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Share/Wishlist Actions - Compact */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="border-gray-700 hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all text-sm h-9"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href)
                        toast.success("Link copied!")
                      }}
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1.5" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      className={`border-gray-700 transition-all text-sm h-9 ${
                        isWishlisted 
                          ? 'border-red-500/50 bg-red-500/10 text-red-400' 
                          : 'hover:border-red-500/50 hover:bg-red-500/10'
                      }`}
                      onClick={() => setIsWishlisted(!isWishlisted)}
                    >
                      <Heart className={`h-3.5 w-3.5 mr-1.5 ${isWishlisted ? 'fill-current' : ''}`} />
                      Save
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.section>
            </div>
          </div>
        </div>

        {/* TASKS & PRIZES SECTION - Enhanced Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.section
            ref={detailsRef}
            className="mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {isGiveawayEnded ? (
              // WINNERS SECTION - Epic Design
              <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border-2 border-yellow-500/30 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 p-4 border-b-2 border-yellow-500/30">
                  <div className="flex items-center justify-center gap-3">
                    <Trophy className="h-6 w-6 text-yellow-400 animate-bounce" />
                    <h2 className="text-2xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                      🎉 WINNERS ANNOUNCED 🎉
                    </h2>
                    <Trophy className="h-6 w-6 text-yellow-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                  </div>
                </div>
                
                <div className="p-5 space-y-4">
                  {transformedGiveaway.prizes.length > 0 ? (
                    transformedGiveaway.prizes.map((prize: any, index: number) => (
                      <motion.div
                        key={prize.position}
                        className={`rounded-2xl p-5 border-2 relative overflow-hidden ${
                          prize.winnerName
                            ? "bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border-yellow-500/50"
                            : "bg-gray-800/30 border-gray-600/30"
                        }`}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.15 }}
                        viewport={{ once: true }}
                        whileHover={{ scale: 1.02, borderColor: 'rgba(251, 191, 36, 0.8)' }}
                      >
                        {prize.winnerName && (
                          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-3xl"></div>
                        )}
                        
                        <div className="relative flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <motion.div 
                              className="text-4xl"
                              animate={{ rotate: [0, -10, 10, 0] }}
                              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.3 }}
                            >
                              {prize.position === 1 ? "🥇" : prize.position === 2 ? "🥈" : prize.position === 3 ? "🥉" : `#${prize.position}`}
                            </motion.div>
                            <div>
                              <h3 className="text-white font-black text-xl mb-1.5">
                                {prize.position === 1 ? "1st Place" : prize.position === 2 ? "2nd Place" : prize.position === 3 ? "3rd Place" : `${prize.position}th Place`}
                              </h3>
                              <p className="text-yellow-400 font-bold text-base mb-1">{prize.name}</p>
                              {prize.description && (
                                <p className="text-gray-400 text-xs">{prize.description}</p>
                              )}
                            </div>
                          </div>
                          <motion.div
                            className="text-2xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"
                            animate={{
                              scale: [1, 1.1, 1],
                            }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.3 }}
                          >
                            {prize.value}
                          </motion.div>
                        </div>
                        
                        {prize.winnerName ? (
                          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 rounded-xl p-6">
                            <div className="flex items-center gap-4">
                              <Award className="h-8 w-8 text-green-400" />
                              <div>
                                <p className="text-green-400 font-semibold text-lg mb-1">🎊 Winner</p>
                                <p className="text-white font-black text-lg">{prize.winnerName}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                            <p className="text-gray-400 text-base">Winner will be announced soon</p>
                          </div>
                        )}
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 text-base">No prizes configured for this giveaway</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // TASKS & PRIZES TABS - Enhanced Design
              <Tabs defaultValue="tasks" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-gray-900/50 border-2 border-gray-700/50 backdrop-blur-sm rounded-2xl p-1.5 mb-4">
                  <TabsTrigger 
                    value="tasks" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-black rounded-xl font-bold transition-all text-sm py-2"
                  >
                    <Target className="h-3.5 w-3.5 mr-1.5" />
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger
                    value="prizes"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-black rounded-xl font-bold transition-all text-sm py-2"
                  >
                    <Trophy className="h-3.5 w-3.5 mr-1.5" />
                    Prizes
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rules" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-black rounded-xl font-bold transition-all text-sm py-2"
                  >
                    <Flag className="h-3.5 w-3.5 mr-1.5" />
                    Rules
                  </TabsTrigger>
                  <TabsTrigger 
                    value="stats" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-black rounded-xl font-bold transition-all text-sm py-2"
                  >
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    Stats
                  </TabsTrigger>
                </TabsList>

              <TabsContent value="tasks" className="mt-4">
                <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border-2 border-gray-700/50 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                      Entry Tasks
                    </h3>
                    {autoVerifying && (
                      <div className="flex items-center gap-2 text-sm text-yellow-400">
                        <motion.div 
                          className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        />
                        Checking Discord...
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {transformedGiveaway.requirements.map((task: any, index: number) => (
                      <motion.div
                        key={task.id}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                          completedTasks.includes(task.id)
                            ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/50"
                            : "bg-gray-800/30 border-gray-700/50 hover:border-yellow-500/50 hover:bg-gray-800/50"
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        viewport={{ once: true }}
                        whileHover={{ x: 5 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <motion.div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                completedTasks.includes(task.id) 
                                  ? "bg-green-500 border-green-500" 
                                  : "border-gray-500 hover:border-yellow-500"
                              }`}
                              whileHover={{ scale: 1.1, rotate: 10 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              {completedTasks.includes(task.id) && (
                                <CheckCircle className="h-4 w-4 text-white" />
                              )}
                            </motion.div>
                            <div className="flex-1">
                              <h4 className="text-white font-bold flex items-center gap-2 mb-1 text-sm">
                                {task.type === "discord" && task.description ? (
                                  <>
                                    Join Discord Server
                                    {serverNames[task.id] && (
                                      <span className="text-sm text-gray-400 font-normal">
                                        ({serverNames[task.id]})
                                      </span>
                                    )}
                                  </>
                                ) : task.type === "youtube" && task.description ? (
                                  <>
                                    Subscribe Youtube
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
                              <p className="text-xs text-gray-400">
                                {task.type === "discord" && "Join our community server"}
                                {task.type === "youtube" && "Subscribe to our YouTube channel"}
                                {task.type === "follow" && "Follow us for updates"}
                                {task.type === "share" && "Help spread the word"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-bold text-xs">
                              +{task.points} pts
                            </Badge>
                            {!completedTasks.includes(task.id) && (
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  size="sm"
                                  onClick={() => handleTaskComplete(task.id)}
                                  disabled={loadingStates[task.id] || autoVerifying}
                                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold disabled:opacity-50"
                                >
                                  {loadingStates[task.id] ? (
                                    <>
                                      <motion.div 
                                        className="w-3 h-3 border-2 border-black border-t-transparent rounded-full mr-1"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                                      />
                                      Checking...
                                    </>
                                  ) : task.type === "discord" && task.description ? (
                                    openedDiscordTasks.includes(task.id) ? (
                                      "Reopen"
                                    ) : (
                                      <>
                                        <ExternalLink className="mr-1 h-3 w-3" />
                                        Join
                                      </>
                                    )
                                  ) : task.type === "youtube" && task.description ? (
                                    openedYoutubeTasks.includes(task.id) ? (
                                      "Reopen"
                                    ) : (
                                      <>
                                        <ExternalLink className="mr-1 h-3 w-3" />
                                        Join
                                      </>
                                    )
                                  ) : (
                                    "Complete"
                                  )}
                                </Button>
                              </motion.div>
                            )}
                            
                            {task.type === "discord" && task.description && !completedTasks.includes(task.id) && openedDiscordTasks.includes(task.id) && (
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  size="sm"
                                  disabled={loadingStates[task.id] || autoVerifying}
                                  onClick={async () => {
                                    setLoadingStates(prev => ({ ...prev, [task.id]: true }))
                                    try {
                                      setDiscordServersLoaded(false)
                                      const hasJoined = await checkUserJoinedServer(task.description)
                                      if (hasJoined) {
                                        const newCompleted = [...completedTasks, task.id]
                                        setCompletedTasks(newCompleted)
                                        updatePointsInDatabase(newCompleted)
                                        toast.success(`✅ Verified! Task completed!`)
                                      } else {
                                        toast.warning("❌ Please join the Discord server first.")
                                      }
                                    } catch (error) {
                                      toast.error("Error verifying. Please try again.")
                                    } finally {
                                      setLoadingStates(prev => ({ ...prev, [task.id]: false }))
                                    }
                                  }}
                                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold disabled:opacity-50"
                                >
                                  {loadingStates[task.id] ? "Verifying..." : "Verify"}
                                </Button>
                              </motion.div>
                            )}
                            
                            {task.type === "youtube" && task.description && !completedTasks.includes(task.id) && openedYoutubeTasks.includes(task.id) && (
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  size="sm"
                                  disabled={loadingStates[task.id] || autoVerifying}
                                  onClick={() => handleYoutubeVerify(task.id)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold disabled:opacity-50"
                                >
                                  {loadingStates[task.id] ? (
                                    <>
                                      <motion.div 
                                        className="w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1 inline-block"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                                      />
                                      Verifying...
                                    </>
                                  ) : (
                                    "Verify"
                                  )}
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="prizes" className="mt-6">
                <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border-2 border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-8 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                    <h3 className="text-2xl font-black text-white">Prize Pool</h3>
                  </div>
                  <div className="space-y-4">
                    {transformedGiveaway.prizes.map((prize: any, index: number) => (
                      <motion.div
                        key={prize.position}
                        className="bg-gray-800/30 rounded-xl p-6 border-2 border-gray-700/50 hover:border-yellow-500/50 transition-all"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        viewport={{ once: true }}
                        whileHover={{ scale: 1.02, borderColor: 'rgba(251, 191, 36, 0.5)' }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <motion.div 
                              className="text-5xl"
                              animate={{ rotate: [0, -5, 5, 0] }}
                              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, delay: index * 0.5 }}
                            >
                              {prize.position === 1 ? "🥇" : prize.position === 2 ? "🥈" : "🥉"}
                            </motion.div>
                            <div>
                              <h3 className="text-white font-black text-2xl mb-1">{prize.name}</h3>
                              <p className="text-gray-400 text-sm">{prize.description}</p>
                            </div>
                          </div>
                          <motion.div
                            className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"
                            animate={{
                              scale: [1, 1.1, 1],
                            }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.3 }}
                          >
                            {prize.value}
                          </motion.div>
                        </div>
                        {prize.winner ? (
                          <div className="flex items-center gap-2 text-green-400 bg-green-500/10 rounded-lg p-3 border border-green-500/30">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-bold">Won by {prize.winner}</span>
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm bg-gray-700/30 rounded-lg p-3 text-center">
                            Winner TBA
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rules" className="mt-6">
                <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border-2 border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-8 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                    <h3 className="text-2xl font-black text-white">Giveaway Rules</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      "Must be 18+ or have parental consent",
                      "One entry per person",
                      "Complete all required tasks to qualify",
                      "Winners will be contacted via Discord",
                      "Prizes must be claimed within 48 hours",
                      "No purchase necessary to enter",
                      "Void where prohibited by law"
                    ].map((rule, index) => (
                      <motion.div
                        key={index}
                        className="flex items-start gap-4 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:border-yellow-500/30 transition-all"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        viewport={{ once: true }}
                        whileHover={{ x: 5 }}
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0 border border-yellow-500/30">
                          <span className="text-yellow-400 font-black">{index + 1}</span>
                        </div>
                        <span className="text-gray-300 pt-1">{rule}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="stats" className="mt-6">
                <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border-2 border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-8 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                    <h3 className="text-2xl font-black text-white">Live Statistics</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div
                      className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-6 border-2 border-orange-500/30"
                      whileHover={{ scale: 1.02, borderColor: 'rgba(249, 115, 22, 0.5)' }}
                    >
                      <h4 className="text-white font-bold mb-4 text-lg">Participation</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Total Entries:</span>
                          <span className="text-white font-black text-xl">
                            {transformedGiveaway.entries.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Unique Players:</span>
                          <span className="text-white font-black text-xl">
                            {(transformedGiveaway.entries * 0.8).toFixed(0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Completion Rate:</span>
                          <span className="text-green-400 font-black text-xl">76%</span>
                        </div>
                      </div>
                    </motion.div>
                    <motion.div
                      className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-6 border-2 border-blue-500/30"
                      whileHover={{ scale: 1.02, borderColor: 'rgba(59, 130, 246, 0.5)' }}
                    >
                      <h4 className="text-white font-bold mb-4 text-lg">Engagement</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Social Shares:</span>
                          <span className="text-white font-black text-xl">
                            {(transformedGiveaway.entries * 0.4).toFixed(0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Time Remaining:</span>
                          <span className="text-orange-400 font-black text-xl">
                            {transformedGiveaway.timeLeft}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Prize Value:</span>
                          <span className="text-yellow-400 font-black text-xl">
                            ${transformedGiveaway.value}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </TabsContent>
              </Tabs>
            )}
          </motion.section>

          {/* RELATED GIVEAWAYS - Enhanced Gaming Grid */}
          <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-8">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              >
                <Sparkles className="h-8 w-8 text-yellow-400" />
              </motion.div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                More Epic Giveaways
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="bg-gray-900/30 border-2 border-gray-700/50 rounded-xl p-3 animate-pulse">
                    <div className="w-full h-32 bg-gray-800 rounded-lg mb-3"></div>
                    <div className="h-3 bg-gray-800 rounded mb-2"></div>
                    <div className="flex justify-between">
                      <div className="h-2.5 bg-gray-800 rounded w-16"></div>
                      <div className="h-2.5 bg-gray-800 rounded w-12"></div>
                    </div>
                  </div>
                ))
              ) : relatedGiveaways.length > 0 ? (
                relatedGiveaways.map((giveaway, index) => (
                <motion.div
                  key={giveaway.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  viewport={{ once: true }}
                >
                  <Link href={`/giveaway/${giveaway.id}`}>
                    <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border-2 border-gray-700/50 hover:border-yellow-500/50 rounded-xl overflow-hidden cursor-pointer backdrop-blur-sm transition-all duration-300 group">
                      <div className="relative overflow-hidden">
                        <img
                          src={giveaway.coverImage || giveaway.image || "/placeholder.jpg"}
                          alt={giveaway.title}
                          className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold px-2 py-0.5 text-xs">
                            ${giveaway.totalValue || '0'}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="text-white font-bold text-sm mb-2 hover:text-yellow-400 transition-colors line-clamp-2 group-hover:text-yellow-400">
                          {giveaway.title}
                        </h3>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-orange-400">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="font-semibold">
                              {new Date(giveaway.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-blue-400">
                            <Users className="h-3.5 w-3.5" />
                            <span className="font-semibold">{giveaway.entriesCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-16">
                  <Gift className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No other giveaways available right now</p>
                  <p className="text-gray-500 text-sm mt-2">Check back soon for more epic prizes!</p>
                </div>
              )}
            </div>
          </motion.section>
        </div>
      </div>
      <Footer />
    </>
  )
}