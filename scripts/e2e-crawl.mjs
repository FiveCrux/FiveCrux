// Headless Chromium crawl: visits key pages at multiple viewports, records
// console errors / uncaught page errors / 5xx responses, checks for horizontal
// overflow (responsiveness), and clicks visible buttons to try to break things.
// Robust: every step is wrapped so one failure never aborts the run.
//   node scripts/e2e-crawl.mjs   (dev server running + seeded)
import { chromium } from "playwright"
import { mkdirSync } from "fs"

const BASE = process.env.BASE || "http://localhost:3000"
const OUT = "mockups/_audit/crawl"
try { mkdirSync(OUT, { recursive: true }) } catch {}

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
]
// role: which dev user to log in as for this page (admin sees the most surface).
const PAGES = [
  { path: "/", role: "buyer" },
  { path: "/scripts", role: "buyer" },
  { path: "/props", role: "buyer" },
  { path: "/giveaways", role: "buyer" },
  { path: "/advertise", role: "buyer" },
  { path: "/cart", role: "buyer" },
  { path: "/script/1001", role: "buyer" },
  { path: "/prop/prop-1001", role: "buyer" },
  { path: "/giveaway/3001", role: "buyer" },
  { path: "/profile", role: "creator" },
  { path: "/admin", role: "admin" },
]

const findings = { consoleErrors: [], pageErrors: [], serverErrors: [], overflow: [], clickErrors: [], navErrors: [] }

async function login(ctx, key) {
  try {
    const csrf = await (await ctx.request.get(`${BASE}/api/auth/csrf`)).json()
    await ctx.request.post(`${BASE}/api/auth/callback/dev-credentials`, {
      form: { csrfToken: csrf.csrfToken, key, json: "true", callbackUrl: BASE },
    })
  } catch (e) { /* ignore */ }
}

// Noise we don't care about (next dev HMR, favicon, common 3rd-party warnings).
const ignore = (t) => /favicon|hot-update|_next\/static|HMR|Download the React DevTools|webpack-hmr|net::ERR_ABORTED/i.test(t)

async function crawlPage(ctx, vp, { path, role }) {
  const tag = `${vp.name}${path.replace(/\//g, "_") || "_home"}`
  const page = await ctx.newPage()
  const local = { console: [], pageerr: [], server: [] }
  page.on("console", (m) => { if (m.type() === "error" && !ignore(m.text())) local.console.push(m.text().slice(0, 200)) })
  page.on("pageerror", (e) => { if (!ignore(String(e))) local.pageerr.push(String(e).slice(0, 200)) })
  page.on("response", (r) => { if (r.status() >= 500) local.server.push(`${r.status()} ${r.url().replace(BASE, "")}`) })

  try {
    const resp = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30000 })
    if (resp && resp.status() >= 500) findings.navErrors.push(`${path} → ${resp.status()}`)
  } catch (e) {
    findings.navErrors.push(`${path} [${vp.name}] nav: ${String(e).slice(0, 100)}`)
  }
  await page.waitForTimeout(800)

  // Responsiveness: horizontal overflow is the classic mobile-break.
  try {
    const ov = await page.evaluate(() => {
      const de = document.documentElement
      const over = de.scrollWidth - de.clientWidth
      // find the widest offending element for a hint
      let worst = null, worstW = de.clientWidth
      for (const el of Array.from(document.querySelectorAll("body *"))) {
        const r = el.getBoundingClientRect()
        if (r.right > worstW + 2 && r.width > 0) { worst = el.tagName + (el.className ? "." + String(el.className).split(" ")[0] : ""); worstW = r.right }
      }
      return { over, worst: over > 2 ? worst : null }
    })
    if (ov.over > 2) findings.overflow.push(`${path} [${vp.name}] overflow ${ov.over}px (widest: ${ov.worst})`)
  } catch {}

  try { await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: false }) } catch {}

  // Only click on desktop (clicking at every viewport triples time + risk).
  if (vp.name === "desktop") {
    let buttons = []
    try { buttons = await page.$$("button:visible") } catch {}
    const N = Math.min(buttons.length, 12)
    for (let i = 0; i < N; i++) {
      try {
        const btns = await page.$$("button:visible")
        if (!btns[i]) continue
        const label = (await btns[i].innerText().catch(() => "")).slice(0, 30)
        if (/log\s?out|sign\s?out|delete|remove/i.test(label)) continue // skip destructive
        const before = local.pageerr.length + local.console.length
        await btns[i].click({ timeout: 2000 }).catch(() => {})
        await page.waitForTimeout(250)
        if (local.pageerr.length + local.console.length > before) {
          findings.clickErrors.push(`${path} button "${label}" → new error`)
        }
        // reset if click navigated away
        if (!page.url().includes(path) && path !== "/") {
          await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {})
        }
      } catch {}
    }
  }

  if (local.console.length) findings.consoleErrors.push(`${path} [${vp.name}]: ${[...new Set(local.console)].slice(0, 3).join(" | ")}`)
  if (local.pageerr.length) findings.pageErrors.push(`${path} [${vp.name}]: ${[...new Set(local.pageerr)].slice(0, 3).join(" | ")}`)
  if (local.server.length) findings.serverErrors.push(`${path} [${vp.name}]: ${[...new Set(local.server)].slice(0, 3).join(" | ")}`)

  await page.close()
}

async function main() {
  console.log(`\n▶ Crawl @ ${BASE}\n`)
  const browser = await chromium.launch()
  for (const vp of VIEWPORTS) {
    console.log(`— viewport ${vp.name} (${vp.width}px) —`)
    for (const role of ["buyer", "creator", "admin"]) {
      const pagesForRole = PAGES.filter((p) => p.role === role)
      if (!pagesForRole.length) continue
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      await login(ctx, role)
      for (const pg of pagesForRole) {
        process.stdout.write(`   ${pg.path} … `)
        await crawlPage(ctx, vp, pg)
        console.log("done")
      }
      await ctx.close()
    }
  }
  await browser.close()

  const sec = (title, arr) => { console.log(`\n## ${title}: ${arr.length}`); arr.slice(0, 25).forEach((x) => console.log(`   - ${x}`)) }
  console.log("\n════════ CRAWL REPORT ════════")
  sec("Nav failures", findings.navErrors)
  sec("Server 5xx", findings.serverErrors)
  sec("Uncaught page errors", findings.pageErrors)
  sec("Console errors", findings.consoleErrors)
  sec("Responsive overflow", findings.overflow)
  sec("Click-triggered errors", findings.clickErrors)
  const total = Object.values(findings).reduce((s, a) => s + a.length, 0)
  console.log(`\nTOTAL ISSUES: ${total}  (screenshots → ${OUT}/)`)
  process.exit(0)
}
main().catch((e) => { console.error("crawl crashed:", e); process.exit(2) })
