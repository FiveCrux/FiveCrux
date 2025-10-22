import { type NextRequest, NextResponse } from "next/server"
import { getAdsForPage } from "@/lib/database-new"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit")

    const limitVal = limit ? Number.parseInt(limit) : 10

    // Get ads for scripts page
    const scriptAds = await getAdsForPage('scripts', limitVal)

    // Transform camelCase to snake_case for frontend compatibility
    const transformedAds = scriptAds.map((ad: any) => ({
      ...ad,
      image_url: ad.imageUrl,
      link_url: ad.linkUrl,
      created_at: ad.createdAt,
      updated_at: ad.updatedAt,
    }))

    return NextResponse.json({ ads: transformedAds })
  } catch (error: any) {
    console.error("Error fetching script ads:", error)
    return NextResponse.json({ error: "Failed to fetch script ads" }, { status: 500 })
  }
}
