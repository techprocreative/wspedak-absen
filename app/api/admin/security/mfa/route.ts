import { NextRequest, NextResponse } from 'next/server'
import { hasAnyServerRole } from '@/lib/server-auth'
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  enrollMFA, 
  verifyMFA, 
  isMFAEnabledForUser, 
  getMFAStatus,
  activateMFAForUser,
  deactivateMFAForUser,
  addTrustedDevice,
  removeTrustedDevice,
  getTrustedDevicesForUser
} from '@/lib/mfa'
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

// GET /api/admin/security/mfa - Get MFA status
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const { userAgent, ip } = getClientInfo(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get MFA status
    const mfaStatus = getMFAStatus(userId)
    const trustedDevices = getTrustedDevicesForUser(userId)

    // Log security event
    logSecurityEvent(
      'security_settings_updated',
      'MFA status checked',
      `MFA status checked for user ${userId}`,
      userId,
      undefined,
      undefined,
      { mfaEnabled: mfaStatus.enabled },
      ip,
      userAgent,
      'low'
    )

    return NextResponse.json({
      success: true,
      data: {
        ...mfaStatus,
        trustedDevices: trustedDevices.map(device => ({
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          createdAt: device.createdAt,
          lastUsedAt: device.lastUsedAt,
          expiresAt: device.expiresAt,
        }))
      }
    })
  } catch (error) {
    logger.error('Error getting MFA status', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to get MFA status' },
      { status: 500 }
    )
  }
}

// POST /api/admin/security/mfa - Enroll or verify MFA
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    const body = await request.json()
    const { action, userId, token, email, deviceName, rememberDevice } = body
    const { userAgent, ip } = getClientInfo(request)

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'enroll':
        if (!userId || !email) {
          return NextResponse.json(
            { success: false, error: 'User ID and email are required for enrollment' },
            { status: 400 }
          )
        }

        // Enroll user in MFA
        const enrollmentResult = await enrollMFA(userId, email)
        
        if (!enrollmentResult.success) {
          logSecurityEvent(
            'security_settings_updated',
            'MFA enrollment failed',
            `MFA enrollment failed for user ${userId}: ${enrollmentResult.error}`,
            userId,
            undefined,
            undefined,
            { error: enrollmentResult.error },
            ip,
            userAgent,
            'medium'
          )

          return NextResponse.json(
            { success: false, error: enrollmentResult.error },
            { status: 400 }
          )
        }

        // Log security event
        logSecurityEvent(
          'security_settings_updated',
          'MFA enrolled',
          `MFA enrolled for user ${userId}`,
          userId,
          undefined,
          undefined,
          { secretGenerated: true },
          ip,
          userAgent,
          'medium'
        )

        return NextResponse.json({
          success: true,
          data: {
            secret: enrollmentResult.secret,
            qrCode: enrollmentResult.qrCode,
            backupCodes: enrollmentResult.backupCodes,
          }
        })

      case 'verify':
        if (!userId || !token) {
          return NextResponse.json(
            { success: false, error: 'User ID and token are required for verification' },
            { status: 400 }
          )
        }

        // Verify MFA token
        const verificationResult = verifyMFA(userId, token, userAgent, ip)
        
        if (!verificationResult.success) {
          logAuthEvent(
            'user_login_failed',
            userId,
            undefined,
            undefined,
            ip,
            userAgent,
            undefined,
            false,
            `Invalid MFA token. Remaining attempts: ${verificationResult.remainingAttempts}`
          )

          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid verification code',
              remainingAttempts: verificationResult.remainingAttempts,
              requiresBackupCode: verificationResult.requiresBackupCode
            },
            { status: 400 }
          )
        }

        // Add trusted device if requested
        let trustedDevice = null
        if (rememberDevice && deviceName && !verificationResult.trustedDevice) {
          trustedDevice = addTrustedDevice(userId, deviceName, userAgent, ip)
        }

        // Log successful verification
        logAuthEvent(
          'user_login',
          userId,
          undefined,
          undefined,
          ip,
          userAgent,
          undefined,
          true
        )

        return NextResponse.json({
          success: true,
          data: {
            trustedDevice: verificationResult.trustedDevice,
            newTrustedDevice: trustedDevice ? {
              deviceId: trustedDevice.deviceId,
              deviceName: trustedDevice.deviceName,
              expiresAt: trustedDevice.expiresAt,
            } : null,
          }
        })

      case 'activate':
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'User ID is required for activation' },
            { status: 400 }
          )
        }

        // Activate MFA for user
        const activationSuccess = activateMFAForUser(userId)
        
        if (!activationSuccess) {
          return NextResponse.json(
            { success: false, error: 'Failed to activate MFA' },
            { status: 500 }
          )
        }

        // Log admin action
        logAdminAction(
          userId,
          '',
          'admin',
          'MFA Activated',
          `MFA activated for user ${userId}`,
          'user',
          userId,
          undefined,
          ip,
          userAgent
        )

        return NextResponse.json({
          success: true,
          message: 'MFA activated successfully'
        })

      case 'deactivate':
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'User ID is required for deactivation' },
            { status: 400 }
          )
        }

        // Deactivate MFA for user
        const deactivationSuccess = deactivateMFAForUser(userId)
        
        if (!deactivationSuccess) {
          return NextResponse.json(
            { success: false, error: 'Failed to deactivate MFA' },
            { status: 500 }
          )
        }

        // Log admin action
        logAdminAction(
          userId,
          '',
          'admin',
          'MFA Deactivated',
          `MFA deactivated for user ${userId}`,
          'user',
          userId,
          undefined,
          ip,
          userAgent
        )

        return NextResponse.json({
          success: true,
          message: 'MFA deactivated successfully'
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error('Error in MFA API', error as Error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/security/mfa - Remove trusted device
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const deviceId = searchParams.get('deviceId')
    const { userAgent, ip } = getClientInfo(request)

    if (!userId || !deviceId) {
      return NextResponse.json(
        { success: false, error: 'User ID and device ID are required' },
        { status: 400 }
      )
    }

    // Remove trusted device
    const success = removeTrustedDevice(deviceId)
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to remove trusted device' },
        { status: 500 }
      )
    }

    // Log admin action
    logAdminAction(
      userId,
      '',
      'admin',
      'Trusted Device Removed',
      `Trusted device ${deviceId} removed for user ${userId}`,
      'user',
      userId,
      { deviceId },
      ip,
      userAgent
    )

    return NextResponse.json({
      success: true,
      message: 'Trusted device removed successfully'
    })
  } catch (error) {
    logger.error('Error removing trusted device', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove trusted device' },
      { status: 500 }
    )
  }
}