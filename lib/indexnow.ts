/** IndexNow — tell Bing (and Yandex, and the IndexNow-consuming AI crawlers)
 *  that pages changed, instead of waiting for them to come back on their own.
 *
 *  A new marketplace has almost no crawl budget: Bing decides how often to
 *  return based on how often it has found something new, which is a slow loop
 *  to start from zero. IndexNow short-circuits it.
 */

/** Committed rather than kept in an env var. It is not a secret: IndexNow's
 *  whole verification model is that the same value is readable at
 *  /{key}.txt on the site, which is what proves the submitter controls the
 *  host. Keeping it here means the key file and the submitted key cannot drift
 *  apart, and a fresh deploy needs no dashboard step. */
export const INDEXNOW_KEY = "0dcb8ed3c6433c9cb2dfcbead081743f"

/**
 * Read the live sitemap and submit every URL in it.
 *
 * Deliberately sitemap-driven rather than per-page: the sitemap is already the
 * definition of what is public and worth indexing, so there is one list to keep
 * right instead of two, and a page that should not be indexed cannot be
 * submitted by accident.
 */
export async function submitSitemapToIndexNow(
  siteUrl: string
): Promise<{ submittedUrls: number }> {
  const host = new URL(siteUrl).host

  const sitemapRes = await fetch(`${siteUrl}/sitemap.xml`, { cache: "no-store" })
  if (!sitemapRes.ok) throw new Error(`Failed to fetch sitemap: ${sitemapRes.status}`)

  const urlList = [...(await sitemapRes.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])
  if (urlList.length === 0) throw new Error("No <loc> entries found in sitemap.xml")

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: INDEXNOW_KEY,
      keyLocation: `${siteUrl}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
  })

  // IndexNow answers 200 or 202 on success; 422 means the key or host did not
  // check out, which is worth failing loudly rather than logging as "sent".
  if (!res.ok && res.status !== 202) {
    throw new Error(`IndexNow submit failed: ${res.status} ${(await res.text()).slice(0, 200)}`)
  }

  return { submittedUrls: urlList.length }
}
