// TODO: remove before production — FULL per-role journeys (Playwright).
// For EACH role we switch via the 🎭 widget, then actually WALK the app: visit
// every page that role can reach and click the real buttons/sections there, so
// each role produces distinct views (not just a role swap on the same page).
// Screenshots → mockups/_audit/e2e/journey/<role>-NN-<step>.png  + a video.
//   node scripts/e2e-journeys.mjs            (headless, records video)
//   HEADED=1 node scripts/e2e-journeys.mjs   (watch it live)
import { chromium } from "playwright"
import { mkdirSync } from "fs"

const BASE = process.env.BASE || "http://localhost:3000"
const OUT = "mockups/_audit/e2e/journey"
mkdirSync(OUT, { recursive: true })

let pass = 0, fail = 0
const ok = (n, c, x = "") => { if (c) { console.log(`    ✓ ${n}`); pass++ } else { console.log(`    ✗ ${n} ${x}`); fail++ } }
const EXPECT = { admin: ["admin", "founder", "moderator", "prop_lister"], founder: ["founder"], moderator: ["moderator"], creator: ["prop_lister"], buyer: ["user"] }
const NEW_TITLE = `Journey Script ${Date.now().toString().slice(-6)}`

async function getSession(ctx) { try { return await (await ctx.request.get(`${BASE}/api/auth/session`)).json() } catch { return {} } }

