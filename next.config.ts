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
  webpack: (config: any) => {
    // See https://webpack.js.org/configuration/resolve/#resolvealias
    config.resolve.alias = {
        ...config.resolve.alias,
        "sharp$": false,
        "onnxruntime-node$": false,
    }
    return config;
},
}

module.exports = nextConfig