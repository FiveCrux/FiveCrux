// Live pricing + DYNAMIC package mapping from Tebex — the SINGLE source of truth
// for platform package prices (ad slots + featured-script slots).
//
// Packages are linked to our internal tier-keys by PARSING the Tebex package
// NAME (e.g. "Ads - Starter - 1 Month" -> ads:starter:1) — so adding/renaming a
// package in Tebex auto-updates the app, NO env map needed. The static/env
// TEBEX_PACKAGE_MAP still works as a manual OVERRIDE when present.
//
// One network fetch (getPackages) builds both a price-by-id map and a
// key->id map, cached in-process with a short TTL + last-known-good on error.
import { getPackages, FIVECRUX_TEBEX_PUBLIC_TOKEN } from "@/lib/tebex";
import { TEBEX_PACKAGE_MAP, tebexPackageKey, getTebexPackageId } from "@/lib/tebex-packages";

const TTL_MS = 5 * 60 * 1000; // 5 minutes

type Price = { amount: number; currency: string };
type Catalog = { priceById: Map<number, Price>; keyToId: Map<string, number> };

let cache: { cat: Catalog; at: number } | null = null;
let inflight: Promise<Catalog> | null = null;

/** True when FiveCrux's Tebex store token is configured (commerce is possible). */
export function isTebexConfigured(): boolean {
  return !!FIVECRUX_TEBEX_PUBLIC_TOKEN;
}

/**
 * Parse a Tebex package NAME into our internal key. Flexible/robust:
 *   "Ads - Starter - 1 Month"         -> "ads:starter:1"
 *   "Featured · Executive · 8 Weeks"  -> "featured-scripts:executive:8"
 *   "Featured Script Premium 4 weeks" -> "featured-scripts:premium:4"
 * Returns null if the name doesn't encode type + tier + duration.
 */
export function parsePackageName(name: string | null | undefined): string | null {
  if (!name) return null;
  const s = String(name).toLowerCase();
  const type = s.includes("featured") ? "featured-scripts" : /\bads?\b/.test(s) ? "ads" : null;
  const tier = (["starter", "premium", "executive"] as const).find((t) => s.includes(t)) || null;
  const dur = s.match(/(\d+)\s*(month|week)/);
  if (!type || !tier || !dur) return null;
  return `${type}:${tier}:${Number(dur[1])}`;
}

async function fetchCatalog(): Promise<Catalog> {
  const pkgs = await getPackages(); // FiveCrux's own store (default token)
  const priceById = new Map<number, Price>();
  const keyToId = new Map<string, number>();
  for (const p of pkgs) {
    const amount = typeof p.total_price === "number" ? p.total_price : p.base_price;
    if (typeof amount === "number") priceById.set(Number(p.id), { amount, currency: p.currency });
    const key = parsePackageName(p.name);
    if (key) keyToId.set(key, Number(p.id)); // dynamic name -> tier-key link
  }
  return { priceById, keyToId };
}

/** Cached catalog (price-by-id + name-derived key->id). Never throws. */
export async function getTebexCatalog(): Promise<Catalog> {
  if (!isTebexConfigured()) return { priceById: new Map(), keyToId: new Map() };
  if (cache && Date.now() - cache.at < TTL_MS) return cache.cat;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const cat = await fetchCatalog();
      cache = { cat, at: Date.now() };
      return cat;
    } catch (e) {
      console.error("[tebex-pricing] getPackages failed:", e instanceof Error ? e.message : e);
      return cache?.cat ?? { priceById: new Map(), keyToId: new Map() };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Tebex package id for a tier-key: env/static map wins, else name-derived map. */
export async function resolveTebexPackageId(
  packageType: string,
  packageId: string,
  duration: number | string
): Promise<number | null> {
  const envId = getTebexPackageId(packageType, packageId, duration);
  if (envId != null) return Number(envId);
  const cat = await getTebexCatalog();
  return cat.keyToId.get(`${packageType}:${packageId}:${duration}`) ?? null;
}

/** Live price for a raw Tebex package id (props carry their own id). */
export async function getLivePriceByPackageId(
  tebexPackageId: number | string | null | undefined
): Promise<Price | null> {
  if (tebexPackageId == null || tebexPackageId === "") return null;
  const cat = await getTebexCatalog();
  return cat.priceById.get(Number(tebexPackageId)) ?? null;
}

/** Live price for one internal tier-key (env override → dynamic name map). */
export async function getLivePriceByKey(
  packageType: string,
  packageId: string,
  duration: number | string
): Promise<Price | null> {
  const id = await resolveTebexPackageId(packageType, packageId, duration);
  if (id == null) return null;
  const cat = await getTebexCatalog();
  return cat.priceById.get(id) ?? null;
}

/**
 * Live price for EVERY mapped tier-key — both env-map keys AND name-derived keys.
 * Feeds /api/advertise/pricing. Keys with no live price are omitted.
 */
export async function getLivePriceMapByKey(): Promise<{ currency: string | null; prices: Record<string, number> }> {
  const cat = await getTebexCatalog();
  const prices: Record<string, number> = {};
  let currency: string | null = null;
  const put = (key: string, id: number) => {
    const hit = cat.priceById.get(Number(id));
    if (hit && prices[key] == null) { prices[key] = hit.amount; currency ??= hit.currency; }
  };
  // 1. Manual env/static overrides.
  for (const [key, id] of Object.entries(TEBEX_PACKAGE_MAP)) put(key, Number(id));
  // 2. Dynamic name-derived links.
  for (const [key, id] of cat.keyToId) put(key, id);
  return { currency, prices };
}

export { tebexPackageKey };
