// LOCAL-ONLY Part-A verification. Runs entirely against PGlite (USE_PGLITE).
// Proves the prod-aligned data layer: app-generated integer PKs + the
// paypal_order_id / featured_paypal_order_id slot columns. Never touches Neon.
//
//   USE_PGLITE=true npx tsx scripts/verify-part-a.ts
import { db } from "../lib/db/client";
import * as dbn from "../lib/database-new";
import { sql } from "drizzle-orm";

if (process.env.USE_PGLITE !== "true") {
  console.error("Refusing to run without USE_PGLITE=true (safety).");
  process.exit(2);
}

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, x = "") => { if (c) { console.log(`  ✓ ${n}`); pass++; } else { console.log(`  ✗ ${n} ${x}`); fail++; } };

async function main() {
  // Pick a real seeded user to attach slots to.
  const urows: any = await db.execute(sql`select id from users where roles::text like '%creator%' limit 1`);
  const userId = urows?.[0]?.id ?? urows?.rows?.[0]?.id;
  ok("found a seeded creator user", !!userId, JSON.stringify(urows));

  // 1) createScript — app-generated integer PK (returns the new id as a number)
  try {
    const id: any = await dbn.createScript({
      title: "PartA Verify Script",
      description: "verify",
      price: 9.99,
      sellerId: userId,
      category: "scripts",
    } as any);
    ok("createScript returns an app-generated integer id", typeof id === "number" && Number.isFinite(id), JSON.stringify(id));
  } catch (e: any) { ok("createScript", false, e.message); }

  // 2) createAdSlots — writes paypal_order_id, app-gen id
  try {
    const slot: any = await dbn.createAdSlots(userId, 1, ["pp_order_ABC"], "starter", 1);
    ok("createAdSlots returns integer id", typeof slot?.id === "number");
    const r: any = await db.execute(sql`select id, paypal_order_id from user_ad_slots where id = ${slot.id}`);
    const row = r?.[0] ?? r?.rows?.[0];
    ok("user_ad_slots.paypal_order_id persisted", row?.paypal_order_id === "pp_order_ABC", JSON.stringify(row));
  } catch (e: any) { ok("createAdSlots", false, e.message); }

  // 3) createFeaturedScriptSlots — writes featured_paypal_order_id, app-gen id
  try {
    const fslot: any = await dbn.createFeaturedScriptSlots(userId, 1, ["pp_feat_XYZ"], "starter", 1, 4);
    ok("createFeaturedScriptSlots returns integer id", typeof fslot?.id === "number");
    const r: any = await db.execute(sql`select id, featured_paypal_order_id from user_featured_script_slots where id = ${fslot.id}`);
    const row = r?.[0] ?? r?.rows?.[0];
    ok("user_featured_script_slots.featured_paypal_order_id persisted", row?.featured_paypal_order_id === "pp_feat_XYZ", JSON.stringify(row));
  } catch (e: any) { ok("createFeaturedScriptSlots", false, e.message); }

  // 4) Confirm no GENERATED IDENTITY remained (PKs are plain integer, app-filled)
  try {
    const r: any = await db.execute(sql`
      select count(*)::int as n from information_schema.columns
      where table_schema='public' and column_name='id' and is_identity='YES'`);
    const n = (r?.[0]?.n ?? r?.rows?.[0]?.n ?? 0);
    ok("no identity PK columns in local schema (matches prod)", Number(n) === 0, JSON.stringify(r?.[0] ?? r?.rows?.[0]));
  } catch (e: any) { ok("identity check", false, e.message); }

  console.log(`\nPart A verify: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main();
