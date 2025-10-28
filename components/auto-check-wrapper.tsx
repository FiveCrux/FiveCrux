'use client'

import { useAutoCheckGiveaways } from '@/hooks/use-auto-check-giveaways'

export function AutoCheckWrapper({ children }: { children: React.ReactNode }) {
  // Runs silently in background on ALL pages
  // Automatically checks for ended giveaways and triggers winner selection
  useAutoCheckGiveaways()
  
  return <>{children}</>
}

