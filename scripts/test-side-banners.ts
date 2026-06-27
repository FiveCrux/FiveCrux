// Focused local test for the scarce side-banner inventory + overselling lock.
// Uses an ISOLATED PGlite dir (won't touch the dev server's ./.pglite), applies
// the drizzle migrations, then exercises reserve → lock → activate → availability.
//   Run: npx tsx scripts/test-side-banners.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-sb";

import { rmSync } from "node:fs";

async function main() {
  rmSync("./.pglite-test-sb", { recursive: true, force: true });

  // Dynamic imports AFTER env is set so the db client targets the test dir.
  const { db } = await import("../lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("../lib/db/schema");
  const sb = await import("../lib/database-new");

  await migrate(db as any, { migrationsFolder: "./drizzle" });
  await db.insert(schema.users).values({ id: "tester", name: "Tester", roles: ["user"] }).onConflictDoNothing();

  const log = (label: string, v: any) => console.log(`\n• ${label}:`, JSON.stringify(v));
  let pass = 0, fail = 0;
  const check = (name: string, cond: boolean) => {
    console.log(`  ${cond ? "✓" : "✗"} ${name}`);
    cond ? pass++ : fail++;
  };

  // 1. Both positions free initially.
  const avail0 = await sb.getSideBannerAvailability();
  log("availability (initial)", avail0);
  check("left available initially", avail0.left.available === true);
  check("right available initially", avail0.right.available === true);

  // 2. Reserve LEFT → ok.
  const r1 = await sb.reserveSideBanner({ position: "left", userId: "tester", durationWeeks: 1, imageUrl: "https://x/img.png", linkUrl: "https://x" });
  log("reserve left #1", r1);
  check("first reserve ok", r1.ok === true);

  // 3. Reserve LEFT AGAIN (the race) → must be rejected by the lock.
  const r2 = await sb.reserveSideBanner({ position: "left", userId: "tester", durationWeeks: 2 });
  log("reserve left #2 (should be taken)", r2);
  check("OVERSELLING LOCK: second reserve rejected", r2.ok === false && (r2 as any).reason === "taken");

  // 4. Right still free (independent position).
  const availMid = await sb.getSideBannerAvailability();
  check("left now unavailable", availMid.left.available === false);
  check("right still available", availMid.right.available === true);

  // 5. Activate the left reservation (simulates Tebex payment webhook).
  const act = await sb.activateSideBanner((r1 as any).bookingId, "order-123");
  log("activate left", act);
  check("activate ok", act.activated === true);

  const active = await sb.getActiveSideBanners();
  log("active banners", { left: !!active.left, right: !!active.right });
  check("left now active (shown on pages)", !!active.left && active.left.status === "active");
  check("left has order reference", active.left?.orderReference === "order-123");

  // 6. Reserve right → ok (still one free).
  const r3 = await sb.reserveSideBanner({ position: "right", userId: "tester", durationWeeks: 1, imageUrl: "https://y/img.png" });
  check("reserve right ok", r3.ok === true);

  // 7. Both now taken.
  const availFull = await sb.getSideBannerAvailability();
  log("availability (both taken)", availFull);
  check("both unavailable when full", availFull.left.available === false && availFull.right.available === false);

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});
