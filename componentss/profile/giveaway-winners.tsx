"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Gift, Trophy, CheckCircle2, Circle, Save } from "lucide-react"

// Profile → "Winners": for each of the creator's OWN giveaways, list the winners
// (per prize) with a "Delivered" toggle + a free-text notes field. Marking
// delivered records who got what so nobody can double-claim. Discord-leave abuse
// is checked manually by the creator before ticking (no bot / auto-detect).

type Winner = {
  id: number
  prizeId: number
  giveawayId: number
  giveawayTitle: string
  prizeName: string
  prizePosition: number
  userId: string
  userName: string | null
  userEmail: string | null
  delivered: boolean
  deliveredAt: string | null
  notes: string | null
  createdAt: string | null
}

export default function GiveawayWinners() {
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch("/api/users/giveaway-winners")
      .then((r) => (r.ok ? r.json() : { winners: [] }))
      .then((d) => setWinners(Array.isArray(d.winners) ? d.winners : []))
      .catch(() => setWinners([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  // Group winners by giveaway → prize (stable order from the API).
  const grouped = useMemo(() => {
    const byGiveaway = new Map<number, { title: string; winners: Winner[] }>()
    for (const w of winners) {
      const g = byGiveaway.get(w.giveawayId) ?? { title: w.giveawayTitle, winners: [] }
      g.winners.push(w)
      byGiveaway.set(w.giveawayId, g)
    }
    return Array.from(byGiveaway.entries()).map(([id, g]) => ({ id, ...g }))
  }, [winners])

  const patchWinner = (id: number, patch: Partial<Winner>) =>
    setWinners((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)))

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    )
  }

  const deliveredCount = winners.filter((w) => w.delivered).length

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Winners &amp; delivery</h2>
        <p className="mt-1 text-sm text-white/50">
          Mark each prize as delivered once you&apos;ve handed it over, and jot a note of what/how.
          This records who got what so nobody can double-claim. Check the winner is still in your
          Discord before you tick it &mdash; that part is on you.
        </p>
      </div>

      {winners.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center">
          <Gift className="mx-auto h-10 w-10 text-white/20" />
          <p className="mt-3 text-sm text-white/55">
            No winners yet. Once one of your giveaways ends and winners are drawn, they&apos;ll
            appear here for you to deliver and track.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex items-center gap-2 text-xs font-medium text-white/50">
            <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
              {winners.length} winner{winners.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-lg border border-green-500/25 bg-green-500/[0.06] px-2.5 py-1 text-green-300">
              {deliveredCount} delivered
            </span>
          </div>

          <div className="space-y-6">
            {grouped.map((g) => (
              <div
                key={g.id}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
              >
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/80">
                  <Gift className="h-4 w-4 text-orange-400" />
                  <span className="truncate">{g.title}</span>
                </div>

                <div className="space-y-3">
                  {g.winners.map((w) => (
                    <WinnerRow key={w.id} winner={w} onPatch={patchWinner} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function WinnerRow({
  winner,
  onPatch,
}: {
  winner: Winner
  onPatch: (id: number, patch: Partial<Winner>) => void
}) {
  const [notes, setNotes] = useState(winner.notes ?? "")
  const [saving, setSaving] = useState(false)

  const dirty = notes !== (winner.notes ?? "")

  const save = async (nextDelivered: boolean, nextNotes: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/giveaways/winners/${winner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivered: nextDelivered, notes: nextNotes }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Could not save")
      }
      onPatch(winner.id, {
        delivered: nextDelivered,
        notes: nextNotes,
        deliveredAt: nextDelivered ? winner.deliveredAt ?? new Date().toISOString() : null,
      })
      toast.success(nextDelivered ? "Marked delivered" : "Saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-orange-400/90">
            <Trophy className="h-3.5 w-3.5" />
            {winner.prizeName}
          </div>
          <p className="mt-1 truncate font-semibold text-white">
            {winner.userName || winner.userId}
          </p>
          {winner.userEmail && (
            <p className="truncate text-xs text-white/45">{winner.userEmail}</p>
          )}
          {winner.delivered && winner.deliveredAt && (
            <p className="mt-1 text-[11px] text-green-400/80">
              Delivered {new Date(winner.deliveredAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => save(!winner.delivered, notes)}
          disabled={saving}
          className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-bold transition disabled:opacity-60 ${
            winner.delivered
              ? "bg-green-500/15 text-green-300 ring-1 ring-green-500/30 hover:bg-green-500/20"
              : "bg-white/[0.05] text-white/70 ring-1 ring-white/10 hover:bg-white/[0.08]"
          }`}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : winner.delivered ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
          {winner.delivered ? "Delivered" : "Mark delivered"}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Delivery notes
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What you sent, transfer id, handle…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />
        </div>
        <button
          type="button"
          onClick={() => save(winner.delivered, notes)}
          disabled={saving || !dirty}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>
    </div>
  )
}
