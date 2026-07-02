import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { setGiveawayWinnerDelivered } from "@/lib/database-new";

// Toggle a winner's "Delivered" flag + notes. OWNER-CHECKED in the DB layer:
// the winner's prize must belong to a giveaway the caller created.
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const creatorId = (session.user as any).id as string;

    const { id } = await params;
    const winnerId = Number(id);
    if (!Number.isFinite(winnerId)) {
      return NextResponse.json({ error: "Invalid winner id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const delivered = !!body.delivered;
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "";

    const result = await setGiveawayWinnerDelivered(winnerId, creatorId, delivered, notes || null);
    if (!result.ok) {
      if (result.reason === "not_found") {
        return NextResponse.json({ error: "Winner not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "You don't own this giveaway" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/giveaways/winners/[id] error:", e);
    return NextResponse.json({ error: "Failed to update winner" }, { status: 500 });
  }
}
