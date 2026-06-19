// Tebex platform-checkout end-to-end on the MOCK backend (TEBEX_MOCK=true).
// Proves: cart → /api/cart/tebex-checkout → signed payment.completed webhook →
// slots provisioned → cart cleared → idempotent on webhook retry.
//   node scripts/e2e-tebex.mjs   (dev server running with TEBEX_MOCK=true)
import { createHash, createHmac } from "crypto"

const BASE = process.env.BASE || "http://localhost:3000"
const WEBHOOK_SECRET = process.env.TEBEX_WEBHOOK_SECRET || "local-tebex-webhook-secret"

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
  return await (await jf(jar, "/api/auth/session")).json()
}
const J = (o) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) })

// Sign exactly like lib/tebex.verifyTebexWebhook: HMAC-SHA256(secret, SHA256(body)).
function sign(rawBody) {
  const bodyHash = createHash("sha256").update(rawBody).digest("hex")
  return createHmac("sha256", WEBHOOK_SECRET).update(bodyHash).digest("hex")
}
async function fireWebhook(payload) {
  const rawBody = JSON.stringify(payload)
  return fetch(`${BASE}/api/tebex/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-signature": sign(rawBody) }, body: rawBody })
}
async function activeSlots(jar) {
  const d = await (await jf(jar, "/api/user/featured-script-slots")).json().catch(() => ({}))
  return Number(d.activeSlots || 0)
}
async function cartItems(jar) {
  const d = await (await jf(jar, "/api/cart")).json().catch(() => ({}))
  return (d.items || []).length
}

async function main() {
  console.log(`\n▶ Tebex mock e2e @ ${BASE}\n`)
  const buyer = makeJar(); await login(buyer, "buyer")

  const slotsBefore = await activeSlots(buyer)
  console.log(`featured slots before: ${slotsBefore}`)

  // 1. Add a Featured Script Slot package (starter / 8 weeks → €100, 1 slot).
  const add = await jf(buyer, "/api/cart/add", J({
    itemType: "subscription", itemId: "featured-scripts:starter:8",
    title: "Featured Script Slots - Starter (8 weeks)", price: 100,
    metadata: { packageType: "featured-scripts", couponScope: "Featured Script Slots", packageId: "starter", durationWeeks: 8 },
  }))
  ok("added featured-slot package to cart", add.status === 200, `status=${add.status}`)
  ok("cart has 1 item", (await cartItems(buyer)) === 1)

  // 2. Tebex checkout (mock) — creates order + tebex_orders, returns checkoutUrl.
  const co = await jf(buyer, "/api/cart/tebex-checkout", J({}))
  const coBody = await co.json().catch(() => ({}))
  ok("tebex-checkout 200 + mock", co.status === 200 && coBody.mock === true, `status=${co.status} ${JSON.stringify(coBody).slice(0,160)}`)
  ok("returned a basketIdent + checkoutUrl", !!coBody.basketIdent && !!coBody.checkoutUrl)
  const basketIdent = coBody.basketIdent

  // 3. Fire a SIGNED payment.completed webhook (what Tebex would send).
  const wh = await fireWebhook({ type: "payment.completed", subject: { basket_ident: basketIdent, transaction_id: "tbx-txn-test-1", price: { amount: 100, currency: "EUR" } } })
  const whBody = await wh.json().catch(() => ({}))
  ok("webhook accepted (200, valid signature)", wh.status === 200 && whBody.ok === true, `status=${wh.status} ${JSON.stringify(whBody)}`)

  // 4. Entitlement provisioned + cart cleared.
  const slotsAfter = await activeSlots(buyer)
  ok("featured slot provisioned (+1)", slotsAfter === slotsBefore + 1, `before=${slotsBefore} after=${slotsAfter}`)
  ok("cart cleared after payment", (await cartItems(buyer)) === 0)

  // 5. Reject a FORGED webhook (bad signature) — payment integrity.
  const forged = await fetch(`${BASE}/api/tebex/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-signature": "deadbeef" }, body: JSON.stringify({ type: "payment.completed", subject: { basket_ident: basketIdent } }) })
  ok("forged webhook rejected (403)", forged.status === 403, `status=${forged.status}`)

  // 6. Idempotency — replay the same valid webhook; must NOT double-provision.
  await fireWebhook({ type: "payment.completed", subject: { basket_ident: basketIdent, transaction_id: "tbx-txn-test-1", price: { amount: 100, currency: "EUR" } } })
  const slotsReplay = await activeSlots(buyer)
  ok("replay does not double-provision", slotsReplay === slotsAfter, `after=${slotsAfter} replay=${slotsReplay}`)

  console.log(`\n──────── TEBEX e2e: ${pass} passed, ${fail} failed ────────\n`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch((e) => { console.error("tebex e2e crashed:", e); process.exit(2) })
