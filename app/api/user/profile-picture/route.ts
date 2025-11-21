import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { updateUserProfilePicture } from "@/lib/database-new"
import { uploadToS3, generateS3Key } from "@/lib/s3"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedImageTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid image format. Use JPEG, PNG, or WebP" 
      }, { status: 400 })
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "File too large. Max size: 5MB" 
      }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate S3 key for profile picture
    const s3Key = generateS3Key('image', 'profile', file.name)

    // Upload to S3 (images are automatically optimized)
    const publicUrl = await uploadToS3(buffer, s3Key, file.type)

    // Update user's profile picture in database
    const userId = (session.user as any).id
    await updateUserProfilePicture(userId, publicUrl)

    return NextResponse.json({ 
      success: true, 
      url: publicUrl 
    })
  } catch (error) {
    console.error("Error uploading profile picture:", error)
    return NextResponse.json({ 
      error: "Failed to upload profile picture" 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Remove profile picture (set to null)
    const userId = (session.user as any).id
    await updateUserProfilePicture(userId, null)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing profile picture:", error)
    return NextResponse.json({ 
      error: "Failed to remove profile picture" 
    }, { status: 500 })
  }
}

