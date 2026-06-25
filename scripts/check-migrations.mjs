// READ-ONLY: checks whether the `categories` and `frameworks` tables exist in
// the .env.local DATABASE_URL, and their row counts. No writes, no PII.
//   node scripts/check-migrations.mjs
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
  for (const t of ["categories", "frameworks"]) {
    const [{ exists }] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${t}
      ) AS exists`;
    if (exists) {
      const [{ count }] = await sql.unsafe(`SELECT count(*)::int AS count FROM "${t}"`);
      console.log(`✓ "${t}" table EXISTS — ${count} row(s)  ${count > 0 ? "(seeded)" : "(empty — seed missing)"}`);
    } else {
      console.log(`✗ "${t}" table does NOT exist — migration not run yet`);
    }
  }
} finally {
  await sql.end({ timeout: 5 });
}
