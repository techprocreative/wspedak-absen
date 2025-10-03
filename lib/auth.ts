"use client"

import { supabase, supabaseService } from './supabase'
import { storageService } from './storage'
import { secureStorage, setSecureItem, getSecureItem, removeSecureItem, setSecureSessionData, getSecureSessionData } from './secure-storage'
import { User, Session } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// User role types
export type UserRole = "employee" | "admin" | "hr" | "manager"

// Extended user interface with role
export const normalizeUserRole = (role: unknown): UserRole => {
  if (typeof role === 'string') {
    const normalized = role.trim().toLowerCase()
    if (normalized === 'admin' || normalized === 'hr' || normalized === 'manager' || normalized === 'employee') {
      return normalized as UserRole
    }
  }
  return 'employee'
}

export interface AuthUser extends User {
  role: UserRole
  name?: string
}

// Auth session interface
export interface AuthSession {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  error: Error | null
  isAuthenticated: boolean
}

// Offline credentials interface
export interface OfflineCredentials {
  email: string
  hashedPassword: string
  role: UserRole
  name: string
  lastSync: string
}

// Legacy admin session interface for backward compatibility
export interface AdminSession {
  user: string
  role: "admin" | "hr" | "manager"
  loginTime: string
}

// Storage keys
const AUTH_SESSION_KEY = 'auth_session'
const OFFLINE_CREDENTIALS_KEY = 'offline_credentials'
const REMEMBER_ME_KEY = 'remember_me'
const SESSION_DATA_KEY = 'session_data'

// Get current auth session from secure storage
export const getAuthSession = (): AuthSession | null => {
  if (typeof window === "undefined") return null

  try {
    return getSecureItem<AuthSession>(AUTH_SESSION_KEY)
  } catch {
    return null
  }
}

// Save auth session to secure storage
export const setAuthSession = async (session: AuthSession): Promise<void> => {
  if (typeof window === "undefined") return

  const normalizedSession: AuthSession = {
    ...session,
    user: session.user
      ? {
          ...session.user,
          role: normalizeUserRole(session.user.role),
        }
      : null,
  }

  setSecureItem(AUTH_SESSION_KEY, normalizedSession)
  
  // Request server to set a signed HttpOnly admin session cookie
  if (session.isAuthenticated && session.user) {
    const serverSession = {
      user: {
        id: session.user.id,
        email: session.user.email,
        role: normalizeUserRole(session.user.role),
        name: session.user.name,
      },
      sessionToken: session.session?.access_token || 'offline-token',
      expiresAt: session.session?.expires_at ? session.session.expires_at * 1000 : Date.now() + 3600000, // 1 hour
    }
    try {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Ensure cookies are sent and skip any caching
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify(serverSession),
      })
    } catch (e) {
      console.warn('Failed to set admin session cookie:', e)
    }
  }
}

// Clear auth session from secure storage
export const clearAuthSession = (): void => {
  if (typeof window === "undefined") return
  removeSecureItem(AUTH_SESSION_KEY)
  removeSecureItem(SESSION_DATA_KEY)
  
  // Clear signed HttpOnly cookie via API
  ;(async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' })
    } catch (e) {
      console.warn('Failed to clear admin session cookie:', e)
    }
  })()
}

// Get offline credentials from secure storage
export const getOfflineCredentials = (): OfflineCredentials | null => {
  if (typeof window === "undefined") return null

  try {
    return getSecureItem<OfflineCredentials>(OFFLINE_CREDENTIALS_KEY)
  } catch {
    return null
  }
}

// Save offline credentials to secure storage
export const setOfflineCredentials = (credentials: OfflineCredentials): void => {
  if (typeof window === "undefined") return
  setSecureItem(OFFLINE_CREDENTIALS_KEY, credentials)
}

// Clear offline credentials from secure storage
export const clearOfflineCredentials = (): void => {
  if (typeof window === "undefined") return
  removeSecureItem(OFFLINE_CREDENTIALS_KEY)
}

// Get remember me preference
export const getRememberMe = (): boolean => {
  if (typeof window === "undefined") return false

  try {
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY)
    return rememberMe ? JSON.parse(rememberMe) : false
  } catch {
    return false
  }
}

// Set remember me preference
export const setRememberMe = (remember: boolean): void => {
  if (typeof window === "undefined") return
  localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify(remember))
}

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const session = getAuthSession()
  return session ? session.isAuthenticated : false
}

// Check if user has specific role
export const hasRole = (role: UserRole): boolean => {
  const session = getAuthSession()
  if (!session?.user) return false
  const userRole = normalizeUserRole(session.user.role)
  return userRole === normalizeUserRole(role)
}

// Check if user has any of the specified roles
export const hasAnyRole = (roles: UserRole[]): boolean => {
  const session = getAuthSession()
  if (!session?.user) return false
  const userRole = normalizeUserRole(session.user.role)
  return roles.some((role) => normalizeUserRole(role) === userRole)
}

