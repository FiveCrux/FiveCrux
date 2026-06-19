import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { updateUserRole } from "@/lib/database-new"

export async function POST(request: NextRequest) {
  try {
    // SECURITY: this endpoint grants the FOUNDER role — it must require an
    // existing founder/admin session. (Previously unauthenticated: anyone could
    // POST {userId} and promote any account to founder.)
    const session = await getServerSession(authOptions)
    const roles = (session?.user as any)?.roles || []
    if (!session?.user || !(roles.includes("founder") || roles.includes("admin"))) {
      return NextResponse.json({ error: "Founder or admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    console.log(`Setting user ${userId} as founder...`)
    
    const result = await updateUserRole(userId, ['founder'])
    
    if (result) {
      console.log('✅ User set as founder successfully!')
      return NextResponse.json({ 
        success: true,
        message: "User set as founder successfully",
        user: {
          id: result.id,
          username: result.username,
          roles: result.roles
        }
      })
    } else {
      console.log('❌ User not found')
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
  } catch (error) {
    console.error('❌ Error setting user as founder:', error)
    return NextResponse.json({ error: "Failed to set user as founder" }, { status: 500 })
  }
}
