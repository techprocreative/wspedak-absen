/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Do not fail production builds on lint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Do not block production builds on type errors
    ignoreBuildErrors: true,
  },
  images: {
    // Optimize images in production for better LCP; keep unoptimized in dev for speed
    unoptimized: process.env.NODE_ENV !== 'production',
  },
  // PWA configuration
  async headers() {
    return [
      {
        source: '/service-worker.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  // Enable experimental features for PWA
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react'],
    // Skip static generation errors
    missingSuspenseWithCSRBailout: true,
  },
  // Disable fallback error pages generation
  generateBuildId: async () => 'attendance-system-build',
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Skip generating static pages that use client-side features
  skipTrailingSlashRedirect: true,
  // Skip middleware redirect
  skipMiddlewareUrlNormalize: true,
  // Output configuration for Docker runtime
  output: 'standalone',
  // Compression configuration
  compress: true,
  // Disable automatic static optimization to prevent build errors
  productionBrowserSourceMaps: false,
  // Allow build to complete even if some pages fail static generation
  staticPageGenerationTimeout: 120,
  // Disable static optimization for dynamic pages
  devIndicators: {
    buildActivityPosition: 'bottom-right',
  },
  // Environment variables that should be available to the client
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    ALLOW_DEMO_CREDENTIALS: process.env.ALLOW_DEMO_CREDENTIALS,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    NEXT_PUBLIC_ADMIN_EMAIL: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  },
}

export default nextConfig
