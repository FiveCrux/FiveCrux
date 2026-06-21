import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { updateCategory, deleteCategory } from "@/lib/database-new";

const STAFF = ["admin", "founder", "moderator"];

async function requireStaff() {
  const session = await getServerSession(authOptions);
  const roles = (session?.user as any)?.roles || [];
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const;
  if (!STAFF.some((r) => roles.includes(r))) return { error: "Forbidden", status: 403 } as const;
  return { ok: true } as const;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  try {
    const b = await req.json();
    const patch: any = {};
    for (const k of ["name", "slug", "icon", "appliesTo", "isActive", "showOnHome", "homeOrder", "sortOrder"]) {
      if (b[k] !== undefined) patch[k] = b[k];
    }
    if (patch.homeOrder !== undefined) patch.homeOrder = Number(patch.homeOrder) || 0;
    if (patch.sortOrder !== undefined) patch.sortOrder = Number(patch.sortOrder) || 0;
    const row = await updateCategory(Number(id), patch);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ category: row });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const row = await deleteCategory(Number(id));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
