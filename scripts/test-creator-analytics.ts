// Verifies getCreatorAnalytics with real synthetic data: prop sale (order_items
// → paid order), listing views, giveaway entries/winner, listing counts.
//   Run: npx tsx scripts/test-creator-analytics.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-an";
process.env.DATABASE_URL ||= "postgres://placeholder/local";
process.env.NEXTAUTH_SECRET ||= "x";
process.env.DISCORD_CLIENT_ID ||= "x";
process.env.DISCORD_CLIENT_SECRET ||= "x";

import { rmSync } from "node:fs";

async function main() {
  rmSync("./.pglite-test-an", { recursive: true, force: true });
  const { db } = await import("../lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const s = await import("../lib/db/schema");
  const { getCreatorAnalytics } = await import("../lib/database-new");

  await migrate(db as any, { migrationsFolder: "./drizzle" });
  await db.insert(s.users).values([
    { id: "creator", name: "Creator", roles: ["user", "verified_creator"] },
    { id: "buyer", name: "Buyer", roles: ["user"] },
    { id: "user3", name: "User 3", roles: ["user"] },
  ]).onConflictDoNothing();

  // Listings: 1 approved script (50 views) + 2 approved props (30, 10 views) + 1 pending script.
  await db.insert(s.approvedScripts).values({
    id: 5001, title: "Advanced Banking", description: "d", price: "40", category: "mlo",
    seller_name: "Creator", seller_email: "c@x.com", sellerId: "creator", viewCount: 50,
  } as any).onConflictDoNothing();
  await db.insert(s.pendingScripts).values({
    id: 5002, title: "WIP Script", description: "d", price: "10", category: "mlo",
    seller_name: "Creator", seller_email: "c@x.com", sellerId: "creator",
  } as any).onConflictDoNothing();
  await db.insert(s.approvedProps).values([
    { id: "p1", name: "Prop One", description: "d", price: "20", zipFile: "a.zip", createdBy: "creator", viewCount: 30 },
    { id: "p2", name: "Prop Two", description: "d", price: "15", zipFile: "b.zip", createdBy: "creator", viewCount: 10 },
  ] as any).onConflictDoNothing();

  // A PAID order buying prop p1 x2 (= €40, 1 buyer).
  await db.insert(s.orders).values({ id: 9001, userId: "buyer", totalAmount: "40", payableAmount: "40", status: "paid" } as any).onConflictDoNothing();
  await db.insert(s.orderItems).values({ id: 9101, orderId: 9001, itemType: "prop", itemId: "p1", title: "Prop One", price: "20", quantity: 2 } as any).onConflictDoNothing();

  // A giveaway with 2 entries + 1 delivered winner.
  await db.insert(s.approvedGiveaways).values({ id: 7001, title: "G1", description: "d", totalValue: "100", endDate: new Date("2026-06-01"), creatorName: "Creator", creatorEmail: "c@x.com", creatorId: "creator" } as any).onConflictDoNothing();
  await db.insert(s.giveawayEntries).values([
    { id: 7101, giveawayId: 7001, userId: "buyer" },
    { id: 7102, giveawayId: 7001, userId: "user3" },
  ] as any).onConflictDoNothing();
  await db.insert(s.giveawayPrizes).values({ id: 7201, giveawayId: 7001, position: 1, name: "Nitro", value: "10", numberOfWinners: 1 } as any).onConflictDoNothing();
  await db.insert(s.giveawayPrizeWinners).values({ id: 7301, prizeId: 7201, userId: "buyer", claimed: true } as any).onConflictDoNothing();

  const a = await getCreatorAnalytics("creator");
  console.log(JSON.stringify(a, null, 2));

  let pass = 0, fail = 0;
  const check = (n: string, c: boolean) => { console.log(`  ${c ? "✓" : "✗"} ${n}`); c ? pass++ : fail++; };

  check("sales count = 2", a.sales.count === 2);
  check("sales revenue = 40", a.sales.revenue === 40);
  check("buyers = 1", a.sales.buyers === 1);
  check("script views = 50", a.traffic.scriptViews === 50);
  check("prop views = 40", a.traffic.propViews === 40);
  check("traffic total >= 90", a.traffic.total >= 90);
  check("top-by-views leader is the 50-view script", a.topByViews[0]?.views === 50);
  check("top-by-sales has p1 (rev 40)", a.topBySales[0]?.id === "p1" && a.topBySales[0]?.revenue === 40);
  check("giveaways: 1", a.giveaways.count === 1);
  check("entries = 2", a.giveaways.entries === 2);
  check("participants = 2", a.giveaways.participants === 2);
  check("winners = 1", a.giveaways.winners === 1);
  check("delivered = 1", a.giveaways.delivered === 1);
  check("listings scripts=1 props=2", a.listings.scripts === 1 && a.listings.props === 2);
  check("pending scripts = 1", a.listings.pendingScripts === 1);

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error("test crashed:", e); process.exit(1); });
