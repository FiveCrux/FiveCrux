import { type NextRequest, NextResponse } from "next/server"
import { incrementFeaturedScriptClickCount } from "@/lib/database-new"

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

    console.log(`[POST /api/featured-scripts/${id}/click] Tracking click for featured script ID: ${featuredScriptId}`)

    const success = await incrementFeaturedScriptClickCount(featuredScriptId)
    
    if (!success) {
      console.error(`[POST /api/featured-scripts/${id}/click] Failed to increment click count`)
      return NextResponse.json({ error: "Failed to track click" }, { status: 500 })
    }

    console.log(`[POST /api/featured-scripts/${id}/click] Successfully tracked click`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[POST /api/featured-scripts/[id]/click] Error tracking click:`, error)
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 })
  }
}
