import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getUserGiveawayEntries } from "@/lib/database-new"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const entries = await getUserGiveawayEntries((session.user as any).id as string)
    
    return NextResponse.json({ entries })
  } catch (error) {
    console.error("Error fetching user giveaway entries:", error)
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 })
  }
}

