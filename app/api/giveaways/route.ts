import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { createGiveaway, createGiveawayRequirement, createGiveawayPrize, getGiveaways, hasRole, hasAnyRole } from "@/lib/database-new"
import { announceGiveawayPending } from "@/lib/discord"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { giveaway, requirements, prizes } = data
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // User must be authenticated
    const user = session.user as any

    // Determine approval status based on user role
    const isFounderOrAdmin = hasAnyRole(user.roles, ['founder', 'admin'])
    const approvalStatus = isFounderOrAdmin ? 'active' : 'pending'

    // Validate required fields
    if (!giveaway.title || !giveaway.description || !giveaway.total_value || !giveaway.end_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create giveaway
    const giveawayId = await createGiveaway({
      ...giveaway,
      auto_announce: true,
      creator_id: session ? String((session.user as any)?.id || "") : null,
      status: approvalStatus as any,
    })

    // Create requirements
    if (requirements && requirements.length > 0) {
      for (const requirement of requirements) {
        await createGiveawayRequirement({
          ...requirement,
          giveaway_id: giveawayId,
        })
      }
    }

    // Create prizes
    if (prizes && prizes.length > 0) {
      for (const prize of prizes) {
        await createGiveawayPrize({
          ...prize,
          giveaway_id: giveawayId,
        })
      }
    }

    // Send Discord notification for ALL giveaway creations
    try {
      await announceGiveawayPending(
        {
          id: giveawayId,
          title: giveaway.title,
          description: giveaway.description,
          totalValue: giveaway.total_value,
          endDate: giveaway.end_date,
          coverImage: giveaway.cover_image || null,
          creatorId: (session.user as any).id,
        },
        {
          id: (session.user as any).id,
          name: session.user?.name || null,
        },
        false // isUpdate = false for new submissions
      )
    } catch (discordError) {
      console.error('Failed to send Discord notification for giveaway creation:', discordError)
      // Don't fail the submission if Discord notification fails
    }

    const message = isFounderOrAdmin 
      ? "Giveaway created and approved successfully!" 
      : "Giveaway submitted successfully! It will be reviewed by an admin before going live."

    return NextResponse.json({ 
      success: true, 
      id: giveawayId, 
      message,
      status: approvalStatus 
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating giveaway:", error)
    return NextResponse.json({ error: "Failed to create giveaway" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"
    const featured = searchParams.get("featured") === "true"
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const filters = {
      status: status === "all" ? undefined : status,
      featured: featured || undefined,
      limit,
      offset,
    }

    const giveaways = await getGiveaways(filters)

    // Transform camelCase to snake_case for frontend compatibility
    const transformedGiveaways = giveaways.map((giveaway: any) => ({
      ...giveaway,
      creator_name: giveaway.creatorName,
      creator_email: giveaway.creatorEmail,
      creator_id: giveaway.creatorId,
      creator_image: giveaway.creatorImage,
      creator_roles: giveaway.creatorRoles,
      total_value: giveaway.totalValue,
      end_date: giveaway.endDate,
      max_entries: giveaway.maxEntries,
      auto_announce: giveaway.autoAnnounce,
      cover_image: giveaway.coverImage,
      entries_count: giveaway.entriesCount,
      created_at: giveaway.createdAt,
      updated_at: giveaway.updatedAt,
      approved_at: giveaway.approvedAt,
      approved_by: giveaway.approvedBy,
      admin_notes: giveaway.adminNotes,
    }))

    return NextResponse.json(transformedGiveaways)
  } catch (error) {
    console.error("Error fetching giveaways:", error)
    return NextResponse.json({ error: "Failed to fetch giveaways" }, { status: 500 })
  }
}
