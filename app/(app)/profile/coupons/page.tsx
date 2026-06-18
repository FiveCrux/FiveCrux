"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Calendar,
  Edit,
  Loader2,
  Plus,
  Tag,
  Ticket,
  Trash2,
} from "lucide-react";
import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import { Badge } from "@/componentss/ui/badge";
import { Button } from "@/componentss/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentss/ui/dialog";
import { Input } from "@/componentss/ui/input";
import { Label } from "@/componentss/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentss/ui/select";
import { Switch } from "@/componentss/ui/switch";
import { Textarea } from "@/componentss/ui/textarea";
import type {
  Coupon,
  CouponApplicationRule,
  CouponDiscountType,
  CouponPayload,
  CouponScope,
} from "@/types/api";

type CouponFormState = {
  code: string;
  effectiveOn: CouponScope;
  discountType: CouponDiscountType;
  discountValue: string;
  redeemLimit: string;
  minimumBasketValue: string;
  redeemLimitPerCustomer: string;
  couponApplicationRule: CouponApplicationRule;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
  note: string;
};

const emptyForm: CouponFormState = {
  code: "",
  effectiveOn: "Ad Slots",
  discountType: "Percentage",
  discountValue: "",
  redeemLimit: "",
  minimumBasketValue: "0",
  redeemLimitPerCustomer: "0",
  couponApplicationRule: "individual",
  startDate: "",
  expiryDate: "",
  isActive: true,
  note: "",
};

function toDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No date" : date.toLocaleDateString();
}

