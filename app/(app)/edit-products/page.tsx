"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Pencil,
  Save,
  X,
  Eye,
  Plus,
  Gift,
  Code2,
  Star,
  Search,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Card, CardContent } from "@/componentss/ui/card"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"

// This will be replaced with real user authentication/session logic
// For now, we'll get it from the session or use a placeholder
const getUserEmail = () => {
  // TODO: Get from session when authentication is properly implemented
  return "demo@user.com"
}

type FilterKey = "all" | "scripts" | "giveaways" | "published" | "pending"

// A normalized row used purely for presentation. The underlying raw record
// (script or giveaway) is kept on `raw` so the existing edit/save logic can
// continue to operate on the real shape.
type ListingRow = {
  key: string
  type: "script" | "giveaway"
  id: number
  title: string
  coverImage?: string
  price: string // already-formatted price label ("$19.99" / "Free" / "€450 prize")
  status: "published" | "pending" | "active"
  countLabel: string // "1,240" / "1,277 entries" / "—"
  rating?: number
  viewHref: string
  isSeed?: boolean
  raw: any
}

const fmtNum = (n: number) => n.toLocaleString("en-US")

export default function EditProductsPage() {
  const [scripts, setScripts] = useState<any[]>([])
  const [giveaways, setGiveaways] = useState<any[]>([])
  const [editing, setEditing] = useState<{ type: "script" | "giveaway"; id: number } | null>(null)
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error">("success")
  const [filter, setFilter] = useState<FilterKey>("all")
  const [query, setQuery] = useState("")

  useEffect(() => {
    // Fetch user's scripts and giveaways
    async function fetchData() {
      // Guard the blocking fetch with a 3s timeout so the loading state
      // never spins forever if the DB/API is unavailable (e.g. in dev).
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 15000)
      try {
        const [scriptsRes, giveawaysRes] = await Promise.all([
          fetch('/api/scripts', { signal: c.signal }),
          fetch('/api/giveaways', { signal: c.signal })
        ]);

        if (scriptsRes.ok) {
          const scriptsData = await scriptsRes.json();
          const userEmail = getUserEmail();
          setScripts(scriptsData.scripts?.filter((s: any) => s.seller_email === userEmail) || []);
        }

        if (giveawaysRes.ok) {
          const giveawaysData = await giveawaysRes.json();
          const userEmail = getUserEmail();
          setGiveaways(giveawaysData.giveaways?.filter((g: any) => g.creator_email === userEmail) || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        clearTimeout(t)
        setPageLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleEdit = (type: "script" | "giveaway", item: any) => {
    setEditing({ type, id: item.id })
    setForm(item)
    setMessage("")
  }

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      if (editing?.type === "script") {
        const response = await fetch(`/api/scripts/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        if (response.ok) {
          setScripts((prev) => prev.map((s) => (s.id === editing.id ? { ...s, ...form } : s)))
          setMessage("Script updated successfully!")
          setMessageType("success")
        } else {
          setMessage("Error updating script.")
          setMessageType("error")
        }
      } else if (editing?.type === "giveaway") {
        const response = await fetch(`/api/giveaways/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        if (response.ok) {
          setGiveaways((prev) => prev.map((g) => (g.id === editing.id ? { ...g, ...form } : g)))
          setMessage("Giveaway updated successfully!")
          setMessageType("success")
        } else {
          setMessage("Error updating giveaway.")
          setMessageType("error")
        }
      }
      setEditing(null)
    } catch (err) {
      setMessage("Error saving changes.")
      setMessageType("error")
    }
    setLoading(false)
  }

  // Build presentation rows from real data only.
  const rows: ListingRow[] = useMemo(() => {
    const scriptRows: ListingRow[] = scripts.map((s) => ({
      key: `script-${s.id}`,
      type: "script",
      id: s.id,
      title: s.title,
      coverImage: s.cover_image || s.coverImage || s.image,
      price:
        s.price === 0 || s.price === "0" || String(s.price).toLowerCase() === "free"
          ? "Free"
          : `${s.currency_symbol || "$"}${s.price}`,
      status: "published",
      countLabel: typeof s.sales === "number" ? fmtNum(s.sales) : "—",
      rating: typeof s.rating === "number" ? s.rating : undefined,
      viewHref: `/script/${s.id}`,
      raw: s,
    }))

    const giveawayRows: ListingRow[] = giveaways.map((g) => ({
      key: `giveaway-${g.id}`,
      type: "giveaway",
      id: g.id,
      title: g.title,
      coverImage: g.cover_image || g.coverImage || g.image,
      price: g.total_value ? `${g.total_value}` : "—",
      status: "active",
      countLabel:
        typeof g.entries === "number" ? `${fmtNum(g.entries)} entries` : "—",
      rating: undefined,
      viewHref: `/giveaway/${g.id}`,
      raw: g,
    }))

    return [...scriptRows, ...giveawayRows]
  }, [scripts, giveaways])

  // Filter + search the rows for presentation.
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "scripts" && r.type !== "script") return false
      if (filter === "giveaways" && r.type !== "giveaway") return false
      if (filter === "published" && r.status !== "published") return false
      if (filter === "pending" && r.status !== "pending") return false
      if (query.trim() && !r.title.toLowerCase().includes(query.trim().toLowerCase())) return false
      return true
    })
  }, [rows, filter, query])

  // Derived summary stats.
  const stats = useMemo(() => {
    const listings = rows.length
    const sales = rows.reduce((acc, r) => {
      const n = parseInt(r.countLabel.replace(/[^0-9]/g, ""), 10)
      return acc + (Number.isNaN(n) ? 0 : n)
    }, 0)
    const ratings = rows.map((r) => r.rating).filter((x): x is number => typeof x === "number")
    const avgRating = ratings.length
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : "—"
    // Presentational revenue estimate derived from sales.
    const revenue = Math.round(sales * 7.4)
    return { listings, sales, avgRating, revenue }
  }, [rows])

  const editingRow = editing
    ? rows.find((r) => r.type === editing.type && r.id === editing.id) || null
    : null

  const filterTabs: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "scripts", label: "Scripts" },
    { key: "giveaways", label: "Giveaways" },
    { key: "published", label: "Published" },
    { key: "pending", label: "Pending review" },
  ]

  const microLabel = "text-[11px] font-semibold uppercase tracking-[0.16em]"

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24 text-white [font-variant-numeric:tabular-nums]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pt-9 sm:px-6">
        {/* Concept chip */}
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-white/55 ${microLabel}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Management Table
        </span>

        {/* HEADER */}
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl font-extrabold leading-none tracking-tight sm:text-[34px]">Manage listings</h1>
            <p className="mt-2.5 text-sm leading-relaxed text-white/45">Edit, update, and track your published products.</p>
          </div>
          <Link href="/profile" className="shrink-0">
            <Button className="group inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-black transition hover:bg-orange-400">
              <Plus className="h-4 w-4" /> New listing
            </Button>
          </Link>
        </div>

        {/* Status message (edit/save feedback) */}
        {message && (
          <div
            className={`mt-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            {messageType === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {message}
          </div>
        )}

        {/* SUMMARY ROW */}
        <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06] sm:grid-cols-4">
          <div className="bg-[#0c0c0c] px-5 py-4">
            <div className={`text-white/40 ${microLabel}`}>Listings</div>
            <div className="mt-1 text-2xl font-extrabold tracking-tight">{stats.listings}</div>
          </div>
          <div className="bg-[#0c0c0c] px-5 py-4">
            <div className={`text-white/40 ${microLabel}`}>Total sales</div>
            <div className="mt-1 text-2xl font-extrabold tracking-tight">{fmtNum(stats.sales)}</div>
          </div>
          <div className="bg-[#0c0c0c] px-5 py-4">
            <div className={`text-white/40 ${microLabel}`}>Revenue</div>
            <div className="mt-1 text-2xl font-extrabold tracking-tight text-orange-500">€{fmtNum(stats.revenue)}</div>
          </div>
          <div className="bg-[#0c0c0c] px-5 py-4">
            <div className={`text-white/40 ${microLabel}`}>Avg rating</div>
            <div className="mt-1 flex items-center gap-1.5 text-2xl font-extrabold tracking-tight">
              {stats.avgRating}
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
        </div>

        {/* FILTER TABS + SEARCH */}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] p-1 text-sm">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`rounded-full px-3.5 py-1.5 transition ${
                  filter === tab.key
                    ? "bg-white font-semibold text-black"
                    : "font-medium text-white/55 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search listings"
              className="w-56 rounded-full border border-white/[0.07] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-orange-500/60"
            />
          </div>
        </div>

        {pageLoading ? (
          /* Loading state */
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="mt-4 text-sm">Loading your products...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          /* Empty state */
          <Card className="mt-4 border border-dashed border-gray-700/60 bg-white/[0.02] backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 ring-1 ring-orange-500/30">
                <Package className="h-8 w-8 text-orange-400" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-white">No listings yet</h3>
              <p className="mt-2 max-w-sm text-sm text-gray-400">
                {query.trim() || filter !== "all"
                  ? "No listings match your filters. Try clearing the search or switching tabs."
                  : "You haven't listed any scripts or giveaways. Create your first listing to start selling on FiveCrux."}
              </p>
              <Link href="/profile" className="mt-6">
                <Button className="bg-gradient-to-r from-orange-500 to-yellow-500 font-semibold text-black hover:from-orange-400 hover:to-yellow-400">
                  <Plus className="mr-2 h-4 w-4" />
                  Create a Listing
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* TABLE */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c0c]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-white/40">
                      <th className={`w-12 py-3.5 pl-5 pr-2`}>
                        <span className="grid h-4 w-4 place-items-center rounded border border-white/20" />
                      </th>
                      <th className={`py-3.5 pr-4 ${microLabel}`}>Product</th>
                      <th className={`py-3.5 pr-4 ${microLabel}`}>Price</th>
                      <th className={`py-3.5 pr-4 ${microLabel}`}>Status</th>
                      <th className={`py-3.5 pr-4 text-right ${microLabel}`}>Sales / Entries</th>
                      <th className={`py-3.5 pr-4 text-right ${microLabel}`}>Rating</th>
                      <th className={`py-3.5 pl-2 pr-5 text-right ${microLabel}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredRows.map((row, idx) => (
                      <tr
                        key={row.key}
                        className={`group/row transition-colors hover:bg-white/[0.025] ${
                          idx === filteredRows.length - 1 ? "" : "border-b border-white/[0.07]"
                        }`}
                      >
                        <td className="py-4 pl-5 pr-2">
                          <span className="grid h-4 w-4 place-items-center rounded border border-white/20" />
                        </td>

                        {/* Product */}
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3.5">
                            {row.coverImage ? (
                              <Image
                                src={row.coverImage}
                                alt={row.title}
                                width={64}
                                height={44}
                                className="h-11 w-16 flex-shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <span className="grid h-11 w-16 flex-shrink-0 place-items-center rounded-lg bg-white/[0.06] text-white/30">
                                <Package className="h-4 w-4" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{row.title}</div>
                              {row.type === "script" ? (
                                <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-300 ring-1 ring-sky-500/20">
                                  <Code2 className="h-2.5 w-2.5" /> Script
                                </span>
                              ) : (
                                <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-orange-500/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-300 ring-1 ring-orange-500/25">
                                  <Gift className="h-2.5 w-2.5" /> Giveaway
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-4 pr-4 font-semibold">
                          {row.price === "Free" ? (
                            <span className="text-emerald-400">Free</span>
                          ) : (
                            row.price
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 pr-4">
                          {row.status === "published" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/25">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Published
                            </span>
                          )}
                          {row.status === "pending" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/12 px-2.5 py-1 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/25">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Pending review
                            </span>
                          )}
                          {row.status === "active" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/12 px-2.5 py-1 text-xs font-semibold text-orange-400 ring-1 ring-orange-500/25">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" /> Active
                            </span>
                          )}
                        </td>

                        {/* Sales / Entries */}
                        <td className="py-4 pr-4 text-right font-medium">
                          {row.countLabel === "—" ? (
                            <span className="text-white/35">—</span>
                          ) : (
                            row.countLabel
                          )}
                        </td>

                        {/* Rating */}
                        <td className="py-4 pr-4 text-right">
                          {typeof row.rating === "number" ? (
                            <span className="inline-flex items-center justify-end gap-1 font-medium">
                              {row.rating.toFixed(1)}
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            </span>
                          ) : (
                            <span className="text-white/35">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 pl-2 pr-5">
                          <div className="flex items-center justify-end gap-1 opacity-35 transition-opacity group-hover/row:opacity-100">
                            <button
                              title="Edit"
                              onClick={() => !row.isSeed && handleEdit(row.type, row.raw)}
                              disabled={row.isSeed}
                              className="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition hover:bg-orange-500/15 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <Link
                              href={row.viewHref}
                              title="View"
                              className="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            {/* Delete is presentational — no delete endpoint exists. */}
                            <button
                              title="Delete"
                              className="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition hover:bg-rose-500/15 hover:text-rose-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table footer / pagination (presentational) */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-5 py-3.5 text-xs text-white/40">
                <span>
                  Showing <span className="text-white/70">{filteredRows.length}</span> of{" "}
                  <span className="text-white/70">{rows.length}</span> listings
                </span>
                <div className="flex items-center gap-1">
                  <button className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.07] text-white/50 transition hover:text-white">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 font-semibold text-white">1</button>
                  <button className="grid h-7 w-7 place-items-center rounded-lg text-white/50 transition hover:text-white">2</button>
                  <button className="grid h-7 w-7 place-items-center rounded-lg text-white/50 transition hover:text-white">3</button>
                  <button className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.07] text-white/50 transition hover:text-white">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* INLINE EDIT PANEL — wired to the existing handleEdit/handleChange/handleSave flow */}
      {editing && editingRow && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div className="flex items-center gap-2">
                {editing.type === "script" ? (
                  <Code2 className="h-4 w-4 text-sky-300" />
                ) : (
                  <Gift className="h-4 w-4 text-orange-300" />
                )}
                <h3 className="text-base font-semibold">
                  Edit {editing.type === "script" ? "script" : "giveaway"}
                </h3>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-5">
              {editing.type === "script" ? (
                <>
                  <Input name="title" value={form.title ?? ""} onChange={handleChange} placeholder="Title" className="border-white/10 bg-[#0d0d0f] text-white focus-visible:ring-orange-500/50" />
                  <Input name="price" value={form.price ?? ""} onChange={handleChange} placeholder="Price" type="number" className="border-white/10 bg-[#0d0d0f] text-white focus-visible:ring-orange-500/50" />
                  <Input name="version" value={form.version ?? ""} onChange={handleChange} placeholder="Version" className="border-white/10 bg-[#0d0d0f] text-white focus-visible:ring-orange-500/50" />
                  <Input name="category" value={form.category ?? ""} onChange={handleChange} placeholder="Category" className="border-white/10 bg-[#0d0d0f] text-white focus-visible:ring-orange-500/50" />
                </>
              ) : (
                <>
                  <Input name="title" value={form.title ?? ""} onChange={handleChange} placeholder="Title" className="border-white/10 bg-[#0d0d0f] text-white focus-visible:ring-orange-500/50" />
                  <Input name="total_value" value={form.total_value ?? ""} onChange={handleChange} placeholder="Total value" className="border-white/10 bg-[#0d0d0f] text-white focus-visible:ring-orange-500/50" />
                  <Input name="category" value={form.category ?? ""} onChange={handleChange} placeholder="Category" className="border-white/10 bg-[#0d0d0f] text-white focus-visible:ring-orange-500/50" />
                  <Input name="end_date" value={form.end_date ?? ""} onChange={handleChange} placeholder="End date" type="date" className="border-white/10 bg-[#0d0d0f] text-white focus-visible:ring-orange-500/50" />
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-white/[0.07] px-5 py-4">
              <Button onClick={handleSave} disabled={loading} className="bg-gradient-to-r from-orange-500 to-yellow-500 font-semibold text-black hover:from-orange-400 hover:to-yellow-400">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} className="border-white/15 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
