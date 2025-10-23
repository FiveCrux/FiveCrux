import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db/client"
import { giveawayEntries, approvedGiveaways, pendingGiveaways } from "@/lib/db/schema"
import { eq, inArray, sql } from "drizzle-orm"

// Get all entries for giveaways created by the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get pagination params from query string
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const creatorId = (session.user as any).id

    console.log('Creator entries API - Params:', { creatorId, limit, offset });

    // Use a single optimized query with SQL to get entries and giveaway details in one go
    // This reduces the number of database connections needed
    const entriesWithGiveaways = await db.execute(sql`
      SELECT 
        ge.id,
        ge.giveaway_id,
        ge.user_id,
        ge.user_name,
        ge.user_email,
        ge.entry_date,
        ge.status,
        ge.points_earned,
        ge.requirements_completed,
        COALESCE(ag.title, pg.title) as giveaway_title,
        COALESCE(ag.cover_image, pg.cover_image) as giveaway_cover
      FROM giveaway_entries ge
      LEFT JOIN approved_giveaways ag ON ge.giveaway_id = ag.id AND ag.creator_id = ${creatorId}
      LEFT JOIN pending_giveaways pg ON ge.giveaway_id = pg.id AND pg.creator_id = ${creatorId}
      WHERE ag.id IS NOT NULL OR pg.id IS NOT NULL
      ORDER BY ge.entry_date DESC
    `)

    // Handle different possible result structures
    const rows = (entriesWithGiveaways as any)?.rows || (entriesWithGiveaways as any) || []
    
    console.log('Creator entries - Result structure:', {
      hasRows: !!(entriesWithGiveaways as any)?.rows,
      isArray: Array.isArray(rows),
      count: Array.isArray(rows) ? rows.length : 0
    })
    
    // Transform the results to match the expected format
    const enrichedEntries = Array.isArray(rows) ? rows.map((row: any) => ({
      id: row.id,
      giveaway_id: row.giveaway_id,
      giveaway_title: row.giveaway_title || 'Unknown Giveaway',
      giveaway_cover: row.giveaway_cover || null,
      user_id: row.user_id,
      user_name: row.user_name,
      user_email: row.user_email,
      entry_date: row.entry_date,
      status: row.status,
      points_earned: row.points_earned,
      requirements_completed: row.requirements_completed,
    })) : []
    
    // Sort by entry date (newest first)
    enrichedEntries.sort((a, b) => {
      const dateA = new Date(a.entry_date).getTime();
      const dateB = new Date(b.entry_date).getTime();
      return dateB - dateA;
    });

    // Apply pagination
    const total = enrichedEntries.length;
    const paginatedEntries = enrichedEntries.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    console.log('Creator entries - Returning:', { total, returned: paginatedEntries.length, hasMore });
    return NextResponse.json({ 
      entries: paginatedEntries,
      total,
      hasMore
    })
  } catch (error) {
    console.error("Error fetching creator giveaway entries:", error)
    // Return empty array on error to prevent frontend from breaking
    return NextResponse.json({ 
      entries: [], 
      error: "Failed to fetch entries. Please try again later." 
    }, { status: 200 })
  }
}

