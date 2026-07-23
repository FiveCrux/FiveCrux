import { type NextRequest, NextResponse } from "next/server";
import { getWebstoreInfo, webstorePackageUrl } from "@/lib/tebex";
import { requireUser } from "@/lib/api-auth";

/**
 * POST /api/tebex/basket
 *
 * Resolve where "Buy Now" should send the buyer for a SELLER product. FiveCrux
 * uses Model B — each seller sells on their OWN hosted Tebex store — so we send
 * the buyer straight to the package on that store, where Tebex handles login,
 * required options (e.g. a Discord-ID requirement) and payment. (The on-site
 * Headless basket couldn't satisfy stores that require per-package options.)
 *
 * Newly-imported listings already store this URL as their `link`; this endpoint
 * is the live fallback for older imports that don't have one yet.
 *
 * Body: { storeToken, packageId }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const { storeToken, packageId } = body ?? {};

    if (!storeToken || typeof storeToken !== "string") {
      return NextResponse.json({ error: "Missing storeToken" }, { status: 400 });
    }
    if (packageId === undefined || packageId === null || packageId === "") {
      return NextResponse.json({ error: "Missing packageId" }, { status: 400 });
    }

    const info = await getWebstoreInfo(storeToken);
    const webstoreUrl = (info as any)?.webstore_url;
    if (!webstoreUrl) {
      return NextResponse.json({ error: "Seller store URL unavailable" }, { status: 502 });
    }

    return NextResponse.json({ redirectUrl: webstorePackageUrl(webstoreUrl, packageId) });
  } catch (error) {
    console.error("Tebex buy-now resolve error:", error);
    return NextResponse.json(
      {
        error: "Failed to start checkout",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
