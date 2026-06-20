import { NextResponse } from "next/server"

// Ads on the /props page. Prop-specific ad slots aren't a shipped feature yet,
// so this returns an empty set (valid 200) — the /props page fetched this and
// 404'd on every load before. When prop ads ship, back this with getAdsForPage.
export async function GET() {
  return NextResponse.json({ ads: [] })
}
