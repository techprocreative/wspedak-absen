import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'
import { hasAnyServerRole } from '@/lib/server-auth'

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

// GET /api/admin/schedules/assignments/[id] - Get a specific schedule assignment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Get schedule assignment from database
    const assignment = await serverDbManager.getScheduleAssignment(params.id)

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Schedule assignment not found' },
        { status: 404 }
      )
    }

    // Get user and schedule information
    const user = await serverDbManager.getUser(assignment.userId)
    const schedule = await serverDbManager.getSchedule(assignment.scheduleId)
    
    const assignmentWithDetails = {
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

    return NextResponse.json({
      success: true,
      data: assignmentWithDetails,
    })
  } catch (error) {
    console.error('Error fetching schedule assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedule assignment' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/schedules/assignments/[id] - Update a specific schedule assignment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Check if assignment exists
    const existingAssignment = await serverDbManager.getScheduleAssignment(params.id)
    if (!existingAssignment) {
      return NextResponse.json(
        { success: false, error: 'Schedule assignment not found' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()

    // Update assignment
    const updatedAssignment = {
      ...existingAssignment,
      ...body,
      date: body.date ? new Date(body.date) : existingAssignment.date,
      checkInTime: body.checkInTime ? new Date(body.checkInTime) : existingAssignment.checkInTime,
      checkOutTime: body.checkOutTime ? new Date(body.checkOutTime) : existingAssignment.checkOutTime,
      updatedAt: new Date(),
    }

    await serverDbManager.saveScheduleAssignment(updatedAssignment)

    return NextResponse.json({
      success: true,
      data: updatedAssignment,
      message: 'Schedule assignment updated successfully',
    })
  } catch (error) {
    console.error('Error updating schedule assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update schedule assignment' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/schedules/assignments/[id] - Delete a specific schedule assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Check if assignment exists
    const existingAssignment = await serverDbManager.getScheduleAssignment(params.id)
    if (!existingAssignment) {
      return NextResponse.json(
        { success: false, error: 'Schedule assignment not found' },
        { status: 404 }
      )
    }

    // Delete assignment
    await serverDbManager.deleteScheduleAssignment(params.id)

    return NextResponse.json({
      success: true,
      message: 'Schedule assignment deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting schedule assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete schedule assignment' },
      { status: 500 }
    )
  }
}