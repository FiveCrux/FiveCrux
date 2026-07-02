"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, ShieldCheck, Clock, XCircle } from "lucide-react"

import { VerifiedIcon } from "@/componentss/shared/verified-icon"

type VReq = {
  id: number
  status: "pending" | "approved" | "rejected"
  reason: string | null
  links: string | null
  discord: string | null
  adminReason: string | null
  createdAt: string | null
  reviewedAt: string | null
} | null

// Profile → "Get Verified": creators apply for the verified badge here. They see
// their live status (pending / approved / rejected-with-reason) and can re-apply
// after a rejection. Approval grants the verified_creator role (admin side).
export default function GetVerified() {
  const [data, setData] = useState<{ request: VReq; isVerified: boolean } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch("/api/verification")
      .then((r) => (r.ok ? r.json() : { request: null, isVerified: false }))
      .then((d) => setData({ request: d.request ?? null, isVerified: !!d.isVerified }))
      .catch(() => setData({ request: null, isVerified: false }))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    )
  }

  const req = data?.request ?? null
  const isVerified = data?.isVerified ?? false
  const pending = !isVerified && req?.status === "pending"
  const rejected = !isVerified && req?.status === "rejected"
  const canApply = !isVerified && !pending // no request, or previously rejected

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Get Verified</h2>
        <p className="mt-1 text-sm text-white/50">
          The verified badge shows buyers you&apos;re a trusted creator. Tell us about your work and
          our team will review your request.
        </p>
      </div>

      {/* ── Already verified ───────────────────────────────────────── */}
      {isVerified && (
        <div className="rounded-2xl border border-sky-500/25 bg-sky-500/[0.06] p-6">
          <div className="flex items-center gap-3">
            <VerifiedIcon className="h-7 w-7" />
            <div>
              <p className="font-bold text-white">You&apos;re a verified creator</p>
              <p className="mt-0.5 text-sm text-white/55">
                The badge now appears next to your name across the marketplace.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Pending review ─────────────────────────────────────────── */}
      {pending && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-300">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-white">Request under review</p>
              <p className="mt-0.5 text-sm text-white/55">
                Submitted {req?.createdAt ? new Date(req.createdAt).toLocaleDateString() : "recently"}.
                We&apos;ll update your status here once it&apos;s reviewed.
              </p>
            </div>
          </div>
          {req?.reason && (
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-white/60">
              <span className="text-white/40">Your note: </span>
              {req.reason}
            </div>
          )}
        </div>
      )}

      {/* ── Rejected — show reason + let them re-apply ─────────────── */}
      {rejected && (
        <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/15 text-red-300">
              <XCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-white">Previous request wasn&apos;t approved</p>
              {req?.adminReason && (
                <p className="mt-0.5 text-sm text-white/55">
                  <span className="text-white/40">Reason: </span>
                  {req.adminReason}
                </p>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm text-white/50">You can address the feedback and apply again below.</p>
        </div>
      )}

      {/* ── Application form ───────────────────────────────────────── */}
      {canApply && <ApplyForm onSubmitted={load} />}
    </div>
  )
}

function ApplyForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [reason, setReason] = useState("")
  const [links, setLinks] = useState("")
  const [discord, setDiscord] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!reason.trim()) {
      toast.error("Tell us a bit about your work.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, links, discord }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Could not submit")
      }
      toast.success("Request submitted — we'll review it shortly.")
      onSubmitted()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/80">
        <ShieldCheck className="h-4 w-4 text-orange-400" />
        Apply for verification
      </div>

      <label className="mb-1.5 block text-xs font-medium text-white/50">
        About your work <span className="text-orange-400">*</span>
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={4}
        placeholder="What do you make, how long you've been creating for FiveM, notable releases…"
        className="mb-4 w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-orange-500/50"
      />

      <label className="mb-1.5 block text-xs font-medium text-white/50">Links (portfolio, store, socials)</label>
      <input
        value={links}
        onChange={(e) => setLinks(e.target.value)}
        placeholder="https://…"
        className="mb-4 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-orange-500/50"
      />

      <label className="mb-1.5 block text-xs font-medium text-white/50">Discord handle</label>
      <input
        value={discord}
        onChange={(e) => setDiscord(e.target.value)}
        placeholder="yourname#0000 or @yourname"
        className="mb-5 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-orange-500/50"
      />

      <button
        onClick={submit}
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Submit request
      </button>
    </div>
  )
}
