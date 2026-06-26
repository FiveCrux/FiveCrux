// READ-ONLY: checks whether the `hide_price` column exists on the scripts tables.
//   node scripts/check-hide-price.mjs
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
  for (const t of ["approved_scripts", "pending_scripts", "rejected_scripts"]) {
    const [{ exists }] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${t} AND column_name = 'hide_price'
      ) AS exists`;
    console.log(`${exists ? "✓" : "✗"} ${t}.hide_price ${exists ? "EXISTS" : "MISSING"}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
