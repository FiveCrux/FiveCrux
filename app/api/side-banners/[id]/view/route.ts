import { NextRequest, NextResponse } from "next/server"
import { recordAdEvent, getCountryFromHeaders } from "@/lib/ad-analytics"

// Public: fire-and-forget impression tracking for a booked side-banner slot.
// No booking lookup/validation needed — a bad id just logs an orphan event,
// which the analytics query for a real id would simply never match.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    recordAdEvent({
      adType: "side_banner",
      adId: id,
      eventType: "impression",
      referrer: request.headers.get("referer"),
      requestHost: request.headers.get("host"),
      country: getCountryFromHeaders(request.headers),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/side-banners/[id]/view error:", error)
    return NextResponse.json({ error: "Failed to track view" }, { status: 500 })
  }
}
