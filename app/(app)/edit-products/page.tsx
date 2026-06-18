"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Pencil,
  Save,
  X,
  Package,
  Gift,
  Loader2,
  Tag,
  Layers,
  Calendar,
  DollarSign,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Badge } from "@/componentss/ui/badge"
import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"

// This will be replaced with real user authentication/session logic
// For now, we'll get it from the session or use a placeholder
const getUserEmail = () => {
  // TODO: Get from session when authentication is properly implemented
  return "demo@user.com"
}

export default function EditProductsPage() {
  const [scripts, setScripts] = useState<any[]>([])
  const [giveaways, setGiveaways] = useState<any[]>([])
  const [editing, setEditing] = useState<{ type: "script" | "giveaway"; id: number } | null>(null)
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error">("success")

  useEffect(() => {
    // Fetch user's scripts and giveaways
    async function fetchData() {
      // Guard the blocking fetch with an 8s timeout so the loading state
      // never spins forever if the DB/API is unavailable (e.g. in dev).
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 3000)
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

  const totalItems = scripts.length + giveaways.length

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      <div className="relative max-w-6xl mx-auto py-10 sm:py-14 px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
                <Layers className="h-3.5 w-3.5" />
                Manage your listings
              </span>
              <h1 className="mt-3 text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-orange-100 to-yellow-200 bg-clip-text text-transparent">
                Edit Your Products
              </h1>
              <p className="mt-2 text-sm sm:text-base text-gray-400">
                Update your scripts and giveaways from one dashboard.
              </p>
            </div>
            <Link href="/profile" className="shrink-0">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-semibold hover:from-orange-400 hover:to-yellow-400">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Listing
              </Button>
            </Link>
          </div>
        </div>

        {/* Status message */}
        {message && (
          <div
            className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
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

        {/* Loading state */}
        {pageLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="mt-4 text-sm">Loading your products...</p>
          </div>
        ) : totalItems === 0 ? (
          /* Empty state */
          <Card className="border border-dashed border-gray-700/60 bg-white/[0.02] backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 ring-1 ring-orange-500/30">
                <Package className="h-8 w-8 text-orange-400" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-white">No products yet</h3>
              <p className="mt-2 max-w-sm text-sm text-gray-400">
                You haven&apos;t listed any scripts or giveaways. Create your first listing to start selling on FiveCrux.
              </p>
              <Link href="/profile" className="mt-6">
                <Button className="bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-semibold hover:from-orange-400 hover:to-yellow-400">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create a Listing
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-12">
            {/* Scripts section */}
            <section>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 ring-1 ring-orange-500/30">
                  <Package className="h-5 w-5 text-orange-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold">Scripts</h2>
                <Badge variant="secondary" className="bg-white/5 text-gray-300 border border-white/10">
                  {scripts.length}
                </Badge>
              </div>

              {scripts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-700/50 bg-white/[0.02] py-10 text-center text-sm text-gray-500">
                  No scripts listed yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {scripts.map((script) => (
                    <Card
                      key={script.id}
                      className="group border border-white/10 bg-white/[0.03] backdrop-blur-md transition-colors hover:border-orange-500/40 rounded-2xl overflow-hidden"
                    >
                      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                        <CardTitle className="text-base sm:text-lg text-white break-words">
                          {script.title}
                        </CardTitle>
                        <Badge className="shrink-0 border-orange-500/30 bg-orange-500/10 text-orange-300">
                          Script
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        {editing?.type === "script" && editing.id === script.id ? (
                          <div className="space-y-3">
                            <Input name="title" value={form.title} onChange={handleChange} placeholder="Title" className="bg-[#0d0d0f] border-white/10 text-white focus-visible:ring-orange-500/50" />
                            <Input name="price" value={form.price} onChange={handleChange} placeholder="Price" className="bg-[#0d0d0f] border-white/10 text-white focus-visible:ring-orange-500/50" type="number" />
                            <Input name="version" value={form.version} onChange={handleChange} placeholder="Version" className="bg-[#0d0d0f] border-white/10 text-white focus-visible:ring-orange-500/50" />
                            <Input name="category" value={form.category} onChange={handleChange} placeholder="Category" className="bg-[#0d0d0f] border-white/10 text-white focus-visible:ring-orange-500/50" />
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button onClick={handleSave} disabled={loading} className="bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-semibold hover:from-orange-400 hover:to-yellow-400">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save
                              </Button>
                              <Button variant="outline" onClick={() => setEditing(null)} className="border-white/15 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white">
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 space-y-2 text-sm text-gray-400">
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-orange-400/80" />
                                <span className="text-white font-medium">
                                  {script.currency_symbol || "$"}{script.price}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="inline-flex items-center gap-1">
                                  <Tag className="h-3.5 w-3.5 text-gray-500" />
                                  v{script.version}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Layers className="h-3.5 w-3.5 text-gray-500" />
                                  {script.category}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleEdit("script", script)}
                              className="shrink-0 bg-white/5 text-orange-300 ring-1 ring-orange-500/30 hover:bg-orange-500/15"
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Giveaways section */}
            <section>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/15 ring-1 ring-yellow-500/30">
                  <Gift className="h-5 w-5 text-yellow-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold">Giveaways</h2>
                <Badge variant="secondary" className="bg-white/5 text-gray-300 border border-white/10">
                  {giveaways.length}
                </Badge>
              </div>

              {giveaways.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-700/50 bg-white/[0.02] py-10 text-center text-sm text-gray-500">
                  No giveaways created yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {giveaways.map((giveaway) => (
                    <Card
                      key={giveaway.id}
                      className="group border border-white/10 bg-white/[0.03] backdrop-blur-md transition-colors hover:border-yellow-500/40 rounded-2xl overflow-hidden"
                    >
                      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                        <CardTitle className="text-base sm:text-lg text-white break-words">
                          {giveaway.title}
                        </CardTitle>
                        <Badge className="shrink-0 border-yellow-500/30 bg-yellow-500/10 text-yellow-300">
                          Giveaway
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        {editing?.type === "giveaway" && editing.id === giveaway.id ? (
                          <div className="space-y-3">
                            <Input name="title" value={form.title} onChange={handleChange} placeholder="Title" className="bg-[#0d0d0f] border-white/10 text-white focus-visible:ring-yellow-500/50" />
                            <Input name="total_value" value={form.total_value} onChange={handleChange} placeholder="Total value" className="bg-[#0d0d0f] border-white/10 text-white focus-visible:ring-yellow-500/50" />
                            <Input name="category" value={form.category} onChange={handleChange} placeholder="Category" className="bg-[#0d0d0f] border-white/10 text-white focus-visible:ring-yellow-500/50" />
                            <Input name="end_date" value={form.end_date} onChange={handleChange} placeholder="End date" className="bg-[#0d0d0f] border-white/10 text-white focus-visible:ring-yellow-500/50" type="date" />
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button onClick={handleSave} disabled={loading} className="bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-semibold hover:from-orange-400 hover:to-yellow-400">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save
                              </Button>
                              <Button variant="outline" onClick={() => setEditing(null)} className="border-white/15 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white">
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 space-y-2 text-sm text-gray-400">
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-yellow-400/80" />
                                <span className="text-white font-medium">Value: {giveaway.total_value}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                  Ends: {giveaway.end_date}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Layers className="h-3.5 w-3.5 text-gray-500" />
                                  {giveaway.category}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleEdit("giveaway", giveaway)}
                              className="shrink-0 bg-white/5 text-yellow-300 ring-1 ring-yellow-500/30 hover:bg-yellow-500/15"
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
