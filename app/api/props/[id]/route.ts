import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db/client";
import { props } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasRole } from "@/lib/database-new";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prop = await db.query.props.findFirst({
      where: eq(props.id, id),
    });

    if (!prop) {
      return NextResponse.json({ error: "Prop not found" }, { status: 404 });
    }

    return NextResponse.json(prop);
  } catch (error) {
    console.error("Error fetching prop:", error);
    return NextResponse.json({ error: "Failed to fetch prop" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingProp = await db.query.props.findFirst({
      where: eq(props.id, id),
    });

    if (!existingProp) {
      return NextResponse.json({ error: "Prop not found" }, { status: 404 });
    }

    const userRoles = (session.user as any).roles || [];
    const isAdmin = hasRole(userRoles, 'admin') || hasRole(userRoles, 'founder');
    const isOwner = existingProp.createdBy === (session.user as any).id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, price, discountPercentage, images, zipFile } = body;

    const updates: any = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (images) updates.images = images;
    if (zipFile) updates.zipFile = zipFile;

    if (price !== undefined || discountPercentage !== undefined) {
      const priceNum = price !== undefined ? parseFloat(price) : parseFloat(existingProp.price);
      const discountNum = discountPercentage !== undefined ? parseFloat(discountPercentage) : parseFloat(existingProp.discountPercentage || '0');
      
      if (priceNum < 0 || discountNum < 0 || discountNum > 100) {
        return NextResponse.json({ error: "Invalid price or discount" }, { status: 400 });
      }

      updates.price = priceNum.toString();
      updates.discountPercentage = discountNum.toString();

      if (discountNum > 0) {
        updates.discountedPrice = (priceNum - (priceNum * discountNum / 100)).toString();
      } else {
        updates.discountedPrice = null;
      }
    }

    updates.updatedAt = new Date();

    const updatedProp = await db.update(props)
      .set(updates)
      .where(eq(props.id, id))
      .returning();

    return NextResponse.json({ success: true, prop: updatedProp[0] });
  } catch (error) {
    console.error("Error updating prop:", error);
    return NextResponse.json({ error: "Failed to update prop" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingProp = await db.query.props.findFirst({
      where: eq(props.id, id),
    });

    if (!existingProp) {
      return NextResponse.json({ error: "Prop not found" }, { status: 404 });
    }

    const userRoles = (session.user as any).roles || [];
    const isAdmin = hasRole(userRoles, 'admin') || hasRole(userRoles, 'founder');
    const isOwner = existingProp.createdBy === (session.user as any).id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.delete(props).where(eq(props.id, id));

    return NextResponse.json({ success: true, message: "Prop deleted successfully" });
  } catch (error) {
    console.error("Error deleting prop:", error);
    return NextResponse.json({ error: "Failed to delete prop" }, { status: 500 });
  }
}
