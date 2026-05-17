import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db/client";
import { approvedProps, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { createProp, hasRole } from "@/lib/database-new";

export async function GET(request: NextRequest) {
  try {
    const rows = await db
      .select({ prop: approvedProps, user: users })
      .from(approvedProps)
      .leftJoin(users, eq(approvedProps.createdBy, users.id))
      .orderBy(desc(approvedProps.createdAt));
    const allProps = rows.map(({ prop, user }) => ({ ...prop, user }));

    return NextResponse.json({ props: allProps });
  } catch (error) {
    console.error("Error fetching props:", error);
    return NextResponse.json({ error: "Failed to fetch props" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRoles = (session.user as any).roles || [];
    const isPropLister = hasRole(userRoles, 'prop_lister') || hasRole(userRoles, 'admin') || hasRole(userRoles, 'founder');
    
    if (!isPropLister) {
      return NextResponse.json({ error: "Unauthorized: Requires Prop Lister role" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, price, discountPercentage = 0, images, zipFile } = body;

    if (!name || !description || price === undefined || !zipFile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const priceNum = parseFloat(price);
    const discountNum = parseFloat(discountPercentage);
    
    if (priceNum < 0 || discountNum < 0 || discountNum > 100) {
      return NextResponse.json({ error: "Invalid price or discount" }, { status: 400 });
    }

    let discountedPrice = null;
    if (discountNum > 0) {
      discountedPrice = priceNum - (priceNum * discountNum / 100);
    }

    const propId = await createProp({
      name,
      description,
      price: priceNum.toString(),
      discountPercentage: discountNum.toString(),
      discountedPrice: discountedPrice ? discountedPrice.toString() : null,
      images: images || [],
      zipFile,
      createdBy: (session.user as any).id,
    });

    return NextResponse.json({
      success: true,
      status: "pending",
      prop: { id: propId },
      message: "Prop submitted for admin approval",
    });
  } catch (error) {
    console.error("Error creating prop:", error);
    return NextResponse.json({ error: "Failed to create prop" }, { status: 500 });
  }
}
