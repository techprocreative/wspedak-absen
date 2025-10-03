import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookie } from '@/lib/session'

// Define which paths require authentication
const protectedPaths = [
  '/api/admin/',
  '/admin',
  '/admin/',
]

// Define which paths are public (don't require authentication)
const publicPaths = [
  '/admin/login',
  '/api/health',
  '/api/health/ping',
  '/api/attendance',
  '/api/business-metrics',
  '/api/errors',
  '/api/metrics',
  '/api/security',
  '/api/system',
  '/api/auth/session',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  if (isPublicPath) {
    return NextResponse.next()
  }

  // Check if the path requires authentication
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  if (!isProtectedPath) {
    return NextResponse.next()
  }

  // Prepare verification for admin session cookie
  const needsAdminAuth = (pathname === '/admin' || pathname.startsWith('/admin/')) && !pathname.startsWith('/admin/login')
    || pathname.startsWith('/api/admin/')

  if (needsAdminAuth) {
    const cookie = request.cookies.get('admin_session')?.value || ''
    const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || ''

    // Verify the signed cookie (Edge runtime via Web Crypto)
    const respondUnauthorized = () => {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (!cookie || !secret) {
      return respondUnauthorized()
    }

    const session = await verifySessionCookie(cookie, secret)
    if (!session || !['admin', 'hr', 'manager'].includes(session.user.role)) {
      return respondUnauthorized()
    }
  }

  // Add security headers
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Add CSP header in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
    )
  }

  // Add rate limiting headers
  response.headers.set('X-RateLimit-Limit', '100')
  response.headers.set('X-RateLimit-Remaining', '99')
  response.headers.set('X-RateLimit-Reset', new Date(Date.now() + 3600000).toISOString())

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
