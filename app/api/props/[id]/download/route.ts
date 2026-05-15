import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db/client";
import { props } from "@/lib/db/schema";
import { hasPurchasedProp } from "@/lib/prop-utils";
import { eq } from "drizzle-orm";
import { hasRole } from "@/lib/database-new";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const prop = await db.query.props.findFirst({
      where: eq(props.id, id),
    });

    if (!prop) {
      return NextResponse.json({ error: "Prop not found" }, { status: 404 });
    }

    const userRoles = (session.user as any).roles || [];
    const isAdmin = hasRole(userRoles, 'admin') || hasRole(userRoles, 'founder');
    const isOwner = prop.createdBy === (session.user as any).id;
    const hasPurchased = await hasPurchasedProp((session.user as any).id, prop.id);

    if (!isAdmin && !isOwner && !hasPurchased) {
      return NextResponse.json({ error: "Unauthorized: You must purchase this prop to download it" }, { status: 403 });
    }

    // Usually, you would return the file or a signed URL. 
    // Since the zip file might be an S3 link or similar, we return the URL for the frontend to download.
    // If it's a direct file path, we would stream it. Assuming it's an S3 URL or direct link for now.
    return NextResponse.json({ success: true, downloadUrl: prop.zipFile });
  } catch (error) {
    console.error("Error downloading prop:", error);
    return NextResponse.json({ error: "Failed to download prop" }, { status: 500 });
  }
}
