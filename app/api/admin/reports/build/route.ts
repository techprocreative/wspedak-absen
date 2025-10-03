import { NextRequest, NextResponse } from 'next/server'
import { ReportBuilder } from '@/lib/report-builder'

// Mock authentication check
// In a real implementation, this would use proper authentication
async function checkAuth() {
  // Mock implementation - always return true for demo
  return true
}

// POST /api/admin/reports/build - Build a report
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
    const { id, config } = body

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

    // Build report
    const reportData = await reportBuilder.build()

    return NextResponse.json({
      success: true,
      data: reportData
    })
  } catch (error) {
    console.error('Build report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}