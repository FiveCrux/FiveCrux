// Coupon e2e — verifies I3: a "percentage" coupon is applied as a PERCENT, not a
// flat amount. Uses seeded coupon CRUX10 (10% off, scope 'all') on a prop priced
// live from Tebex (mock package 654321 = 34.99). 10% → ~3.50 (a flat bug → 10).
//   node scripts/e2e-coupon.mjs   (dev server + mock running, seeded)
const BASE = process.env.BASE || "http://localhost:3000"
const PROP_ID = process.env.PROP_ID || "prop-1001"

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
  console.log(`\n▶ Coupon e2e @ ${BASE}\n`)
  const buyer = makeJar(); await login(buyer, "buyer")

  const add = await jf(buyer, "/api/cart/add", J({ itemType: "prop", itemId: PROP_ID, title: "Prop", price: 1 }))
  ok("prop added to cart", add.status === 200, `status=${add.status}`)

  const res = await jf(buyer, "/api/cart/coupon", J({ couponCode: "CRUX10" }))
  const body = await res.json().catch(() => ({}))
  ok("CRUX10 applied (200)", res.status === 200, `status=${res.status} ${JSON.stringify(body).slice(0,160)}`)

  const total = Number(body.totalAmount)
  const discount = Number(body?.coupon?.discountAmount)
  const expected = +(total * 0.10).toFixed(2)
  // I3: percentage → ~10% of total. A flat-amount bug would give 10 (the value).
  ok(`I3: 10% applied (discount≈${expected}, not flat 10)`, Math.abs(discount - expected) < 0.05 && discount < total * 0.5,
     `total=${total} discount=${discount}`)

  console.log(`\n──────── COUPON e2e: ${pass} passed, ${fail} failed ────────\n`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch((e) => { console.error("coupon e2e crashed:", e); process.exit(2) })
