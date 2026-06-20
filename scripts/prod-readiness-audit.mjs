// READ-ONLY production-readiness audit against the real DATABASE_URL.
// ONLY runs SELECT / information_schema queries — never writes/alters anything.
// Reports: code↔prod schema gap (deploy blockers) + real-data summary.
import postgres from "postgres"
import { readFileSync } from "fs"

function getDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const m = readFileSync(".env.local", "utf8").match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m)
  return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : null
}

// What THIS branch's code expects (from lib/db/schema.ts) — key deltas only.
const CODE_TABLES = ["users","coupons","carts","cart_items","orders","order_items","coupon_redemptions","subscriptions","pending_scripts","approved_scripts","rejected_scripts","pending_props","approved_props","rejected_props","pending_giveaways","approved_giveaways","rejected_giveaways","giveaway_requirements","giveaway_prizes","giveaway_prize_winners","giveaway_entries","pending_ads","approved_ads","rejected_ads","user_ad_slots","featured_scripts","user_featured_script_slots","tebex_orders"]
// columns the new code REQUIRES that the old prod schema may lack:
const REQUIRED_COLS = [
  ["approved_scripts","tebex_store_token"], ["approved_scripts","tebex_package_id"],
  ["pending_scripts","tebex_store_token"], ["pending_scripts","tebex_package_id"],
  ["approved_props","tebex_store_token"], ["approved_props","tebex_package_id"],
  ["user_ad_slots","order_reference"], ["user_featured_script_slots","featured_order_reference"],
]
const IDENTITY_TABLES = ["approved_scripts","pending_scripts","approved_giveaways","carts","orders","approved_ads"]

async function main() {
  const url = getDbUrl(); if (!url) throw new Error("no DATABASE_URL")
  const host = (url.match(/@([^/?]+)/) || [])[1] || "?"
  console.log(`\n▶ PROD READINESS AUDIT (read-only) @ ${host}\n`)
  const sql = postgres(url, { max: 1, idle_timeout: 5 })
  try {
    const rows = await sql`select table_name from information_schema.tables where table_schema='public'`
    const prod = new Set(rows.map((r) => r.table_name))

    console.log("── SCHEMA GAP (code vs prod) ──")
    const missingTables = CODE_TABLES.filter((t) => !prod.has(t))
    const extraTables = [...prod].filter((t) => !CODE_TABLES.includes(t) && t !== "__drizzle_migrations")
    console.log(`  Tables the code needs but PROD is MISSING:  ${missingTables.join(", ") || "(none)"}`)
    console.log(`  Tables in PROD not used by the new code:     ${extraTables.join(", ") || "(none)"}`)

    console.log("\n  Required columns missing in prod (deploy blockers):")
    let missCols = 0
    for (const [t, c] of REQUIRED_COLS) {
      if (!prod.has(t)) { console.log(`    · ${t}.${c}  — table absent`); missCols++; continue }
      const r = await sql`select 1 from information_schema.columns where table_name=${t} and column_name=${c}`
      if (r.length === 0) { console.log(`    ✗ ${t}.${c}  MISSING`); missCols++ }
    }
    if (missCols === 0) console.log("    ✓ all present")

    console.log("\n  Primary-key style (code expects identity):")
    for (const t of IDENTITY_TABLES) {
      if (!prod.has(t)) continue
      const r = await sql`select is_identity from information_schema.columns where table_name=${t} and column_name='id'`
      console.log(`    ${t}.id is_identity = ${r[0]?.is_identity ?? "?"}${r[0]?.is_identity === "NO" ? "   ← old (manual ids)" : ""}`)
    }

    console.log("\n── REAL DATA SUMMARY ──")
    for (const t of ["users","approved_scripts","pending_scripts","approved_props","approved_giveaways","approved_ads","orders","carts","coupons"]) {
      if (prod.has(t)) { const [{ c }] = await sql`select count(*)::int c from ${sql(t)}`; console.log(`  ${t.padEnd(22)} ${c}`) }
    }

    console.log("\n  User role distribution:")
    const roleRows = await sql`select unnest(roles) as role, count(*)::int c from users group by role order by c desc`
    for (const r of roleRows) console.log(`    ${String(r.role).padEnd(18)} ${r.c}`)
    const noRole = await sql`select count(*)::int c from users where roles is null or array_length(roles,1) is null`
    console.log(`    (users with no roles: ${noRole[0].c})`)

    console.log("\n  Data sanity:")
    const sNullCover = await sql`select count(*)::int c from approved_scripts where cover_image is null`
    console.log(`    approved_scripts with NULL cover_image: ${sNullCover[0].c}`)
    const sTebex = await sql`select 1 from information_schema.columns where table_name='approved_scripts' and column_name='tebex_package_id'`
    console.log(`    approved_scripts.tebex_package_id column: ${sTebex.length ? "exists" : "ABSENT (no script can sell via Tebex on prod)"}`)
  } finally {
    await sql.end({ timeout: 5 })
  }
  console.log("")
}
main().catch((e) => { console.error("audit failed:", e.message); process.exit(1) })
