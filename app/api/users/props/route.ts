import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db/client";
import { approvedProps, pendingProps, rejectedProps } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const userId = (session.user as any).id;

    const [pending, approved, rejected] = await Promise.all([
      db.select().from(pendingProps).where(eq(pendingProps.createdBy, userId)).orderBy(desc(pendingProps.submittedAt)),
      db.select().from(approvedProps).where(eq(approvedProps.createdBy, userId)).orderBy(desc(approvedProps.createdAt)),
      db.select().from(rejectedProps).where(eq(rejectedProps.createdBy, userId)).orderBy(desc(rejectedProps.rejectedAt)),
    ]);

    const allProps = [
      ...pending.map((p) => ({ ...p, status: "pending", created_at: p.createdAt || p.submittedAt })),
      ...approved.map((p) => ({ ...p, status: "approved", created_at: p.createdAt || p.approvedAt })),
      ...rejected.map((p) => ({
        ...p,
        status: "rejected",
        created_at: p.createdAt || p.rejectedAt,
        rejection_reason: p.rejectionReason,
      })),
    ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const userProps = allProps.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      props: userProps,
      total: allProps.length
    });
  } catch (error) {
    console.error("Error fetching user props:", error);
    return NextResponse.json({ error: "Failed to fetch user props" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Prop ID is required" }, { status: 400 });
    }

    const [pending, approved, rejected] = await Promise.all([
      db.select().from(pendingProps).where(eq(pendingProps.id, id)).limit(1),
      db.select().from(approvedProps).where(eq(approvedProps.id, id)).limit(1),
      db.select().from(rejectedProps).where(eq(rejectedProps.id, id)).limit(1),
    ]);

    const existingProp = pending[0] || approved[0] || rejected[0];

    if (!existingProp) {
      return NextResponse.json({ error: "Prop not found" }, { status: 404 });
    }

    const userRoles = (session.user as any).roles || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('founder');
    const isOwner = existingProp.createdBy === (session.user as any).id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (pending[0]) {
      await db.delete(pendingProps).where(eq(pendingProps.id, id));
    } else if (approved[0]) {
      await db.delete(approvedProps).where(eq(approvedProps.id, id));
    } else {
      await db.delete(rejectedProps).where(eq(rejectedProps.id, id));
    }

    return NextResponse.json({ success: true, message: "Prop deleted successfully" });
  } catch (error) {
    console.error("Error deleting user prop:", error);
    return NextResponse.json({ error: "Failed to delete user prop" }, { status: 500 });
  }
}
