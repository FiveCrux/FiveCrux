import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { 
  createGiveawayEntry, 
  getGiveawayEntries, 
  getUserGiveawayEntry,
  getGiveawayById,
  updateGiveawayEntryPoints
} from "@/lib/database-new"
import { db } from "@/lib/db/client"
import { giveawayRequirements } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const giveawayId = parseInt(idParam)
    
    if (isNaN(giveawayId)) {
      return NextResponse.json({ error: "Invalid giveaway ID" }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Check if giveaway exists and is active
    const giveaway = await getGiveawayById(giveawayId, session)
    if (!giveaway) {
      return NextResponse.json({ error: "Giveaway not found" }, { status: 404 })
    }

    if (giveaway.status !== 'active') {
      return NextResponse.json({ error: "Giveaway is not active" }, { status: 400 })
    }

    // Check if giveaway has started (if it's scheduled)
    if (giveaway.startDate) {
      const now = new Date()
      const startDate = new Date(giveaway.startDate)
      if (startDate > now) {
        return NextResponse.json({ error: "This giveaway hasn't started yet" }, { status: 400 })
      }
    }

    // Check if user has already entered this giveaway
    const existingEntry = await getUserGiveawayEntry(giveawayId, (session.user as any).id)
    if (existingEntry) {
      return NextResponse.json({ error: "You have already entered this giveaway" }, { status: 400 })
    }

    // Check if giveaway has reached max entries
    if (giveaway.max_entries && giveaway.entriesCount >= giveaway.max_entries) {
      return NextResponse.json({ error: "Giveaway has reached maximum entries" }, { status: 400 })
    }

    // Get completed requirements from request body
    const { completedRequirements = [] } = await request.json().catch(() => ({}))
    
    console.log('Entry creation - completedRequirements:', completedRequirements)
    
    // Calculate points for completed requirements
    let initialPoints = 0
    let initialCompletedRequirements: string[] = []
    
    if (Array.isArray(completedRequirements) && completedRequirements.length > 0) {
      // Get requirements to calculate points
      const requirements = await db.select().from(giveawayRequirements)
        .where(eq(giveawayRequirements.giveawayId, giveawayId))
      
      console.log('Requirements for giveaway:', requirements)
      
      // Calculate total points for completed requirements
      initialPoints = requirements
        .filter(req => completedRequirements.includes(req.id))
        .reduce((sum, req) => sum + req.points, 0)
      
      initialCompletedRequirements = completedRequirements.map(id => id.toString())
      
      console.log('Calculated initial points:', initialPoints)
      console.log('Completed requirements:', initialCompletedRequirements)
    }

    // Create entry
    const entryData = {
      id: 0, // Will be overridden by createGiveawayEntry
      giveawayId: giveawayId,
      userId: (session.user as any).id,
      userName: session.user.name || null,
      userEmail: session.user.email || null,
      status: 'active' as const,
      pointsEarned: initialPoints,
      requirementsCompleted: initialCompletedRequirements
    }

    const entryId = await createGiveawayEntry(entryData)

    return NextResponse.json({ 
      success: true, 
      entryId,
      message: "Successfully entered giveaway" 
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating giveaway entry:", error)
    return NextResponse.json({ error: "Failed to enter giveaway" }, { status: 500 })
  }
}

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

    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const userOnly = searchParams.get("userOnly") === "true"

    if (userOnly) {
      if (!session?.user) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }
      
      // Get user's specific entry for this giveaway
      const userEntry = await getUserGiveawayEntry(giveawayId, (session.user as any).id)
      return NextResponse.json({ entry: userEntry })
    } else {
      // Get all entries for this giveaway (admin only)
      if (!session?.user) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }
      
      const entries = await getGiveawayEntries(giveawayId)
      return NextResponse.json({ entries })
    }

  } catch (error) {
    console.error("Error fetching giveaway entries:", error)
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const giveawayId = parseInt(idParam)
    
    if (isNaN(giveawayId)) {
      return NextResponse.json({ error: "Invalid giveaway ID" }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { completedRequirements } = body

    if (!Array.isArray(completedRequirements)) {
      return NextResponse.json({ error: "completedRequirements must be an array" }, { status: 400 })
    }

    // Check if user has entered this giveaway
    const existingEntry = await getUserGiveawayEntry(giveawayId, (session.user as any).id)
    if (!existingEntry) {
      return NextResponse.json({ error: "You must enter the giveaway first" }, { status: 400 })
    }

    // Update the entry points
    const entryId = await updateGiveawayEntryPoints(
      giveawayId, 
      (session.user as any).id, 
      completedRequirements
    )

    return NextResponse.json({ 
      success: true, 
      entryId,
      message: "Points updated successfully" 
    })

  } catch (error) {
    console.error("Error updating giveaway entry points:", error)
    return NextResponse.json({ error: "Failed to update points" }, { status: 500 })
  }
}