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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // X-XSS-Protection is deprecated; set to 0 and rely on CSP for XSS protection
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Landing site pages with clean URLs
      { source: '/site', destination: '/index.html' },
      { source: '/site/ai-buddy', destination: '/ai-buddy.html' },
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
