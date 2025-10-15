import { cookies } from 'next/headers'
import { UserRole } from './auth'
import crypto from 'crypto'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Server-side auth session interface
export interface ServerAuthSession {
  user: {
    id: string
    email: string
    role: UserRole
    name?: string
  }
  isAuthenticated: boolean
  sessionToken?: string
  expiresAt?: number
}

// Get current auth session from cookies (server-side)
export const getServerAuthSession = (): ServerAuthSession | null => {
  try {
    const cookieStore = cookies()
    // Prefer new signed admin session cookie
    const adminCookie = cookieStore.get('admin_session')?.value
    const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || ''

    if (adminCookie && secret) {
      const payload = verifyAdminSessionCookieSync(adminCookie, secret)
      if (payload && payload.user) {
        return {
          user: {
            id: payload.user.id,
            email: payload.user.email,
            role: payload.user.role,
            name: payload.user.name,
          },
          isAuthenticated: true,
          sessionToken: payload.token,
          expiresAt: payload.exp,
        }
      }
    }

    // Backward compatibility: legacy JSON cookie (unsafe, deprecated)
    const legacy = cookieStore.get('auth_session')
    if (legacy?.value) {
      const session = JSON.parse(legacy.value) as ServerAuthSession
      if (session?.user && session.isAuthenticated && (!session.expiresAt || Date.now() <= session.expiresAt)) {
        return session
      }
    }

    return null
  } catch (error) {
    logger.error('Error parsing auth session', error as Error)
    return null
  }
}

// Minimal sync verification for Node runtime using crypto HMAC-SHA256
function base64urlToBuffer(input: string): Buffer {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4)
  return Buffer.from(b64, 'base64')
}

interface AdminCookiePayloadSync {
  user: { id: string; email: string; role: UserRole; name?: string }
  iat: number
  exp: number
  token?: string
}

function verifyAdminSessionCookieSync(cookieValue: string, secret: string): AdminCookiePayloadSync | null {
  try {
    const [payloadPart, signaturePart] = cookieValue.split('.')
    if (!payloadPart || !signaturePart) return null
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payloadPart)
      .digest()
    const provided = base64urlToBuffer(signaturePart)
    // Timing-safe compare
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      return null
    }
    const payloadJson = base64urlToBuffer(payloadPart).toString('utf8')
    const payload = JSON.parse(payloadJson) as AdminCookiePayloadSync
    if (!payload?.user?.role || Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

// Check if user has specific role (server-side)
export const hasServerRole = (role: UserRole): boolean => {
  const session = getServerAuthSession()
  if (!session?.user) return false
  
  return session.user.role === role
}

// Check if user has any of the specified roles (server-side)
export const hasAnyServerRole = (roles: UserRole[]): boolean => {
  const session = getServerAuthSession()
  if (!session?.user) return false
  
  return roles.includes(session.user.role)
}

// Check if user is authenticated as admin (server-side)
export const isServerAdminAuthenticated = (): boolean => {
  return hasAnyServerRole(['admin', 'hr', 'manager'])
}

// Validate session token (for API routes)
export const validateSessionToken = (token: string): boolean => {
  // In production, this should validate against a secure token store
  // For now, we'll check if it matches expected format
  if (!token || typeof token !== 'string') {
    return false
  }
  
  // Check if it's a demo token in development
  if (process.env.NODE_ENV !== 'production' && token === 'demo-token') {
    return true
  }
  
  // In production, validate against your token store
  return token.length > 20 // Basic validation
}

// Get user ID from session (for API routes)
export const getCurrentUserId = (): string | null => {
  const session = getServerAuthSession()
  return session?.user?.id || null
}

// Get user email from session (for audit logging)
export const getCurrentUserEmail = (): string | null => {
  const session = getServerAuthSession()
  return session?.user?.email || null
}
