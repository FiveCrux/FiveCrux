// Server-side fetch of the data every page's Navbar + SideAdsFrame need, done
// ONCE per route-group layout instead of once per page-load client round-trip.
// IMPORTANT: this runs inside a layout that wraps EVERY page in the route
// group, so an uncached (`no-store`) fetch here would poison ISR for every
// single page under it (forces the whole subtree to render dynamically
// per-request instead of statically) — always cache both, just with
// different tolerances.
// Categories change rarely, so a full 60s window is fine. Side-banner
// bookings can flip (sold/expired) at any moment, and the client immediately
// re-fetches the always-fresh /api/side-banners on mount to correct this
// server-rendered snapshot — a 60s window meant a slot could render as
// "available" for up to a minute before flashing to "sold" 1-2s later. Keep
// the ISR safety net but shrink that window to 5s so the flash is effectively
// gone in practice.
async function getBaseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000"
}

export async function getSharedNavData() {
  const base = await getBaseUrl()

  const [categoriesRes, sideBannersRes] = await Promise.allSettled([
    fetch(`${base}/api/categories`, { next: { revalidate: 60 } }),
    fetch(`${base}/api/side-banners`, { next: { revalidate: 5 } }),
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
