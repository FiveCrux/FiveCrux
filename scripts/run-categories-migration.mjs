// Runs docs/categories-migration.sql against the DATABASE_URL in .env.local.
// ADDITIVE + idempotent (CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING) —
// safe to run more than once; nothing is dropped/renamed and no existing row is
// touched.
//
// HUMAN-ONLY. Gated behind ALLOW_PROD_DB_WRITE=1 (that flag is for the human by
// hand). Do NOT set it / run this automatically.
//
//   PowerShell:  $env:ALLOW_PROD_DB_WRITE="1"; node scripts/run-categories-migration.mjs
//   bash:        ALLOW_PROD_DB_WRITE=1 node scripts/run-categories-migration.mjs
import postgres from "postgres";
import { readFileSync } from "fs";

if (process.env.ALLOW_PROD_DB_WRITE !== "1") {
  console.error("\n✋ Refusing to run. This WRITES to the database in .env.local.");
  console.error("   If you (the human) intend to run it, re-run with:\n");
  console.error('   PowerShell:  $env:ALLOW_PROD_DB_WRITE="1"; node scripts/run-categories-migration.mjs\n');
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
  const sqlText = readFileSync("docs/categories-migration.sql", "utf8");

  console.log(`\n▶ Target: ${host}`);
  console.log(`▶ Applying: docs/categories-migration.sql (additive, idempotent)\n`);

  const sql = postgres(url, { max: 1, idle_timeout: 5 });
  try {
    // .simple() lets postgres-js run the whole multi-statement file in one go.
    await sql.unsafe(sqlText).simple();
    console.log("✓ Migration applied.\n");

    // Read-only verification.
    const rows = await sql`
      SELECT id, name, slug, show_on_home FROM categories ORDER BY sort_order`;
    console.log(`categories table → ${rows.length} row(s):`);
    for (const r of rows) {
      console.log(`  • ${r.id}  ${r.name}  (/${r.slug})  home=${r.show_on_home}`);
    }
    console.log(
      `\n${rows.length >= 6 ? "✅ All good — categories table is in place and seeded." : "⚠️ Table exists but fewer rows than expected — re-check above."}`
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => { console.error("\n✗ Migration failed:", e.message); process.exit(1); });
