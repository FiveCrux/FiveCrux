// Runs docs/tebex-additive-migration.sql against the DATABASE_URL in .env.local.
// ADDITIVE + idempotent (IF NOT EXISTS) — safe to run more than once; nothing is
// dropped/renamed/type-changed and no existing row is touched.
//
// HUMAN-ONLY. Gated behind ALLOW_PROD_DB_WRITE=1 (per CLAUDE.md, that flag is for
// the human by hand). Claude will NOT set it / will NOT run this.
//
//   ALLOW_PROD_DB_WRITE=1 node scripts/run-tebex-migration.mjs
import postgres from "postgres";
import { readFileSync } from "fs";

if (process.env.ALLOW_PROD_DB_WRITE !== "1") {
  console.error("\n✋ Refusing to run. This WRITES to the database in .env.local.");
  console.error("   If you (the human) intend to run it, re-run with:\n");
  console.error("   ALLOW_PROD_DB_WRITE=1 node scripts/run-tebex-migration.mjs\n");
  process.exit(2);
}

function getDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const txt = readFileSync(".env.local", "utf8");
  const m = txt.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
  if (!m) throw new Error("DATABASE_URL not found in .env.local");
  return m[1].trim().replace(/^['"]|['"]$/g, "");
}

async function main() {
  const url = getDbUrl();
  const host = (url.match(/@([^/]+)\//) || [])[1] || "?";
  const sqlText = readFileSync("docs/tebex-additive-migration.sql", "utf8");

  console.log(`\n▶ Target: ${host}`);
  console.log(`▶ Applying: docs/tebex-additive-migration.sql (additive, idempotent)\n`);

  const sql = postgres(url, { max: 1, idle_timeout: 5 });
  try {
    // .simple() lets postgres-js run the whole multi-statement file in one go.
    await sql.unsafe(sqlText).simple();
    console.log("✓ Migration applied.\n");

    // Read-only verification.
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name IN ('tebex_orders','subscriptions')
      ORDER BY table_name`;
    const cols = await sql`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE column_name IN ('tebex_store_token','tebex_package_id')
      ORDER BY table_name, column_name`;

    console.log(`New tables present: ${tables.map((t) => t.table_name).join(", ") || "(none!)"}`);
    console.log(`Tebex columns present on ${cols.length / 2} tables:`);
    const byTable = {};
    for (const c of cols) (byTable[c.table_name] ??= []).push(c.column_name);
    for (const [t, cs] of Object.entries(byTable)) console.log(`  • ${t}: ${cs.join(", ")}`);

    const okTables = tables.length === 2;
    const okCols = cols.length === 12; // 6 tables × 2 columns
    console.log(`\n${okTables && okCols ? "✅ All good — tables + columns are in place." : "⚠️ Something is off — re-check the output above."}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => { console.error("\n✗ Migration failed:", e.message); process.exit(1); });
