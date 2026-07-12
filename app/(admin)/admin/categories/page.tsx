"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
  Eye,
  EyeOff,
  Home,
  Loader2,
} from "lucide-react";

import { categoryIcon, CATEGORY_ICON_NAMES } from "@/lib/category-icons";

type Category = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  appliesTo: string;
  isActive: boolean;
  showOnHome: boolean;
  homeOrder: number;
  sortOrder: number;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const EMPTY = {
  name: "",
  slug: "",
  icon: "Tag",
  appliesTo: "scripts",
  isActive: true,
  showOnHome: false,
  homeOrder: 0,
  sortOrder: 0,
};

export default function AdminCategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...EMPTY });
  const [slugTouched, setSlugTouched] = useState(false);

  // Role guard (the API enforces server-side too).
  useEffect(() => {
    if (status === "loading") return;
    if (!session) return void router.push("/auth/signin");
    const roles = (session?.user as any)?.roles || [];
    if (!["admin", "founder", "moderator"].some((r) => roles.includes(r))) router.push("/");
  }, [session, status, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/categories", { cache: "no-store" });
      const d = await r.json();
      if (r.ok) setCats(d.categories || []);
      else setError(d.error || "Failed to load");
    } catch {
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!draft.name.trim()) return setError("Name is required");
    setSaving("new");
    setError(null);
    const body = { ...draft, slug: draft.slug || slugify(draft.name) };
    try {
      const r = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) return setError(d.error || "Failed to create");
      setDraft({ ...EMPTY });
      setSlugTouched(false);
      await load();
    } finally {
      setSaving(null);
    }
  };

  const patch = async (id: number, changes: Partial<Category>) => {
    setSaving(id);
    setError(null);
    // Optimistic local update.
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));
    try {
      const r = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Failed to update");
        await load();
      }
    } finally {
      setSaving(null);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this category? Assets already tagged with it keep their tag.")) return;
    setSaving(id);
    try {
      const r = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (r.ok) setCats((prev) => prev.filter((c) => c.id !== id));
      else setError("Failed to delete");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="mt-1 text-sm text-white/50">
          Manage the browse categories shown across the home page and /scripts. Toggle{" "}
          <Home className="inline h-3.5 w-3.5" /> to feature a category on the home page.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Add new */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/60">
            <Plus className="h-4 w-4" /> Add category
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] text-white/40">Name</label>
              <input
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    name: e.target.value,
                    slug: slugTouched ? d.slug : slugify(e.target.value),
                  }))
                }
                placeholder="e.g. Vehicles"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-white/40">Slug</label>
              <input
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setDraft((d) => ({ ...d, slug: slugify(e.target.value) }));
                }}
                placeholder="vehicles"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-white/40">Icon</label>
              <select
                value={draft.icon}
                onChange={(e) => setDraft((d) => ({ ...d, icon: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
              >
                {CATEGORY_ICON_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-white/40">Applies to</label>
              <select
                value={draft.appliesTo}
                onChange={(e) => setDraft((d) => ({ ...d, appliesTo: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
              >
                <option value="scripts">Assets</option>
                <option value="props">Props</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={draft.showOnHome}
                onChange={(e) => setDraft((d) => ({ ...d, showOnHome: e.target.checked }))}
              />
              Show on home
            </label>
            <button
              onClick={create}
              disabled={saving === "new"}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400 disabled:opacity-50"
            >
              {saving === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>
        </div>

        {/* List */}
        <div className="mt-6 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-white/40">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : cats.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">No categories yet. Add one above.</p>
          ) : (
            cats.map((c) => {
              const Icon = categoryIcon(c.icon);
              const busy = saving === c.id;
              return (
                <div
                  key={c.id}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 ${
                    c.isActive ? "" : "opacity-50"
                  }`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-white/20" />
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                    <Icon className="h-4 w-4 text-orange-400" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    <div className="truncate text-[11px] text-white/40">
                      /{c.slug} · {c.appliesTo}
                    </div>
                  </div>

                  <div className="ml-auto flex items-center gap-1">
                    <input
                      type="number"
                      value={c.sortOrder}
                      onChange={(e) => patch(c.id, { sortOrder: Number(e.target.value) || 0 })}
                      title="Sort order"
                      className="w-14 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-center text-xs"
                    />
                    <button
                      onClick={() => patch(c.id, { showOnHome: !c.showOnHome })}
                      title={c.showOnHome ? "Shown on home" : "Hidden from home"}
                      className={`rounded-lg p-2 ${
                        c.showOnHome ? "bg-orange-500/20 text-orange-400" : "text-white/40 hover:bg-white/5"
                      }`}
                    >
                      <Home className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => patch(c.id, { isActive: !c.isActive })}
                      title={c.isActive ? "Active (click to hide)" : "Hidden (click to show)"}
                      className="rounded-lg p-2 text-white/40 hover:bg-white/5"
                    >
                      {c.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      title="Delete"
                      className="rounded-lg p-2 text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