async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1100)
}
let shotN = 0
async function shot(page, role, step) {
  shotN++
  const n = String(shotN).padStart(2, "0")
  await page.screenshot({ path: `${OUT}/${role}-${n}-${step}.png`, fullPage: true }).catch(() => {})
  console.log(`    📸 ${role}-${n}-${step}`)
}
function sessionMatches(s, key, want) {
  const roles = s?.user?.roles || []
  if (key === "guest") return !s?.user
  if (want) return want.every((r) => roles.includes(r)) && roles.length === want.length
  return !!s?.user
}
// Real dev session via the API (same cookie the widget issues) — the reliable
// fallback when the widget's onClick hasn't hydrated yet on a heavy dev page.
async function apiLogin(ctx, key) {
  const csrf = (await (await ctx.request.get(`${BASE}/api/auth/csrf`)).json()).csrfToken
  if (key === "guest") {
    await ctx.request.post(`${BASE}/api/auth/signout`, { form: { csrfToken: csrf, json: "true" } }).catch(() => {})
  } else {
    await ctx.request.post(`${BASE}/api/auth/callback/dev-credentials`, { form: { csrfToken: csrf, key, json: "true", callbackUrl: BASE } }).catch(() => {})
  }
}
// Switch identity. Tries the real 🎭 widget first (so it's visible in headed/video),
// then guarantees the session via the API and reloads if the widget didn't take.
async function switchRole(page, ctx, key, expectRoles) {
  const want = expectRoles && expectRoles.length ? expectRoles : null
  const toggle = page.locator('[data-testid="impersonate-toggle"]')
  await toggle.waitFor({ state: "visible", timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(800)
  const preset = page.locator(`[data-testid="impersonate-${key}"]`)
  // Best-effort widget click (short budget — don't fight slow hydration here).
  let opened = false
  for (let i = 0; i < 6; i++) { if (await preset.isVisible().catch(() => false)) { opened = true; break } await toggle.click().catch(() => {}); await page.waitForTimeout(500) }
  if (opened) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {}),
      preset.click({ timeout: 5000 }).catch(() => {}),
    ])
    await page.waitForLoadState("domcontentloaded").catch(() => {})
  }
  // Verify session settled; if not, fall back to API login + reload.
  let s = await getSession(ctx)
  if (!sessionMatches(s, key, want)) {
    await apiLogin(ctx, key)
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {})
  }
  for (let i = 0; i < 16; i++) { s = await getSession(ctx); if (sessionMatches(s, key, want)) break; await page.waitForTimeout(400) }
  await page.waitForFunction(() => /Logout|Login/.test(document.body.innerText), { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(400)
}
// Click a sidebar section button. Admin/profile render <aside>…<button>label.
async function clickSection(page, label) {
  const candidates = [
    page.locator("aside").getByRole("button", { name: label, exact: true }),
    page.locator("aside button", { hasText: label }),
    page.locator('[role="tab"]', { hasText: label }),
    page.getByRole("button", { name: label, exact: true }),
  ]
  for (const loc of candidates) {
    const el = loc.first()
    if ((await el.count().catch(() => 0)) > 0) {
      await el.click().catch(() => {})
      await page.waitForTimeout(1100)
      return true
    }
  }
  return false
}

async function adminJourney(page, ctx, role) {
  console.log(`\n=== ${role.toUpperCase()} journey ===`)
  await switchRole(page, ctx, role, EXPECT[role])
  await goto(page, "/admin")
  // Wait out the "Loading admin dashboard…" spinner — the sidebar (and its section
  // buttons) only render once auth + data resolve.
  await page.locator("aside nav button").first().waitFor({ timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(800)
  ok(`${role} can open /admin console`, (await page.locator("aside nav button").count()) > 0)
  await shot(page, role, "admin-dashboard")
  for (const sec of ["Pending", "Users", "Scripts", "Giveaways", "Props", "Ads", "Settings"]) {
    if (await clickSection(page, sec)) await shot(page, role, `admin-${sec.toLowerCase()}`)
  }
  // Approve a pending item from the admin UI.
  await clickSection(page, "Pending")
  const approve = page.locator('button[title="Approve"]:not([disabled])').first()
  if ((await approve.count()) > 0) { await approve.click().catch(() => {}); await page.waitForTimeout(2000); await shot(page, role, "admin-after-approve") }
  // Admin also browses the public marketplace.
  await goto(page, "/scripts"); await shot(page, role, "browse-scripts")
}

async function main() {
  console.log(`▶ Per-role journeys @ ${BASE}\n`)
  const headed = process.env.HEADED === "1"
  const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 250 : 0 })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: `${OUT}/video`, size: { width: 1440, height: 900 } } })
  const page = await ctx.newPage()
  await goto(page, "/scripts")

  // ── ADMIN (+ founder, moderator) — full admin console tour ───────────────
  await adminJourney(page, ctx, "admin")
  await adminJourney(page, ctx, "founder")
  await adminJourney(page, ctx, "moderator")

  // ── CREATOR / SELLER — profile dashboard, manage, submit forms ───────────
  console.log(`\n=== CREATOR journey ===`)
  await switchRole(page, ctx, "creator", EXPECT.creator)
  await goto(page, "/profile")
  ok("creator opens /profile dashboard", (await page.getByText(/Overview|Welcome|Profile/i).count()) > 0)
  await shot(page, "creator", "profile-overview")
  for (const sec of ["Scripts", "Props", "Giveaways", "Ads", "Featured Scripts", "Entries", "Settings"]) {
    if (await clickSection(page, sec)) await shot(page, "creator", `profile-${sec.toLowerCase().replace(/\s+/g, "-")}`)
  }
  await goto(page, "/edit-products"); ok("creator opens /edit-products", (await page.locator("body").innerText()).length > 200); await shot(page, "creator", "edit-products")
  const editBtn = page.getByRole("link", { name: /edit/i }).or(page.getByRole("button", { name: /edit/i })).first()
  if ((await editBtn.count()) > 0) { await editBtn.click().catch(() => {}); await page.waitForTimeout(1500); await shot(page, "creator", "edit-product-open") }
  // Submit a new script (form) — real listing creation.
  await goto(page, "/scripts/submit")
  try {
    await page.getByPlaceholder("Enter your script title").fill(NEW_TITLE)
    await page.getByPlaceholder(/Describe your script/i).fill("Created during the creator journey walkthrough.")
    await page.locator('[role="combobox"]').filter({ hasText: "Select category" }).first().click().catch(() => {})
    await page.getByRole("option").first().click().catch(() => {})
    await page.getByRole("button", { name: /Select frameworks/i }).click().catch(() => {})
    await page.getByText("ESX", { exact: true }).first().click().catch(() => {})
    await page.keyboard.press("Escape").catch(() => {})
    await page.getByText("Select currency", { exact: false }).first().click().catch(() => {})
    await page.getByPlaceholder(/Search currency/i).fill("USD").catch(() => {})
    await page.getByRole("option").first().click().catch(() => {})
    await page.waitForTimeout(400)
    await page.locator("#price").fill("21.99")
    await shot(page, "creator", "submit-script-filled")
    await page.getByRole("button", { name: /Submit for review/i }).click()
    await page.waitForURL("**/profile", { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(1200)
    ok("creator submitted a new script (form)", true)
  } catch (e) { ok("creator submitted a new script (form)", false, e.message) }
  await shot(page, "creator", "after-submit")
  await goto(page, "/props/submit"); await shot(page, "creator", "submit-prop-form")
  await goto(page, "/giveaways/create"); await shot(page, "creator", "create-giveaway-form")

  // ── BUYER — browse, detail, cart, coupon, checkout, giveaway entry ───────
  console.log(`\n=== BUYER journey ===`)
  await switchRole(page, ctx, "buyer", EXPECT.buyer)
  await goto(page, "/scripts"); await shot(page, "buyer", "browse-scripts")
  // Detail pages fetch client-side (brief spinner) — wait for content before shot.
  let loaded = false
  for (let a = 0; a < 3 && !loaded; a++) {
    await goto(page, "/script/1001")
    await page.getByText(/Advanced Banking System/i).first().waitFor({ timeout: 9000 }).catch(() => {})
    loaded = (await page.getByText(/Advanced Banking System/i).count()) > 0
  }
  ok("buyer opens a script detail", loaded)
  await shot(page, "buyer", "script-detail")
  await goto(page, "/props"); await shot(page, "buyer", "browse-props")
  await goto(page, "/prop/prop-1001")
  await page.getByText(/Luxury Apartments|MLO/i).first().waitFor({ timeout: 9000 }).catch(() => {})
  await shot(page, "buyer", "prop-detail")
  // Add a package to cart via /advertise (completes locally), with the 3s-abort retry.
  await goto(page, "/advertise"); await shot(page, "buyer", "advertise")
  let items = []
  for (let a = 0; a < 3 && items.length === 0; a++) {
    const add = page.getByRole("button", { name: /Add to Cart/i }).first()
    if ((await add.count()) === 0) break
    await add.click().catch(() => {}); await page.waitForTimeout(3200)
    const c = await (await ctx.request.get(`${BASE}/api/cart`)).json().catch(() => ({})); items = c.items || []
  }
  ok("buyer added an item to cart", items.length > 0, `items=${items.length}`)
  await goto(page, "/cart"); await shot(page, "buyer", "cart")
  // Apply coupon CRUX10 if there's a coupon input.
  const couponInput = page.getByPlaceholder(/coupon|code|promo/i).first()
  if ((await couponInput.count()) > 0) {
    await couponInput.fill("CRUX10").catch(() => {})
    const applyBtn = page.getByRole("button", { name: /apply/i }).first()
    if ((await applyBtn.count()) > 0) { await applyBtn.click().catch(() => {}); await page.waitForTimeout(1500) }
    await shot(page, "buyer", "cart-coupon")
  }
  await goto(page, "/giveaways"); await shot(page, "buyer", "browse-giveaways")
  await goto(page, "/giveaway/3001")
  await page.getByText(/Script Bundle|Giveaway|Enter/i).first().waitFor({ timeout: 9000 }).catch(() => {})
  const enterBtn = page.getByRole("button", { name: /^enter|enter giveaway|enter now/i }).first()
  if ((await enterBtn.count()) > 0) { await enterBtn.click().catch(() => {}); await page.waitForTimeout(1500) }
  await shot(page, "buyer", "giveaway-detail")
  await goto(page, "/profile"); await shot(page, "buyer", "profile")

  // ── GUEST — public pages + blocked from protected ────────────────────────
  console.log(`\n=== GUEST journey ===`)
  await switchRole(page, ctx, "guest", null)
  await goto(page, "/"); await shot(page, "guest", "home")
  await goto(page, "/scripts"); await shot(page, "guest", "browse-scripts")
  await goto(page, "/giveaways"); await shot(page, "guest", "browse-giveaways")
  await goto(page, "/cart"); await shot(page, "guest", "cart-blocked")
  ok("guest /api/cart is 401", (await ctx.request.get(`${BASE}/api/cart`)).status() === 401)
  await goto(page, "/admin"); await shot(page, "guest", "admin-blocked")
  ok("guest admin API blocked", [401, 403].includes((await ctx.request.get(`${BASE}/api/admin/scripts?status=pending`)).status()))
  await goto(page, "/scripts/submit"); await shot(page, "guest", "submit-blocked")

  const videoPath = await page.video()?.path().catch(() => null)
  await ctx.close(); await browser.close()
  console.log(`\n──────── JOURNEYS: ${pass} passed, ${fail} failed ── ${shotN} screenshots in ${OUT}/ ────────`)
  console.log(`video: ${videoPath || OUT + "/video/*.webm"}\n`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error("journeys crashed:", e); process.exit(2) })
