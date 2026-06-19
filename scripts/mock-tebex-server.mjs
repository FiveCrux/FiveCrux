// TEST-ONLY mock of the Tebex Headless API. Lets us exercise the REAL app code
// (lib/tebex.ts + /api/cart/tebex-checkout) locally with no real Tebex store —
// the app stays 100% production code; only TEBEX_HEADLESS_BASE_URL points here.
//
// Implements just the endpoints the checkout route uses:
//   POST /api/accounts/:token/baskets
//   POST /api/baskets/:ident/packages
//   GET  /api/accounts/:token/baskets/:ident
//   POST /api/accounts/:token/baskets/:ident/coupons
// Plus a fake hosted-checkout page GET /checkout/:ident that simulates the buyer
// paying: it fires a correctly-signed payment.completed webhook at the app and
// redirects to the basket's complete_url. (That simulation lives HERE, not in
// the app.)
//
//   node scripts/mock-tebex-server.mjs
import { createServer } from "http"
import { createHash, createHmac, randomUUID } from "crypto"

const PORT = Number(process.env.MOCK_TEBEX_PORT || 8787)
const APP_URL = process.env.FIVECRUX_URL || "http://localhost:3000"
const WEBHOOK_SECRET = process.env.TEBEX_WEBHOOK_SECRET || "local-tebex-webhook-secret"

const baskets = new Map() // ident -> { custom, packages, complete_url, total_price }

function send(res, code, json) {
  const body = JSON.stringify(json)
  res.writeHead(code, { "content-type": "application/json" })
  res.end(body)
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = ""
    req.on("data", (c) => (d += c))
    req.on("end", () => { try { resolve(d ? JSON.parse(d) : {}) } catch { resolve({}) } })
  })
}
function basketView(ident) {
  const b = baskets.get(ident)
  return {
    ident,
    complete: false,
    id: 1,
    total_price: b?.total_price ?? 0,
    currency: "EUR",
    custom: b?.custom ?? null,
    complete_url: b?.complete_url ?? null,
    packages: b?.packages ?? [],
    coupons: [],
    links: { checkout: `http://localhost:${PORT}/checkout/${ident}` },
  }
}
function sign(rawBody) {
  const hash = createHash("sha256").update(rawBody).digest("hex")
  return createHmac("sha256", WEBHOOK_SECRET).update(hash).digest("hex")
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const parts = url.pathname.split("/").filter(Boolean)

  // POST /api/accounts/:token/baskets
  if (req.method === "POST" && parts[0] === "api" && parts[1] === "accounts" && parts[3] === "baskets" && parts.length === 4) {
    const body = await readBody(req)
    const ident = randomUUID()
    baskets.set(ident, { custom: body.custom ?? null, packages: [], complete_url: body.complete_url ?? null, total_price: 0 })
    return send(res, 200, { data: basketView(ident) })
  }
  // POST /api/baskets/:ident/packages
  if (req.method === "POST" && parts[0] === "api" && parts[1] === "baskets" && parts[3] === "packages" && parts.length === 4) {
    const ident = parts[2]
    const body = await readBody(req)
    const b = baskets.get(ident)
    if (!b) return send(res, 404, { error: "basket not found" })
    b.packages.push({ id: Number(body.package_id), name: `Mock Package ${body.package_id}`, in_basket: { quantity: body.quantity ?? 1, price: 0 } })
    return send(res, 200, { data: basketView(ident) })
  }
  // POST /api/accounts/:token/baskets/:ident/coupons
  if (req.method === "POST" && parts[1] === "accounts" && parts[3] === "baskets" && parts[5] === "coupons") {
    return send(res, 200, { data: basketView(parts[4]) })
  }
  // GET /api/accounts/:token/baskets/:ident
  if (req.method === "GET" && parts[1] === "accounts" && parts[3] === "baskets" && parts.length === 5) {
    const ident = parts[4]
    if (!baskets.get(ident)) return send(res, 404, { error: "basket not found" })
    return send(res, 200, { data: basketView(ident) })
  }
  // GET /checkout/:ident  → simulate payment: fire signed webhook + redirect.
  if (req.method === "GET" && parts[0] === "checkout" && parts[1]) {
    const ident = parts[1]
    const b = baskets.get(ident)
    const payload = JSON.stringify({
      type: "payment.completed",
      subject: { basket_ident: ident, transaction_id: `mock-${ident.slice(0, 8)}`, price: { amount: b?.total_price ?? 0, currency: "EUR" } },
    })
    try {
      await fetch(`${APP_URL}/api/tebex/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-signature": sign(payload) }, body: payload })
    } catch (e) {
      console.error("[mock-tebex] webhook post failed:", e.message)
    }
    const dest = b?.complete_url || `${APP_URL}/cart?payment=success&provider=tebex`
    res.writeHead(302, { Location: dest })
    return res.end()
  }

  send(res, 404, { error: "mock-tebex: unhandled", path: url.pathname })
})

server.listen(PORT, () => {
  console.log(`▶ mock Tebex server on http://localhost:${PORT}  (app → ${APP_URL})`)
  console.log(`  point the app at it:  TEBEX_HEADLESS_BASE_URL=http://localhost:${PORT}/api`)
})
