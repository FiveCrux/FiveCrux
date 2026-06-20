// Read-only: inspect the real DATABASE_URL's current state (tables + key counts)
// so we know whether to migrate fresh or reconcile. Prints NO secrets.
import postgres from "postgres"
import { readFileSync } from "fs"

// Parse DATABASE_URL out of .env.local without loading other vars.
function getDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const txt = readFileSync(".env.local", "utf8")
  const m = txt.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m)
  if (!m) throw new Error("DATABASE_URL not found in .env.local")
  return m[1].trim().replace(/^['"]|['"]$/g, "")
}

async function main() {
  const url = getDbUrl()
  const host = (url.match(/@([^/]+)\//) || [])[1] || "?"
  console.log(`\n▶ Connecting to: ${host}\n`)
  const sql = postgres(url, { max: 1, idle_timeout: 5 })
  try {
    const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`
    console.log(`Tables in public (${tables.length}):`)
    console.log("  " + (tables.map((t) => t.table_name).join(", ") || "(none)"))
    // Counts for a few key tables if they exist.
    const names = new Set(tables.map((t) => t.table_name))
    for (const t of ["users", "approved_scripts", "approved_props", "approved_giveaways", "__drizzle_migrations"]) {
      if (names.has(t)) {
        const [{ count }] = await sql`select count(*)::int as count from ${sql(t)}`
        console.log(`  • ${t}: ${count} rows`)
      }
    }
    // Detect schema generation: identity vs plain integer on a known table.
    if (names.has("approved_scripts")) {
      const col = await sql`select is_identity from information_schema.columns where table_name='approved_scripts' and column_name='id'`
      console.log(`  approved_scripts.id is_identity: ${col[0]?.is_identity ?? "?"}`)
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}
main().catch((e) => { console.error("db-check failed:", e.message); process.exit(1) })
