import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'
import { AttendanceQueryInput, attendanceQuerySchema } from '@/lib/validation-schemas'
import { withAdminAuth } from '@/lib/api-auth-middleware'
import { z } from 'zod'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Helper function to validate query parameters
function parseQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const query = {
    userId: searchParams.get('userId') || undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    status: searchParams.get('status') as any || undefined,
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    sortBy: searchParams.get('sortBy') as any || 'date',
    sortOrder: searchParams.get('sortOrder') as any || 'desc',
  }

  return attendanceQuerySchema.parse(query)
}

// GET /api/admin/attendance - Get attendance records with filtering and pagination
export const GET = withAdminAuth(async (request) => {
  try {
    // Parse query parameters
    const query = parseQueryParams(request)

    // Calculate offset
    const offset = (query.page - 1) * query.limit

    // Parse dates
    const startDate = query.startDate ? new Date(query.startDate) : undefined
    const endDate = query.endDate ? new Date(query.endDate) : undefined

    // Get attendance records from database
    const records = await serverDbManager.getAttendanceRecords({
      userId: query.userId,
      startDate,
      endDate,
      limit: query.limit,
      offset,
    })

    // Get total count for pagination
    const allRecords = await serverDbManager.getAttendanceRecords({
      userId: query.userId,
      startDate,
      endDate,
    })

    // Apply status filter if provided
    let filteredRecords = records
    if (query.status) {
      filteredRecords = records.filter(record => {
        // Determine status based on attendance data
        if (record.type === 'check-in') {
          const checkInTime = new Date(record.timestamp).getTime()
          const workStartTime = 8 * 60 * 60 * 1000 // 8:00 AM in milliseconds
          const lateThreshold = 15 * 60 * 1000 // 15 minutes in milliseconds
          
          if (checkInTime > workStartTime + lateThreshold) {
            return query.status === 'late'
          } else {
            return query.status === 'present'
          }
        }
        return false
      })
    }

    // Apply sorting
    filteredRecords.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (query.sortBy) {
        case 'date':
          aValue = new Date(a.timestamp).getTime()
          bValue = new Date(b.timestamp).getTime()
          break
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime()
          bValue = new Date(b.timestamp).getTime()
          break
        case 'checkIn':
          aValue = a.type === 'check-in' ? new Date(a.timestamp).getTime() : 0
          bValue = b.type === 'check-in' ? new Date(b.timestamp).getTime() : 0
          break
        case 'checkOut':
          aValue = a.type === 'check-out' ? new Date(a.timestamp).getTime() : 0
          bValue = b.type === 'check-out' ? new Date(b.timestamp).getTime() : 0
          break
        case 'status':
          // Determine status for sorting
          const getStatus = (record: any) => {
            if (record.type === 'check-in') {
              const checkInTime = new Date(record.timestamp).getTime()
              const workStartTime = 8 * 60 * 60 * 1000
              const lateThreshold = 15 * 60 * 1000
              
              if (checkInTime > workStartTime + lateThreshold) {
                return 'late'
              } else {
                return 'present'
              }
            }
            return 'unknown'
          }
          aValue = getStatus(a)
          bValue = getStatus(b)
          break
        default:
          aValue = a[query.sortBy]
          bValue = b[query.sortBy]
      }

      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1

      let comparison = 0
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return query.sortOrder === 'desc' ? -comparison : comparison
    })

    // Get user information for each record
    const recordsWithUsers = await Promise.all(
      filteredRecords.map(async (record) => {
        const user = await serverDbManager.getUser(record.userId)
        return {
          ...record,
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
          } : null,
        }
      })
    )

    // Return response with pagination
    return NextResponse.json({
      success: true,
      data: recordsWithUsers,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: allRecords.length,
        totalPages: Math.ceil(allRecords.length / query.limit),
      },
    })
  } catch (error) {
    logger.error('Error fetching attendance records', error as Error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance records' },
      { status: 500 }
    )
  }
})

// POST /api/admin/attendance - Create attendance records (bulk operations)
export const POST = withAdminAuth(async (request) => {
  try {
    // Parse and validate request body
    const body = await request.json()
    const { records } = body

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Create attendance records
    const createdRecords = []
    for (const recordData of records) {
      const newRecord = {
        id: crypto.randomUUID(),
        userId: recordData.userId,
        timestamp: new Date(recordData.timestamp),
        type: recordData.type,
        location: recordData.location,
        photo: recordData.photo,
        synced: false,
        pendingSync: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await serverDbManager.saveAttendanceRecord(newRecord)
      createdRecords.push(newRecord)
    }

    return NextResponse.json({
      success: true,
      data: createdRecords,
      message: `${createdRecords.length} attendance records created successfully`,
    }, { status: 201 })
  } catch (error) {
    logger.error('Error creating attendance records', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to create attendance records' },
      { status: 500 }
    )
  }
})

// PUT /api/admin/attendance - Update multiple attendance records (bulk operations)
export const PUT = withAdminAuth(async (request) => {
  try {
    // Parse and validate request body
    const body = await request.json()
    const { updates, ids } = body

    if (!updates || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Update each record
    const updatedRecords = []
    for (const id of ids) {
      const existingRecord = await serverDbManager.getAttendanceRecord(id)
      if (!existingRecord) continue

      const updatedRecord = {
        ...existingRecord,
        ...updates,
        updatedAt: new Date(),
      }

      await serverDbManager.saveAttendanceRecord(updatedRecord)
      updatedRecords.push(updatedRecord)
    }

    return NextResponse.json({
      success: true,
      data: updatedRecords,
      message: `${updatedRecords.length} attendance records updated successfully`,
    })
  } catch (error) {
    logger.error('Error updating attendance records', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to update attendance records' },
      { status: 500 }
    )
  }
})

// DELETE /api/admin/attendance - Delete multiple attendance records (bulk operations)
export const DELETE = withAdminAuth(async (request) => {
  try {
    // Parse and validate request body
    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Delete each record
    let deletedCount = 0
    for (const id of ids) {
      const existingRecord = await serverDbManager.getAttendanceRecord(id)
      if (existingRecord) {
        await serverDbManager.deleteAttendanceRecord(id)
        deletedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} attendance records deleted successfully`,
    })
  } catch (error) {
    logger.error('Error deleting attendance records', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete attendance records' },
      { status: 500 }
    )
  }
})
