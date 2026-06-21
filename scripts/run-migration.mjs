// Generic ADDITIVE SQL migration runner against the DATABASE_URL in .env.local.
// Pass the .sql path as an argument. Use only for additive/idempotent files
// (CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING).
//
// HUMAN-ONLY. Gated behind ALLOW_PROD_DB_WRITE=1 (per CLAUDE.md). Claude will
// NOT set it / will NOT run this.
//
//   PowerShell:  $env:ALLOW_PROD_DB_WRITE="1"; node scripts/run-migration.mjs docs/frameworks-migration.sql
//   bash:        ALLOW_PROD_DB_WRITE=1 node scripts/run-migration.mjs docs/frameworks-migration.sql
import postgres from "postgres";
import { readFileSync } from "fs";

if (process.env.ALLOW_PROD_DB_WRITE !== "1") {
  console.error("\n✋ Refusing to run. This WRITES to the database in .env.local.");
  console.error("   Re-run with (PowerShell):");
  console.error('   $env:ALLOW_PROD_DB_WRITE="1"; node scripts/run-migration.mjs <path-to.sql>\n');
  process.exit(2);
}

const file = process.argv[2];
if (!file) {
  console.error("\n✗ Usage: node scripts/run-migration.mjs <path-to.sql>\n");
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
  const sqlText = readFileSync(file, "utf8");

  console.log(`\n▶ Target: ${host}`);
  console.log(`▶ Applying: ${file} (additive, idempotent)\n`);

  const sql = postgres(url, { max: 1, idle_timeout: 5 });
  try {
    await sql.unsafe(sqlText).simple();
    console.log("✓ Migration applied.\n");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => { console.error("\n✗ Migration failed:", e.message); process.exit(1); });
