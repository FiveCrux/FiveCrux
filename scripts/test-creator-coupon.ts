// SECURITY test for creator coupons: a verified_creator's coupon must only
// discount THAT creator's own props — never other sellers' items. Admin coupons
// discount everything (unchanged).
//   Run: npx tsx scripts/test-creator-coupon.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-cc";
process.env.DATABASE_URL ||= "postgres://placeholder/local";
process.env.NEXTAUTH_SECRET ||= "x";
process.env.DISCORD_CLIENT_ID ||= "x";
process.env.DISCORD_CLIENT_SECRET ||= "x";

import { rmSync } from "node:fs";

async function main() {
  rmSync("./.pglite-test-cc", { recursive: true, force: true });
  const { db } = await import("../lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("../lib/db/schema");
  const { validateCoupon } = await import("../lib/cart-checkout-utils");

  await migrate(db as any, { migrationsFolder: "./drizzle" });

  await db.insert(schema.users).values([
    { id: "creatorA", name: "Creator A", roles: ["user", "verified_creator"] },
    { id: "creatorB", name: "Creator B", roles: ["user", "verified_creator"] },
    { id: "adminU", name: "Admin", roles: ["admin"] },
    { id: "buyer", name: "Buyer", roles: ["user"] },
  ]).onConflictDoNothing();

  // Two props, one per creator.
  await db.insert(schema.approvedProps).values([
    { id: "propA", name: "Prop A", description: "A", price: "100", zipFile: "a.zip", createdBy: "creatorA" },
    { id: "propB", name: "Prop B", description: "B", price: "100", zipFile: "b.zip", createdBy: "creatorB" },
  ] as any).onConflictDoNothing();

  // Coupons: one by creator A, one by admin. Both 10% off, scope "all".
  await db.insert(schema.coupons).values([
    { id: 9001, code: "ACREATOR", discountType: "percentage", discountValue: "10", scope: "all", createdBy: "creatorA" },
    { id: 9002, code: "ADMINALL", discountType: "percentage", discountValue: "10", scope: "all", createdBy: "adminU" },
  ] as any).onConflictDoNothing();

  const cartAB = [
    { itemType: "prop", itemId: "propA", price: "100", quantity: 1 },
    { itemType: "prop", itemId: "propB", price: "100", quantity: 1 },
  ];
  const cartBonly = [{ itemType: "prop", itemId: "propB", price: "100", quantity: 1 }];

  let pass = 0, fail = 0;
  const check = (name: string, cond: boolean, extra?: any) => {
    console.log(`  ${cond ? "✓" : "✗"} ${name}${extra !== undefined ? "  → " + JSON.stringify(extra) : ""}`);
    cond ? pass++ : fail++;
  };

  // 1. Creator A's coupon on a cart with A's + B's prop → discount ONLY on A's 100 → 10.
  const r1 = await validateCoupon("ACREATOR", "buyer", 200, cartAB as any);
  check("creator coupon discounts ONLY own prop (10, not 20)", (r1 as any)?.discountAmount === 10, r1);

  // 2. Admin coupon on same cart → discounts everything (200 → 20).
  const r2 = await validateCoupon("ADMINALL", "buyer", 200, cartAB as any);
  check("admin coupon discounts all items (20)", (r2 as any)?.discountAmount === 20, r2);

  // 3. Creator A's coupon on a cart of ONLY B's prop → rejected (no discount).
  const r3 = await validateCoupon("ACREATOR", "buyer", 100, cartBonly as any);
  check("creator coupon on another seller's prop → rejected", !!(r3 as any)?.error && (r3 as any)?.discountAmount === undefined, r3);

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error("test crashed:", e); process.exit(1); });
