import { NextRequest, NextResponse } from 'next/server'
import { hasAnyServerRole } from '@/lib/server-auth'
import {
  auditLogManager
} from '@/lib/audit-log'
import { logAdminAction } from '@/lib/audit-log'

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

// GET /api/admin/security/audit - Get audit logs
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const { userAgent, ip } = getClientInfo(request)

    switch (action) {
      case 'logs':
        // Get filtered logs
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
        const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
        
        // Build filter object
        const filter: any = {}
        
        if (searchParams.get('userId')) {
          filter.userId = searchParams.get('userId')
        }
        
        if (searchParams.get('eventType')) {
          filter.eventType = searchParams.get('eventType')
        }
        
        if (searchParams.get('severity')) {
          filter.severity = searchParams.get('severity')
        }
        
        if (searchParams.get('startDate')) {
          filter.startDate = new Date(searchParams.get('startDate')!)
        }
        
        if (searchParams.get('endDate')) {
          filter.endDate = new Date(searchParams.get('endDate')!)
        }
        
        if (searchParams.get('success')) {
          filter.success = searchParams.get('success') === 'true'
        }
        
        if (searchParams.get('ipAddress')) {
          filter.ipAddress = searchParams.get('ipAddress')
        }
        
        if (searchParams.get('resourceType')) {
          filter.resourceType = searchParams.get('resourceType')
        }
        
        if (searchParams.get('sessionId')) {
          filter.sessionId = searchParams.get('sessionId')
        }
        
        if (searchParams.get('search')) {
          filter.search = searchParams.get('search')
        }

        const result = auditLogManager.getLogs(
          Object.keys(filter).length > 0 ? filter : undefined,
          limit,
          offset
        )
        
        return NextResponse.json({
          success: true,
          data: result
        })

      case 'stats':
        // Get audit log statistics
        const statsFilter: any = {}
        
        if (searchParams.get('userId')) {
          statsFilter.userId = searchParams.get('userId')
        }
        
        if (searchParams.get('startDate')) {
          statsFilter.startDate = new Date(searchParams.get('startDate')!)
        }
        
        if (searchParams.get('endDate')) {
          statsFilter.endDate = new Date(searchParams.get('endDate')!)
        }

        const stats = auditLogManager.getStats(
          Object.keys(statsFilter).length > 0 ? statsFilter : undefined
        )
        
        return NextResponse.json({
          success: true,
          data: stats
        })

      case 'recent':
        // Get recent logs
        const recentLimit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100
        const recentLogs = auditLogManager.getRecentLogs(recentLimit)
        
        return NextResponse.json({
          success: true,
          data: recentLogs
        })

      case 'critical':
        // Get critical events
        const criticalLimit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
        const criticalEvents = auditLogManager.getCriticalEvents(criticalLimit)
        
        return NextResponse.json({
          success: true,
          data: criticalEvents
        })

      case 'failed-logins':
        // Get failed login attempts
        const hours = searchParams.get('hours') ? parseInt(searchParams.get('hours')!) : 24
        const failedLogins = auditLogManager.getFailedLoginAttempts(hours)
        
        return NextResponse.json({
          success: true,
          data: failedLogins
        })

      case 'suspicious':
        // Get suspicious activities
        const suspiciousHours = searchParams.get('hours') ? parseInt(searchParams.get('hours')!) : 24
        const suspiciousActivities = auditLogManager.getSuspiciousActivities(suspiciousHours)
        
        return NextResponse.json({
          success: true,
          data: suspiciousActivities
        })

      case 'export-csv':
        // Export logs to CSV
        const csvFilter: any = {}
        
        if (searchParams.get('userId')) {
          csvFilter.userId = searchParams.get('userId')
        }
        
        if (searchParams.get('eventType')) {
          csvFilter.eventType = searchParams.get('eventType')
        }
        
        if (searchParams.get('severity')) {
          csvFilter.severity = searchParams.get('severity')
        }
        
        if (searchParams.get('startDate')) {
          csvFilter.startDate = new Date(searchParams.get('startDate')!)
        }
        
        if (searchParams.get('endDate')) {
          csvFilter.endDate = new Date(searchParams.get('endDate')!)
        }

        const csvData = auditLogManager.exportToCSV(
          Object.keys(csvFilter).length > 0 ? csvFilter : undefined
        )
        
        // Log admin action
        logAdminAction(
          'system',
          'system@attendance.com',
          'admin',
          'Audit Logs Exported',
          `Audit logs exported to CSV`,
          'system',
          'audit-logs',
          { format: 'csv', filter: csvFilter },
          ip,
          userAgent
        )
        
        return new NextResponse(csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
          }
        })

      case 'export-json':
        // Export logs to JSON
        const jsonFilter: any = {}
        
        if (searchParams.get('userId')) {
          jsonFilter.userId = searchParams.get('userId')
        }
        
        if (searchParams.get('eventType')) {
          jsonFilter.eventType = searchParams.get('eventType')
        }
        
        if (searchParams.get('severity')) {
          jsonFilter.severity = searchParams.get('severity')
        }
        
        if (searchParams.get('startDate')) {
          jsonFilter.startDate = new Date(searchParams.get('startDate')!)
        }
        
        if (searchParams.get('endDate')) {
          jsonFilter.endDate = new Date(searchParams.get('endDate')!)
        }

        const jsonData = auditLogManager.exportToJSON(
          Object.keys(jsonFilter).length > 0 ? jsonFilter : undefined
        )
        
        // Log admin action
        logAdminAction(
          'system',
          'system@attendance.com',
          'admin',
          'Audit Logs Exported',
          `Audit logs exported to JSON`,
          'system',
          'audit-logs',
          { format: 'json', filter: jsonFilter },
          ip,
          userAgent
        )
        
        return new NextResponse(jsonData, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`
          }
        })

      case 'retention':
        // Get log retention settings
        const retentionSettings = auditLogManager.getRetentionSettings()
        
        return NextResponse.json({
          success: true,
          data: retentionSettings
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in audit log API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/security/audit - Clear audit logs
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const { userAgent, ip } = getClientInfo(request)

    switch (action) {
      case 'cleanup':
        // Clean up old logs
        const removedCount = auditLogManager.cleanupOldLogs()
        
        // Log admin action
        logAdminAction(
          'system',
          'system@attendance.com',
          'admin',
          'Audit Logs Cleaned Up',
          `${removedCount} old audit log entries removed`,
          'system',
          'audit-logs',
          { removedCount },
          ip,
          userAgent
        )
        
        return NextResponse.json({
          success: true,
          message: `${removedCount} old log entries removed`,
          data: { removedCount }
        })

      case 'clear-all':
        // Clear all logs (admin only)
        if (!hasAnyServerRole(['admin'])) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
          )
        }

        auditLogManager.clearAllLogs()
        
        // Log admin action
        logAdminAction(
          'system',
          'system@attendance.com',
          'admin',
          'All Audit Logs Cleared',
          'All audit log entries cleared',
          'system',
          'audit-logs',
          {},
          ip,
          userAgent
        )
        
        return NextResponse.json({
          success: true,
          message: 'All audit logs cleared'
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error clearing audit logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clear audit logs' },
      { status: 500 }
    )
  }
}