import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getScriptById, updateScript, deleteScript } from "@/lib/database-new"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const scriptId = parseInt(id)
    const script = await getScriptById(scriptId)
    
    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 })
    }

    return NextResponse.json(script)
  } catch (error) {
    console.error("Error fetching script:", error)
    return NextResponse.json({ error: "Failed to fetch script" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const scriptId = parseInt(id)
    const script = await getScriptById(scriptId)
    
    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 })
    }

    // Log context
    const userRoles = (session.user as any)?.roles || []
    console.log('PATCH /api/scripts/[id]', {
      scriptId,
      user: { id: (session.user as any)?.id, email: session.user?.email, roles: userRoles },
      scriptSellerEmail: (script as any)?.seller_email,
    })

    // Authorization: owner by email or admin/founder
    const isAdmin = Array.isArray(userRoles) && (userRoles.includes('admin') || userRoles.includes('founder'))
    const isOwner = (script as any)?.seller_email && session.user?.email && (script as any).seller_email === session.user.email
    if (!isAdmin && !isOwner) {
      console.warn('PATCH denied: not owner/admin', { isAdmin, isOwner })
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    console.log('PATCH body:', body)
    
    // Update the script
    const updatedScript = await updateScript(scriptId, {
      title: body.title,
      description: body.description,
      price: body.price,
      original_price: body.original_price,
      category: body.category,
      framework: body.framework,
      seller_name: body.seller_name,
      seller_email: body.seller_email,
      tags: body.tags,
      features: body.features,
      requirements: body.requirements,
      images: body.images,
      videos: body.videos,
      screenshots: body.screenshots,
      demo_url: body.demo_url,
      documentation_url: body.documentation_url,
      support_url: body.support_url,
      last_updated: body.last_updated,
      status: body.status,
      featured: body.featured,
    })

    if (!updatedScript) {
      console.error('PATCH updateScript returned null')
      return NextResponse.json({ error: "Failed to update script" }, { status: 500 })
    }

    console.log('PATCH success:', { id: updatedScript.id })
    return NextResponse.json({ success: true, message: "Script updated successfully", script: updatedScript })
  } catch (error) {
    console.error("Error updating script:", error)
    return NextResponse.json({ error: "Failed to update script" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const scriptId = parseInt(id)
    const script = await getScriptById(scriptId)
    
    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 })
    }

    // Authorization: owner by email or admin/founder
    const userRoles = (session.user as any)?.roles || []
    const isAdmin = Array.isArray(userRoles) && (userRoles.includes('admin') || userRoles.includes('founder'))
    const isOwner = (script as any)?.seller_email && session.user?.email && (script as any).seller_email === session.user.email
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete the script
    const deleted = await deleteScript(scriptId)
    
    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete script" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Script deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting script:", error)
    return NextResponse.json({ error: "Failed to delete script" }, { status: 500 })
  }
}
