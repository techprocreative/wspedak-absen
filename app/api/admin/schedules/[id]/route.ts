import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'
import { hasAnyServerRole } from '@/lib/server-auth'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
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

// GET /api/admin/schedules/[id] - Get a specific schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Get schedule from database
    const schedule = await serverDbManager.getSchedule(params.id)

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: schedule,
    })
  } catch (error) {
    logger.error('Error fetching schedule', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedule' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/schedules/[id] - Update a specific schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Check if schedule exists
    const existingSchedule = await serverDbManager.getSchedule(params.id)
    if (!existingSchedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()

    // Update schedule
    const updatedSchedule = {
      ...existingSchedule,
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : existingSchedule.startDate,
      endDate: body.endDate ? new Date(body.endDate) : existingSchedule.endDate,
      updatedAt: new Date(),
    }

    await serverDbManager.saveSchedule(updatedSchedule)

    return NextResponse.json({
      success: true,
      data: updatedSchedule,
      message: 'Schedule updated successfully',
    })
  } catch (error) {
    logger.error('Error updating schedule', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to update schedule' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/schedules/[id] - Delete a specific schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Check if schedule exists
    const existingSchedule = await serverDbManager.getSchedule(params.id)
    if (!existingSchedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Delete schedule
    await serverDbManager.deleteSchedule(params.id)

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully',
    })
  } catch (error) {
    logger.error('Error deleting schedule', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete schedule' },
      { status: 500 }
    )
  }
}