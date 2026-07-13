import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { createGiveaway, createGiveawayRequirement, createGiveawayPrize, getGiveaways } from "@/lib/database-new"
import { announceGiveawayPending } from "@/lib/discord"
import { isDiscordRequirement, resolveGuildInfo } from "@/lib/discord-verify"

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

    // Approval applies to EVERYONE (admins included): every new giveaway goes to
    // the pending queue and only appears publicly after an admin approves it.
    // (Previously admins were told "approved" but the row still sat in pending.)
    const approvalStatus = 'pending'

    // Validate required fields (guard a missing/!object `giveaway` so a bad
    // payload returns 400, not a 500 from reading .title on undefined).
    // total_value is no longer a giveaway field (prizes carry their own info).
    if (!giveaway || typeof giveaway !== "object" ||
        !giveaway.title || !giveaway.description || !giveaway.end_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create giveaway. `featured` is never trusted from the client here — there
    // is no paid/verified path for a user to buy a featured giveaway slot, so
    // it can only ever be set by an admin (see PATCH /api/giveaways/[id]).
    const giveawayId = await createGiveaway({
      ...giveaway,
      featured: false,
      auto_announce: true,
      creator_id: session ? String((session.user as any)?.id || "") : null,
      status: approvalStatus as any,
    })

    // Create one requirement row (resolving Discord server info from the invite
    // link once, cached on the row). `prizeId` is null for giveaway-level tasks
    // or the owning prize's id for per-prize tasks.
    const createReq = async (requirement: any, prizeId: number | null) => {
      let guild: Awaited<ReturnType<typeof resolveGuildInfo>> | null = null
      if (isDiscordRequirement(requirement.type)) {
        guild = await resolveGuildInfo(requirement.link || requirement.description)
      }
      await createGiveawayRequirement({
        ...requirement,
        giveaway_id: giveawayId,
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

    // Create prizes, and for each prize create its own nested requirements
    // (per-prize tasks) linked via prizeId.
    if (prizes && prizes.length > 0) {
      for (const prize of prizes) {
        const prizeId = await createGiveawayPrize({
          ...prize,
          giveaway_id: giveawayId,
        })
        const prizeReqs = Array.isArray(prize.requirements) ? prize.requirements : []
        for (const requirement of prizeReqs) await createReq(requirement, prizeId ?? null)
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

    const message = "Giveaway submitted successfully! It will be reviewed by an admin before going live."

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
      creator_discord_ids: giveaway.creatorDiscordIds,
      creator_image: giveaway.creatorImage,
      creator_roles: giveaway.creatorRoles,
      total_value: giveaway.totalValue,
      end_date: giveaway.endDate,
      start_date: giveaway.startDate || null,
      max_entries: giveaway.maxEntries,
      auto_announce: giveaway.autoAnnounce,
      cover_image: giveaway.coverImage,
      youtube_video_link: giveaway.youtubeVideoLink,
      entries_count: giveaway.entriesCount,
      created_at: giveaway.createdAt,
      updated_at: giveaway.updatedAt,
      approved_at: giveaway.approvedAt,
      approved_by: giveaway.approvedBy,
      admin_notes: giveaway.adminNotes,
      currency: giveaway.currency,
      currency_symbol: giveaway.currencySymbol,
      is_upcoming: giveaway.isUpcoming || false, // Include upcoming status
    }))

    // Cache only the default public listing at the CDN; status-filtered/paged
    // variants stay dynamic.
    const headers: Record<string, string> =
      status === "all" && offset === 0
        ? { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
        : {}
    return NextResponse.json(transformedGiveaways, { headers })
  } catch (error) {
    console.error("Error fetching giveaways:", error)
    return NextResponse.json({ error: "Failed to fetch giveaways" }, { status: 500 })
  }
}
