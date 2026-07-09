// Detailed per-ad analytics: event recording + aggregation for the
// "Detailed Analytics" view (daily trend, traffic sources, geography).
// Sits ALONGSIDE the existing cheap running-total counters (view_count /
// click_count on approved_ads / featured_scripts) — those stay as the fast
// "total so far" number; this table is the queryable, date-ranged layer.
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { adEvents } from "@/lib/db/schema";

export type AdType = "ad" | "featured_script" | "side_banner";
export type AdEventType = "impression" | "click";

// Buckets a raw Referer header into a small, human-readable source label —
// mirrors what any "traffic sources" panel shows (direct / search / internal
// navigation / other external sites).
export function classifySource(referrer: string | null | undefined, requestHost: string | null | undefined): string {
  if (!referrer) return "direct";
  try {
    const url = new URL(referrer);
    const host = url.hostname.replace(/^www\./, "");
    if (requestHost && host === requestHost.replace(/^www\./, "")) return "fivecrux";
    if (/google\.|bing\.|duckduckgo\.|yahoo\./.test(host)) return "search";
    return "external";
  } catch {
    return "direct";
  }
}

// Vercel injects geo headers on every request in production — no raw IP is
// ever read or stored, just the country Vercel already resolved edge-side.
export function getCountryFromHeaders(headers: Headers): string | null {
  return (
    headers.get("x-vercel-ip-country") ||
    headers.get("x-vercel-ip-country-region") ||
    null
  );
}

export async function recordAdEvent(params: {
  adType: AdType;
  adId: string | number;
  eventType: AdEventType;
  referrer?: string | null;
  requestHost?: string | null;
  country?: string | null;
}): Promise<void> {
  try {
    await db.insert(adEvents).values({
      adType: params.adType,
      adId: String(params.adId),
      eventType: params.eventType,
      source: classifySource(params.referrer, params.requestHost),
      country: params.country ?? null,
    });
  } catch (e) {
    // Analytics must never break the actual view/click tracking it rides on.
    console.error("recordAdEvent failed:", e);
  }
}

export type AdDetailedAnalytics = {
  totalImpressions: number;
  totalClicks: number;
  dailyTrend: { date: string; impressions: number; clicks: number }[];
  trafficSources: { source: string; count: number; percent: number }[];
  geography: { country: string; count: number; percent: number }[];
};

// One ad's full analytics for [from, to] (inclusive day range). All numbers
// come from ad_events rows only that ad recorded — no fabricated data.
export async function getAdDetailedAnalytics(
  adType: AdType,
  adId: string | number,
  from: Date,
  to: Date
): Promise<AdDetailedAnalytics> {
  const adIdStr = String(adId);
  const where = and(
    eq(adEvents.adType, adType),
    eq(adEvents.adId, adIdStr),
    gte(adEvents.createdAt, from),
    lte(adEvents.createdAt, to)
  );

  const rows = await db
    .select({
      eventType: adEvents.eventType,
      source: adEvents.source,
      country: adEvents.country,
      day: sql<string>`to_char(${adEvents.createdAt}, 'YYYY-MM-DD')`,
    })
    .from(adEvents)
    .where(where);

  let totalImpressions = 0;
  let totalClicks = 0;
  const byDay = new Map<string, { impressions: number; clicks: number }>();
  const bySource = new Map<string, number>();
  const byCountry = new Map<string, number>();

  for (const r of rows) {
    const isImpression = r.eventType === "impression";
    if (isImpression) totalImpressions++;
    else totalClicks++;

    const day = byDay.get(r.day) ?? { impressions: 0, clicks: 0 };
    if (isImpression) day.impressions++;
    else day.clicks++;
    byDay.set(r.day, day);

    if (isImpression) {
      const src = r.source || "direct";
      bySource.set(src, (bySource.get(src) ?? 0) + 1);
      const country = r.country || "Other";
      byCountry.set(country, (byCountry.get(country) ?? 0) + 1);
    }
  }

  const dailyTrend = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  const sourceTotal = totalImpressions || 1;
  const trafficSources = Array.from(bySource.entries())
    .map(([source, count]) => ({ source, count, percent: Math.round((count / sourceTotal) * 100) }))
    .sort((a, b) => b.count - a.count);

  const countryTotal = totalImpressions || 1;
  const geography = Array.from(byCountry.entries())
    .map(([country, count]) => ({ country, count, percent: Math.round((count / countryTotal) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { totalImpressions, totalClicks, dailyTrend, trafficSources, geography };
}
