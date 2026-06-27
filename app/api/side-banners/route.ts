import { NextResponse } from "next/server";

import { getActiveSideBanners, getSideBannerAvailability } from "@/lib/database-new";

// Public: the live side-banner state.
//   active       → { left?: {...}, right?: {...} }  (shown on every page)
//   availability → { left: {available,...}, right: {...} }  (advertise UI)
// Not CDN-cached: availability must be fresh so a just-sold slot disables instantly.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [active, availability] = await Promise.all([
      getActiveSideBanners(),
      getSideBannerAvailability(),
    ]);
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
    return NextResponse.json({
      active: { left: trim(active.left), right: trim(active.right) },
      availability,
    });
  } catch (e) {
    console.error("GET /api/side-banners error:", e);
    return NextResponse.json({ active: { left: null, right: null }, availability: { left: { available: true }, right: { available: true } } });
  }
}
