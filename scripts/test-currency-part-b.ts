// Currency Part B: props/coupons/creator-codes now carry a currency symbol.
//   Run: npx tsx scripts/test-currency-part-b.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-curb";
process.env.DATABASE_URL ||= "postgres://placeholder/local";
process.env.NEXTAUTH_SECRET ||= "x";
process.env.DISCORD_CLIENT_ID ||= "x";
process.env.DISCORD_CLIENT_SECRET ||= "x";

import { rmSync } from "node:fs";

async function main() {
  rmSync("./.pglite-test-curb", { recursive: true, force: true });
  const { db } = await import("../lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("../lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const { createProp } = await import("../lib/database-new");
  const { formatPrice } = await import("../lib/format-price");

  await migrate(db as any, { migrationsFolder: "./drizzle" });

  await db.insert(schema.users).values([
    { id: "creatorA", name: "Creator A", roles: ["user", "prop_lister"] },
  ]).onConflictDoNothing();

  let pass = 0, fail = 0;
  const check = (name: string, cond: boolean) => {
    if (cond) { pass++; console.log(`  ok   ${name}`); }
    else { fail++; console.log(`  FAIL ${name}`); }
  };

  // 1. Prop with EUR currency persists.
  const propId = await createProp({
    name: "Test Prop", description: "d", price: "50",
    currency: "EUR", currencySymbol: "€",
    images: [], zipFile: "", createdBy: "creatorA",
    tebexStoreToken: null, tebexPackageId: "1234",
  } as any);
  const prop = await db.query.pendingProps.findFirst({ where: eq(schema.pendingProps.id, propId) });
  check("prop currency persisted", prop?.currency === "EUR");
  check("prop currencySymbol persisted", prop?.currencySymbol === "€");

  // 2. Coupon with Amount discountType + currencySymbol.
  const [coupon] = await db.insert(schema.coupons).values({
    id: 90001, code: "AMT10", discountType: "Amount", discountValue: "10.00",
    currencySymbol: "£", scope: "Props", createdBy: "creatorA",
  } as any).returning();
  check("coupon currencySymbol persisted", coupon.currencySymbol === "£");

  // 3. Coupon with Percentage discountType has no currencySymbol (null-safe).
  const [pctCoupon] = await db.insert(schema.coupons).values({
    id: 90002, code: "PCT10", discountType: "Percentage", discountValue: "10",
    currencySymbol: null, scope: "Props", createdBy: "creatorA",
  } as any).returning();
  check("percentage coupon has null currencySymbol", pctCoupon.currencySymbol === null);

  // 4. Creator code with currencySymbol.
  const [cc] = await db.insert(schema.creatorCodes).values({
    code: "REF10", createdBy: "creatorA",
    discountType: "Amount", discountValue: "5.00",
    commissionType: "Percentage", commissionValue: "10",
    currencySymbol: "$",
  } as any).returning();
  check("creator code currencySymbol persisted", cc.currencySymbol === "$");

  // 5. formatPrice helper.
  check("formatPrice uses given symbol", formatPrice(29.9, "€") === "€29.90");
  check("formatPrice falls back to $ when no symbol", formatPrice(10, null) === "$10.00");
  check("formatPrice coerces string amounts", formatPrice("15.5", "£") === "£15.50");

  console.log(`\n${pass}/${pass + fail} passing`);
  rmSync("./.pglite-test-curb", { recursive: true, force: true });
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
