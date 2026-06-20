/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost',
      'crux-marketplace-s3.s3.ap-south-1.amazonaws.com',
      'images.unsplash.com',
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
