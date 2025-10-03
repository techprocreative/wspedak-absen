"use client"

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Shield, AlertCircle } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { UserRole } from '@/lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  redirectTo?: string
  fallback?: React.ReactNode
  loadingComponent?: React.ReactNode
}

export function ProtectedRoute({
  children,
  requiredRoles,
  redirectTo = '/login',
  fallback,
  loadingComponent,
}: ProtectedRouteProps) {
  const { authState, hasAnyRole, isOnline } = useAuth()
  const router = useRouter()
  const [isInitialized, setIsInitialized] = React.useState(false)

  // Check if user is authenticated and has required roles
  const isAuthorized = authState.isAuthenticated && 
    (!requiredRoles || requiredRoles.length === 0 || hasAnyRole(requiredRoles))

  // Initialize and check authentication
  useEffect(() => {
    const checkAuth = async () => {
      // If still loading, wait
      if (authState.isLoading) return

      // If not authenticated, redirect to login
      if (!authState.isAuthenticated) {
        router.push(redirectTo)
        return
      }

      // If authenticated but not authorized, show unauthorized
      if (requiredRoles && requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
        setIsInitialized(true)
        return
      }

      setIsInitialized(true)
    }

    checkAuth()
  }, [authState, requiredRoles, hasAnyRole, router, redirectTo])

  // Show loading component while checking authentication
  if (authState.isLoading || !isInitialized) {
    return loadingComponent || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // Show unauthorized component if authenticated but not authorized
  if (authState.isAuthenticated && requiredRoles && requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full text-center p-6">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access this resource. Required roles: {requiredRoles.join(', ')}.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
            <AlertCircle className="w-4 h-4" />
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Show error component if there's an authentication error
  if (authState.error) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full text-center p-6">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
          <p className="text-muted-foreground mb-6">
            {authState.error.message || 'An error occurred during authentication.'}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
            <AlertCircle className="w-4 h-4" />
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <button
            onClick={() => router.push(redirectTo)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  // If authorized, render children
  if (isAuthorized) {
    return <>{children}</>
  }

  // Fallback to loading or redirect
  return loadingComponent || (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Checking permissions...</p>
      </div>
    </div>
  )
}

// Higher-order component for protecting routes
export function withProtection<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Role-based protection components
export function AdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRoles'>) {
  return (
    <ProtectedRoute requiredRoles={['admin']} {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function HrRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRoles'>) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'hr']} {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function ManagerRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRoles'>) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'hr', 'manager']} {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function EmployeeRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRoles'>) {
  return (
    <ProtectedRoute requiredRoles={['employee', 'admin', 'hr', 'manager']} {...props}>
      {children}
    </ProtectedRoute>
  )
}