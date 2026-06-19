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
  ArrowLeft,
  MessageCircle,
  Twitter,
  ShieldCheck,
  Check,
} from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Progress } from "@/componentss/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentss/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/componentss/ui/avatar"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import { VerifiedIcon } from "@/componentss/shared/verified-icon"
import { isVerifiedCreator } from "@/lib/utils"
import { toast } from "sonner"
import { MARKETPLACE_SEED } from "@/lib/marketplace-seed"

// TODO: remove before production
// Builds a demo giveaway from a MARKETPLACE_SEED item so the page renders
// with realistic data when the giveaway API returns nothing/errors (DB may be absent in dev).
function buildSeedGiveaway(giveawayId: string) {
  const seedList = MARKETPLACE_SEED
  // Pick a seed item deterministically from the route id, falling back to the first item.
  const numericId = parseInt(String(giveawayId).replace(/\D/g, ""), 10)
  const index = Number.isFinite(numericId) && numericId > 0 ? (numericId - 1) % seedList.length : 0
  const item = seedList[index] || seedList[0]

  const prizeValue = item.price && item.price > 0 ? item.price : 49.99
  // Countdown end date a few days out so the timer is live.
  const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString()
  const startDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()

  return {
    id: item.id,
    title: `${item.title} Giveaway`,
    description: `Win the "${item.title}" mod for your FiveM server! Complete the simple requirements below for a chance to claim this premium prize from ${item.seller}. Winners are drawn automatically when the countdown ends.`,
    totalValue: prizeValue.toFixed(2),
    currencySymbol: "$",
    entriesCount: 1240 + (Number(item.id) * 37),
    endDate,
    startDate,
    start_date: startDate,
    category: "Giveaways",
    createdAt: startDate,
    updatedAt: startDate,
    featured: item.tag === "FEATURED",
    creatorName: item.seller,
    creator_name: item.seller,
    creatorEmail: "",
    creatorId: `seed-${item.id}`,
    creator_id: `seed-${item.id}`,
    creator_image: item.sellerImage,
    creator_roles: null,
    coverImage: item.coverImage,
    images: [item.coverImage],
    videos: [],
    prizes: [
      { position: 1, name: "Grand Prize", description: item.title, value: `$${prizeValue.toFixed(2)}`, winner: null },
      { position: 2, name: "Runner Up", description: "Store credit", value: "$15.00", winner: null },
      { position: 3, name: "Third Place", description: "Store credit", value: "$5.00", winner: null },
    ],
    requirements: [
      { id: 1, description: "https://discord.gg/fivecrux", type: "discord", points: 10, required: true, link: "https://discord.gg/fivecrux" },
      { id: 2, description: "Follow on X / Twitter", type: "follow", points: 5, required: false, link: "https://twitter.com/fivecrux" },
      { id: 3, description: "Share this giveaway", type: "share", points: 15, required: true, link: null },
    ],
    __isSeed: true,
  }
}

// TODO: remove before production
// Demo "more giveaways" cards built from MARKETPLACE_SEED (excludes the current one).
function buildSeedRelated(giveawayId: string) {
  const numericId = parseInt(String(giveawayId).replace(/\D/g, ""), 10)
  return MARKETPLACE_SEED
    .filter((item) => item.id !== numericId)
    .slice(0, 6)
    .map((item, i) => ({
      id: item.id,
      title: `${item.title} Giveaway`,
      coverImage: item.coverImage,
      image: item.coverImage,
      totalValue: (item.price && item.price > 0 ? item.price : 49.99).toFixed(2),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * (3 + i)).toISOString(),
      entriesCount: 480 + Number(item.id) * 23,
      creatorName: item.seller,
      creatorImage: item.sellerImage,
    }))
}

// Helper function to calculate time left (string form, used for short labels)
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

// Breakdown of remaining time into days / hours / minutes for the countdown boxes.
function getTimeParts(endDate: string): { days: number; hours: number; minutes: number; ended: boolean } {
  const now = new Date()
  const end = new Date(endDate)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, ended: true }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return { days, hours, minutes, ended: false }
}

