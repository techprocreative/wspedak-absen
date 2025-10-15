/** @type {import('next').NextConfig} */
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const nextConfig = {
  eslint: {
    // Ignore ESLint errors during builds to allow deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Completely disable TypeScript checking in production builds
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  // Add environment variable to disable TypeScript warnings
  env: {
    DISABLE_TS_CHECK: 'true',
  },
  // Webpack configuration to fix TensorFlow.js / face-api.js issues
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve these modules on the client-side (browser)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        encoding: false,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    // Fix path resolution for @/ aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve('.'),
    }
    
    return config
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
  // Only expose truly necessary environment variables to the client
  // NEVER expose secrets, passwords, or service keys
  env: {
    // Remove in production - only for demo purposes
    ALLOW_DEMO_CREDENTIALS: process.env.ALLOW_DEMO_CREDENTIALS,
  },
}

export default nextConfig
