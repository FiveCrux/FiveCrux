"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { Edit, Plus, Trash2, Megaphone, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/componentss/ui/badge"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentss/ui/dialog"
import { Input } from "@/componentss/ui/input"
import { Label } from "@/componentss/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentss/ui/select"
import { Switch } from "@/componentss/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentss/ui/table"
import { CurrencySelect } from "@/componentss/currency-select"

type DiscountType = "Percentage" | "Amount"

type CreatorCode = {
  id: number
  code: string
  discountType: DiscountType
  discountValue: string
  commissionType: DiscountType
  commissionValue: string
  currencySymbol: string | null
  isActive: boolean
  usedCount: number
  totalCommission: number
  totalDiscountGiven: number
  redemptionCount: number
}

type FormState = {
  code: string
  discountType: DiscountType
  discountValue: string
  commissionType: DiscountType
  commissionValue: string
  currency: string
  currencySymbol: string
  isActive: boolean
}

const emptyForm: FormState = {
  code: "",
  discountType: "Percentage",
  discountValue: "",
  commissionType: "Percentage",
  commissionValue: "",
  currency: "USD",
  currencySymbol: "$",
  isActive: true,
}

function codeToForm(c: CreatorCode): FormState {
  return {
    code: c.code,
    discountType: c.discountType,
    discountValue: String(c.discountValue),
    commissionType: c.commissionType,
    commissionValue: String(c.commissionValue),
    currency: "",
    currencySymbol: c.currencySymbol || "$",
    isActive: c.isActive,
  }
}

// Profile → "Creator Codes": storewide affiliate/referral codes — distinct
// from Coupons (which self-discount the creator's own listing). A buyer using
// a creator code gets a discount, and the creator earns a commission,
// tracked here from real redemptions (no manual payout automation — this is
// tracking only, same as the rest of FiveCrux's money features).
export default function CreatorCodesTab() {
  const [codes, setCodes] = useState<CreatorCode[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCode, setEditingCode] = useState<CreatorCode | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetch("/api/creator-codes")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setCodes(Array.isArray(d) ? d : []))
      .catch(() => setCodes([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const totals = useMemo(
    () => ({
      totalCommission: codes.reduce((sum, c) => sum + c.totalCommission, 0),
      totalRedemptions: codes.reduce((sum, c) => sum + c.redemptionCount, 0),
      active: codes.filter((c) => c.isActive).length,
    }),
    [codes]
  )

  useEffect(() => {
    if (!dialogOpen) {
      setEditingCode(null)
      setForm(emptyForm)
    }
  }, [dialogOpen])

  const openCreateDialog = () => {
    setEditingCode(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEditDialog = (code: CreatorCode) => {
    setEditingCode(code)
    setForm(codeToForm(code))
    setDialogOpen(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const needsCurrency = form.discountType === "Amount" || form.commissionType === "Amount"
      const payload = {
        code: form.code.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        commissionType: form.commissionType,
        commissionValue: Number(form.commissionValue),
        currencySymbol: needsCurrency ? (form.currencySymbol || "$") : null,
        isActive: form.isActive,
      }

      const res = editingCode
        ? await fetch(`/api/creator-codes/${editingCode.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/creator-codes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Failed to save creator code")
      }

      toast.success(editingCode ? "Creator code updated" : "Creator code created")
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save creator code")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (code: CreatorCode) => {
    if (!confirm(`Delete creator code ${code.code}?`)) return
    try {
      const res = await fetch(`/api/creator-codes/${code.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Creator code deleted")
      load()
    } catch {
      toast.error("Failed to delete creator code")
    }
  }

  const fmtValue = (type: DiscountType, value: string, currencySymbol?: string | null) =>
    type === "Percentage" ? `${Number(value)}%` : `${currencySymbol || "$"}${Number(value).toFixed(2)}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Creator Codes</h2>
          <p className="text-sm text-white/50">
            Storewide affiliate codes — buyers get a discount, you earn a commission on the sale.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="mr-2 h-4 w-4" />
          Create Creator Code
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-white/[0.08] bg-white/[0.03]">
          <CardContent className="p-5">
            <p className="text-sm text-white/50">Active codes</p>
            <p className="mt-1 text-2xl font-semibold text-white">{totals.active}</p>
          </CardContent>
        </Card>
        <Card className="border-white/[0.08] bg-white/[0.03]">
          <CardContent className="p-5">
            <p className="text-sm text-white/50">Redemptions</p>
            <p className="mt-1 text-2xl font-semibold text-white">{totals.totalRedemptions}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-500/25 bg-orange-500/[0.06]">
          <CardContent className="p-5">
            <p className="text-sm text-orange-300/80">Commission earned</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-white">${totals.totalCommission.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/[0.08] bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Megaphone className="h-5 w-5 text-orange-500" />
            Your Creator Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
          ) : codes.length === 0 ? (
            <div className="py-10 text-center text-white/50">No creator codes yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Buyer discount</TableHead>
                  <TableHead>Your commission</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Earned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-white">{c.code}</TableCell>
                    <TableCell>{fmtValue(c.discountType, c.discountValue, c.currencySymbol)}</TableCell>
                    <TableCell>{fmtValue(c.commissionType, c.commissionValue, c.currencySymbol)}</TableCell>
                    <TableCell>{c.redemptionCount}</TableCell>
                    <TableCell className="font-mono">{c.currencySymbol || "$"}{c.totalCommission.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          c.isActive
                            ? "border-green-500/30 bg-green-500/20 text-green-400"
                            : "border-gray-500/30 bg-gray-500/20 text-gray-300"
                        }
                      >
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(c)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/[0.08] bg-[#0d0d0d] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCode ? "Update Creator Code" : "Create Creator Code"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="MYCODE10"
                maxLength={32}
                disabled={!!editingCode}
                required
              />
            </div>

            {(form.discountType === "Amount" || form.commissionType === "Amount") && (
              <div className="space-y-2">
                <Label>Currency</Label>
                <CurrencySelect
                  value={form.currency}
                  onValueChange={(value) => setForm({ ...form, currency: value })}
                  onCurrencySelect={(currency) =>
                    setForm({ ...form, currency: currency.code, currencySymbol: currency.symbol })
                  }
                  placeholder={form.currencySymbol || "Currency"}
                  currencies="all"
                  variant="default"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buyer discount type</Label>
                <Select value={form.discountType} onValueChange={(v: DiscountType) => setForm({ ...form, discountType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Percentage">Percentage</SelectItem>
                    <SelectItem value="Amount">Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">Buyer discount value</Label>
                <Input
                  id="discountValue"
                  type="number"
                  min="0"
                  step={form.discountType === "Percentage" ? "1" : "0.01"}
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Your commission type</Label>
                <Select value={form.commissionType} onValueChange={(v: DiscountType) => setForm({ ...form, commissionType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Percentage">Percentage</SelectItem>
                    <SelectItem value="Amount">Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionValue">Your commission value</Label>
                <Input
                  id="commissionValue"
                  type="number"
                  min="0"
                  step={form.commissionType === "Percentage" ? "1" : "0.01"}
                  value={form.commissionValue}
                  onChange={(e) => setForm({ ...form, commissionValue: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-white/[0.08] p-3">
              <Label htmlFor="isActive">Active</Label>
              <Switch id="isActive" checked={form.isActive} onCheckedChange={(c) => setForm({ ...form, isActive: c })} />
            </div>

            <p className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 text-xs leading-relaxed text-white/45">
              Commission is tracked here only — payouts happen manually outside FiveCrux (no automatic transfer).
            </p>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                {saving ? "Saving..." : editingCode ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
