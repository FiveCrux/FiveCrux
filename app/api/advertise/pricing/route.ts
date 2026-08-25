import { NextResponse } from "next/server";

import { getPlatformPriceMap } from "@/lib/platform-pricing";

// Live platform pricing for the /advertise UI.
//
// Response: { configured, currency, prices: { "ads:starter:1": 40, ... } }
//
// NOT cached. This used to carry `revalidate = 60`, which made sense when the
// prices came from a slow external Tebex call. They now come from our own DB
// and are edited from the admin panel, so a cache means an admin changes a
// price and the site keeps quoting the old one for up to a minute — longer
// across edge regions. Being able to change a price and see it immediately is
// the entire point of the pricing screen, and the query is cheap.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Prices are local now that Tebex is gone, so this is always configured.
    const configured = true;
    const { currency, prices } = await getPlatformPriceMap();
    return NextResponse.json(
      { configured, currency, prices },
      { headers: { "Cache-Control": "no-store" } }  // admin-editable price: a CDN
      // copy would keep quoting the old one after a change
    );
  } catch (e) {
    console.error("advertise/pricing error:", e);
    // Never hard-fail the page; report empty + unconfigured so the UI degrades.
    return NextResponse.json({ configured: false, currency: null, prices: {} }, { status: 200 });
  }
}
