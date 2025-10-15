import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'
import { hasAnyServerRole } from '@/lib/server-auth'
import { z } from 'zod'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

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

// GET /api/admin/settings - Get all settings
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Get settings from database
    const settings = await serverDbManager.getSettings()

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    logger.error('Error fetching settings', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Parse and validate request body
    const body = await request.json()
    const { section, data } = body

    if (!section || !data) {
      return NextResponse.json(
        { success: false, error: 'Section and data are required' },
        { status: 400 }
      )
    }

    // Validate section
    const validSections = ['company', 'attendance', 'security', 'notifications', 'mobile']
    if (!validSections.includes(section)) {
      return NextResponse.json(
        { success: false, error: 'Invalid section' },
        { status: 400 }
      )
    }

    // Update settings
    await serverDbManager.updateSettings(section, data)

    // Get updated settings
    const updatedSettings = await serverDbManager.getSettings()

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully',
    })
  } catch (error) {
    logger.error('Error updating settings', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}