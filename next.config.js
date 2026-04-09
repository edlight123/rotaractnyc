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
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
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
  webpack: (config) => {
    // @react-pdf/renderer has an optional canvas dependency that breaks webpack
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
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
            // ⚠️ SECURITY NOTE (V1): 'unsafe-inline' remains in script-src and
            // style-src because several dependencies (styled-jsx, react-quill,
            // novel editor, Google Identity Services, Stripe.js) inject inline
            // scripts and styles at runtime that cannot currently use nonces.
            //
            // RISK: An attacker who can inject HTML into the page (e.g. via
            // stored XSS) could execute arbitrary inline scripts or styles.
            // This is partially mitigated by DOMPurify sanitising all
            // user-generated HTML, and by the strict connect-src / frame-src
            // allowlists limiting where exfiltrated data could be sent.
            //
            // POST-V1 PLAN: Migrate to nonce-based CSP once Next.js middleware
            // supports per-request nonce injection without a custom server, or
            // once inline-script-dependent libraries are replaced.
            // Tracking issue: https://github.com/vercel/next.js/issues/55638
            value: [
              "default-src 'self'",
              // 'wasm-unsafe-eval' allows @react-pdf/renderer to compile its WASM module
              "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://js.stripe.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
              "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://lh3.googleusercontent.com https://images.unsplash.com https://images.squarespace-cdn.com https://*.googleusercontent.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              // data: and blob: allow @react-pdf/renderer to load its WASM binary and generate PDF blobs
              "connect-src 'self' data: blob: https://*.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.stripe.com https://va.vercel-scripts.com wss://*.firebaseio.com",
              "frame-src 'self' https://js.stripe.com https://accounts.google.com https://rotaractnyc-ac453.firebaseapp.com https://*.firebaseapp.com",
              // blob: needed for PDF download links
              "worker-src 'self' blob:",
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
