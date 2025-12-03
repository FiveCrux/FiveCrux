import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getUserActiveFeaturedScriptSlots, createFeaturedScriptSlots, getUserFeaturedScriptSlots } from "@/lib/database-new"
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

// POST - Create new slots after PayPal one-time payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { slotsToAdd, paypalOrderIds, packageId, durationMonths } = body

    // Validation
    if (typeof slotsToAdd !== 'number' || slotsToAdd <= 0 || !Number.isInteger(slotsToAdd)) {
      return NextResponse.json({ 
        error: "Invalid slots count. Must be a positive integer" 
      }, { status: 400 })
    }

    if (!Array.isArray(paypalOrderIds) || paypalOrderIds.length !== slotsToAdd) {
      return NextResponse.json({ 
        error: "PayPal order IDs array must match slots count" 
      }, { status: 400 })
    }

    if (!paypalOrderIds.every(id => typeof id === 'string' && id.length > 0)) {
      return NextResponse.json({ 
        error: "All PayPal order IDs must be non-empty strings" 
      }, { status: 400 })
    }

    if (!packageId || !['starter', 'premium', 'executive'].includes(packageId)) {
      return NextResponse.json({ 
        error: "Invalid package ID. Must be starter, premium, or executive" 
      }, { status: 400 })
    }

    if (typeof durationMonths !== 'number' || ![1, 3, 6, 12].includes(durationMonths)) {
      return NextResponse.json({ 
        error: "Invalid duration. Must be 1, 3, 6, or 12 months" 
      }, { status: 400 })
    }

    const userId = (session.user as any).id
    
    const createdSlot = await createFeaturedScriptSlots(
      userId,
      slotsToAdd,
      paypalOrderIds,
      packageId,
      durationMonths
    );

    const activeSlots = await getUserActiveFeaturedScriptSlots(userId)
    
    return NextResponse.json({ 
      success: true, 
      activeSlots,
      slots: [createdSlot],
      message: `Successfully purchased ${slotsToAdd} featured script slot(s)` 
    })
  } catch (error) {
    console.error("Error creating featured script slots:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create featured script slots" 
    }, { status: 500 })
  }
}

