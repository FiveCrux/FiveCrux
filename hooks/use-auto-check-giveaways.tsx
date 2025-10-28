'use client'

import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'

interface NearestGiveaway {
  hasGiveaways: boolean
  giveawayId?: number
  title?: string
  endTime?: string
  timeLeft?: number
  endsIn?: string
}

interface CheckResult {
  needsProcessing: boolean
  found?: number
  processed?: number
  successful?: number
  results?: Array<{
    giveawayId: number
    title: string
    success: boolean
    winnersCount?: number
    error?: string
  }>
}

export function useAutoCheckGiveaways() {
  // Step 1: Track the nearest ending giveaway
  const { data: nearestGiveaway } = useQuery<NearestGiveaway>({
    queryKey: ['nearest-ending-giveaway'],
    queryFn: async () => {
      const res = await fetch('/api/giveaways/nearest-ending')
      if (!res.ok) throw new Error('Failed to fetch nearest giveaway')
      return await res.json()
    },
    // Check for nearest giveaway every 30 seconds
    refetchInterval: 30000,
    // Continue checking even when tab not focused
    refetchIntervalInBackground: true,
    // Don't throw errors (silent background task)
    retry: 1,
    // Only run in browser
    enabled: typeof window !== 'undefined',
    // Update timeLeft on each refetch
    select: (data) => {
      if (!data.hasGiveaways || !data.endTime) return data
      
      const timeLeft = new Date(data.endTime).getTime() - Date.now()
      return {
        ...data,
        timeLeft: Math.max(0, timeLeft)
      }
    }
  })

  // Step 2: Calculate adaptive polling interval
  const getPollingInterval = useCallback(() => {
    if (!nearestGiveaway?.hasGiveaways || !nearestGiveaway.timeLeft) {
      return 60000 // No giveaways? Check every 1 minute
    }

    const timeLeft = nearestGiveaway.timeLeft

    // Adaptive intervals based on urgency
    if (timeLeft <= 0) return 5000           // Already ended? Check fast (5s)
    if (timeLeft < 60000) return 5000        // < 1 min: Check every 5s ⚡
    if (timeLeft < 300000) return 15000      // < 5 min: Check every 15s 🏃
    if (timeLeft < 900000) return 30000      // < 15 min: Check every 30s 🚶
    return 60000                             // Otherwise: Check every 60s 😴
  }, [nearestGiveaway?.timeLeft, nearestGiveaway?.hasGiveaways])

  // Step 3: Main check with dynamic interval
  const { data: checkResult, isLoading } = useQuery<CheckResult>({
    queryKey: ['check-ended-giveaways'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/giveaways/check-and-trigger-ended')
        if (!res.ok) {
          // Silently fail - this is a background task
          console.warn('Background giveaway check failed:', res.status)
          return { needsProcessing: false }
        }
        return await res.json()
      } catch (error) {
        console.error('Background giveaway check error:', error)
        return { needsProcessing: false }
      }
    },
    refetchInterval: getPollingInterval(), // ✨ Adaptive polling
    refetchIntervalInBackground: true,
    retry: false, // Don't retry failed checks
    enabled: typeof window !== 'undefined',
    // Don't show loading states (silent task)
    notifyOnChangeProps: [],
  })

  return { 
    nearestGiveaway, 
    checkResult, 
    currentInterval: getPollingInterval(),
    isChecking: isLoading
  }
}

