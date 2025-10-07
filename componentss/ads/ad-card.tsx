"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ExternalLink, Megaphone } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"

interface Ad {
  id: number
  title: string
  description: string
  image_url?: string
  link_url?: string
  category: string
  status: string
  priority: number
  created_at: string
}

interface AdCardProps {
  ad: Ad
  className?: string
  variant?: 'script' | 'giveaway' | 'default'
}

export default function AdCard({ ad, className = "", variant = 'default' }: AdCardProps) {
  const [imageError, setImageError] = useState(false)

  const handleClick = () => {
    if (ad.link_url) {
      window.open(ad.link_url, '_blank', 'noopener,noreferrer')
    }
  }

  // Script variant - matches script card style
  if (variant === 'script') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -5, scale: 1.02 }}
        className={`group ${className}`}
      >
        <Card
          className="bg-gray-800/30 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 cursor-pointer h-full backdrop-blur-sm relative overflow-hidden"
          onClick={handleClick}
        >
          {/* Animated background on hover */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            initial={false}
          />

          <CardHeader className="p-0 relative">
            <div className="relative overflow-hidden">
              {ad.image_url && !imageError ? (
                <motion.img
                  src={ad.image_url}
                  alt={ad.title}
                  className="object-cover transition-transform duration-500 group-hover:scale-110 w-full h-48 rounded-t-lg"
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-48 bg-gray-700/30 rounded-t-lg flex items-center justify-center">
                  <Megaphone className="h-16 w-16 text-gray-500" />
                </div>
              )}
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                initial={false}
              />
              <motion.div
                className="absolute top-2 right-2"
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.1 }}
              >
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  Advertisement
                </Badge>
              </motion.div>
            </div>
          </CardHeader>

          <CardContent className="p-4 relative z-10">
            <CardTitle className="text-white text-lg mb-2 group-hover:text-orange-500 transition-colors duration-300">
              {ad.title}
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm mb-3 leading-relaxed line-clamp-3">
              {ad.description}
            </CardDescription>
            
            <div className="flex flex-wrap gap-1 mb-3">
              <Badge
                variant="secondary"
                className="text-xs bg-gray-700/50 text-gray-300 backdrop-blur-sm"
              >
                {ad.category}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-gray-500">Sponsored Content</div>
              {ad.link_url && (
                <span className="text-sm text-orange-400 group-hover:text-orange-300 transition-colors">
                  Learn more →
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Giveaway variant - matches giveaway card style
  if (variant === 'giveaway') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        whileHover={{ y: -10, scale: 1.02 }}
        className={`group ${className}`}
      >
        <Card 
          className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 hover:border-yellow-400/50 transition-all duration-500 backdrop-blur-sm relative overflow-hidden h-full"
          onClick={handleClick}
        >
          {/* Animated background on hover */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            initial={false}
          />

          <CardHeader className="p-0 relative">
            <div className="relative overflow-hidden">
              {ad.image_url && !imageError ? (
                <motion.img
                  src={ad.image_url}
                  alt={ad.title}
                  className="object-cover transition-transform duration-500 group-hover:scale-110 w-full h-48 rounded-t-lg"
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-48 bg-gray-700/30 rounded-t-lg flex items-center justify-center">
                  <Megaphone className="h-16 w-16 text-gray-500" />
                </div>
              )}
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                initial={false}
              />
              <motion.div
                className="absolute top-2 right-2"
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.1 }}
              >
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  Advertisement
                </Badge>
              </motion.div>
            </div>
          </CardHeader>

          <CardContent className="p-6 relative z-10">
            <CardTitle className="text-white text-xl mb-3 group-hover:text-yellow-400 transition-colors duration-300">
              {ad.title}
            </CardTitle>
            <CardDescription className="text-gray-400 mb-4 leading-relaxed line-clamp-3">
              {ad.description}
            </CardDescription>

            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="bg-gray-700/50 text-gray-300">
                {ad.category}
              </Badge>
              {ad.link_url && (
                <span className="text-sm text-yellow-400 group-hover:text-yellow-300 transition-colors">
                  Learn more →
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Default variant - original style
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`w-full max-w-sm mx-auto ${className}`}
    >
      <Card 
        className={`h-80 bg-gradient-to-br from-orange-500/10 to-yellow-400/10 border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 cursor-pointer group flex flex-col ${ad.link_url ? 'hover:shadow-lg hover:shadow-orange-500/20' : ''}`}
        onClick={handleClick}
      >
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-orange-400" />
              <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                Advertisement
              </Badge>
            </div>
            {ad.link_url && (
              <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-orange-400 transition-colors" />
            )}
          </div>
          <CardTitle className="text-white text-lg group-hover:text-orange-400 transition-colors line-clamp-2">
            {ad.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          <CardDescription className="text-gray-300 mb-4 line-clamp-3 flex-shrink-0">
            {ad.description}
          </CardDescription>
          
          <div className="flex-1 flex items-center justify-center mb-4">
            {ad.image_url && !imageError ? (
              <div className="w-full h-32 rounded-lg overflow-hidden">
                <img
                  src={ad.image_url}
                  alt={ad.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="w-full h-32 bg-gray-700/30 rounded-lg flex items-center justify-center">
                <Megaphone className="h-12 w-12 text-gray-500" />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-auto">
            <Badge variant="secondary" className="bg-gray-700/50 text-gray-300">
              {ad.category}
            </Badge>
            {ad.link_url && (
              <span className="text-sm text-orange-400 group-hover:text-orange-300 transition-colors">
                Click to learn more →
              </span>
            )}
          </div>
        </CardContent>
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

