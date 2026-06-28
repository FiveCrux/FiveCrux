import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { updateSideBannerCreative } from "@/lib/database-new";

// PATCH /api/side-banners/:id — owner sets/edits the banner creative (image,
// link, title) on a slot they bought. Mirrors managing an ad after buying its slot.
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const bookingId = Number(id);
    if (!Number.isFinite(bookingId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim().slice(0, 600) : null;
    const linkUrl = typeof body.linkUrl === "string" ? body.linkUrl.trim().slice(0, 600) : null;
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : null;

    const res = await updateSideBannerCreative(bookingId, (session.user as any).id, { imageUrl, linkUrl, title });
    if (!res.ok) {
      const status = res.reason === "forbidden" ? 403 : res.reason === "not_found" ? 404 : 400;
      return NextResponse.json({ error: res.reason || "Could not update" }, { status });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("PATCH /api/side-banners/[id] error:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
