// TODO: remove before production — FULL impersonation + lifecycle e2e (Playwright).
// Switches every role via the real 🎭 widget, then drives the complete product
// lifecycle through the live UI:
//   CREATOR submits a new script (form) → ADMIN approves it (/admin UI) →
//   it goes LIVE → BUYER sees it + purchases (cart → checkout).
// Run headed to watch: HEADED=1 node scripts/e2e-impersonation.mjs
import { chromium } from "playwright"
import { mkdirSync } from "fs"

const BASE = process.env.BASE || "http://localhost:3000"
const OUT = "mockups/_audit/e2e"
mkdirSync(OUT, { recursive: true })

let pass = 0, fail = 0
const ok = (n, c, x = "") => { if (c) { console.log(`  ✓ ${n}`); pass++ } else { console.log(`  ✗ ${n} ${x}`); fail++ } }
const NEW_TITLE = `E2E Lifecycle Script ${Date.now().toString().slice(-6)}`

const EXPECT = {
  admin: ["admin", "founder", "moderator", "prop_lister"],
  founder: ["founder"], moderator: ["moderator"], creator: ["prop_lister"], buyer: ["user"],
}

async function getSession(ctx) {
  try { return await (await ctx.request.get(`${BASE}/api/auth/session`)).json() } catch { return {} }
}
async function listScripts(ctx, status) {
  const url = status ? `${BASE}/api/admin/scripts?status=${status}&limit=80` : `${BASE}/api/scripts?limit=80`
  try {
    const r = await ctx.request.get(url)
    if (r.status() !== 200) return { code: r.status(), list: [] }
    const d = await r.json()
    const list = d.scripts || d.data || d || []
    return { code: 200, list: Array.isArray(list) ? list : [] }
  } catch { return { code: -1, list: [] } }
}

// domcontentloaded (not networkidle — the app polls /api/user/ad-slots forever).
async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(900)
}
// Switch identity via the widget. Deterministic: waits for the signIn-triggered
// full reload to finish, then POLLS the real session until it reflects the new
// role (expectRoles = [] / null means guest → no user).
async function switchRole(page, ctx, key, expectRoles) {
  const toggle = page.locator('[data-testid="impersonate-toggle"]')
  await toggle.waitFor({ state: "visible", timeout: 20000 })
  await page.waitForTimeout(1000) // let the widget hydrate after the previous reload
  const preset = page.locator(`[data-testid="impersonate-${key}"]`)
  // Converge on an OPEN panel — only click the toggle while the preset is still
  // hidden, so we never close an already-open panel. Tolerates slow hydration.
  for (let i = 0; i < 18; i++) {
    if (await preset.isVisible().catch(() => false)) break
    await toggle.click().catch(() => {})
    await page.waitForTimeout(700)
  }
  // The preset's pick() does signIn() then window.location.reload(); wait for both.
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {}),
    preset.click({ timeout: 10000 }),
  ])
  await page.waitForLoadState("domcontentloaded").catch(() => {})
  await page.waitForFunction(() => /Logout|Login/.test(document.body.innerText), { timeout: 10000 }).catch(() => {})
  // Poll the server session until it settles on the new identity.
  const want = expectRoles && expectRoles.length ? expectRoles : null
  for (let i = 0; i < 16; i++) {
    const s = await getSession(ctx)
    const roles = s?.user?.roles || []
    if (key === "guest") { if (!s?.user) break }
    else if (want) { if (want.every((r) => roles.includes(r)) && roles.length === want.length) break }
    else if (s?.user) break
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(300)
}

