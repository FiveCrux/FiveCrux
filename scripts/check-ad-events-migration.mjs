// READ-ONLY: checks whether the `ad_events` table (+ its lookup index) exists
// in the .env.local DATABASE_URL, and its row count. No writes, no PII.
//   node scripts/check-ad-events-migration.mjs
import postgres from "postgres";
import { readFileSync } from "fs";

function getDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const txt = readFileSync(".env.local", "utf8");
  const m = txt.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
  if (!m) throw new Error("DATABASE_URL not found in .env.local");
  return m[1].trim().replace(/^['"]|['"]$/g, "");
}

const sql = postgres(getDbUrl(), { max: 1, idle_timeout: 5 });
try {
  const [{ exists }] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ad_events'
    ) AS exists`;

  if (!exists) {
    console.log(`✗ "ad_events" table does NOT exist — migration not run yet`);
  } else {
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM ad_events`;
    console.log(`✓ "ad_events" table EXISTS — ${count} row(s)`);

    const [{ exists: idxExists }] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'ad_events_lookup_idx'
      ) AS exists`;
    console.log(idxExists ? `✓ index "ad_events_lookup_idx" EXISTS` : `✗ index "ad_events_lookup_idx" MISSING`);

    const cols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ad_events'
      ORDER BY ordinal_position`;
    console.log("columns:", cols.map((c) => `${c.column_name}:${c.data_type}`).join(", "));
  }
} finally {
  await sql.end({ timeout: 5 });
}
