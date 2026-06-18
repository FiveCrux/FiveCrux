import { type NextRequest, NextResponse } from "next/server";
import { getBasket } from "@/lib/tebex";

/**
 * GET /api/tebex/basket/[ident]?storeToken=...
 *
 * Return the current state of a Tebex basket. The seller's webstore public
 * token is supplied via the `storeToken` query param (baskets are scoped to a
 * webstore). Omitting it falls back to FiveCrux's own store token in the client.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ident: string }> }
) {
  try {
    const { ident } = await params;
    const { searchParams } = new URL(request.url);
    const storeToken = searchParams.get("storeToken") ?? undefined;

    if (!ident) {
      return NextResponse.json({ error: "Missing basket ident" }, { status: 400 });
    }

    const basket = await getBasket(storeToken, ident);
    return NextResponse.json({ basket });
  } catch (error) {
    console.error("Tebex get basket error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch Tebex basket",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
