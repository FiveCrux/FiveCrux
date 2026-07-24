import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { createScript, getScripts, getCategories, hasRole, hasAnyRole } from "@/lib/database-new"
import { announceScriptPending } from "@/lib/discord"
import { validateListingFields } from "@/lib/validate-listing"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // User must be authenticated
    const user = session.user as any

    // Assets are auto-approved on submission (no admin review step) — everyone's
    // submission goes straight live. isFounderOrAdmin still gates the paid
    // "featured" flag below.
    const isFounderOrAdmin = hasAnyRole(user.roles, ['founder', 'admin'])

    // Validate required fields (derive seller fields from session)
    const requiredFields = ["title", "description", "price", "category", "framework"]
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Validate the actual values (not just presence): reject a non-numeric or
    // negative price and an unknown category slug before it goes live.
    const validCategories = (await getCategories()).map((c) => c.slug)
    const valid = validateListingFields(body, validCategories)
    if (!valid.ok) {
      return NextResponse.json({ error: valid.error }, { status: 400 })
    }

    // Create the script in the database
    const scriptId = await createScript({
      title: body.title,
      description: body.description,
      price: body.price,
      originalPrice: body.original_price || null,
      currency: body.currency || null,
      currencySymbol: body.currency_symbol || null,
      category: body.category,
      // Accept both single string and array; normalized in DB layer
      framework: body.framework,
      seller_name: session.user?.name || "Unknown Seller",
      seller_email: session.user?.email || "",
      sellerId: (session.user as any).id,
      features: body.features || [],
      requirements: body.requirements || [],
      link: body.link || null,
      otherLinks: body.other_links || [],
      images: body.images || [],
      videos: body.videos || [],
      screenshots: body.screenshots || [],
      coverImage: body.cover_image || null,
      youtubeVideoLink: body.youtube_video_link || null,
      discordLink: body.discordLink || null,
      // SECURITY: "featured" is a paid placement (sold via featured-script slots).
      // Only founders/admins may set it directly; a normal seller's submission is
      // always featured:false regardless of what the request body claims.
      featured: isFounderOrAdmin ? (body.featured || false) : false,
      free: body.free || false,
      // Tebex Headless linking is done in the profile "Tebex Store" tab (import),
      // NOT via manual submit — so these are always null on a manual submission.
      // The import route sets them directly when creating a listing from Tebex.
      tebexStoreToken: null,
      tebexPackageId: null,
      id: 0
    })

    // Send Discord notification for ALL script creations
    try {
      await announceScriptPending(
        {
          id: scriptId,
          title: body.title,
          description: body.description,
          price: String(body.price),
          category: body.category,
          coverImage: body.cover_image || null,
          sellerId: (session.user as any).id,
        },
        {
          id: (session.user as any).id,
          name: session.user?.name || null,
        },
        false // isUpdate = false for new submissions
      )
    } catch (discordError) {
      console.error('Failed to send Discord notification for script creation:', discordError)
      // Don't fail the submission if Discord notification fails
    }

    const message = "Asset published! It's live on the marketplace now."

    return NextResponse.json(
      {
        success: true,
        message,
        scriptId,
        status: 'approved',
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
    const sellerId = searchParams.get("sellerId")
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")

    console.log("Scripts API - Request params:", { category, framework, status, featured, sellerId, limit, offset })

    const filters = {
      category: category || undefined,
      framework: framework ? framework.split(',') : undefined,
      status: status === "all" ? "approved" : status, // Default to approved for public access
      featured: featured ? featured === "true" : undefined,
      sellerId: sellerId || undefined,
      limit: limit ? Number.parseInt(limit) : undefined,
      offset: offset ? Number.parseInt(offset) : undefined,
    }

    console.log("Scripts API - Filters:", filters)

    const scriptsRaw = await getScripts(filters)
    // PII: strip the seller's login email from the public listing (marketplace
    // never needs it; admin reads via /api/admin/scripts which keeps it).
    const scripts = scriptsRaw.map((s: any) => { const { seller_email, ...rest } = s; return rest })
    console.log("Scripts API - Found scripts:", scripts.length)
    // status may not exist on approved_scripts selection; avoid strict access
    console.log("Scripts API - Script ids:", scripts.map(s => ({ id: (s as any).id, title: (s as any).title })))

    // Only the public listing (approved scripts) is CDN-cacheable; never cache
    // pending/other variants. Mirrors /api/categories' caching.
    const headers: Record<string, string> =
      filters.status === "approved"
        ? { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
        : {}
    return NextResponse.json({ scripts }, { headers })
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
