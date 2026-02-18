/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@scholarly/shared', '@scholarly/database'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'scholarly.ai' },
      { protocol: 'https', hostname: 'portfolio.scholarly.ai' },
      { protocol: 'https', hostname: '*.azurecontainerapps.io' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
  async headers() {
    return [
      {
        // Prevent browsers from caching HTML pages — avoids stale chunk
        // references after deploys (the "Load failed" / ChunkLoadError issue).
        // Static assets under /_next/static/ already have content hashes in
        // their filenames and are served with immutable cache headers by Next.js.
        source: '/((?!_next/static|_next/image|favicon\\.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Landing site pages with clean URLs
      { source: '/site', destination: '/index.html' },
      { source: '/site/ask-issy', destination: '/ask-issy.html' },
      { source: '/site/assessment-engine', destination: '/assessment-engine.html' },
      { source: '/site/content-marketplace', destination: '/content-marketplace.html' },
      { source: '/site/curriculum-intelligence', destination: '/curriculum-intelligence.html' },
      { source: '/site/developer-platform', destination: '/developer-platform.html' },
      { source: '/site/eduscrum', destination: '/eduscrum.html' },
      { source: '/site/golden-learning-path', destination: '/golden-learning-path.html' },
      { source: '/site/homeschool-hub', destination: '/homeschool-hub.html' },
      { source: '/site/learning-portfolio', destination: '/learning-portfolio.html' },
      { source: '/site/lingua-flow', destination: '/lingua-flow.html' },
      { source: '/site/lis-bridge', destination: '/lis-bridge.html' },
      { source: '/site/micro-schools', destination: '/micro-schools.html' },
      { source: '/site/relief-marketplace', destination: '/relief-marketplace.html' },
      { source: '/site/scheduling-engine', destination: '/scheduling-engine.html' },
      { source: '/site/token-economy', destination: '/token-economy.html' },
      { source: '/site/tutor-booking', destination: '/tutor-booking.html' },
    ];
  },
};

module.exports = nextConfig;
