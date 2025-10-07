import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getGiveawayById, updateGiveaway, updateGiveawayForReapproval, createGiveawayRequirement, createGiveawayPrize, hasAnyRole } from "@/lib/database-new"
import { db } from "@/lib/db/client"
import { eq } from "drizzle-orm"
import { giveawayRequirements, giveawayPrizes } from "@/lib/db/schema"

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

    return NextResponse.json(giveaway)
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to edit giveaways (founder, admin, verified_creator)
    const user = session.user as any
    if (!user.roles || !hasAnyRole(user.roles, ['founder', 'admin', 'verified_creator'])) {
      return NextResponse.json({ 
        error: "You need founder, admin, or verified creator access to edit giveaways." 
      }, { status: 403 })
    }

    const data = await request.json()
    const { giveaway, requirements, prizes } = data

    // Validate required fields
    if (!giveaway.title || !giveaway.description || !giveaway.total_value || !giveaway.end_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // First, check if the giveaway is currently approved
    const currentGiveaway = await getGiveawayById(id)
    if (!currentGiveaway) {
      return NextResponse.json({ error: "Giveaway not found" }, { status: 404 })
    }

    // Check if giveaway needs re-approval (if it's currently approved)
    const needsReapproval = currentGiveaway.status === 'approved'

    let updatedGiveaway
    let status = "updated"

    if (needsReapproval) {
      // Move from approved to pending for re-approval
      updatedGiveaway = await updateGiveawayForReapproval(id, giveaway)
      status = "pending"
    } else {
      // Regular update for pending/rejected giveaways
      updatedGiveaway = await updateGiveaway(id, {
        ...giveaway,
        updatedAt: new Date(),
      })
    }

    if (!updatedGiveaway) {
      return NextResponse.json({ error: "Giveaway not found" }, { status: 404 })
    }

    // Delete existing requirements and prizes
    await db.delete(giveawayRequirements).where(eq(giveawayRequirements.giveawayId, id))
    await db.delete(giveawayPrizes).where(eq(giveawayPrizes.giveawayId, id))

    // Create new requirements
    if (requirements && requirements.length > 0) {
      for (const requirement of requirements) {
        await createGiveawayRequirement({
          ...requirement,
          giveawayId: id,
        })
      }
    }

    // Create new prizes
    if (prizes && prizes.length > 0) {
      for (const prize of prizes) {
        await createGiveawayPrize({
          ...prize,
          giveawayId: id,
        })
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
