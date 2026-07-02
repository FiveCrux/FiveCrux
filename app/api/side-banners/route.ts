import { NextResponse } from "next/server";

import {
  getActiveSideBanners,
  getSideBannerAvailability,
  SIDE_BANNER_POSITIONS,
} from "@/lib/database-new";

// Public: the live side-banner state (4 slots: each rail split top + bottom).
//   active       → { 'left-top'?: {...}, 'left-bottom'?: {...}, ... }  (every page)
//   availability → { 'left-top': {available,...}, ... }               (advertise UI)
// Not CDN-cached: availability must be fresh so a just-sold slot disables instantly.
export const dynamic = "force-dynamic";

export async function GET() {
  // Trim active rows to display-safe fields.
  const trim = (r: any) =>
    r
      ? {
          id: r.id,
          position: r.position,
          title: r.title,
          imageUrl: r.imageUrl,
          linkUrl: r.linkUrl,
          endDate: r.endDate,
        }
      : null;

  try {
    const [active, availability] = await Promise.all([
      getActiveSideBanners(),
      getSideBannerAvailability(),
    ]);
    const activeByPos: Record<string, ReturnType<typeof trim>> = {};
    for (const pos of SIDE_BANNER_POSITIONS) activeByPos[pos] = trim(active[pos]);
    return NextResponse.json({ active: activeByPos, availability });
  } catch (e) {
    console.error("GET /api/side-banners error:", e);
    const emptyActive: Record<string, null> = {};
    const emptyAvail: Record<string, { available: boolean }> = {};
    for (const pos of SIDE_BANNER_POSITIONS) {
      emptyActive[pos] = null;
      emptyAvail[pos] = { available: true };
    }
    return NextResponse.json({ active: emptyActive, availability: emptyAvail });
  }
}
