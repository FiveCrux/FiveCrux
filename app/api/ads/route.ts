import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getAds, hasRole, hasAnyRole, createAd } from "@/lib/database-new"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to create ads (founder, admin, moderator, verified_creator)
    const user = session.user as any
    if (!user.roles || !hasAnyRole(user.roles, ['founder', 'admin', 'moderator', 'verified_creator'])) {
      return NextResponse.json({ 
        error: "You need founder, admin, moderator, or verified creator access to create ads." 
      }, { status: 403 })
    }

    // Determine approval status based on user role
    const isFounderOrAdmin = hasAnyRole(user.roles, ['founder', 'admin'])
    const approvalStatus = isFounderOrAdmin ? 'active' : 'pending'

    // Validate required fields
    const requiredFields = ["title", "description", "category"]
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Validate category
    const validCategories = ["both", "scripts", "giveaways"]
    if (!validCategories.includes(body.category.toLowerCase())) {
      return NextResponse.json({ 
        error: `Invalid category. Must be one of: ${validCategories.join(", ")}` 
      }, { status: 400 })
    }

    // Create the ad in the database
    const adId = await createAd({
      title: body.title,
      description: body.description,
      image_url: body.image_url || null,
      link_url: body.link_url || null,
      category: body.category,
      status: approvalStatus,
      priority: body.priority || 1,
      start_date: body.start_date || new Date().toISOString(),
      end_date: body.end_date || null,
      created_by: String((session.user as any)?.id || ""),
    })

    const message = isFounderOrAdmin 
      ? "Ad created and approved successfully!" 
      : "Ad submitted successfully! It will be reviewed by an admin before going live."

    return NextResponse.json(
      {
        success: true,
        message,
        // adId,
        status: approvalStatus,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating ad:", error)
    return NextResponse.json({ error: "Failed to create ad" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const category = searchParams.get("category")
    const limit = searchParams.get("limit")

    const filters = {
      status: status || undefined,
      category: category || undefined,
      limit: limit ? Number.parseInt(limit) : undefined,
    }

    const ads = await getAds(filters)
    return NextResponse.json({ ads })
  } catch (error: any) {
    console.error("Error fetching ads:", error)
    
    // Handle specific database connection errors
    if (error.message?.includes('XATA_CONCURRENCY_LIMIT') || error.cause?.code === 'XATA_CONCURRENCY_LIMIT') {
      return NextResponse.json({ 
        error: "Database is temporarily overloaded. Please try again in a few seconds." 
      }, { status: 503 })
    }
    
    return NextResponse.json({ error: "Failed to fetch ads" }, { status: 500 })
  }
}

