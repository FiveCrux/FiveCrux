// TODO: remove before production — end-to-end server-side test of the local
// dev-login + PGlite harness. Drives REAL next-auth sessions (JWT cookies) and
// exercises role-gated API routes the way the browser would.
//
//   node scripts/e2e-harness.mjs        (dev server must be running on :3000)
const BASE = process.env.BASE || "http://localhost:3000"

let pass = 0, fail = 0
function check(name, cond, extra = "") {
  if (cond) { console.log(`  ✓ ${name}`); pass++ }
  else { console.log(`  ✗ ${name} ${extra}`); fail++ }
}

// --- tiny cookie jar ---------------------------------------------------------
function makeJar() {
  const jar = new Map()
  return {
    header: () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    absorb: (res) => {
      const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : []
      for (const c of raw) {
        const [pair] = c.split(";")
        const i = pair.indexOf("=")
        const k = pair.slice(0, i).trim()
        const v = pair.slice(i + 1).trim()
        if (v === "" || v === "deleted") jar.delete(k)
        else jar.set(k, v)
      }
    },
    clear: () => jar.clear(),
  }
}

async function jfetch(jar, path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    redirect: "manual",
    headers: { ...(opts.headers || {}), cookie: jar.header() },
  })
  jar.absorb(res)
  return res
}

// next-auth Credentials login → issues a real session cookie.
async function devLogin(jar, key) {
  jar.clear()
  const csrfRes = await jfetch(jar, "/api/auth/csrf")
  const { csrfToken } = await csrfRes.json()
  const body = new URLSearchParams({ csrfToken, key, json: "true", callbackUrl: BASE })
  await jfetch(jar, "/api/auth/callback/dev-credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  const sess = await (await jfetch(jar, "/api/auth/session")).json()
  return sess
}

async function main() {
  console.log(`\n▶ FiveCrux e2e harness @ ${BASE}\n`)

  // 1. ADMIN login + role check ----------------------------------------------
  console.log("1) Dev login as ADMIN (real next-auth session)")
  const admin = makeJar()
  const adminSess = await devLogin(admin, "admin")
  check("session has user", !!adminSess?.user, JSON.stringify(adminSess))
  check("admin roles include 'admin'", adminSess?.user?.roles?.includes("admin"), JSON.stringify(adminSess?.user?.roles))

  // 2. Admin approval queue (role-gated route) --------------------------------
  console.log("2) Admin approval queue (GET /api/admin/scripts?status=pending)")
  const pend1 = await jfetch(admin, "/api/admin/scripts?status=pending&limit=50")
  check("GET returns 200 for admin", pend1.status === 200, `status=${pend1.status}`)
  const pend1Data = await pend1.json().catch(() => ({}))
  const pendingList = pend1Data.scripts || pend1Data.data || pend1Data || []
  const pendingCount = Array.isArray(pendingList) ? pendingList.length : 0
  check("pending queue has seeded scripts (>=2)", pendingCount >= 2, `count=${pendingCount}`)
  const target = (Array.isArray(pendingList) ? pendingList : []).find((s) => String(s.id) === "2001") || pendingList[0]

  // 3. Approve a pending script (pending → approved) --------------------------
  console.log("3) Approve a pending script (PATCH /api/admin/scripts)")
  if (target) {
    const patch = await jfetch(admin, "/api/admin/scripts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scriptId: target.id, status: "approved", adminNotes: "e2e approved" }),
    })
    const patchBody = await patch.json().catch(() => ({}))
    check("approve returns 200", patch.status === 200, `status=${patch.status} ${JSON.stringify(patchBody)}`)
    const pend2 = await jfetch(admin, "/api/admin/scripts?status=pending&limit=50")
    const pend2Data = await pend2.json().catch(() => ({}))
    const pend2List = pend2Data.scripts || pend2Data || []
    const pend2Count = Array.isArray(pend2List) ? pend2List.length : 0
    check("pending count decreased after approval", pend2Count === pendingCount - 1, `before=${pendingCount} after=${pend2Count}`)
  } else {
    check("had a pending script to approve", false)
  }

  // 4. Public listing shows approved scripts ----------------------------------
  console.log("4) Public marketplace (GET /api/scripts)")
  const pub = await jfetch(admin, "/api/scripts")
  check("GET /api/scripts 200", pub.status === 200, `status=${pub.status}`)
  const pubData = await pub.json().catch(() => ({}))
  const pubList = pubData.scripts || pubData.data || pubData || []
  check("approved scripts present (>=4)", Array.isArray(pubList) && pubList.length >= 4, `count=${Array.isArray(pubList) ? pubList.length : "n/a"}`)

  // 5. Role enforcement: BUYER blocked from admin route -----------------------
  console.log("5) Role enforcement — login as BUYER")
  const buyer = makeJar()
  const buyerSess = await devLogin(buyer, "buyer")
  check("buyer session has user", !!buyerSess?.user)
  check("buyer roles do NOT include admin", !buyerSess?.user?.roles?.includes("admin"), JSON.stringify(buyerSess?.user?.roles))
  const buyerAdmin = await jfetch(buyer, "/api/admin/scripts?status=pending")
  check("buyer gets 403 on admin route", buyerAdmin.status === 403, `status=${buyerAdmin.status}`)

  // 6. Cart flow as buyer (relational query API on PGlite) --------------------
  console.log("6) Cart flow as BUYER (add prop → read cart)")
  const cartBefore = await jfetch(buyer, "/api/cart")
  check("buyer GET /api/cart is 200 (authed, not 401)", cartBefore.status === 200, `status=${cartBefore.status}`)
  const add = await jfetch(buyer, "/api/cart/add", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemType: "prop", itemId: "prop-1001", title: "Luxury Apartments MLO", price: "34.99" }),
  })
  const addBody = await add.json().catch(() => ({}))
  check("add to cart 200", add.status === 200, `status=${add.status} ${JSON.stringify(addBody)}`)
  const cartAfter = await jfetch(buyer, "/api/cart")
  const cartData = await cartAfter.json().catch(() => ({}))
  const cartItems = cartData.items || cartData.cartItems || []
  check("cart now contains the prop", Array.isArray(cartItems) && cartItems.some((i) => String(i.itemId) === "prop-1001" || String(i.title).includes("Luxury")), JSON.stringify(cartData).slice(0, 200))

  // 7. Guest (no session) blocked ---------------------------------------------
  console.log("7) Guest (no cookie) blocked from cart")
  const guest = makeJar()
  const guestCart = await jfetch(guest, "/api/cart")
  check("guest GET /api/cart is 401", guestCart.status === 401, `status=${guestCart.status}`)

  console.log(`\n──────── RESULT: ${pass} passed, ${fail} failed ────────\n`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error("harness crashed:", e); process.exit(2) })