// Hash password using bcrypt for secure storage
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

// Verify password against bcrypt hash with backward compatibility
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    // First try bcrypt verification
    const isValid = await bcrypt.compare(password, hash)
    if (isValid) return true
    
    // Check if it's an old simple hash (for backward compatibility)
    // Old hashes are typically shorter hexadecimal strings
    if (hash.length < 32 && /^[a-f0-9]+$/.test(hash)) {
      const oldHash = simpleHash(password)
      return oldHash === hash
    }
    
    return false
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

// Legacy simple hash function for backward compatibility only
const simpleHash = (password: string): string => {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(16)
}

// Authenticate user with Supabase
export const authenticateUser = async (email: string, password: string, rememberMe = false): Promise<AuthSession> => {
  try {
    // Debug logging
    console.log('authenticateUser called:', {
      email,
      passwordLength: password.length,
      rememberMe,
      isOnline: supabaseService.isOnline(),
      nodeEnv: process.env.NODE_ENV,
      allowDemo: process.env.ALLOW_DEMO_CREDENTIALS
    })

    // Try to authenticate with Supabase first
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    console.log('Supabase auth result:', {
      success: !error,
      error: error?.message,
      hasData: !!data,
      hasUser: !!data?.user,
      hasSession: !!data?.session
    })
    
    if (error) {
      // No demo fallback in production
      throw error
    }
    
    if (data.user && data.session) {
      // Determine user role and name
      let role = normalizeUserRole(data.user.user_metadata?.role)
      let name = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'

      try {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, name')
          .eq('id', data.user.id)
          .maybeSingle()

        if (profileError) {
          console.warn('Failed to load user profile for role resolution:', profileError)
        } else if (profile) {
          if (profile.role) {
            role = normalizeUserRole(profile.role)
          }
          if (profile.name) {
            name = profile.name
          }
        }
      } catch (profileError) {
        console.warn('Unexpected error while loading user profile:', profileError)
      }

      // Create extended user object
      const authUser: AuthUser = {
        ...data.user,
        role,
        name,
      }
      
      // Create auth session
      const authSession: AuthSession = {
        user: authUser,
        session: data.session,
        isLoading: false,
        error: null,
        isAuthenticated: true,
      }
      
      // Save session to storage and ensure server cookie is set
      await setAuthSession(authSession)
      
      // Store sensitive session data with expiry
      setSecureSessionData(SESSION_DATA_KEY, {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        user_id: data.user?.id
      }, 60) // 1 hour expiry
      
      // Save offline credentials if remember me is enabled
      if (rememberMe) {
        const hashedPassword = await hashPassword(password)
        const offlineCredentials: OfflineCredentials = {
          email,
          hashedPassword,
          role,
          name,
          lastSync: new Date().toISOString(),
        }
        setOfflineCredentials(offlineCredentials)
        setRememberMe(true)
      } else {
        clearOfflineCredentials()
        setRememberMe(false)
      }
      
      return authSession
    }
    
    throw new Error('Authentication failed')
  } catch (error) {
    // If online authentication fails, try offline authentication
    if (!supabaseService.isOnline()) {
      return authenticateOffline(email, password)
    }
    
    return {
      user: null,
      session: null,
      isLoading: false,
      error: error as Error,
      isAuthenticated: false,
    }
  }
}

// Authenticate user offline
export const authenticateOffline = async (email: string, password: string): Promise<AuthSession> => {
  try {
    const credentials = getOfflineCredentials()
    
    if (!credentials || credentials.email !== email) {
      throw new Error('No offline credentials found')
    }
    
    if (!(await verifyPassword(password, credentials.hashedPassword))) {
      throw new Error('Invalid password')
    }
    
    const role = normalizeUserRole(credentials.role)
    
    // Create a mock session for offline use
    const offlineSession: AuthSession = {
      user: {
        id: 'offline-user',
        email: credentials.email,
        role,
        name: credentials.name,
        aud: 'offline',
        created_at: credentials.lastSync,
        updated_at: credentials.lastSync,
      } as AuthUser,
      session: {
        access_token: 'offline-token',
        refresh_token: 'offline-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'offline-user',
          email: credentials.email,
          aud: 'offline',
          created_at: credentials.lastSync,
          updated_at: credentials.lastSync,
        },
      } as Session,
      isLoading: false,
      error: null,
      isAuthenticated: true,
    }
    
    // Save session to storage and ensure server cookie is set
    await setAuthSession(offlineSession)
    
    // Store offline session data with expiry
    setSecureSessionData(SESSION_DATA_KEY, {
      access_token: 'offline-token',
      refresh_token: 'offline-refresh',
      user_id: 'offline-user'
    }, 60) // 1 hour expiry
    
    return offlineSession
  } catch (error) {
    return {
      user: null,
      session: null,
      isLoading: false,
      error: error as Error,
      isAuthenticated: false,
    }
  }
}

