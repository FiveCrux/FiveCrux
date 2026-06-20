// READ-ONLY prod-match check. Confirms every column our drizzle schema declares
// actually exists in the live prod DB — because drizzle .select() lists ALL
// schema columns explicitly, any schema column missing in prod breaks reads.
//
// SAFETY: opens a strictly read-only connection (default_transaction_read_only),
// runs ONLY information_schema SELECTs. It cannot write or alter anything.
//
//   npx tsx scripts/prod-match.ts
import postgres from "postgres";
import { readFileSync } from "fs";
import { getTableColumns, getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as schema from "../lib/db/schema";

// Tebex additive surface — EXPECTED to be missing in prod until the user runs
// docs/tebex-additive-migration.sql. Listed separately, not counted as drift.
const TEBEX_TABLES = new Set(["tebex_orders", "subscriptions"]);
const TEBEX_COLUMNS = new Set(["tebex_store_token", "tebex_package_id"]);

function getDbUrl(): string {
  if (process.env.DATABASE_URL && !/dummy_never_used/.test(process.env.DATABASE_URL)) return process.env.DATABASE_URL;
  const txt = readFileSync(".env.local", "utf8");
  const m = txt.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
  if (!m) throw new Error("DATABASE_URL not found in .env.local");
  return m[1].trim().replace(/^['"]|['"]$/g, "");
}

// Expected (schema) tables -> set of SQL column names.
function schemaTables(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const v of Object.values(schema)) {
    if (v && is(v as any, PgTable)) {
      const name = getTableName(v as any);
      const cols = new Set(Object.values(getTableColumns(v as any)).map((c: any) => c.name));
      out.set(name, cols);
    }
  }
  return out;
}

async function main() {
  const url = getDbUrl();
  const host = (url.match(/@([^/]+)\//) || [])[1] || "?";
  console.log(`\n▶ READ-ONLY connect: ${host}\n`);

  const sql = postgres(url, {
    max: 1,
    idle_timeout: 5,
    connection: { default_transaction_read_only: true as any }, // belt-and-suspenders: no writes possible
  });

  let drift = 0, tebexPending = 0;
  try {
    const rows = await sql<{ table_name: string; column_name: string }[]>`
      select table_name, column_name from information_schema.columns
      where table_schema = 'public'`;
    const prod = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!prod.has(r.table_name)) prod.set(r.table_name, new Set());
      prod.get(r.table_name)!.add(r.column_name);
    }

    const expected = schemaTables();
    console.log(`Schema declares ${expected.size} tables; prod has ${prod.size} public tables.\n`);

    for (const [table, cols] of [...expected].sort((a, b) => a[0].localeCompare(b[0]))) {
      const prodCols = prod.get(table);
      const isTebexTable = TEBEX_TABLES.has(table);

      if (!prodCols) {
        if (isTebexTable) { console.log(`  ⏳ ${table} — absent in prod (Tebex additive migration pending)`); tebexPending++; }
        else { console.log(`  ✗ ${table} — MISSING TABLE in prod (DRIFT)`); drift++; }
        continue;
      }

      const missing = [...cols].filter((c) => !prodCols.has(c));
      const tebexMissing = missing.filter((c) => TEBEX_COLUMNS.has(c));
      const realMissing = missing.filter((c) => !TEBEX_COLUMNS.has(c));

      if (realMissing.length) { console.log(`  ✗ ${table} — columns missing in prod (DRIFT): ${realMissing.join(", ")}`); drift += realMissing.length; }
      if (tebexMissing.length) { tebexPending += tebexMissing.length; }
      if (!realMissing.length && !tebexMissing.length) console.log(`  ✓ ${table} — all ${cols.size} columns present`);
      else if (!realMissing.length && tebexMissing.length) console.log(`  ✓ ${table} — core columns present (⏳ ${tebexMissing.length} Tebex col pending: ${tebexMissing.join(", ")})`);
    }

    console.log(`\nDrift (must be 0 to deploy): ${drift}`);
    console.log(`Tebex-pending (added by your migration): ${tebexPending}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
  process.exit(drift ? 1 : 0);
}

main().catch((e) => { console.error("prod-match failed:", e.message); process.exit(2); });
