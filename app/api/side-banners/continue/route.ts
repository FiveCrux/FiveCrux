import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { FIVECRUX_TEBEX_PUBLIC_TOKEN } from "@/lib/tebex";
import { resolveTebexPackageId, getLivePriceByKey } from "@/lib/tebex-pricing";
import { getSideBannerBooking, releaseSideBannerReservation } from "@/lib/database-new";
import { finalizeSideBannerBasket } from "@/lib/side-banner-checkout";

/**
 * GET /api/side-banners/continue?ident=...&booking=...&weeks=...
 *
 * Phase 2 for FiveM stores: Tebex redirects here after the buyer logs in. The
 * basket is now authenticated, so we add the side-banner package, persist the
 * tebex_orders row, and redirect to the hosted checkout (payment).
 */
export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const fail = (reason: string) =>
    NextResponse.redirect(`${siteUrl}/advertise?sidebanner=error&reason=${encodeURIComponent(reason)}`);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.redirect(`${siteUrl}/auth/signin`);
    const user = session.user as any;

    const storeToken = FIVECRUX_TEBEX_PUBLIC_TOKEN;
    if (!storeToken) return fail("store-not-configured");

    const { searchParams } = new URL(request.url);
    const basketIdent = searchParams.get("ident") || "";
    const bookingId = Number(searchParams.get("booking")) || 0;
    const durationWeeks = Number(searchParams.get("weeks")) || 0;
    if (!basketIdent || !bookingId || !durationWeeks) return fail("missing-basket");

    const booking = await getSideBannerBooking(bookingId);
    if (!booking || booking.createdBy !== user.id) return fail("booking-not-found");
    if (booking.status !== "reserved") return fail("reservation-expired");

    const tebexPackageId = await resolveTebexPackageId("sidebanner", "slot", durationWeeks);
    if (tebexPackageId == null) {
      await releaseSideBannerReservation(bookingId);
      return fail("package-not-configured");
    }
    const price = await getLivePriceByKey("sidebanner", "slot", durationWeeks);

    const { checkoutUrl } = await finalizeSideBannerBasket({
      userId: user.id,
      storeToken,
      basketIdent,
      tebexPackageId,
      bookingId,
      position: booking.position,
      durationWeeks,
      amount: price?.amount ?? 0,
    });

    return NextResponse.redirect(checkoutUrl);
  } catch (error) {
    console.error("Side-banner continue (post-auth) error:", error);
    return fail("checkout-failed");
  }
}
