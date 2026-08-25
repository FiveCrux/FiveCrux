import { NextResponse } from "next/server";

import { getSideBannerPackages } from "@/lib/platform-pricing";

// Public: the side-banner DURATION packages, read from the local price table (Tebex removed)
// "SIDE ADVERTISEMENT" category (mirrors /api/props reading the PROPS category).
// The advertise UI renders its durations + prices from this — adding/renaming a
// package in Tebex reflects here with no code change. Empty array on error/none.
export const revalidate = 60;

export async function GET() {
  try {
    const packages = getSideBannerPackages();
    return NextResponse.json(
      { packages },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (e) {
    console.error("GET /api/side-banners/packages error:", e);
    return NextResponse.json({ packages: [] }, { status: 200 });
  }
}
