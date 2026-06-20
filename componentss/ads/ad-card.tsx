"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { ExternalLink, Megaphone } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Button } from "@/componentss/ui/button"

interface Ad {
  id: number
  title: string
  description: string
  image_url?: string
  link_url?: string
  category: string
  status: string
  created_at: string
}

interface AdCardProps {
  ad: Ad
  className?: string
  variant?: 'script' | 'giveaway' | 'default'
}

export default function AdCard({ ad, className = "", variant = 'default' }: AdCardProps) {
  const [imageError, setImageError] = useState(false)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Track view when ad is displayed (using Intersection Observer for better accuracy)
  useEffect(() => {
    if (!ad.id || ad.status !== 'approved' || hasTrackedView) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView) {
            // Ad is visible on screen, track the view
            setHasTrackedView(true)
            trackView()
            observer.disconnect() // Only track once
          }
        })
      },
      {
        threshold: 0.5, // Track when 50% of ad is visible
        rootMargin: '0px'
      }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [ad.id, ad.status, hasTrackedView])

  const trackView = async () => {
    if (ad.id && ad.status === 'approved') {
      try {
        // Fire and forget - don't wait for response
        fetch(`/api/ads/${ad.id}/view`, {
          method: 'POST',
          credentials: 'include',
        }).catch(err => {
          // Silently fail - don't interrupt user experience
          console.error('Failed to track ad view:', err)
        })
      } catch (error) {
        // Silently fail
        console.error('Error tracking ad view:', error)
      }
    }
  }

  const handleClick = async () => {
    if (ad.link_url) {
      // Track click if ad has an ID (only for approved ads)
      if (ad.id && ad.status === 'approved') {
        try {
          // Fire and forget - don't wait for response
          fetch(`/api/ads/${ad.id}/click`, {
            method: 'POST',
            credentials: 'include',
          }).catch(err => {
            // Silently fail - don't interrupt user experience
            console.error('Failed to track ad click:', err)
          })
        } catch (error) {
          // Silently fail
          console.error('Error tracking ad click:', error)
        }
      }
      window.open(ad.link_url, '_blank', 'noopener,noreferrer')
    }
  }

  // Script variant - compact and matches script card style
  if (variant === 'script') {
    return (
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -5, scale: 1.02 }}
        className={`group ${className}`}
      >
        <Card
          onClick={handleClick}
          className="bg-white/[0.04] border border-white/[0.08] hover:border-orange-500/40 cursor-pointer h-full backdrop-blur-md relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.55)] rounded-2xl transition-all duration-300 flex flex-col"
        >
          {/* Image Section */}
          <CardHeader className="p-0 overflow-hidden rounded-t-2xl">
            <div className="relative">
              {ad.image_url && !imageError ? (
                <motion.img
                  src={ad.image_url}
                  alt={ad.title}
                  className="object-cover w-full h-52 transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-52 bg-white/[0.03] flex items-center justify-center">
                  <Megaphone className="h-16 w-16 text-white/20" />
                </div>
              )}
              <motion.div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20"
                initial={false}
              />
              <motion.div
                className="absolute top-2.5 right-2.5"
                whileHover={{ scale: 1.1 }}
              >
                <Badge className="bg-orange-500/15 text-orange-300 border border-orange-500/30 text-[10px] font-semibold uppercase tracking-[0.04em] px-2 py-[3px] rounded-full">
                  Sponsored
                </Badge>
              </motion.div>
            </div>
          </CardHeader>

          {/* Content Section */}
          <div className="flex flex-col flex-1">
            <CardContent className="p-3.5 flex-1 space-y-2">
              {/* Title */}
              <CardTitle className="text-base font-bold text-white leading-tight line-clamp-2 group-hover:text-orange-400 transition-colors duration-300">
                {ad.title}
              </CardTitle>

              {/* Description */}
              <CardDescription className="text-white/55 text-xs leading-snug line-clamp-2">
                {ad.description}
              </CardDescription>

              {/* Category Badge */}
              {/* <motion.div
                className="flex flex-wrap gap-1"
                // initial={{ scale: 0, rotate: 180 }}
                // animate={{ scale: 1, rotate: 0 }}
                // transition={{ delay: 0.1, type: "spring" }}
              >
                <motion.div whileHover={{ scale: 1.1, y: -2 }}>
                  <Badge className="bg-neutral-800/95 text-white backdrop-blur-sm text-[10px] font-bold border border-neutral-600/50 rounded px-1.5 py-0.5 uppercase tracking-wide shadow-lg">
                    <span className="mr-1 text-xs">•</span>
                    {ad.category}
                  </Badge>
                </motion.div>
              </motion.div> */}

              {/* Sponsored Text */}
              <CardDescription className="text-orange-400/70 text-[10px] font-semibold pt-1 uppercase tracking-[0.08em] border-t border-white/10 mt-1">
                Sponsored Content
              </CardDescription>
            </CardContent>

            {/* Button Section */}
            <div className="px-3.5 pb-3.5 mt-auto">
              <Button
                variant="outline"
                className="w-full bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 hover:text-orange-300 transition-colors duration-200 font-semibold text-xs py-1.5 h-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
              >
                {ad.link_url ? 'View Details' : 'View Details'}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  // Giveaway variant - compact style
  if (variant === 'giveaway') {
    return (
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        whileHover={{ y: -5, scale: 1.02 }}
        className={`group ${className}`}
      >
        <Card
          onClick={handleClick}
          className="bg-white/[0.04] border border-white/[0.08] hover:border-yellow-400/40 cursor-pointer h-full backdrop-blur-md relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.55)] rounded-2xl transition-all duration-300 flex flex-col"
        >
          {/* Image Section */}
          <CardHeader className="p-0 overflow-hidden rounded-t-2xl relative">
            <div className="relative">
              {ad.image_url && !imageError ? (
                <motion.img
                  src={ad.image_url}
                  alt={ad.title}
                  className="object-cover w-full h-52 transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-52 bg-white/[0.03] flex items-center justify-center">
                  <Megaphone className="h-16 w-16 text-white/20" />
                </div>
              )}
              <motion.div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20"
                initial={false}
              />
              <motion.div
                className="absolute top-2.5 right-2.5"
                whileHover={{ scale: 1.1 }}
              >
                <Badge className="bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 text-[10px] font-semibold uppercase tracking-[0.04em] px-2 py-[3px] rounded-full">
                  Sponsored
                </Badge>
              </motion.div>
            </div>
          </CardHeader>

          {/* Content Section */}
          <div className="flex flex-col flex-1">
            <CardContent className="p-3.5 flex-1 space-y-2">
              {/* Title */}
              <CardTitle className="text-base font-bold text-white leading-tight line-clamp-2">
                {ad.title}
              </CardTitle>

              {/* Category Badge */}
              {/* {ad.category && (
                <div className="flex flex-wrap gap-1">
                  <Badge className="bg-neutral-800/95 text-white backdrop-blur-sm text-[10px] font-bold border border-neutral-600/50 rounded px-1.5 py-0.5 uppercase tracking-wide shadow-lg">
                    <span className="mr-1 text-xs">•</span>
                    {ad.category}
                  </Badge>
                </div>
              )} */}

              {/* Description */}
              <CardDescription className="text-white/55 text-xs leading-snug line-clamp-2">
                {ad.description}
              </CardDescription>

              {/* Sponsored Text */}
              <CardDescription className="text-yellow-400/70 text-[10px] font-semibold pt-1 uppercase tracking-[0.08em] border-t border-white/10 mt-1">
                Sponsored Content
              </CardDescription>
            </CardContent>

            {/* Button Section */}
            <div className="px-3.5 pb-3.5 mt-auto">
              <Button
                variant="outline"
                className="w-full bg-yellow-400/10 text-yellow-300 border border-yellow-400/30 hover:bg-yellow-400/20 hover:text-yellow-200 transition-colors duration-200 font-semibold text-xs py-1.5 h-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
              >
                {ad.link_url ? 'View Details' : 'View Details'}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  // Default variant - compact style
  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`w-full max-w-sm mx-auto ${className}`}
    >
      <Card
        onClick={handleClick}
        className="bg-white/[0.04] border border-white/[0.08] hover:border-orange-500/40 cursor-pointer h-full backdrop-blur-md relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.55)] rounded-2xl transition-all duration-300 flex flex-col"
      >
        {/* Image Section */}
        <CardHeader className="p-0 overflow-hidden rounded-t-2xl">
          <div className="relative">
            {ad.image_url && !imageError ? (
              <img
                src={ad.image_url}
                alt={ad.title}
                className="object-cover w-full h-52"
                loading="lazy"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-52 bg-white/[0.03] flex items-center justify-center">
                <Megaphone className="h-16 w-16 text-white/20" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
            <div className="absolute top-2.5 right-2.5">
              <Badge className="bg-orange-500/15 text-orange-300 border border-orange-500/30 text-[10px] font-semibold uppercase tracking-[0.04em] px-2 py-[3px] rounded-full">
                Sponsored
              </Badge>
            </div>
          </div>
        </CardHeader>

        {/* Content Section */}
        <div className="flex flex-col flex-1">
          <CardContent className="p-3.5 flex-1 space-y-2">
            {/* Title */}
            <CardTitle className="text-base font-bold text-white leading-tight line-clamp-2">
              {ad.title}
            </CardTitle>

            {/* Description */}
            <CardDescription className="text-white/55 text-xs leading-snug line-clamp-2">
              {ad.description}
            </CardDescription>

            {/* Category Badge */}
            {/* <div className="flex flex-wrap gap-1">
              <Badge className="bg-neutral-800/95 text-white backdrop-blur-sm text-[10px] font-bold border border-neutral-600/50 rounded px-1.5 py-0.5 uppercase tracking-wide shadow-lg">
                <span className="mr-1 text-xs">•</span>
                {ad.category}
              </Badge>
            </div> */}

            {/* Sponsored Text */}
            <CardDescription className="text-orange-400/70 text-[10px] font-semibold pt-1 uppercase tracking-[0.08em] border-t border-white/10 mt-1">
              Sponsored Content
            </CardDescription>
          </CardContent>

          {/* Button Section */}
          <div className="px-3.5 pb-3.5 mt-auto">
            <Button
              variant="outline"
              className="w-full bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 hover:text-orange-300 transition-colors duration-200 font-semibold text-xs py-1.5 h-auto"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              {ad.link_url ? 'View Details' : 'View Details'}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// Hook for getting random ads
export function useRandomAds(ads: Ad[], count: number = 1) {
  const [randomAds, setRandomAds] = useState<Ad[]>([])

  useEffect(() => {
    if (ads.length === 0) {
      setRandomAds([])
      return
    }

    const activeAds = ads.filter(ad => ad.status === 'active' || ad.status === 'approved')
    if (activeAds.length === 0) {
      setRandomAds([])
      return
    }

    // Shuffle and select random ads
    const shuffled = [...activeAds].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(count, shuffled.length))
    setRandomAds(selected)
  }, [ads, count])

  return randomAds
}