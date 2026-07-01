import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { getPackages } from "@/lib/tebex";
import {
  getUserById,
  setUserTebexStoreToken,
  getUserImportedTebexPackageIds,
} from "@/lib/database-new";

// Per-seller Tebex store: connect the seller's own webstore token, then list
// their packages so they can import them as FiveCrux listings.
//   GET    → connection status + packages + already-imported ids
//   POST   → connect (validate + save token), returns the same shape
//   DELETE → disconnect (clear token)
export const dynamic = "force-dynamic";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return (session.user as any).id as string;
}

export async function GET() {
  try {
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await getUserById(userId);
    const token = (u as any)?.tebexStoreToken || null;
    if (!token) return NextResponse.json({ connected: false, packages: [], importedPackageIds: [] });

    const importedPackageIds = await getUserImportedTebexPackageIds(userId);
    try {
      const packages = await getPackages(token);
      return NextResponse.json({ connected: true, packages, importedPackageIds });
    } catch {
      return NextResponse.json({
        connected: true,
        packages: [],
        importedPackageIds,
        error: "Couldn't load packages from Tebex right now.",
      });
    }
  } catch (e) {
    console.error("GET /api/tebex/store error:", e);
    return NextResponse.json({ error: "Failed to load Tebex store" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const token = typeof body.storeToken === "string" ? body.storeToken.trim() : "";
    if (!token) return NextResponse.json({ error: "Enter your Tebex store token." }, { status: 400 });

    // Validate by actually listing the store's packages with this token.
    let packages;
    try {
      packages = await getPackages(token);
    } catch {
      return NextResponse.json(
        { error: "That store token didn't work. Double-check it and try again." },
        { status: 400 }
      );
    }

    await setUserTebexStoreToken(userId, token);
    const importedPackageIds = await getUserImportedTebexPackageIds(userId);
    return NextResponse.json({ connected: true, packages, importedPackageIds });
  } catch (e) {
    console.error("POST /api/tebex/store error:", e);
    return NextResponse.json({ error: "Failed to connect Tebex store" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await setUserTebexStoreToken(userId, null);
    return NextResponse.json({ connected: false });
  } catch (e) {
    console.error("DELETE /api/tebex/store error:", e);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
