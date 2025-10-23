import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { updateUserRole, getUserById, VALID_ROLES, validateRoles } from "@/lib/database-new"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    
    const user = session.user as any
    if (!user.roles || (!user.roles.includes('admin') && !user.roles.includes('founder'))) {
      return NextResponse.json({ error: "Admin or founder access required" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { roles } = body

    if (!Array.isArray(roles)) {
      return NextResponse.json({ error: "Roles must be an array" }, { status: 400 })
    }

    // Validate roles
    let validRoles = validateRoles(roles)
    if (validRoles.length === 0) {
      return NextResponse.json({ 
        error: `No valid roles provided. Valid roles are: ${VALID_ROLES.join(', ')}` 
      }, { status: 400 })
    }

    // Server-side security: Prevent moderators from assigning restricted roles
    const isModerator = user.roles.includes('moderator')
    const isFounder = user.roles.includes('founder')
    
    if (isModerator && !isFounder) {
      // Filter out moderator and founder roles if user is only a moderator
      const restrictedRoles = ['moderator', 'founder']
      const attemptedRestrictedRoles = validRoles.filter(role => restrictedRoles.includes(role))
      
      if (attemptedRestrictedRoles.length > 0) {
        console.log(`Moderator ${user.email} attempted to assign restricted roles:`, attemptedRestrictedRoles)
      }
      
      // Remove restricted roles from the list
      validRoles = validRoles.filter(role => !restrictedRoles.includes(role))
      
      if (validRoles.length === 0) {
        return NextResponse.json({ 
          error: "Moderators cannot assign moderator or founder roles" 
        }, { status: 403 })
      }
    }
    
    const result = await updateUserRole(id, validRoles)

    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "User roles updated successfully",
      user: {
        id: result.id,
        username: result.username,
        roles: result.roles
      },
      validRoles: VALID_ROLES
    })
  } catch (error) {
    console.error("Error updating user roles:", error)
    return NextResponse.json({ error: "Failed to update user roles" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user as any
    if (!user.roles || (!user.roles.includes('admin') && !user.roles.includes('founder'))) {
      return NextResponse.json({ error: "Admin or founder access required" }, { status: 403 })
    }

    const { id } = await params
    const userData = await getUserById(id)

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      user: {
        id: userData.id,
        username: userData.username,
        roles: userData.roles
      },
      validRoles: VALID_ROLES,
      roleHierarchy: {
        founder: "Highest level - Full system access",
        verified_creator: "Can create and manage content",
        crew: "Team member with special privileges",
        admin: "Administrative access",
        moderator: "Basic moderation privileges",
        user: "Basic user access (default for new users)"
      },
      adCategories: {
        both: "Shows on both scripts and giveaways pages",
        scripts: "Shows only on scripts pages",
        giveaways: "Shows only on giveaways pages"
      }
    })
  } catch (error) {
    console.error("Error getting user roles:", error)
    return NextResponse.json({ error: "Failed to get user roles" }, { status: 500 })
  }
}

