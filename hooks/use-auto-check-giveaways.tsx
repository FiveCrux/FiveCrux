'use client'

import { useQuery } from '@tanstack/react-query'

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
    discordAnnounced?: boolean
    error?: string
  }>
  timestamp?: string
}

export function useAutoCheckGiveaways() {
  // Check for ended giveaways every 10 minutes
  const { data: checkResult, isLoading } = useQuery<CheckResult>({
    queryKey: ['check-ended-giveaways'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/giveaways/check-and-trigger-ended')
        if (!res.ok) {
          console.warn('Background giveaway check failed:', res.status)
          return { needsProcessing: false }
        }
        const data = await res.json()
        
        // Log if winners were announced
        if (data.needsProcessing && data.successful > 0) {
          console.log('🎉 Giveaway winners announced!', data.results)
        }
        
        return data
      } catch (error) {
        console.error('Background giveaway check error:', error)
        return { needsProcessing: false }
      }
    },
    refetchInterval: 10 * 60 * 1000, // Check every 10 minutes
    refetchIntervalInBackground: true,
    retry: 1,
    enabled: typeof window !== 'undefined',
  })

  return { 
    checkResult, 
    isChecking: isLoading
  }
}

