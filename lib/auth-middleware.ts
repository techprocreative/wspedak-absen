import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { UserRole } from './auth'

// Create a Supabase client for server-side use
function createSupabaseClient(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  )

  return { supabase }
}

// Middleware to protect routes
export async function middleware(request: NextRequest) {
  const { supabase } = createSupabaseClient(request)
  let supabaseResponse = NextResponse.next({
    request,
  })
  
  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Define protected routes and their required roles
  const protectedRoutes: Record<string, UserRole[]> = {
    '/admin/dashboard': ['admin', 'hr', 'manager'],
    '/admin/users': ['admin'],
    '/admin/attendance': ['admin', 'hr', 'manager'],
    '/admin/reports': ['admin', 'hr', 'manager'],
    '/admin/settings': ['admin'],
    '/hr/dashboard': ['admin', 'hr'],
    '/hr/employees': ['admin', 'hr'],
    '/hr/attendance': ['admin', 'hr', 'manager'],
    '/hr/reports': ['admin', 'hr'],
    '/manager/dashboard': ['admin', 'hr', 'manager'],
    '/manager/team': ['admin', 'hr', 'manager'],
    '/manager/attendance': ['admin', 'hr', 'manager'],
    '/employee/dashboard': ['employee', 'admin', 'hr', 'manager'],
    '/employee/attendance': ['employee', 'admin', 'hr', 'manager'],
    '/employee/profile': ['employee', 'admin', 'hr', 'manager'],
  }

  // Get the pathname
  const { pathname } = request.nextUrl

  // Check if the current path is a protected route
  const isProtectedRoute = Object.keys(protectedRoutes).some(route => 
    pathname.startsWith(route)
  )

  // If it's a protected route and no session, redirect to login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If it's a protected route and we have a session, check user role
  if (isProtectedRoute && session) {
    // Get user role from user metadata
    const userRole = session.user.user_metadata?.role as UserRole || 'employee'
    
    // Find the most specific route that matches the current path
    const matchedRoute = Object.keys(protectedRoutes)
      .filter(route => pathname.startsWith(route))
      .sort((a, b) => b.length - a.length)[0] // Get the longest matching route
    
    if (matchedRoute) {
      const requiredRoles = protectedRoutes[matchedRoute]
      
      // If user doesn't have the required role, redirect to unauthorized
      if (!requiredRoles.includes(userRole)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }
  }

  // If user is authenticated and tries to access login page, redirect to dashboard
  if (session && pathname === '/login') {
    // Determine redirect based on user role
    const userRole = session.user.user_metadata?.role as UserRole || 'employee'
    
    let redirectPath = '/employee/dashboard'
    if (userRole === 'admin' || userRole === 'hr' || userRole === 'manager') {
      redirectPath = '/admin/dashboard'
    }
    
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  return supabaseResponse
}

// Config for which routes the middleware should run
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}

// Helper function to verify JWT token
export async function verifyToken(token: string): Promise<{ valid: boolean; payload?: any }> {
  try {
    const { supabase } = createSupabaseClient(new NextRequest('http://localhost'))
    
    const { data, error } = await supabase.auth.getUser(token)
    
    if (error || !data.user) {
      return { valid: false }
    }
    
    return { valid: true, payload: data.user }
  } catch (error) {
    return { valid: false }
  }
}

// Helper function to check if user has required role
export async function hasRequiredRole(
  request: NextRequest, 
  requiredRoles: UserRole[]
): Promise<boolean> {
  const { supabase } = createSupabaseClient(request)
  
  const {
    data: { session },
  } = await supabase.auth.getSession()
  
  if (!session) {
    return false
  }
  
  const userRole = session.user.user_metadata?.role as UserRole || 'employee'
  
  return requiredRoles.includes(userRole)
}

// Helper function to get current user from request
export async function getCurrentUser(request: NextRequest) {
  const { supabase } = createSupabaseClient(request)
  
  const {
    data: { session },
  } = await supabase.auth.getSession()
  
  if (!session) {
    return null
  }
  
  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.user_metadata?.role as UserRole || 'employee',
    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
  }
}

// Helper function to refresh session
export async function refreshSession(request: NextRequest) {
  const { supabase } = createSupabaseClient(request)
  let supabaseResponse = NextResponse.next({
    request,
  })
  
  const {
    data: { session },
    error,
  } = await supabase.auth.refreshSession()
  
  if (error) {
    return { session: null, error }
  }
  
  return { session, supabaseResponse }
}