import { NextRequest, NextResponse } from 'next/server'
import * as Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { createServerSupabaseClient, checkAdminAuth } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// File size limits
const MAX_EXPORT_ROWS = 50000 // Limit for safety
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// POST /api/admin/data-management/export - Start data export
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await checkAdminAuth()
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. Admin access required.' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { exportType, format, fields, filters, filename } = body

    // Validate inputs
    if (!exportType || !format || !fields) {
      return NextResponse.json(
        { error: 'Missing required parameters: exportType, format, fields' },
        { status: 400 }
      )
    }

    // Validate export type
    const validExportTypes = ['users', 'employees', 'attendance', 'daily_attendance_records', 'schedules']
    if (!validExportTypes.includes(exportType)) {
      return NextResponse.json(
        { error: `Invalid export type. Must be one of: ${validExportTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate format
    const validFormats = ['csv', 'excel', 'json']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid export format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      )
    }

    // Map table names
    const tableMap: Record<string, string> = {
      'employees': 'users',
      'attendance': 'daily_attendance_records'
    }
    const tableName = tableMap[exportType] || exportType

    // Get real data from Supabase
    const supabase = createServerSupabaseClient()
    let query: any = supabase.from(tableName).select(fields.join(','))

    // Apply filters if provided
    if (filters && Array.isArray(filters)) {
      filters.forEach((filter: any) => {
        if (filter.field && filter.operator && filter.value !== undefined) {
          switch (filter.operator) {
            case 'equals':
              query = query.eq(filter.field, filter.value)
              break
            case 'contains':
              query = query.ilike(filter.field, `%${filter.value}%`)
              break
            case 'greater_than':
              query = query.gt(filter.field, filter.value)
              break
            case 'less_than':
              query = query.lt(filter.field, filter.value)
              break
            case 'in':
              if (Array.isArray(filter.value)) {
                query = query.in(filter.field, filter.value)
              }
              break
          }
        }
      })
    }

    // Limit rows for safety
    query = query.limit(MAX_EXPORT_ROWS)

    const { data, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch data', details: error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No data found to export' },
        { status: 404 }
      )
    }

    // Format data based on requested format
    let fileContent: string | Buffer
    let contentType: string
    let extension: string

    try {
      switch (format) {
        case 'csv':
          fileContent = Papa.unparse(data, {
            header: true,
            skipEmptyLines: true
          })
          contentType = 'text/csv;charset=utf-8;'
          extension = 'csv'
          break

        case 'excel':
          const ws = XLSX.utils.json_to_sheet(data)
          const wb = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb, ws, exportType)
          fileContent = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break

        case 'json':
          fileContent = JSON.stringify(data, null, 2)
          contentType = 'application/json;charset=utf-8;'
          extension = 'json'
          break

        default:
          throw new Error('Unsupported format')
      }
    } catch (formatError: any) {
      console.error('Format conversion error:', formatError)
      return NextResponse.json(
        { error: 'Failed to format data', details: formatError.message },
        { status: 500 }
      )
    }

    // Check file size
    const fileSize = Buffer.byteLength(fileContent)
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Export file too large (${(fileSize / 1024 / 1024).toFixed(2)}MB). Maximum is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      )
    }

    // Upload to Supabase Storage
    const exportFilename = filename || `${exportType}-${Date.now()}.${extension}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exports')
      .upload(exportFilename, fileContent, {
        contentType,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get download URL (signed URL that expires)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('exports')
      .createSignedUrl(exportFilename, 3600) // 1 hour expiry

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError)
      return NextResponse.json(
        { error: 'Failed to create download link', details: signedUrlError.message },
        { status: 500 }
      )
    }

    // Log activity to audit log
    try {
      await supabase.from('audit_logs').insert({
        user_id: authResult.userId,
        action: 'DATA_EXPORT',
        resource: exportType,
        details: {
          filename: exportFilename,
          format,
          records: data.length,
          fields,
          filters,
          fileSize
        }
      })
    } catch (auditError) {
      console.error('Audit log error:', auditError)
      // Don't fail the export if audit logging fails
    }

    return NextResponse.json({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      filename: exportFilename,
      totalRecords: data.length,
      fileSize,
      format,
      expiresIn: 3600,
      message: 'Export completed successfully. Download link expires in 1 hour.'
    })
  } catch (error: any) {
    console.error('Data export error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// GET /api/admin/data-management/export - Get export history or templates
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await checkAdminAuth()
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. Admin access required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'history') {
      // Get export history from audit logs
      const supabase = createServerSupabaseClient()
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'DATA_EXPORT')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch export history', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data || []
      })
    }

    // Default: return available export types and field information
    return NextResponse.json({
      success: true,
      exportTypes: [
        {
          id: 'users',
          name: 'Employees',
          availableFields: ['id', 'email', 'name', 'role', 'department', 'position', 'employee_id', 'phone', 'start_date', 'created_at']
        },
        {
          id: 'daily_attendance_records',
          name: 'Attendance',
          availableFields: ['id', 'user_id', 'date', 'clock_in', 'clock_out', 'status', 'work_type', 'notes', 'created_at']
        },
        {
          id: 'schedules',
          name: 'Schedules',
          availableFields: ['id', 'name', 'type', 'start_date', 'end_date', 'created_at']
        }
      ],
      formats: ['csv', 'excel', 'json']
    })
  } catch (error: any) {
    console.error('Export info error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
