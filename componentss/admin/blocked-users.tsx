"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, ShieldAlert, Search, Undo2, Ban, Clock } from "lucide-react"

type BlockedUser = {
  id: string
  name: string | null
  username: string | null
  email: string | null
  isBlocked: boolean
  blockedReason: string | null
  blockedSource: string | null
  blockedAt: string | null
  blockedBy: string | null
}

/**
 * Admin → "Blacklist": accounts blocked for chargeback fraud.
 *
 * A reversal blocks automatically; this is where staff see who was caught, and
 * can block or clear someone by hand. A block is read-only, not a ban — the
 * account can still sign in and browse, it just cannot buy, submit or enter
 * anything.
 */
export default function BlockedUsers({
  onCountChange,
}: {
  onCountChange?: (n: number) => void
}) {
  const [items, setItems] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [manualId, setManualId] = useState("")
  const [manualReason, setManualReason] = useState("")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/blocked-users")
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Could not load the blacklist")
      const list: BlockedUser[] = data.users || []
      setItems(list)
      onCountChange?.(list.length)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the blacklist")
    } finally {
      setLoading(false)
    }
  }, [onCountChange])

  useEffect(() => {
    load()
  }, [load])

  const setBlocked = async (userId: string, blocked: boolean, reason?: string) => {
    setBusyId(userId)
    try {
      const res = await fetch("/api/admin/blocked-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, blocked, reason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Could not update the account")
      toast.success(blocked ? "Account blocked" : "Account unblocked")
      if (blocked) {
        setManualId("")
        setManualReason("")
      }
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the account")
    } finally {
      setBusyId(null)
    }
  }

  const when = (v: string | null) =>
    v ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5">
        <div className="mb-1 flex items-center gap-2">
          <ShieldAlert className="h-[18px] w-[18px] text-orange-400" />
          <h3 className="text-base font-bold">Blacklist</h3>
        </div>
        <p className="text-sm leading-relaxed text-white/55">
          Accounts blocked after a payment reversal, plus anyone blocked by hand.
          A blocked account can still sign in and browse — it cannot buy, submit
          or enter anything. Chargebacks block automatically.
        </p>
      </div>

      {/* Block by hand */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white/50">
          Block an account
        </h4>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="User ID (Discord id)"
              aria-label="User ID to block"
              className="w-full rounded-xl border border-white/[0.12] bg-[#161616] py-2.5 pl-9 pr-3 text-sm text-white outline-none transition focus:border-orange-500/50 placeholder:text-white/30"
            />
          </div>
          <input
            value={manualReason}
            onChange={(e) => setManualReason(e.target.value)}
            placeholder="Reason (shown to them)"
            aria-label="Reason"
            className="flex-1 rounded-xl border border-white/[0.12] bg-[#161616] px-3 py-2.5 text-sm text-white outline-none transition focus:border-orange-500/50 placeholder:text-white/30"
          />
          <button
            onClick={() => setBlocked(manualId.trim(), true, manualReason.trim() || undefined)}
            disabled={!manualId.trim() || busyId !== null}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Ban className="h-4 w-4" />
            Block
          </button>
        </div>
        <p className="mt-2 text-xs text-white/40">
          Staff accounts cannot be blocked — change their role instead.
        </p>
      </div>

      {/* The list */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-14 text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#121212] py-14 text-center">
          <ShieldAlert className="mx-auto mb-3 h-7 w-7 text-white/20" />
          <p className="text-sm font-semibold text-white/70">Nobody is blocked</p>
          <p className="mt-1 text-xs text-white/40">
            Accounts appear here automatically when a payment is reversed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((u) => (
            <div
              key={u.id}
              className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{u.name || u.username || "Unknown"}</span>
                    {u.username && (
                      <span className="text-sm text-white/45">@{u.username}</span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
                        u.blockedSource === "chargeback"
                          ? "bg-red-500/15 text-red-300"
                          : "bg-white/[0.06] text-white/55"
                      }`}
                    >
                      {u.blockedSource === "chargeback" ? "Chargeback" : "Manual"}
                    </span>
                  </div>

                  <p className="mt-1.5 font-mono text-xs text-white/40">{u.id}</p>
                  {u.email && <p className="text-xs text-white/40">{u.email}</p>}

                  {u.blockedReason && (
                    <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/70">
                      {u.blockedReason}
                    </p>
                  )}

                  <p className="mt-2 flex items-center gap-1.5 text-xs text-white/35">
                    <Clock className="h-3 w-3" />
                    {when(u.blockedAt)}
                    {u.blockedBy && u.blockedBy !== "system" && ` · by ${u.blockedBy}`}
                  </p>
                </div>

                <button
                  onClick={() => setBlocked(u.id, false)}
                  disabled={busyId === u.id}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.14] px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:text-white disabled:opacity-50"
                >
                  {busyId === u.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Undo2 className="h-4 w-4" />
                  )}
                  Unblock
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
