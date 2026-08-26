"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

/**
 * "Expires in 12d 4h 30m" for a paid placement.
 *
 * Nothing on FiveCrux renews itself, so the only warning a seller gets that a
 * slot is running out is what is on the card. Recomputes from endDate and ticks
 * every minute so it counts down on its own.
 *
 * Under a week turns red: at that point buying again is the action, not
 * information. [[ExpiringNotice]] uses the same seven-day threshold, so the
 * profile banner and the card never disagree about what is urgent.
 */

const WARN_DAYS = 7

export default function ExpiryPill({
  endDate,
  className = "",
}: {
  endDate: string | Date | null | undefined
  className?: string
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const end = endDate ? new Date(endDate).getTime() : NaN
  if (!Number.isFinite(end)) {
    return <span className="text-[11px] text-white/40">no end date</span>
  }

  const diff = end - now
  const expired = diff <= 0
  const days = Math.floor(diff / 86_400_000)
  const soon = !expired && days < WARN_DAYS

  const label = expired
    ? "Expired"
    : `Expires in ${days}d ${Math.floor((diff % 86_400_000) / 3_600_000)}h ${Math.floor(
        (diff % 3_600_000) / 60_000
      )}m`

  const tone = expired
    ? "border-white/10 bg-white/[0.04] text-white/40"
    : soon
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : "border-orange-500/25 bg-orange-500/10 text-orange-300"

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-semibold tabular-nums ${tone} ${className}`}
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  )
}
