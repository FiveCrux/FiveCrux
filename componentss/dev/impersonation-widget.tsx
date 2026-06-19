"use client"

// TODO: remove before production — floating dev widget to switch the active test
// identity. Two modes:
//   • ALLOW_DEV_LOGIN  → real next-auth signIn (issues a JWT cookie; server routes
//                         recognise it). Used with the local PGlite DB.
//   • MOCK_AUTH only   → client-only mock session (no server), legacy fallback.
import { useEffect, useState } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { IMPERSONATION_PRESETS, getActiveImpersonationKey, setActiveImpersonationKey } from "@/lib/dev-impersonation"

const MOCK_AUTH = process.env.NEXT_PUBLIC_MOCK_AUTH === "true"
const DEV_LOGIN = process.env.NEXT_PUBLIC_ALLOW_DEV_LOGIN === "true"

export default function ImpersonationWidget() {
  const [open, setOpen] = useState(false)
  const [activeKey, setKey] = useState("admin")
  const [busy, setBusy] = useState(false)
  const { data: session } = useSession()

  useEffect(() => {
    setKey(getActiveImpersonationKey())
  }, [])

  if (!MOCK_AUTH && !DEV_LOGIN) return null

  const active = IMPERSONATION_PRESETS.find((p) => p.key === activeKey) ?? IMPERSONATION_PRESETS[0]
  // In real-login mode, trust the server session for the label once it's loaded.
  const liveRoles = (session?.user as { roles?: string[] } | undefined)?.roles

  const pick = async (key: string) => {
    setActiveImpersonationKey(key)
    if (DEV_LOGIN) {
      setBusy(true)
      try {
        if (key === "guest") {
          await signOut({ redirect: false })
        } else {
          await signIn("dev-credentials", { key, redirect: false })
        }
      } finally {
        window.location.reload()
      }
      return
    }
    // Mock-only mode: just persist + reload (SessionProvider injects the mock).
    window.location.reload()
  }

  return (
    <div className="fixed bottom-4 left-4 z-[300] text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
      {open && (
        <div className="mb-2 w-64 overflow-hidden rounded-2xl border border-white/12 bg-[#0e0e0e] p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]">
          <div className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Impersonate · {DEV_LOGIN ? "real session" : "mock"} · dev only
          </div>
          {IMPERSONATION_PRESETS.map((p) => {
            const isActive = p.key === activeKey
            return (
              <button
                key={p.key}
                data-testid={`impersonate-${p.key}`}
                disabled={busy}
                onClick={() => pick(p.key)}
                className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/[0.06] disabled:opacity-50 ${isActive ? "text-orange-400" : "text-white/85"}`}
              >
                <span className={`mt-0.5 text-xs ${isActive ? "text-orange-400" : "text-white/30"}`}>{isActive ? "●" : "○"}</span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-tight">{p.label}</span>
                  <span className="block text-xs leading-tight text-white/40">{p.description}</span>
                </span>
              </button>
            )
          })}
          {DEV_LOGIN && liveRoles && (
            <div className="px-2.5 py-2 text-[10px] uppercase tracking-[0.12em] text-emerald-400/70">
              server roles: {liveRoles.length ? liveRoles.join(", ") : "user"}
            </div>
          )}
        </div>
      )}
      <button
        data-testid="impersonate-toggle"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-orange-500/40 bg-[#0e0e0e]/95 px-3.5 py-2 font-semibold text-orange-400 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)] backdrop-blur"
      >
        <span>{busy ? "⏳" : "🎭"}</span>
        <span className="text-white/55">as</span>
        <span>{active.label}</span>
        <span className="text-white/30">{open ? "▾" : "▴"}</span>
      </button>
    </div>
  )
}
