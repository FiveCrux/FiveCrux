import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  approveProp,
  getApprovedProps,
  getPendingProps,
  getRejectedProps,
  rejectProp,
} from "@/lib/database-new";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes("admin") && !userRoles.includes("founder")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let props: any[] = [];
    let hasMore = false;

    if (!status || status === "all") {
      const [pending, approved, rejected] = await Promise.all([
        getPendingProps(limit + offset + 1),
        getApprovedProps(limit + offset + 1),
        getRejectedProps(limit + offset + 1),
      ]);

      const allProps = [
        ...pending.map((p: any) => ({ ...p, status: "pending", created_at: p.createdAt || p.submittedAt })),
        ...approved.map((p: any) => ({ ...p, status: "approved", created_at: p.createdAt || p.approvedAt })),
        ...rejected.map((p: any) => ({
          ...p,
          status: "rejected",
          created_at: p.createdAt || p.rejectedAt,
          rejection_reason: p.rejectionReason,
        })),
      ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      props = allProps.slice(offset, offset + limit);
      hasMore = allProps.length > offset + limit;
    } else if (status === "pending") {
      const allProps = (await getPendingProps(limit + offset + 1)).map((p: any) => ({
        ...p,
        status: "pending",
        created_at: p.createdAt || p.submittedAt,
      }));
      props = allProps.slice(offset, offset + limit);
      hasMore = allProps.length > offset + limit;
    } else if (status === "approved") {
      const allProps = (await getApprovedProps(limit + offset + 1)).map((p: any) => ({
        ...p,
        status: "approved",
        created_at: p.createdAt || p.approvedAt,
      }));
      props = allProps.slice(offset, offset + limit);
      hasMore = allProps.length > offset + limit;
    } else if (status === "rejected") {
      const allProps = (await getRejectedProps(limit + offset + 1)).map((p: any) => ({
        ...p,
        status: "rejected",
        created_at: p.createdAt || p.rejectedAt,
        rejection_reason: p.rejectionReason,
      }));
      props = allProps.slice(offset, offset + limit);
      hasMore = allProps.length > offset + limit;
    }

    return NextResponse.json({ props, hasMore });
  } catch (error) {
    console.error("Error in admin props API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes("admin") && !userRoles.includes("founder")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { propId, status, reason, adminNotes } = body;

    if (!propId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (status === "approved") {
      const result = await approveProp(String(propId), (session.user as any).id, adminNotes);
      return NextResponse.json({ success: true, result });
    }

    if (status === "rejected") {
      if (!reason) {
        return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
      }

      const result = await rejectProp(String(propId), (session.user as any).id, reason, adminNotes);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  } catch (error) {
    console.error("Error in admin props PATCH API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
