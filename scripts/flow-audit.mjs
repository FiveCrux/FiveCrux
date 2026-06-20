// End-to-end FLOW audit — walks each business flow live and reports per-step.
//   node scripts/flow-audit.mjs    (dev server + mock-tebex running; fresh seed best)
import { createHash, createHmac } from "crypto"
const BASE = process.env.BASE || "http://localhost:3000"
const WH_SECRET = process.env.TEBEX_WEBHOOK_SECRET || "local-tebex-webhook-secret"
const TAG = Date.now().toString().slice(-6)

let pass = 0, fail = 0
const step = (ok, label, extra = "") => { console.log(`    ${ok ? "✓" : "✗"} ${label}${extra ? "  ("+extra+")" : ""}`); ok ? pass++ : fail++ }

function makeJar() {
  const m = new Map()
  return {
    h: () => [...m].map(([k, v]) => `${k}=${v}`).join("; "),
    a: (r) => { for (const c of (r.headers.getSetCookie?.() || [])) { const [p] = c.split(";"); const i = p.indexOf("="); const k = p.slice(0, i).trim(); const v = p.slice(i + 1).trim(); if (v && v !== "deleted") m.set(k, v); else m.delete(k) } },
  }
}
async function f(j, p, o = {}) { const r = await fetch(BASE + p, { ...o, redirect: "manual", headers: { ...(o.headers || {}), cookie: j?.h() || "" } }); if (j) j.a(r); return r }
async function login(j, key) { const d = await (await f(j, "/api/auth/csrf")).json(); await f(j, "/api/auth/callback/dev-credentials", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken: d.csrfToken, key, json: "true", callbackUrl: BASE }).toString() }) }
const J = (o) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) })
const PATCH = (o) => ({ method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(o) })
const list = (d) => d?.scripts || d?.props || d?.giveaways || d?.data || d?.items || (Array.isArray(d) ? d : [])

