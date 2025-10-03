import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'
import { errorResponseSchema } from './validation-schemas'

// Validation middleware factory
export function createValidationMiddleware<T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return async (request: NextRequest, context?: { params?: any }) => {
    try {
      let data: any

      // Extract data based on source
      switch (source) {
        case 'body':
          data = await request.json()
          break
        case 'query':
          data = Object.fromEntries(request.nextUrl.searchParams)
          break
        case 'params':
          data = context?.params || {}
          break
        default:
          throw new Error('Invalid validation source')
      }

      // Validate data against schema
      const validatedData = schema.parse(data)
      
      // Return validated data
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))

        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            message: 'Invalid input data',
            details: formattedErrors
          },
          { status: 400 }
        )
      }

      // Handle other errors (e.g., JSON parsing errors)
      console.error('Validation middleware error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Failed to process request data'
        },
        { status: 400 }
      )
    }
  }
}

// Validation wrapper for API routes
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (request: NextRequest, context: { params?: any }, data: T) => Promise<NextResponse>,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return async (request: NextRequest, context?: { params?: any }) => {
    // Run validation middleware
    const validationResult = await createValidationMiddleware(schema, source)(request, context)
    
    // If validation failed, return error response
    if (validationResult instanceof NextResponse) {
      return validationResult
    }
    
    // If validation succeeded, call the handler with validated data
    return handler(request, context || {}, validationResult.data)
  }
}

// Sanitization utilities
export const sanitizeInput = {
  // Remove HTML tags and special characters
  string: (input: string): string => {
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>]/g, '') // Remove remaining angle brackets
      .trim()
  },

  // Sanitize email
  email: (input: string): string => {
    return input.toLowerCase().trim()
  },

  // Sanitize phone number
  phone: (input: string): string => {
    return input.replace(/[^\d+\-\s\(\)]/g, '').trim()
  },

  // Sanitize numeric input
  number: (input: string): number => {
    const num = parseFloat(input.replace(/[^\d.\-]/g, ''))
    return isNaN(num) ? 0 : num
  },

  // Sanitize UUID
  uuid: (input: string): string => {
    return input.replace(/[^a-f0-9\-]/gi, '').toLowerCase()
  },

  // Sanitize array of strings
  stringArray: (input: string[]): string[] => {
    return input.map(item => sanitizeInput.string(item)).filter(item => item.length > 0)
  },

  // Remove potentially dangerous characters from file names
  fileName: (input: string): string => {
    return input
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid file name characters
      .replace(/\.\./g, '') // Remove directory traversal
      .trim()
  }
}

// Input sanitization middleware
export function createSanitizationMiddleware(fields: string[] = []) {
  return async (request: NextRequest) => {
    try {
      const body = await request.json()
      const sanitizedBody = { ...body }

      // Sanitize specified fields
      fields.forEach(field => {
        if (sanitizedBody[field] && typeof sanitizedBody[field] === 'string') {
          sanitizedBody[field] = sanitizeInput.string(sanitizedBody[field])
        }
      })

      // Create new request with sanitized body
      const sanitizedRequest = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(sanitizedBody)
      })

      return { success: true, request: sanitizedRequest, data: sanitizedBody }
    } catch (error) {
      console.error('Sanitization middleware error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Sanitization error',
          message: 'Failed to sanitize input data'
        },
        { status: 400 }
      )
    }
  }
}

// Rate limiting middleware (in-memory for demo, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function createRateLimitMiddleware(options: {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string // Custom error message
  skipSuccessfulRequests?: boolean // Don't count successful requests
}) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false
  } = options

  return async (request: NextRequest) => {
    const clientId = getClientIdentifier(request)
    const now = Date.now()
    
    // Get or create client record
    let clientRecord = rateLimitStore.get(clientId)
    
    if (!clientRecord || now > clientRecord.resetTime) {
      // Create new record or reset expired record
      clientRecord = {
        count: 1,
        resetTime: now + windowMs
      }
      rateLimitStore.set(clientId, clientRecord)
    } else {
      // Increment count
      clientRecord.count++
    }

    // Check if limit exceeded
    if (clientRecord.count > maxRequests) {
      const resetTime = Math.ceil((clientRecord.resetTime - now) / 1000)
      
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message,
          retryAfter: resetTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, maxRequests - clientRecord.count).toString(),
            'X-RateLimit-Reset': new Date(clientRecord.resetTime).toISOString(),
            'Retry-After': resetTime.toString()
          }
        }
      )
    }

    // Add rate limit headers to successful responses
    const headers = {
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - clientRecord.count).toString(),
      'X-RateLimit-Reset': new Date(clientRecord.resetTime).toISOString()
    }

    return { success: true, headers }
  }
}

// Helper function to get client identifier for rate limiting
function getClientIdentifier(request: NextRequest): string {
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

// Security headers middleware
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
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
    
    // Cleanup expired tokens
    cleanup: () => {
      const now = Date.now()
      for (const [sessionId, record] of csrfTokens.entries()) {
        if (now > record.expires) {
          csrfTokens.delete(sessionId)
        }
      }
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