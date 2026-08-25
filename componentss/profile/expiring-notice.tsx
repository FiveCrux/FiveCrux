"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Clock, ArrowRight, Megaphone, Star, PanelsTopLeft } from "lucide-react"

type ExpiringItem = {
  kind: "ad-slot" | "featured-slot" | "side-banner"
  label: string
  detail: string | null
  endDate: string
  daysLeft: number
  expired: boolean
  renewHref: string
}

/**
 * Portal warning for paid placements that are running out.
 *
 * Nothing on FiveCrux renews itself — a slot simply stops when its time is up.
 * Without this the first sign is the ad silently vanishing, which reads as a
 * bug rather than an expiry. This gives them notice while there is still time
 * to buy again.
 */

const ICONS = {
  "ad-slot": Megaphone,
  "featured-slot": Star,
  "side-banner": PanelsTopLeft,
} as const

function countdown(item: ExpiringItem): string {
  if (item.expired) return "Expired"
  const ms = new Date(item.endDate).getTime() - Date.now()
  if (ms <= 0) return "Expiring now"
  const hours = Math.floor(ms / 3_600_000)
  // Under a day, hours are what the person can actually act on; above that they
  // are noise.
  if (hours < 24) return hours <= 1 ? "Less than an hour left" : `${hours} hours left`
  const days = Math.ceil(hours / 24)
  return days === 1 ? "1 day left" : `${days} days left`
}

export default function ExpiringNotice() {
  const [items, setItems] = useState<ExpiringItem[]>([])

  useEffect(() => {
    let alive = true
    fetch("/api/user/expiring")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (alive) setItems(Array.isArray(d?.items) ? d.items : [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (items.length === 0) return null

  const anyExpired = items.some((i) => i.expired)

  return (
    <section
      className={`mb-6 overflow-hidden rounded-2xl border ${
        anyExpired
          ? "border-red-500/30 bg-red-500/[0.06]"
          : "border-amber-500/30 bg-amber-500/[0.06]"
      }`}
    >
      <div className="flex items-center gap-2.5 border-b border-white/[0.08] px-5 py-3.5">
        <AlertTriangle
          className={`h-[18px] w-[18px] ${anyExpired ? "text-red-400" : "text-amber-400"}`}
        />
        <h3 className="text-sm font-bold">
          {anyExpired ? "Some placements have expired" : "Placements expiring soon"}
        </h3>
      </div>

      <ul className="divide-y divide-white/[0.06]">
        {items.map((item, i) => {
          const Icon = ICONS[item.kind] ?? Megaphone
          return (
            <li
              key={`${item.kind}-${item.endDate}-${i}`}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Icon className="h-4 w-4 shrink-0 text-white/40" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.label}</p>
                  {item.detail && (
                    <p className="text-xs text-white/45">{item.detail}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-xs ${
                    item.expired ? "text-red-300" : "text-amber-300"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  {countdown(item)}
                </span>
                <Link
                  href={item.renewHref}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-black transition hover:bg-orange-400"
                >
                  {item.expired ? "Buy again" : "Renew"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
