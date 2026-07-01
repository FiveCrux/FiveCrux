"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Store, Check, PlugZap, Unplug, PackageCheck, ArrowRight } from "lucide-react"

type TebexPackage = {
  id: number
  name: string
  description: string | null
  image: string | null
  total_price: number
  base_price: number
  currency: string
  category?: { id: number; name: string } | null
}

type StoreState = {
  connected: boolean
  packages: TebexPackage[]
  importedPackageIds: string[]
  error?: string
}

// Profile → "Tebex Store": connect your own Tebex webstore once, then import
// your packages as FiveCrux listings (pre-filled + auto-linked for Buy Now).
export default function TebexStoreImporter() {
  const [state, setState] = useState<StoreState | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch("/api/tebex/store")
      .then((r) => (r.ok ? r.json() : { connected: false, packages: [], importedPackageIds: [] }))
      .then((d) => setState(d))
      .catch(() => setState({ connected: false, packages: [], importedPackageIds: [] }))
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

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Tebex Store</h2>
          <p className="mt-1 text-sm text-white/50">
            Connect your Tebex webstore once, then import your packages as listings — price,
            description and image come across automatically, and Buy Now is wired to your store.
          </p>
        </div>
      </div>

      {!state?.connected ? (
        <ConnectCard onConnected={setState} />
      ) : (
        <ConnectedView state={state} onChanged={load} onState={setState} />
      )}
    </div>
  )
}

function ConnectCard({ onConnected }: { onConnected: (s: StoreState) => void }) {
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState(false)

  const connect = async () => {
    if (!token.trim()) {
      toast.error("Paste your Tebex store token.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/tebex/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeToken: token.trim() }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Could not connect")
      toast.success(`Connected — found ${d.packages?.length ?? 0} package${d.packages?.length === 1 ? "" : "s"}.`)
      onConnected(d)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not connect")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/80">
        <PlugZap className="h-4 w-4 text-orange-400" />
        Connect your store
      </div>
      <label className="mb-1.5 block text-xs font-medium text-white/50">Tebex store token</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="tbx_••••••••"
          className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-orange-500/50"
        />
        <button
          onClick={connect}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
          Connect
        </button>
      </div>
      <p className="mt-3 text-xs text-white/40">
        Find it in your Tebex Creator Panel → your webstore → Headless / public token.
      </p>
    </div>
  )
}

function ConnectedView({
  state,
  onChanged,
  onState,
}: {
  state: StoreState
  onChanged: () => void
  onState: (s: StoreState) => void
}) {
  const imported = useMemo(() => new Set(state.importedPackageIds || []), [state.importedPackageIds])
  const importable = useMemo(
    () => state.packages.filter((p) => !imported.has(String(p.id))),
    [state.packages, imported]
  )
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const runImport = async (ids: number[]) => {
    if (ids.length === 0) {
      toast.error("Nothing selected to import.")
      return
    }
    setImporting(true)
    try {
      const res = await fetch("/api/tebex/store/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageIds: ids }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Import failed")
      toast.success(
        `${d.created} listing${d.created === 1 ? "" : "s"} imported — pending review.` +
          (d.skipped ? ` (${d.skipped} skipped)` : "")
      )
      setSelected(new Set())
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const disconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/tebex/store", { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast.success("Tebex store disconnected.")
      onState({ connected: false, packages: [], importedPackageIds: [] })
    } catch {
      toast.error("Could not disconnect.")
    } finally {
      setDisconnecting(false)
    }
  }

  const money = (p: TebexPackage) => {
    const v = Number(p.total_price ?? p.base_price ?? 0)
    return v === 0 ? "Free" : `${v.toFixed(2)} ${p.currency || ""}`.trim()
  }

  return (
    <div>
      {/* toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <Check className="h-4 w-4" /> Store connected
        </span>
        <span className="text-sm text-white/45">
          {state.packages.length} package{state.packages.length === 1 ? "" : "s"} · {imported.size} imported
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => runImport(importable.map((p) => p.id))}
            disabled={importing || importable.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
            Import all ({importable.length})
          </button>
          <button
            onClick={disconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-transparent px-3 py-2 text-sm font-medium text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
            Disconnect
          </button>
        </div>
      </div>

      {state.error && (
        <p className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-sm text-amber-200">
          {state.error}
        </p>
      )}

      {state.packages.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-14 text-center">
          <Store className="mx-auto mb-3 h-8 w-8 text-white/25" />
          <p className="font-semibold text-white">No packages in this store yet</p>
          <p className="mt-1 text-sm text-white/45">Add packages in your Tebex panel, then refresh.</p>
        </div>
      ) : (
        <>
          {selected.size > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5">
              <span className="text-sm text-white/70">{selected.size} selected</span>
              <button
                onClick={() => runImport(Array.from(selected))}
                disabled={importing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
              >
                Import selected <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {state.packages.map((p) => {
              const isImported = imported.has(String(p.id))
              const isSelected = selected.has(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isImported}
                  onClick={() => toggle(p.id)}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                    isImported
                      ? "cursor-default border-white/[0.06] bg-white/[0.02] opacity-60"
                      : isSelected
                      ? "border-orange-500/50 bg-orange-500/[0.06]"
                      : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0e0e0f]">
                    {p.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-white/20">
                        <Store className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                    <p className="mt-0.5 text-xs text-white/45">
                      {money(p)}
                      {p.category?.name ? ` · ${p.category.name}` : ""}
                    </p>
                  </div>
                  {isImported ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                      <Check className="h-3 w-3" /> Imported
                    </span>
                  ) : (
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                        isSelected ? "border-orange-500 bg-orange-500 text-black" : "border-white/20"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <p className="mt-5 text-xs text-white/40">
            Imported listings land in your <span className="text-white/60">Scripts</span> tab as pending — an admin
            reviews them before they go live. You can edit category, framework and media there.
          </p>
        </>
      )}
    </div>
  )
}
