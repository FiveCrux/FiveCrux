import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { getAllCategories, createCategory } from "@/lib/database-new";

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
  return NextResponse.json({ categories: await getAllCategories() });
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const b = await req.json();
    const row = await createCategory({
      name: b.name,
      slug: b.slug,
      icon: b.icon ?? null,
      appliesTo: b.appliesTo ?? "scripts",
      isActive: b.isActive ?? true,
      showOnHome: b.showOnHome ?? false,
      homeOrder: Number(b.homeOrder) || 0,
      sortOrder: Number(b.sortOrder) || 0,
    } as any);
    return NextResponse.json({ category: row }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create category" }, { status: 400 });
  }
}
