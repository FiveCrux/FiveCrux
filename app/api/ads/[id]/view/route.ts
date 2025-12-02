import { NextRequest, NextResponse } from "next/server"
import { incrementAdViewCount, getAdById } from "@/lib/database-new"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adId = parseInt(id)
    
    console.log(`[POST /api/ads/${id}/view] Received view tracking request for ad ID: ${adId}`)
    
    if (isNaN(adId)) {
      console.error(`[POST /api/ads/${id}/view] Invalid ad ID: ${id}`)
      return NextResponse.json({ error: "Invalid ad ID" }, { status: 400 })
    }

    // Check if ad exists and is approved
    const ad = await getAdById(adId)
    if (!ad) {
      console.error(`[POST /api/ads/${id}/view] Ad not found: ${adId}`)
      return NextResponse.json({ error: "Ad not found" }, { status: 404 })
    }

    console.log(`[POST /api/ads/${id}/view] Ad found - ID: ${ad.id}, Status: ${ad.status}`)

    // Only track views for approved ads
    if (ad.status !== 'approved') {
      console.warn(`[POST /api/ads/${id}/view] Ad is not approved. Status: ${ad.status}`)
      return NextResponse.json({ error: "Ad is not approved" }, { status: 400 })
    }

    // Increment view count
    console.log(`[POST /api/ads/${id}/view] Attempting to increment view count...`)
    const success = await incrementAdViewCount(adId)
    
    if (!success) {
      console.error(`[POST /api/ads/${id}/view] Failed to increment view count`)
      return NextResponse.json({ error: "Failed to track view" }, { status: 500 })
    }

    console.log(`[POST /api/ads/${id}/view] Successfully tracked view for ad ${adId}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[POST /api/ads/[id]/view] Error tracking ad view:`, error)
    return NextResponse.json({ error: "Failed to track view" }, { status: 500 })
  }
}

