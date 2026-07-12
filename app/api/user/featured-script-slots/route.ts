import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getUserActiveFeaturedScriptSlots, getUserFeaturedScriptSlots } from "@/lib/database-new"
import { featuredScripts } from "@/lib/db/schema"
import { db } from "@/lib/db/client"
import { isNotNull } from "drizzle-orm"

// GET - Fetch user's active featured script slots count and available slot unique IDs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const activeSlotsCount = await getUserActiveFeaturedScriptSlots(userId)
    
    // Get all active slots with their unique IDs
    const allSlots = await getUserFeaturedScriptSlots(userId)
    
    // Get all unique IDs that are already used in featured scripts
    const usedFeaturedScriptsList = await db
      .select({ featuredSlotUniqueId: featuredScripts.featuredSlotUniqueId })
      .from(featuredScripts)
      .where(isNotNull(featuredScripts.featuredSlotUniqueId))
    
    const usedUniqueIds = new Set<string>()
    usedFeaturedScriptsList.forEach((fs: { featuredSlotUniqueId: string | null }) => {
      if (fs.featuredSlotUniqueId) usedUniqueIds.add(fs.featuredSlotUniqueId)
    })
    
    // Extract all available unique IDs from active slots, filtering out used ones
    const availableUniqueIds: string[] = []
    for (const slot of allSlots) {
      if (slot.featuredSlotStatus === 'active' && slot.featuredSlotUniqueIds) {
        const uniqueIds = (slot.featuredSlotUniqueIds || []) as string[]
        uniqueIds.forEach(id => {
          if (!usedUniqueIds.has(id)) {
            availableUniqueIds.push(id)
          }
        })
      }
    }
    
    return NextResponse.json({ 
      activeSlots: activeSlotsCount,
      availableUniqueIds
    })
  } catch (error) {
    console.error("Error fetching featured script slots:", error)
    return NextResponse.json({ 
      error: "Failed to fetch featured script slots",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// POST removed (SECURITY): this endpoint let ANY logged-in user create real
// featured-script slots by POSTing arbitrary orderRefIds/packageId/duration —
// nothing verified a real, paid Tebex order existed for them. Provisioning now
// happens exclusively via the Tebex webhook (app/api/tebex/webhook/route.ts),
// which is the only place that has actually confirmed payment. No legitimate
// frontend caller used this POST (profile page only GETs this route).

