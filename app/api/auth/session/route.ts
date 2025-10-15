import { NextRequest, NextResponse } from 'next/server'
import { signSessionCookie, type AdminSessionPayload } from '@/lib/session'
import { validateSessionToken } from '@/lib/server-auth'
import { logger, logAuthEvent } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = new Set(['admin', 'hr', 'manager', 'employee'])

// POST /api/auth/session - Set signed HttpOnly admin session cookie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user, sessionToken, expiresAt } = body || {}

    if (!user || !user.id || !user.email || !user.role) {
      return NextResponse.json({ success: false, error: 'Invalid user payload' }, { status: 400 })
    }
    if (!ALLOWED_ROLES.has(String(user.role))) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 })
    }

    // Validate token (basic). In production consider validating with the IdP.
    if (!validateSessionToken(sessionToken)) {
      // Allow offline token only in development for offline mode
      if (!(process.env.NODE_ENV !== 'production' && sessionToken === 'offline-token')) {
        return NextResponse.json({ success: false, error: 'Invalid session token' }, { status: 401 })
      }
    }

    const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || ''
    if (!secret) {
      return NextResponse.json({ success: false, error: 'Missing SESSION_SECRET' }, { status: 500 })
    }

    const now = Date.now()
    const exp = typeof expiresAt === 'number' ? expiresAt : now + 60 * 60 * 1000

    const payload: AdminSessionPayload = {
      user: {
        id: String(user.id),
        email: String(user.email),
        role: String(user.role) as any,
        name: user.name ? String(user.name) : undefined,
      },
      iat: now,
      exp,
      token: typeof sessionToken === 'string' ? sessionToken : undefined,
    }

    const cookieValue = await signSessionCookie(payload, secret)
    const res = NextResponse.json({ success: true })
    res.cookies.set({
      name: 'admin_session',
      value: cookieValue,
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(exp),
    })
    return res
  } catch (error) {
    logger.error('Error setting admin session cookie', error as Error)
    return NextResponse.json({ success: false, error: 'Failed to set session cookie' }, { status: 500 })
  }
}

// DELETE /api/auth/session - Clear admin session cookie
export async function DELETE() {
  try {
    const res = NextResponse.json({ success: true })
    res.cookies.set({
      name: 'admin_session',
      value: '',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(0),
    })
    return res
  } catch (error) {
    logger.error('Error clearing admin session cookie', error as Error)
    return NextResponse.json({ success: false, error: 'Failed to clear session cookie' }, { status: 500 })
  }
}
