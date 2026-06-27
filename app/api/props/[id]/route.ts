import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db/client";
import { approvedProps, pendingProps, rejectedProps, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasRole } from "@/lib/database-new";
import { getTebexProp } from "@/lib/tebex-props";

async function findPropById(id: string) {
  const approved = await db
    .select({ prop: approvedProps, user: users })
    .from(approvedProps)
    .leftJoin(users, eq(approvedProps.createdBy, users.id))
    .where(eq(approvedProps.id, id))
    .limit(1);

  if (approved[0]) return { ...approved[0].prop, user: approved[0].user, status: "approved" as const };

  const pending = await db
    .select({ prop: pendingProps, user: users })
    .from(pendingProps)
    .leftJoin(users, eq(pendingProps.createdBy, users.id))
    .where(eq(pendingProps.id, id))
    .limit(1);

  if (pending[0]) return { ...pending[0].prop, user: pending[0].user, status: "pending" as const };

  const rejected = await db
    .select({ prop: rejectedProps, user: users })
    .from(rejectedProps)
    .leftJoin(users, eq(rejectedProps.createdBy, users.id))
    .where(eq(rejectedProps.id, id))
    .limit(1);

  if (rejected[0]) return { ...rejected[0].prop, user: rejected[0].user, status: "rejected" as const };

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Props live in Tebex's "PROPS" category (FiveCrux is the only lister).
    const prop = await getTebexProp(id);

    if (!prop) {
      return NextResponse.json({ error: "Prop not found" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    let hasPurchased = false;
    if (session?.user) {
      // A transient DB hiccup on the purchase check must not break the whole
      // prop page (the prop data itself comes from Tebex) — default to false.
      try {
        const { hasPurchasedProp } = await import("@/lib/prop-utils");
        hasPurchased = await hasPurchasedProp((session.user as any).id, prop.id);
      } catch (e) {
        console.warn("hasPurchasedProp check failed (defaulting false):", e);
      }
    }
    return NextResponse.json({ ...prop, status: "approved", hasPurchased });
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
    const existingProp = await findPropById(id);

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
    const { name, description, price, discountPercentage, images, zipFile, tebexStoreToken, tebexPackageId } = body;

    const updates: any = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (images) updates.images = images;
    if (zipFile) updates.zipFile = zipFile;
    // Tebex Headless integration fields (nullable, accept null to clear)
    if (tebexStoreToken !== undefined) updates.tebexStoreToken = tebexStoreToken || null;
    if (tebexPackageId !== undefined) updates.tebexPackageId = tebexPackageId || null;

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

    const targetTable =
      existingProp.status === "pending"
        ? pendingProps
        : existingProp.status === "rejected"
        ? rejectedProps
        : approvedProps;

    const updatedProp = await db.update(targetTable)
      .set(updates)
      .where(eq(targetTable.id, id))
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
    const existingProp = await findPropById(id);

    if (!existingProp) {
      return NextResponse.json({ error: "Prop not found" }, { status: 404 });
    }

    const userRoles = (session.user as any).roles || [];
    const isAdmin = hasRole(userRoles, 'admin') || hasRole(userRoles, 'founder');
    const isOwner = existingProp.createdBy === (session.user as any).id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const targetTable =
      existingProp.status === "pending"
        ? pendingProps
        : existingProp.status === "rejected"
        ? rejectedProps
        : approvedProps;

    await db.delete(targetTable).where(eq(targetTable.id, id));

    return NextResponse.json({ success: true, message: "Prop deleted successfully" });
  } catch (error) {
    console.error("Error deleting prop:", error);
    return NextResponse.json({ error: "Failed to delete prop" }, { status: 500 });
  }
}
