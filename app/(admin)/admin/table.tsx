"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentss/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentss/ui/select"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { toast } from "sonner"

type User = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  username: string | null
  role: "founder" | "verified_creator" | "crew" | "admin" | "moderator"
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        console.log("Loading users...")
        const res = await fetch("/api/admin/users", { cache: "no-store" })
        console.log("Response status:", res.status)
        if (!res.ok) {
          const errorText = await res.text()
          console.error("Response error:", errorText)
          throw new Error(`Failed to load users: ${res.status}`)
        }
        const data = await res.json()
        console.log("Users data:", data)
        setUsers(data.users || [])
      } catch (e) {
        console.error("Error loading users:", e)
        toast.error("Couldn't load users")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      [u.name, u.email, u.username, u.id].some((v) => (v || "").toLowerCase().includes(q)),
    )
  }, [users, query])

  const updateRole = async (userId: string, role: User["role"]) => {
    setSavingId(userId)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: data.user.role } : u)))
      toast.success("Role updated")
    } catch (e) {
      toast.error("Update failed")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card className="bg-black/30 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Input
              placeholder="Search by name, email, username, id"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-gray-900/50 border-gray-700/60 text-white"
            />
            <Button variant="outline" className="border-gray-700/60 text-white" onClick={() => setQuery("")}>Clear</Button>
          </div>

          <div className="rounded-md border border-gray-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-300">Name</TableHead>
                  <TableHead className="text-gray-300">Username</TableHead>
                  <TableHead className="text-gray-300">Email</TableHead>
                  <TableHead className="text-gray-300">ID</TableHead>
                  <TableHead className="text-gray-300">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400">No users</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-white">{u.name || "-"}</TableCell>
                      <TableCell className="text-white">{u.username || "-"}</TableCell>
                      <TableCell className="text-white">{u.email || "-"}</TableCell>
                      <TableCell className="text-gray-400 font-mono text-xs">{u.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select defaultValue={u.role} onValueChange={(value) => updateRole(u.id, value as any)}>
                            <SelectTrigger className="w-[150px] bg-gray-900/60 border-gray-700/60 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-800 text-white">
                              <SelectItem value="founder">Founder</SelectItem>
                              <SelectItem value="verified_creator">Verified Creator</SelectItem>
                              <SelectItem value="crew">Crew</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button disabled className={`h-8 px-2 ${savingId === u.id ? "animate-pulse" : "opacity-0"}`}>Save</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


