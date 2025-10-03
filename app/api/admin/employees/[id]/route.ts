import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'
import { UserUpdateInput, userUpdateSchema } from '@/lib/validation-schemas'
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

// GET /api/admin/employees/[id] - Get a single employee by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    const { id } = params

    // Get user from database
    const user = await serverDbManager.getUser(id)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/employees/[id] - Update a single employee
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    const { id } = params

    // Check if user exists
    const existingUser = await serverDbManager.getUser(id)
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = userUpdateSchema.parse(body)

    // Update user
    const updatedUser = {
      ...existingUser,
      ...validatedData,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : existingUser.startDate,
      updatedAt: new Date(),
    }

    await serverDbManager.saveUser(updatedUser)

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Employee updated successfully',
    })
  } catch (error) {
    console.error('Error updating employee:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update employee' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/employees/[id] - Delete a single employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    const { id } = params

    // Check if user exists
    const existingUser = await serverDbManager.getUser(id)
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Delete user
    await serverDbManager.deleteUser(id)

    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete employee' },
      { status: 500 }
    )
  }
}