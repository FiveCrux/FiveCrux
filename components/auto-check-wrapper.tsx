'use client'

import { useAutoCheckExpiredSlots } from '@/hooks/use-auto-check-expired-slots'

export function AutoCheckWrapper({ children }: { children: React.ReactNode }) {
  // Runs silently in background on ALL pages.
  // Giveaway winner selection is NOT automatic — the giveaway's creator (or an
  // admin) explicitly presses "Draw Winners" once it has ended; see
  // lib/giveaway-winners.ts and app/api/giveaways/[id]/draw-winners/route.ts.
  // Automatically checks for expired ad slots and deactivates them.
  useAutoCheckExpiredSlots()

  return <>{children}</>
}

