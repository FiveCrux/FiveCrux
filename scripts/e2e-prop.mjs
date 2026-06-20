// Prop purchase e2e on the MOCK Tebex backend. Proves the NEW prop model:
// add prop to cart → /api/cart/tebex-checkout (FiveCrux store basket) → signed
// payment.completed webhook → purchase recorded (hasPurchased) → cart cleared.
// Delivery itself is Tebex's auto-email (not asserted here).
//   node scripts/e2e-prop.mjs   (dev server running with TEBEX_MOCK env, prop-1001 seeded)
import { createHash, createHmac } from "crypto"

const BASE = process.env.BASE || "http://localhost:3000"
const WEBHOOK_SECRET = process.env.TEBEX_WEBHOOK_SECRET || "local-tebex-webhook-secret"
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
function sign(rawBody) {
  const bodyHash = createHash("sha256").update(rawBody).digest("hex")
  return createHmac("sha256", WEBHOOK_SECRET).update(bodyHash).digest("hex")
}
async function fireWebhook(payload) {
  const rawBody = JSON.stringify(payload)
  return fetch(`${BASE}/api/tebex/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-signature": sign(rawBody) }, body: rawBody })
}
async function cartItems(jar) {
  const d = await (await jf(jar, "/api/cart")).json().catch(() => ({}))
  return (d.items || []).length
}
async function hasPurchased(jar) {
  const d = await (await jf(jar, `/api/props/${PROP_ID}`)).json().catch(() => ({}))
  return Boolean(d?.hasPurchased ?? d?.prop?.hasPurchased)
}

async function main() {
  console.log(`\n▶ Prop purchase e2e @ ${BASE} (prop ${PROP_ID})\n`)
  const buyer = makeJar(); await login(buyer, "buyer")

  ok("not purchased before", (await hasPurchased(buyer)) === false)

  // 1. Add the prop to cart (price resolves live from the prop's Tebex package).
  const add = await jf(buyer, "/api/cart/add", J({ itemType: "prop", itemId: PROP_ID, title: "Prop", price: 1 }))
  ok("added prop to cart", add.status === 200, `status=${add.status} ${JSON.stringify(await add.clone().json().catch(()=>({}))).slice(0,160)}`)
  ok("cart has 1 item", (await cartItems(buyer)) === 1)

  // 2. Checkout through FiveCrux's Tebex store.
  const co = await jf(buyer, "/api/cart/tebex-checkout", J({}))
  const coBody = await co.json().catch(() => ({}))
  ok("tebex-checkout 200", co.status === 200, `status=${co.status} ${JSON.stringify(coBody).slice(0,180)}`)
  ok("returned basketIdent + checkoutUrl", !!coBody.basketIdent && !!coBody.checkoutUrl)

  // 3. Signed payment.completed webhook.
  const wh = await fireWebhook({ type: "payment.completed", subject: { basket_ident: coBody.basketIdent, transaction_id: "tbx-prop-txn-1", price: { amount: 34.99, currency: "EUR" } } })
  const whBody = await wh.json().catch(() => ({}))
  ok("webhook accepted (200)", wh.status === 200 && whBody.ok === true, `status=${wh.status} ${JSON.stringify(whBody)}`)

  // 4. Purchase recorded + cart cleared.
  ok("prop marked purchased (recorded)", (await hasPurchased(buyer)) === true)
  ok("cart cleared after payment", (await cartItems(buyer)) === 0)

  console.log(`\n──────── PROP e2e: ${pass} passed, ${fail} failed ────────\n`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch((e) => { console.error("prop e2e crashed:", e); process.exit(2) })
