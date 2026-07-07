// Test the recurring (Tebex subscription) slot lifecycle helpers:
//   - extendSlotsForRecurring: a renewal keeps the slot alive to the next date
//   - endRecurringSlots: subscription end frees/deactivates the slot
// Side banner is the primary case; ad/featured slots use the same code path
// (matched by the Tebex order reference).
//   Run: npx tsx scripts/test-recurring.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-rec";
process.env.DATABASE_URL ||= "postgres://placeholder/local";
process.env.NEXTAUTH_SECRET ||= "x";
process.env.DISCORD_CLIENT_ID ||= "x";
process.env.DISCORD_CLIENT_SECRET ||= "x";

import { rmSync } from "node:fs";

async function main() {
  rmSync("./.pglite-test-rec", { recursive: true, force: true });
  const { db } = await import("../lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("../lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbfns = await import("../lib/database-new");

  await migrate(db as any, { migrationsFolder: "./drizzle" });
  await db.insert(schema.users).values({ id: "buyer", name: "Buyer", roles: ["user"] }).onConflictDoNothing();

  const ORDER = "order-REC-1";
  const oldEnd = new Date("2026-07-10T00:00:00Z");
  const nextPayment = new Date("2026-08-10T00:00:00Z"); // Tebex next_payment_at

  // A subscription side-banner slot provisioned under this Tebex order ref.
  await db.insert(schema.sideBannerBookings).values({
    id: 55501,
    position: "left-top",
    status: "active",
    createdBy: "buyer",
    orderReference: ORDER,
    durationWeeks: 4,
    endDate: oldEnd,
  } as any).onConflictDoNothing();

  const get = async () => (await db.select().from(schema.sideBannerBookings).where(eq(schema.sideBannerBookings.id, 55501)))[0];

  let pass = 0, fail = 0;
  const check = (n: string, c: boolean, extra?: any) => { console.log(`  ${c ? "✓" : "✗"} ${n}${extra !== undefined ? " → " + JSON.stringify(extra) : ""}`); c ? pass++ : fail++; };

  // Before
  const before = await get();
  check("slot starts active with old endDate", before?.status === "active" && new Date(before.endDate!).getTime() === oldEnd.getTime());

  // Renewal → extend endDate to next payment date, stays active.
  const ext = await dbfns.extendSlotsForRecurring(ORDER, nextPayment);
  const afterExtend = await get();
  check("renewal matched the side-banner slot", ext.sideBanners === 1, ext);
  check("endDate extended to next_payment_at", new Date(afterExtend.endDate!).getTime() === nextPayment.getTime());
  check("slot still active after renewal", afterExtend.status === "active");

  // A wrong order ref must NOT touch this slot.
  const noop = await dbfns.extendSlotsForRecurring("order-OTHER", new Date("2027-01-01Z"));
  check("unrelated order ref extends nothing", noop.sideBanners === 0);

  // Subscription ended → slot freed (expired), so the position can be re-sold.
  const ended = await dbfns.endRecurringSlots(ORDER);
  const afterEnd = await get();
  check("end matched the slot", ended.sideBanners === 1);
  check("slot expired after subscription end", afterEnd.status === "expired");

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error("test crashed:", e); process.exit(1); });
