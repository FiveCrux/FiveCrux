import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db/client";
import { approvedProps, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { createProp, hasRole } from "@/lib/database-new";
import { listTebexProps } from "@/lib/tebex-props";

// Props are listed only by FiveCrux and managed entirely in Tebex (the "PROPS"
// category). We auto-pull that category so adding a Tebex package shows it here.
export const revalidate = 60;

export async function GET() {
  try {
    const props = await listTebexProps();
    return NextResponse.json(
      { props },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("Error fetching props:", error);
    return NextResponse.json({ props: [] }, { status: 200 });
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
    const { name, description, price, discountPercentage = 0, images, zipFile, tebexStoreToken, tebexPackageId } = body;

    // New model: props are delivered by Tebex (zip is uploaded on the Tebex
    // package, not here). A prop MUST carry its FiveCrux-store tebex_package_id;
    // the in-app zip upload is no longer required.
    if (!name || !description || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!tebexPackageId) {
      return NextResponse.json({ error: "Missing tebexPackageId (the FiveCrux Tebex package backing this prop)" }, { status: 400 });
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
      zipFile: zipFile || '', // delivery is via Tebex now; kept for schema compatibility
      createdBy: (session.user as any).id,
      // Backed by a package in FiveCrux's OWN Tebex store (store token defaults to
      // TEBEX_PUBLIC_TOKEN at checkout; per-prop store token no longer needed).
      tebexStoreToken: tebexStoreToken || null,
      tebexPackageId: String(tebexPackageId),
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
