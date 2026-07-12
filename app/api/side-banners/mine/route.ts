import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { getUserSideBanners } from "@/lib/database-new";

// The signed-in user's own side-banner slots (active + reserved) — for the
// dashboard, where they upload/edit the banner creative after buying a slot.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rows = await getUserSideBanners((session.user as any).id);
    return NextResponse.json({ bookings: rows });
  } catch (e) {
    // Do NOT return 200 with an empty array here — a query failure is not the
    // same as "you own zero side banners". A 200 would read identically to a
    // genuine empty state and previously made a paying customer's active
    // booking look like it didn't exist during a transient DB error.
    console.error("GET /api/side-banners/mine error:", e);
    return NextResponse.json({ error: "Failed to fetch side banners" }, { status: 500 });
  }
}