function numberValue(value: string, fallback = 0) {
  if (value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function couponToForm(coupon: Coupon): CouponFormState {
  return {
    code: coupon.code,
    effectiveOn: coupon.scope,
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue ?? ""),
    redeemLimit: coupon.maxUses === null ? "" : String(coupon.maxUses),
    minimumBasketValue: String(coupon.minCartValue ?? "0"),
    redeemLimitPerCustomer: String(coupon.perUserLimit ?? 0),
    couponApplicationRule: coupon.couponApplicationRule,
    startDate: toDateInput(coupon.startDate),
    expiryDate: toDateInput(coupon.expiryDate),
    isActive: coupon.isActive ?? true,
    note: coupon.note ?? "",
  };
}

function buildPayload(form: CouponFormState): CouponPayload {
  return {
    code: form.code.trim(),
    effectiveOn: form.effectiveOn,
    discountType: form.discountType,
    discountValue: numberValue(form.discountValue),
    redeemLimit: form.redeemLimit.trim() ? numberValue(form.redeemLimit) : null,
    minimumBasketValue: numberValue(form.minimumBasketValue),
    redeemLimitPerCustomer: numberValue(form.redeemLimitPerCustomer),
    couponApplicationRule: form.couponApplicationRule,
    startDate: form.startDate || null,
    expiryDate: form.expiryDate || null,
    isActive: form.isActive,
    note: form.note.trim() || null,
  };
}

const cardClass =
  "rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl";
const inputClass =
  "border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/35 focus-visible:ring-orange-500/60 focus-visible:ring-offset-0 focus-visible:border-orange-500/40";

export default function ProfileCouponsPage() {
  const { data: session, status } = useSession();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponFormState>(emptyForm);

  // Blocking on-load data fetch, guarded by an 8s AbortController timeout so it
  // can never infinite-spin. Auth/role gating preserved: only fetch when a
  // session user exists (matches the original `enabled: !!session?.user`).
  const loadCoupons = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);

    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 3000);

    try {
      const res = await fetch("/api/coupons", {
        credentials: "include",
        signal: c.signal,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to load coupons");
      }
      const data: Coupon[] = await res.json();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      setIsError(true);
      setErrorMessage(
        err instanceof Error
          ? err.name === "AbortError"
            ? "Request timed out. Please try again."
            : err.message
          : "Failed to load coupons"
      );
    } finally {
      clearTimeout(t);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      setIsLoading(false);
      return;
    }
    loadCoupons();
  }, [status, session?.user, loadCoupons]);

  const activeCoupons = useMemo(
    () => coupons.filter((coupon) => coupon.isActive !== false).length,
    [coupons]
  );
  const redeemedCount = useMemo(
    () => coupons.reduce((sum, coupon) => sum + (coupon.usedCount || 0), 0),
    [coupons]
  );

  useEffect(() => {
    if (!dialogOpen) {
      setEditingCoupon(null);
      setForm(emptyForm);
    }
  }, [dialogOpen]);

  const openCreateDialog = () => {
    setEditingCoupon(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm(couponToForm(coupon));
    setDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildPayload(form);
    setPending(true);

    try {
      if (editingCoupon) {
        const res = await fetch(`/api/coupons/${editingCoupon.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to update coupon");
        }
        toast.success("Coupon updated successfully");
      } else {
        const res = await fetch("/api/coupons", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to create coupon");
        }
        toast.success("Coupon created successfully");
      }

      setDialogOpen(false);
      await loadCoupons();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save coupon");
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon ${coupon.code}?`)) return;
    setPending(true);
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete coupon");
      }
      toast.success("Coupon deleted successfully");
      await loadCoupons();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete coupon");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-yellow-400/10">
                <Ticket className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Coupons
                </h1>
                <p className="text-sm text-white/50">
                  Manage discount codes for checkout.
                </p>
              </div>
            </div>
            <Button
              onClick={openCreateDialog}
              className="w-full rounded-xl bg-orange-500 font-semibold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Coupon
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Total", value: coupons.length },
              { label: "Active", value: activeCoupons },
              { label: "Redeemed", value: redeemedCount },
            ].map((stat) => (
              <div key={stat.label} className={`${cardClass} p-5`}>
                <p className="text-sm text-white/50">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Coupon list */}
          <div className={`${cardClass} overflow-hidden`}>
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-4">
              <Tag className="h-5 w-5 text-orange-400" />
              <h2 className="text-base font-semibold text-white">
                Coupon List
              </h2>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/50">
                <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                <span className="text-sm">Loading coupons...</span>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <p className="text-sm text-red-400">
                  {errorMessage || "Failed to load coupons"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadCoupons}
                  className="rounded-xl border-white/[0.12] bg-white/[0.04] text-white hover:bg-white/[0.08]"
                >
                  Try again
                </Button>
              </div>
            ) : coupons.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                  <Ticket className="h-6 w-6 text-white/30" />
                </div>
                <div>
                  <p className="font-medium text-white/80">
                    No coupons created yet
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    Create your first discount code to get started.
                  </p>
                </div>
                <Button
                  onClick={openCreateDialog}
                  className="rounded-xl bg-orange-500 font-semibold text-white hover:bg-orange-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Coupon
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop / tablet table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wider text-white/40">
                        <th className="px-5 py-3 font-medium">Code</th>
                        <th className="px-5 py-3 font-medium">Discount</th>
                        <th className="px-5 py-3 font-medium">Scope</th>
                        <th className="px-5 py-3 font-medium">Uses</th>
                        <th className="px-5 py-3 font-medium">Expiry</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((coupon) => (
                        <tr
                          key={coupon.id}
                          className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.03]"
                        >
                          <td className="px-5 py-4 font-medium text-white">
                            {coupon.code}
                          </td>
                          <td className="px-5 py-4 text-white/70">
                            {coupon.discountType === "Percentage"
                              ? `${Number(coupon.discountValue)}%`
                              : `$${Number(coupon.discountValue).toFixed(2)}`}
                          </td>
                          <td className="px-5 py-4 text-white/70">
                            {coupon.scope}
                          </td>
                          <td className="px-5 py-4 text-white/70">
                            {coupon.usedCount || 0}
                            {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                          </td>
                          <td className="px-5 py-4 text-white/70">
                            {formatDate(coupon.expiryDate)}
                          </td>
                          <td className="px-5 py-4">
                            <Badge
                              className={
                                coupon.isActive === false
                                  ? "border-white/10 bg-white/[0.06] text-white/50"
                                  : "border-green-500/30 bg-green-500/15 text-green-400"
                              }
                            >
                              {coupon.isActive === false
                                ? "Inactive"
                                : "Active"}
                            </Badge>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(coupon)}
                                disabled={pending}
                                className="h-9 w-9 rounded-xl p-0 text-white/60 hover:bg-white/[0.06] hover:text-orange-400"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(coupon)}
                                disabled={pending}
                                className="h-9 w-9 rounded-xl p-0 text-white/60 hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile stacked cards */}
                <div className="space-y-3 p-4 md:hidden">
                  {coupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">
                            {coupon.code}
                          </p>
                          <p className="mt-0.5 text-sm text-orange-400">
                            {coupon.discountType === "Percentage"
                              ? `${Number(coupon.discountValue)}%`
                              : `$${Number(coupon.discountValue).toFixed(2)}`}{" "}
                            off
                          </p>
                        </div>
                        <Badge
                          className={
                            coupon.isActive === false
                              ? "border-white/10 bg-white/[0.06] text-white/50"
                              : "border-green-500/30 bg-green-500/15 text-green-400"
                          }
                        >
                          {coupon.isActive === false ? "Inactive" : "Active"}
                        </Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <p className="text-xs text-white/40">Scope</p>
                          <p className="text-white/80">{coupon.scope}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/40">Uses</p>
                          <p className="text-white/80">
                            {coupon.usedCount || 0}
                            {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-white/40">Expiry</p>
                          <p className="text-white/80">
                            {formatDate(coupon.expiryDate)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end gap-2 border-t border-white/[0.06] pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(coupon)}
                          disabled={pending}
                          className="rounded-xl text-white/70 hover:bg-white/[0.06] hover:text-orange-400"
                        >
                          <Edit className="mr-1.5 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(coupon)}
                          disabled={pending}
                          className="rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-white/[0.08] bg-[#0d0d0f] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCoupon ? "Update Coupon" : "Create Coupon"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-white/70">
                  Code
                </Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value.toUpperCase() })
                  }
                  placeholder="SAVE20"
                  maxLength={32}
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Effective On</Label>
                <Select
                  value={form.effectiveOn}
                  onValueChange={(value: CouponScope) =>
                    setForm({ ...form, effectiveOn: value })
                  }
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.08] bg-[#0d0d0f] text-white">
                    <SelectItem value="Ad Slots">Ad Slots</SelectItem>
                    <SelectItem value="Featured Script Slots">
                      Featured Script Slots
                    </SelectItem>
                    <SelectItem value="Props">Props</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Discount Type</Label>
                <Select
                  value={form.discountType}
                  onValueChange={(value: CouponDiscountType) =>
                    setForm({ ...form, discountType: value })
                  }
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.08] bg-[#0d0d0f] text-white">
                    <SelectItem value="Percentage">Percentage</SelectItem>
                    <SelectItem value="Amount">Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue" className="text-white/70">
                  Discount Value
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  min="0"
                  step={form.discountType === "Percentage" ? "1" : "0.01"}
                  value={form.discountValue}
                  onChange={(event) =>
                    setForm({ ...form, discountValue: event.target.value })
                  }
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redeemLimit" className="text-white/70">
                  Redeem Limit
                </Label>
                <Input
                  id="redeemLimit"
                  type="number"
                  min="1"
                  step="1"
                  value={form.redeemLimit}
                  onChange={(event) =>
                    setForm({ ...form, redeemLimit: event.target.value })
                  }
                  placeholder="Unlimited"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redeemLimitPerCustomer" className="text-white/70">
                  Per Customer Limit
                </Label>
                <Input
                  id="redeemLimitPerCustomer"
                  type="number"
                  min="0"
                  step="1"
                  value={form.redeemLimitPerCustomer}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      redeemLimitPerCustomer: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumBasketValue" className="text-white/70">
                  Minimum Basket Value
                </Label>
                <Input
                  id="minimumBasketValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minimumBasketValue}
                  onChange={(event) =>
                    setForm({ ...form, minimumBasketValue: event.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Application Rule</Label>
                <Select
                  value={form.couponApplicationRule}
                  onValueChange={(value: CouponApplicationRule) =>
                    setForm({ ...form, couponApplicationRule: value })
                  }
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.08] bg-[#0d0d0f] text-white">
                    <SelectItem value="individual">Individual item</SelectItem>
                    <SelectItem value="basket_before_sales">
                      Basket before sales
                    </SelectItem>
                    <SelectItem value="basket_after_sales">
                      Basket after sales
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="startDate"
                  className="flex items-center gap-2 text-white/70"
                >
                  <Calendar className="h-4 w-4" />
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm({ ...form, startDate: event.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="expiryDate"
                  className="flex items-center gap-2 text-white/70"
                >
                  <Calendar className="h-4 w-4" />
                  Expiry Date
                </Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) =>
                    setForm({ ...form, expiryDate: event.target.value })
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <Label htmlFor="isActive" className="text-white/80">
                Active
              </Label>
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isActive: checked })
                }
                className="data-[state=checked]:bg-orange-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note" className="text-white/70">
                Note
              </Label>
              <Textarea
                id="note"
                value={form.note}
                onChange={(event) =>
                  setForm({ ...form, note: event.target.value })
                }
                maxLength={500}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl border-white/[0.12] bg-transparent text-white hover:bg-white/[0.06]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-orange-500 font-semibold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600"
              >
                {pending
                  ? "Saving..."
                  : editingCoupon
                    ? "Update"
                    : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
