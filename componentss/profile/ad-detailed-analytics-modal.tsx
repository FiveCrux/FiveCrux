"use client"

import { useEffect, useState } from "react"
import { X, Activity, TrendingUp, Compass, MapPin, Loader2 } from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import type { AdDetailedAnalytics, AdType } from "@/lib/ad-analytics"

type Props = {
  adType: AdType
  adId: string | number
  title: string
  subtitle?: string
  onClose: () => void
}

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
]

// Per-ad "Detailed Analytics" — real impressions/clicks recorded on actual
// render/click events (ad_events table), grouped into a daily trend, traffic
// sources (from the Referer header), and geography (from Vercel's edge geo
// header — no raw IP is ever stored or shown).
export default function AdDetailedAnalyticsModal({ adType, adId, title, subtitle, onClose }: Props) {
  const [rangeDays, setRangeDays] = useState(30)
  const [data, setData] = useState<AdDetailedAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const to = new Date()
    const from = new Date(to.getTime() - rangeDays * 24 * 60 * 60 * 1000)
    fetch(`/api/ads/analytics?type=${adType}&id=${adId}&from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) setData(d?.analytics ?? null)
      })
      .catch(() => {
        if (alive) setData(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [adType, adId, rangeDays])

  const fmt = (n: number) => n.toLocaleString()

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-4xl rounded-2xl border border-white/[0.08] bg-[#0d0d0d] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] p-6">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <Activity className="h-5 w-5 text-orange-400" />
              Detailed Analytics: {title}
            </div>
            {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => setRangeDays(opt.days)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    rangeDays === opt.days ? "bg-orange-500 text-black" : "text-white/55 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] text-white/50 transition hover:bg-white/[0.06] hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : !data ? (
            <p className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-center text-sm text-white/50">
              Couldn&apos;t load analytics right now.
            </p>
          ) : (
            <>
              {/* Stat tiles */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-white/45">Total Impressions</div>
                  <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-white">{fmt(data.totalImpressions)}</div>
                </div>
                <div className="rounded-2xl border border-orange-500/25 bg-orange-500/[0.06] p-4">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-orange-300/80">Total Clicks</div>
                  <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-white">{fmt(data.totalClicks)}</div>
                </div>
              </div>

              {/* Trend chart */}
              <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                  <TrendingUp className="h-3.5 w-3.5 text-orange-400/70" />
                  Analytics Trends
                </div>
                {data.dailyTrend.length === 0 ? (
                  <p className="py-10 text-center text-sm text-white/35">No recorded activity in this range yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.dailyTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="impressionsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fb923c" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#0d0d0f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                      />
                      <Area type="monotone" dataKey="impressions" stroke="#60a5fa" fill="url(#impressionsFill)" strokeWidth={2} name="Impressions" />
                      <Area type="monotone" dataKey="clicks" stroke="#fb923c" fill="url(#clicksFill)" strokeWidth={2} name="Total Clicks" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Traffic sources + geography */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                    <Compass className="h-3.5 w-3.5 text-orange-400/70" />
                    Global Traffic Sources
                  </div>
                  {data.trafficSources.length === 0 ? (
                    <p className="py-4 text-sm text-white/35">No impressions recorded yet.</p>
                  ) : (
                    <BarList items={data.trafficSources.map((s) => ({ label: sourceLabel(s.source), value: s.count, percent: s.percent }))} />
                  )}
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                    <MapPin className="h-3.5 w-3.5 text-orange-400/70" />
                    Audience Geography
                  </div>
                  {data.geography.length === 0 ? (
                    <p className="py-4 text-sm text-white/35">No impressions recorded yet.</p>
                  ) : (
                    <BarList items={data.geography.map((g) => ({ label: g.country, value: g.count, percent: g.percent }))} />
                  )}
                </div>
              </div>

              <p className="mt-4 text-center text-[11px] text-white/35">
                Real recorded events only — geography comes from the request&apos;s edge location, no IP addresses are stored.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function sourceLabel(source: string) {
  switch (source) {
    case "fivecrux":
      return "FiveCrux browsing"
    case "search":
      return "Search"
    case "external":
      return "External sites"
    default:
      return "Direct"
  }
}

function BarList({ items }: { items: { label: string; value: number; percent: number }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-white/85">{it.label}</span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-white/55">{it.percent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-500/60 to-orange-400" style={{ width: `${Math.max(4, it.percent)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
