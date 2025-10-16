import { type NextRequest, NextResponse } from "next/server"
import { getAdsForPage } from "@/lib/database-new"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageType = searchParams.get("type") || "scripts"
    const limit = searchParams.get("limit")

    const ads = await getAdsForPage(pageType as 'scripts' | 'giveaways', limit ? Number.parseInt(limit) : undefined)
    return NextResponse.json({ ads })
  } catch (error: any) {
    console.error("Error fetching promotions:", error)
    
    // Handle specific database connection errors
    if (error.message?.includes('XATA_CONCURRENCY_LIMIT') || error.cause?.code === 'XATA_CONCURRENCY_LIMIT') {
      return NextResponse.json({ 
        error: "Database is temporarily overloaded. Please try again in a few seconds." 
      }, { status: 503 })
    }
    
    return NextResponse.json({ error: "Failed to fetch promotions" }, { status: 500 })
  }
}




