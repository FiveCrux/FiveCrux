import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { getAllFrameworks, createFramework } from "@/lib/database-new";

const STAFF = ["admin", "founder", "moderator"];

async function requireStaff() {
  const session = await getServerSession(authOptions);
  const roles = (session?.user as any)?.roles || [];
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const;
  if (!STAFF.some((r) => roles.includes(r))) return { error: "Forbidden", status: 403 } as const;
  return { ok: true } as const;
}

export async function GET() {
  const auth = await requireStaff();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ frameworks: await getAllFrameworks() });
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const b = await req.json();
    const row = await createFramework({
      name: b.name,
      slug: b.slug,
      isActive: b.isActive ?? true,
      sortOrder: Number(b.sortOrder) || 0,
    } as any);
    return NextResponse.json({ framework: row }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create framework" }, { status: 400 });
  }
}
