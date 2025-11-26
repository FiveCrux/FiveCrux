import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getUserActiveAdSlots, createAdSlots, getUserAdSlots } from "@/lib/database-new"
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

    // Validate all order IDs are strings
    if (!paypalOrderIds.every(id => typeof id === 'string' && id.length > 0)) {
      return NextResponse.json({ 
        error: "All PayPal order IDs must be non-empty strings" 
      }, { status: 400 })
    }

    // Validate package ID
    if (!packageId || !['starter', 'premium', 'executive'].includes(packageId)) {
      return NextResponse.json({ 
        error: "Invalid package ID. Must be starter, premium, or executive" 
      }, { status: 400 })
    }

    // Validate duration
    if (typeof durationMonths !== 'number' || ![1, 3, 6, 12].includes(durationMonths)) {
      return NextResponse.json({ 
        error: "Invalid duration. Must be 1, 3, 6, or 12 months" 
      }, { status: 400 })
    }

    const userId = (session.user as any).id
    
    // Create a single slot row with all slot unique IDs in slotNumber array
    // endDate will be calculated as purchaseDate + durationMonths
    const createdSlot = await createAdSlots(
      userId,
      slotsToAdd,
      paypalOrderIds,
      packageId,
      durationMonths
    );

    const activeSlots = await getUserActiveAdSlots(userId)
    
    return NextResponse.json({ 
      success: true, 
      activeSlots,
      slots: [createdSlot], // Wrap in array for backward compatibility
      message: `Successfully purchased ${slotsToAdd} ad slot(s)` 
    })
  } catch (error) {
    console.error("Error creating ad slots:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create ad slots" 
    }, { status: 500 })
  }
}

