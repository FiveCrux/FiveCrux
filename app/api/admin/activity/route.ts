import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { getRecentActivity } from "@/lib/database-new";

const STAFF = ["admin", "founder", "moderator"];

async function requireStaff() {
  const session = await getServerSession(authOptions);
  const roles = (session?.user as any)?.roles || [];
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const;
  if (!STAFF.some((r) => roles.includes(r))) return { error: "Forbidden", status: 403 } as const;
  return { ok: true } as const;
}

export async function GET(req: NextRequest) {
  const auth = await requireStaff();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

  return NextResponse.json({ activity: await getRecentActivity(limit) });
}
