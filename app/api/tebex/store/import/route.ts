import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { getPackages, getPackage, type TebexPackage } from "@/lib/tebex";
import { getUserById, createScript, getUserImportedTebexPackageIds, getCategories } from "@/lib/database-new";

// Tebex category names don't always equal our category SLUGs (e.g. Tebex
// "Maps" → our slug "maps", "Scripts" → "script"). The browse/filter chips
// match on SLUG, so importing with the raw Tebex name meant the listing never
// showed under its category. Resolve the Tebex category to a local slug.
const CATEGORY_ALIASES: Record<string, string> = {
  maps: "maps", mlo: "maps", mlos: "maps",
  scripts: "script", script: "script",
  vehicle: "vehicles", vehicles: "vehicles",
  weapon: "weapons", weapons: "weapons",
  clothes: "clothing", clothing: "clothing",
  ped: "peds", peds: "peds",
  economy: "economy",
};
function makeCategoryResolver(cats: { name: string; slug: string }[]) {
  const bySlug = new Map(cats.map((c) => [c.slug.toLowerCase(), c.slug]));
  const byName = new Map(cats.map((c) => [c.name.toLowerCase().trim(), c.slug]));
  return (tebexName?: string | null): string => {
    const n = (tebexName || "").toLowerCase().trim();
    if (!n) return "other";
    if (byName.has(n)) return byName.get(n)!;
    if (bySlug.has(n)) return bySlug.get(n)!;
    const alias = CATEGORY_ALIASES[n];
    if (alias && bySlug.has(alias)) return alias;
    return bySlug.has("other") ? "other" : n;
  };
}

// Import selected Tebex packages as FiveCrux asset listings. Each is created
// (auto-approved, like manual submissions), pre-filled from the Tebex package
// and auto-linked to the seller's store token + package id so Buy Now works.
export const dynamic = "force-dynamic";

const stripHtml = (s: string | null | undefined) =>
  (s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// Preview a single package by id (no import) — used by the "review before
// submit" confirmation modal for the "import by package ID" flow, where the
// client has no package data yet (just a typed-in id).
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id as string;

    const u = await getUserById(userId);
    const token = (u as any)?.tebexStoreToken || null;
    if (!token) {
      return NextResponse.json({ error: "Connect your Tebex store first." }, { status: 400 });
    }

    const id = Number(req.nextUrl.searchParams.get("packageId"));
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid package id." }, { status: 400 });
    }

    const pkg = await getPackage(token, id);
    if (!pkg) return NextResponse.json({ error: "Package not found." }, { status: 404 });

    return NextResponse.json({ package: pkg });
  } catch (e) {
    console.error("GET /api/tebex/store/import error:", e);
    return NextResponse.json({ error: "Could not fetch package." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id as string;

    const u = await getUserById(userId);
    const token = (u as any)?.tebexStoreToken || null;
    if (!token) {
      return NextResponse.json({ error: "Connect your Tebex store first." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    // Two modes:
    //  - bulk: `packageIds` array (fetched from the paginated getPackages() list)
    //  - single: `packageId` — may be a package NOT in the paginated list, so we
    //    fall back to getPackage(token, id) to resolve it directly.
    const singleId =
      body.packageId != null && Number.isFinite(Number(body.packageId))
        ? Number(body.packageId)
        : null;
    const rawIds: unknown[] = Array.isArray(body.packageIds) ? body.packageIds : [];
    const wanted = new Set(rawIds.map((x) => Number(x)).filter((n) => Number.isFinite(n)));
    if (singleId != null) wanted.add(singleId);

    if (wanted.size === 0) {
      return NextResponse.json({ error: "Select at least one package to import." }, { status: 400 });
    }

    // Re-fetch from Tebex so price/name/etc. are authoritative (not client-supplied).
    let packages: TebexPackage[];
    try {
      packages = await getPackages(token);
    } catch {
      return NextResponse.json({ error: "Couldn't reach your Tebex store." }, { status: 502 });
    }

    // If a specific package id was requested but isn't in the paginated list,
    // resolve it directly (e.g. hidden/unlisted packages the seller pasted by id).
    const found = new Set(packages.map((p) => p.id));
    for (const id of wanted) {
      if (found.has(id)) continue;
      try {
        const one = await getPackage(token, id);
        if (one) {
          packages.push(one);
          found.add(one.id);
        }
      } catch {
        // Unknown/inaccessible id — skipped below (never in `packages`).
      }
    }

    const already = new Set(await getUserImportedTebexPackageIds(userId));
    const toImport = packages.filter((p) => wanted.has(p.id) && !already.has(String(p.id)));

    const resolveCategory = makeCategoryResolver(await getCategories());

    let created = 0;
    for (const p of toImport) {
      const price = Number(p.total_price ?? p.base_price ?? 0);
      const description = stripHtml(p.description) || p.name;
      await createScript({
        title: p.name,
        description,
        price: String(price),
        currency: p.currency || null,
        category: resolveCategory(p.category?.name),
        images: p.image ? [p.image] : [],
        coverImage: p.image || null,
        sellerId: userId,
        seller_name: u?.name || "Seller",
        seller_email: u?.email || "unknown@example.com",
        free: price === 0,
        tebexStoreToken: token,
        tebexPackageId: String(p.id),
      } as any);
      created++;
    }

    return NextResponse.json({ created, skipped: wanted.size - created });
  } catch (e) {
    console.error("POST /api/tebex/store/import error:", e);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
