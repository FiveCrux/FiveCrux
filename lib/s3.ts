import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    Body: file,
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