// Dedicated Tebex checkout flow for the scarce side-banner slots. Kept separate
// from the generic cart flow so the reservation/overselling lock stays isolated.
// Mirrors lib/tebex-checkout-flow.ts (createBasket → auth → add package → persist
// tebex_orders), but for ONE side-banner package tied to a reserved booking.
import { randomUUID } from "crypto";

import { db } from "@/lib/db/client";
import { tebexOrders } from "@/lib/db/schema";
import { addPackageToBasket, getBasket, getCheckoutUrl } from "@/lib/tebex";

/** Webhook-facing custom payload — provisionPlatformFee activates the booking. */
export function buildSideBannerCustom(
  userId: string,
  bookingId: number,
  position: string,
  durationWeeks: number
) {
  return { kind: "side_banner", userId, bookingId, position, durationWeeks };
}

/**
 * Add the side-banner package to an (authenticated) basket and persist a
 * tebex_orders row (kind 'platform_fee' so the webhook routes it to
 * provisionPlatformFee, where custom.kind 'side_banner' activates the booking).
 */
export async function finalizeSideBannerBasket(args: {
  userId: string;
  storeToken: string;
  basketIdent: string;
  tebexPackageId: number;
  bookingId: number;
  position: string;
  durationWeeks: number;
  amount: number;
}): Promise<{ checkoutUrl: string }> {
  await addPackageToBasket(args.storeToken, args.basketIdent, args.tebexPackageId, 1);
  const basket = await getBasket(args.storeToken, args.basketIdent);
  const checkoutUrl = getCheckoutUrl(basket);

  await db.insert(tebexOrders).values({
    id: randomUUID(),
    basketIdent: args.basketIdent,
    userId: args.userId,
    kind: "platform_fee",
    storeToken: args.storeToken,
    packageIds: [args.tebexPackageId],
    status: "pending",
    amount: args.amount.toFixed(2),
    custom: buildSideBannerCustom(args.userId, args.bookingId, args.position, args.durationWeeks),
  });

  return { checkoutUrl };
}
