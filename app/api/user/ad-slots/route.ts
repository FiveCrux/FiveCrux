import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getUserActiveAdSlots, getUserAdSlots } from "@/lib/database-new"
import { pendingAds, approvedAds } from "@/lib/db/schema"
import { db } from "@/lib/db/client"
import { isNotNull } from "drizzle-orm"

// GET - Fetch user's active ad slots count and available slot unique IDs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const activeSlotsCount = await getUserActiveAdSlots(userId)
    
    // Get all active slots with their unique IDs
    const allSlots = await getUserAdSlots(userId)
    
    // Get all unique IDs that are already used in pending or approved ads
    const [pendingAdsList, approvedAdsList] = await Promise.all([
      db.select({ slotUniqueId: pendingAds.slotUniqueId }).from(pendingAds).where(isNotNull(pendingAds.slotUniqueId)),
      db.select({ slotUniqueId: approvedAds.slotUniqueId }).from(approvedAds).where(isNotNull(approvedAds.slotUniqueId))
    ])
    
    const usedUniqueIds = new Set<string>()
    pendingAdsList.forEach((ad: { slotUniqueId: string | null }) => {
      if (ad.slotUniqueId) usedUniqueIds.add(ad.slotUniqueId)
    })
    approvedAdsList.forEach((ad: { slotUniqueId: string | null }) => {
      if (ad.slotUniqueId) usedUniqueIds.add(ad.slotUniqueId)
    })
    
    // Extract all available unique IDs from active slots, filtering out used ones
    const availableUniqueIds: string[] = []
    for (const slot of allSlots) {
      if (slot.status === 'active' && slot.slotUniqueIds) {
        const uniqueIds = (slot.slotUniqueIds || []) as string[]
        // Only add unique IDs that are not already used
        uniqueIds.forEach(id => {
          if (!usedUniqueIds.has(id)) {
            availableUniqueIds.push(id)
          }
        })
      }
    }
    
    return NextResponse.json({ 
      activeSlots: activeSlotsCount,
      availableUniqueIds // Array of all available slot unique IDs
    })
  } catch (error) {
    console.error("Error fetching ad slots:", error)
    return NextResponse.json({ 
      error: "Failed to fetch ad slots",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// POST removed (SECURITY): this endpoint let ANY logged-in user create real ad
// slots by POSTing arbitrary orderRefIds/packageId/duration — nothing verified
// a real, paid Tebex order existed for them. Provisioning now happens
// exclusively via the Tebex webhook (app/api/tebex/webhook/route.ts), which is
// the only place that has actually confirmed payment. No legitimate frontend
// caller used this POST (profile page only GETs this route).

