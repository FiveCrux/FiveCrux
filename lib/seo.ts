/** One place that decides what FiveCrux's public URLs look like.
 *
 *  Everything indexable derives from here: the sitemap, robots.txt, canonical
 *  tags, Open Graph URLs and JSON-LD. Before this each of those built its own
 *  base from `NEXTAUTH_URL`, an authentication variable, which is how a
 *  trailing slash in that value put a double slash into all 161 sitemap URLs —
 *  every one of them a 308 redirect instead of a page.
 */

/** The hostname that actually serves the site.
 *
 *  `www` is deliberate and not interchangeable with the apex. The apex
 *  (fivecrux.com) resolves but answers nothing over HTTPS, so a canonical or
 *  sitemap URL pointing there is a dead link. If the apex is ever fixed to
 *  redirect to www, this stays as it is — the canonical host should be the one
 *  that serves, not the one that forwards.
 *
 *  NEXT_PUBLIC_SITE_URL overrides it; NEXTAUTH_URL deliberately does NOT.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.fivecrux.com")
  .trim()
  .replace(/\/+$/, "")

export const SITE_NAME = "FiveCrux"

export const SITE_TITLE = "FiveCrux — Premium FiveM Assets & Giveaways"

export const SITE_DESCRIPTION =
  "Premium FiveM scripts, maps, vehicles and clothing for QBCore, ESX and QBox servers — plus community giveaways. Instant download, real support."

/** Bing Webmaster ownership token, emitted as the msvalidate.01 meta tag.
 *
 *  Kept in code rather than an env var: it proves nothing on its own — it only
 *  matches a value Bing already holds for this account — and Bing has to read
 *  it off the public page. Committing it means verification survives a fresh
 *  deploy with no dashboard step, which is exactly the failure that left Bing
 *  verified against the dead apex instead of www. The env var still wins if it
 *  is ever rotated.
 *
 *  This is an ACCOUNT-level code, not a per-site one: every property on this
 *  Bing account shares it (thecruxstudio.com carries the same value). Read from
 *  Bing's own API: GetUserSites -> AuthenticationCode.
 */
export const BING_SITE_VERIFICATION =
  process.env.BING_SITE_VERIFICATION?.trim() || "0948AF6600C9757441E3FC7EBBFF9DE8"

/** Absolute URL for a site-relative path. Collapses repeated slashes, so a
 *  caller passing "/scripts" and one passing "scripts" both come out right and
 *  no combination can reproduce the double-slash bug. */
export function canonicalUrl(path: string): string {
  const normalized = `/${String(path).replace(/^\/+/, "").replace(/\/+$/, "")}`
  return `${SITE_URL}${normalized === "/" ? "/" : normalized}`
}

/** Like canonicalUrl(), but leaves an already-absolute URL alone. Structured
 *  data needs fully-qualified image URLs, and product images may be S3 URLs
 *  already or site-relative fallbacks. */
export function absoluteUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : canonicalUrl(url)
}

/** A sub-page <title>. One helper so brand casing cannot drift page to page.
 *  The separator matches what listing pages already ship, so the site reads as
 *  one thing rather than two conventions. */
export function pageTitle(label: string): string {
  return `${label} | ${SITE_NAME}`
}

/** Search-facing name and blurb for a category page.
 *
 *  Not the same as the label in the nav. These are chosen from Bing's own
 *  keyword data for this market (US, 90 days), because the word a seller uses
 *  and the word a buyer types are often different:
 *
 *    fivem cars  2296  vs  fivem vehicles  408   (5.6x)
 *    fivem mlo(s) 1329 vs  fivem maps       81   (16x)
 *    fivem eup    212  vs  fivem clothing  165
 *
 *  So the plain word stays — nobody should have to guess what a page is — and
 *  the term people actually search goes next to it. "Assets" as a heading is
 *  worth nothing on its own: "fivem assets" draws 250 against 2082 for
 *  "fivem scripts".
 *
 *  Re-check with: scripts/seo-report.mjs's Bing client (GetKeyword).
 */
const CATEGORY_SEO: Record<string, { title: string; description: string }> = {
  maps: {
    title: "FiveM MLOs & Maps",
    description:
      "Custom FiveM MLOs and map packs — interiors, shells and full builds for QBCore, ESX and QBox roleplay servers.",
  },
  vehicles: {
    title: "FiveM Cars & Vehicles",
    description:
      "FiveM car and vehicle packs — add-on cars, emergency fleets and handling-tuned models for roleplay servers.",
  },
  clothing: {
    title: "FiveM Clothing & EUP",
    description:
      "FiveM clothing and EUP packs — civilian outfits, uniforms and accessories for QBCore, ESX and QBox servers.",
  },
  peds: {
    title: "FiveM Peds",
    description: "FiveM ped models and character packs for roleplay servers.",
  },
  weapons: {
    title: "FiveM Weapons",
    description: "FiveM weapon packs, models and attachments for roleplay servers.",
  },
  script: {
    title: "FiveM Scripts",
    description:
      "FiveM scripts — jobs, economy, garages and gameplay systems built for QBCore, ESX and QBox.",
  },
  other: {
    title: "FiveM Add-ons",
    description: "FiveM add-ons and resources that do not fit the other categories.",
  },
}

/** Title and description for a category, falling back to the slug so a new
 *  category added in the admin panel still gets a page-specific title rather
 *  than silently inheriting the homepage's. */
export function categorySeo(slug: string, label?: string) {
  const known = CATEGORY_SEO[slug]
  if (known) return known
  const name = label?.trim() || slug.replace(/-/g, " ")
  return {
    title: `FiveM ${name.charAt(0).toUpperCase()}${name.slice(1)}`,
    description: `FiveM ${name} for QBCore, ESX and QBox roleplay servers, from independent creators on ${SITE_NAME}.`,
  }
}

/** Route prefixes with no public indexing value: staff tooling and pages that
 *  only mean anything to a signed-in person. Used by robots.txt. A crawler that
 *  spends its budget on /cart is not spending it on a listing. */
export const NOINDEX_PREFIXES = [
  "/admin",
  "/profile",
  "/cart",
  "/edit-products",
  "/login",
] as const

/** Per-page Open Graph + Twitter overrides.
 *
 *  Next merges nested metadata objects wholesale from the parent, so without
 *  this every page's social preview falls back to the homepage's title and
 *  description no matter what that page's own <title> says.
 */
export function pageOpenGraph(title: string, description: string, path: string) {
  const url = canonicalUrl(path)
  return {
    alternates: { canonical: url },
    openGraph: { type: "website" as const, url, siteName: SITE_NAME, title, description },
    twitter: { card: "summary_large_image" as const, title, description },
  }
}
