/**
 * Report Generation API
 * Generates reports in various formats (PDF, Excel, CSV, JSON)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/api-auth-middleware'
import { reportGenerator, ReportConfig } from '@/lib/report-generator'

export const dynamic = 'force-dynamic'

export const POST = withAdminAuth(async (request) => {
  try {
    const body = await request.json()
    const config: ReportConfig = body
    
    // Validate config
    if (!config.type || !config.format || !config.dateRange || !config.fields) {
      return NextResponse.json(
        { success: false, error: 'Invalid report configuration. Required: type, format, dateRange, fields' },
        { status: 400 }
      )
    }
    
    // Convert date strings to Date objects
    config.dateRange.start = new Date(config.dateRange.start)
    config.dateRange.end = new Date(config.dateRange.end)
    
    // Validate date range
    if (isNaN(config.dateRange.start.getTime()) || isNaN(config.dateRange.end.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date range' },
        { status: 400 }
      )
    }
    
    if (config.dateRange.start > config.dateRange.end) {
      return NextResponse.json(
        { success: false, error: 'Start date must be before end date' },
        { status: 400 }
      )
    }
    
    // Generate report
    console.log('Generating report with config:', config)
    const report = await reportGenerator.generateReport(config)
    
    // Set appropriate headers based on format
    const timestamp = Date.now()
    const filename = `${config.type}-report-${timestamp}`
    
    let contentType: string
    let fileExtension: string
    
    switch (config.format) {
      case 'pdf':
        contentType = 'application/pdf'
        fileExtension = 'pdf'
        break
      case 'excel':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        fileExtension = 'xlsx'
        break
      case 'csv':
        contentType = 'text/csv; charset=utf-8'
        fileExtension = 'csv'
        break
      case 'json':
        contentType = 'application/json'
        fileExtension = 'json'
        break
      default:
        contentType = 'application/octet-stream'
        fileExtension = 'bin'
    }
    
    const headers = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}.${fileExtension}"`
    }
    
    // Convert Buffer to ArrayBuffer for NextResponse
    const responseBody = Buffer.isBuffer(report) ? report.buffer.slice(report.byteOffset, report.byteOffset + report.byteLength) : report
    
    return new NextResponse(responseBody as BodyInit, {
      status: 200,
      headers
    })
  } catch (error: any) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate report',
        details: error.stack
      },
      { status: 500 }
    )
  }
})
