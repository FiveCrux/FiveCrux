import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db/client";
import { props } from "@/lib/db/schema";
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

    const userProps = await db.select()
      .from(props)
      .where(eq(props.createdBy, (session.user as any).id))
      .orderBy(desc(props.createdAt))
      .limit(limit)
      .offset(offset);

    const totalProps = await db.select({ id: props.id })
      .from(props)
      .where(eq(props.createdBy, (session.user as any).id));

    return NextResponse.json({
      success: true,
      props: userProps,
      total: totalProps.length
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

    const existingProp = await db.query.props.findFirst({
      where: eq(props.id, id),
    });

    if (!existingProp) {
      return NextResponse.json({ error: "Prop not found" }, { status: 404 });
    }

    const userRoles = (session.user as any).roles || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('founder');
    const isOwner = existingProp.createdBy === (session.user as any).id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.delete(props).where(eq(props.id, id));

    return NextResponse.json({ success: true, message: "Prop deleted successfully" });
  } catch (error) {
    console.error("Error deleting user prop:", error);
    return NextResponse.json({ error: "Failed to delete user prop" }, { status: 500 });
  }
}
