// Tests the webhook fix: Tebex payment.completed has NO basket ident + the
// order's txn is null, so we now match the order by the `custom.bookingId`
// echoed on the subject, then activate the reserved side-banner slot.
//   Run: npx tsx scripts/test-webhook-match.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-wh";
process.env.DATABASE_URL ||= "postgres://placeholder/local";
process.env.NEXTAUTH_SECRET ||= "x";
process.env.DISCORD_CLIENT_ID ||= "x";
process.env.DISCORD_CLIENT_SECRET ||= "x";

import { rmSync } from "node:fs";

async function main() {
  rmSync("./.pglite-test-wh", { recursive: true, force: true });
  const { db } = await import("../lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("../lib/db/schema");
  const { sql, eq } = await import("drizzle-orm");
  const { activateSideBanner } = await import("../lib/database-new");

  await migrate(db as any, { migrationsFolder: "./drizzle" });
  await db.insert(schema.users).values({ id: "buyer", name: "Buyer", roles: ["user"] }).onConflictDoNothing();

  const BOOKING = 1783452962; // same shape as the real failing purchase
  const ORDER = "ord-abc-1";
  const BASKET = "dm1mgt-8a04b28a538c2cec";

  await db.insert(schema.sideBannerBookings).values({
    id: BOOKING, position: "left-top", status: "reserved", createdBy: "buyer", durationWeeks: 1,
  } as any).onConflictDoNothing();

  // The tebex_orders row exactly as the side-banner checkout persists it:
  // status pending, txn NULL, custom carries the bookingId.
  await db.insert(schema.tebexOrders).values({
    id: ORDER, basketIdent: BASKET, userId: "buyer", kind: "platform_fee",
    storeToken: "tbx_x", packageIds: [7528300], status: "pending", amount: "30.00",
    custom: { kind: "side_banner", userId: "buyer", bookingId: BOOKING, position: "left-top", durationWeeks: 1 },
  } as any).onConflictDoNothing();

  let pass = 0, fail = 0;
  const check = (n: string, c: boolean, extra?: any) => { console.log(`  ${c ? "✓" : "✗"} ${n}${extra !== undefined ? " → " + JSON.stringify(extra) : ""}`); c ? pass++ : fail++; };

  // 1. Old path (match by txn) fails — order txn is null.
  const byTxn = await db.query.tebexOrders.findFirst({ where: eq(schema.tebexOrders.tebexTransactionId, "tbx-21818726a65632-25eceb") });
  check("match by transaction_id FAILS (as expected — txn is null at checkout)", !byTxn);

  // 2. NEW path: match by custom->>'bookingId' (what the fix does).
  const rows = await db.select().from(schema.tebexOrders)
    .where(sql`${schema.tebexOrders.custom}->>'bookingId' = ${String(BOOKING)}`).limit(1);
  check("match by custom.bookingId FINDS the order", rows.length === 1 && rows[0].id === ORDER);

  // 3. Activate the reserved slot (what provisionPlatformFee does for side_banner).
  const res = await activateSideBanner(BOOKING, ORDER);
  check("activateSideBanner ok", res.activated === true, res);

  const bk = (await db.select().from(schema.sideBannerBookings).where(eq(schema.sideBannerBookings.id, BOOKING)))[0];
  check("slot is now ACTIVE", bk?.status === "active");
  check("slot carries the order reference", bk?.orderReference === ORDER);
  check("slot got an end date", !!bk?.endDate);

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error("test crashed:", e); process.exit(1); });
