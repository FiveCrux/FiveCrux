// Disabled-state guard for the "disable advertiser flows" change
// (.hudson/specs/disable-advertiser-flows.md). Asserts BOTH directions:
//   A) every paid advertising surface refuses (410 / 404 / no markup)
//   B) the marketplace (scripts/props/giveaways/cart, seller checkout inputs)
//      is completely unaffected — this half matters most, since a check that
//      only proves ads are off would pass even if selling broke too.
//
// Run with the local PGlite dev server up:
//   npm run dev:local                      (separate terminal)
//   node scripts/check-ads-disabled.mjs    (this script)
//
// Never point BASE at anything but localhost — this hits real POST/PATCH/DELETE
// routes and must never run against production.
const BASE = process.env.BASE || "http://localhost:3000"

let pass = 0, fail = 0
function check(name, cond, extra = "") {
  if (cond) { console.log(`  ✓ ${name}`); pass++ }
  else { console.log(`  ✗ ${name} ${extra}`); fail++ }
}

function makeJar() {
  const jar = new Map()
  return {
    header: () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    absorb: (res) => {
      for (const c of (res.headers.getSetCookie?.() || [])) {
        const [pair] = c.split(";")
        const i = pair.indexOf("=")
        const k = pair.slice(0, i).trim()
        const v = pair.slice(i + 1).trim()
        if (!v || v === "deleted") jar.delete(k); else jar.set(k, v)
      }
    },
  }
}
async function jfetch(jar, path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    redirect: "manual",
    headers: { ...(opts.headers || {}), cookie: jar?.header() || "" },
  })
  jar?.absorb(res)
  return res
}
async function devLogin(jar, key) {
  const { csrfToken } = await (await jfetch(jar, "/api/auth/csrf")).json()
  await jfetch(jar, "/api/auth/callback/dev-credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, key, json: "true", callbackUrl: BASE }).toString(),
  })
  return (await (await jfetch(jar, "/api/auth/session")).json())
}
const J = (o) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) })

