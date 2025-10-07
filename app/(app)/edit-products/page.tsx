"use client"

import { useEffect, useState } from "react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card"
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
  const [message, setMessage] = useState("")

  useEffect(() => {
    // Fetch user's scripts and giveaways
    async function fetchData() {
      try {
        const [scriptsRes, giveawaysRes] = await Promise.all([
          fetch('/api/scripts'),
          fetch('/api/giveaways')
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
        } else {
          setMessage("Error updating script.")
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
        } else {
          setMessage("Error updating giveaway.")
        }
      }
      setEditing(null)
    } catch (err) {
      setMessage("Error saving changes.")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-8">Edit Your Products</h1>
        {message && <div className="mb-4 text-green-400">{message}</div>}
        <h2 className="text-2xl font-semibold mb-4">Scripts</h2>
        <div className="space-y-4 mb-8">
          {scripts.map((script) => (
            <Card key={script.id} className="bg-gray-800/30 border border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">{script.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {editing?.type === "script" && editing.id === script.id ? (
                  <div className="space-y-2">
                    <Input name="title" value={form.title} onChange={handleChange} className="bg-gray-900 text-white" />
                    <Input name="price" value={form.price} onChange={handleChange} className="bg-gray-900 text-white" type="number" />
                    <Input name="version" value={form.version} onChange={handleChange} className="bg-gray-900 text-white" />
                    <Input name="category" value={form.category} onChange={handleChange} className="bg-gray-900 text-white" />
                    <Button onClick={handleSave} disabled={loading} className="mt-2">Save</Button>
                    <Button variant="outline" onClick={() => setEditing(null)} className="ml-2 mt-2">Cancel</Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">{script.title}</div>
                      <div className="text-gray-400">${script.price} | v{script.version} | {script.category}</div>
                    </div>
                    <Button onClick={() => handleEdit("script", script)}>Edit</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <h2 className="text-2xl font-semibold mb-4">Giveaways</h2>
        <div className="space-y-4">
          {giveaways.map((giveaway) => (
            <Card key={giveaway.id} className="bg-gray-800/30 border border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">{giveaway.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {editing?.type === "giveaway" && editing.id === giveaway.id ? (
                  <div className="space-y-2">
                    <Input name="title" value={form.title} onChange={handleChange} className="bg-gray-900 text-white" />
                    <Input name="total_value" value={form.total_value} onChange={handleChange} className="bg-gray-900 text-white" />
                    <Input name="category" value={form.category} onChange={handleChange} className="bg-gray-900 text-white" />
                    <Input name="end_date" value={form.end_date} onChange={handleChange} className="bg-gray-900 text-white" type="date" />
                    <Button onClick={handleSave} disabled={loading} className="mt-2">Save</Button>
                    <Button variant="outline" onClick={() => setEditing(null)} className="ml-2 mt-2">Cancel</Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">{giveaway.title}</div>
                      <div className="text-gray-400">Value: {giveaway.total_value} | Ends: {giveaway.end_date} | {giveaway.category}</div>
                    </div>
                    <Button onClick={() => handleEdit("giveaway", giveaway)}>Edit</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
} 