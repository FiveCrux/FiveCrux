"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import { Button } from "@/componentss/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/componentss/ui/avatar"
import { VerifiedIcon } from "@/componentss/shared/verified-icon"
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
        <Card className="bg-neutral-900 border-2 border-neutral-700/50 hover:border-orange-500 cursor-pointer h-full backdrop-blur-sm relative overflow-hidden shadow-2xl rounded-xl w-full">
          {/* Image Section */}
          <CardHeader className="p-0 overflow-hidden rounded-t-xl">
            <Image
              src={item.cover_image || "/placeholder.jpg"}
              alt={item.title}
              width={400}
              height={256}
              className="object-cover w-full h-52"
            />
          </CardHeader>

          {/* Content Section */}
          <div className="flex flex-col flex-1">
            <CardContent className="p-3 flex-1 space-y-2">
              {/* Title */}
              <CardTitle className="text-base font-bold text-white leading-tight line-clamp-2">
                {item.title}
              </CardTitle>
               {/* Framework Badges */}
               {item.framework &&
                item.framework.length > 0 && (
                  <motion.div
                    className="flex flex-wrap gap-1"
                  >
                    {item.framework.map((fw: string, idx: number) => (
                      <motion.div
                        key={idx}
                        whileHover={{
                          scale: 1.1,
                          y: -2,
                        }}
                      >
                        <Badge className="bg-neutral-800/95 text-white backdrop-blur-sm text-[10px] font-bold border border-neutral-600/50 rounded px-1.5 py-0.5 uppercase tracking-wide shadow-lg hover:bg-neutral-800/95 hover:text-white">
                          <span className="mr-1 text-xs">
                            •
                          </span>
                          {fw}
                        </Badge>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              <CardDescription className="text-neutral-400 text-xs leading-snug flex items-center gap-1.5 flex-row">
                <Avatar className="h-4 w-4 flex-shrink-0">
                  <AvatarImage
                    src={item.seller_image || "/placeholder-user.jpg"}
                    alt={item.seller}
                  />
                  <AvatarFallback className="bg-orange-500 text-white text-[8px] font-bold">
                    {item.seller ? item.seller[0].toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="whitespace-nowrap">By {item.seller}</span>
                {isVerifiedCreator(item.seller_roles) && (
                  <VerifiedIcon size="sm" className="flex-shrink-0" />
                )}
              </CardDescription>

             

              {/* Price */}
              <CardDescription className="text-orange-500 text-xl font-bold pt-1">
                {item.free ? "Free" : `${item.currency_symbol || "$"}${item.price}`}
              </CardDescription>
            </CardContent>
            <div className="flex justify-center px-3 pb-3">
              <Button
                variant="outline"
                className="w-full bg-white text-black hover:bg-orange-600 hover:text-white transition-colors duration-200 font-semibold text-xs py-1.5 h-auto"
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
