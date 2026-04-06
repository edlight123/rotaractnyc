/** @type {import('next').NextConfig} */
const fs = require('fs');
const path = require('path');

const nextConfig = {
  // Inject a date-stamp into sw.js at build time so the cache version stays current
  generateBuildId: async () => {
    const buildDate = new Date().toISOString().slice(0, 10); // e.g. 2026-04-06
    const swPath = path.join(__dirname, 'public', 'sw.js');
    try {
      let sw = fs.readFileSync(swPath, 'utf8');
      sw = sw.replace(
        /const CACHE_VERSION = '[^']+';/,
        `const CACHE_VERSION = '${buildDate}';`
      );
      sw = sw.replace(
        /^\/\/ @version .+$/m,
        `// @version ${buildDate}`
      );
      fs.writeFileSync(swPath, sw, 'utf8');
    } catch (e) {
      console.warn('Could not update sw.js version:', e.message);
    }
    return buildDate;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.squarespace-cdn.com' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://js.stripe.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
              "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://images.unsplash.com https://images.squarespace-cdn.com https://*.googleusercontent.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.stripe.com https://va.vercel-scripts.com wss://*.firebaseio.com",
              "frame-src 'self' https://js.stripe.com https://accounts.google.com https://rotaractnyc-ac453.firebaseapp.com https://*.firebaseapp.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
