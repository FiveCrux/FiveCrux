import { NextRequest, NextResponse } from "next/server"
import { uploadToS3, generateS3Key } from "@/lib/s3"

// Size limits in bytes (before optimization)
// Note: Images are automatically resized and converted to WebP by Sharp
// Final uploaded files will be smaller than these limits
const SIZE_LIMITS = {
  // Image limits (will be optimized before upload)
  coverImage: 5 * 1024 * 1024,  // 5MB (before optimization)
  screenshot: 5 * 1024 * 1024,  // 5MB (before optimization)
  thumbnail: 2 * 1024 * 1024,   // 2MB (before optimization)
  
  // Video limits (uploaded as-is)
  demoVideo: 4.5 * 1024 * 1024,  // 4.5MB
  trailerVideo: 4.5 * 1024 * 1024, // 4.5MB
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

    // Upload to S3 (images are automatically optimized)
    const publicUrl = await uploadToS3(buffer, s3Key, file.type)

    console.log(`File uploaded to S3: ${publicUrl}`)
    console.log(`Original size: ${(file.size / 1024).toFixed(2)}KB | Type: ${file.type} | Purpose: ${purpose}`)

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      key: s3Key,
      originalSize: file.size,
      optimized: type === 'image' && file.type !== 'image/gif', // Indicates if image was optimized
      format: type === 'image' && file.type !== 'image/gif' ? 'webp' : file.type.split('/')[1],
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