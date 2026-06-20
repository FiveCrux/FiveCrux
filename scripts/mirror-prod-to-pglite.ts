// READ-ONLY mirror: copies prod (Neon) display data into the local PGlite DB so
// you can run the app locally against REAL prod data — with ZERO write risk to
// prod (only SELECTs run on Neon; the app then runs on the local copy).
//
//   USE_PGLITE=true npx tsx scripts/mirror-prod-to-pglite.ts
import { readFileSync } from "fs";
import postgres from "postgres";
import { drizzle as pgDrizzle } from "drizzle-orm/postgres-js";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as liteDrizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../lib/db/schema";

function getDbUrl(): string {
  if (process.env.DATABASE_URL && !/dummy_never_used/.test(process.env.DATABASE_URL)) return process.env.DATABASE_URL;
  const txt = readFileSync(".env.local", "utf8");
  const m = txt.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
  if (!m) throw new Error("DATABASE_URL not found in .env.local");
  return m[1].trim().replace(/^['"]|['"]$/g, "");
}

// Order matters for FKs: users first, then everything referencing them.
const TABLES: { name: string; t: any }[] = [
  { name: "users", t: schema.users },
  { name: "subscriptions", t: schema.subscriptions },
  { name: "coupons", t: schema.coupons },
  { name: "approved_scripts", t: schema.approvedScripts },
  { name: "pending_scripts", t: schema.pendingScripts },
  { name: "approved_props", t: schema.approvedProps },
  { name: "pending_props", t: schema.pendingProps },
  { name: "approved_giveaways", t: schema.approvedGiveaways },
  { name: "giveaway_requirements", t: schema.giveawayRequirements },
  { name: "giveaway_prizes", t: schema.giveawayPrizes },
  { name: "giveaway_prize_winners", t: schema.giveawayPrizeWinners },
  { name: "giveaway_entries", t: schema.giveawayEntries },
  { name: "approved_ads", t: schema.approvedAds },
  { name: "featured_scripts", t: schema.featuredScripts },
  { name: "user_ad_slots", t: schema.userAdSlots },
  { name: "user_featured_script_slots", t: schema.userFeaturedScriptSlots },
];

async function main() {
  const url = getDbUrl();
  const host = (url.match(/@([^/]+)\//) || [])[1] || "?";
  console.log(`\n▶ READ-ONLY mirror from ${host} → local ./.pglite\n`);

  // Prod: read-only connection (belt-and-suspenders; we only SELECT anyway).
  const prod = pgDrizzle(postgres(url, { max: 1, idle_timeout: 5, connection: { default_transaction_read_only: true as any } }), { schema });

  // Local PGlite: fresh + migrated.
  const client = new PGlite(process.env.PGLITE_DIR || "./.pglite");
  const lite = liteDrizzle(client, { schema });
  await migrate(lite, { migrationsFolder: "./drizzle" });
  console.log("✓ local schema migrated\n");

  for (const { name, t } of TABLES) {
    try {
      const rows = await (prod as any).select().from(t);
      if (rows.length) {
        await (lite as any).insert(t).values(rows).onConflictDoNothing();
      }
      console.log(`  ✓ ${name}: ${rows.length}`);
    } catch (e: any) {
      console.log(`  ✗ ${name}: ${e.message?.slice(0, 80)}`);
    }
  }

  await client.close();
  console.log("\n✅ Prod data mirrored into ./.pglite (prod was only READ). Start the app with USE_PGLITE=true.");
  process.exit(0);
}
main().catch((e) => { console.error("mirror failed:", e.message); process.exit(1); });
