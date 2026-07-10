// Site content (home page CMS): default fallback, save + merge, and partial-save
// safety (missing sections fall back to defaults instead of breaking).
//   Run: npx tsx scripts/test-site-content.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-sc";
process.env.DATABASE_URL ||= "postgres://placeholder/local";
process.env.NEXTAUTH_SECRET ||= "x";
process.env.DISCORD_CLIENT_ID ||= "x";
process.env.DISCORD_CLIENT_SECRET ||= "x";

import { rmSync } from "node:fs";

async function main() {
  rmSync("./.pglite-test-sc", { recursive: true, force: true });
  const { db } = await import("../lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { DEFAULT_HOME_CONTENT, getHomeContent, saveHomeContent } = await import("../lib/site-content");

  await migrate(db as any, { migrationsFolder: "./drizzle" });

  let pass = 0, fail = 0;
  const check = (name: string, cond: boolean) => {
    if (cond) { pass++; console.log(`  ok   ${name}`); }
    else { fail++; console.log(`  FAIL ${name}`); }
  };

  // 1. Before any save, reads should return pure defaults.
  const before = await getHomeContent();
  check("no row yet -> returns defaults", before.heroPromo.badge === DEFAULT_HOME_CONTENT.heroPromo.badge);
  check("no row yet -> faq items match defaults", before.faq.items.length === DEFAULT_HOME_CONTENT.faq.items.length);

  // 2. Save a full edit, read it back.
  const edited = {
    ...DEFAULT_HOME_CONTENT,
    heroPromo: { ...DEFAULT_HOME_CONTENT.heroPromo, badge: "Custom Badge", ctaPrimary: "Go Featured" },
  };
  await saveHomeContent(edited);
  const after = await getHomeContent();
  check("saved badge round-trips", after.heroPromo.badge === "Custom Badge");
  check("saved cta round-trips", after.heroPromo.ctaPrimary === "Go Featured");
  check("untouched section (faq) still intact", after.faq.heading === DEFAULT_HOME_CONTENT.faq.heading);

  // 3. Upsert again (conflict path) — second save overwrites, doesn't duplicate.
  await saveHomeContent({ ...after, whyChooseUs: { ...after.whyChooseUs, heading: "Second Save" } });
  const after2 = await getHomeContent();
  check("second save (upsert) overwrites in place", after2.whyChooseUs.heading === "Second Save");
  check("second save keeps earlier edit (badge)", after2.heroPromo.badge === "Custom Badge");

  const rows = await db.query.siteContent.findMany();
  check("exactly one 'home' row exists (no duplicate insert)", rows.filter((r: any) => r.key === "home").length === 1);

  // 4. Partial/legacy shape saved directly to the DB (simulates an older or
  // malformed value) should still merge safely on read, not throw or drop fields.
  const { siteContent } = await import("../lib/db/schema");
  const { eq } = await import("drizzle-orm");
  await db.update(siteContent).set({ value: { heroPromo: { badge: "Partial Only" } } }).where(eq(siteContent.key, "home"));
  const partial = await getHomeContent();
  check("partial DB value merges over defaults (badge)", partial.heroPromo.badge === "Partial Only");
  check("partial DB value falls back for missing field (ctaPrimary)", partial.heroPromo.ctaPrimary === DEFAULT_HOME_CONTENT.heroPromo.ctaPrimary);
  check("partial DB value falls back for whole missing section (faq)", partial.faq.items.length === DEFAULT_HOME_CONTENT.faq.items.length);

  console.log(`\n${pass}/${pass + fail} passing`);
  rmSync("./.pglite-test-sc", { recursive: true, force: true });
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
