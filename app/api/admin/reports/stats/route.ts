/**
 * Reports Stats API
 * GET /api/admin/reports/stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/api-auth-middleware'
import { serverDbManager } from '@/lib/server-db'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export const dynamic = 'force-dynamic'

async function GET(request: NextRequest) {
  try {
    // Get audit logs to count report generations
    const auditLogs = await serverDbManager.getAuditLogs({ limit: 1000 })
    
    // Filter report-related actions
    const reportActions = auditLogs.filter(log => 
      log.action.includes('report') || 
      log.action.includes('export') ||
      log.action.includes('generate')
    )
    
    // Count total reports generated
    const totalReports = reportActions.filter(log => 
      log.action.includes('generate') || log.action.includes('create')
    ).length
    
    // Count scheduled reports (would come from schedules table in production)
    const scheduledReports = 0 // Placeholder
    
    // Count shared reports (would come from sharing metadata)
    const sharedReports = reportActions.filter(log => 
      log.metadata?.shared === true
    ).length
    
    // Count templates (predefined report types)
    const templates = 16 // Standard templates: attendance, employees, schedules, etc.
    
    // Calculate last month stats
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    const lastMonthReports = reportActions.filter(log => 
      new Date(log.createdAt) > lastMonth &&
      (log.action.includes('generate') || log.action.includes('create'))
    ).length
    
    const thisMonthReports = reportActions.filter(log => {
      const logDate = new Date(log.createdAt)
      const now = new Date()
      return logDate.getMonth() === now.getMonth() && 
             logDate.getFullYear() === now.getFullYear() &&
             (log.action.includes('generate') || log.action.includes('create'))
    }).length
    
    const monthlyChange = thisMonthReports - lastMonthReports
    
    // Recent reports (last 10)
    const recentReports = reportActions
      .filter(log => log.action.includes('generate') || log.action.includes('create'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(log => ({
        id: log.id,
        type: log.metadata?.reportType || 'general',
        name: log.details || 'Report',
        createdAt: log.createdAt,
        createdBy: log.userId,
        status: 'completed'
      }))
    
    const stats = {
      totalReports,
      scheduledReports,
      sharedReports,
      templates,
      monthlyChange,
      recentReports,
      breakdown: {
        daily: scheduledReports > 0 ? Math.floor(scheduledReports / 2) : 0,
        weekly: scheduledReports > 0 ? Math.ceil(scheduledReports / 2) : 0,
        monthly: 0,
      },
      sharing: {
        teams: sharedReports > 0 ? Math.ceil(sharedReports / 3) : 0,
        users: sharedReports > 0 ? sharedReports * 2 : 0,
      },
      customTemplates: Math.max(0, templates - 10)
    }
    
    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Error fetching reports stats', error as Error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch reports stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

const authenticatedGET = withAdminAuth(GET)
export { authenticatedGET as GET }
