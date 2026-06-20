// Responsive audit — loads key pages at mobile/tablet/desktop widths and flags
// horizontal overflow (the #1 responsive bug) + screenshots mobile.
//   node scripts/responsive-audit.mjs
import { chromium } from "playwright"
import { mkdirSync } from "fs"

const BASE = process.env.BASE || "http://localhost:3000"
const OUT = "mockups/_audit/responsive"
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: "mobile", w: 390, h: 844 },
  { name: "tablet", w: 768, h: 1024 },
  { name: "desktop", w: 1440, h: 900 },
]
const PAGES = [
  { path: "/", name: "home" },
  { path: "/scripts", name: "scripts" },
  { path: "/props", name: "props" },
  { path: "/giveaways", name: "giveaways" },
  { path: "/script/1001", name: "script-detail" },
  { path: "/advertise", name: "advertise" },
  { path: "/cart", name: "cart" },
  { path: "/profile", name: "profile" },
  { path: "/admin", name: "admin" },
]

async function login(ctx, key) {
  const csrf = await (await ctx.request.get(`${BASE}/api/auth/csrf`)).json()
  await ctx.request.post(`${BASE}/api/auth/callback/dev-credentials`, { form: { csrfToken: csrf.csrfToken, key, json: "true", callbackUrl: BASE } })
}

async function main() {
  console.log(`\n▶ Responsive audit @ ${BASE}\n`)
  const browser = await chromium.launch()
  const issues = []

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } })
    await login(ctx, "admin")
    const page = await ctx.newPage()
    console.log(`── ${vp.name} (${vp.w}px) ──`)
    for (const p of PAGES) {
      await page.goto(`${BASE}${p.path}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(1400)
      const m = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
      }))
      const overflow = m.scrollW - m.innerW
      const bad = overflow > 2 // a couple px tolerance for sub-pixel rounding
      if (bad) issues.push({ vp: vp.name, page: p.name, overflow })
      console.log(`  ${bad ? "✗" : "✓"} ${p.name.padEnd(14)} scrollW=${m.scrollW} innerW=${m.innerW}${bad ? `  ← OVERFLOW +${overflow}px` : ""}`)
      if (vp.name === "mobile") {
        await page.screenshot({ path: `${OUT}/mobile-${p.name}.png`, fullPage: true }).catch(() => {})
      }
    }
    await ctx.close()
  }

  await browser.close()
  console.log(`\n──────── ${issues.length === 0 ? "No horizontal overflow found ✓" : issues.length + " overflow issue(s):"} ────────`)
  for (const i of issues) console.log(`  ✗ [${i.vp}] ${i.page}  +${i.overflow}px`)
  console.log(`mobile screenshots in ${OUT}/\n`)
}
main().catch((e) => { console.error("responsive audit crashed:", e); process.exit(2) })
