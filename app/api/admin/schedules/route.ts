import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'
import { hasAnyServerRole } from '@/lib/server-auth'
import { z } from 'zod'

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

// Helper function to validate schedule data
const scheduleSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['regular', 'overtime', 'holiday', 'weekend', 'special']),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.object({
    name: z.string(),
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    radius: z.number(),
  }).optional(),
  assignedUsers: z.array(z.string()).default([]),
  assignedDepartments: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    daysOfWeek: z.array(z.number()).optional(),
    dayOfMonth: z.number().optional(),
  }).optional(),
})

// GET /api/admin/schedules - Get all schedules
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Get schedules from database
    const schedules = await serverDbManager.getSchedules()

    return NextResponse.json({
      success: true,
      data: schedules,
    })
  } catch (error) {
    logger.error('Error fetching schedules', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedules' },
      { status: 500 }
    )
  }
}

// POST /api/admin/schedules - Create a new schedule
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Parse and validate request body
    const body = await request.json()
    const validatedData = scheduleSchema.parse(body)

    // Create new schedule
    const newSchedule = {
      id: crypto.randomUUID(),
      ...validatedData,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      createdBy: 'admin', // In a real app, get from auth context
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await serverDbManager.saveSchedule(newSchedule)

    return NextResponse.json({
      success: true,
      data: newSchedule,
      message: 'Schedule created successfully',
    }, { status: 201 })
  } catch (error) {
    logger.error('Error creating schedule', error as Error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid schedule data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create schedule' },
      { status: 500 }
    )
  }
}