/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@scholarly/shared'],
  images: {
    domains: ['localhost', 'scholarly.ai', 'portfolio.scholarly.ai'],
  },
};

module.exports = nextConfig;
