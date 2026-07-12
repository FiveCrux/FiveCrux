"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, Eye, EyeOff, Loader2, GripVertical } from "lucide-react";

type Framework = {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function AdminFrameworksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rows, setRows] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", slug: "" });
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return void router.push("/auth/signin");
    const roles = (session?.user as any)?.roles || [];
    if (!["admin", "founder", "moderator"].some((r) => roles.includes(r))) router.push("/");
  }, [session, status, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/frameworks", { cache: "no-store" });
      const d = await r.json();
      if (r.ok) setRows(d.frameworks || []);
      else setError(d.error || "Failed to load");
    } catch {
      setError("Failed to load frameworks");
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
    try {
      const r = await fetch("/api/admin/frameworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name, slug: draft.slug || slugify(draft.name) }),
      });
      const d = await r.json();
      if (!r.ok) return setError(d.error || "Failed to create");
      setDraft({ name: "", slug: "" });
      setSlugTouched(false);
      await load();
    } finally {
      setSaving(null);
    }
  };

  const patch = async (id: number, changes: Partial<Framework>) => {
    setSaving(id);
    setError(null);
    setRows((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));
    try {
      const r = await fetch(`/api/admin/frameworks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!r.ok) {
        const d = await r.json();
        setError(d.error || "Failed to update");
        await load();
      }
    } finally {
      setSaving(null);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this framework? Assets already tagged with it keep their tag.")) return;
    setSaving(id);
    try {
      const r = await fetch(`/api/admin/frameworks/${id}`, { method: "DELETE" });
      if (r.ok) setRows((prev) => prev.filter((c) => c.id !== id));
      else setError("Failed to delete");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold">Frameworks</h1>
        <p className="mt-1 text-sm text-white/50">
          The framework filter (QBCore, ESX, OX, …) shown on /scripts and the submit form. Add,
          hide, or reorder them here.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Add new */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/60">
            <Plus className="h-4 w-4" /> Add framework
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label className="mb-1 block text-[11px] text-white/40">Name</label>
              <input
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({
                    name: e.target.value,
                    slug: slugTouched ? d.slug : slugify(e.target.value),
                  }))
                }
                placeholder="e.g. QBCore"
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
                placeholder="qbcore"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
              />
            </div>
            <button
              onClick={create}
              disabled={saving === "new"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400 disabled:opacity-50"
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
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">No frameworks yet. Add one above.</p>
          ) : (
            rows.map((c) => {
              const busy = saving === c.id;
              return (
                <div
                  key={c.id}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 ${
                    c.isActive ? "" : "opacity-50"
                  }`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-white/20" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    <div className="truncate text-[11px] text-white/40">/{c.slug}</div>
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
