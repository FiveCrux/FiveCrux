// End-to-end test for FiveCrux's own coupon system (no Tebex).
//
// Runs against a throwaway PGlite database, so it exercises the real reads —
// scope matching, creator confinement, the usage counters — not a mock.
//
//   npx tsx scripts/test-coupons.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-coupons";
process.env.DATABASE_URL ||= "postgres://placeholder/local";
process.env.NEXTAUTH_SECRET ||= "x";
process.env.DISCORD_CLIENT_ID ||= "x";
process.env.DISCORD_CLIENT_SECRET ||= "x";

import { rmSync } from "node:fs";

let pass = 0,
  fail = 0;
const check = (name: string, cond: boolean, extra?: any) => {
  console.log(`  ${cond ? "✓" : "✗"} ${name}${cond ? "" : "  → " + JSON.stringify(extra)}`);
  cond ? pass++ : fail++;
};

async function main() {
  rmSync("./.pglite-test-coupons", { recursive: true, force: true });
  const { db } = await import("../lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("../lib/db/schema");
  const { validateCouponForCart, recordCouponRedemption, recordCreatorCodeRedemption } =
    await import("../lib/cart-checkout-utils");

  await migrate(db as any, { migrationsFolder: "./drizzle" });

  await db
    .insert(schema.users)
    .values([
      { id: "creatorA", name: "Creator A", roles: ["user", "verified_creator"] },
      { id: "creatorB", name: "Creator B", roles: ["user", "verified_creator"] },
      { id: "adminU", name: "Admin", roles: ["admin"] },
      { id: "buyer", name: "Buyer", roles: ["user"] },
      { id: "buyer2", name: "Buyer Two", roles: ["user"] },
    ] as any)
    .onConflictDoNothing();

  await db
    .insert(schema.approvedProps)
    .values([
      { id: "propA", name: "Prop A", description: "A", price: "100", zipFile: "a.zip", createdBy: "creatorA" },
      { id: "propB", name: "Prop B", description: "B", price: "100", zipFile: "b.zip", createdBy: "creatorB" },
    ] as any)
    .onConflictDoNothing();

  const day = 86_400_000;
  await db
    .insert(schema.coupons)
    .values([
      { id: 9001, code: "ACREATOR", discountType: "percentage", discountValue: "10", scope: "all", createdBy: "creatorA" },
      { id: 9002, code: "ADMINALL", discountType: "percentage", discountValue: "10", scope: "all", createdBy: "adminU" },
      { id: 9003, code: "ADSONLY", discountType: "percentage", discountValue: "50", scope: "Ad Slots", createdBy: "adminU" },
      { id: 9004, code: "TENOFF", discountType: "flat", discountValue: "10", scope: "all", createdBy: "adminU" },
      { id: 9005, code: "ONCEONLY", discountType: "flat", discountValue: "5", scope: "all", createdBy: "adminU", maxUses: 1 },
      { id: 9006, code: "ONEPERUSER", discountType: "flat", discountValue: "5", scope: "all", createdBy: "adminU", perUserLimit: 1 },
      { id: 9007, code: "SWITCHEDOFF", discountType: "flat", discountValue: "5", scope: "all", createdBy: "adminU", isActive: false },
      { id: 9008, code: "GONE", discountType: "flat", discountValue: "5", scope: "all", createdBy: "adminU", expiryDate: new Date(Date.now() - 2 * day) },
      { id: 9009, code: "NOTYET", discountType: "flat", discountValue: "5", scope: "all", createdBy: "adminU", startDate: new Date(Date.now() + 2 * day) },
      { id: 9010, code: "BIGCART", discountType: "flat", discountValue: "5", scope: "all", createdBy: "adminU", minCartValue: "500" },
      { id: 9011, code: "HUGE", discountType: "flat", discountValue: "9999", scope: "all", createdBy: "adminU" },
    ] as any)
    .onConflictDoNothing();

  const propA = { itemType: "prop", itemId: "propA", price: "100", quantity: 1 };
  const propB = { itemType: "prop", itemId: "propB", price: "100", quantity: 1 };
  const adSlot = {
    itemType: "subscription",
    itemId: "ads:premium:1",
    price: "100",
    quantity: 1,
    metadata: { packageType: "ads", couponScope: "Ad Slots" },
  };
  const cartAB = [propA, propB];
  const V = (code: string, user: string, items: any[]) => validateCouponForCart(code, user, items as any);
  const amount = (r: any) => (r?.ok ? r.discountAmount : undefined);

  console.log("\n▶ Coupon system (own, no Tebex)\n");

  console.log("creator confinement (money safety)");
  check("creator coupon discounts only their own prop (10, not 20)", amount(await V("ACREATOR", "buyer", cartAB)) === 10);
  check("admin coupon discounts the whole cart (20)", amount(await V("ADMINALL", "buyer", cartAB)) === 20);
  const r3: any = await V("ACREATOR", "buyer", [propB]);
  check("creator coupon on another seller's prop is refused", r3.ok === false, r3);
  const r4: any = await V("ACREATOR", "buyer", [adSlot]);
  check("creator coupon cannot discount platform ad slots", r4.ok === false, r4);

  console.log("\nscope");
  check("Ad Slots coupon takes 50% of the ad slot only", amount(await V("ADSONLY", "buyer", [adSlot, propA])) === 50);
  const r5: any = await V("ADSONLY", "buyer", [propA]);
  check("Ad Slots coupon refused on a cart with no ad slots", r5.ok === false, r5);

  console.log("\nflat amount comes off once, not per line");
  check("10 off a 2-item cart is 10", amount(await V("TENOFF", "buyer", cartAB)) === 10);
  check("a flat coupon larger than the cart is clamped to it", amount(await V("HUGE", "buyer", [propA])) === 100);

  console.log("\nschedule and switches");
  for (const [code, label] of [
    ["SWITCHEDOFF", "an inactive coupon is refused"],
    ["GONE", "an expired coupon is refused"],
    ["NOTYET", "a coupon that has not started is refused"],
    ["BIGCART", "a coupon below its minimum cart value is refused"],
    ["NOSUCHCODE", "an unknown code is refused"],
  ] as const) {
    const r: any = await V(code, "buyer", cartAB);
    check(label, r.ok === false, r);
  }

  console.log("\nusage limits actually trip (they never did before)");
  let n = 50_000;
  const nextId = () => ++n;

  const before: any = await V("ONCEONLY", "buyer", cartAB);
  check("maxUses=1 coupon is valid on first use", before.ok === true, before);
  await db.insert(schema.orders).values({
    id: 70001, userId: "buyer", status: "paid", totalAmount: "200", discountAmount: "5", payableAmount: "195",
  } as any);
  await recordCouponRedemption(9005, "buyer", 70001, nextId);
  const after: any = await V("ONCEONLY", "buyer", cartAB);
  check("maxUses=1 coupon is refused after one paid order", after.ok === false, after);
  const otherBuyer: any = await V("ONCEONLY", "buyer2", cartAB);
  check("...and is exhausted for everyone, not just that buyer", otherBuyer.ok === false, otherBuyer);

  await db.insert(schema.orders).values({
    id: 70002, userId: "buyer", status: "paid", totalAmount: "200", discountAmount: "5", payableAmount: "195",
  } as any);
  await recordCouponRedemption(9006, "buyer", 70002, nextId);
  const same: any = await V("ONEPERUSER", "buyer", cartAB);
  check("perUserLimit=1 blocks the same buyer twice", same.ok === false, same);
  const different: any = await V("ONEPERUSER", "buyer2", cartAB);
  check("...but a different buyer can still use it", different.ok === true, different);

  console.log("\nredemption recording is idempotent (webhooks retry)");
  const { eq: eqOp } = await import("drizzle-orm");
  const readCoupon = async () =>
    (await db.select().from(schema.coupons).where(eqOp(schema.coupons.id, 9005)))[0];
  const couponBefore = await readCoupon();
  await recordCouponRedemption(9005, "buyer", 70001, nextId);
  const couponAfter = await readCoupon();
  check(
    "replaying the same order does not burn a second use",
    couponBefore.usedCount === couponAfter.usedCount && couponAfter.usedCount === 1,
    { before: couponBefore.usedCount, after: couponAfter.usedCount }
  );

  console.log("\ncreator codes are booked and the creator is paid");
  await db
    .insert(schema.creatorCodes)
    .values({
      id: 8001, code: "CRUXDEV", createdBy: "creatorA",
      discountType: "percentage", discountValue: "10",
      commissionType: "percentage", commissionValue: "20", isActive: true,
    } as any)
    .onConflictDoNothing();
  await db.insert(schema.orders).values({
    id: 70003, userId: "buyer", creatorCodeId: 8001, status: "paid",
    totalAmount: "200", discountAmount: "20", payableAmount: "180",
  } as any);

  await recordCreatorCodeRedemption(8001, "buyer", 70003, 20, 36);
  const booked = await db
    .select()
    .from(schema.creatorCodeRedemptions)
    .where(eqOp(schema.creatorCodeRedemptions.orderId, 70003));
  check("a redemption row is written for a paid order", booked.length === 1, booked);
  check("the creator's commission is recorded on it", Number(booked[0]?.commissionAmount) === 36, booked[0]);
  const [codeAfter] = await db.select().from(schema.creatorCodes).where(eqOp(schema.creatorCodes.id, 8001));
  check("the code's usedCount goes up", codeAfter.usedCount === 1, codeAfter.usedCount);

  await recordCreatorCodeRedemption(8001, "buyer", 70003, 20, 36);
  const replayed = await db
    .select()
    .from(schema.creatorCodeRedemptions)
    .where(eqOp(schema.creatorCodeRedemptions.orderId, 70003));
  const [codeReplayed] = await db.select().from(schema.creatorCodes).where(eqOp(schema.creatorCodes.id, 8001));
  check(
    "a webhook retry pays the creator once, not twice",
    replayed.length === 1 && codeReplayed.usedCount === 1,
    { rows: replayed.length, usedCount: codeReplayed.usedCount }
  );

  console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});
