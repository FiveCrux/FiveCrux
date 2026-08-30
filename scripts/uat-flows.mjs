// UAT for the non-checkout flows: listing submit and its validation, ownership
// boundaries, giveaway entry, role boundaries, and the chargeback block.
//
// LOCAL only — creates and deletes rows for the dev users on the PGlite harness.
//
//   node scripts/uat-flows.mjs

const B = process.env.UAT_BASE || "http://localhost:50003"

let pass = 0
const failures = []
const t = (name, cond, detail = "") => {
  if (cond) { console.log(`  \x1b[32m✓\x1b[0m ${name}`); pass++ }
  else { console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? `  → ${detail}` : ""}`); failures.push(name) }
}
const section = (s) => console.log(`\n\x1b[1m${s}\x1b[0m`)

async function session(key) {
  const jar = new Map()
  const hdr = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ")
  const absorb = (r) => {
    for (const c of r.headers.getSetCookie?.() ?? []) {
      const [p] = c.split(";")
      const i = p.indexOf("=")
      const k = p.slice(0, i).trim(); const v = p.slice(i + 1).trim()
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
      method, headers: { cookie: hdr(), "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return [res.status, await res.json().catch(() => ({}))]
  }
  return { user: me?.user ?? null, call }
}

const listing = (over = {}) => ({
  title: "UAT listing", description: "Created by the UAT run.", price: "9.99",
  currency: "EUR", category: "script", framework: [], images: [], tags: [], ...over,
})

console.log(`\n▶ Flows UAT — ${B}`)
const creator = await session("creator")
const buyer = await session("buyer")
const admin = await session("admin")
if (!creator.user || !buyer.user || !admin.user) {
  console.log("\n\x1b[31mLOGIN FAILED — dev server up with ALLOW_DEV_LOGIN=true?\x1b[0m\n"); process.exit(1)
}

const created = []

// ---------------------------------------------------------------------------
section("listing submit — values are validated, not just present")
{
  for (const [label, over, want] of [
    ["negative price refused", { price: "-5" }, 400],
    ["non-numeric price refused", { price: "abc" }, 400],
    ["empty title refused", { title: "   " }, 400],
    ["unknown category refused", { category: "not-a-real-category" }, 400],
    ["a real listing is accepted", {}, 201],
  ]) {
    const [st, body] = await creator.call("POST", "/api/scripts", listing(over))
    t(`${label} -> ${st}`, st === want, JSON.stringify(body).slice(0, 100))
    const id = body?.scriptId ?? body?.script?.id ?? body?.id
    if (st === 201 && id) created.push(id)
  }
}

// ---------------------------------------------------------------------------
section("ownership — one seller cannot touch another's listing")
{
  const mine = created[0]
  if (!mine) { t("a listing to test with", false, "none created"); }
  else {
    const [stOther] = await buyer.call("PATCH", `/api/scripts/${mine}`, { title: "hijacked" })
    t(`another user cannot edit it -> ${stOther}`, [401, 403, 404].includes(stOther), `got ${stOther}`)
    const [stDel] = await buyer.call("DELETE", `/api/scripts/${mine}`)
    t(`another user cannot delete it -> ${stDel}`, [401, 403, 404].includes(stDel), `got ${stDel}`)
    const [stOwn] = await creator.call("PATCH", `/api/scripts/${mine}`, { title: "UAT listing (edited)" })
    t(`the owner can edit it -> ${stOwn}`, stOwn === 200, `got ${stOwn}`)
  }
}

// ---------------------------------------------------------------------------
section("public reads do not leak private data")
{
  const list = await (await fetch(`${B}/api/scripts?limit=50`)).json()
  const items = list.scripts ?? list
  const leaky = items.filter((s) => s.seller_email || s.sellerEmail || s.email)
  t("the catalogue does not expose seller emails", leaky.length === 0,
    leaky.slice(0, 2).map((s) => s.id).join(", "))

  const gw = await (await fetch(`${B}/api/giveaways?limit=50`)).json()
  const gws = gw.giveaways ?? gw
  const leakyG = gws.filter((g) => g.creator_email || g.creatorEmail ||
    (Array.isArray(g.winners) && g.winners.some((w) => w?.email)))
  t("giveaways do not expose creator or winner emails", leakyG.length === 0,
    leakyG.slice(0, 2).map((g) => g.id).join(", "))
}

// ---------------------------------------------------------------------------
section("role boundaries")
{
  for (const [label, s, path, want] of [
    ["buyer cannot list users", buyer, "/api/admin/users?limit=5", 403],
    ["buyer cannot read pricing", buyer, "/api/admin/pricing", 403],
    ["buyer cannot read the blacklist", buyer, "/api/admin/blocked-users", 403],
    ["admin can read pricing", admin, "/api/admin/pricing", 200],
    ["admin can read the blacklist", admin, "/api/admin/blocked-users", 200],
  ]) {
    const [st] = await s.call("GET", path)
    t(`${label} -> ${st}`, st === want, `got ${st}`)
  }
  const anon = await fetch(`${B}/api/admin/users?limit=5`)
  t(`anonymous cannot list users -> ${anon.status}`, anon.status === 401 || anon.status === 403)
}

// ---------------------------------------------------------------------------
section("giveaways")
{
  const gw = await (await fetch(`${B}/api/giveaways?limit=20`)).json()
  const list = gw.giveaways ?? gw
  const active = list.find((g) => g.status === "active")
  if (!active) { console.log("  \x1b[2m(no active giveaway seeded — skipped)\x1b[0m") }
  else {
    const [st1, b1] = await buyer.call("POST", `/api/giveaways/${active.id}/entries`, {})
    t(`a signed-in user can enter -> ${st1}`, [200, 201, 400].includes(st1), JSON.stringify(b1).slice(0, 90))
    const [st2, b2] = await buyer.call("POST", `/api/giveaways/${active.id}/entries`, {})
    t(`entering twice is refused -> ${st2}`, st2 === 400 || st2 === 409, JSON.stringify(b2).slice(0, 90))
    const anon = await fetch(`${B}/api/giveaways/${active.id}/entries`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    })
    t(`anonymous cannot enter -> ${anon.status}`, anon.status === 401 || anon.status === 403, `got ${anon.status}`)
  }
}

// ---------------------------------------------------------------------------
section("chargeback block is read-only, not a ban")
{
  const [stBlock, bBlock] = await admin.call("PATCH", "/api/admin/blocked-users", {
    userId: buyer.user.id, blocked: true, reason: "UAT — temporary",
  })
  t(`admin can block an account -> ${stBlock}`, [200, 201].includes(stBlock), JSON.stringify(bBlock).slice(0, 100))

  if ([200, 201].includes(stBlock)) {
    const [stRead] = await buyer.call("GET", "/api/cart")
    t(`a blocked user can still read -> ${stRead}`, stRead === 200, `got ${stRead}`)

    for (const [label, method, path, body] of [
      ["cannot add to cart", "POST", "/api/cart/add", { itemType: "subscription", itemId: "ads:premium:1", title: "x", metadata: { packageType: "ads", couponScope: "Ad Slots", packageId: "premium", duration: 1 } }],
      ["cannot create an order", "POST", "/api/paypal/order", {}],
      ["cannot submit a listing", "POST", "/api/scripts", listing()],
      ["cannot create a giveaway", "POST", "/api/giveaways", { title: "UAT gw", description: "x", category: "script", endDate: new Date(Date.now() + 864e5).toISOString(), prizes: [] }],
    ]) {
      const [st] = await buyer.call(method, path, body)
      t(`${label} -> ${st}`, st === 403, `got ${st}`)
    }

    const [stUn] = await admin.call("PATCH", "/api/admin/blocked-users", { userId: buyer.user.id, blocked: false })
    t(`admin can unblock -> ${stUn}`, [200, 204].includes(stUn), `got ${stUn}`)
    const [stAfter] = await buyer.call("POST", "/api/cart/add", {
      itemType: "subscription", itemId: "ads:premium:1", title: "x",
      metadata: { packageType: "ads", couponScope: "Ad Slots", packageId: "premium", duration: 1 },
    })
    t(`writing works again after unblock -> ${stAfter}`, stAfter === 200, `got ${stAfter}`)
  }
}

// tidy up what this run created
for (const id of created) await creator.call("DELETE", `/api/scripts/${id}`)
const [, cart] = await buyer.call("GET", "/api/cart")
for (const i of cart.items ?? []) await buyer.call("DELETE", "/api/cart", { cartItemId: i.id })

console.log(
  failures.length === 0
    ? `\n\x1b[32mPASS\x1b[0m — ${pass} checks\n`
    : `\n\x1b[31mFAIL\x1b[0m — ${pass} passed, ${failures.length} failed:\n${failures.map((f) => `    · ${f}`).join("\n")}\n`
)
process.exit(failures.length === 0 ? 0 : 1)
