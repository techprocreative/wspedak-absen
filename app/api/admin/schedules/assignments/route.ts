import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'
import { hasAnyServerRole } from '@/lib/server-auth'
import { z } from 'zod'

// Helper function to check admin authentication
async function checkAdminAuth(request: NextRequest) {
  if (!hasAnyServerRole(['admin', 'hr', 'manager'])) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
  return null
}

// Helper function to validate query parameters
function parseQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const query = {
    scheduleId: searchParams.get('scheduleId') || undefined,
    userId: searchParams.get('userId') || undefined,
    status: searchParams.get('status') as any || undefined,
    startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
    endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
  }

  return query
}

// GET /api/admin/schedules/assignments - Get schedule assignments with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Parse query parameters
    const query = parseQueryParams(request)

    // Calculate offset
    const offset = (query.page - 1) * query.limit

    // Get schedule assignments from database
    const assignments = await serverDbManager.getScheduleAssignments({
      scheduleId: query.scheduleId,
      userId: query.userId,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit,
      offset,
    })

    // Get total count for pagination
    const allAssignments = await serverDbManager.getScheduleAssignments({
      scheduleId: query.scheduleId,
      userId: query.userId,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    })

    // Get user and schedule information for each assignment
    const assignmentsWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const user = await serverDbManager.getUser(assignment.userId)
        const schedule = await serverDbManager.getSchedule(assignment.scheduleId)
        
        return {
          ...assignment,
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
          } : null,
          schedule: schedule ? {
            id: schedule.id,
            name: schedule.name,
            type: schedule.type,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            location: schedule.location,
          } : null,
        }
      })
    )

    // Return response with pagination
    return NextResponse.json({
      success: true,
      data: assignmentsWithDetails,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: allAssignments.length,
        totalPages: Math.ceil(allAssignments.length / query.limit),
      },
    })
  } catch (error) {
    console.error('Error fetching schedule assignments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedule assignments' },
      { status: 500 }
    )
  }
}

// POST /api/admin/schedules/assignments - Create schedule assignments (bulk operations)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Parse and validate request body
    const body = await request.json()
    const { assignments } = body

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Create schedule assignments
    const createdAssignments = []
    for (const assignmentData of assignments) {
      const newAssignment = {
        id: crypto.randomUUID(),
        userId: assignmentData.userId,
        scheduleId: assignmentData.scheduleId,
        date: new Date(assignmentData.date),
        status: assignmentData.status || 'assigned',
        checkInTime: assignmentData.checkInTime ? new Date(assignmentData.checkInTime) : undefined,
        checkOutTime: assignmentData.checkOutTime ? new Date(assignmentData.checkOutTime) : undefined,
        notes: assignmentData.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await serverDbManager.saveScheduleAssignment(newAssignment)
      createdAssignments.push(newAssignment)
    }

    return NextResponse.json({
      success: true,
      data: createdAssignments,
      message: `${createdAssignments.length} schedule assignments created successfully`,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating schedule assignments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create schedule assignments' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/schedules/assignments - Update multiple schedule assignments (bulk operations)
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Parse and validate request body
    const body = await request.json()
    const { updates, ids } = body

    if (!updates || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Update each assignment
    const updatedAssignments = []
    for (const id of ids) {
      const existingAssignment = await serverDbManager.getScheduleAssignment(id)
      if (!existingAssignment) continue

      const updatedAssignment = {
        ...existingAssignment,
        ...updates,
        updatedAt: new Date(),
      }

      await serverDbManager.saveScheduleAssignment(updatedAssignment)
      updatedAssignments.push(updatedAssignment)
    }

    return NextResponse.json({
      success: true,
      data: updatedAssignments,
      message: `${updatedAssignments.length} schedule assignments updated successfully`,
    })
  } catch (error) {
    console.error('Error updating schedule assignments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update schedule assignments' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/schedules/assignments - Delete multiple schedule assignments (bulk operations)
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Parse and validate request body
    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Delete each assignment
    let deletedCount = 0
    for (const id of ids) {
      const existingAssignment = await serverDbManager.getScheduleAssignment(id)
      if (existingAssignment) {
        await serverDbManager.deleteScheduleAssignment(id)
        deletedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} schedule assignments deleted successfully`,
    })
  } catch (error) {
    console.error('Error deleting schedule assignments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete schedule assignments' },
      { status: 500 }
    )
  }
}