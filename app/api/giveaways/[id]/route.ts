import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getGiveawayById, updateGiveaway, updateGiveawayForReapproval, createGiveawayRequirement, createGiveawayPrize, hasAnyRole } from "@/lib/database-new"
import { db } from "@/lib/db/client"
import { eq } from "drizzle-orm"
import { giveawayRequirements, giveawayPrizes } from "@/lib/db/schema"
import { announceGiveawayPending } from "@/lib/discord"
import { isDiscordRequirement, resolveGuildInfo } from "@/lib/discord-verify"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid giveaway ID" }, { status: 400 })
    }

    const giveaway = await getGiveawayById(id)
    
    if (!giveaway) {
      return NextResponse.json({ error: "Giveaway not found" }, { status: 404 })
    }

    // Map camelCase to snake_case for frontend compatibility
    const response = {
      ...giveaway,
      youtube_video_link: (giveaway as any).youtubeVideoLink || (giveaway as any).youtube_video_link,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching giveaway:", error)
    return NextResponse.json({ error: "Failed to fetch giveaway" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid giveaway ID" }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // User must be authenticated
    const user = session.user as any

    const data = await request.json().catch(() => ({}))
    const { giveaway, requirements, prizes } = data

    // Validate required fields (total_value is no longer a giveaway field)
    if (!giveaway || typeof giveaway !== "object" || !giveaway.title || !giveaway.description || !giveaway.end_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // First, check if the giveaway is currently approved
    const currentGiveaway = await getGiveawayById(id)
    if (!currentGiveaway) {
      return NextResponse.json({ error: "Giveaway not found" }, { status: 404 })
    }

    const isAdmin = hasAnyRole(user.roles, ['admin', 'founder'])
    const isOwner = (currentGiveaway as any).creatorId === user.id
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // `featured` has no paid/verified user-facing path — only an admin can set it.
    const giveawayUpdate = { ...giveaway }
    if (!isAdmin) {
      delete giveawayUpdate.featured
    }

    // Check if giveaway needs re-approval (if it's currently approved)
    // Approved giveaways are in approvedGiveaways table, so they need re-approval
    const needsReapproval = currentGiveaway.table_source === 'approved'

    let updatedGiveaway
    let status = "updated"

    if (needsReapproval) {
      // Move from approved to pending for re-approval
      updatedGiveaway = await updateGiveawayForReapproval(id, giveawayUpdate)
      status = "pending"
    } else {
      // Regular update for pending/rejected giveaways
      updatedGiveaway = await updateGiveaway(id, {
        ...giveawayUpdate,
        updatedAt: new Date(),
      })
    }

    if (!updatedGiveaway) {
      return NextResponse.json({ error: "Giveaway not found" }, { status: 404 })
    }

    // Only replace requirements/prizes when the request actually included
    // replacements — otherwise omitting them from a partial PATCH would wipe
    // the giveaway's existing requirements/prizes. Per-prize requirements live
    // in giveawayRequirements (linked by prizeId), so recreating prizes also
    // means recreating their requirements — delete requirements whenever either
    // requirements OR prizes is being replaced.
    if (requirements !== undefined || prizes !== undefined) {
      await db.delete(giveawayRequirements).where(eq(giveawayRequirements.giveawayId, id))
    }
    if (prizes !== undefined) {
      await db.delete(giveawayPrizes).where(eq(giveawayPrizes.giveawayId, id))
    }

    const createReq = async (requirement: any, prizeId: number | null) => {
      let guild: Awaited<ReturnType<typeof resolveGuildInfo>> | null = null
      if (isDiscordRequirement(requirement.type)) {
        guild = await resolveGuildInfo(requirement.link || requirement.description)
      }
      await createGiveawayRequirement({
        ...requirement,
        giveawayId: id,
        prize_id: prizeId,
        link: requirement.link || requirement.description || null,
        guild_id: guild?.guildId ?? null,
        server_name: guild?.serverName ?? null,
        server_icon: guild?.serverIcon ?? null,
        invite_code: guild?.inviteCode ?? null,
      })
    }

    // Giveaway-level requirements (legacy / not tied to a specific prize).
    if (requirements && requirements.length > 0) {
      for (const requirement of requirements) await createReq(requirement, null)
    }

    // Create new prizes, each with its own nested requirements (per-prize tasks).
    if (prizes && prizes.length > 0) {
      for (const prize of prizes) {
        const prizeId = await createGiveawayPrize({
          ...prize,
          giveawayId: id,
        })
        const prizeReqs = Array.isArray(prize.requirements) ? prize.requirements : []
        for (const requirement of prizeReqs) await createReq(requirement, prizeId ?? null)
      }
    }

    // Send Discord notification for giveaways that need re-approval
    if (needsReapproval && updatedGiveaway.creatorId) {
      try {
        await announceGiveawayPending(
          {
            id: updatedGiveaway.id,
            title: giveaway.title || currentGiveaway.title,
            description: giveaway.description || currentGiveaway.description,
            totalValue: giveaway.total_value || currentGiveaway.totalValue,
            endDate: giveaway.end_date || currentGiveaway.endDate,
            coverImage: giveaway.cover_image || currentGiveaway.coverImage,
            creatorId: updatedGiveaway.creatorId,
          },
          {
            id: updatedGiveaway.creatorId,
            name: session.user?.name || null,
          },
          true // isUpdate = true
        )
      } catch (discordError) {
        console.error('Failed to send Discord notification for giveaway update:', discordError)
        // Don't fail the update if Discord notification fails
      }
    }

    const message = needsReapproval 
      ? "Giveaway updated successfully! It has been moved to pending status and will require admin approval before going live again."
      : "Giveaway updated successfully!"

    return NextResponse.json({ 
      success: true, 
      message,
      status,
      needsReapproval,
      giveaway: updatedGiveaway
    })
  } catch (error) {
    console.error("Error updating giveaway:", error)
    return NextResponse.json({ error: "Failed to update giveaway" }, { status: 500 })
  }
}
