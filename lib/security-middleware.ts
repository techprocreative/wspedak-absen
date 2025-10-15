import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth-middleware'
import { secureStorage } from './secure-storage'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Login attempt tracking
interface LoginAttempt {
  count: number
  lastAttempt: number
  lockUntil?: number
  isLocked: boolean
}

// Failed login attempts store (in-memory for demo, use Redis in production)
const loginAttempts = new Map<string, LoginAttempt>()

// Security configuration
const SECURITY_CONFIG = {
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  resetDuration: 60 * 60 * 1000, // 1 hour
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  maxRequestsPerWindow: 100,
  authRateLimitWindow: 15 * 60 * 1000, // 15 minutes
  maxAuthRequestsPerWindow: 5 // For sensitive operations
}

// Brute force protection
export class BruteForceProtection {
  static async trackFailedLogin(identifier: string): Promise<boolean> {
    const now = Date.now()
    const attempt = loginAttempts.get(identifier) || {
      count: 0,
      lastAttempt: now,
      isLocked: false
    }

    // Increment failed attempts
    attempt.count++
    attempt.lastAttempt = now

    // Check if should lock account
    if (attempt.count >= SECURITY_CONFIG.maxLoginAttempts) {
      attempt.lockUntil = now + SECURITY_CONFIG.lockoutDuration
      attempt.isLocked = true
      
      // Log security event
      logger.warn('Account locked due to brute force', { identifier, 
        attempts: attempt.count,
        lockUntil: new Date(attempt.lockUntil).toISOString()
      })
    }

    loginAttempts.set(identifier, attempt)
    return attempt.isLocked
  }

  static async trackSuccessfulLogin(identifier: string): Promise<void> {
    // Reset failed attempts on successful login
    loginAttempts.delete(identifier)
  }

  static isAccountLocked(identifier: string): boolean {
    const attempt = loginAttempts.get(identifier)
    if (!attempt) return false

    const now = Date.now()
    
    // Check if lock has expired
    if (attempt.isLocked && attempt.lockUntil && now > attempt.lockUntil) {
      loginAttempts.delete(identifier)
      return false
    }

    return attempt.isLocked
  }

  static getRemainingLockTime(identifier: string): number {
    const attempt = loginAttempts.get(identifier)
    if (!attempt || !attempt.lockUntil) return 0

    const now = Date.now()
    const remaining = attempt.lockUntil - now
    return Math.max(0, remaining)
  }

  static getFailedAttempts(identifier: string): number {
    const attempt = loginAttempts.get(identifier)
    return attempt ? attempt.count : 0
  }

  // Cleanup old attempts
  static cleanup(): void {
    const now = Date.now()
    for (const [identifier, attempt] of loginAttempts.entries()) {
      if (now - attempt.lastAttempt > SECURITY_CONFIG.resetDuration) {
        loginAttempts.delete(identifier)
      }
    }
  }
}

// Rate limiting for different endpoints
export class RateLimiter {
  private static store = new Map<string, { count: number; resetTime: number }>()

  static isRateLimited(
    identifier: string, 
    windowMs: number, 
    maxRequests: number
  ): { limited: boolean; resetTime?: number; remaining?: number } {
    const now = Date.now()
    const key = identifier
    
    let record = this.store.get(key)
    
    if (!record || now > record.resetTime) {
      // Create new record or reset expired record
      record = {
        count: 1,
        resetTime: now + windowMs
      }
      this.store.set(key, record)
    } else {
      // Increment count
      record.count++
    }

    const remaining = Math.max(0, maxRequests - record.count)
    const limited = record.count > maxRequests

    return {
      limited,
      resetTime: limited ? record.resetTime : undefined,
      remaining
    }
  }

  static getClientIdentifier(request: NextRequest): string {
    // Try to get IP from various headers
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip')
    
    let ip = forwardedFor?.split(',')[0] || 
             realIp || 
             cfConnectingIp || 
             'unknown'
    
    // Add user agent fingerprint for better identification
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Create a hash of IP + user agent for privacy
    return Buffer.from(`${ip}:${userAgent}`).toString('base64').substring(0, 32)
  }

  static cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

// Authentication rate limiting middleware
export function createAuthRateLimit() {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const identifier = RateLimiter.getClientIdentifier(request)
    const endpoint = new URL(request.url).pathname
    
    // Different limits for different endpoints
    let windowMs = SECURITY_CONFIG.rateLimitWindow
    let maxRequests = SECURITY_CONFIG.maxRequestsPerWindow
    
    if (endpoint.includes('/auth/') || endpoint.includes('/login') || endpoint.includes('/register')) {
      windowMs = SECURITY_CONFIG.authRateLimitWindow
      maxRequests = SECURITY_CONFIG.maxAuthRequestsPerWindow
    }

    const result = RateLimiter.isRateLimited(identifier, windowMs, maxRequests)
    
    if (result.limited) {
      const resetTime = Math.ceil((result.resetTime! - Date.now()) / 1000)
      
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many authentication attempts, please try again later',
          retryAfter: resetTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetTime!).toISOString(),
            'Retry-After': resetTime.toString()
          }
        }
      )
    }

    // Add rate limit headers to response
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', maxRequests.toString())
    headers.set('X-RateLimit-Remaining', result.remaining!.toString())
    headers.set('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString())

    return null // Continue with request
  }
}

