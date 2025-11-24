'use client'

import { useQuery } from '@tanstack/react-query'

interface CheckResult {
  success: boolean
  checked?: number
  slotsDeactivated?: number
  adsDeactivated?: number
  message?: string
  timestamp?: string
  error?: string
}

export function useAutoCheckExpiredSlots() {
  // Check for expired slots every hour
  const { data: checkResult, isLoading } = useQuery<CheckResult>({
    queryKey: ['check-expired-slots'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/ad-slots/check-expired')
        if (!res.ok) {
          console.warn('Background slot expiration check failed:', res.status)
          return { success: false }
        }
        const data = await res.json()
        
        // Log if slots were deactivated
        if (data.success && data.slotsDeactivated > 0) {
          console.log(`🔒 Deactivated ${data.slotsDeactivated} expired slot(s) and ${data.adsDeactivated} ad(s)`)
        }
        
        return data
      } catch (error) {
        console.error('Background slot expiration check error:', error)
        return { success: false }
      }
    },
    refetchInterval: 60 * 60 * 1000, // Check every hour
    refetchIntervalInBackground: true,
    retry: 1,
    enabled: typeof window !== 'undefined',
  })

  return { 
    checkResult, 
    isChecking: isLoading
  }
}

