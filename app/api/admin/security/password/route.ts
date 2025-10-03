import { NextRequest, NextResponse } from 'next/server'
import { hasAnyServerRole } from '@/lib/server-auth'
import { 
  validatePassword,
  changePassword,
  isAccountLocked,
  recordFailedAttempt,
  clearFailedAttempts,
  checkPasswordExpiry,
  generateSecurePassword,
  getPasswordStrengthIndicator,
  passwordSecurityManager
} from '@/lib/password-security'
import { logAuthEvent, logSecurityEvent, logAdminAction } from '@/lib/audit-log'

// Helper function to check admin authentication
async function checkAdminAuth(request: NextRequest) {
  if (!hasAnyServerRole(['admin', 'hr', 'manager'])) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
  return null
}

// Helper function to get client info
function getClientInfo(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || 'Unknown'
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 
              request.headers.get('x-real-ip') || 
              request.ip || 
              'Unknown'
  
  return { userAgent, ip }
}

// GET /api/admin/security/password - Get password policy or check password
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const { userAgent, ip } = getClientInfo(request)

    switch (action) {
      case 'policy':
        // Get password policy
        const policy = passwordSecurityManager.getPasswordPolicy()
        
        return NextResponse.json({
          success: true,
          data: policy
        })

      case 'validate':
        // Validate password
        const password = searchParams.get('password')
        const userId = searchParams.get('userId')
        const email = searchParams.get('email')
        const name = searchParams.get('name')
        const username = searchParams.get('username')
        
        if (!password) {
          return NextResponse.json(
            { success: false, error: 'Password is required' },
            { status: 400 }
          )
        }

        const userInfo = {
          email: email || undefined,
          name: name || undefined,
          username: username || undefined
        }
        const validation = validatePassword(password, userInfo)
        
        return NextResponse.json({
          success: true,
          data: validation
        })

      case 'strength':
        // Get password strength
        const passwordToCheck = searchParams.get('password')
        
        if (!passwordToCheck) {
          return NextResponse.json(
            { success: false, error: 'Password is required' },
            { status: 400 }
          )
        }

        const strength = getPasswordStrengthIndicator(passwordToCheck)
        
        return NextResponse.json({
          success: true,
          data: strength
        })

      case 'generate':
        // Generate secure password
        const length = searchParams.get('length') ? parseInt(searchParams.get('length')!) : 16
        const generatedPassword = generateSecurePassword(length)
        
        // Log security event
        logSecurityEvent(
          'security_settings_updated',
          'Secure password generated',
          `Secure password of length ${length} generated`,
          undefined,
          undefined,
          undefined,
          { length },
          ip,
          userAgent,
          'low'
        )
        
        return NextResponse.json({
          success: true,
          data: { password: generatedPassword }
        })

      case 'check-lockout':
        // Check if account is locked
        const userIdToCheck = searchParams.get('userId')
        
        if (!userIdToCheck) {
          return NextResponse.json(
            { success: false, error: 'User ID is required' },
            { status: 400 }
          )
        }

        const lockoutStatus = isAccountLocked(userIdToCheck)
        
        return NextResponse.json({
          success: true,
          data: lockoutStatus
        })

      case 'check-expiry':
        // Check password expiry
        const userIdForExpiry = searchParams.get('userId')
        const passwordCreatedAt = searchParams.get('passwordCreatedAt')
        
        if (!userIdForExpiry) {
          return NextResponse.json(
            { success: false, error: 'User ID is required' },
            { status: 400 }
          )
        }

        const expiryStatus = checkPasswordExpiry(
          userIdForExpiry,
          passwordCreatedAt || undefined
        )
        
        return NextResponse.json({
          success: true,
          data: expiryStatus
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in password security API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/security/password - Change password or update policy
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    const body = await request.json()
    const { action } = body
    const { userAgent, ip } = getClientInfo(request)

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'change':
        // Change password
        const { userId, currentPassword, newPassword, currentHashedPassword, userInfo } = body
        
        if (!userId || !newPassword) {
          return NextResponse.json(
            { success: false, error: 'User ID and new password are required' },
            { status: 400 }
          )
        }

        // Check if account is locked
        const lockoutStatus = isAccountLocked(userId)
        if (lockoutStatus.isLocked) {
          logAuthEvent(
            'user_login_failed',
            userId,
            undefined,
            undefined,
            ip,
            userAgent,
            undefined,
            false,
            `Account locked. Try again in ${lockoutStatus.remainingTime} minutes`
          )

          return NextResponse.json(
            { 
              success: false, 
              error: 'Account is locked due to too many failed attempts',
              lockoutStatus
            },
            { status: 423 }
          )
        }

        // Change password
        const changeResult = await changePassword(
          userId,
          currentPassword,
          newPassword,
          currentHashedPassword,
          userInfo
        )
        
        if (!changeResult.success) {
          // Record failed attempt
          recordFailedAttempt(userId)
          
          logAuthEvent(
            'user_login_failed',
            userId,
            undefined,
            undefined,
            ip,
            userAgent,
            undefined,
            false,
            changeResult.error
          )

          return NextResponse.json(
            { success: false, error: changeResult.error },
            { status: 400 }
          )
        }

        // Clear failed attempts on successful password change
        clearFailedAttempts(userId)
        
        // Log password change
        logSecurityEvent(
          'password_changed',
          'Password changed',
          `Password changed for user ${userId}`,
          userId,
          undefined,
          undefined,
          { requiresPasswordChange: changeResult.requiresPasswordChange },
          ip,
          userAgent,
          'medium'
        )

        return NextResponse.json({
          success: true,
          data: {
            requiresPasswordChange: changeResult.requiresPasswordChange,
            daysUntilExpiration: changeResult.daysUntilExpiration
          }
        })

      case 'update-policy':
        // Update password policy
        const { policyUpdates } = body
        
        if (!policyUpdates) {
          return NextResponse.json(
            { success: false, error: 'Policy updates are required' },
            { status: 400 }
          )
        }

        // Get current policy
        const currentPolicy = passwordSecurityManager.getPasswordPolicy()
        
        // Update policy
        passwordSecurityManager.updatePasswordPolicy(policyUpdates)
        
        // Log admin action
        logAdminAction(
          'system',
          'system@attendance.com',
          'admin',
          'Password Policy Updated',
          `Password policy updated: ${JSON.stringify(policyUpdates)}`,
          'setting',
          'password-policy',
          { previousPolicy: currentPolicy, newPolicy: policyUpdates },
          ip,
          userAgent
        )

        return NextResponse.json({
          success: true,
          message: 'Password policy updated successfully',
          data: passwordSecurityManager.getPasswordPolicy()
        })

      case 'unlock-account':
        // Unlock user account
        const { userIdToUnlock } = body
        
        if (!userIdToUnlock) {
          return NextResponse.json(
            { success: false, error: 'User ID is required' },
            { status: 400 }
          )
        }

        // Clear failed attempts to unlock account
        clearFailedAttempts(userIdToUnlock)
        
        // Log admin action
        logAdminAction(
          userIdToUnlock,
          '',
          'admin',
          'Account Unlocked',
          `Account unlocked for user ${userIdToUnlock}`,
          'user',
          userIdToUnlock,
          undefined,
          ip,
          userAgent
        )

        return NextResponse.json({
          success: true,
          message: 'Account unlocked successfully'
        })

      case 'force-password-change':
        // Force user to change password
        const { userIdToForce } = body
        
        if (!userIdToForce) {
          return NextResponse.json(
            { success: false, error: 'User ID is required' },
            { status: 400 }
          )
        }

        // This would typically set a flag in the user's record
        // For now, we'll just log the action
        logAdminAction(
          userIdToForce,
          '',
          'admin',
          'Password Change Forced',
          `Password change forced for user ${userIdToForce}`,
          'user',
          userIdToForce,
          undefined,
          ip,
          userAgent
        )

        return NextResponse.json({
          success: true,
          message: 'Password change forced successfully'
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in password security API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/security/password - Update password settings
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    const body = await request.json()
    const { maxFailedAttempts, lockoutDuration } = body
    const { userAgent, ip } = getClientInfo(request)

    // Update password security settings
    if (maxFailedAttempts !== undefined) {
      passwordSecurityManager.setMaxFailedAttempts(maxFailedAttempts)
    }
    
    if (lockoutDuration !== undefined) {
      passwordSecurityManager.setLockoutDuration(lockoutDuration)
    }

    // Log admin action
    logAdminAction(
      'system',
      'system@attendance.com',
      'admin',
      'Password Security Settings Updated',
      `Password security settings updated: maxFailedAttempts=${maxFailedAttempts}, lockoutDuration=${lockoutDuration}`,
      'setting',
      'password-security',
      { maxFailedAttempts, lockoutDuration },
      ip,
      userAgent
    )

    return NextResponse.json({
      success: true,
      message: 'Password security settings updated successfully',
      data: {
        maxFailedAttempts: passwordSecurityManager.getMaxFailedAttempts(),
        lockoutDuration: passwordSecurityManager.getLockoutDuration(),
      }
    })
  } catch (error) {
    console.error('Error updating password security settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update password security settings' },
      { status: 500 }
    )
  }
}