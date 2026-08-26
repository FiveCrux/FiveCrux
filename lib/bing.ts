/** Bing Webmaster Tools API — the read side.
 *
 *  Everything FiveCrux does for search (the sitemap, the ownership meta tag,
 *  IndexNow) was unmeasurable from here: the only way to see whether any of it
 *  landed was to open Bing's dashboard by hand. This is the instrument.
 *  `npm run seo:bing` prints what Bing actually holds.
 *
 *  BING_API_KEY is a Bing Webmaster ACCOUNT key (dashboard → Settings → API
 *  access). It reaches every site on the account, so it is a real secret and
 *  lives only in the environment — unlike the IndexNow key and the ownership
 *  token, which are public by design.
 */

const BASE = "https://ssl.bing.com/webmaster/api.svc/json"

export function bingApiKey(): string | null {
  return (process.env.BING_API_KEY || "").trim() || null
}

export type BingSite = {
  Url: string
  IsVerified: boolean
  AuthenticationCode: string
  DnsVerificationCode: string
}

export type BingFeed = {
  Url: string
  Type: string
  Status: string
  UrlCount: number
  LastCrawled: string
  Submitted: string
}

export type BingQuota = { DailyQuota: number; MonthlyQuota: number }

/** Bing serialises dates as `/Date(1756228800000)/`. */
export function parseBingDate(value: string | null | undefined): Date | null {
  const ms = /\/Date\((\d+)/.exec(String(value ?? ""))?.[1]
  return ms ? new Date(Number(ms)) : null
}

export class BingApiError extends Error {
  constructor(
    readonly endpoint: string,
    readonly code: number | string,
    message: string
  ) {
    super(`${endpoint}: ${message}`)
    this.name = "BingApiError"
  }
}

/**
 * Call one Bing Webmaster endpoint.
 *
 * Bing answers a REJECTED call with HTTP 200 and an `ErrorCode` in the body, so
 * checking `res.ok` alone reports success on failure. Both shapes are handled.
 */
async function call<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const key = bingApiKey()
  if (!key) throw new BingApiError(endpoint, "no-key", "BING_API_KEY is not set")

  const url = new URL(`${BASE}/${endpoint}`)
  url.searchParams.set("apikey", key)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url, { cache: "no-store" })
  const text = await res.text()

  if (!res.ok) throw new BingApiError(endpoint, res.status, text.slice(0, 200))

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    throw new BingApiError(endpoint, "bad-json", text.slice(0, 200))
  }

  const err = body as { ErrorCode?: number; Message?: string }
  if (err?.ErrorCode) throw new BingApiError(endpoint, err.ErrorCode, err.Message ?? "unknown")

  return (body as { d: T }).d
}

export const getUserSites = () => call<BingSite[]>("GetUserSites")
export const getFeeds = (siteUrl: string) => call<BingFeed[]>("GetFeeds", { siteUrl })
export const getUrlSubmissionQuota = (siteUrl: string) =>
  call<BingQuota>("GetUrlSubmissionQuota", { siteUrl })

/** Impressions and clicks per day. Empty until Bing has actually served the site. */
export const getRankAndTrafficStats = (siteUrl: string) =>
  call<Array<Record<string, unknown>>>("GetRankAndTrafficStats", { siteUrl })

/** The queries Bing showed the site for. Empty until there are impressions. */
export const getQueryStats = (siteUrl: string) =>
  call<Array<Record<string, unknown>>>("GetQueryStats", { siteUrl })

export const getCrawlStats = (siteUrl: string) =>
  call<Array<Record<string, unknown>>>("GetCrawlStats", { siteUrl })

export const getCrawlIssues = (siteUrl: string) =>
  call<Array<Record<string, unknown>>>("GetCrawlIssues", { siteUrl })

export const submitFeed = (siteUrl: string, feedUrl: string) =>
  call<unknown>("SubmitFeed", { siteUrl, feedUrl })

/** Remove a submitted sitemap — used to drop a feed for a hostname that is not
 *  the canonical one, which otherwise reads as a second copy of the catalogue. */
export const removeFeed = (siteUrl: string, feedUrl: string) =>
  call<unknown>("RemoveFeed", { siteUrl, feedUrl })
