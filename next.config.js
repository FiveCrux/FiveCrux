/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  serverExternalPackages: ['drizzle-orm', 'pg', 'postgres'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Only externalize database-related packages
      config.externals.push('drizzle-orm', 'pg', 'postgres')
    }
    return config
  }
}

module.exports = nextConfig
