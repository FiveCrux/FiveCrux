// Live pricing from Tebex — the SINGLE source of truth for platform package
// prices (ad slots + featured-script slots). Prices are NOT hardcoded anywhere;
// they come from FiveCrux's own Tebex store via the Headless API and are mapped
// to our internal package keys through lib/tebex-packages.ts.
//
// Design:
//   • One network fetch (getPackages on FiveCrux's store) builds a
//     packageId -> price map, cached in-process with a short TTL.
//   • On a fetch error we serve the last-known-good cache (caching, not a
//     hardcoded fallback) so a transient Tebex hiccup doesn't blank the page.
//   • getLivePriceByKey() resolves an internal key (`${type}:${tier}:${dur}`)
//     to its live price via the package-id map. Returns null when the package
//     isn't configured yet (no token / id not mapped / Tebex has no such id).
import { getPackages, FIVECRUX_TEBEX_PUBLIC_TOKEN } from "@/lib/tebex";
import { TEBEX_PACKAGE_MAP, tebexPackageKey, getTebexPackageId } from "@/lib/tebex-packages";

const TTL_MS = 5 * 60 * 1000; // 5 minutes

type PriceMap = Map<number, { amount: number; currency: string }>;

let cache: { map: PriceMap; at: number } | null = null;
let inflight: Promise<PriceMap> | null = null;

/** True when FiveCrux's Tebex store token is configured (commerce is possible). */
export function isTebexConfigured(): boolean {
  return !!FIVECRUX_TEBEX_PUBLIC_TOKEN;
}

async function fetchPriceMap(): Promise<PriceMap> {
  const pkgs = await getPackages(); // FiveCrux's own store (default token)
  const map: PriceMap = new Map();
  for (const p of pkgs) {
    // total_price = what the buyer actually pays (incl. discount); fall back to base.
    const amount = typeof p.total_price === "number" ? p.total_price : p.base_price;
    if (typeof amount === "number") map.set(Number(p.id), { amount, currency: p.currency });
  }
  return map;
}

/**
 * Returns the cached packageId -> price map, refreshing if stale. Never throws:
 * on error it returns the last-known-good cache, or an empty map if we never
 * succeeded (callers treat "missing" as "not configured yet").
 */
export async function getTebexPriceMap(): Promise<PriceMap> {
  if (!isTebexConfigured()) return new Map();
  const fresh = cache && Date.now() - cache.at < TTL_MS;
  if (fresh) return cache!.map;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const map = await fetchPriceMap();
      cache = { map, at: Date.now() };
      return map;
    } catch (e) {
      console.error("[tebex-pricing] getPackages failed:", e instanceof Error ? e.message : e);
      return cache?.map ?? new Map(); // last-known-good, else empty
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Live price for a raw Tebex package id (used by props, which carry their own
 * `tebex_package_id` rather than an ad/featured catalog key). Null if not found.
 */
export async function getLivePriceByPackageId(
  tebexPackageId: number | string | null | undefined
): Promise<{ amount: number; currency: string } | null> {
  if (tebexPackageId == null || tebexPackageId === "") return null;
  const map = await getTebexPriceMap();
  return map.get(Number(tebexPackageId)) ?? null;
}

/** Live price for one internal package key, or null if not configured/priced. */
export async function getLivePriceByKey(
  packageType: string,
  packageId: string,
  duration: number | string
): Promise<{ amount: number; currency: string } | null> {
  const tebexId = getTebexPackageId(packageType, packageId, duration);
  if (tebexId == null) return null;
  const map = await getTebexPriceMap();
  return map.get(Number(tebexId)) ?? null;
}

/**
 * Live price for EVERY configured key in TEBEX_PACKAGE_MAP. Used by the
 * /api/advertise/pricing endpoint to feed the UI. Keys with no live price are
 * omitted (UI shows them as unavailable).
 */
export async function getLivePriceMapByKey(): Promise<{
  currency: string | null;
  prices: Record<string, number>;
}> {
  const priceMap = await getTebexPriceMap();
  const prices: Record<string, number> = {};
  let currency: string | null = null;
  for (const [key, tebexId] of Object.entries(TEBEX_PACKAGE_MAP)) {
    const hit = priceMap.get(Number(tebexId));
    if (hit) {
      prices[key] = hit.amount;
      currency ??= hit.currency;
    }
  }
  return { currency, prices };
}

export { tebexPackageKey };
