import { NextRequest, NextResponse } from "next/server"
import { uploadToS3, generateS3Key } from "@/lib/s3"

// Size limits in bytes
const SIZE_LIMITS = {
  // Image limits
  coverImage: 500 * 1024, // 500KB
  screenshot: 400 * 1024, // 400KB
  thumbnail: 100 * 1024,  // 100KB
  
  // Video limits
  demoVideo: 10 * 1024 * 1024,  // 10MB
  trailerVideo: 25 * 1024 * 1024, // 25MB
}

// Dimension limits
const DIMENSION_LIMITS = {
  coverImage: { width: 1600, height: 1200 },
  screenshot: { width: 1200, height: 900 },
  thumbnail: { width: 400, height: 300 },
  demoVideo: { width: 1280, height: 720 },
  trailerVideo: { width: 1920, height: 1080 },
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string // "image" or "video"
    const purpose = formData.get("purpose") as string // "cover", "screenshot", "demo", "trailer"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    const allowedVideoTypes = ["video/mp4", "video/mov", "video/avi", "video/webm"]
    
    if (type === "image" && !allowedImageTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid image format. Use JPEG, PNG, or WebP" 
      }, { status: 400 })
    }
    
    if (type === "video" && !allowedVideoTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid video format. Use MP4, MOV, AVI, or WebM" 
      }, { status: 400 })
    }

    // Determine size limit based on purpose
    let maxSize: number
    let maxDimensions: { width: number; height: number }
    
    if (type === "image") {
      switch (purpose) {
        case "cover":
          maxSize = SIZE_LIMITS.coverImage
          maxDimensions = DIMENSION_LIMITS.coverImage
          break
        case "screenshot":
          maxSize = SIZE_LIMITS.screenshot
          maxDimensions = DIMENSION_LIMITS.screenshot
          break
        case "thumbnail":
          maxSize = SIZE_LIMITS.thumbnail
          maxDimensions = DIMENSION_LIMITS.thumbnail
          break
        default:
          maxSize = SIZE_LIMITS.screenshot
          maxDimensions = DIMENSION_LIMITS.screenshot
      }
    } else {
      switch (purpose) {
        case "demo":
          maxSize = SIZE_LIMITS.demoVideo
          maxDimensions = DIMENSION_LIMITS.demoVideo
          break
        case "trailer":
          maxSize = SIZE_LIMITS.trailerVideo
          maxDimensions = DIMENSION_LIMITS.trailerVideo
          break
        default:
          maxSize = SIZE_LIMITS.demoVideo
          maxDimensions = DIMENSION_LIMITS.demoVideo
      }
    }

    // Check file size
    if (file.size > maxSize) {
      const sizeMB = (maxSize / (1024 * 1024)).toFixed(1)
      return NextResponse.json({ 
        error: `File too large. Max size for ${purpose}: ${sizeMB}MB` 
      }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate S3 key
    const s3Key = generateS3Key(type as 'image' | 'video', purpose, file.name)

    // Upload to S3
    const publicUrl = await uploadToS3(buffer, s3Key, file.type)

    console.log(`File uploaded to S3: ${publicUrl}`)

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      key: s3Key,
      size: file.size,
      dimensions: maxDimensions
    })

  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ 
      error: "Failed to upload file",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}