import { NextRequest, NextResponse } from 'next/server'
import { getRelatedGiveaways } from '@/lib/database-new'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const giveawayId = parseInt(idParam)
    
    if (isNaN(giveawayId)) {
      return NextResponse.json({ error: "Invalid giveaway ID" }, { status: 400 })
    }

    const relatedGiveaways = await getRelatedGiveaways(giveawayId, 3)
    
    return NextResponse.json({ 
      success: true, 
      relatedGiveaways 
    })

  } catch (error) {
    console.error("Error fetching related giveaways:", error)
    return NextResponse.json({ error: "Failed to fetch related giveaways" }, { status: 500 })
  }
}
