// READ-ONLY: checks whether the `site_content` table exists in the .env.local
// DATABASE_URL, and its row count. No writes, no PII.
//   node scripts/check-site-content-migration.mjs
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
      WHERE table_schema = 'public' AND table_name = 'site_content'
    ) AS exists`;

  if (!exists) {
    console.log(`✗ "site_content" table does NOT exist — migration not run yet`);
  } else {
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM site_content`;
    console.log(`✓ "site_content" table EXISTS — ${count} row(s)`);

    const cols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'site_content'
      ORDER BY ordinal_position`;
    console.log("columns:", cols.map((c) => `${c.column_name}:${c.data_type}`).join(", "));

    const rows = await sql`SELECT key, updated_at FROM site_content`;
    console.log("rows:", rows.map((r) => `${r.key} (updated ${r.updated_at})`).join(", ") || "(none)");
  }
} finally {
  await sql.end({ timeout: 5 });
}