const pad2 = (n: number) => String(Math.max(0, n)).padStart(2, "0")

export default function GiveawayDetailPage() {
  const params = useParams()
  const giveawayId = params.id as string

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
  const [isEnteringGiveaway, setIsEnteringGiveaway] = useState(false)
  const [relatedGiveaways, setRelatedGiveaways] = useState<any[]>([])
  const [relatedLoading, setRelatedLoading] = useState(true)
  const [isPageStable, setIsPageStable] = useState(false)
  const [now, setNow] = useState<number>(Date.now())
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

  // Live ticking clock so the countdown boxes update every minute.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000 * 30)
    return () => clearInterval(interval)
  }, [])

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

      // 8s timeout so we never infinite-spin if the DB/API is absent in dev.
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 3000)
      try {
        fetchRefs.current.giveaway = true
        setFetchingStates(prev => ({ ...prev, giveaway: true }))
        setLoading(true)
        const response = await fetch(`/api/giveaways/${giveawayId}`, { cache: "no-store", signal: c.signal })

        if (response.ok) {
          const data = await response.json()
          console.log('Giveaway data:', {
            creator_roles: data.creator_roles,
            creatorRoles: data.creatorRoles,
            creator_id: data.creator_id || data.creatorId
          })
          // Empty/invalid payload -> fall back to seed demo data.
          if (!data || (typeof data === 'object' && !data.id && !data.title)) {
            setGiveaway(buildSeedGiveaway(giveawayId)) // TODO: remove before production
          } else {
            setGiveaway(data)
          }
        } else {
          // API error -> render a demo giveaway from the marketplace seed.
          setGiveaway(buildSeedGiveaway(giveawayId)) // TODO: remove before production
        }
      } catch (error) {
        // Network error / abort / timeout -> render a demo giveaway from the marketplace seed.
        setGiveaway(buildSeedGiveaway(giveawayId)) // TODO: remove before production
      } finally {
        clearTimeout(t)
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

      // 8s timeout so the "More Giveaways" skeletons never spin forever.
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 3000)
      try {
        fetchRefs.current.related = true
        setFetchingStates(prev => ({ ...prev, related: true }))
        setRelatedLoading(true)
        const response = await fetch(`/api/giveaways/${giveawayId}/related`, { signal: c.signal })

        if (response.ok) {
          const data = await response.json()
          const list = data.relatedGiveaways || []
          if (list.length > 0) {
            setRelatedGiveaways(list)
          } else {
            setRelatedGiveaways(buildSeedRelated(giveawayId)) // TODO: remove before production
          }
        } else {
          setRelatedGiveaways(buildSeedRelated(giveawayId)) // TODO: remove before production
        }
      } catch (error) {
        if ((error as any)?.name !== "AbortError") console.error('Error fetching related giveaways:', error)
        // Seed fallback so the section is never empty in dev.
        setRelatedGiveaways(buildSeedRelated(giveawayId)) // TODO: remove before production
      } finally {
        clearTimeout(t)
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

  const isGiveawayUpcoming = useMemo(() => {
    if (!giveaway?.start_date && !giveaway?.startDate) return false
    const now = new Date()
    const startDate = new Date(giveaway.start_date || giveaway.startDate)
    return startDate.getTime() > now.getTime()
  }, [giveaway?.start_date, giveaway?.startDate])

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
    category: giveaway?.category || "Giveaways",
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
    youtube_video_link: giveaway?.youtube_video_link || (giveaway as any)?.youtubeVideoLink,
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

      const hasWinners = giveaway.prizes?.some((p: any) => (p.winners && p.winners.length > 0) || p.winnerName)
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
    // Prevent entry if giveaway hasn't started yet
    if (isGiveawayUpcoming) {
      toast.warning("This giveaway hasn't started yet!")
      return
    }

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

  // ---- Presentation helpers (Design A) ----
  const currencySymbol = giveaway?.currencySymbol || giveaway?.currency_symbol || "$"
  const prizeValueDisplay = `${currencySymbol}${transformedGiveaway.value}`
  // Recompute the countdown breakdown on each tick (`now` triggers re-render).
  const timeParts = useMemo(
    () => getTimeParts(transformedGiveaway.endDate),
    [transformedGiveaway.endDate, now]
  )
  const endsDateLabel = new Date(transformedGiveaway.endDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  // "Your entries" — 1 once the user has entered, otherwise 0.
  const yourEntries = isEntered ? 1 : 0
  const creatorInitial = (transformedGiveaway.creator.name || "?").charAt(0).toUpperCase()

  // Icon + human label for an entry task based on its type.
  const taskMeta = (task: any): { icon: any; label: string } => {
    if (task.type === "discord" && task.description) {
      return {
        icon: MessageCircle,
        label: serverNames[task.id] ? `Join ${serverNames[task.id]} on Discord` : "Join our Discord server",
      }
    }
    if (task.type === "youtube" && task.description) {
      return { icon: Play, label: "Subscribe on YouTube" }
    }
    if (task.type === "follow") {
      return { icon: Twitter, label: "Follow on X / Twitter" }
    }
    if (task.type === "share") {
      return { icon: Share2, label: "Share the giveaway" }
    }
    return { icon: CheckCircle, label: task.description || "Complete task" }
  }

  // Only show related giveaways that have not ended yet (preserves prior filter).
  const visibleRelated = relatedGiveaways.filter((g) => {
    if (!g.endDate) return false
    const end = new Date(g.endDate)
    return end.getTime() > Date.now()
  })

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center py-20">
          <div className="text-center">
            <motion.div
              className="w-16 h-16 mx-auto mb-4 relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <div className="absolute inset-0 rounded-full border-2 border-white/10"></div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-500"></div>
            </motion.div>
            <p className="text-sm font-medium text-white/50">Loading giveaway...</p>
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
      <div className="relative z-50">
        <Navbar />
      </div>

      <main className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Breadcrumb + back link (above the hero) */}
        <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-white/55">
            <Link href="/" className="transition-colors hover:text-white">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-white/30" />
            <Link href="/giveaways" className="transition-colors hover:text-white">
              Giveaways
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-white/30" />
            <span className="truncate text-white/85">{transformedGiveaway.title}</span>
          </nav>
          <Link
            href="/giveaways"
            className="mt-3 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to giveaways
          </Link>
        </div>

        {/* CINEMATIC HERO */}
        <motion.section
          ref={heroRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative mt-4 min-h-[60vh] w-full"
        >
          <Image
            src={transformedGiveaway.cover_image || "/placeholder.jpg"}
            alt={transformedGiveaway.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Legibility gradients (bottom + left) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/55 to-[#0a0a0a]/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/85 via-[#0a0a0a]/20 to-transparent" />

          <div className="relative mx-auto flex min-h-[60vh] max-w-[1240px] flex-col justify-end px-4 pb-10 pt-28 sm:px-6 lg:px-8">
            {/* Status tags */}
            <div className="flex flex-wrap items-center gap-2">
              {transformedGiveaway.featured && (
                <span className="rounded-md bg-orange-500 px-2.5 py-1 text-[11px] font-bold tracking-wide text-black">
                  FEATURED GIVEAWAY
                </span>
              )}
              {isGiveawayEnded && (
                <span className="rounded-md bg-black/50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-red-400 ring-1 ring-white/15 backdrop-blur">
                  ENDED
                </span>
              )}
              {isGiveawayUpcoming && !isGiveawayEnded && (
                <span className="rounded-md bg-black/50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-blue-300 ring-1 ring-white/15 backdrop-blur">
                  UPCOMING
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight drop-shadow-lg sm:text-6xl">
              {transformedGiveaway.title}
            </h1>

            {/* Meta row: prize value · entries · ends in */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Gift className="h-4 w-4 text-orange-500" />
                <span className="tabular-nums font-semibold">{prizeValueDisplay}</span>
                <span className="text-white/55">value</span>
              </span>
              <span className="text-white/25">|</span>
              <span className="inline-flex items-center gap-1.5 text-white/70">
                <Users className="h-4 w-4" />
                <span className="tabular-nums font-semibold text-white">
                  {transformedGiveaway.entries.toLocaleString()}
                </span>
                entries
              </span>
              <span className="text-white/25">|</span>
              <span className="inline-flex items-center gap-1.5 text-white/70">
                <Clock className="h-4 w-4" />
                {isGiveawayEnded
                  ? "Ended"
                  : isGiveawayUpcoming
                  ? "Starting soon"
                  : `Ends in ${transformedGiveaway.timeLeft}`}
              </span>
            </div>

            {/* Host row */}
            <div className="mt-3 flex items-center gap-2 text-sm text-white/70">
              <span className="relative grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-white/10 text-[11px] font-bold ring-1 ring-white/15">
                {transformedGiveaway.creator.avatar &&
                transformedGiveaway.creator.avatar !== "/placeholder-user.jpg" ? (
                  <Image
                    src={transformedGiveaway.creator.avatar}
                    alt={transformedGiveaway.creator.name}
                    fill
                    className="object-cover"
                    sizes="24px"
                  />
                ) : (
                  creatorInitial
                )}
              </span>
              Hosted by <span className="font-semibold text-white">{transformedGiveaway.creator.name}</span>
              {transformedGiveaway.creator.verified && (
                <span className="inline-flex items-center" title="Verified Creator">
                  <VerifiedIcon size="sm" />
                </span>
              )}
            </div>

            {/* Primary CTA + compact countdown overlaid */}
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <motion.div
                whileHover={{ scale: isGiveawayEnded || isGiveawayUpcoming ? 1 : 1.02 }}
                whileTap={{ scale: isGiveawayEnded || isGiveawayUpcoming ? 1 : 0.98 }}
              >
                <button
                  onClick={handleEnterGiveaway}
                  disabled={isEntered || isEnteringGiveaway || isGiveawayEnded || isGiveawayUpcoming}
                  className={`flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-bold shadow-lg transition-colors ${
                    isGiveawayEnded || isGiveawayUpcoming
                      ? "cursor-not-allowed bg-white/10 text-white/40"
                      : isEntered
                      ? "bg-green-500/15 text-green-400"
                      : "bg-orange-500 text-black shadow-orange-500/20 hover:bg-orange-400"
                  }`}
                >
                  {isGiveawayUpcoming ? (
                    <>
                      <Clock className="h-4 w-4" />
                      Starting Soon
                    </>
                  ) : isGiveawayEnded ? (
                    <>
                      <Clock className="h-4 w-4" />
                      Giveaway Ended
                    </>
                  ) : isEnteringGiveaway ? (
                    <>
                      <motion.span
                        className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      />
                      Entering...
                    </>
                  ) : isEntered ? (
                    <>
                      <Trophy className="h-4 w-4" />
                      You&apos;re In!
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4" />
                      Enter Giveaway
                    </>
                  )}
                </button>
              </motion.div>

              {/* Compact countdown */}
              {!isGiveawayEnded && (
                <div className="flex items-center gap-2">
                  {[
                    { v: timeParts.days, l: "DAYS" },
                    { v: timeParts.hours, l: "HRS" },
                    { v: timeParts.minutes, l: "MIN" },
                  ].map((b) => (
                    <div
                      key={b.l}
                      className="rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-center backdrop-blur"
                    >
                      <div className="tabular-nums text-xl font-extrabold leading-none">{pad2(b.v)}</div>
                      <div className="mt-1 text-[10px] tracking-[0.16em] text-white/45">{b.l}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/45">
              <ShieldCheck className="h-3.5 w-3.5" /> Winner drawn automatically &amp; fairly
            </p>
          </div>
        </motion.section>

        {/* STATS STRIP */}
        <div className="border-y border-white/[0.06] bg-[#0d0d0d]">
          <div className="mx-auto grid max-w-[1240px] grid-cols-2 divide-x divide-white/[0.06] px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
            <div className="py-5 pr-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">Prize value</div>
              <div className="mt-1 tabular-nums text-lg font-bold">{prizeValueDisplay}</div>
            </div>
            <div className="py-5 pl-4 pr-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">Entries</div>
              <div className="mt-1 tabular-nums text-lg font-bold">
                {transformedGiveaway.entries.toLocaleString()}
              </div>
            </div>
            <div className="py-5 pl-4 pr-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">Your entries</div>
              <div className="mt-1 tabular-nums text-lg font-bold text-orange-500">{yourEntries}</div>
            </div>
            <div className="py-5 pl-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">Ends</div>
              <div className="mt-1 text-lg font-bold">{endsDateLabel}</div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1240px] px-4 pb-24 pt-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* MAIN column */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* About */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                <h2 className="mb-2 text-lg font-bold">About this giveaway</h2>
                <p className="leading-relaxed text-white/60">{transformedGiveaway.description}</p>
              </div>

              {/* Entry tasks */}
              <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold">Entry tasks</h2>
                  {autoVerifying && (
                    <span className="flex items-center gap-2 text-xs text-orange-400">
                      <motion.span
                        className="h-3.5 w-3.5 rounded-full border-2 border-orange-400 border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      />
                      Checking Discord...
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {transformedGiveaway.requirements.map((task: any) => {
                    const { icon: TaskIcon, label } = taskMeta(task)
                    const isDone = completedTasks.includes(task.id)
                    const isBusy = loadingStates[task.id]
                    const isDiscord = task.type === "discord" && task.description
                    const isYoutube = task.type === "youtube" && task.description
                    const showDiscordVerify =
                      isDiscord && !isDone && openedDiscordTasks.includes(task.id)
                    const showYoutubeVerify =
                      isYoutube && !isDone && openedYoutubeTasks.includes(task.id)

                    return (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition-colors ${
                          isDone
                            ? "border-green-500/20 bg-green-500/[0.06]"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${
                              isDone ? "bg-green-500/15" : "bg-white/[0.06]"
                            }`}
                          >
                            {isDone ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <TaskIcon className="h-4 w-4 text-white/70" />
                            )}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="flex items-center gap-2 truncate text-sm">
                              {label}
                              {task.required && !isDone && (
                                <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400">
                                  Required
                                </span>
                              )}
                            </span>
                          </span>
                        </span>

                        {/* Right-side action */}
                        {isDone ? (
                          <span className="flex flex-shrink-0 items-center gap-1.5 text-xs font-semibold text-green-400">
                            <Check className="h-3.5 w-3.5" />
                            Completed
                          </span>
                        ) : showDiscordVerify ? (
                          <button
                            disabled={isBusy || autoVerifying}
                            onClick={async () => {
                              setLoadingStates((prev) => ({ ...prev, [task.id]: true }))
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
                                setLoadingStates((prev) => ({ ...prev, [task.id]: false }))
                              }
                            }}
                            className="flex-shrink-0 rounded-lg bg-orange-500 px-3.5 py-1.5 text-xs font-bold text-black transition-colors hover:bg-orange-400 disabled:opacity-50"
                          >
                            {isBusy ? "Verifying..." : "Verify"}
                          </button>
                        ) : showYoutubeVerify ? (
                          <button
                            disabled={isBusy || autoVerifying}
                            onClick={() => handleYoutubeVerify(task.id)}
                            className="flex-shrink-0 rounded-lg bg-orange-500 px-3.5 py-1.5 text-xs font-bold text-black transition-colors hover:bg-orange-400 disabled:opacity-50"
                          >
                            {isBusy ? "Verifying..." : "Verify"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTaskComplete(task.id)}
                            disabled={isBusy || autoVerifying}
                            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-1.5 text-xs font-bold text-black transition-colors hover:bg-orange-400 disabled:opacity-50"
                          >
                            {isBusy ? (
                              <>
                                <motion.span
                                  className="h-3 w-3 rounded-full border-2 border-black border-t-transparent"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                                />
                                Checking...
                              </>
                            ) : isDiscord || isYoutube ? (
                              <>
                                <ExternalLink className="h-3 w-3" />
                                {(isDiscord && openedDiscordTasks.includes(task.id)) ||
                                (isYoutube && openedYoutubeTasks.includes(task.id))
                                  ? "Reopen"
                                  : "Complete"}
                              </>
                            ) : (
                              "+1 entry"
                            )}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>

            {/* RIGHT slim aside: your-entry recap + host */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <motion.div
                ref={detailsRef}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6"
              >
                <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">Your entry</div>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Status</span>
                    <span className={`font-semibold ${isEntered ? "text-green-400" : "text-white/70"}`}>
                      {isEntered ? "Entered" : "Not entered"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Your entries</span>
                    <span className="tabular-nums font-semibold text-orange-500">{yourEntries}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Total entries</span>
                    <span className="tabular-nums font-semibold">
                      {transformedGiveaway.entries.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Ends</span>
                    <span className="font-semibold">{endsDateLabel}</span>
                  </div>
                </div>

                {/* Enter button (mirrors hero CTA, useful when scrolled past the hero) */}
                <motion.div
                  whileHover={{ scale: isGiveawayEnded || isGiveawayUpcoming ? 1 : 1.02 }}
                  whileTap={{ scale: isGiveawayEnded || isGiveawayUpcoming ? 1 : 0.98 }}
                >
                  <button
                    onClick={handleEnterGiveaway}
                    disabled={isEntered || isEnteringGiveaway || isGiveawayEnded || isGiveawayUpcoming}
                    className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-colors ${
                      isGiveawayEnded || isGiveawayUpcoming
                        ? "cursor-not-allowed bg-white/10 text-white/40"
                        : isEntered
                        ? "bg-green-500/15 text-green-400"
                        : "bg-orange-500 text-black hover:bg-orange-400"
                    }`}
                  >
                    {isGiveawayUpcoming ? (
                      <>
                        <Clock className="h-4 w-4" />
                        Starting Soon
                      </>
                    ) : isGiveawayEnded ? (
                      <>
                        <Clock className="h-4 w-4" />
                        Giveaway Ended
                      </>
                    ) : isEnteringGiveaway ? (
                      <>
                        <motion.span
                          className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        />
                        Entering...
                      </>
                    ) : isEntered ? (
                      <>
                        <Trophy className="h-4 w-4" />
                        You&apos;re In!
                      </>
                    ) : (
                      <>
                        <Gift className="h-4 w-4" />
                        Enter Giveaway
                      </>
                    )}
                  </button>
                </motion.div>

                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/40">
                  <ShieldCheck className="h-3.5 w-3.5" /> Winner drawn automatically &amp; fairly
                </p>
              </motion.div>

              {/* Host card */}
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-white/10 font-bold">
                  {transformedGiveaway.creator.avatar &&
                  transformedGiveaway.creator.avatar !== "/placeholder-user.jpg" ? (
                    <Image
                      src={transformedGiveaway.creator.avatar}
                      alt={transformedGiveaway.creator.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    creatorInitial
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {transformedGiveaway.creator.name}
                    {transformedGiveaway.creator.verified && <VerifiedIcon size="sm" />}
                  </div>
                  <div className="text-xs text-white/45">Giveaway host</div>
                </div>
                {transformedGiveaway.creator.id ? (
                  <Link
                    href={`/creator/${transformedGiveaway.creator.id}`}
                    className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/5"
                  >
                    View
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href)
                      toast.success("Link copied!")
                    }}
                    className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/5"
                  >
                    Share
                  </button>
                )}
              </div>
            </aside>
          </div>

          {/* WINNERS (when ended) */}
          {isGiveawayEnded && (
            <div className="mt-12 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold">Winners</h2>
              </div>
              <div className="space-y-3">
                {transformedGiveaway.prizes.length > 0 ? (
                  transformedGiveaway.prizes.map((prize: any) => (
                    <div
                      key={prize.position}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold">
                            {prize.position === 1
                              ? "1st"
                              : prize.position === 2
                              ? "2nd"
                              : prize.position === 3
                              ? "3rd"
                              : `${prize.position}th`}{" "}
                            — {prize.name}
                          </div>
                          {prize.description && (
                            <div className="text-xs text-white/45">{prize.description}</div>
                          )}
                        </div>
                        <div className="text-lg font-extrabold text-orange-500">{prize.value}</div>
                      </div>
                      {prize.winners && prize.winners.length > 0 ? (
                        <div className="space-y-2">
                          {prize.winners.map((winner: any, wi: number) => (
                            <div
                              key={wi}
                              className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/[0.06] px-3 py-2"
                            >
                              <Award className="h-4 w-4 text-green-400" />
                              <span className="text-sm font-semibold text-white">
                                {winner.userName || "Unknown"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : prize.winnerName ? (
                        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/[0.06] px-3 py-2">
                          <Award className="h-4 w-4 text-green-400" />
                          <span className="text-sm font-semibold text-white">{prize.winnerName}</span>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-center text-xs text-white/45">
                          Winner will be announced soon
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-sm text-white/45">
                    No prizes configured for this giveaway
                  </p>
                )}
              </div>
            </div>
          )}

          {/* MORE giveaways */}
          <div className="mt-16">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold">More giveaways</h3>
              <Link href="/giveaways" className="text-sm font-semibold text-orange-500 hover:text-orange-400">
                See all
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]"
                  >
                    <div className="h-40 w-full bg-white/[0.04]" />
                    <div className="p-5">
                      <div className="mb-3 h-4 w-3/4 rounded bg-white/[0.06]" />
                      <div className="mb-4 h-3 w-1/2 rounded bg-white/[0.04]" />
                      <div className="h-9 w-full rounded-xl bg-white/[0.04]" />
                    </div>
                  </div>
                ))
              ) : visibleRelated.length > 0 ? (
                visibleRelated.map((g, index) => {
                  const hostName = g.creatorName || g.creator_name || g.creator || "Host"
                  const hostImage = g.creatorImage || g.creator_image
                  const leftLabel = calculateTimeLeft(g.endDate)
                  return (
                    <motion.div
                      key={g.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      whileHover={{ y: -4 }}
                      viewport={{ once: true }}
                      className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-colors hover:border-orange-500/40"
                    >
                      <Link href={`/giveaway/${g.id}`}>
                        <div className="relative h-40">
                          <Image
                            src={g.coverImage || g.image || "/placeholder.jpg"}
                            alt={g.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                          <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-bold backdrop-blur-sm">
                            {currencySymbol}
                            {g.totalValue || "0"}{" "}
                            <span className="font-medium text-white/55">value</span>
                          </span>
                        </div>
                        <div className="p-5">
                          <h4 className="truncate text-base font-bold group-hover:text-orange-400">
                            {g.title}
                          </h4>
                          <div className="mt-2 flex items-center gap-2 text-sm text-white/50">
                            <span className="relative grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-white/10 text-[10px] font-bold">
                              {hostImage ? (
                                <Image
                                  src={hostImage}
                                  alt={hostName}
                                  fill
                                  className="object-cover"
                                  sizes="20px"
                                />
                              ) : (
                                String(hostName).charAt(0).toUpperCase()
                              )}
                            </span>
                            <span className="truncate">{hostName}</span>
                          </div>
                          <div className="mt-4 flex items-center gap-4 border-t border-white/[0.06] pt-4 text-sm text-white/55">
                            <span className="flex items-center gap-1.5">
                              <Users className="h-4 w-4" /> {(g.entriesCount || 0).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" /> {leftLabel} left
                            </span>
                          </div>
                          <span className="mt-4 flex w-full items-center justify-center rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-black transition-colors group-hover:bg-orange-400">
                            Enter Giveaway
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })
              ) : (
                <div className="col-span-full py-16 text-center">
                  <Gift className="mx-auto mb-4 h-12 w-12 text-white/20" />
                  <p className="text-white/50">No other giveaways available right now</p>
                  <p className="mt-1 text-sm text-white/30">Check back soon for more prizes!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
