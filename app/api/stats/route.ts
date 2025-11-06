import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { approvedScripts, approvedGiveaways, users } from "@/lib/db/schema"
import { eq, sql, and } from "drizzle-orm"

export async function GET() {
  try {
    // Get total approved scripts count
    const scriptsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(approvedScripts)
    const totalScripts = Number(scriptsResult[0]?.count || 0)

    // Get total users count
    const usersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
    const totalUsers = Number(usersResult[0]?.count || 0)

    // Get active giveaways count and total value
    const activeGiveaways = await db
      .select()
      .from(approvedGiveaways)
      .where(eq(approvedGiveaways.status, "active"))
    
    const totalGiveaways = activeGiveaways.length
    const totalGiveawayValue = activeGiveaways.reduce((sum, g) => {
      // Extract numeric value from total_value string (e.g., "$500" -> 500)
      const valueStr = g.totalValue.replace(/[^0-9.]/g, "")
      const value = parseFloat(valueStr) || 0
      return sum + value
    }, 0)

    // Get script counts per category
    const categoryCountsResult = await db
      .select({
        category: approvedScripts.category,
        count: sql<number>`count(*)`,
      })
      .from(approvedScripts)
      .groupBy(approvedScripts.category)

    // Ensure categoryCounts has lowercase keys for all categories
    const normalizedCategoryCounts: Record<string, number> = {}
    categoryCountsResult.forEach((row) => {
      if (row.category) {
        normalizedCategoryCounts[row.category.toLowerCase()] = Number(row.count || 0)
      }
    })

    // Get unique seller count (developers)
    const sellersResult = await db
      .select({ count: sql<number>`count(distinct ${approvedScripts.sellerId})` })
      .from(approvedScripts)
      .where(sql`${approvedScripts.sellerId} IS NOT NULL`)
    const totalDevelopers = Number(sellersResult[0]?.count || 0)

    return NextResponse.json({
      totalScripts,
      totalUsers,
      totalGiveaways,
      totalGiveawayValue,
      totalDevelopers,
      categoryCounts: normalizedCategoryCounts,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}

