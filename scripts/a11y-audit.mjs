// Accessibility audit — runs axe-core (WCAG 2.1 A/AA) over key pages via Playwright.
// axe-core is the engine behind Lighthouse / Deque / Accessibility Insights.
//   node scripts/a11y-audit.mjs   (dev server running on :3000)
import { chromium } from "playwright"
import { AxeBuilder } from "@axe-core/playwright"

const BASE = process.env.BASE || "http://localhost:3000"
const PAGES = [
  { path: "/", name: "home", auth: false },
  { path: "/scripts", name: "scripts", auth: false },
  { path: "/script/1001", name: "script-detail", auth: false },
  { path: "/giveaways", name: "giveaways", auth: false },
  { path: "/advertise", name: "advertise", auth: false },
  { path: "/cart", name: "cart", auth: true },
  { path: "/profile", name: "profile", auth: true },
]

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  // dev login (admin) so authed pages render
  const csrf = await (await ctx.request.get(`${BASE}/api/auth/csrf`)).json()
  await ctx.request.post(`${BASE}/api/auth/callback/dev-credentials`, { form: { csrfToken: csrf.csrfToken, key: "admin", json: "true", callbackUrl: BASE } })
  const page = await ctx.newPage()

  const totals = { critical: 0, serious: 0, moderate: 0, minor: 0 }
  const byRule = new Map()

  console.log(`\n▶ Accessibility audit (axe-core, WCAG 2.1 AA) @ ${BASE}\n`)
  for (const p of PAGES) {
    await page.goto(`${BASE}${p.path}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(2500)
    let results
    try {
      results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    } catch (e) {
      console.log(`  ${p.name.padEnd(14)} (skipped: ${e.message})`); continue
    }
    const v = results.violations
    const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 }
    for (const x of v) {
      counts[x.impact] = (counts[x.impact] || 0) + 1
      totals[x.impact] = (totals[x.impact] || 0) + 1
      const cur = byRule.get(x.id) || { impact: x.impact, help: x.help, count: 0, pages: new Set() }
      cur.count += x.nodes.length; cur.pages.add(p.name); byRule.set(x.id, cur)
    }
    const tag = v.length === 0 ? "✓ clean" : `${v.length} rule(s): C${counts.critical} S${counts.serious} M${counts.moderate} m${counts.minor}`
    console.log(`  ${v.length === 0 ? "✓" : "✗"} ${p.name.padEnd(14)} ${tag}`)
  }

  console.log(`\n──────── Totals: ${totals.critical} critical · ${totals.serious} serious · ${totals.moderate} moderate · ${totals.minor} minor ────────`)
  if (byRule.size) {
    console.log("\nTop issues (rule → impact · occurrences · pages):")
    const sorted = [...byRule.entries()].sort((a, b) => b[1].count - a[1].count)
    for (const [id, info] of sorted.slice(0, 12)) {
      console.log(`  • [${info.impact}] ${id}: ${info.help} — ${info.count}x on ${[...info.pages].join(", ")}`)
    }
  }
  await browser.close()
}
main().catch((e) => { console.error("a11y audit crashed:", e); process.exit(2) })
