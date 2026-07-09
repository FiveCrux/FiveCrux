import { NextRequest, NextResponse } from "next/server"
import { recordAdEvent, getCountryFromHeaders } from "@/lib/ad-analytics"

// Public: fire-and-forget click tracking for a booked side-banner slot.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    recordAdEvent({
      adType: "side_banner",
      adId: id,
      eventType: "click",
      referrer: request.headers.get("referer"),
      requestHost: request.headers.get("host"),
      country: getCountryFromHeaders(request.headers),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/side-banners/[id]/click error:", error)
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 })
  }
}
