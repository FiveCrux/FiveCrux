"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Calendar, Edit, Plus, Tag, Trash2 } from "lucide-react";
import { Badge } from "@/componentss/ui/badge";
import { Button } from "@/componentss/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentss/ui/table";
import { Textarea } from "@/componentss/ui/textarea";
import {
  useCoupons,
  useCreateCoupon,
  useDeleteCoupon,
  useUpdateCoupon,
} from "@/hooks/use-coupons-queries";
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

export default function CouponsTab() {
  const { data: coupons = [], isLoading, isError, error } = useCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponFormState>(emptyForm);

  const activeCoupons = useMemo(
    () => coupons.filter((coupon) => coupon.isActive !== false).length,
    [coupons]
  );

  useEffect(() => {
    if (!dialogOpen) {
      setEditingCoupon(null);
      setForm(emptyForm);
    }
  }, [dialogOpen]);

  const pending =
    createCoupon.isPending || updateCoupon.isPending || deleteCoupon.isPending;

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

    if (editingCoupon) {
      await updateCoupon.mutateAsync({ couponId: editingCoupon.id, payload });
    } else {
      await createCoupon.mutateAsync(payload);
    }

    setDialogOpen(false);
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon ${coupon.code}?`)) return;
    await deleteCoupon.mutateAsync(coupon.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Coupons</h2>
          <p className="text-sm text-gray-400">
            Manage discount codes for checkout.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="mr-2 h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardContent className="p-5">
            <p className="text-sm text-gray-400">Total</p>
            <p className="mt-1 text-2xl font-semibold text-white">{coupons.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardContent className="p-5">
            <p className="text-sm text-gray-400">Active</p>
            <p className="mt-1 text-2xl font-semibold text-white">{activeCoupons}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardContent className="p-5">
            <p className="text-sm text-gray-400">Redeemed</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {coupons.reduce((sum, coupon) => sum + (coupon.usedCount || 0), 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800/30 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Tag className="h-5 w-5 text-orange-500" />
            Coupon List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-gray-400">Loading coupons...</div>
          ) : isError ? (
            <div className="py-10 text-center text-red-400">
              {error instanceof Error ? error.message : "Failed to load coupons"}
            </div>
          ) : coupons.length === 0 ? (
            <div className="py-10 text-center text-gray-400">No coupons created yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id} className="border-gray-700">
                    <TableCell className="font-medium text-white">{coupon.code}</TableCell>
                    <TableCell>
                      {coupon.discountType === "Percentage"
                        ? `${Number(coupon.discountValue)}%`
                        : `$${Number(coupon.discountValue).toFixed(2)}`}
                    </TableCell>
                    <TableCell>{coupon.scope}</TableCell>
                    <TableCell>
                      {coupon.usedCount || 0}
                      {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                    </TableCell>
                    <TableCell>{formatDate(coupon.expiryDate)}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          coupon.isActive === false
                            ? "bg-gray-500/20 text-gray-300 border-gray-500/30"
                            : "bg-green-500/20 text-green-400 border-green-500/30"
                        }
                      >
                        {coupon.isActive === false ? "Inactive" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(coupon)}
                          disabled={pending}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(coupon)}
                          disabled={pending}
                          className="text-red-400 hover:text-red-300"
                        >
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
        <DialogContent className="max-h-[90vh] overflow-y-auto border-gray-700 bg-gray-900 text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Update Coupon" : "Create Coupon"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  maxLength={32}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Effective On</Label>
                <Select
                  value={form.effectiveOn}
                  onValueChange={(value: CouponScope) => setForm({ ...form, effectiveOn: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ad Slots">Ad Slots</SelectItem>
                    <SelectItem value="Featured Script Slots">Featured Script Slots</SelectItem>
                    <SelectItem value="Props">Props</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={form.discountType}
                  onValueChange={(value: CouponDiscountType) => setForm({ ...form, discountType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Percentage">Percentage</SelectItem>
                    <SelectItem value="Amount">Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">Discount Value</Label>
                <Input
                  id="discountValue"
                  type="number"
                  min="0"
                  step={form.discountType === "Percentage" ? "1" : "0.01"}
                  value={form.discountValue}
                  onChange={(event) => setForm({ ...form, discountValue: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redeemLimit">Redeem Limit</Label>
                <Input
                  id="redeemLimit"
                  type="number"
                  min="1"
                  step="1"
                  value={form.redeemLimit}
                  onChange={(event) => setForm({ ...form, redeemLimit: event.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redeemLimitPerCustomer">Per Customer Limit</Label>
                <Input
                  id="redeemLimitPerCustomer"
                  type="number"
                  min="0"
                  step="1"
                  value={form.redeemLimitPerCustomer}
                  onChange={(event) => setForm({ ...form, redeemLimitPerCustomer: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumBasketValue">Minimum Basket Value</Label>
                <Input
                  id="minimumBasketValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minimumBasketValue}
                  onChange={(event) => setForm({ ...form, minimumBasketValue: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Application Rule</Label>
                <Select
                  value={form.couponApplicationRule}
                  onValueChange={(value: CouponApplicationRule) =>
                    setForm({ ...form, couponApplicationRule: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual item</SelectItem>
                    <SelectItem value="basket_before_sales">Basket before sales</SelectItem>
                    <SelectItem value="basket_after_sales">Basket after sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expiry Date
                </Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) => setForm({ ...form, expiryDate: event.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-gray-700 p-3">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                maxLength={500}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending} className="bg-orange-500 hover:bg-orange-600">
                {pending ? "Saving..." : editingCoupon ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
