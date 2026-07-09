// Ad Detailed Analytics: record events (impression/click) and verify the
// aggregation (totals, daily trend, traffic sources, geography) matches.
//   Run: npx tsx scripts/test-ad-analytics.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-ads";
process.env.DATABASE_URL ||= "postgres://placeholder/local";
process.env.NEXTAUTH_SECRET ||= "x";
process.env.DISCORD_CLIENT_ID ||= "x";
process.env.DISCORD_CLIENT_SECRET ||= "x";

import { rmSync } from "node:fs";

async function main() {
  rmSync("./.pglite-test-ads", { recursive: true, force: true });
  const { db } = await import("../lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { recordAdEvent, getAdDetailedAnalytics, classifySource } = await import("../lib/ad-analytics");

  await migrate(db as any, { migrationsFolder: "./drizzle" });

  let pass = 0, fail = 0;
  const check = (name: string, cond: boolean, extra?: any) => {
    console.log(`  ${cond ? "✓" : "✗"} ${name}${extra !== undefined ? "  → " + JSON.stringify(extra) : ""}`);
    cond ? pass++ : fail++;
  };

  // 1. Source classification.
  check("no referrer -> direct", classifySource(null, "fivecrux.com") === "direct");
  check("same-site referrer -> fivecrux", classifySource("https://fivecrux.com/scripts", "fivecrux.com") === "fivecrux");
  check("google referrer -> search", classifySource("https://www.google.com/search?q=x", "fivecrux.com") === "search");
  check("random external referrer -> external", classifySource("https://reddit.com/r/fivem", "fivecrux.com") === "external");

  // 2. Record a mix of impressions/clicks for one ad across sources/countries.
  const adId = "test-ad-1";
  await recordAdEvent({ adType: "ad", adId, eventType: "impression", referrer: null, requestHost: "fivecrux.com", country: "US" });
  await recordAdEvent({ adType: "ad", adId, eventType: "impression", referrer: "https://fivecrux.com/scripts", requestHost: "fivecrux.com", country: "FR" });
  await recordAdEvent({ adType: "ad", adId, eventType: "impression", referrer: "https://www.google.com/search?q=x", requestHost: "fivecrux.com", country: "US" });
  await recordAdEvent({ adType: "ad", adId, eventType: "click", referrer: null, requestHost: "fivecrux.com", country: "US" });

  // A different ad's events must never leak into ad-1's analytics.
  await recordAdEvent({ adType: "ad", adId: "other-ad", eventType: "impression", referrer: null, requestHost: "fivecrux.com", country: "DE" });

  const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const to = new Date(Date.now() + 60 * 1000);
  const analytics = await getAdDetailedAnalytics("ad", adId, from, to);

  check("totalImpressions == 3", analytics.totalImpressions === 3, analytics.totalImpressions);
  check("totalClicks == 1", analytics.totalClicks === 1, analytics.totalClicks);
  check("dailyTrend has exactly 1 day bucket (all today)", analytics.dailyTrend.length === 1, analytics.dailyTrend);
  check("dailyTrend day has 3 impressions + 1 click", analytics.dailyTrend[0]?.impressions === 3 && analytics.dailyTrend[0]?.clicks === 1, analytics.dailyTrend[0]);

  const sourceMap = Object.fromEntries(analytics.trafficSources.map((s) => [s.source, s.count]));
  check("traffic sources: direct=1, fivecrux=1, search=1", sourceMap.direct === 1 && sourceMap.fivecrux === 1 && sourceMap.search === 1, sourceMap);

  const countryMap = Object.fromEntries(analytics.geography.map((g) => [g.country, g.count]));
  check("geography: US=2, FR=1", countryMap.US === 2 && countryMap.FR === 1, countryMap);
  check("other ad's DE impression does not leak in", countryMap.DE === undefined, countryMap);

  // 3. Isolation: querying "other-ad" only sees its own 1 impression.
  const otherAnalytics = await getAdDetailedAnalytics("ad", "other-ad", from, to);
  check("other-ad analytics isolated (1 impression, 0 clicks)", otherAnalytics.totalImpressions === 1 && otherAnalytics.totalClicks === 0, otherAnalytics);

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error("test crashed:", e); process.exit(1); });
