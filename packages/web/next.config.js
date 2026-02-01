/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@scholarly/shared'],
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
};

module.exports = nextConfig;
