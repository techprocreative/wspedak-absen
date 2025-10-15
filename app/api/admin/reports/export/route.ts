import { NextRequest, NextResponse } from 'next/server'
import { ReportBuilder } from '@/lib/report-builder'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Mock authentication check
// In a real implementation, this would use proper authentication
async function checkAuth() {
  // Mock implementation - always return true for demo
  return true
}

// POST /api/admin/reports/export - Export a report
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const isAuthenticated = await checkAuth()
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { id, config, format = 'pdf' } = body

    let reportBuilder: ReportBuilder

    if (id) {
      // Load existing report
      reportBuilder = await ReportBuilder.load(id)
    } else if (config) {
      // Create new report builder from config
      reportBuilder = new ReportBuilder(config)
    } else {
      return NextResponse.json(
        { error: 'Missing report ID or configuration' },
        { status: 400 }
      )
    }

    // Export report
    const blob = await reportBuilder.export(format as 'pdf' | 'excel' | 'csv')

    // Set appropriate headers
    const headers = new Headers()
    headers.set('Content-Type', blob.type)
    headers.set('Content-Disposition', `attachment; filename="report.${format}"`)

    // Return the file
    return new NextResponse(blob, {
      status: 200,
      headers
    })
  } catch (error) {
    logger.error('Export report error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}