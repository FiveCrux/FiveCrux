import { NextResponse } from "next/server";
// ADS-DISABLED 2026-08-16: advertising disabled — payment gateway rejected the
// ad business. Restore by uncommenting. See .hudson/specs/disable-advertiser-flows.md
// import { getSideAdPackages } from "@/lib/tebex-side-ads";

// Public: the side-banner DURATION packages, read live from the Tebex
// "SIDE ADVERTISEMENT" category (mirrors /api/props reading the PROPS category).
// The advertise UI renders its durations + prices from this — adding/renaming a
// package in Tebex reflects here with no code change. Empty array on error/none.
export const revalidate = 60;

export async function GET() {
  // ADS-DISABLED 2026-08-16: advertising disabled — payment gateway rejected the
  // ad business. Restore by uncommenting. See .hudson/specs/disable-advertiser-flows.md
  return NextResponse.json({ error: "Advertising is not available" }, { status: 410 });

  /* ADS-DISABLED 2026-08-16: original implementation kept below for restore.
  try {
    const packages = await getSideAdPackages();
    return NextResponse.json(
      { packages },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (e) {
    console.error("GET /api/side-banners/packages error:", e);
    return NextResponse.json({ packages: [] }, { status: 200 });
  }
  */
}
