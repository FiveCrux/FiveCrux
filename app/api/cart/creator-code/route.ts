import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq } from "drizzle-orm"

import { authOptions } from "@/auth"
import { db } from "@/lib/db/client"
import { carts } from "@/lib/db/schema"
import { validateCreatorCode } from "@/lib/creator-code-utils"

async function getActiveCart(userId: string) {
  const cart = await db.query.carts.findFirst({
    where: and(eq(carts.userId, userId), eq(carts.status, "active")),
    with: { items: true },
  })

  if (!cart || cart.items.length === 0) {
    return { error: "Cart empty" }
  }

  return {
    total: cart.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const body = await request.json().catch(() => ({}))
    const code = typeof body.creatorCode === "string" ? body.creatorCode.trim().toUpperCase() : ""

    if (!code) {
      return NextResponse.json({ error: "Creator code is required" }, { status: 400 })
    }

    const cart = await getActiveCart(userId)
    if ("error" in cart) {
      return NextResponse.json({ error: cart.error }, { status: 400 })
    }

    const result = await validateCreatorCode(code, userId, cart.total)
    if (!result) {
      return NextResponse.json({ error: "Creator code is required" }, { status: 400 })
    }
    if ("error" in result) {
      const status = result.error === "Invalid creator code" ? 404 : 400
      return NextResponse.json({ error: result.error }, { status })
    }

    const payableAmount = Math.max(0, cart.total - result.discountAmount)

    return NextResponse.json({
      success: true,
      creatorCode: {
        id: result.creatorCode.id,
        code: result.creatorCode.code,
        discountAmount: result.discountAmount,
      },
      totalAmount: cart.total,
      payableAmount,
    })
  } catch (error) {
    console.error("Creator code validation error:", error)
    return NextResponse.json({ error: "Failed to validate creator code" }, { status: 500 })
  }
}