async function main() {
  console.log(`\n▶ Ads-disabled guard @ ${BASE}\n`)

  const buyer = makeJar()
  const buyerSess = await devLogin(buyer, "buyer")
  check("dev login as buyer works (harness precondition)", !!buyerSess?.user, JSON.stringify(buyerSess))

  const admin = makeJar()
  const adminSess = await devLogin(admin, "admin")
  check("dev login as admin works (harness precondition)", !!adminSess?.user?.roles?.includes("admin"), JSON.stringify(adminSess))

  // ============================================================
  // A. ADVERTISING IS OFF
  // ============================================================
  console.log("\nA) Paid ad endpoints refuse (expect 410)")

  const is410 = (res) => res.status === 410

  const checkoutRes = await jfetch(buyer, "/api/side-banners/checkout", J({ position: "left-top", durationWeeks: 1 }))
  check("POST /api/side-banners/checkout -> 410", is410(checkoutRes), `status=${checkoutRes.status}`)

  const continueRes = await jfetch(buyer, "/api/side-banners/continue?ident=x&booking=1&weeks=1")
  check("GET /api/side-banners/continue -> 410", is410(continueRes), `status=${continueRes.status}`)

  const packagesRes = await jfetch(buyer, "/api/side-banners/packages")
  check("GET /api/side-banners/packages -> 410", is410(packagesRes), `status=${packagesRes.status}`)

  const pricingRes = await jfetch(buyer, "/api/advertise/pricing")
  check("GET /api/advertise/pricing -> 410", is410(pricingRes), `status=${pricingRes.status}`)

  const sideBannerPatchRes = await jfetch(buyer, "/api/side-banners/1", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "x" }) })
  check("PATCH /api/side-banners/[id] -> 410", is410(sideBannerPatchRes), `status=${sideBannerPatchRes.status}`)

  const adsPostRes = await jfetch(buyer, "/api/ads", J({ title: "x", description: "x", category: "scripts" }))
  check("POST /api/ads -> 410", is410(adsPostRes), `status=${adsPostRes.status}`)

  const userAdsPostRes = await jfetch(buyer, "/api/users/advertisements", J({ slot_unique_id: "x" }))
  check("POST /api/users/advertisements -> 410", is410(userAdsPostRes), `status=${userAdsPostRes.status}`)
  const userAdsPatchRes = await jfetch(buyer, "/api/users/advertisements", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ adId: 1 }) })
  check("PATCH /api/users/advertisements -> 410", is410(userAdsPatchRes), `status=${userAdsPatchRes.status}`)
  const userAdsDeleteRes = await jfetch(buyer, "/api/users/advertisements?id=1", { method: "DELETE" })
  check("DELETE /api/users/advertisements -> 410", is410(userAdsDeleteRes), `status=${userAdsDeleteRes.status}`)

  const featuredScriptsPostRes = await jfetch(buyer, "/api/users/featured-scripts", J({ slot_unique_id: "x" }))
  check("POST /api/users/featured-scripts -> 410", is410(featuredScriptsPostRes), `status=${featuredScriptsPostRes.status}`)
  const featuredScriptsDeleteRes = await jfetch(buyer, "/api/users/featured-scripts?id=1", { method: "DELETE" })
  check("DELETE /api/users/featured-scripts -> 410", is410(featuredScriptsDeleteRes), `status=${featuredScriptsDeleteRes.status}`)

  // Admin identity: /api/admin/* is gated by middleware.ts before the route
  // handler runs, so a non-staff caller gets 403 there, not the route's own
  // 410. Use an admin session to reach the handler itself.
  const adminAdsRes = await jfetch(admin, "/api/admin/ads")
  check("GET /api/admin/ads -> 410 (as admin)", is410(adminAdsRes), `status=${adminAdsRes.status}`)
  const adminAdvertisementsRes = await jfetch(admin, "/api/admin/advertisements")
  check("GET /api/admin/advertisements -> 410 (as admin)", is410(adminAdvertisementsRes), `status=${adminAdvertisementsRes.status}`)

  console.log("\nA2) Shared routes refuse ONLY the ad branch")

  const platformBasketAdsRes = await jfetch(buyer, "/api/tebex/platform-basket", J({ packageType: "ads", packageId: "starter", duration: 1 }))
  check("POST /api/tebex/platform-basket packageType=ads -> 410", is410(platformBasketAdsRes), `status=${platformBasketAdsRes.status}`)

  const platformBasketFeaturedRes = await jfetch(buyer, "/api/tebex/platform-basket", J({ packageType: "featured-scripts", packageId: "starter", duration: 1 }))
  check("POST /api/tebex/platform-basket packageType=featured-scripts -> 410", is410(platformBasketFeaturedRes), `status=${platformBasketFeaturedRes.status}`)

  const cartAddAdSlotRes = await jfetch(buyer, "/api/cart/add", J({
    itemType: "subscription",
    itemId: "ads:executive:8",
    title: "Ad Slots - Executive",
    metadata: { packageType: "ads", couponScope: "Ad Slots", packageId: "executive", durationWeeks: 8 },
  }))
  check("POST /api/cart/add ad-slot subscription item -> 410", is410(cartAddAdSlotRes), `status=${cartAddAdSlotRes.status}`)

  console.log("\nA3) Entry points removed")

  const advertisePageRes = await jfetch(buyer, "/advertise")
  check("GET /advertise -> 404", advertisePageRes.status === 404, `status=${advertisePageRes.status}`)

  const footerHtml = await (await jfetch(buyer, "/")).text()
  check("No 'Advertise' link in footer/home HTML", !/href="\/advertise"/i.test(footerHtml) && !/>\s*Advertise\s*</i.test(footerHtml))

  // Only flags text/markup in actual rendered DOM elements, not the escaped
  // RSC flight-data payload (a script-tag JSON blob every page ships for
  // hydration, which harmlessly still contains the site-content copy).
  function hasRenderedText(html, needle) {
    const tagStripped = html.replace(/<script[\s\S]*?<\/script>/gi, "")
    return tagStripped.toLowerCase().includes(needle.toLowerCase())
  }

  for (const path of ["/", "/scripts", "/props", "/giveaways"]) {
    const html = await (await jfetch(buyer, path)).text()
    const hasAdMarkup =
      /data-ad-card|adcard|side-ads-frame/i.test(html) ||
      hasRenderedText(html, "Advertise here") ||
      hasRenderedText(html, "Get Featured")
    check(`No ad/rail markup on ${path}`, !hasAdMarkup)
  }

  // ============================================================
  // B. EVERYTHING ELSE STILL WORKS -- the regression half
  // ============================================================
  console.log("\nB) Regression guard -- marketplace unaffected")

  // Props are Tebex-driven (live catalog, not the local seed DB) — the prop id
  // must be a real Tebex package id, so fetch one from the live /api/props list
  // rather than using a seeded fixture id.
  const propsListRes = await jfetch(buyer, "/api/props")
  const propsListBody = await propsListRes.json().catch(() => ({}))
  const realProp = (propsListBody.props || [])[0]
  check("A real Tebex-backed prop is available to test cart/add with", !!realProp?.id, JSON.stringify(propsListBody).slice(0, 200))

  const cartAddPropRes = await jfetch(buyer, "/api/cart/add", J({
    itemType: "prop",
    itemId: realProp?.id ?? "prop-1001",
    title: realProp?.name ?? "test prop",
  }))
  const cartAddPropBody = await cartAddPropRes.json().catch(() => ({}))
  check(
    "POST /api/cart/add still accepts a prop item (MOST IMPORTANT)",
    cartAddPropRes.status === 200 && cartAddPropBody?.success === true,
    `status=${cartAddPropRes.status} body=${JSON.stringify(cartAddPropBody)}`
  )

  const platformBasketOtherRes = await jfetch(buyer, "/api/tebex/platform-basket", J({ packageType: "sidebanner", packageId: "slot", duration: 1 }))
  check(
    "POST /api/tebex/platform-basket non-ad packageType is NOT a 410 ad-refusal",
    platformBasketOtherRes.status !== 410,
    `status=${platformBasketOtherRes.status} (any other status, e.g. 400/500, is fine here)`
  )

  const sideBannersGetRes = await jfetch(buyer, "/api/side-banners")
  check("GET /api/side-banners responds (not 404/500)", sideBannersGetRes.status !== 404 && sideBannersGetRes.status !== 500, `status=${sideBannersGetRes.status}`)

  const adViewRes = await jfetch(buyer, "/api/ads/6001/view", { method: "POST" })
  // AD-KEEP-2 is "must not 500". The ad seed rows are gone (FR-17a), so a probe
  // id has no row and 404 is the correct answer — same as featured-scripts below.
  check("POST /api/ads/[id]/view does not 500", adViewRes.status !== 500, `status=${adViewRes.status}`)
  const adClickRes = await jfetch(buyer, "/api/ads/6001/click", { method: "POST" })
  check("POST /api/ads/[id]/click does not 500", adClickRes.status !== 500, `status=${adClickRes.status}`)
  const sideBannerViewRes = await jfetch(buyer, "/api/side-banners/1/view", { method: "POST" })
  check("POST /api/side-banners/[id]/view responds (not 404/500)", sideBannerViewRes.status !== 404 && sideBannerViewRes.status !== 500, `status=${sideBannerViewRes.status}`)
  const sideBannerClickRes = await jfetch(buyer, "/api/side-banners/1/click", { method: "POST" })
  check("POST /api/side-banners/[id]/click responds (not 404/500)", sideBannerClickRes.status !== 404 && sideBannerClickRes.status !== 500, `status=${sideBannerClickRes.status}`)
  const featuredScriptViewRes = await jfetch(buyer, "/api/featured-scripts/1/view", { method: "POST" })
  // AD-KEEP-2 is "must not 500". The featured_scripts seed rows are gone (FR-17a),
  // so a probe id has no row — 404 is the correct answer, matching /api/ads/[id]/view.
  check("POST /api/featured-scripts/[id]/view does not 500", featuredScriptViewRes.status !== 500, `status=${featuredScriptViewRes.status}`)
  const featuredScriptClickRes = await jfetch(buyer, "/api/featured-scripts/1/click", { method: "POST" })
  check("POST /api/featured-scripts/[id]/click does not 500", featuredScriptClickRes.status !== 500, `status=${featuredScriptClickRes.status}`)

  const scriptsApiRes = await jfetch(buyer, "/api/scripts")
  check("GET /api/scripts responds 200", scriptsApiRes.status === 200, `status=${scriptsApiRes.status}`)
  const propsApiRes = await jfetch(buyer, "/api/props")
  check("GET /api/props responds", propsApiRes.status !== 404 && propsApiRes.status !== 500, `status=${propsApiRes.status}`)
  const giveawaysApiRes = await jfetch(buyer, "/api/giveaways")
  check("GET /api/giveaways responds", giveawaysApiRes.status !== 404 && giveawaysApiRes.status !== 500, `status=${giveawaysApiRes.status}`)

  for (const path of ["/", "/scripts", "/props", "/giveaways"]) {
    const res = await jfetch(buyer, path)
    check(`Public page ${path} renders (200)`, res.status === 200, `status=${res.status}`)
  }

  console.log(`\n──────── RESULT: ${pass} passed, ${fail} failed ────────\n`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error("check crashed:", e); process.exit(2) })
