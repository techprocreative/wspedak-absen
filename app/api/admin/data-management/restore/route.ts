import { NextRequest, NextResponse } from 'next/server'
import * as JSZip from 'jszip'
import { createServerSupabaseClient, checkAdminAuth } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const TABLES_TO_BACKUP = [
  'users',
  'attendance',
  'daily_attendance_records',
  'attendance_policies',
  'user_settings'
]

// POST /api/admin/data-management/restore - Restore from backup
export async function POST(request: NextRequest) {
  try {
    // Check authentication - restore is admin-only
    const authResult = await checkAdminAuth()
    if (!authResult.authenticated || !authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { filename, conflictResolution = 'skip', tables = [] } = body

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Download backup file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('backups')
      .download(filename)

    if (downloadError || !fileData) {
      return NextResponse.json({
        error: 'Failed to download backup file',
        details: downloadError?.message
      }, { status: 500 })
    }

    // Parse zip file
    const arrayBuffer = await fileData.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    // Read metadata
    const metadataFile = zip.file('metadata.json')
    if (!metadataFile) {
      return NextResponse.json({
        error: 'Invalid backup file - missing metadata'
      }, { status: 400 })
    }

    const metadataContent = await metadataFile.async('string')
    const metadata = JSON.parse(metadataContent)

    let totalRecords = 0
    let restoredRecords = 0
    let skippedRecords = 0
    const errors: string[] = []
    const warnings: string[] = []

    // Restore each table
    const tablesToRestore = tables.length > 0 ? tables : Object.keys(metadata.tables)

    for (const tableName of tablesToRestore) {
      try {
        const tableFile = zip.file(`${tableName}.json`)
        if (!tableFile) {
          warnings.push(`Table ${tableName} not found in backup`)
          continue
        }

        const tableContent = await tableFile.async('string')
        const tableData = JSON.parse(tableContent)

        if (!Array.isArray(tableData) || tableData.length === 0) {
          warnings.push(`Table ${tableName} has no data`)
          continue
        }

        totalRecords += tableData.length

        // Restore records based on conflict resolution
        for (const record of tableData) {
          try {
            if (conflictResolution === 'overwrite') {
              // Upsert - update if exists, insert if not
              const { error: upsertError } = await supabase
                .from(tableName)
                .upsert(record, { onConflict: 'id' })

              if (upsertError) {
                errors.push(`${tableName}: ${upsertError.message}`)
                skippedRecords++
              } else {
                restoredRecords++
              }
            } else if (conflictResolution === 'skip') {
              // Check if exists
              const { data: existing } = await supabase
                .from(tableName)
                .select('id')
                .eq('id', record.id)
                .single()

              if (existing) {
                skippedRecords++
              } else {
                const { error: insertError } = await supabase
                  .from(tableName)
                  .insert(record)

                if (insertError) {
                  errors.push(`${tableName}: ${insertError.message}`)
                  skippedRecords++
                } else {
                  restoredRecords++
                }
              }
            } else if (conflictResolution === 'merge') {
              // Insert if not exists, update non-null fields if exists
              const { data: existing } = await supabase
                .from(tableName)
                .select('*')
                .eq('id', record.id)
                .single()

              if (existing) {
                // Merge: only update fields that are not null in backup
                const mergedData = { ...existing }
                Object.keys(record).forEach(key => {
                  if (record[key] !== null && record[key] !== undefined) {
                    mergedData[key] = record[key]
                  }
                })

                const { error: updateError } = await supabase
                  .from(tableName)
                  .update(mergedData)
                  .eq('id', record.id)

                if (updateError) {
                  errors.push(`${tableName}: ${updateError.message}`)
                  skippedRecords++
                } else {
                  restoredRecords++
                }
              } else {
                const { error: insertError } = await supabase
                  .from(tableName)
                  .insert(record)

                if (insertError) {
                  errors.push(`${tableName}: ${insertError.message}`)
                  skippedRecords++
                } else {
                  restoredRecords++
                }
              }
            }
          } catch (recordError: any) {
            errors.push(`${tableName}: ${recordError.message}`)
            skippedRecords++
          }
        }
      } catch (tableError: any) {
        errors.push(`Failed to restore ${tableName}: ${tableError.message}`)
      }
    }

    // Log restore activity
    await supabase.from('audit_logs').insert({
      user_id: authResult.userId,
      action: 'BACKUP_RESTORE',
      resource: 'database',
      details: {
        filename,
        totalRecords,
        restoredRecords,
        skippedRecords,
        conflictResolution,
        tables: tablesToRestore,
        errors: errors.length,
        warnings: warnings.length
      }
    })

    return NextResponse.json({
      success: true,
      totalRecords,
      restoredRecords,
      skippedRecords,
      errors,
      warnings,
      message: `Restored ${restoredRecords} of ${totalRecords} records`
    })
  } catch (error: any) {
    console.error('Restore error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

// GET /api/admin/data-management/restore - Get restore options
export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth()
    if (!authResult.authenticated || !authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      availableTables: TABLES_TO_BACKUP,
      conflictResolutions: [
        { value: 'skip', label: 'Skip existing records' },
        { value: 'overwrite', label: 'Overwrite existing records' },
        { value: 'merge', label: 'Merge with existing records' }
      ]
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
