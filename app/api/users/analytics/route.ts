import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { getCreatorAnalytics } from "@/lib/database-new";

// The signed-in creator's own analytics — real recorded data only.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id as string;
    const analytics = await getCreatorAnalytics(userId);
    return NextResponse.json({ analytics });
  } catch (e) {
    console.error("GET /api/users/analytics error:", e);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
