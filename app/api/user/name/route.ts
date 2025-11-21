import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { updateUserName } from "@/lib/database-new"

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (name === undefined || name === null) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Validate name length
    if (typeof name === "string" && name.trim().length === 0) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 })
    }

    if (typeof name === "string" && name.length > 100) {
      return NextResponse.json({ error: "Name must be 100 characters or less" }, { status: 400 })
    }

    // Update user's name in database
    const userId = (session.user as any).id
    const updatedUser = await updateUserName(userId, name?.trim() || null)

    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to update name" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      name: updatedUser.name 
    })
  } catch (error) {
    console.error("Error updating name:", error)
    return NextResponse.json({ 
      error: "Failed to update name" 
    }, { status: 500 })
  }
}

