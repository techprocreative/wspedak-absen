"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  AuthSession,
  UserRole,
  AuthUser,
  authenticateUser,
  signOut,
  initializeAuth,
  refreshSession,
  normalizeUserRole
} from '@/lib/auth'
import { supabaseService, setupNetworkListeners, setupAuthListeners, AuthState } from '@/lib/supabase'

interface AuthContextType {
  authState: AuthSession
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
  refreshAuthSession: () => Promise<void>
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  isOnline: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthSession>({
    user: null,
    session: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
  })
  const [isOnline, setIsOnline] = useState(supabaseService.isOnline())

  // Initialize authentication state
  useEffect(() => {
    const initializeAuthState = async () => {
      try {
        const session = await initializeAuth()
        setAuthState(session)
      } catch (error) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: error as Error,
        }))
      }
    }

    initializeAuthState()

    // Set up network status listeners
    const cleanupNetwork = setupNetworkListeners((online) => {
      setIsOnline(online)
      
      // When coming back online, try to refresh the session
      if (online && authState.isAuthenticated) {
        refreshAuthSession()
      }
    })

    // Set up auth state listeners
    const cleanupAuth = setupAuthListeners((authState: AuthState) => {
      // Convert AuthState to AuthSession
      let authUser: AuthUser | null = null
      
      if (authState.user) {
        // Convert User to AuthUser
        const role = normalizeUserRole(authState.user.user_metadata?.role || authState.user.role)
        authUser = {
          ...authState.user,
          role,
          name: authState.user.user_metadata?.name || authState.user.email?.split('@')[0] || 'User',
        }
      }
      
      const session: AuthSession = {
        user: authUser,
        session: authState.session,
        isLoading: authState.isLoading,
        error: authState.error,
        isAuthenticated: !!authState.user && !!authState.session,
      }
      setAuthState(session)
    })

    // Cleanup listeners on unmount
    return () => {
      cleanupNetwork?.()
      cleanupAuth?.()
    }
  }, [])

  // Login function
  const login = async (email: string, password: string, rememberMe = false) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const session = await authenticateUser(email, password, rememberMe)
      setAuthState(session)
      
      if (session.error) {
        throw session.error
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }))
      throw error
    }
  }

  // Logout function
  const logout = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    
    try {
      await signOut()
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
      })
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }))
    }
  }

  // Refresh session function
  const refreshAuthSession = async () => {
    if (!authState.isAuthenticated) return
    
    setAuthState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const session = await refreshSession()
      
      if (session) {
        setAuthState(session)
      } else {
        // If refresh fails, sign out
        await logout()
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }))
    }
  }

  // Role checking functions
  const checkHasRole = (role: UserRole): boolean => {
    if (!authState.user) return false
    return normalizeUserRole(authState.user.role) === normalizeUserRole(role)
  }

  const checkHasAnyRole = (roles: UserRole[]): boolean => {
    if (!authState.user) return false
    const userRole = normalizeUserRole(authState.user.role)
    return roles.some((role) => normalizeUserRole(role) === userRole)
  }

  const value: AuthContextType = {
    authState,
    login,
    logout,
    refreshAuthSession,
    hasRole: checkHasRole,
    hasAnyRole: checkHasAnyRole,
    isOnline,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}