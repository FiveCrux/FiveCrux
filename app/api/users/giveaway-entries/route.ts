import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db/client"
import { giveawayEntries } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const entries = await db.select().from(giveawayEntries)
      .where(eq(giveawayEntries.userId, (session.user as any).id))
      .orderBy(giveawayEntries.entryDate)
    
    return NextResponse.json({ entries })
  } catch (error) {
    console.error("Error fetching user giveaway entries:", error)
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 })
  }
}

