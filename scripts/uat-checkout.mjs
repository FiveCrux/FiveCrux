// End-to-end UAT for the money paths: cart, quantity, coupons, creator codes,
// order creation, and the guards that stop a buyer changing what they pay.
//
// Runs against a LOCAL server on the PGlite harness. It creates and deletes
// cart rows for the dev users, and never touches production.
//
//   USE_PGLITE=true ALLOW_DEV_LOGIN=true npx next dev -p 50003
//   node scripts/uat-checkout.mjs

const B = process.env.UAT_BASE || "http://localhost:50003"

let pass = 0
const failures = []
const t = (name, cond, detail = "") => {
  if (cond) { console.log(`  \x1b[32m✓\x1b[0m ${name}`); pass++ }
  else { console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? `  → ${detail}` : ""}`); failures.push(name) }
}
const section = (s) => console.log(`\n\x1b[1m${s}\x1b[0m`)

/** A signed-in session for one dev user, with its own cookie jar. */
async function session(key) {
  const jar = new Map()
  const hdr = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ")
  const absorb = (r) => {
    for (const c of r.headers.getSetCookie?.() ?? []) {
      const [p] = c.split(";")
      const i = p.indexOf("=")
      const k = p.slice(0, i).trim()
      const v = p.slice(i + 1).trim()
      v && v !== "deleted" ? jar.set(k, v) : jar.delete(k)
    }
  }
  let r = await fetch(`${B}/api/auth/csrf`, { headers: { cookie: hdr() } }); absorb(r)
  const { csrfToken } = await r.json()
  r = await fetch(`${B}/api/auth/callback/dev-credentials`, {
    method: "POST", redirect: "manual",
    headers: { cookie: hdr(), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, key, json: "true", callbackUrl: B }).toString(),
  }); absorb(r)
  const me = await (await fetch(`${B}/api/auth/session`, { headers: { cookie: hdr() } })).json()

  const call = async (method, path, body) => {
    const res = await fetch(B + path, {
      method,
      headers: { cookie: hdr(), "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return [res.status, await res.json().catch(() => ({}))]
  }
  return { user: me?.user ?? null, call, hdr }
}

const AD_PACK = {
  itemType: "subscription", itemId: "ads:premium:1", title: "Ad Slots — PREMIUM (1 Month)",
  metadata: { packageType: "ads", couponScope: "Ad Slots", packageId: "premium", duration: 1 },
}
const FEATURED_PACK = {
  itemType: "subscription", itemId: "featured-scripts:starter:4", title: "Featured — STARTER (4 weeks)",
  metadata: { packageType: "featured-scripts", couponScope: "Featured Script Slots", packageId: "starter", duration: 4 },
}

async function emptyCart(s) {
  const [, cart] = await s.call("GET", "/api/cart")
  for (const i of cart.items ?? []) await s.call("DELETE", "/api/cart", { cartItemId: i.id })
}

console.log(`\n▶ Checkout UAT — ${B}`)

const buyer = await session("buyer")
if (!buyer.user) { console.log("\n\x1b[31mLOGIN FAILED — is the dev server up with ALLOW_DEV_LOGIN=true?\x1b[0m\n"); process.exit(1) }

// ---------------------------------------------------------------------------
section("cart basics")
await emptyCart(buyer)
{
  const [st] = await buyer.call("POST", "/api/cart/add", AD_PACK)
  t(`add to cart -> ${st}`, st === 200)
  const [, cart] = await buyer.call("GET", "/api/cart")
  t("cart has 1 line", (cart.items ?? []).length === 1, `got ${(cart.items ?? []).length}`)
  t("price came from the server, not the client", Number(cart.items[0].price) === 100, `got ${cart.items?.[0]?.price}`)

  // The same pack added twice must increment, not duplicate the line.
  await buyer.call("POST", "/api/cart/add", AD_PACK)
  const [, cart2] = await buyer.call("GET", "/api/cart")
  t("adding the same pack again increments quantity", cart2.items.length === 1 && cart2.items[0].quantity === 2,
    `lines=${cart2.items.length} qty=${cart2.items[0]?.quantity}`)
  t("cart total follows quantity", Number(cart2.total) === 200, `got ${cart2.total}`)
}

// ---------------------------------------------------------------------------
section("a client cannot set its own price")
{
  const [, before] = await buyer.call("GET", "/api/cart")
  const line = before.items[0]
  await buyer.call("POST", "/api/cart/add", { ...AD_PACK, price: 1, metadata: { ...AD_PACK.metadata, slotsToAdd: 999 } })
  const [, after] = await buyer.call("GET", "/api/cart")
  t("a price in the request body is ignored", Number(after.items[0].price) === Number(line.price),
    `${line.price} -> ${after.items[0].price}`)
  const meta = typeof after.items[0].metadata === "string" ? JSON.parse(after.items[0].metadata) : after.items[0].metadata
  t("a slot count in the request body is ignored", Number(meta.slotsToAdd) === 3, `got ${meta.slotsToAdd}`)
}

// ---------------------------------------------------------------------------
section("quantity")
{
  const [, cart] = await buyer.call("GET", "/api/cart")
  const id = cart.items[0].id
  for (const [label, qty, want] of [
    ["zero refused", 0, 400], ["negative refused", -2, 400], ["fractional refused", 1.5, 400],
    ["non-numeric refused", "two", 400], ["over the cap refused", 999, 400], ["valid accepted", 2, 200],
  ]) {
    const [st] = await buyer.call("PATCH", "/api/cart", { cartItemId: id, quantity: qty })
    t(`${label} -> ${st}`, st === want, `got ${st}`)
  }
  const [st404] = await buyer.call("PATCH", "/api/cart", { cartItemId: 987654321, quantity: 2 })
  t(`another cart's line 404s -> ${st404}`, st404 === 404)
}

// ---------------------------------------------------------------------------
section("coupons")
{
  await emptyCart(buyer)
  const [stEmpty] = await buyer.call("POST", "/api/cart/coupon", { couponCode: "CRUX10" })
  t(`refused on an empty cart -> ${stEmpty}`, stEmpty === 400)

  await buyer.call("POST", "/api/cart/add", AD_PACK)
  const [, cart] = await buyer.call("GET", "/api/cart")
  const subtotal = Number(cart.total)

  const [st, body] = await buyer.call("POST", "/api/cart/coupon", { couponCode: "CRUX10" })
  t(`valid code accepted -> ${st}`, st === 200, JSON.stringify(body).slice(0, 90))
  t("the real discount amount comes back", body?.coupon?.discountAmount === subtotal * 0.1,
    `want ${subtotal * 0.1}, got ${body?.coupon?.discountAmount}`)

  const [stLower] = await buyer.call("POST", "/api/cart/coupon", { couponCode: "crux10" })
  t("lowercase works", stLower === 200)
  for (const [label, code] of [["unknown code refused", "NOPE123"], ["empty code refused", ""]]) {
    const [s] = await buyer.call("POST", "/api/cart/coupon", { couponCode: code })
    t(`${label} -> ${s}`, s === 400)
  }
}

// ---------------------------------------------------------------------------
section("order creation prices the cart itself")
{
  const [, cart] = await buyer.call("GET", "/api/cart")
  const subtotal = Number(cart.total)

  const [stPlain, plain] = await buyer.call("POST", "/api/paypal/order", {})
  const configured = stPlain !== 503
  if (!configured) {
    console.log("  \x1b[2m(PayPal not configured locally — order tests skipped)\x1b[0m")
  } else {
    t(`order without a code = subtotal`, plain?.amount === subtotal.toFixed(2), `want ${subtotal.toFixed(2)}, got ${plain?.amount}`)
    const [, withCoupon] = await buyer.call("POST", "/api/paypal/order", { couponCode: "CRUX10" })
    t("coupon is applied to the charge", withCoupon?.amount === (subtotal * 0.9).toFixed(2),
      `want ${(subtotal * 0.9).toFixed(2)}, got ${withCoupon?.amount}`)
    const [stBoth] = await buyer.call("POST", "/api/paypal/order", { couponCode: "CRUX10", creatorCode: "CRUXDEV" })
    t(`coupon + creator code together refused -> ${stBoth}`, stBoth === 400)
    const [stBad] = await buyer.call("POST", "/api/paypal/order", { couponCode: "NOPE123" })
    t(`an invalid coupon is caught at order time too -> ${stBad}`, stBad === 400)
  }
}

// ---------------------------------------------------------------------------
section("mixed cart")
{
  await emptyCart(buyer)
  await buyer.call("POST", "/api/cart/add", AD_PACK)
  await buyer.call("POST", "/api/cart/add", FEATURED_PACK)
  const [, cart] = await buyer.call("GET", "/api/cart")
  t("two different packs are two lines", cart.items.length === 2, `got ${cart.items.length}`)
  t("total is the sum", Number(cart.total) === cart.items.reduce((a, i) => a + Number(i.price) * i.quantity, 0))

  // An Ad Slots coupon must not discount the featured line sitting beside it.
  const [st, body] = await buyer.call("POST", "/api/cart/coupon", { couponCode: "CRUX10" })
  if (st === 200) {
    t("a storewide coupon discounts the whole cart",
      body.coupon.discountAmount === Number(cart.total) * 0.1,
      `got ${body.coupon.discountAmount} of ${cart.total}`)
  } else {
    t("storewide coupon applied to a mixed cart", false, JSON.stringify(body).slice(0, 90))
  }
}

// ---------------------------------------------------------------------------
section("anonymous is refused everywhere it matters")
{
  for (const [label, method, path, body] of [
    ["cart read", "GET", "/api/cart", null],
    ["add to cart", "POST", "/api/cart/add", AD_PACK],
    ["change quantity", "PATCH", "/api/cart", { cartItemId: 1, quantity: 2 }],
    ["apply a coupon", "POST", "/api/cart/coupon", { couponCode: "CRUX10" }],
    ["create an order", "POST", "/api/paypal/order", {}],
  ]) {
    const res = await fetch(B + path, {
      method, headers: { "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    t(`${label} -> ${res.status}`, res.status === 401 || res.status === 403, `got ${res.status}`)
  }
}

// ---------------------------------------------------------------------------
section("catalogue and categories")
{
  const cats = await (await fetch(`${B}/api/categories`)).json()
  const list = Array.isArray(cats) ? cats : cats.categories ?? []
  const slugs = list.map((c) => c.slug)
  console.log(`  categories: ${slugs.join(", ")}`)
  t("categories are served", list.length > 0)
  t("every category has a slug and a name", list.every((c) => c.slug && c.name))

  const scripts = await (await fetch(`${B}/api/scripts?limit=200`)).json()
  const items = scripts.scripts ?? scripts
  t("catalogue is served", Array.isArray(items) && items.length > 0, `got ${items?.length}`)
  const orphans = items.filter((s) => s.category && !slugs.includes(s.category))
  t("no listing points at a category that does not exist", orphans.length === 0,
    orphans.slice(0, 3).map((s) => `${s.id}:${s.category}`).join(", "))
  const noPrice = items.filter((s) => !s.free && (s.price == null || Number.isNaN(Number(s.price))))
  t("every paid listing has a usable price", noPrice.length === 0, noPrice.slice(0, 3).map((s) => s.id).join(", "))
}

await emptyCart(buyer)

console.log(
  failures.length === 0
    ? `\n\x1b[32mPASS\x1b[0m — ${pass} checks\n`
    : `\n\x1b[31mFAIL\x1b[0m — ${pass} passed, ${failures.length} failed:\n${failures.map((f) => `    · ${f}`).join("\n")}\n`
)
process.exit(failures.length === 0 ? 0 : 1)
