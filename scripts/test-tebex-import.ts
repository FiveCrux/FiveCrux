// Focused local test for the per-seller Tebex store connect + import (DB layer).
// Isolated PGlite dir; applies migrations; exercises setUserTebexStoreToken,
// createScript-from-package mapping, and getUserImportedTebexPackageIds dedupe.
// (getPackages() itself is the existing Tebex client — not re-tested here.)
//   Run: npx tsx scripts/test-tebex-import.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-ti";
process.env.DATABASE_URL ||= "postgres://placeholder/local";
process.env.NEXTAUTH_SECRET ||= "test-secret";
process.env.DISCORD_CLIENT_ID ||= "test";
process.env.DISCORD_CLIENT_SECRET ||= "test";

import { rmSync } from "node:fs";

async function main() {
  rmSync("./.pglite-test-ti", { recursive: true, force: true });

  const { db } = await import("../lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("../lib/db/schema");
  const dbfns = await import("../lib/database-new");

  await migrate(db as any, { migrationsFolder: "./drizzle" });
  await db
    .insert(schema.users)
    .values({ id: "seller1", name: "Seller One", email: "s1@example.com", roles: ["user", "verified_creator"] })
    .onConflictDoNothing();

  let pass = 0,
    fail = 0;
  const check = (name: string, cond: boolean) => {
    console.log(`  ${cond ? "✓" : "✗"} ${name}`);
    cond ? pass++ : fail++;
  };

  // Fake Tebex packages (what getPackages(token) would return).
  const fakePackages = [
    { id: 5829104, name: "Advanced Banking", description: "<p>Full <b>banking</b> system</p>", image: "https://x/b.png", total_price: 25, base_price: 25, currency: "EUR", category: { id: 1, name: "Scripts" } },
    { id: 771234, name: "Drift MLO", description: "", image: null, total_price: 40, base_price: 40, currency: "EUR", category: null },
  ];
  const token = "tbx_testtoken";
  const stripHtml = (s: string | null | undefined) => (s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  // 1. Connect (save token).
  const saved = await dbfns.setUserTebexStoreToken("seller1", token);
  check("token saved on user", (saved as any)?.tebexStoreToken === token);

  // 2. Nothing imported yet.
  const before = await dbfns.getUserImportedTebexPackageIds("seller1");
  check("no imported package ids initially", before.length === 0);

  // 3. Import both packages (mirrors the import route's createScript mapping).
  const u = await dbfns.getUserById("seller1");
  for (const p of fakePackages) {
    const price = Number(p.total_price ?? p.base_price ?? 0);
    await dbfns.createScript({
      title: p.name,
      description: stripHtml(p.description) || p.name,
      price: String(price),
      currency: p.currency || null,
      category: p.category?.name || "Other",
      images: p.image ? [p.image] : [],
      coverImage: p.image || null,
      sellerId: "seller1",
      seller_name: u?.name || "Seller",
      seller_email: u?.email || "unknown@example.com",
      free: price === 0,
      tebexStoreToken: token,
      tebexPackageId: String(p.id),
    } as any);
  }

  // 4. Both now show as imported (dedupe source).
  const after = await dbfns.getUserImportedTebexPackageIds("seller1");
  console.log("  imported ids:", JSON.stringify(after));
  check("both package ids now imported", after.includes("5829104") && after.includes("771234"));
  check("imported count = 2", after.length === 2);

  // 5. The created listings carry the right fields (pending).
  const rows = await db.select().from(schema.pendingScripts).where(schema.pendingScripts.sellerId ? undefined : undefined);
  const all = await db.select().from(schema.pendingScripts);
  const banking = all.find((s: any) => s.tebexPackageId === "5829104");
  check("banking listing created", !!banking);
  check("title from Tebex name", banking?.title === "Advanced Banking");
  check("HTML stripped from description", banking?.description === "Full banking system");
  check("price mapped", String(banking?.price) === "25");
  check("store token linked", (banking as any)?.tebexStoreToken === token);
  check("category from Tebex", banking?.category === "Scripts");
  const drift = all.find((s: any) => s.tebexPackageId === "771234");
  check("free flag when price 0? (drift is 40 → not free)", drift?.free === false);
  check("no-category package falls back to 'Other'", drift?.category === "Other");
  void rows;

  // 6. Disconnect clears the token.
  const cleared = await dbfns.setUserTebexStoreToken("seller1", null);
  check("token cleared on disconnect", (cleared as any)?.tebexStoreToken == null);

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});
