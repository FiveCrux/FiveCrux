import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { createScript, getScripts, hasRole, hasAnyRole } from "@/lib/database-new"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to create scripts (founder, admin, verified_creator)
    const user = session.user as any
    if (!user.roles || !hasAnyRole(user.roles, ['founder', 'admin', 'verified_creator'])) {
      return NextResponse.json({ 
        error: "You need founder, admin, or verified creator access to submit scripts." 
      }, { status: 403 })
    }

    // Determine approval status based on user role
    const isFounderOrAdmin = hasAnyRole(user.roles, ['founder', 'admin'])
    const approvalStatus = isFounderOrAdmin ? 'approved' : 'pending'

    // Validate required fields (derive seller fields from session)
    const requiredFields = ["title", "description", "price", "category", "framework"]
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Create the script in the database
    const scriptId = await createScript({
      title: body.title,
      description: body.description,
      price: body.price,
      originalPrice: body.original_price || null,
      category: body.category,
      // Accept both single string and array; normalized in DB layer
      framework: body.framework,
      seller_name: session.user?.name || "Unknown Seller",
      seller_email: session.user?.email || "",
      sellerId: (session.user as any).id,
      tags: body.tags || [],
      features: body.features || [],
      requirements: body.requirements || [],
      images: body.images || [],
      videos: body.videos || [],
      screenshots: body.screenshots || [],
      coverImage: body.cover_image || null,
      demoUrl: body.demo_url || null,
      documentationUrl: body.documentation_url || null,
      supportUrl: body.support_url || null,
      status: approvalStatus as any,
      featured: body.featured || false,
      id: 0
    })

    const message = isFounderOrAdmin 
      ? "Script created and approved successfully!" 
      : "Script submitted successfully! It will be reviewed by an admin before going live."

    return NextResponse.json(
      {
        success: true,
        message,
        scriptId,
        status: approvalStatus,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating script:", error)
    return NextResponse.json({ error: "Failed to submit script" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const framework = searchParams.get("framework")
    const status = searchParams.get("status") || "all"
    const featured = searchParams.get("featured")
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")

    console.log("Scripts API - Request params:", { category, framework, status, featured, limit, offset })

    const filters = {
      category: category || undefined,
      framework: framework ? framework.split(',') : undefined,
      status: status === "all" ? "approved" : status, // Default to approved for public access
      featured: featured ? featured === "true" : undefined,
      limit: limit ? Number.parseInt(limit) : undefined,
      offset: offset ? Number.parseInt(offset) : undefined,
    }

    console.log("Scripts API - Filters:", filters)

    const scripts = await getScripts(filters)
    console.log("Scripts API - Found scripts:", scripts.length)
    // status may not exist on approved_scripts selection; avoid strict access
    console.log("Scripts API - Script ids:", scripts.map(s => ({ id: (s as any).id, title: (s as any).title })))

    return NextResponse.json({ scripts })
  } catch (error: any) {
    console.error("Error fetching scripts:", error)
    
    // Handle specific database connection errors
    if (error.message?.includes('XATA_CONCURRENCY_LIMIT') || error.cause?.code === 'XATA_CONCURRENCY_LIMIT') {
      return NextResponse.json({ 
        error: "Database is temporarily overloaded. Please try again in a few seconds." 
      }, { status: 503 })
    }
    
    return NextResponse.json({ error: "Failed to fetch scripts" }, { status: 500 })
  }
}
