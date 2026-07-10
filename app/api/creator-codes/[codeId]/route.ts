import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq } from "drizzle-orm"

import { authOptions } from "@/auth"
import { db } from "@/lib/db/client"
import { creatorCodes } from "@/lib/db/schema"
import { hasRole } from "@/lib/database-new"
import { canManageCreatorCodes } from "@/lib/creator-code-access"

const validDiscountTypes = ["Percentage", "Amount"] as const

async function hasAccess(session: any) {
  const user = session?.user as any
  return canManageCreatorCodes(user?.id, user?.roles)
}

function isAdmin(session: any) {
  const roles = (session?.user as any)?.roles || []
  return hasRole(roles, "admin") || hasRole(roles, "founder")
}

// A plain creator may only touch their OWN codes; admins/founders can touch any.
function scopeWhere(session: any, id: number) {
  const user = session.user as any
  return isAdmin(session)
    ? eq(creatorCodes.id, id)
    : and(eq(creatorCodes.id, id), eq(creatorCodes.createdBy, user.id))
}

function parseId(codeId: string) {
  const id = Number(codeId)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ codeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!(await hasAccess(session))) {
      return NextResponse.json({ error: "Creator code access required" }, { status: 403 })
    }

    const { codeId } = await params
    const id = parseId(codeId)
    if (!id) return NextResponse.json({ error: "Invalid creator code id" }, { status: 400 })

    const body = await request.json()
    const discountType = body.discountType
    const discountValue = Number(body.discountValue)
    const commissionType = body.commissionType
    const commissionValue = Number(body.commissionValue)
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true

    if (!validDiscountTypes.includes(discountType)) {
      return NextResponse.json({ error: "Invalid discount type" }, { status: 400 })
    }
    if (!validDiscountTypes.includes(commissionType)) {
      return NextResponse.json({ error: "Invalid commission type" }, { status: 400 })
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: "Discount value must be greater than 0" }, { status: 400 })
    }
    if (!Number.isFinite(commissionValue) || commissionValue <= 0) {
      return NextResponse.json({ error: "Commission value must be greater than 0" }, { status: 400 })
    }
    if (discountType === "Percentage" && commissionType === "Percentage" && discountValue + commissionValue > 100) {
      return NextResponse.json({ error: "Discount % + commission % cannot exceed 100%" }, { status: 400 })
    }

    const [updated] = await db.update(creatorCodes)
      .set({
        discountType,
        discountValue: discountValue.toString(),
        commissionType,
        commissionValue: commissionValue.toString(),
        currencySymbol: (discountType === "Amount" || commissionType === "Amount") ? (body.currencySymbol || "$") : null,
        isActive,
        updatedAt: new Date(),
      })
      .where(scopeWhere(session, id))
      .returning()

    if (!updated) return NextResponse.json({ error: "Creator code not found" }, { status: 404 })
    return NextResponse.json({ success: true, creatorCode: updated })
  } catch (error) {
    console.error("Error updating creator code:", error)
    return NextResponse.json({ error: "Failed to update creator code" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ codeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!(await hasAccess(session))) {
      return NextResponse.json({ error: "Creator code access required" }, { status: 403 })
    }

    const { codeId } = await params
    const id = parseId(codeId)
    if (!id) return NextResponse.json({ error: "Invalid creator code id" }, { status: 400 })

    const [deleted] = await db.delete(creatorCodes)
      .where(scopeWhere(session, id))
      .returning({ id: creatorCodes.id })

    if (!deleted) return NextResponse.json({ error: "Creator code not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting creator code:", error)
    return NextResponse.json({ error: "Failed to delete creator code" }, { status: 500 })
  }
}
