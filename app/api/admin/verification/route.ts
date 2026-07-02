import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { getPendingVerificationRequests } from "@/lib/database-new";

// Admin queue: pending verification requests to review.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const roles = ((session.user as any).roles ?? []) as string[];
    const isStaff =
      Array.isArray(roles) &&
      (roles.includes("admin") || roles.includes("founder") || roles.includes("moderator"));
    if (!isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const requests = await getPendingVerificationRequests();
    return NextResponse.json({ requests });
  } catch (e) {
    console.error("GET /api/admin/verification error:", e);
    return NextResponse.json({ requests: [] });
  }
}
