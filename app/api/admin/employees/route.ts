import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'
import { UserCreateInput, UserUpdateInput, UserQueryInput, userCreateSchema, userUpdateSchema, userQuerySchema } from '@/lib/validation-schemas'
import { withAdminAuth } from '@/lib/api-auth-middleware'
import { z } from 'zod'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Helper function to validate query parameters
function parseQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const query = {
    role: searchParams.get('role') || undefined,
    department: searchParams.get('department') || undefined,
    search: searchParams.get('search') || undefined,
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    sortBy: searchParams.get('sortBy') as any || 'name',
    sortOrder: searchParams.get('sortOrder') as any || 'asc',
  }

  return userQuerySchema.parse(query)
}

// GET /api/admin/employees - Get all employees with filtering and pagination
export const GET = withAdminAuth(async (request) => {
  try {
    // Parse query parameters
    const query = parseQueryParams(request)

    // Calculate offset
    const offset = (query.page - 1) * query.limit

    // Get users from database
    const users = await serverDbManager.getUsers({
      role: query.role,
      department: query.department,
      search: query.search,
      limit: query.limit,
      offset,
    })

    // Get total count for pagination
    const allUsers = await serverDbManager.getUsers({
      role: query.role,
      department: query.department,
      search: query.search,
    })

    // Apply sorting
    users.sort((a, b) => {
      const aValue = a[query.sortBy]
      const bValue = b[query.sortBy]
      
      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1
      
      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }
      
      return query.sortOrder === 'desc' ? -comparison : comparison
    })

    // Return response with pagination
    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: allUsers.length,
        totalPages: Math.ceil(allUsers.length / query.limit),
      },
    })
  } catch (error) {
    logger.error('Error fetching employees', error as Error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
})

// POST /api/admin/employees - Create a new employee
export const POST = withAdminAuth(async (request) => {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedData = userCreateSchema.parse(body)

    // Check if email already exists
    const existingUser = await serverDbManager.getUserByEmail(validatedData.email)
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 409 }
      )
    }

    // Create new user
    const newUser = {
      id: crypto.randomUUID(),
      email: validatedData.email,
      name: validatedData.name,
      role: validatedData.role,
      department: validatedData.department,
      position: validatedData.position,
      managerId: validatedData.managerId,
      employeeId: validatedData.employeeId,
      phone: validatedData.phone,
      address: validatedData.address,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await serverDbManager.saveUser(newUser)

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'Employee created successfully',
    }, { status: 201 })
  } catch (error) {
    logger.error('Error creating employee', error as Error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create employee' },
      { status: 500 }
    )
  }
})

// PUT /api/admin/employees - Update multiple employees (bulk operations)
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

    // Validate update data
    const validatedUpdates = userUpdateSchema.parse(updates)

    // Update each user
    const updatedUsers = []
    for (const id of ids) {
      const existingUser = await serverDbManager.getUser(id)
      if (!existingUser) continue

      const updatedUser = {
        ...existingUser,
        ...validatedUpdates,
        startDate: validatedUpdates.startDate
          ? typeof validatedUpdates.startDate === 'string'
            ? new Date(validatedUpdates.startDate)
            : validatedUpdates.startDate
          : existingUser.startDate,
        updatedAt: new Date(),
      }

      await serverDbManager.saveUser(updatedUser)
      updatedUsers.push(updatedUser)
    }

    return NextResponse.json({
      success: true,
      data: updatedUsers,
      message: `${updatedUsers.length} employees updated successfully`,
    })
  } catch (error) {
    logger.error('Error updating employees', error as Error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update employees' },
      { status: 500 }
    )
  }
})

// DELETE /api/admin/employees - Delete multiple employees (bulk operations)
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

    // Delete each user
    let deletedCount = 0
    for (const id of ids) {
      const existingUser = await serverDbManager.getUser(id)
      if (existingUser) {
        await serverDbManager.deleteUser(id)
        deletedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} employees deleted successfully`,
    })
  } catch (error) {
    logger.error('Error deleting employees', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete employees' },
      { status: 500 }
    )
  }
})