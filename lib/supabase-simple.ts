/**
 * Simplified Supabase Client
 * Single instance without connection pooling to avoid multiple GoTrueClient warnings
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from './logger'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create a single Supabase client instance
let supabaseClient: SupabaseClient | null = null

/**
 * Get the Supabase client instance (singleton)
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        headers: {
          'x-application-name': 'v0-attendance'
        }
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
    
    logger.info('Supabase client initialized')
  }
  
  return supabaseClient
}

// Export the singleton client
export const supabase = getSupabaseClient()

// Helper functions for common operations
export const supabaseHelpers = {
  /**
   * Get current user
   */
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      logger.error('Error getting current user', error)
      return null
    }
    return user
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      logger.error('Error getting session', error)
      return null
    }
    return session
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      logger.error('Sign in error', error)
      throw error
    }
    
    return data
  },

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      logger.error('Sign out error', error)
      throw error
    }
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession()
    return !!session
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Export helper to check online status
export const isOnline = () => {
  if (typeof window === 'undefined') return true
  return navigator.onLine
}

// Setup network status listeners
export const setupNetworkListeners = (callback: (isOnline: boolean) => void) => {
  if (typeof window === 'undefined') return

  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
