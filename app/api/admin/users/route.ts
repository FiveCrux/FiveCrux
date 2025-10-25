import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getAllUsers } from "@/lib/database-new"

export async function GET(request: NextRequest) {
  try {
    console.log("Admin users API called")
    const session = await getServerSession(authOptions)
    console.log("Session:", session ? "exists" : "none")
    
    if (!session) {
      console.log("No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const user = session.user as any
    console.log("User roles:", user.roles)
    
    if (!user.roles || (!user.roles.includes('admin') && !user.roles.includes('founder'))) {
      console.log("User is not admin or founder")
      return NextResponse.json({ error: "Admin or founder access required" }, { status: 403 })
    }

    console.log("User is admin, fetching users...")
    // Get limit and offset from query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    
    // Get all users using the database function (fetch limit + 1 to check if there are more)
    const users = await getAllUsers(limit + 1)
    
    // Apply offset manually
    const paginatedUsers = users.slice(offset, offset + limit)
    const hasMore = users.length > offset + limit
    
    console.log("Found users:", paginatedUsers.length, "Has more:", hasMore)
    
    return NextResponse.json({ users: paginatedUsers, hasMore })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}


