import { NextResponse } from "next/server";

import { getLivePriceMapByKey, isTebexConfigured } from "@/lib/tebex-pricing";

// Live platform pricing for the /advertise UI. Prices are the single source of
// truth in FiveCrux's Tebex store (lib/tebex-pricing). The store token stays
// server-side; the client only receives the resolved key -> price map.
//
// Response: { configured, currency, prices: { "ads:starter:1": 40, ... } }
// Keys with no live price are omitted (UI shows them as unavailable).
//
// Cached at the edge of our own service (the price map is memoized for 5 min in
// lib/tebex-pricing), plus a short s-maxage so the route response is reusable.
export const revalidate = 60;

export async function GET() {
  try {
    const configured = isTebexConfigured();
    const { currency, prices } = await getLivePriceMapByKey();
    return NextResponse.json(
      { configured, currency, prices },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (e) {
    console.error("advertise/pricing error:", e);
    // Never hard-fail the page; report empty + unconfigured so the UI degrades.
    return NextResponse.json({ configured: false, currency: null, prices: {} }, { status: 200 });
  }
}
