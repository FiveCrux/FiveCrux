import { type NextRequest, NextResponse } from "next/server"
import sharp from "sharp"

/**
 * Self-hosted image optimizer, replacing Vercel's.
 *
 * Vercel's optimizer started returning 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED
 * once the plan's source-image quota ran out, so covers stopped rendering. The
 * alternative — `images.unoptimized` — would ship the originals: the live
 * catalogue averages 1.28 MB per cover with 26 files over 3 MB, so a 12-card
 * grid would be ~15 MB. This route does the resize/re-encode ourselves with
 * sharp (already a dependency, already used by lib/s3.ts) so there is no quota
 * and no per-image cost.
 *
 * GET /api/img?url=<encoded>&w=640&q=75
 *
 * Only hosts that are already trusted for images may be fetched — an open
 * fetch-and-return endpoint is an SSRF hole and a free bandwidth proxy.
 */

const ALLOWED_HOSTS = [
  "dunb17ur4ymx4.cloudfront.net",
  "crux-marketplace-s3.s3.ap-south-1.amazonaws.com",
  "images.unsplash.com",
  "cdn.discordapp.com",
  "media.discordapp.net",
]

const ALLOWED_WIDTHS = [64, 96, 128, 256, 384, 400, 640, 750, 828, 1080, 1200, 1920]
const MAX_SOURCE_BYTES = 25 * 1024 * 1024

function hostAllowed(hostname: string): boolean {
  return (
    ALLOWED_HOSTS.includes(hostname) ||
    hostname.endsWith(".cloudfront.net") ||
    hostname.endsWith(".s3.ap-south-1.amazonaws.com")
  )
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const raw = params.get("url")
  if (!raw) return NextResponse.json({ error: "Missing url" }, { status: 400 })

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 })
  }

  if (target.protocol !== "https:" || !hostAllowed(target.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 })
  }

  // Snap to a fixed ladder so a caller cannot spray thousands of distinct
  // widths and make us re-encode (and re-cache) the same image endlessly.
  const requested = Number(params.get("w")) || 640
  const width = ALLOWED_WIDTHS.reduce((best, w) =>
    Math.abs(w - requested) < Math.abs(best - requested) ? w : best
  )
  const quality = Math.min(Math.max(Number(params.get("q")) || 72, 40), 90)

  try {
    const upstream = await fetch(target.toString(), {
      headers: { accept: "image/*" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!upstream.ok) {
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 })
    }

    const len = Number(upstream.headers.get("content-length") || 0)
    if (len && len > MAX_SOURCE_BYTES) {
      return NextResponse.json({ error: "Source too large" }, { status: 413 })
    }

    const input = Buffer.from(await upstream.arrayBuffer())
    if (input.byteLength > MAX_SOURCE_BYTES) {
      return NextResponse.json({ error: "Source too large" }, { status: 413 })
    }

    // withoutEnlargement: never upscale a small source just because a wide
    // layout asked for it — that costs bytes and gains nothing visually.
    const output = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer()

    return new NextResponse(new Uint8Array(output), {
      headers: {
        "content-type": "image/webp",
        // Immutable: the key includes the source URL, width and quality, so a
        // different result always has a different key. Long TTL means each
        // variant is encoded once and then served from the CDN edge.
        "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "x-image-source-bytes": String(input.byteLength),
        "x-image-output-bytes": String(output.byteLength),
      },
    })
  } catch (error) {
    console.error("[GET /api/img] optimize failed:", error)
    return NextResponse.json({ error: "Optimize failed" }, { status: 500 })
  }
}
