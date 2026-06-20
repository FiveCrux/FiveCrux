// TODO: remove before production — visual e2e: logs in via the dev Credentials
// provider, then loads the redesigned pages in a real browser and asserts the
// SEEDED data (not demo fallbacks) is rendered. Screenshots → mockups/_audit/e2e.
import { chromium } from "playwright"
import { mkdirSync } from "fs"

const BASE = process.env.BASE || "http://localhost:3000"
const OUT = "mockups/_audit/e2e"
mkdirSync(OUT, { recursive: true })

let pass = 0, fail = 0
const ok = (n, c, x = "") => { if (c) { console.log(`  ✓ ${n}`); pass++ } else { console.log(`  ✗ ${n} ${x}`); fail++ } }

async function devLogin(ctx, key) {
  const csrf = await (await ctx.request.get(`${BASE}/api/auth/csrf`)).json()
  await ctx.request.post(`${BASE}/api/auth/callback/dev-credentials`, {
    form: { csrfToken: csrf.csrfToken, key, json: "true", callbackUrl: BASE },
  })
  return (await (await ctx.request.get(`${BASE}/api/auth/session`)).json())
}

async function visit(page, path, name) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  return (await page.content())
}

async function main() {
  console.log(`\n▶ Visual e2e @ ${BASE}\n`)
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })

  console.log("login as ADMIN")
  const sess = await devLogin(ctx, "admin")
  ok("browser session is admin", sess?.user?.roles?.includes("admin"), JSON.stringify(sess?.user?.roles))

  const page = await ctx.newPage()

  console.log("home /")
  const home = await visit(page, "/", "01-home")
  ok("home renders", home.includes("FiveCrux") || home.length > 5000)

  console.log("scripts /scripts")
  const scripts = await visit(page, "/scripts", "02-scripts")
  ok("scripts shows seeded 'Advanced Banking System'", scripts.includes("Advanced Banking System"), "(seed not rendered)")
  ok("scripts shows 'Mechanic Job Pro'", scripts.includes("Mechanic Job Pro"))

  console.log("props /props")
  const props = await visit(page, "/props", "03-props")
  ok("props shows seeded 'Luxury Apartments MLO'", props.includes("Luxury Apartments MLO") || props.includes("Police Station"), "(seed not rendered)")

  console.log("giveaways /giveaways")
  const gv = await visit(page, "/giveaways", "04-giveaways")
  ok("giveaways shows seeded '€500 Script Bundle'", gv.includes("Script Bundle") || gv.includes("Gaming PC"), "(seed not rendered)")

  console.log("script detail /script/1001")
  const detail = await visit(page, "/script/1001", "05-script-detail")
  ok("script detail renders banking title", detail.includes("Advanced Banking System"), "(detail not rendered)")

  console.log("cart /cart")
  const cart = await visit(page, "/cart", "06-cart")
  ok("cart page renders (no infinite spinner)", !cart.includes("Loading your cart") || cart.includes("Review"), "")

  console.log("admin /admin")
  const admin = await visit(page, "/admin", "07-admin")
  ok("admin console renders (seeded pending visible)", admin.includes("PENDING") || admin.includes("Casino Heist") || admin.includes("Fishing") || admin.includes("Pending"), "(admin queue not rendered)")

  await browser.close()
  console.log(`\n──────── VISUAL: ${pass} passed, ${fail} failed ── screenshots in ${OUT}/ ────────\n`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error("visual e2e crashed:", e); process.exit(2) })
