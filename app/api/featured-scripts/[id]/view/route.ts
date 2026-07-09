import { type NextRequest, NextResponse } from "next/server"
import { incrementFeaturedScriptViewCount } from "@/lib/database-new"
import { recordAdEvent, getCountryFromHeaders } from "@/lib/ad-analytics"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const featuredScriptId = parseInt(id)
    
    if (isNaN(featuredScriptId)) {
      return NextResponse.json({ error: "Invalid featured script ID" }, { status: 400 })
    }

    console.log(`[POST /api/featured-scripts/${id}/view] Tracking view for featured script ID: ${featuredScriptId}`)

    const success = await incrementFeaturedScriptViewCount(featuredScriptId)
    
    if (!success) {
      console.error(`[POST /api/featured-scripts/${id}/view] Failed to increment view count`)
      return NextResponse.json({ error: "Failed to track view" }, { status: 500 })
    }

    console.log(`[POST /api/featured-scripts/${id}/view] Successfully tracked view`)

    recordAdEvent({
      adType: "featured_script",
      adId: featuredScriptId,
      eventType: "impression",
      referrer: request.headers.get("referer"),
      requestHost: request.headers.get("host"),
      country: getCountryFromHeaders(request.headers),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[POST /api/featured-scripts/[id]/view] Error tracking view:`, error)
    return NextResponse.json({ error: "Failed to track view" }, { status: 500 })
  }
}
