/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.squarespace-cdn.com', 'static1.squarespace.com', 'firebasestorage.googleapis.com'],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
