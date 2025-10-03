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

// POST /api/admin/settings/[section]/reset - Reset settings to default values
export async function POST(
  request: NextRequest,
  { params }: { params: { section: string } }
) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Validate section
    const validSections = ['company', 'attendance', 'security', 'notifications', 'mobile']
    if (!validSections.includes(params.section)) {
      return NextResponse.json(
        { success: false, error: 'Invalid section' },
        { status: 400 }
      )
    }

    // Reset settings
    await serverDbManager.resetSettings(params.section)

    // Get updated settings
    const updatedSettings = await serverDbManager.getSettings()

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: `Settings for ${params.section} reset to default values successfully`,
    })
  } catch (error) {
    console.error('Error resetting settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reset settings' },
      { status: 500 }
    )
  }
}