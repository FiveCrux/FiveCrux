// Guard for the PayPal integration (.hudson/specs/paypal-migration.md).
//
// Runs WITHOUT a server or PayPal credentials — it exercises the pure logic
// that is easy to break and expensive to get wrong. Endpoint-level checks
// (order creation, capture, provisioning) are added as those phases land.
//
//   node scripts/check-paypal.mjs

let pass = 0, fail = 0
const check = (name, cond, extra = "") => {
  if (cond) { console.log(`  ✓ ${name}`); pass++ }
  else { console.log(`  ✗ ${name} ${extra}`); fail++ }
}

console.log("\n▶ PayPal guards\n")

// ---------------------------------------------------------------------------
// The cert-url host check inside verifyPayPalWebhook.
//
// PayPal tells us where to fetch the signing certificate via a request header.
// A forged webhook can put ANY url there, so the host is pinned to paypal.com.
// If this regex ever loosens, an attacker can point verification at their own
// certificate and mint "valid" payment events — free ad slots, free props.
// ---------------------------------------------------------------------------
console.log("cert_url host pinning")

const isPayPalCertHost = (url) => {
  let host
  try { host = new URL(url).hostname } catch { return false }
  return /(^|\.)paypal\.com$/.test(host)
}

for (const url of [
  "https://api.paypal.com/v1/notifications/certs/CERT-abc",
  "https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-abc",
  "https://paypal.com/certs/x",
]) check(`accepts ${new URL(url).hostname}`, isPayPalCertHost(url))

for (const [label, url] of [
  ["a lookalike domain", "https://paypal.com.evil.test/cert"],
  ["a suffix trick", "https://notpaypal.com/cert"],
  ["an attacker host", "https://evil.example.com/cert"],
  ["an embedded-credential trick", "https://paypal.com@evil.test/cert"],
  ["a non-url", "not-a-url"],
]) check(`rejects ${label}`, !isPayPalCertHost(url), `-> ${url}`)

// ---------------------------------------------------------------------------
// Amount formatting. PayPal rejects amounts that are not fixed-2dp strings,
// and a float here is how you ship 19.989999999 to a payment API.
// ---------------------------------------------------------------------------
console.log("\namount formatting")

const toPayPalAmount = (v) => Number(v).toFixed(2)

for (const [input, want] of [
  [19.99, "19.99"],
  ["19.99", "19.99"],
  [20, "20.00"],
  [0, "0.00"],
  [19.999, "20.00"],
  [0.1 + 0.2, "0.30"],
]) check(`${JSON.stringify(input)} -> ${want}`, toPayPalAmount(input) === want, `got ${toPayPalAmount(input)}`)

// ---------------------------------------------------------------------------
// Environment defaulting. "live" must be opt-in: anything else has to mean
// sandbox, so a typo bills test money rather than real money.
// ---------------------------------------------------------------------------
console.log("\nenvironment defaulting")

// Both env names are honoured because PAYPAL_ENVIRONMENT already existed in
// this project. Case is normalised so "Live" is not silently treated as test.
const isLive = (v) => {
  const raw = (v || "").trim().toLowerCase()
  return raw === "live" || raw === "production"
}
for (const v of ["live", "Live", "LIVE", " live ", "production"])
  check(`${JSON.stringify(v)} IS live`, isLive(v))
for (const v of [undefined, "", "sandbox", "Sandbox", "test", "true"])
  check(`${JSON.stringify(v)} is NOT live`, !isLive(v))


// ---------------------------------------------------------------------------
// Coupon rules. The Tebex path delegates these to Tebex; PayPal has no such
// authority, so FiveCrux enforces them again. A hole here is not a bug report,
// it is money walking out the door - a maxUses=1 coupon used a thousand times.
// Mirrors validateCouponRules / calculateCouponDiscount in lib/coupon-utils.ts.
// ---------------------------------------------------------------------------
console.log("\ncoupon rules")

const day = 86400000
const now = new Date("2026-08-17T12:00:00Z")
const base = {
  isActive: true, startDate: null, expiryDate: null, minCartValue: 0,
  maxUses: null, usedCount: 0, perUserLimit: 0,
  discountType: "percentage", discountValue: 10,
}
const rules = (c, ctx) => {
  const k = { ...base, ...c }
  if (k.isActive === false) return { error: "inactive" }
  if (k.startDate && k.startDate > (ctx.now ?? now)) return { error: "not started" }
  if (k.expiryDate && k.expiryDate < (ctx.now ?? now)) return { error: "expired" }
  const min = Number(k.minCartValue ?? 0)
  if (min > 0 && ctx.cartTotal < min) return { error: "min cart" }
  const mx = Number(k.maxUses ?? 0)
  if (mx > 0 && Number(k.usedCount ?? 0) >= mx) return { error: "max uses" }
  const pu = Number(k.perUserLimit ?? 0)
  if (pu > 0 && ctx.userRedemptions >= pu) return { error: "per user" }
  return null
}
const C = { cartTotal: 100, userRedemptions: 0, now }

check("a clean coupon passes", rules({}, C) === null)
check("inactive is refused", !!rules({ isActive: false }, C))
check("expired is refused", !!rules({ expiryDate: new Date(+now - day) }, C))
check("not-yet-started is refused", !!rules({ startDate: new Date(+now + day) }, C))
check("below minCartValue is refused", !!rules({ minCartValue: 200 }, C))
check("at minCartValue passes", rules({ minCartValue: 100 }, C) === null)
check("maxUses exhausted is refused", !!rules({ maxUses: 1, usedCount: 1 }, C))
check("maxUses not yet reached passes", rules({ maxUses: 2, usedCount: 1 }, C) === null)
check("maxUses null means unlimited", rules({ maxUses: null, usedCount: 9999 }, C) === null)
check("perUserLimit reached is refused", !!rules({ perUserLimit: 1 }, { ...C, userRedemptions: 1 }))
check("perUserLimit 0 means unlimited", rules({ perUserLimit: 0 }, { ...C, userRedemptions: 50 }) === null)

console.log("\ndiscount maths")
const discount = (c, total) => {
  const v = Number(c.discountValue ?? 0)
  if (!Number.isFinite(v) || v <= 0) return 0
  const raw = String(c.discountType || "").toLowerCase() === "percentage" ? (total * v) / 100 : v
  return Math.min(Math.max(raw, 0), total)
}
check("10% of 100 is 10", discount({ discountType: "percentage", discountValue: 10 }, 100) === 10)
check("legacy 'Percentage' casing still works",
  discount({ discountType: "Percentage", discountValue: 10 }, 100) === 10)
check("flat 15 off 100 is 15", discount({ discountType: "flat", discountValue: 15 }, 100) === 15)
check("a flat coupon never exceeds the cart",
  discount({ discountType: "flat", discountValue: 500 }, 100) === 100)
check("a negative value discounts nothing",
  discount({ discountType: "flat", discountValue: -50 }, 100) === 0)
check("100% off leaves zero payable",
  100 - discount({ discountType: "percentage", discountValue: 100 }, 100) === 0)

console.log(`\n──────── RESULT: ${pass} passed, ${fail} failed ────────\n`)
process.exit(fail ? 1 : 0)
