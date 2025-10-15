import { NextRequest, NextResponse } from 'next/server'
import * as Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { z } from 'zod'
import { createServerSupabaseClient, checkAdminAuth } from '@/lib/supabase-server'
import { checkRateLimit, uploadRateLimiter } from '@/lib/rate-limiter'
import { uploadFileValidator } from '@/lib/file-validator'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export const dynamic = 'force-dynamic'

const MAX_IMPORT_ROWS = 10000

// Validation schemas
const EmployeeImportSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['employee', 'admin', 'hr', 'manager']).default('employee'),
  department: z.string().optional(),
  position: z.string().optional(),
  employee_id: z.string().optional(),
  phone: z.string().optional(),
  start_date: z.string().optional()
})

const AttendanceImportSchema = z.object({
  user_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  date: z.string(),
  clock_in: z.string().optional(),
  clock_out: z.string().optional(),
  status: z.enum(['present', 'absent', 'late', 'early_leave', 'on_leave']).default('present'),
  notes: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth()
    if (!authResult.authenticated || !authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimitResult = checkRateLimit(uploadRateLimiter, authResult.userId || 'anonymous')
    if (rateLimitResult) return rateLimitResult

    const formData = await request.formData()
    const file = formData.get('file') as File
    const importType = formData.get('importType') as string
    const mode = formData.get('mode') as string || 'insert'

    if (!file || !importType) {
      return NextResponse.json({ error: 'File and importType required' }, { status: 400 })
    }

    const validationResult = uploadFileValidator.validate(file)
    if (!validationResult.valid) {
      return NextResponse.json({ error: 'File validation failed', details: validationResult.errors }, { status: 400 })
    }

    const extension = file.name.split('.').pop()?.toLowerCase()
    const fileContent = await file.text()
    let parsedData: any[] = []

    try {
      if (extension === 'csv') {
        parsedData = Papa.parse(fileContent, { header: true, skipEmptyLines: true, dynamicTyping: true }).data
      } else if (extension === 'xlsx' || extension === 'xls') {
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'buffer' })
        parsedData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
      } else if (extension === 'json') {
        parsedData = JSON.parse(fileContent)
        if (!Array.isArray(parsedData)) {
          return NextResponse.json({ error: 'JSON must be array' }, { status: 400 })
        }
      }
    } catch (parseError: any) {
      return NextResponse.json({ error: 'Parse failed', details: parseError.message }, { status: 400 })
    }

    if (parsedData.length === 0 || parsedData.length > MAX_IMPORT_ROWS) {
      return NextResponse.json({ error: `Invalid row count: ${parsedData.length}` }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    let schema: z.ZodSchema, tableName: string

    switch (importType) {
      case 'employees':
      case 'users':
        schema = EmployeeImportSchema
        tableName = 'users'
        break
      case 'attendance':
      case 'daily_attendance_records':
        schema = AttendanceImportSchema
        tableName = 'daily_attendance_records'
        break
      default:
        return NextResponse.json({ error: 'Invalid import type' }, { status: 400 })
    }

    let validRows: any[] = []
    const errors: string[] = []

    parsedData.forEach((row, i) => {
      const result = schema.safeParse(row)
      if (result.success) validRows.push(result.data)
      else errors.push(`Row ${i + 1}: ${result.error.issues.map(e => e.message).join(', ')}`)
    })

    let insertedCount = 0, updatedCount = 0, skippedCount = 0
    const warnings: string[] = []

    for (const row of validRows) {
      try {
        if (tableName === 'users') {
          const { data: existing } = await supabase.from('users').select('id').eq('email', row.email).single()
          
          if (existing) {
            if (mode === 'update' || mode === 'upsert') {
              await supabase.from('users').update(row).eq('email', row.email)
              updatedCount++
            } else {
              skippedCount++
            }
          } else if (mode === 'insert' || mode === 'upsert') {
            warnings.push(`${row.email} needs auth account`)
            skippedCount++
          }
        } else if (tableName === 'daily_attendance_records') {
          let userId = row.user_id
          if (!userId && row.email) {
            const { data: user } = await supabase.from('users').select('id').eq('email', row.email).single()
            userId = user?.id
          }

          if (!userId) {
            skippedCount++
            continue
          }

          const { data: existing } = await supabase.from(tableName).select('id').eq('user_id', userId).eq('date', row.date).single()
          const recordData = { user_id: userId, date: row.date, clock_in: row.clock_in, clock_out: row.clock_out, status: row.status, notes: row.notes }

          if (existing) {
            if (mode === 'update' || mode === 'upsert') {
              await supabase.from(tableName).update(recordData).eq('user_id', userId).eq('date', row.date)
              updatedCount++
            } else {
              skippedCount++
            }
          } else if (mode === 'insert' || mode === 'upsert') {
            await supabase.from(tableName).insert(recordData)
            insertedCount++
          }
        }
      } catch (e: any) {
        warnings.push(e.message)
        skippedCount++
      }
    }

    await supabase.from('audit_logs').insert({
      user_id: authResult.userId,
      action: 'DATA_IMPORT',
      resource: importType,
      details: { filename: file.name, totalRows: parsedData.length, validRows: validRows.length, insertedCount, updatedCount, skippedCount, mode }
    })

    return NextResponse.json({
      success: true,
      data: { totalRows: parsedData.length, validRows: validRows.length, invalidRows: parsedData.length - validRows.length, insertedCount, updatedCount, skippedCount, errors, warnings }
    })
  } catch (error: any) {
    logger.error('Import error', error as Error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
