"use client"

import { useEffect, useState } from "react"
import { Loader2, Eye, ShoppingBag, Users, Gift, RefreshCw, TrendingUp, Info } from "lucide-react"

type Analytics = {
  sales: { count: number; revenue: number; buyers: number; currency: string }
  traffic: { total: number; scriptViews: number; propViews: number; ads: { views: number; clicks: number }; featured: { views: number; clicks: number } }
  topByViews: { type: string; id: string; name: string; views: number }[]
  topBySales: { id: string; name: string; count: number; revenue: number }[]
  giveaways: { count: number; entries: number; participants: number; winners: number; delivered: number }
  subscriptions: { sideBanners: number; adSlots: number; featuredSlots: number; active: number; nextRenewal: string | null }
  listings: { scripts: number; props: number; pendingScripts: number; pendingProps: number }
}

// Profile → "Analytics": a creator's own performance, built ONLY from data
// FiveCrux actually records (sales via the platform cart, listing/ad views,
// giveaway engagement). Script revenue is intentionally absent — those sales
// happen on the seller's own Tebex store, which FiveCrux can't see.
export default function CreatorAnalytics() {
  const [a, setA] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/users/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setA(d?.analytics ?? null))
      .catch(() => setA(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
  }
  if (!a) {
    return <p className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-sm text-white/50">Couldn&apos;t load analytics right now.</p>
  }

  const money = (n: number) => `€${Number(n).toFixed(2)}`
  const fmt = (n: number) => n.toLocaleString()
  const renewal = a.subscriptions.nextRenewal ? new Date(a.subscriptions.nextRenewal).toLocaleDateString() : "—"

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Analytics</h2>
        <p className="mt-1 text-sm text-white/50">Your performance on FiveCrux — real recorded numbers only.</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile icon={<Eye className="h-4 w-4" />} label="Total views" value={fmt(a.traffic.total)} sub="scripts · props · ads" />
        <Tile icon={<ShoppingBag className="h-4 w-4" />} label="Sales" value={fmt(a.sales.count)} sub={`${money(a.sales.revenue)} revenue`} accent />
        <Tile icon={<Users className="h-4 w-4" />} label="Buyers" value={fmt(a.sales.buyers)} sub="unique" />
        <Tile icon={<Gift className="h-4 w-4" />} label="Giveaway entries" value={fmt(a.giveaways.entries)} sub={`${fmt(a.giveaways.participants)} people`} />
        <Tile icon={<RefreshCw className="h-4 w-4" />} label="Subscriptions" value={fmt(a.subscriptions.active)} sub={a.subscriptions.active ? `renews ${renewal}` : "none active"} />
      </div>

      {/* Traffic breakdown */}
      <Section title="Traffic">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Metric label="Script views" value={fmt(a.traffic.scriptViews)} />
          <Metric label="Prop views" value={fmt(a.traffic.propViews)} />
          <Metric label="Ad views" value={fmt(a.traffic.ads.views)} extra={`${fmt(a.traffic.ads.clicks)} clicks`} />
          <Metric label="Featured views" value={fmt(a.traffic.featured.views)} extra={`${fmt(a.traffic.featured.clicks)} clicks`} />
        </div>
      </Section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Top by views */}
        <Section title="Top listings — by views">
          {a.topByViews.length === 0 || a.traffic.total === 0 ? (
            <Empty>No views tracked yet.</Empty>
          ) : (
            <RankedList
              items={a.topByViews.map((t) => ({ name: t.name, tag: t.type, value: t.views, label: `${fmt(t.views)} views` }))}
            />
          )}
        </Section>

        {/* Top by sales */}
        <Section title="Top sellers — by revenue">
          {a.topBySales.length === 0 ? (
            <Empty>No sales recorded yet.</Empty>
          ) : (
            <RankedList
              items={a.topBySales.map((t) => ({ name: t.name, tag: "prop", value: t.revenue, label: `${money(t.revenue)} · ${fmt(t.count)} sold` }))}
            />
          )}
        </Section>
      </div>

      {/* Giveaway + listings summary */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Giveaways">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Metric label="Giveaways" value={fmt(a.giveaways.count)} />
            <Metric label="Entries" value={fmt(a.giveaways.entries)} />
            <Metric label="Winners" value={fmt(a.giveaways.winners)} />
            <Metric label="Delivered" value={`${fmt(a.giveaways.delivered)}/${fmt(a.giveaways.winners)}`} />
          </div>
        </Section>
        <Section title="Listings">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Metric label="Scripts" value={fmt(a.listings.scripts)} extra={a.listings.pendingScripts ? `${a.listings.pendingScripts} pending` : undefined} />
            <Metric label="Props" value={fmt(a.listings.props)} extra={a.listings.pendingProps ? `${a.listings.pendingProps} pending` : undefined} />
            <Metric label="Subs (banner)" value={fmt(a.subscriptions.sideBanners)} />
            <Metric label="Subs (featured)" value={fmt(a.subscriptions.featuredSlots)} />
          </div>
        </Section>
      </div>

      {/* Honest note */}
      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 text-xs leading-relaxed text-white/45">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
        <span>
          <b className="text-white/60">Script sales aren&apos;t shown here</b> — scripts are sold directly on your own Tebex store, which FiveCrux doesn&apos;t have access to. Sales/revenue above cover platform purchases (props &amp; slots). Listing views are counted from now onward.
        </span>
      </div>
    </div>
  )
}

function Tile({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-orange-500/25 bg-orange-500/[0.06]" : "border-white/[0.08] bg-white/[0.03]"}`}>
      <div className={`mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide ${accent ? "text-orange-300/80" : "text-white/45"}`}>
        {icon}{label}
      </div>
      <div className="font-mono text-2xl font-bold tabular-nums text-white">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-white/40">{sub}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
        <TrendingUp className="h-3.5 w-3.5 text-orange-400/70" />{title}
      </h3>
      {children}
    </div>
  )
}

function Metric({ label, value, extra }: { label: string; value: string; extra?: string }) {
  return (
    <div>
      <div className="font-mono text-lg font-bold tabular-nums text-white">{value}</div>
      <div className="text-[11px] text-white/45">{label}</div>
      {extra && <div className="text-[10px] text-orange-400/70">{extra}</div>}
    </div>
  )
}

function RankedList({ items }: { items: { name: string; tag: string; value: number; label: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => (
        <div key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium text-white/85">
              <span className="mr-1.5 font-mono text-[11px] text-white/30">{i + 1}</span>{it.name}
              <span className="ml-1.5 rounded border border-white/10 px-1 py-px text-[9px] uppercase text-white/35">{it.tag}</span>
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-white/55">{it.label}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-500/60 to-orange-400" style={{ width: `${Math.max(6, (it.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-sm text-white/35">{children}</p>
}
