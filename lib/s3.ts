import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Image resize dimensions based on purpose
const IMAGE_DIMENSIONS = {
  'cover': { width: 1200, height: 630, fit: 'cover' as const }, // Cover images
  'thumbnail': { width: 400, height: 400, fit: 'cover' as const }, // Thumbnails
  'screenshot': { width: 1920, height: 1080, fit: 'inside' as const }, // Screenshots
  'ad': { width: 800, height: 600, fit: 'cover' as const }, // Advertisement images
  'giveaway': { width: 1200, height: 800, fit: 'inside' as const }, // Giveaway images
  'profile': { width: 400, height: 400, fit: 'cover' as const }, // Profile pictures (square)
  'default': { width: 1200, height: 1200, fit: 'inside' as const }, // Default fallback
}

/**
 * Resize and optimize image using Sharp
 */
async function resizeImage(
  buffer: Buffer,
  purpose: string,
  contentType: string
): Promise<Buffer> {
  // Skip resizing for non-image types or GIFs (to preserve animation)
  if (!contentType.startsWith('image/') || contentType === 'image/gif') {
    return buffer
  }

  // Get dimensions based on purpose
  const dimensions = IMAGE_DIMENSIONS[purpose as keyof typeof IMAGE_DIMENSIONS] || IMAGE_DIMENSIONS.default

  try {
    // Use WebP for better compression and quality
    return await sharp(buffer)
      .resize(dimensions.width, dimensions.height, {
        fit: dimensions.fit,
        withoutEnlargement: true, // Don't upscale small images
      })
      .webp({ quality: 85, effort: 4 }) // Convert to WebP with good quality
      .toBuffer()
  } catch (error) {
    console.error('Error resizing image:', error)
    // Fallback to JPEG if WebP fails
    try {
      return await sharp(buffer)
        .resize(dimensions.width, dimensions.height, {
          fit: dimensions.fit,
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer()
    } catch (jpegError) {
      console.error('Error resizing to JPEG:', jpegError)
      // Return original buffer if all resize attempts fail
      return buffer
    }
  }
}

/**
 * Upload file to S3 with automatic image optimization
 * - Images are resized based on purpose (cover, screenshot, etc.)
 * - Converted to WebP format for better compression
 * - Videos are uploaded as-is
 * - GIFs are preserved to maintain animation
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  // Extract purpose from key (e.g., "images/cover/..." -> "cover")
  const purpose = key.split('/')[1] || 'default'
  
  // Resize and optimize images automatically
  let processedFile = file
  if (contentType.startsWith('image/')) {
    processedFile = await resizeImage(file, purpose, contentType)
    // Update content type to WebP if we converted it (except GIFs)
    if (contentType !== 'image/gif') {
      contentType = 'image/webp'
    }
  }
  
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    Body: processedFile,
    ContentType: contentType,
    // ACL removed - using bucket policy for public access instead
    // This is required because the bucket has "ACLs disabled (recommended)"
  })

  await s3Client.send(command)

  return `${process.env.AWS_S3_BUCKET_URL}/${key}`
}

export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
  })

  await s3Client.send(command)
}

export function generateS3Key(
  type: 'image' | 'video',
  purpose: string,
  originalName: string
): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  // Preserve original file extension to avoid content-type/extension mismatch
  const originalExt = originalName.includes('.')
    ? originalName.split('.').pop() || ''
    : ''
  const safeExt = (originalExt || (type === 'image' ? 'jpg' : 'mp4')).toLowerCase()

  return `${type}s/${purpose}/${timestamp}-${randomString}.${safeExt}`
}