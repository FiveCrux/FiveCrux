// Guard for CT-74: the cart and account controls must stay on screen no matter
// how many categories an admin adds.
//
// Categories are admin-managed and the desktop nav renders one link each, so
// the row's width is not something the code controls. With no shrink and no
// overflow it pushed the controls past the right edge of the viewport — at
// 1440px that took 19 categories with a few long names.
//
// Runs against a LOCAL server; it creates categories and deletes them again.
//
//   node scripts/check-navbar-overflow.mjs

import { chromium } from "playwright"

const B = process.env.UAT_BASE || "http://localhost:50003"
const WIDTHS = [1280, 1440, 1680]

const NAMES = [
  "Emergency Service Vehicles", "Interiors and Shells", "Character Clothing Packs",
  "Animations", "Textures", "Bundles", "Liveries", "Sounds", "Interiors",
]

async function admin() {
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
    body: new URLSearchParams({ csrfToken, key: "admin", json: "true", callbackUrl: B }).toString(),
  }); absorb(r)
  return { hdr }
}

const { hdr } = await admin()
const made = []
let order = 60
for (const name of NAMES) {
  const res = await fetch(`${B}/api/admin/categories`, {
    method: "POST",
    headers: { cookie: hdr(), "content-type": "application/json" },
    body: JSON.stringify({
      name, slug: `navguard-${order}`, icon: "Tag", appliesTo: "scripts",
      isActive: true, showOnHome: true, homeOrder: order, sortOrder: order,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (body?.category?.id) made.push(body.category.id)
  order++
}

const total = (await (await fetch(`${B}/api/categories`)).json()).categories.length
console.log(`\n▶ Navbar overflow guard — ${total} categories\n`)

let failures = 0
const br = await chromium.launch()
for (const width of WIDTHS) {
  const pg = await (await br.newContext({ viewport: { width, height: 900 } })).newPage()
  await pg.goto(`${B}/`, { waitUntil: "domcontentloaded", timeout: 180000 })
  await pg.waitForTimeout(12000)

  const r = await pg.evaluate(() => {
    const nav = document.querySelector("nav")
    if (!nav) return { skip: true }
    const bar = nav.parentElement
    const controls = bar.lastElementChild.getBoundingClientRect()
    const navBox = nav.getBoundingClientRect()
    return {
      controlsOffscreen: controls.right > window.innerWidth + 1,
      controlsOverlapped: navBox.right > controls.left + 1,
      docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    }
  })

  if (r.skip) { console.log(`  ${width}px  (no desktop nav at this width)`); await pg.context().close(); continue }
  const ok = !r.controlsOffscreen && !r.controlsOverlapped && !r.docOverflow
  if (!ok) failures++
  console.log(
    `  ${ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${width}px  ` +
    `controls offscreen=${r.controlsOffscreen}  overlapped=${r.controlsOverlapped}  page overflow=${r.docOverflow}`
  )
  await pg.context().close()
}
await br.close()

for (const id of made) {
  await fetch(`${B}/api/admin/categories/${id}`, { method: "DELETE", headers: { cookie: hdr() } })
}
console.log(`  (cleaned up ${made.length} test categories)`)

console.log(failures === 0 ? "\n\x1b[32mPASS\x1b[0m\n" : `\n\x1b[31mFAIL\x1b[0m — ${failures} width(s)\n`)
process.exit(failures === 0 ? 0 : 1)
