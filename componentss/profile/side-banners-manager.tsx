"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Megaphone, Loader2, ExternalLink, Clock } from "lucide-react"

type SideBanner = {
  id: number
  position: string
  status: string
  title: string | null
  imageUrl: string | null
  linkUrl: string | null
  durationWeeks: number | null
  endDate: string | null
}

// Profile → "Side Banners": after buying a side slot, the owner uploads/edits
// the banner creative here (image + link + title), changeable anytime — exactly
// like managing an ad after buying its slot.
export default function SideBannersManager() {
  const [items, setItems] = useState<SideBanner[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch("/api/side-banners/mine")
      .then((r) => (r.ok ? r.json() : { bookings: [] }))
      .then((d) => setItems(Array.isArray(d.bookings) ? d.bookings : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const active = items.filter((b) => b.status === "active")

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Side Banners</h2>
        <p className="mt-1 text-sm text-white/50">
          Your sticky left/right ad slots. Upload your banner and change it anytime during the booking window.
        </p>
      </div>

      {active.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-14 text-center">
          <Megaphone className="mx-auto mb-3 h-8 w-8 text-white/30" />
          <p className="font-semibold text-white">No active side-banner slots</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/50">
            Only two side slots exist site-wide. Grab one to put your banner beside the catalogue on every page.
          </p>
          <Link
            href="/advertise#side-banners"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400"
          >
            Get a slot
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {active.map((b) => (
            <SlotCard key={b.id} booking={b} onSaved={load} />
          ))}
        </div>
      )}
    </div>
  )
}

// Live "expires in Xd Yh Zm" label. Re-computes from endDate and ticks every
// minute so it counts down on its own; cleans up its interval on unmount.
function ExpiryPill({ endDate }: { endDate: string | null }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (!endDate) {
    return <span className="text-[11px] text-white/40">no end date</span>
  }

  const end = new Date(endDate).getTime()
  if (Number.isNaN(end)) {
    return <span className="text-[11px] text-white/40">no end date</span>
  }

  const diff = end - now
  const expired = diff <= 0

  let label = "Expired"
  if (!expired) {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    label = `Expires in ${days}d ${hours}h ${minutes}m`
  }

  return (
    <span
      className={
        expired
          ? "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-white/40"
          : "inline-flex items-center gap-1 rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-1 text-[11px] font-semibold tabular-nums text-orange-300"
      }
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  )
}

function SlotCard({ booking, onSaved }: { booking: SideBanner; onSaved: () => void }) {
  const [imageUrl, setImageUrl] = useState(booking.imageUrl || "")
  const [linkUrl, setLinkUrl] = useState(booking.linkUrl || "")
  const [title, setTitle] = useState(booking.title || "")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!imageUrl.trim()) {
      toast.error("Add a banner image URL.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/side-banners/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, linkUrl, title }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Save failed")
      }
      toast.success("Banner updated — it's live on the side rail.")
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      {/* Live preview (skyscraper) */}
      <div className="h-[200px] w-[72px] flex-shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0e0e0f]">
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={imageUrl} alt="preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-1 text-center text-[9px] text-white/30">No banner yet</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-orange-300">
            {booking.position} slot
          </span>
          <ExpiryPill endDate={booking.endDate} />
        </div>

        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Banner image URL (tall / vertical)"
          className="mb-2 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-orange-500/50"
        />
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="Click-through link"
          className="mb-2 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-orange-500/50"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="mb-3 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-orange-500/50"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : booking.imageUrl ? "Update banner" : "Publish banner"}
          </button>
          {booking.imageUrl && booking.linkUrl && (
            <a href={booking.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white">
              <ExternalLink className="h-3.5 w-3.5" /> Visit link
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