// Account lockout middleware
export function createAccountLockout() {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    // Only apply to authentication endpoints
    const url = new URL(request.url)
    if (!url.pathname.includes('/auth/') && !url.pathname.includes('/login')) {
      return null
    }

    try {
      const body = await request.clone().json()
      const identifier = body.email || body.username || body.identifier

      if (!identifier) {
        return null
      }

      // Check if account is locked
      if (BruteForceProtection.isAccountLocked(identifier)) {
        const remainingTime = Math.ceil(BruteForceProtection.getRemainingLockTime(identifier) / 1000)
        const failedAttempts = BruteForceProtection.getFailedAttempts(identifier)

        return NextResponse.json(
          {
            success: false,
            error: 'Account locked',
            message: `Account has been locked due to too many failed login attempts. Please try again in ${remainingTime} seconds.`,
            lockedUntil: new Date(Date.now() + BruteForceProtection.getRemainingLockTime(identifier)).toISOString(),
            failedAttempts
          },
          { 
            status: 423,
            headers: {
              'Retry-After': remainingTime.toString(),
              'X-Account-Locked': 'true',
              'X-Lockout-Remaining': remainingTime.toString()
            }
          }
        )
      }
    } catch (error) {
      // If we can't parse the body, continue with request
      logger.error('Account lockout middleware error', error as Error)
    }

    return null // Continue with request
  }
}

// Session management middleware
export function createSessionManager() {
  return async (request: NextRequest): Promise<{ user?: any; session?: string } | null> => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    
    try {
      // Verify JWT token
      const verification = await verifyToken(token)
      
      if (!verification.valid) {
        return null
      }

      // Check if session is still valid in secure storage
      const sessionData = secureStorage.getSessionData(`session_${verification.payload.id}`)
      
      if (!sessionData) {
        return null
      }

      return {
        user: verification.payload,
        session: token
      }
    } catch (error) {
      logger.error('Session validation error', error as Error)
      return null
    }
  }
}

// Security headers middleware
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Only add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  return response
}

// CSRF protection middleware
export function createCSRFProtection() {
  const csrfTokens = new Map<string, { token: string; expires: number }>()
  
  return {
    // Generate CSRF token
    generateToken: (sessionId: string): string => {
      const token = generateRandomToken(32)
      const expires = Date.now() + (60 * 60 * 1000) // 1 hour
      
      csrfTokens.set(sessionId, { token, expires })
      return token
    },
    
    // Validate CSRF token
    validateToken: (sessionId: string, token: string): boolean => {
      const record = csrfTokens.get(sessionId)
      
      if (!record || record.token !== token) {
        return false
      }
      
      if (Date.now() > record.expires) {
        csrfTokens.delete(sessionId)
        return false
      }
      
      return true
    },
    
    // Middleware function
    middleware: async (request: NextRequest): Promise<NextResponse | null> => {
      // Only apply to state-changing methods
      if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        return null
      }

      const csrfToken = request.headers.get('x-csrf-token')
      const sessionId = request.headers.get('x-session-id')
      
      if (!csrfToken || !sessionId) {
        return NextResponse.json(
          {
            success: false,
            error: 'CSRF protection',
            message: 'CSRF token is required'
          },
          { status: 403 }
        )
      }

      const csrfProtection = createCSRFProtection()
      if (!csrfProtection.validateToken(sessionId, csrfToken)) {
        return NextResponse.json(
          {
            success: false,
            error: 'CSRF protection',
            message: 'Invalid or expired CSRF token'
          },
          { status: 403 }
        )
      }

      return null
    }
  }
}

// Generate random token
function generateRandomToken(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

// Export CSRF protection instance
export const csrfProtection = createCSRFProtection()

// Cleanup function to be called periodically
export function cleanupSecurityData(): void {
  BruteForceProtection.cleanup()
  RateLimiter.cleanup()
}

// Security monitoring and logging
export function logSecurityEvent(
  event: string,
  details: any,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details,
    userAgent: details.request?.headers?.get('user-agent'),
    ip: details.ip || 'unknown'
  }

  logger.warn('Security event', { severity, event, ...logEntry })
  
  // In production, you would send this to a security monitoring service
  if (severity === 'high' || severity === 'critical') {
    // Send alert to security team
    logger.error('[SECURITY ALERT]', logEntry as Error)
  }
}