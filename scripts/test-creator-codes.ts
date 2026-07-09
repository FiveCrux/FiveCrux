// Creator codes: storewide discount + commission math, one-use-per-buyer,
// and access-control gating. Mirrors test-creator-coupon.ts's approach —
// tests the validation/math functions directly (checkout's actual Tebex
// calls aren't mocked here).
//   Run: npx tsx scripts/test-creator-codes.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-cc2";
process.env.DATABASE_URL ||= "postgres://placeholder/local";
process.env.NEXTAUTH_SECRET ||= "x";
process.env.DISCORD_CLIENT_ID ||= "x";
process.env.DISCORD_CLIENT_SECRET ||= "x";

import { rmSync } from "node:fs";

async function main() {
  rmSync("./.pglite-test-cc2", { recursive: true, force: true });
  const { db } = await import("../lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("../lib/db/schema");
  const { validateCreatorCode } = await import("../lib/creator-code-utils");
  const { canManageCreatorCodes } = await import("../lib/creator-code-access");

  await migrate(db as any, { migrationsFolder: "./drizzle" });

  await db.insert(schema.users).values([
    { id: "creatorA", name: "Creator A", roles: ["user", "verified_creator"] },
    { id: "plainUser", name: "Plain User", roles: ["user"] },
    { id: "buyer", name: "Buyer", roles: ["user"] },
    { id: "buyer2", name: "Buyer 2", roles: ["user"] },
  ]).onConflictDoNothing();

  await db.insert(schema.approvedProps).values([
    { id: "propX", name: "Prop X", description: "X", price: "100", zipFile: "x.zip", createdBy: "creatorA" },
  ] as any).onConflictDoNothing();

  // 10% buyer discount, 5% creator commission.
  const [code] = await db.insert(schema.creatorCodes).values({
    code: "PROMO10",
    createdBy: "creatorA",
    discountType: "Percentage",
    discountValue: "10",
    commissionType: "Percentage",
    commissionValue: "5",
    isActive: true,
  }).returning();

  const [inactiveCode] = await db.insert(schema.creatorCodes).values({
    code: "OLDCODE",
    createdBy: "creatorA",
    discountType: "Percentage",
    discountValue: "10",
    commissionType: "Percentage",
    commissionValue: "5",
    isActive: false,
  }).returning();

  let pass = 0, fail = 0;
  const check = (name: string, cond: boolean, extra?: any) => {
    console.log(`  ${cond ? "✓" : "✗"} ${name}${extra !== undefined ? "  → " + JSON.stringify(extra) : ""}`);
    cond ? pass++ : fail++;
  };

  // 1. Basic validate: cart total 200, 10% off -> discount 20, payable 180,
  //    commission 5% of 180 (post-discount) -> 9.
  const r1 = await validateCreatorCode("PROMO10", "buyer", 200);
  check("discountAmount == 20", (r1 as any)?.discountAmount === 20, r1);
  check("commissionAmount == 9 (5% of post-discount 180)", (r1 as any)?.commissionAmount === 9, r1);

  // 2. Invalid code.
  const r2 = await validateCreatorCode("NOPE", "buyer", 200);
  check("unknown code -> error", !!(r2 as any)?.error, r2);

  // 3. Inactive code.
  const r3 = await validateCreatorCode("OLDCODE", "buyer", 200);
  check("inactive code -> error", !!(r3 as any)?.error, r3);

  // 4. Storewide — NOT restricted to the creator's own products (no items
  //    param at all, unlike coupons) — same buyer, different code works
  //    independent of cart contents.
  const r4 = await validateCreatorCode("PROMO10", "buyer2", 50);
  check("storewide: works for any buyer/cart total", (r4 as any)?.discountAmount === 5, r4);

  // 5. One redemption per buyer: record a redemption, then re-validate for
  //    the SAME buyer -> rejected.
  await db.insert(schema.creatorCodeRedemptions).values({
    creatorCodeId: code.id,
    userId: "buyer",
    discountAmount: "20.00",
    commissionAmount: "9.00",
  });
  const r5 = await validateCreatorCode("PROMO10", "buyer", 200);
  check("same buyer reusing code -> rejected", !!(r5 as any)?.error, r5);

  // A DIFFERENT buyer can still use it.
  const r6 = await validateCreatorCode("PROMO10", "buyer2", 200);
  check("different buyer can still use the same code", (r6 as any)?.discountAmount === 20, r6);

  // 6. Access control: verified_creator can manage; plain user with no
  //    listing cannot.
  const canA = await canManageCreatorCodes("creatorA", ["user", "verified_creator"]);
  check("verified_creator CAN manage creator codes", canA === true);
  const canPlain = await canManageCreatorCodes("plainUser", ["user"]);
  check("plain user with no listing CANNOT manage creator codes", canPlain === false);

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error("test crashed:", e); process.exit(1); });
