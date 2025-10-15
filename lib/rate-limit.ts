/**
 * Production-grade rate limiting middleware
 * Protects API endpoints from abuse
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (use Redis in production for distributed systems)
const store: RateLimitStore = {};

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 10 * 60 * 1000);

/**
 * Get client identifier (IP address or user ID)
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (for proxy/load balancer scenarios)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback to connection IP
  return request.ip || 'unknown';
}

/**
 * Rate limit middleware factory
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
  } = config;

  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const identifier = getClientIdentifier(request);
    const now = Date.now();
    const key = `${identifier}:${request.nextUrl.pathname}`;

    // Initialize or get current rate limit data
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // Increment request count
    store[key].count++;

    // Check if limit exceeded
    if (store[key].count > maxRequests) {
      const resetTime = new Date(store[key].resetTime).toISOString();
      
      return NextResponse.json(
        {
          success: false,
          error: message,
          retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime,
            'Retry-After': Math.ceil((store[key].resetTime - now) / 1000).toString(),
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = await handler(request);
    
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', (maxRequests - store[key].count).toString());
    response.headers.set('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());

    return response;
  };
}

// Pre-configured rate limiters for common use cases
export const strictRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  message: 'Too many requests from this IP, please try again later',
});

export const standardRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});

export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts, please try again later',
});

export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
});

/**
 * Helper function to apply rate limiting to API routes
 * Usage:
 * 
 * export async function POST(request: NextRequest) {
 *   return withRateLimit(request, authRateLimit, async (req) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   });
 * }
 */
export async function withRateLimit(
  request: NextRequest,
  rateLimiter: ReturnType<typeof createRateLimiter>,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return rateLimiter(request, handler);
}
