import { NextRequest, NextResponse } from 'next/server'
import { addSecurityHeaders } from './security-middleware'
import { createAuthRateLimit, createAccountLockout, BruteForceProtection } from './security-middleware'
import { csrfProtection } from './security-middleware'
import { logSecurityEvent } from './security-middleware'

// Main API middleware wrapper
export function withSecurityMiddleware(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean
    rateLimit?: boolean
    csrfProtection?: boolean
    accountLockout?: boolean
    allowedRoles?: string[]
  } = {}
) {
  return async (request: NextRequest, context?: any) => {
    const startTime = Date.now()
    const url = new URL(request.url)
    const method = request.method

    try {
      // Apply rate limiting
      if (options.rateLimit !== false) {
        const rateLimitResponse = await createAuthRateLimit()(request)
        if (rateLimitResponse) return rateLimitResponse
      }

      // Apply account lockout for auth endpoints
      if (options.accountLockout && (url.pathname.includes('/auth/') || url.pathname.includes('/login'))) {
        const lockoutResponse = await createAccountLockout()(request)
        if (lockoutResponse) return lockoutResponse
      }

      // Apply CSRF protection for state-changing methods
      if (options.csrfProtection && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        const csrfResponse = await csrfProtection.middleware(request)
        if (csrfResponse) return csrfResponse
      }

      // Apply authentication if required
      if (options.requireAuth) {
        const authResponse = await handleAuthentication(request, options.allowedRoles)
        if (authResponse) return authResponse
      }

      // Execute the main handler
      const response = await handler(request, context)

      // Add security headers to response
      const secureResponse = addSecurityHeaders(response)

      // Log successful request
      logSecurityEvent('api_request_success', {
        method,
        path: url.pathname,
        duration: Date.now() - startTime,
        statusCode: secureResponse.status
      }, 'low')

      return secureResponse
    } catch (error) {
      console.error('API middleware error:', error)
      
      // Log security event for errors
      logSecurityEvent('api_request_error', {
        method,
        path: url.pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }, 'medium')

      const errorResponse = NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: 'An unexpected error occurred'
        },
        { status: 500 }
      )

      return addSecurityHeaders(errorResponse)
    }
  }
}

// Authentication handler
async function handleAuthentication(
  request: NextRequest,
  allowedRoles?: string[]
): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const response = NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      },
      { status: 401 }
    )
    return addSecurityHeaders(response)
  }

  const token = authHeader.substring(7)
  
  try {
    // Import here to avoid circular dependencies
    const { verifyToken } = await import('./auth-middleware')
    const tokenVerification = await verifyToken(token)
    
    if (!tokenVerification.valid) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        },
        { status: 401 }
      )
      return addSecurityHeaders(response)
    }

    // Check role-based access
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = tokenVerification.payload.user_metadata?.role
      if (!userRole || !allowedRoles.includes(userRole)) {
        const response = NextResponse.json(
          {
            success: false,
            error: 'Forbidden',
            message: 'Insufficient permissions'
          },
          { status: 403 }
        )
        return addSecurityHeaders(response)
      }
    }

    // Add user info to request headers for downstream handlers
    request.headers.set('x-user-id', tokenVerification.payload.id)
    request.headers.set('x-user-email', tokenVerification.payload.email || '')
    request.headers.set('x-user-role', tokenVerification.payload.user_metadata?.role || 'employee')

    return null // Continue with request
  } catch (error) {
    console.error('Authentication error:', error)
    
    const response = NextResponse.json(
      {
        success: false,
        error: 'Authentication error',
        message: 'Failed to authenticate request'
      },
      { status: 401 }
    )
    return addSecurityHeaders(response)
  }
}

// Rate limiting middleware for specific endpoints
export function createCustomRateLimit(options: {
  windowMs: number
  maxRequests: number
  identifier?: (request: NextRequest) => string
}) {
  const { windowMs, maxRequests, identifier } = options
  const store = new Map<string, { count: number; resetTime: number }>()

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const clientId = identifier ? identifier(request) : getClientIdentifier(request)
    const now = Date.now()
    
    let record = store.get(clientId)
    
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      }
      store.set(clientId, record)
    } else {
      record.count++
    }

    const remaining = Math.max(0, maxRequests - record.count)
    
    if (record.count > maxRequests) {
      const resetTime = Math.ceil((record.resetTime - now) / 1000)
      
      const response = NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many requests, please try again later',
          retryAfter: resetTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
            'Retry-After': resetTime.toString()
          }
        }
      )
      return addSecurityHeaders(response)
    }

    // Add rate limit headers to the response
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', maxRequests.toString())
    headers.set('X-RateLimit-Remaining', remaining.toString())
    headers.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString())

    return null // Continue with request
  }
}

// Helper function to get client identifier
function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  let ip = forwardedFor?.split(',')[0] || 
           realIp || 
           cfConnectingIp || 
           'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return Buffer.from(`${ip}:${userAgent}`).toString('base64').substring(0, 32)
}

// Input validation middleware
export function withInputValidation(
  schema: any,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse | null> => {
    try {
      let data: any

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

      const validatedData = schema.parse(data)
      
      // Add validated data to request headers for downstream handlers
      request.headers.set('x-validated-data', JSON.stringify(validatedData))
      
      return null // Continue with request
    } catch (error: any) {
      if (error.errors) {
        // Zod validation error
        const formattedErrors = error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))

        const response = NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            message: 'Invalid input data',
            details: formattedErrors
          },
          { status: 400 }
        )
        return addSecurityHeaders(response)
      }

      const response = NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Failed to validate input data'
        },
        { status: 400 }
      )
      return addSecurityHeaders(response)
    }
  }
}

// Error handling middleware
export function withErrorHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error('API handler error:', error)
      
      logSecurityEvent('api_handler_error', {
        path: new URL(request.url).pathname,
        method: request.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high')

      const response = NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: 'An unexpected error occurred'
        },
        { status: 500 }
      )
      return addSecurityHeaders(response)
    }
  }
}

// Request logging middleware
export function withRequestLogging(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now()
    const url = new URL(request.url)
    
    console.log(`[API] ${request.method} ${url.pathname} - Request started`)
    
    try {
      const response = await handler(request, context)
      const duration = Date.now() - startTime
      
      console.log(`[API] ${request.method} ${url.pathname} - ${response.status} (${duration}ms)`)
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      console.error(`[API] ${request.method} ${url.pathname} - Error (${duration}ms)`, error)
      throw error
    }
  }
}