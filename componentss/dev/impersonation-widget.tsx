"use client"

// TODO: remove before production — floating dev widget to switch the impersonated
// role/user. Only renders when NEXT_PUBLIC_MOCK_AUTH=true.
import { useEffect, useState } from "react"
import { IMPERSONATION_PRESETS, getActiveImpersonationKey, setActiveImpersonationKey } from "@/lib/dev-impersonation"

const MOCK_AUTH = process.env.NEXT_PUBLIC_MOCK_AUTH === "true"

export default function ImpersonationWidget() {
  const [open, setOpen] = useState(false)
  const [activeKey, setKey] = useState("admin")

  // Read the persisted choice on mount (avoids SSR/client hydration mismatch).
  useEffect(() => {
    setKey(getActiveImpersonationKey())
  }, [])

  if (!MOCK_AUTH) return null

  const active = IMPERSONATION_PRESETS.find((p) => p.key === activeKey) ?? IMPERSONATION_PRESETS[0]

  const pick = (key: string) => {
    setActiveImpersonationKey(key)
    window.location.reload()
  }

  return (
    <div className="fixed bottom-4 left-4 z-[300] text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
      {open && (
        <div className="mb-2 w-64 overflow-hidden rounded-2xl border border-white/12 bg-[#0e0e0e] p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]">
          <div className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Impersonate · dev only
          </div>
          {IMPERSONATION_PRESETS.map((p) => {
            const isActive = p.key === activeKey
            return (
              <button
                key={p.key}
                onClick={() => pick(p.key)}
                className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/[0.06] ${isActive ? "text-orange-400" : "text-white/85"}`}
              >
                <span className={`mt-0.5 text-xs ${isActive ? "text-orange-400" : "text-white/30"}`}>{isActive ? "●" : "○"}</span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-tight">{p.label}</span>
                  <span className="block text-xs leading-tight text-white/40">{p.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-orange-500/40 bg-[#0e0e0e]/95 px-3.5 py-2 font-semibold text-orange-400 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)] backdrop-blur"
      >
        <span>🎭</span>
        <span className="text-white/55">as</span>
        <span>{active.label}</span>
        <span className="text-white/30">{open ? "▾" : "▴"}</span>
      </button>
    </div>
  )
}