// Sign out user
export const signOut = async (): Promise<void> => {
  try {
    // Try to sign out from Supabase if online
    if (supabaseService.isOnline()) {
      await supabase.auth.signOut()
    }
    
    // Clear local storage
    clearAuthSession()
    
    // Clear offline credentials if remember me is not enabled
    if (!getRememberMe()) {
      clearOfflineCredentials()
    }
  } catch (error) {
    console.error('Error signing out:', error)
    // Still clear local storage even if Supabase sign out fails
    clearAuthSession()
  }
}

// Refresh session
export const refreshSession = async (): Promise<AuthSession | null> => {
  try {
    if (!supabaseService.isOnline()) {
      // If offline, return current session if it exists
      return getAuthSession()
    }
    
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      throw error
    }
    
    if (data.session) {
      const currentSession = getAuthSession()
      
      if (currentSession && currentSession.user) {
        const authSession: AuthSession = {
          ...currentSession,
          session: data.session,
          isLoading: false,
          error: null,
          isAuthenticated: true,
        }
        
        await setAuthSession(authSession)
        return authSession
      }
    }
    
    return null
  } catch (error) {
    console.error('Error refreshing session:', error)
    return null
  }
}

// Initialize auth state
export const initializeAuth = async (): Promise<AuthSession> => {
  try {
    // Check if we have a stored session
    const storedSession = getAuthSession()
    const normalizedStoredSession = storedSession && storedSession.user
      ? {
          ...storedSession,
          user: {
            ...storedSession.user,
            role: normalizeUserRole(storedSession.user.role),
          },
        }
      : storedSession

    if (normalizedStoredSession) {
      await setAuthSession(normalizedStoredSession)
    }

    if (normalizedStoredSession && normalizedStoredSession.isAuthenticated) {
      // If we're online, try to refresh the session
      if (supabaseService.isOnline()) {
        const refreshedSession = await refreshSession()
        return refreshedSession || normalizedStoredSession
      }
      
      // If offline, return the stored session
      return normalizedStoredSession
    }
    
    // No stored session; even if offline credentials exist, do not auto-login with hashed password
    // Require explicit user login input to verify password.
    
    // No session or credentials, return empty session
    return {
      user: null,
      session: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
    }
  } catch (error) {
    console.error('Error initializing auth:', error)
    return {
      user: null,
      session: null,
      isLoading: false,
      error: error as Error,
      isAuthenticated: false,
    }
  }
}

// Legacy functions for backward compatibility
export const getAdminSession = (): AdminSession | null => {
  const session = getAuthSession()
  if (!session || !session.user || !hasAnyRole(['admin', 'hr', 'manager'])) return null

  return {
    user: session.user.name || session.user.email || '',
    role: session.user.role as "admin" | "hr" | "manager",
    loginTime: session.session?.expires_at
      ? new Date(session.session.expires_at * 1000).toISOString()
      : new Date().toISOString(),
  }
}

export const setAdminSession = (session: AdminSession): void => {
  // This function is kept for backward compatibility but should not be used in new code
  console.warn('setAdminSession is deprecated. Use the new authentication system instead.')
}

export const clearAdminSession = (): void => {
  // This function is kept for backward compatibility but should not be used in new code
  console.warn('clearAdminSession is deprecated. Use signOut instead.')
  clearAuthSession()
}

export const isAdminAuthenticated = (): boolean => {
  return hasAnyRole(['admin', 'hr', 'manager'])
}

// Mock user database - REMOVED for security
// In production, all users should be stored in a secure database with properly hashed passwords
// The mock users have been removed to eliminate hardcoded credentials
export const mockUsers: never[] = []

// Function to validate demo credentials (only in development)
// Demo credential validation removed for production readiness

// JWT Verification for API routes (server-side)
export interface JWTVerifyResult {
  valid: boolean
  payload?: {
    userId: string
    email: string
    role: UserRole
    name?: string
  }
  error?: string
}

export async function verifyJWT(request: Request): Promise<JWTVerifyResult> {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        error: 'Missing or invalid Authorization header'
      }
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // In development, allow demo token
    if (process.env.NODE_ENV !== 'production' && token === 'demo-token') {
      return {
        valid: true,
        payload: {
          userId: 'demo-user',
          email: 'demo@example.com',
          role: 'employee'
        }
      }
    }

    // For production, verify against Supabase session
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return {
        valid: false,
        error: 'Invalid or expired token'
      }
    }

    // Get user metadata from database
    const { data: userData } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', user.id)
      .single()

    return {
      valid: true,
      payload: {
        userId: user.id,
        email: user.email || '',
        role: normalizeUserRole(userData?.role),
        name: userData?.name
      }
    }
  } catch (error) {
    console.error('JWT verification error:', error)
    return {
      valid: false,
      error: 'Token verification failed'
    }
  }
}
