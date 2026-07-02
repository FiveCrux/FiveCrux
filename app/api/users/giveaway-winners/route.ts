import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { getCreatorGiveawayWinners } from "@/lib/database-new";

// Winners across the authenticated creator's OWN giveaways (delivery tracker).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id as string;

    const winners = await getCreatorGiveawayWinners(userId);
    return NextResponse.json({ winners });
  } catch (e) {
    console.error("GET /api/users/giveaway-winners error:", e);
    return NextResponse.json({ error: "Failed to load giveaway winners" }, { status: 500 });
  }
}
