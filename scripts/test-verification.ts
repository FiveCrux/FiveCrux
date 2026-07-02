// Focused local test for the verified-creator request/approval flow.
// Isolated PGlite dir (won't touch the dev server's ./.pglite), applies the
// drizzle migrations, then exercises apply → pending → approve(grant role) and
// apply → reject(reason) → re-apply.
//   Run: npx tsx scripts/test-verification.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-vr";
// Placeholders only to satisfy lib/env.ts validation — never used to connect
// because USE_PGLITE routes every query to the in-process PGlite DB.
process.env.DATABASE_URL ||= "postgres://placeholder/local";
process.env.NEXTAUTH_SECRET ||= "test-secret";
process.env.DISCORD_CLIENT_ID ||= "test";
process.env.DISCORD_CLIENT_SECRET ||= "test";

import { rmSync } from "node:fs";

async function main() {
  rmSync("./.pglite-test-vr", { recursive: true, force: true });

  const { db } = await import("../lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("../lib/db/schema");
  const dbfns = await import("../lib/database-new");

  await migrate(db as any, { migrationsFolder: "./drizzle" });
  await db
    .insert(schema.users)
    .values([
      { id: "creator1", name: "Creator One", roles: ["user"] },
      { id: "creator2", name: "Creator Two", roles: ["user"] },
      { id: "admin1", name: "Admin", roles: ["founder"] },
    ])
    .onConflictDoNothing();

  const log = (label: string, v: any) => console.log(`\n• ${label}:`, JSON.stringify(v));
  let pass = 0,
    fail = 0;
  const check = (name: string, cond: boolean) => {
    console.log(`  ${cond ? "✓" : "✗"} ${name}`);
    cond ? pass++ : fail++;
  };

  // 1. Creator submits a request.
  const c1 = await dbfns.createVerificationRequest({
    userId: "creator1",
    reason: "I make premium MLOs, 3 years in the scene.",
    links: "https://example.com/store",
    discord: "creator1#0001",
  });
  log("create request #1", c1);
  check("first request created", c1.ok === true);

  // 2. Duplicate while pending → blocked.
  const c1dup = await dbfns.createVerificationRequest({ userId: "creator1", reason: "again" });
  log("duplicate request", c1dup);
  check("duplicate blocked (pending_exists)", c1dup.ok === false && (c1dup as any).reason === "pending_exists");

  // 3. Creator sees their pending status.
  const mine = await dbfns.getUserVerificationRequest("creator1");
  check("user sees pending request", mine?.status === "pending");

  // 4. Admin queue shows it with applicant info.
  const pending1 = await dbfns.getPendingVerificationRequests();
  log("admin pending queue", pending1.map((r) => ({ id: r.id, user: r.userName, status: r.status })));
  check("request in admin queue", pending1.some((r) => r.userId === "creator1"));
  check("queue carries applicant name", pending1.find((r) => r.userId === "creator1")?.userName === "Creator One");

  // 5. Admin approves → grants verified_creator role.
  const reqId = (mine as any).id as number;
  const approve = await dbfns.reviewVerificationRequest(reqId, "admin1", "approve");
  log("approve", approve);
  check("approve ok", approve.ok === true);

  const creator1After = await dbfns.getUserById("creator1");
  log("creator1 roles after approve", creator1After?.roles);
  check("verified_creator role granted", Array.isArray(creator1After?.roles) && creator1After!.roles.includes("verified_creator"));
  check("original role kept", Array.isArray(creator1After?.roles) && creator1After!.roles.includes("user"));

  const mineAfter = await dbfns.getUserVerificationRequest("creator1");
  check("request marked approved", mineAfter?.status === "approved");

  // 6. Approved creator can't spam a new request.
  const c1again = await dbfns.createVerificationRequest({ userId: "creator1", reason: "x" });
  check("already-verified blocked", c1again.ok === false && (c1again as any).reason === "already_verified");

  // 7. Queue no longer lists the approved request.
  const pending2 = await dbfns.getPendingVerificationRequests();
  check("approved request left the queue", !pending2.some((r) => r.userId === "creator1"));

  // 8. Reject flow: creator2 applies, admin rejects with a reason.
  const c2 = await dbfns.createVerificationRequest({ userId: "creator2", reason: "please verify" });
  check("creator2 request created", c2.ok === true);
  const c2Req = await dbfns.getUserVerificationRequest("creator2");
  const reject = await dbfns.reviewVerificationRequest((c2Req as any).id, "admin1", "reject", "Need more published work first.");
  log("reject", reject);
  check("reject ok", reject.ok === true);

  const c2After = await dbfns.getUserVerificationRequest("creator2");
  check("request marked rejected", c2After?.status === "rejected");
  check("reject reason stored", c2After?.adminReason === "Need more published work first.");

  const creator2After = await dbfns.getUserById("creator2");
  check("reject did NOT grant role", !(creator2After?.roles ?? []).includes("verified_creator"));

  // 9. After rejection, creator2 can re-apply.
  const c2reapply = await dbfns.createVerificationRequest({ userId: "creator2", reason: "added 5 new releases" });
  log("re-apply after reject", c2reapply);
  check("re-apply allowed after rejection", c2reapply.ok === true);

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});
