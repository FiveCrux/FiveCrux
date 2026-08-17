"use client"

/**
 * Custom next/image loader — points every image at our own optimizer
 * (/api/img) instead of Vercel's, which returns 402 once the plan's
 * source-image quota is used up.
 *
 * Configured once in next.config.js, so no component has to change: every
 * existing `<Image>` keeps working and automatically gets a resized WebP.
 *
 * Local and relative sources are passed straight through — /api/img only
 * accepts absolute https URLs on trusted hosts, and there is nothing to gain
 * from round-tripping an asset we already serve ourselves.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  if (!src.startsWith("http")) return src
  return `/api/img?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 72}`
}
