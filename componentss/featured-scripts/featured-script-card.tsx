"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/componentss/ui/card"
import { Button } from "@/componentss/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/componentss/ui/avatar"
import { VerifiedIcon } from "@/componentss/shared/verified-icon"
import { FrameworkBadge } from "@/componentss/shared/framework-badge"
import { isVerifiedCreator } from "@/lib/utils"
interface FeaturedScriptCardProps {
  item: {
    id: number
    featuredScriptId?: number
    title: string
    description: string
    cover_image?: string
    framework?: string[]
    price: number
    original_price?: number
    currency_symbol?: string
    free?: boolean
    seller?: string
    seller_name?: string
    seller_image?: string
    seller_roles?: string[]
  }
  index: number
  className?: string
  style?: React.CSSProperties
}

export default function FeaturedScriptCard({ item, index, className = "", style }: FeaturedScriptCardProps) {
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Track view when card is displayed (using Intersection Observer)
  useEffect(() => {
    if (!item.featuredScriptId || hasTrackedView) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView) {
            setHasTrackedView(true)
            trackView()
            observer.disconnect()
          }
        })
      },
      {
        threshold: 0.5, // Track when 50% of card is visible
        rootMargin: '0px'
      }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [item.featuredScriptId, hasTrackedView])

  const trackView = async () => {
    if (item.featuredScriptId) {
      try {
        fetch(`/api/featured-scripts/${item.featuredScriptId}/view`, {
          method: 'POST',
          credentials: 'include',
        }).catch(err => {
          console.error('Failed to track featured script view:', err)
        })
      } catch (error) {
        console.error('Error tracking featured script view:', error)
      }
    }
  }

  const handleClick = async () => {
    if (item.featuredScriptId) {
      try {
        fetch(`/api/featured-scripts/${item.featuredScriptId}/click`, {
          method: 'POST',
          credentials: 'include',
        }).catch(err => {
          console.error('Failed to track featured script click:', err)
        })
      } catch (error) {
        console.error('Error tracking featured script click:', error)
      }
    }
  }

  return (
    <div
      ref={cardRef}
      className={`group ${className}`}
      style={style}
    >
      <Link href={`/script/${item.id}`} onClick={handleClick}>
        <Card className="bg-white/[0.04] border border-white/[0.08] hover:border-orange-500/40 cursor-pointer h-full backdrop-blur-md relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.55)] hover:-translate-y-1.5 transition-all duration-200 rounded-2xl w-full">
          {/* Image Section */}
          <CardHeader className="p-0 overflow-hidden rounded-t-2xl relative">
            <Image
              src={item.cover_image || "/placeholder.jpg"}
              alt={item.title}
              width={400}
              height={256}
              className="object-cover w-full h-52 transition-transform duration-300 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
            {/* Featured badge */}
            <span className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/30 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.04em] text-orange-300">
              Featured
            </span>
          </CardHeader>

          {/* Content Section */}
          <div className="flex flex-col flex-1">
            <CardContent className="p-3.5 flex-1 space-y-2.5">
              {/* Title */}
              <CardTitle className="text-base font-bold text-white leading-tight line-clamp-2">
                {item.title}
              </CardTitle>
               {/* Framework Badges — fixed-height row (present even when empty) so
                   a script with no framework tags doesn't render a shorter card
                   than its neighbors in the same row. */}
               <div className="flex h-5 flex-wrap items-center gap-1.5">
                 {item.framework?.map((fw: string, idx: number) => (
                   <motion.div key={idx}>
                     <FrameworkBadge framework={fw} />
                   </motion.div>
                 ))}
               </div>
              <CardDescription className="text-white/55 text-xs leading-snug flex items-center gap-1.5 flex-row">
                <Avatar className="h-4 w-4 flex-shrink-0">
                  <AvatarImage
                    src={item.seller_image || "/placeholder-user.jpg"}
                    alt={item.seller}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-yellow-400 text-black text-[8px] font-bold">
                    {item.seller ? item.seller[0].toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="whitespace-nowrap">By {item.seller}</span>
                {isVerifiedCreator(item.seller_roles) && (
                  <VerifiedIcon size="sm" className="flex-shrink-0" />
                )}
              </CardDescription>

              {/* Price */}
              <div className="border-t border-white/10 pt-2.5">
                <CardDescription className="text-orange-400 text-xl font-extrabold tracking-[-0.02em]">
                  {item.free ? "Free" : `${item.currency_symbol || "$"}${item.price}`}
                </CardDescription>
              </div>
            </CardContent>
            <div className="flex justify-center px-3.5 pb-3.5">
              <Button
                variant="outline"
                className="w-full bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 hover:text-orange-300 transition-colors duration-200 font-semibold text-xs py-1.5 h-auto"
              >
                View Details
              </Button>
            </div>
          </div>
        </Card>
      </Link>
    </div>
  )
}
