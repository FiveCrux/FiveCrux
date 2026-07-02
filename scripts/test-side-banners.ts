// Focused local test for the scarce side-banner inventory + overselling lock.
// Uses an ISOLATED PGlite dir (won't touch the dev server's ./.pglite), applies
// the drizzle migrations, then exercises reserve → lock → activate → availability.
//   Run: npx tsx scripts/test-side-banners.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-sb";
// Placeholders only to satisfy lib/env.ts validation — never used to connect
// because USE_PGLITE routes every query to the in-process PGlite DB.
process.env.DATABASE_URL ||= "postgres://placeholder/local";
process.env.NEXTAUTH_SECRET ||= "test-secret";
process.env.DISCORD_CLIENT_ID ||= "test";
process.env.DISCORD_CLIENT_SECRET ||= "test";

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

  // 1. Both tested positions free initially (4 slots exist total; we exercise two).
  const avail0 = await sb.getSideBannerAvailability();
  log("availability (initial)", avail0);
  check("left-top available initially", avail0["left-top"].available === true);
  check("right-top available initially", avail0["right-top"].available === true);

  // 2. Reserve LEFT-TOP → ok.
  const r1 = await sb.reserveSideBanner({ position: "left-top", userId: "tester", durationWeeks: 1, imageUrl: "https://x/img.png", linkUrl: "https://x" });
  log("reserve left-top #1", r1);
  check("first reserve ok", r1.ok === true);

  // 3a. Same user re-reserves the SAME slot → reuse-own-hold returns their existing
  //     booking (by design, so a buyer can resume their own abandoned hold).
  const rSame = await sb.reserveSideBanner({ position: "left-top", userId: "tester", durationWeeks: 2 });
  log("reserve left-top again (same user → reuse own hold)", rSame);
  check("same user reuses own hold", rSame.ok === true && (rSame as any).bookingId === (r1 as any).bookingId);

  // 3b. A DIFFERENT user reserving the SAME held slot → rejected by the oversell lock.
  const r2 = await sb.reserveSideBanner({ position: "left-top", userId: "tester2", durationWeeks: 2 });
  log("reserve left-top #2 (different user → should be taken)", r2);
  check("OVERSELLING LOCK: different user rejected", r2.ok === false && (r2 as any).reason === "taken");

  // 4. Right-top still free (independent position).
  const availMid = await sb.getSideBannerAvailability();
  check("left-top now unavailable", availMid["left-top"].available === false);
  check("right-top still available", availMid["right-top"].available === true);

  // 5. Activate the left-top reservation (simulates Tebex payment webhook).
  const act = await sb.activateSideBanner((r1 as any).bookingId, "order-123");
  log("activate left-top", act);
  check("activate ok", act.activated === true);

  const active = await sb.getActiveSideBanners();
  log("active banners", { "left-top": !!active["left-top"], "right-top": !!active["right-top"] });
  check("left-top now active (shown on pages)", !!active["left-top"] && active["left-top"].status === "active");
  check("left-top has order reference", active["left-top"]?.orderReference === "order-123");

  // 6. Reserve right-top → ok (independent position still free).
  const r3 = await sb.reserveSideBanner({ position: "right-top", userId: "tester", durationWeeks: 1, imageUrl: "https://y/img.png" });
  check("reserve right-top ok", r3.ok === true);

  // 7. Both tested positions now taken.
  const availFull = await sb.getSideBannerAvailability();
  log("availability (both tested slots taken)", availFull);
  check("both tested slots unavailable when full", availFull["left-top"].available === false && availFull["right-top"].available === false);

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});
