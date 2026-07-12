"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Loader2,
  Store,
  Check,
  PlugZap,
  Unplug,
  PackageCheck,
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
  Hash,
  Plus,
  X,
  ClipboardList,
} from "lucide-react"

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
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
      {/* Header: shop icon + title + status pill */}
      <div className="flex items-start gap-4 border-b border-white/[0.06] bg-white/[0.02] p-6">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-500/10 ring-1 ring-orange-500/25">
          <ShoppingBag className="h-6 w-6 text-orange-400" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-white">Tebex Store</h3>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-white/55">
              <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
              Not connected
            </span>
          </div>
          <p className="mt-0.5 text-sm text-white/45">Professional storefront integration</p>
        </div>
      </div>

      <div className="p-6">
        {/* Why connect */}
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-orange-500/20 bg-orange-500/[0.06] px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
          <p className="text-xs leading-relaxed text-white/70">
            Connecting your Tebex store is required to sell FiveM content on FiveCrux. It keeps your
            listings, prices and Buy Now links in sync with your storefront automatically.
          </p>
        </div>

        <label
          htmlFor="tebex-public-token"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50"
        >
          Tebex Public Token
        </label>
        <input
          id="tebex-public-token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="tbx_••••••••"
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-orange-500/50"
        />
        <p className="mt-2 text-xs text-white/40">
          You can find this in your Tebex Dashboard → Integrations → API Keys → Public Token.
        </p>

        <button
          onClick={connect}
          disabled={busy}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-60 sm:w-auto"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
          Save &amp; Connect Store
        </button>
      </div>
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
  const [packageIdInput, setPackageIdInput] = useState("")
  const [importingOne, setImportingOne] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Review-before-submit modal: holds the package(s) about to be sent to admin
  // approval, and which underlying import call to fire once the user confirms.
  const [review, setReview] = useState<{ packages: TebexPackage[]; onConfirm: () => void } | null>(
    null
  )

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

  // Fetch a single package's details (no import yet) so it can be shown in the
  // review-before-submit modal, then hand off to runImportOne on confirm.
  const openSinglePreview = async () => {
    const id = Number(packageIdInput.trim())
    if (!packageIdInput.trim() || !Number.isFinite(id)) {
      toast.error("Enter a valid Tebex package id.")
      return
    }
    setLoadingPreview(true)
    try {
      const res = await fetch(`/api/tebex/store/import?packageId=${id}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Could not find that package.")
      setReview({ packages: [d.package], onConfirm: runImportOne })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not find that package.")
    } finally {
      setLoadingPreview(false)
    }
  }

  // Import ONE specific package by id — works even for packages that aren't in
  // the paginated list above (the API falls back to getPackage(token, id)).
  const runImportOne = async () => {
    const id = Number(packageIdInput.trim())
    if (!packageIdInput.trim() || !Number.isFinite(id)) {
      toast.error("Enter a valid Tebex package id.")
      return
    }
    setImportingOne(true)
    try {
      const res = await fetch("/api/tebex/store/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: id }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Import failed")
      if (d.created > 0) {
        toast.success("Package imported — pending review.")
        setPackageIdInput("")
        onChanged()
      } else {
        toast.error("Nothing imported — the id may be invalid or already imported.")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed")
    } finally {
      setImportingOne(false)
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
            onClick={() =>
              setReview({
                packages: importable,
                onConfirm: () => runImport(importable.map((p) => p.id)),
              })
            }
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

      {/* Import by package ID */}
      <div className="mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
          <Hash className="h-4 w-4 text-orange-400" />
          Import by package ID
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={packageIdInput}
            onChange={(e) => setPackageIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loadingPreview) openSinglePreview()
            }}
            inputMode="numeric"
            placeholder="e.g. 5829104"
            className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm tabular-nums text-white outline-none transition focus:border-orange-500/50"
          />
          <button
            onClick={openSinglePreview}
            disabled={loadingPreview || importingOne}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-60"
          >
            {loadingPreview || importingOne ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Import
          </button>
        </div>
        <p className="mt-2 text-xs text-white/40">
          Paste a single Tebex package id to import it as a listing — even if it isn&apos;t shown in
          the list below.
        </p>
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
                onClick={() => {
                  const ids = Array.from(selected)
                  setReview({
                    packages: state.packages.filter((p) => selected.has(p.id)),
                    onConfirm: () => runImport(ids),
                  })
                }}
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
            Imported listings land in your <span className="text-white/60">Assets</span> tab as pending — an admin
            reviews them before they go live. You can edit category, framework and media there.
          </p>
        </>
      )}

      {review && (
        <ImportReviewModal
          packages={review.packages}
          money={money}
          onCancel={() => setReview(null)}
          onConfirm={() => {
            review.onConfirm()
            setReview(null)
          }}
        />
      )}
    </div>
  )
}

// Shows exactly what's about to be submitted for admin approval before the
// import actually fires — title/price/category/description/image per package.
function ImportReviewModal({
  packages,
  money,
  onCancel,
  onConfirm,
}: {
  packages: TebexPackage[]
  money: (p: TebexPackage) => string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0d0d0d] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/10 ring-1 ring-orange-500/25">
              <ClipboardList className="h-5 w-5 text-orange-400" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                Submit for admin approval?
              </h3>
              <p className="mt-0.5 text-xs text-white/45">
                {packages.length} listing{packages.length === 1 ? "" : "s"} will be created as
                pending — review before it&apos;s sent.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="shrink-0 rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[50vh] space-y-2.5 overflow-y-auto p-5">
          {packages.map((p) => (
            <div
              key={p.id}
              className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0e0e0f]">
                {p.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-white/20">
                    <Store className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                <p className="mt-0.5 text-xs text-white/50">
                  {money(p)}
                  {p.category?.name ? ` · ${p.category.name}` : ""}
                </p>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-white/40">
                    {p.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] p-5">
          <button
            onClick={onCancel}
            className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400"
          >
            <PackageCheck className="h-4 w-4" />
            Confirm &amp; Submit
          </button>
        </div>
      </div>
    </div>
  )
}
