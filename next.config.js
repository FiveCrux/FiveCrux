/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  experimental: {
    serverComponentsExternalPackages: ['drizzle-orm', 'pg', 'postgres', 'framer-motion', 'recharts']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('drizzle-orm', 'pg', 'postgres', 'framer-motion', 'recharts')
    }
    return config
  }
}

module.exports = nextConfig
