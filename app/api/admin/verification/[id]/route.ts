import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { reviewVerificationRequest } from "@/lib/database-new";

// Admin action: approve (grants the verified_creator role) or reject (with a
// reason) a verification request.
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const roles = ((session.user as any).roles ?? []) as string[];
    const isStaff =
      Array.isArray(roles) &&
      (roles.includes("admin") || roles.includes("founder") || roles.includes("moderator"));
    if (!isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const requestId = Number(id);
    if (!Number.isFinite(requestId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action === "approve" ? "approve" : body.action === "reject" ? "reject" : null;
    if (!action) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const adminReason =
      typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : null;
    if (action === "reject" && !adminReason) {
      return NextResponse.json({ error: "A reason is required to reject." }, { status: 400 });
    }

    const adminId = (session.user as any).id as string;
    const result = await reviewVerificationRequest(requestId, adminId, action, adminReason);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason ?? "Failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/admin/verification/[id] error:", e);
    return NextResponse.json({ error: "Failed to review request" }, { status: 500 });
  }
}
