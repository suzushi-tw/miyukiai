/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // This completely disables ESLint during production builds
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'r2.miyukiai.com',
        pathname: '**',
      },
    ],
  },
}

module.exports = nextConfig