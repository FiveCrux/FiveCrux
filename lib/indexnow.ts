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
): Promise<{ submittedUrls: number; status: number; keyValidated: boolean }> {
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

  // 200 and 202 both mean "accepted", but they are NOT the same and the
  // difference is easy to lose:
  //
  //   200 — the key was fetched and checked, right now. Genuinely done.
  //   202 — queued; the key has NOT been checked yet. A wrong key also returns
  //         202 (verified against the live API), so treating 202 as proof of
  //         success would hide a broken key indefinitely — there is no second
  //         callback to tell you it failed.
  //   422 — rejected outright: wrong host, or a URL not on this host.
  //
  // 202 is still a real submission, so it is not an error; it is reported so a
  // run that never reaches 200 is visible instead of silently reassuring.
  if (!res.ok && res.status !== 202) {
    throw new Error(`IndexNow submit failed: ${res.status} ${(await res.text()).slice(0, 200)}`)
  }

  return { submittedUrls: urlList.length, status: res.status, keyValidated: res.status === 200 }
}
