/**
 * Data Management Activity API
 * GET /api/admin/data-management/activity
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/api-auth-middleware'
import { serverDbManager } from '@/lib/server-db'

export const dynamic = 'force-dynamic'

async function GET(request: NextRequest) {
  try {
    // Get audit logs (recent activity)
    const logs = await serverDbManager.getAuditLogs({ limit: 20 })
    
    // Transform audit logs to activity format
    const activities = logs.map(log => {
      let type: 'import' | 'export' | 'backup' | 'archive' | 'cleanup' = 'cleanup'
      
      if (log.action.includes('create') || log.action.includes('import')) {
        type = 'import'
      } else if (log.action.includes('export') || log.action.includes('download')) {
        type = 'export'
      } else if (log.action.includes('backup')) {
        type = 'backup'
      } else if (log.action.includes('archive') || log.action.includes('delete')) {
        type = 'archive'
      }
      
      return {
        id: log.id,
        type,
        description: log.details || log.action,
        status: log.status || 'success',
        timestamp: log.createdAt,
        user: log.userId,
        recordsAffected: log.metadata?.recordCount || 1
      }
    })
    
    return NextResponse.json({
      success: true,
      data: activities
    })
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch activity',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

const authenticatedGET = withAdminAuth(GET)
export { authenticatedGET as GET }
