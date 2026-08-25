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

const isLive = (v) => v === "live"
check("PAYPAL_ENV=live is live", isLive("live"))
for (const v of [undefined, "", "sandbox", "Live", "LIVE", "production", "true"])
  check(`${JSON.stringify(v)} is NOT live`, !isLive(v))

console.log(`\n──────── RESULT: ${pass} passed, ${fail} failed ────────\n`)
process.exit(fail ? 1 : 0)
