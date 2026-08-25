"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Tag, Save, RotateCcw, Megaphone, Star, PanelsTopLeft } from "lucide-react"

type PriceItem = {
  key: string
  packageType: string
  packageId: string
  duration: number
  unit: string
  label: string
  price: number
  defaultPrice: number | null
  isOverridden: boolean
}

/**
 * Admin → "Pricing": what FiveCrux charges for ad slots, featured-script slots
 * and side banners.
 *
 * These were read live from Tebex, then hardcoded when Tebex was removed. This
 * is what puts them back under admin control — a change here takes effect on
 * the site immediately, with no deploy.
 */

const GROUPS = [
  { type: "ads", title: "Advertisement slots", icon: Megaphone, unit: "month" },
  { type: "featured-scripts", title: "Featured-script slots", icon: Star, unit: "week" },
  { type: "sidebanner", title: "Side banners", icon: PanelsTopLeft, unit: "week" },
] as const

export default function PricingManager() {
  const [items, setItems] = useState<PriceItem[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [currency, setCurrency] = useState("EUR")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // One group at a time — stacking all three made a long scroll where a change
  // at the bottom was far from the save bar.
  const [active, setActive] = useState<(typeof GROUPS)[number]["type"]>("ads")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pricing")
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Could not load prices")
      setItems(data.items || [])
      setCurrency(data.currency || "EUR")
      setDraft({})
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load prices")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Only send what actually changed, so an unrelated row is never rewritten.
  const changed = useMemo(
    () =>
      Object.entries(draft).filter(([key, v]) => {
        const item = items.find((i) => i.key === key)
        return item && v.trim() !== "" && Number(v) !== item.price
      }),
    [draft, items]
  )

  const save = async () => {
    if (changed.length === 0) return
    setSaving(true)
    try {
      const prices = Object.fromEntries(changed.map(([k, v]) => [k, Number(v)]))
      const res = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Could not save")
      toast.success(`${data.updated} price${data.updated === 1 ? "" : "s"} updated`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading prices…
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5">
        <div className="mb-1 flex items-center gap-2">
          <Tag className="h-[18px] w-[18px] text-orange-400" />
          <h3 className="text-base font-bold">Pricing</h3>
        </div>
        <p className="text-sm leading-relaxed text-white/55">
          What FiveCrux charges for its own placements. A change here applies to
          the next checkout immediately — no deploy needed. All prices in{" "}
          <span className="font-mono">{currency}</span>.
        </p>
      </div>

      {/* Group pills */}
      <div className="flex flex-wrap gap-2">
        {GROUPS.map(({ type, title, icon: Icon }) => {
          const count = items.filter((i) => i.packageType === type).length
          const dirty = changed.filter(([k]) => k.startsWith(`${type}:`)).length
          const on = active === type
          return (
            <button
              key={type}
              onClick={() => setActive(type)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                on
                  ? "border-orange-500 bg-orange-500 text-black"
                  : "border-white/[0.12] bg-[#121212] text-white/70 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {title}
              <span className={`font-mono text-[11px] ${on ? "text-black/60" : "text-white/35"}`}>
                {count}
              </span>
              {/* An unsaved change in a group you are not looking at is easy to
                  lose track of, so it is flagged on the pill. */}
              {dirty > 0 && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${on ? "bg-black/70" : "bg-orange-400"}`}
                  title={`${dirty} unsaved`}
                />
              )}
            </button>
          )
        })}
      </div>

      {GROUPS.filter((g) => g.type === active).map(({ type, title, icon: Icon, unit }) => {
        const rows = items
          .filter((i) => i.packageType === type)
          .sort(
            (a, b) =>
              a.packageId.localeCompare(b.packageId) || a.duration - b.duration
          )
        if (rows.length === 0) return null

        return (
          <div
            key={type}
            className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121212]"
          >
            <div className="flex items-center gap-2 border-b border-white/[0.08] px-5 py-3.5">
              <Icon className="h-4 w-4 text-white/45" />
              <h4 className="text-sm font-bold">{title}</h4>
              <span className="ml-auto font-mono text-[11px] text-white/35">
                per {unit}
              </span>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {rows.map((item) => {
                const value = draft[item.key] ?? String(item.price)
                const isDirty =
                  draft[item.key] !== undefined && Number(value) !== item.price
                return (
                  <div
                    key={item.key}
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <div className="min-w-[190px] flex-1">
                      <p className="text-sm font-semibold capitalize">
                        {item.packageId === "slot" ? "Any position" : item.packageId}
                      </p>
                      <p className="font-mono text-[11px] text-white/35">
                        {item.label}
                        {item.isOverridden && item.defaultPrice != null && (
                          <span className="ml-2 text-orange-400/70">
                            was {item.defaultPrice}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-white/40">
                        {currency === "EUR" ? "€" : currency}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={value}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [item.key]: e.target.value }))
                        }
                        aria-label={`Price for ${item.key}`}
                        className={`w-28 rounded-xl border bg-[#161616] px-3 py-2 text-right font-mono text-sm text-white outline-none transition ${
                          isDirty
                            ? "border-orange-500/60"
                            : "border-white/[0.12] focus:border-orange-500/50"
                        }`}
                      />
                      {item.isOverridden && item.defaultPrice != null && (
                        <button
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              [item.key]: String(item.defaultPrice),
                            }))
                          }
                          title={`Reset to default (${item.defaultPrice})`}
                          className="rounded-lg border border-white/[0.12] p-2 text-white/45 transition hover:text-white"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Sticky so a change made at the bottom of a long list is still savable. */}
      {changed.length > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl border border-orange-500/30 bg-[#161616] px-5 py-3.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]">
          <span className="text-sm text-white/70">
            {changed.length} price{changed.length === 1 ? "" : "s"} changed
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDraft({})}
              disabled={saving}
              className="rounded-xl border border-white/[0.14] px-4 py-2 text-sm font-semibold text-white/75 transition hover:text-white disabled:opacity-50"
            >
              Discard
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
