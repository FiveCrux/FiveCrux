import { type NextRequest, NextResponse } from "next/server"
import { getAdsForPage } from "@/lib/database-new"

// Ads shown on the /props page (mirrors /api/ads/scripts). Surfaces ads tagged
// "props", "both", or "general".
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit")
    const limitVal = limit ? Number.parseInt(limit) : 10

    const propAds = await getAdsForPage("props", limitVal)

    const transformedAds = propAds.map((ad: any) => ({
      ...ad,
      image_url: ad.imageUrl,
      link_url: ad.linkUrl,
      created_at: ad.createdAt,
      updated_at: ad.updatedAt,
    }))

    return NextResponse.json({ ads: transformedAds })
  } catch (error: any) {
    console.error("Error fetching prop ads:", error)
    return NextResponse.json({ error: "Failed to fetch prop ads" }, { status: 500 })
  }
}