async function main() {
  const admin = makeJar(); await login(admin, "admin")
  const creator = makeJar(); await login(creator, "creator")
  const buyer = makeJar(); await login(buyer, "buyer")

  // ── FLOW 2a: Script submission → approval → live ─────────────────────────
  console.log("\n2a) SELLER — script submit → approve → live")
  const sTitle = `Flow Script ${TAG}`
  const sCreate = await f(creator, "/api/scripts", J({ title: sTitle, description: "flow test", price: 9.99, category: "scripts", framework: ["esx"] }))
  step([200, 201].includes(sCreate.status), "creator submits script", `${sCreate.status}`)
  const pendS = list(await (await f(admin, "/api/admin/scripts?status=pending&limit=80")).json().catch(() => ({})))
  const mineS = pendS.find((x) => x.title === sTitle)
  step(!!mineS, "appears in admin pending queue")
  if (mineS) {
    const ap = await f(admin, "/api/admin/scripts", PATCH({ scriptId: mineS.id, status: "approved" }))
    step(ap.status === 200, "admin approves it", `${ap.status}`)
    const live = list(await (await f(admin, "/api/scripts?limit=80")).json().catch(() => ({})))
    step(live.some((x) => x.title === sTitle), "now live in /api/scripts")
  }

  // ── FLOW 2b: Prop submission → approval → live ───────────────────────────
  console.log("\n2b) SELLER — prop submit → approve → live")
  const pName = `Flow Prop ${TAG}`
  const pCreate = await f(creator, "/api/props", J({ name: pName, description: "flow test", price: "12.99", zipFile: "flow.zip" }))
  const pBody = await pCreate.json().catch(() => ({}))
  const propId = pBody?.prop?.id
  step(pCreate.status === 200 && !!propId, "creator (prop_lister) submits prop", `${pCreate.status}`)
  if (propId) {
    const ap = await f(admin, "/api/admin/props", PATCH({ propId, status: "approved" }))
    step(ap.status === 200, "admin approves prop", `${ap.status}`)
    const liveP = list(await (await f(admin, "/api/props")).json().catch(() => ({})))
    step(liveP.some((x) => x.name === pName || x.id === propId), "now live in /api/props")
  }

  // ── FLOW 3: Buyer purchase (platform fee → webhook → provision) ──────────
  console.log("\n3) BUYER — cart → Tebex checkout → webhook → slot provisioned")
  const slotsBefore = Number((await (await f(buyer, "/api/user/featured-script-slots")).json().catch(() => ({}))).activeSlots || 0)
  const add = await f(buyer, "/api/cart/add", J({ itemType: "subscription", itemId: "featured-scripts:starter:8", title: "Featured Slots - Starter (8w)", price: 100, metadata: { packageType: "featured-scripts", couponScope: "Featured Script Slots", packageId: "starter", durationWeeks: 8 } }))
  step(add.status === 200, "buyer adds featured slot to cart", `${add.status}`)
  const co = await f(buyer, "/api/cart/tebex-checkout", J({}))
  const coB = await co.json().catch(() => ({}))
  step(co.status === 200 && !!coB.basketIdent, "tebex checkout creates order", `${co.status}`)
  if (coB.basketIdent) {
    const payload = JSON.stringify({ type: "payment.completed", subject: { basket_ident: coB.basketIdent, transaction_id: `flow-${TAG}`, price: { amount: 100, currency: "EUR" } } })
    const sig = createHmac("sha256", WH_SECRET).update(createHash("sha256").update(payload).digest("hex")).digest("hex")
    const wh = await f(null, "/api/tebex/webhook", { method: "POST", headers: { "content-type": "application/json", "x-signature": sig }, body: payload })
    step(wh.status === 200, "signed webhook accepted", `${wh.status}`)
    const slotsAfter = Number((await (await f(buyer, "/api/user/featured-script-slots")).json().catch(() => ({}))).activeSlots || 0)
    step(slotsAfter === slotsBefore + 1, "slot provisioned (+1)", `${slotsBefore}→${slotsAfter}`)
    const cart = await (await f(buyer, "/api/cart")).json().catch(() => ({}))
    step((cart.items || []).length === 0, "cart cleared")
  }

  // ── FLOW 4: Giveaway (create → approve → enter) ──────────────────────────
  console.log("\n4) GIVEAWAY — create → approve → enter")
  const gTitle = `Flow Giveaway ${TAG}`
  const gCreate = await f(creator, "/api/giveaways", J({ giveaway: { title: gTitle, description: "flow", total_value: "100", end_date: "2027-12-31T23:59:59.000Z", currency: "EUR", currency_symbol: "€", creator_name: "CruxDev", creator_email: "creator@fivecrux.local" }, requirements: [], prizes: [] }))
  step([200, 201].includes(gCreate.status), "creator creates giveaway", `${gCreate.status}`)
  const pendG = list(await (await f(admin, "/api/admin/giveaways?status=pending&limit=80")).json().catch(() => ({})))
  const mineG = pendG.find((x) => x.title === gTitle)
  step(!!mineG, "appears in admin pending queue")
  if (mineG) {
    const ap = await f(admin, "/api/admin/giveaways", PATCH({ giveawayId: mineG.id, status: "approved" }))
    step(ap.status === 200, "admin approves giveaway", `${ap.status}`)
    const enter = await f(buyer, `/api/giveaways/${mineG.id}/entries`, J({ completedRequirements: [] }))
    step([200, 201].includes(enter.status), "buyer enters giveaway", `${enter.status}`)
  }

  // ── FLOW 5: Ads (create → approve → display) ─────────────────────────────
  console.log("\n5) ADS — create → approve → display")
  const aTitle = `Flow Ad ${TAG}`
  const aCreate = await f(creator, "/api/ads", J({ title: aTitle, description: "flow", category: "scripts", imageUrl: "https://x/y.png", linkUrl: "https://x" }))
  const aBody = await aCreate.json().catch(() => ({}))
  const adId = aBody?.id ?? aBody?.ad?.id ?? aBody?.adId
  step([200, 201].includes(aCreate.status), "creator submits ad (pending)", `${aCreate.status}`)
  if (adId != null) {
    const ap = await f(admin, "/api/admin/ads", PATCH({ action: "approve", adId }))
    step(ap.status === 200, "admin approves ad", `${ap.status}`)
    const adsLive = ((await (await f(admin, "/api/ads/scripts")).json().catch(() => ({}))).ads) || []
    step(adsLive.some((x) => x.title === aTitle), "ad shows on /api/ads/scripts")
  } else {
    step(false, "captured ad id", JSON.stringify(aBody).slice(0, 80))
  }

  // ── FLOW 6: Auth (login roles + logout) ──────────────────────────────────
  console.log("\n6) AUTH — login roles + logout")
  for (const [key, want] of [["admin", "admin"], ["creator", "prop_lister"], ["buyer", "user"]]) {
    const j = makeJar(); await login(j, key)
    const s = await (await f(j, "/api/auth/session")).json().catch(() => ({}))
    step((s?.user?.roles || []).includes(want), `login ${key} → roles has ${want}`, JSON.stringify(s?.user?.roles))
  }
  const g = makeJar(); await login(g, "buyer")
  const csrf = await (await f(g, "/api/auth/csrf")).json()
  await f(g, "/api/auth/signout", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, json: "true" }).toString() })
  const after = await (await f(g, "/api/auth/session")).json().catch(() => ({}))
  step(!after?.user, "logout clears session")

  console.log(`\n──────── FLOWS: ${pass} passed, ${fail} failed ────────\n`)
}
main().catch((e) => { console.error("flow-audit crashed:", e.message); process.exit(2) })
