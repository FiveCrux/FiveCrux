import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { createVerificationRequest, getUserVerificationRequest } from "@/lib/database-new";

// Creator-facing verification: submit a request for the verified badge (POST)
// and read your own latest request + its status (GET).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id as string;
    const roles = ((session.user as any).roles ?? []) as string[];
    const request = await getUserVerificationRequest(userId);
    return NextResponse.json({
      request,
      isVerified: Array.isArray(roles) && roles.includes("verified_creator"),
    });
  } catch (e) {
    console.error("GET /api/verification error:", e);
    return NextResponse.json({ error: "Failed to load verification status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id as string;

    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
    const links = typeof body.links === "string" ? body.links.trim().slice(0, 1000) : "";
    const discord = typeof body.discord === "string" ? body.discord.trim().slice(0, 200) : "";

    if (!reason) {
      return NextResponse.json({ error: "Please tell us a bit about your work." }, { status: 400 });
    }

    const result = await createVerificationRequest({
      userId,
      reason,
      links: links || null,
      discord: discord || null,
    });

    if (!result.ok) {
      if (result.reason === "pending_exists") {
        return NextResponse.json({ error: "You already have a pending request." }, { status: 409 });
      }
      if (result.reason === "already_verified") {
        return NextResponse.json({ error: "You're already a verified creator." }, { status: 409 });
      }
      return NextResponse.json({ error: "Could not submit request." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    console.error("POST /api/verification error:", e);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}
