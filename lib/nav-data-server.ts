// Server-side fetch of the data every page's Navbar + SideAdsFrame need, done
// ONCE per route-group layout instead of once per page-load client round-trip.
// Both are ISR-cached (60s) — same tolerance every other page already has for
// its own data. IMPORTANT: this runs inside a layout that wraps EVERY page in
// the route group, so an uncached (`no-store`) fetch here would poison ISR
// for every single page under it (forces the whole subtree to render
// dynamically per-request instead of statically) — always cache this one.
// Live slot *availability* (used only during actual booking on /advertise)
// is fetched separately, directly, and stays real-time; this is just "what's
// showing right now," which 60s staleness is fine for.
async function getBaseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000"
}

export async function getSharedNavData() {
  const base = await getBaseUrl()

  const [categoriesRes, sideBannersRes] = await Promise.allSettled([
    fetch(`${base}/api/categories`, { next: { revalidate: 60 } }),
    fetch(`${base}/api/side-banners`, { next: { revalidate: 60 } }),
  ])

  let categories: any[] | null = null
  if (categoriesRes.status === "fulfilled" && categoriesRes.value.ok) {
    const data = await categoriesRes.value.json().catch(() => null)
    categories = Array.isArray(data?.categories) ? data.categories : null
  }

  let sideBannersActive: Record<string, any> | null = null
  if (sideBannersRes.status === "fulfilled" && sideBannersRes.value.ok) {
    const data = await sideBannersRes.value.json().catch(() => null)
    sideBannersActive = data?.active ?? null
  }

  return { categories, sideBannersActive }
}
