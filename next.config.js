/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
