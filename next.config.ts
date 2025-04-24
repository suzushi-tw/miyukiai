/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // This completely disables ESLint during production builds
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig