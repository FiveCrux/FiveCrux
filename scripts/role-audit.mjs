// Per-role capability audit. Logs in as a dev role and probes a matrix of
// endpoints, printing allow/deny so we can see what each role can actually do.
//   node scripts/role-audit.mjs <role>      role = admin|founder|moderator|creator|buyer|guest
const BASE = process.env.BASE || "http://localhost:3000"
const role = process.argv[2] || "buyer"

function makeJar() {
  const m = new Map()
  return {
    h: () => [...m].map(([k, v]) => `${k}=${v}`).join("; "),
    a: (r) => {
      for (const c of (r.headers.getSetCookie?.() || [])) {
        const [p] = c.split(";")
        const i = p.indexOf("=")
        const k = p.slice(0, i).trim()
        const v = p.slice(i + 1).trim()
        if (v && v !== "deleted") m.set(k, v)
        else m.delete(k)
      }
    },
  }
}
async function f(j, p, o = {}) {
  const r = await fetch(BASE + p, { ...o, redirect: "manual", headers: { ...(o.headers || {}), cookie: j.h() } })
  j.a(r)
  return r
}
async function login(j, key) {
  if (key === "guest") return
  const d = await (await f(j, "/api/auth/csrf")).json()
  await f(j, "/api/auth/callback/dev-credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken: d.csrfToken, key, json: "true", callbackUrl: BASE }).toString(),
  })
}
const J = (o) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) })

async function main() {
  const j = makeJar()
  await login(j, role)
  const s = await (await f(j, "/api/auth/session")).json().catch(() => ({}))
  console.log(`\n▶ Role audit: "${role}"  → session roles: ${JSON.stringify(s?.user?.roles ?? null)}\n`)

  const checks = [
    ["GET  /api/cart                       (own cart)", "/api/cart", {}],
    ["POST /api/cart/add prop              (buy)", "/api/cart/add", J({ itemType: "prop", itemId: "prop-1001", title: "x", price: "1" })],
    ["POST /api/scripts                    (submit script)", "/api/scripts", J({ title: "t", description: "d", price: 1, category: "scripts", framework: ["esx"] })],
    ["POST /api/props                      (list prop = prop_lister)", "/api/props", J({ name: "n", description: "d", price: "1", zipFile: "z" })],
    ["POST /api/giveaways                  (create giveaway)", "/api/giveaways", J({ title: "g", description: "d", totalValue: "1", endDate: "2027-01-01" })],
    ["GET  /api/admin/scripts              (admin-only)", "/api/admin/scripts?status=pending", {}],
    ["GET  /api/admin/ads                  (staff)", "/api/admin/ads", {}],
    ["PATCH/api/admin/users/dev-buyer/roles(role mgmt)", "/api/admin/users/dev-buyer/roles", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ roles: ["user"] }) }],
    ["POST /api/coupons                    (coupons = admin/founder)", "/api/coupons", J({ code: "X", discountType: "percentage", discountValue: "5", scope: "all" })],
    ["POST /api/giveaways/3001/trigger-winner-selection", "/api/giveaways/3001/trigger-winner-selection", J({})],
    ["GET  /admin                          (page)", "/admin", {}],
  ]
  for (const [label, path, opts] of checks) {
    const r = await f(j, path, opts)
    const mark = r.status < 400 ? "✓ allow" : (r.status === 401 || r.status === 403 ? "✗ deny " : "· " + r.status)
    console.log(`  ${String(r.status).padEnd(3)} ${mark}  ${label}`)
  }
  console.log("")
}
main().catch((e) => { console.error("role-audit crashed:", e.message); process.exit(2) })
