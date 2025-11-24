'use client'

import { useAutoCheckGiveaways } from '@/hooks/use-auto-check-giveaways'
import { useAutoCheckExpiredSlots } from '@/hooks/use-auto-check-expired-slots'

export function AutoCheckWrapper({ children }: { children: React.ReactNode }) {
  // Runs silently in background on ALL pages
  // Automatically checks for ended giveaways and triggers winner selection
  useAutoCheckGiveaways()
  // Automatically checks for expired ad slots and deactivates them
  useAutoCheckExpiredSlots()
  
  return <>{children}</>
}

