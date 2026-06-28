import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { createBasket, getBasketAuthUrl, FIVECRUX_TEBEX_PUBLIC_TOKEN } from "@/lib/tebex";
import { resolveTebexPackageId, getLivePriceByKey } from "@/lib/tebex-pricing";
import {
  reserveSideBanner,
  releaseSideBannerReservation,
  ensureUserExists,
  SIDE_BANNER_POSITIONS,
  SIDE_BANNER_DURATIONS,
  type SideBannerPosition,
} from "@/lib/database-new";
import { finalizeSideBannerBasket, buildSideBannerCustom } from "@/lib/side-banner-checkout";

/**
 * POST /api/side-banners/checkout
 * Body: { position: 'left'|'right', durationWeeks: 1|2|4, title?, imageUrl?, linkUrl? }
 *
 * Reserves the scarce position (DB lock), then starts the Tebex checkout for the
 * matching side-banner package. If the store requires login (FiveM), returns the
 * Tebex auth URL; otherwise returns the hosted checkout URL directly. On payment,
 * the webhook activates the reserved booking.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as any;

    const storeToken = FIVECRUX_TEBEX_PUBLIC_TOKEN;
    if (!storeToken) {
      return NextResponse.json({ error: "Tebex store not configured" }, { status: 501 });
    }

    const body = await request.json().catch(() => ({}));
    const position = String(body.position) as SideBannerPosition;
    const durationWeeks = Number(body.durationWeeks);
    // Creative (image/link/title) is NOT set here — like ad slots, the buyer
    // sets/edits it afterwards from their dashboard.

    if (!SIDE_BANNER_POSITIONS.includes(position))
      return NextResponse.json({ error: "Invalid position" }, { status: 400 });
    if (!SIDE_BANNER_DURATIONS.includes(durationWeeks as any))
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });

    // Tebex package must exist for this duration.
    const tebexPackageId = await resolveTebexPackageId("sidebanner", "slot", durationWeeks);
    if (tebexPackageId == null) {
      return NextResponse.json(
        { error: "Side-banner package not configured in Tebex", unmapped: [`sidebanner:slot:${durationWeeks}`] },
        { status: 501 }
      );
    }
    const price = await getLivePriceByKey("sidebanner", "slot", durationWeeks);
    const amount = price?.amount ?? 0;

    // Ensure the buyer's user row exists (FK-safety for stale sessions / local resets).
    await ensureUserExists(user);

    // RESERVE — the overselling lock. A racing buyer for the same position fails here.
    const reservation = await reserveSideBanner({
      position,
      userId: user.id,
      durationWeeks,
    });
    if (!reservation.ok) {
      const taken = reservation.reason === "taken";
      return NextResponse.json(
        { error: taken ? "That slot was just taken — try the other side or come back later." : "Could not reserve slot" },
        { status: taken ? 409 : 400 }
      );
    }
    const bookingId = reservation.bookingId;

    const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const completeUrl = `${siteUrl}/advertise?sidebanner=success`;
    const cancelUrl = `${siteUrl}/advertise?sidebanner=cancelled`;
    const custom = buildSideBannerCustom(user.id, bookingId, position, durationWeeks);

    // Create the basket. If it fails, release the hold so the position frees up.
    let basketIdent: string;
    try {
      const created = await createBasket(storeToken, { completeUrl, returnUrl: cancelUrl, custom });
      basketIdent = created.ident;
    } catch (e) {
      console.error("Side-banner basket creation failed:", e);
      await releaseSideBannerReservation(bookingId);
      return NextResponse.json({ error: "Failed to start checkout" }, { status: 502 });
    }

    // FiveM stores require login before adding packages.
    const continueUrl =
      `${siteUrl}/api/side-banners/continue?ident=${encodeURIComponent(basketIdent)}` +
      `&booking=${bookingId}&weeks=${durationWeeks}`;
    let authUrl: string | null = null;
    try {
      const authOpts = await getBasketAuthUrl(storeToken, basketIdent, continueUrl);
      if (Array.isArray(authOpts) && authOpts.length > 0 && authOpts[0]?.url) authUrl = authOpts[0].url;
    } catch (e) {
      console.warn("Side-banner auth probe failed (continuing without auth):", e);
    }

    if (authUrl) return NextResponse.json({ authUrl, basketIdent, bookingId });

    // No auth required → add package + persist + return checkout URL.
    try {
      const { checkoutUrl } = await finalizeSideBannerBasket({
        userId: user.id,
        storeToken,
        basketIdent,
        tebexPackageId,
        bookingId,
        position,
        durationWeeks,
        amount,
      });
      return NextResponse.json({ success: true, checkoutUrl, bookingId });
    } catch (e) {
      console.error("Side-banner finalize failed:", e);
      await releaseSideBannerReservation(bookingId);
      return NextResponse.json({ error: "Failed to start checkout" }, { status: 502 });
    }
  } catch (error) {
    console.error("Side-banner checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
