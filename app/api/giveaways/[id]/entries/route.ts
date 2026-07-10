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
import { isDiscordRequirement, resolveGuildId, isMemberOfGuild } from "@/lib/discord-verify"

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

    // Get completed requirements + the entrant's typed Discord ID from the body
    const { completedRequirements = [], discordId } = await request.json().catch(() => ({}))

    if (!discordId || typeof discordId !== "string" || !discordId.trim()) {
      return NextResponse.json({ error: "Please enter your Discord ID to enter this giveaway" }, { status: 400 })
    }

    console.log('Entry creation - completedRequirements:', completedRequirements)
    
    // Calculate points — server-verified (C5). The client's claim is NOT trusted
    // for Discord-join requirements: those are checked against Discord (when a bot
    // token is configured). `required` tasks that aren't satisfied block entry.
    let initialPoints = 0
    const initialCompletedRequirements: string[] = []

    const requirements = await db.select().from(giveawayRequirements)
      .where(eq(giveawayRequirements.giveawayId, giveawayId))
    const claimed = new Set(
      (Array.isArray(completedRequirements) ? completedRequirements : []).map((x: any) => String(x))
    )
    // The user's Discord OAuth token (guilds scope) — set on the session at login.
    const discordAccessToken = (session as any).accessToken as string | undefined

    for (const req of requirements) {
      let satisfied = claimed.has(String(req.id))

      // Discord-join: verify membership server-side via the user's own token.
      // member===null means we couldn't verify (no/expired token, unresolved
      // guild, API issue) → fall back to the honor-system claim.
      if (isDiscordRequirement(req.type)) {
        const guildId = await resolveGuildId(req.link)
        if (discordAccessToken && guildId) {
          const member = await isMemberOfGuild(discordAccessToken, guildId)
          if (member === true) satisfied = true
          else if (member === false) satisfied = false
        }
      }

      if (satisfied) {
        initialPoints += req.points
        initialCompletedRequirements.push(String(req.id))
      } else if (req.required) {
        return NextResponse.json(
          { error: `Requirement not completed: ${req.description}` },
          { status: 400 }
        )
      }
    }

    // Create entry
    const entryData = {
      id: 0, // Will be overridden by createGiveawayEntry
      giveawayId: giveawayId,
      userId: (session.user as any).id,
      userName: session.user.name || null,
      userEmail: session.user.email || null,
      discordId: discordId.trim(),
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
      // Get all entries for this giveaway — STAFF ONLY (entrant names/emails are PII).
      if (!session?.user) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }
      const roles = (session.user as any).roles || []
      const isStaff = ["admin", "founder", "moderator"].some((r) => roles.includes(r))
      if (!isStaff) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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