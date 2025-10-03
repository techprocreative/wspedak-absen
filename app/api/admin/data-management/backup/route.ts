import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createServerSupabaseClient, checkAdminAuth } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Backup settings
const MAX_BACKUP_SIZE = 100 * 1024 * 1024 // 100MB
const TABLES_TO_BACKUP = [
  'users',
  'attendance',
  'daily_attendance_records',
  'attendance_policies',
  'user_settings'
]

// POST /api/admin/data-management/backup - Create backup
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await checkAdminAuth()
    if (!authResult.authenticated || !authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      type = 'full',
      includeTables = TABLES_TO_BACKUP,
      compression = true,
      encryption = false
    } = body

    const supabase = createServerSupabaseClient()
    const zip = new JSZip()
    const backupData: any = {
      version: '1.0',
      type,
      createdAt: new Date().toISOString(),
      createdBy: authResult.userId,
      tables: {}
    }

    let totalRecords = 0

    // Backup each table
    for (const tableName of includeTables) {
      if (!TABLES_TO_BACKUP.includes(tableName)) continue

      try {
        const { data, error } = await supabase.from(tableName).select('*')

        if (error) {
          console.error(`Error backing up ${tableName}:`, error)
          backupData.tables[tableName] = {
            error: error.message,
            records: 0
          }
          continue
        }

        backupData.tables[tableName] = {
          records: data?.length || 0,
          data: data || []
        }
        totalRecords += data?.length || 0

        // Add to zip
        if (data && data.length > 0) {
          zip.file(`${tableName}.json`, JSON.stringify(data, null, 2))
        }
      } catch (tableError: any) {
        console.error(`Error processing ${tableName}:`, tableError)
        backupData.tables[tableName] = {
          error: tableError.message,
          records: 0
        }
      }
    }

    // Add metadata
    zip.file('metadata.json', JSON.stringify(backupData, null, 2))

    // Generate zip file
    const zipContent = await zip.generateAsync({
      type: 'nodebuffer',
      compression: compression ? 'DEFLATE' : 'STORE',
      compressionOptions: { level: 6 }
    })

    const fileSize = zipContent.length
    if (fileSize > MAX_BACKUP_SIZE) {
      return NextResponse.json({
        error: `Backup too large (${(fileSize / 1024 / 1024).toFixed(2)}MB). Maximum is ${MAX_BACKUP_SIZE / 1024 / 1024}MB`
      }, { status: 413 })
    }

    // Upload to Supabase Storage
    const filename = `backup-${type}-${Date.now()}.zip`
    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(filename, zipContent, {
        contentType: 'application/zip',
        cacheControl: '86400'
      })

    if (uploadError) {
      return NextResponse.json({
        error: 'Failed to upload backup',
        details: uploadError.message
      }, { status: 500 })
    }

    // Get signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('backups')
      .createSignedUrl(filename, 86400) // 24 hours

    // Log backup activity
    await supabase.from('audit_logs').insert({
      user_id: authResult.userId,
      action: 'BACKUP_CREATE',
      resource: 'database',
      details: {
        filename,
        type,
        totalRecords,
        fileSize,
        tables: Object.keys(backupData.tables),
        compression,
        encryption
      }
    })

    return NextResponse.json({
      success: true,
      backupId: filename,
      filename,
      downloadUrl: signedUrlData?.signedUrl,
      totalRecords,
      fileSize,
      compressedSize: fileSize,
      type,
      createdAt: new Date().toISOString(),
      expiresIn: 86400,
      tables: Object.entries(backupData.tables).map(([name, info]: any) => ({
        name,
        records: info.records || 0,
        hasError: !!info.error
      }))
    })
  } catch (error: any) {
    console.error('Backup error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

// GET /api/admin/data-management/backup - Get backup history
export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth()
    if (!authResult.authenticated || !authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const supabase = createServerSupabaseClient()

    if (action === 'history') {
      // Get backup history
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'BACKUP_CREATE')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        return NextResponse.json({
          error: 'Failed to fetch backup history',
          details: error.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: data || []
      })
    }

    if (action === 'list') {
      // List files in backups bucket
      const { data, error } = await supabase.storage
        .from('backups')
        .list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        return NextResponse.json({
          error: 'Failed to list backups',
          details: error.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: data || []
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Backup API ready',
      actions: ['create (POST)', 'history (GET)', 'list (GET)']
    })
  } catch (error: any) {
    console.error('Backup list error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

// DELETE /api/admin/data-management/backup - Delete backup
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth()
    if (!authResult.authenticated || !authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { filename } = body

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Delete from storage
    const { error } = await supabase.storage
      .from('backups')
      .remove([filename])

    if (error) {
      return NextResponse.json({
        error: 'Failed to delete backup',
        details: error.message
      }, { status: 500 })
    }

    // Log deletion
    await supabase.from('audit_logs').insert({
      user_id: authResult.userId,
      action: 'BACKUP_DELETE',
      resource: 'database',
      details: { filename }
    })

    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully'
    })
  } catch (error: any) {
    console.error('Backup delete error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
