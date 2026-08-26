import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { SITE_URL } from "@/lib/seo"
import { submitSitemapToIndexNow } from "@/lib/indexnow"

/**
 * Submit the sitemap to IndexNow. Runs daily on a Vercel cron (vercel.json).
 *
 * Gated: an open endpoint here lets anyone — or any bot following a shared
 * link — resubmit the whole sitemap in a loop, which is how a host gets rate
 * limited by IndexNow.
 *
 * Vercel's scheduler sends `Authorization: Bearer $CRON_SECRET`. A manual
 * `?secret=` is also accepted so the run can be triggered by hand after a big
 * content change without waiting for the next tick.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  // No secret configured means no authorised caller exists — refuse rather than
  // fall open. The previous version of this route depended on a variable that
  // was never set anywhere, so it answered 401 to everything, including itself.
  if (!secret) return false

  const bearer = request.headers.get("authorization")
  if (bearer === `Bearer ${secret}`) return true

  return request.nextUrl.searchParams.get("secret") === secret
}

async function run(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { submittedUrls, status, keyValidated } = await submitSitemapToIndexNow(SITE_URL)
    console.log(
      `[indexnow] ${submittedUrls} urls, HTTP ${status}` +
        (keyValidated ? " (key validated)" : " (queued — key not checked yet)")
    )
    return NextResponse.json({ success: true, submittedUrls, status, keyValidated })
  } catch (error) {
    console.error("[indexnow] submit failed:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    )
  }
}

export const GET = run
export const POST = run