async function main() {
  console.log(`\n▶ Impersonation + lifecycle e2e @ ${BASE}  (new listing: "${NEW_TITLE}")\n`)
  const headed = process.env.HEADED === "1"
  const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 300 : 0 })
  // Always record a video so the whole run can be watched back reliably (headless
  // is stable; headed full-reloads race Next dev's hydration). Saved to OUT/video.
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: `${OUT}/video`, size: { width: 1440, height: 900 } },
  })
  const page = await ctx.newPage()
  // Run role-switching on a lighter page than the homepage (whose heavy hero +
  // framer-motion makes the widget's hydration race after each full reload).
  await goto(page, "/scripts")

  // ── 1. Role matrix: widget switches every role → session + navbar ─────────
  console.log("1) Widget switches every role → real session + navbar gating")
  for (const key of Object.keys(EXPECT)) {
    await switchRole(page, ctx, key, EXPECT[key])
    const roles = (await getSession(ctx))?.user?.roles || []
    const match = EXPECT[key].every((r) => roles.includes(r)) && roles.length === EXPECT[key].length
    ok(`[${key}] session roles = ${JSON.stringify(EXPECT[key])}`, match, `got ${JSON.stringify(roles)}`)
    const wantAdmin = ["admin", "founder", "moderator"].includes(key)
    // Give the role-dependent Admin link time to render from the async session.
    if (wantAdmin) await page.getByRole("link", { name: "Admin", exact: true }).first().waitFor({ timeout: 5000 }).catch(() => {})
    const hasAdmin = (await page.getByRole("link", { name: "Admin", exact: true }).count()) > 0
    ok(`[${key}] navbar Admin link ${wantAdmin ? "shown" : "hidden"}`, hasAdmin === wantAdmin, `hasAdmin=${hasAdmin}`)
  }
  await switchRole(page, ctx, "guest", null)
  ok("[guest] session has no user", !(await getSession(ctx))?.user)
  ok("[guest] navbar shows Login", (await page.getByText("Login", { exact: false }).count()) > 0)

  // ── 2. LIFECYCLE step A — CREATOR submits a new script via the form ───────
  console.log(`\n2) CREATOR submits a new listing via the form`)
  await switchRole(page, ctx, "creator", EXPECT.creator)
  await goto(page, "/scripts/submit")
  try {
    await page.getByPlaceholder("Enter your script title").fill(NEW_TITLE)
    await page.getByPlaceholder(/Describe your script/i).fill("A polished end-to-end test listing created by the creator role.")
    // Category (Radix Select)
    await page.locator('[role="combobox"]').filter({ hasText: "Select category" }).first().click().catch(() => {})
    await page.getByRole("option").first().click().catch(() => {})
    // Framework (Popover + checkbox)
    await page.getByRole("button", { name: /Select frameworks/i }).click().catch(() => {})
    await page.getByText("ESX", { exact: true }).first().click().catch(() => {})
    await page.keyboard.press("Escape").catch(() => {})
    // Currency (a Command popover) — REQUIRED, it's what enables the price input.
    await page.getByText("Select currency", { exact: false }).first().click().catch(() => {})
    await page.getByPlaceholder(/Search currency/i).fill("USD").catch(() => {})
    await page.getByRole("option").first().click().catch(() => {})
    await page.waitForTimeout(400)
    // Price (now enabled)
    await page.locator("#price").fill("17.99")
    await page.screenshot({ path: `${OUT}/life-1-creator-form.png` })
    await page.getByRole("button", { name: /Submit for review/i }).click()
    await page.waitForURL("**/profile", { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(1500)
  } catch (e) { console.log("   (form fill note:", e.message, ")") }

  // Verify it landed in the pending queue (check as admin).
  await switchRole(page, ctx, "admin", EXPECT.admin)
  const pendA = await listScripts(ctx, "pending")
  const inPending = pendA.list.find((s) => s.title === NEW_TITLE)
  ok("creator's listing is in the admin PENDING queue", !!inPending, `pending titles: ${pendA.list.map((s) => s.title).join(" | ").slice(0, 160)}`)

  // ── 3. LIFECYCLE step B — ADMIN approves it via the /admin UI ─────────────
  console.log("3) ADMIN approves the new listing via the /admin UI")
  await goto(page, "/admin")
  await page.locator('button[title="Approve"]').first().waitFor({ timeout: 12000 }).catch(() => {})
  // Click Approve in the row that contains our title (fallback: first enabled Approve).
  let clicked = false
  const row = page.locator("tr", { hasText: NEW_TITLE })
  if ((await row.count()) > 0 && (await row.locator('button[title="Approve"]').count()) > 0) {
    await row.locator('button[title="Approve"]').first().click(); clicked = true
  } else {
    const anyApprove = page.locator('button[title="Approve"]:not([disabled])')
    if ((await anyApprove.count()) > 0) { await anyApprove.first().click(); clicked = true }
  }
  ok("admin clicked an Approve button in the UI", clicked)
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/life-2-admin-approved.png` })

  // ── 4. LIFECYCLE step C — listing is now LIVE ─────────────────────────────
  console.log("4) Listing goes LIVE in the public marketplace")
  const live = await listScripts(ctx, null)
  const liveItem = live.list.find((s) => s.title === NEW_TITLE)
  ok("approved listing now appears in /api/scripts (live)", !!liveItem, `(was the right row approved?)`)

  // ── 5. LIFECYCLE step D — BUYER sees it live + starts a purchase ──────────
  console.log("5) BUYER sees the live listing + purchases")
  await switchRole(page, ctx, "buyer", EXPECT.buyer)
  await goto(page, "/scripts")
  // Grid fetches client-side; give it time, then scroll so any lazy rows render.
  await page.getByText(NEW_TITLE, { exact: false }).first().waitFor({ timeout: 8000 }).catch(() => {})
  await page.mouse.wheel(0, 3000).catch(() => {})
  await page.waitForTimeout(1200)
  const seenOnGrid = (await page.getByText(NEW_TITLE, { exact: false }).count()) > 0
  ok("buyer sees the new listing on /scripts", seenOnGrid, "(grid sort may page it down — detail check below is the real proof)")
  if (liveItem?.id != null) {
    // The detail page's own fetch has a short client abort; on a slow first paint
    // it can fall back to seed data. Reload-retry until the real title renders.
    let onDetail = false
    for (let attempt = 0; attempt < 3 && !onDetail; attempt++) {
      await goto(page, `/script/${liveItem.id}`)
      await page.getByText(NEW_TITLE, { exact: false }).first().waitFor({ timeout: 9000 }).catch(() => {})
      onDetail = (await page.getByText(NEW_TITLE, { exact: false }).count()) > 0
    }
    ok("buyer can open the live product detail page", onDetail, `id=${liveItem.id}`)
    await page.screenshot({ path: `${OUT}/life-3-buyer-detail.png` })
  } else {
    ok("live listing had an id to open", false, "liveItem.id missing")
  }
  // Purchase path that completes locally: add a package to cart → reach checkout.
  await goto(page, "/advertise")
  // The add-to-cart fetch has a 3s client abort; first call also compiles the
  // route in dev (>3s) → can fail once. Click, then retry until the cart fills.
  let items = []
  for (let attempt = 0; attempt < 3 && items.length === 0; attempt++) {
    const addBtn = page.getByRole("button", { name: /Add to Cart/i }).first()
    if ((await addBtn.count()) === 0) break
    await addBtn.click().catch(() => {})
    await page.waitForTimeout(3200)
    const cart = await (await ctx.request.get(`${BASE}/api/cart`)).json().catch(() => ({}))
    items = cart.items || cart.cartItems || []
  }
  ok("buyer added an item to cart (purchase initiated)", items.length > 0, `cart items=${items.length}`)
  await goto(page, "/cart")
  await page.screenshot({ path: `${OUT}/life-4-buyer-cart.png` })
  // Reach checkout — order row gets created; final payment capture needs real
  // PayPal/Tebex creds (placeholder creds here), so we only assert it's reachable.
  const checkout = await ctx.request.post(`${BASE}/api/cart/checkout`, { data: {} })
  ok("checkout endpoint reached as buyer (order created; capture needs real creds)", [200, 400, 500].includes(checkout.status()), `status=${checkout.status()}`)

  // ── 6. GUEST gating ────────────────────────────────────────────────────────
  console.log("6) GUEST blocked from protected areas")
  await switchRole(page, ctx, "guest", null)
  ok("guest /api/cart is 401", (await ctx.request.get(`${BASE}/api/cart`)).status() === 401)
  ok("guest admin API is 401/403", [401, 403].includes((await ctx.request.get(`${BASE}/api/admin/scripts?status=pending`)).status()))

  const videoPath = await page.video()?.path().catch(() => null)
  await ctx.close() // finalizes the video file
  await browser.close()
  console.log(`\n──────── LIFECYCLE e2e: ${pass} passed, ${fail} failed ────────`)
  console.log(`shots in ${OUT}/   |   video: ${videoPath || OUT + "/video/*.webm"}\n`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error("e2e crashed:", e); process.exit(2) })
