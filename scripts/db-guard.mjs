// SAFETY GUARD — blocks DB schema/write commands (drizzle-kit migrate/push/studio)
// from ever hitting a REMOTE/PROD database by accident. Wired in front of the
// db:* npm scripts. A real, intentional run requires the explicit override:
//   ALLOW_PROD_DB_WRITE=1 npm run db:migrate
//
// "Safe" targets that pass without override: a localhost Postgres, or PGlite
// (USE_PGLITE=true). Anything else (Neon/Supabase/RDS/etc.) is BLOCKED.
import { readFileSync } from "fs"

function envFromLocal(key) {
  if (process.env[key] != null) return process.env[key]
  try {
    const txt = readFileSync(".env.local", "utf8")
    const m = txt.match(new RegExp("^\\s*" + key + "\\s*=\\s*(.+)\\s*$", "m"))
    return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : undefined
  } catch {
    return undefined
  }
}

const url = envFromLocal("DATABASE_URL") || ""
const usePglite = envFromLocal("USE_PGLITE") === "true"
const override = process.env.ALLOW_PROD_DB_WRITE === "1"

const host = (url.match(/@([^/?]+)/) || [])[1] || ""
const isLocal = usePglite || /(^|@)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(url) || host.startsWith("localhost") || host.startsWith("127.0.0.1")

if (isLocal || override) {
  if (override && !isLocal) {
    console.log(`⚠️  db-guard: OVERRIDE set — allowing a write to REMOTE db (${host || "?"}). Hope you meant it.`)
  }
  process.exit(0)
}

console.error("\n🛑 db-guard: BLOCKED — refusing to run a DB write/migrate against a non-local database.")
console.error(`   Target host: ${host || "(unknown)"}`)
console.error("   This protects the production DB + its data from accidental migrate/push/drop.")
console.error("   Nothing was sent to the database.")
console.error("\n   If you REALLY intend this (and have a backup), run it yourself with the explicit override:")
console.error("   ALLOW_PROD_DB_WRITE=1 <your command>\n")
process.exit(1)
