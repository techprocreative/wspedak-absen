/**
 * API Authentication Middleware
 * Provides authentication and authorization for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { serverDbManager } from './server-db'

interface DecodedToken {
  userId: string
  email: string
  role: string
  iat: number
  exp: number
}

interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: string
  }
}

/**
 * Get token from request
 */
function getTokenFromRequest(request: NextRequest): string | null {
  // Try to get from Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Try to get from cookie
  const tokenCookie = request.cookies.get('session-token')
  if (tokenCookie) {
    return tokenCookie.value
  }
  
  return null
}

/**
 * Verify JWT token (Supabase or custom)
 */
async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    // First try to verify with Supabase
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (!error && user) {
        // Token is valid, return decoded info
        return {
          userId: user.id,
          email: user.email || '',
          role: user.user_metadata?.role || 'employee',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        }
      }
    }
    
    // Fallback to custom JWT verification
    const jwtSecret = process.env.JWT_SECRET
    if (jwtSecret) {
      const decoded = verify(token, jwtSecret) as DecodedToken
      return decoded
    }
    
    return null
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Base authentication middleware
 * Validates JWT token and attaches user to request
 */
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options?: {
    allowedRoles?: string[]
    requireAuth?: boolean
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requireAuth = options?.requireAuth ?? true
    
    // Get token
    const token = getTokenFromRequest(request)
    
    if (!token) {
      if (requireAuth) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - No authentication token provided' },
          { status: 401 }
        )
      }
      // Allow unauthenticated access if not required
      return handler(request as AuthenticatedRequest)
    }
    
    // Verify token
    const decoded = await verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid or expired token' },
        { status: 401 }
      )
    }
    
    // Check if user exists and is active
    const user = await serverDbManager.getUser(decoded.userId)
    
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - User not found or inactive' },
        { status: 401 }
      )
    }
    
    // Check role authorization
    if (options?.allowedRoles && !options.allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Forbidden - Insufficient permissions',
          required: options.allowedRoles,
          actual: user.role
        },
        { status: 403 }
      )
    }
    
    // Attach user to request
    const authRequest = request as AuthenticatedRequest
    authRequest.user = {
      id: user.id,
      email: user.email,
      role: user.role
    }
    
    // Create audit log for sensitive operations
    if (request.method !== 'GET') {
      // Log non-read operations
      await serverDbManager.createAuditLog({
        userId: user.id,
        action: `${request.method} ${request.nextUrl.pathname}`,
        resource: request.nextUrl.pathname.split('/')[3] || 'unknown',
        resourceId: request.nextUrl.pathname.split('/')[4],
        details: {
          method: request.method,
          url: request.nextUrl.toString()
        },
        ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
    }
    
    return handler(authRequest)
  }
}

/**
 * Admin-only authentication middleware
 * Requires admin, hr, or manager role
 */
export function withAdminAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(handler, {
    allowedRoles: ['admin', 'hr', 'manager'],
    requireAuth: true
  })
}

/**
 * Authenticated user middleware
 * Allows any authenticated user (all roles)
 */
export function withAnyAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(handler, {
    requireAuth: true
  })
}

/**
 * HR-only authentication middleware
 * Requires admin or hr role
 */
export function withHRAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(handler, {
    allowedRoles: ['admin', 'hr'],
    requireAuth: true
  })
}

/**
 * Super admin-only authentication middleware
 * Requires admin role only
 */
export function withSuperAdminAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(handler, {
    allowedRoles: ['admin'],
    requireAuth: true
  })
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 */
export function withOptionalAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(handler, {
    requireAuth: false
  })
}

/**
 * Type guard to check if request has user
 */
export function isAuthenticatedRequest(request: NextRequest): request is AuthenticatedRequest {
  return 'user' in request && request.user !== undefined
}

/**
 * Export types
 */
export type { AuthenticatedRequest, DecodedToken }
