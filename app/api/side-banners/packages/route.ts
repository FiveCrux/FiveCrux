import { NextResponse } from "next/server";

import { getSideBannerPackages } from "@/lib/platform-pricing";

// Public: the side-banner DURATION packages, read from the local price table (Tebex removed)
// "SIDE ADVERTISEMENT" category (mirrors /api/props reading the PROPS category).
// The advertise UI renders its durations + prices from this — adding/renaming a
// package in Tebex reflects here with no code change. Empty array on error/none.
// Not cached: side-banner prices are admin-editable and must apply at once.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const packages = await getSideBannerPackages();
    return NextResponse.json(
      { packages },
      { headers: { "Cache-Control": "no-store" } }  // admin-editable price: a CDN
      // copy would keep quoting the old one after a change
    );
  } catch (e) {
    console.error("GET /api/side-banners/packages error:", e);
    return NextResponse.json({ packages: [] }, { status: 200 });
  }
}
