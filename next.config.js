/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vercel's optimizer returns 402 (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED)
    // once the plan's source-image quota is spent, which is why covers stopped
    // rendering. Route every next/image through our own /api/img instead —
    // same resize + WebP, our compute, no quota. `unoptimized` was rejected:
    // the live catalogue averages 1.28 MB a cover (26 files over 3 MB), so a
    // full grid would ship ~15 MB of originals.
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    domains: ['localhost',
      'crux-marketplace-s3.s3.ap-south-1.amazonaws.com',
      'images.unsplash.com',
      // Discord avatars (real users sign in with Discord) — without these,
      // next/image throws on the avatar URL and crashes the page.
      'cdn.discordapp.com',
      'media.discordapp.net',
    ],
    // Tebex package images are served from its CloudFront CDN (hostname varies,
    // e.g. dunb17ur4ymx4.cloudfront.net). Without this, next/image throws and
    // the props page crashes.
    remotePatterns: [
      { protocol: 'https', hostname: '**.cloudfront.net' },
    ],
  },
  // @electric-sql/pglite ships WASM + a .data filesystem image that must be
  // require()'d from node_modules at runtime — bundling it breaks asset
  // resolution. (TODO: pglite is dev-only; safe to drop with the harness.)
  serverExternalPackages: ['drizzle-orm', 'pg', 'postgres', '@electric-sql/pglite'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Only externalize database-related packages
      config.externals.push('drizzle-orm', 'pg', 'postgres', '@electric-sql/pglite')
    }
    return config
  }
}

module.exports = nextConfig
