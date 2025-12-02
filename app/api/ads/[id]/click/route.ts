import { NextRequest, NextResponse } from "next/server"
import { incrementAdClickCount, getAdById } from "@/lib/database-new"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adId = parseInt(id)
    
    console.log(`[POST /api/ads/${id}/click] Received click tracking request for ad ID: ${adId}`)
    
    if (isNaN(adId)) {
      console.error(`[POST /api/ads/${id}/click] Invalid ad ID: ${id}`)
      return NextResponse.json({ error: "Invalid ad ID" }, { status: 400 })
    }

    // Check if ad exists and is approved
    const ad = await getAdById(adId)
    if (!ad) {
      console.error(`[POST /api/ads/${id}/click] Ad not found: ${adId}`)
      return NextResponse.json({ error: "Ad not found" }, { status: 404 })
    }

    console.log(`[POST /api/ads/${id}/click] Ad found - ID: ${ad.id}, Status: ${ad.status}`)

    // Only track clicks for approved ads
    if (ad.status !== 'approved') {
      console.warn(`[POST /api/ads/${id}/click] Ad is not approved. Status: ${ad.status}`)
      return NextResponse.json({ error: "Ad is not approved" }, { status: 400 })
    }

    // Increment click count
    console.log(`[POST /api/ads/${id}/click] Attempting to increment click count...`)
    const success = await incrementAdClickCount(adId)
    
    if (!success) {
      console.error(`[POST /api/ads/${id}/click] Failed to increment click count`)
      return NextResponse.json({ error: "Failed to track click" }, { status: 500 })
    }

    console.log(`[POST /api/ads/${id}/click] Successfully tracked click for ad ${adId}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[POST /api/ads/[id]/click] Error tracking ad click:`, error)
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 })
  }
}


