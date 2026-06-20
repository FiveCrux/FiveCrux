// Giveaway e2e — covers C6 (entrant PII staff-gate), C5 (required-task enforce +
// honor fallback when Discord verify isn't configured), I10 (admin draw-winners
// writes giveaway_prize_winners → winners display). Uses seeded giveaway 3001
// (req 4001 discord/required, 4002 youtube/optional).
//   node scripts/e2e-giveaway.mjs   (dev server running, seeded)
const BASE = process.env.BASE || "http://localhost:3000"
const GID = Number(process.env.GID || 3001)

let pass = 0, fail = 0
const ok = (n, c, x = "") => { if (c) { console.log(`  ✓ ${n}`); pass++ } else { console.log(`  ✗ ${n} ${x}`); fail++ } }

function makeJar() {
  const jar = new Map()
  return {
    header: () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    absorb: (res) => { for (const c of (res.headers.getSetCookie?.() || [])) { const [p] = c.split(";"); const i = p.indexOf("="); const k = p.slice(0, i).trim(), v = p.slice(i + 1).trim(); if (!v || v === "deleted") jar.delete(k); else jar.set(k, v) } },
  }
}
async function jf(jar, path, opts = {}) {
  const res = await fetch(BASE + path, { ...opts, redirect: "manual", headers: { ...(opts.headers || {}), cookie: jar?.header() || "" } })
  if (jar) jar.absorb(res); return res
}
async function login(jar, key) {
  const { csrfToken } = await (await jf(jar, "/api/auth/csrf")).json()
  await jf(jar, "/api/auth/callback/dev-credentials", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken, key, json: "true", callbackUrl: BASE }).toString() })
}
const J = (o) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) })

async function main() {
  console.log(`\n▶ Giveaway e2e @ ${BASE} (giveaway ${GID})\n`)
  const buyer = makeJar(); await login(buyer, "buyer")

  // C6 — a non-staff user must NOT read all entrants (PII).
  const pii = await jf(buyer, `/api/giveaways/${GID}/entries`)
  ok("C6: non-staff blocked from all-entries (403)", pii.status === 403, `status=${pii.status}`)

  // C5 — entering WITHOUT the required task (4001) must be rejected.
  const bad = await jf(buyer, `/api/giveaways/${GID}/entries`, J({ completedRequirements: [4002] }))
  ok("C5: entry missing required task rejected (400)", bad.status === 400, `status=${bad.status}`)

  // Entry WITH required + optional → succeeds; Discord req honor-falls-back (no bot token).
  const good = await jf(buyer, `/api/giveaways/${GID}/entries`, J({ completedRequirements: [4001, 4002] }))
  ok("valid entry accepted (201)", good.status === 201, `status=${good.status} ${JSON.stringify(await good.clone().json().catch(()=>({}))).slice(0,140)}`)

  // Points computed server-side (4001=10 + 4002=5 = 15).
  const mine = await (await jf(buyer, `/api/giveaways/${GID}/entries?userOnly=true`)).json().catch(() => ({}))
  ok("entry recorded with server points = 15", Number(mine?.entry?.pointsEarned) === 15, `entry=${JSON.stringify(mine?.entry)}`)

  // Staff CAN read all entries.
  const admin = makeJar(); await login(admin, "admin")
  const all = await jf(admin, `/api/giveaways/${GID}/entries`)
  const allBody = await all.json().catch(() => ({}))
  ok("staff can read all entries", all.status === 200 && Array.isArray(allBody.entries) && allBody.entries.length >= 1, `status=${all.status} n=${allBody?.entries?.length}`)

  // I10 — admin draws winners; they must then appear on the giveaway.
  const draw = await jf(admin, `/api/admin/giveaways/${GID}/draw-winners`, J({ announce: false, overwriteExisting: true }))
  ok("draw-winners 200", draw.status === 200, `status=${draw.status} ${JSON.stringify(await draw.clone().json().catch(()=>({}))).slice(0,160)}`)

  const gv = await (await jf(admin, `/api/giveaways/${GID}`)).json().catch(() => ({}))
  const blob = JSON.stringify(gv)
  const hasWinner = /"winners":\s*\[\s*\{/.test(blob) || /"winnerName":"(?!Unknown")/.test(blob) || blob.includes("winnerName")
  ok("I10: winner shows on giveaway after draw", hasWinner, blob.slice(0, 200))

  console.log(`\n──────── GIVEAWAY e2e: ${pass} passed, ${fail} failed ────────\n`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch((e) => { console.error("giveaway e2e crashed:", e); process.exit(2) })
