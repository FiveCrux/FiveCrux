"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, ShieldCheck, ExternalLink, Check, X, Clock } from "lucide-react"

type VRequest = {
  id: number
  userId: string
  reason: string | null
  links: string | null
  discord: string | null
  status: string
  createdAt: string | null
  userName: string | null
  userUsername: string | null
  userEmail: string | null
  userImage: string | null
}

// Admin → "Verification": the queue of pending verified-creator requests.
// Approve grants the verified_creator role; reject requires a reason (shown back
// to the applicant so they can re-apply).
export default function VerificationRequests({
  onCountChange,
}: {
  onCountChange?: (n: number) => void
}) {
  const [items, setItems] = useState<VRequest[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/verification")
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((d) => {
        const rows: VRequest[] = Array.isArray(d.requests) ? d.requests : []
        setItems(rows)
        onCountChange?.(rows.length)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [onCountChange])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white">Verification requests</h2>
        <p className="mt-1 text-sm text-white/50">
          Creators applying for the verified badge. Approving grants the{" "}
          <span className="text-white/70">verified_creator</span> role.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-16 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-white/25" />
          <p className="font-semibold text-white">No pending requests</p>
          <p className="mt-1 text-sm text-white/45">You&apos;re all caught up.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <RequestCard key={r.id} req={r} onDone={load} />
          ))}
        </div>
      )}
    </div>
  )
}

function RequestCard({ req, onDone }: { req: VRequest; onDone: () => void }) {
  const [busy, setBusy] = useState<null | "approve" | "reject">(null)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")

  const avatar = req.userImage
  const displayName = req.userName || req.userUsername || req.userEmail || "Unknown user"

  const act = async (action: "approve" | "reject", adminReason?: string) => {
    setBusy(action)
    try {
      const res = await fetch(`/api/admin/verification/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: adminReason }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Action failed")
      }
      toast.success(action === "approve" ? "Approved — badge granted." : "Request rejected.")
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar || "/placeholder-avatar.png"}
          alt=""
          className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">{displayName}</span>
            {req.userUsername && <span className="text-xs text-white/40">@{req.userUsername}</span>}
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
              <Clock className="h-3 w-3" /> Pending
            </span>
          </div>
          {req.userEmail && <p className="mt-0.5 text-xs text-white/40">{req.userEmail}</p>}

          {req.reason && (
            <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-white/70">
              {req.reason}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-white/50">
            {req.links && (
              <a
                href={/^https?:\/\//.test(req.links) ? req.links : `https://${req.links}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-orange-300 hover:text-orange-200"
              >
                <ExternalLink className="h-3.5 w-3.5" /> {req.links}
              </a>
            )}
            {req.discord && (
              <span>
                <span className="text-white/35">Discord:</span> {req.discord}
              </span>
            )}
            {req.createdAt && (
              <span>
                <span className="text-white/35">Applied:</span>{" "}
                {new Date(req.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Actions */}
          {!rejecting ? (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => act("approve")}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Approve
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                <X className="h-4 w-4" /> Reject
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Reason for rejection (shown to the applicant so they can re-apply)…"
                className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-red-500/50"
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={() => {
                    if (!reason.trim()) {
                      toast.error("Add a reason.")
                      return
                    }
                    act("reject", reason.trim())
                  }}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-400 disabled:opacity-60"
                >
                  {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Confirm reject
                </button>
                <button
                  onClick={() => {
                    setRejecting(false)
                    setReason("")
                  }}
                  disabled={busy !== null}
                  className="text-sm text-white/50 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
