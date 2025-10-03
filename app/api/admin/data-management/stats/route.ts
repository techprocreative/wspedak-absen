/**
 * Data Management Stats API
 * GET /api/admin/data-management/stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/api-auth-middleware'
import { serverDbManager } from '@/lib/server-db'

export const dynamic = 'force-dynamic'

async function GET(request: NextRequest) {
  try {
    // Get database stats
    const users = await serverDbManager.getUsers()
    const attendanceRecords = await serverDbManager.getAttendanceRecords()
    
    // Calculate stats
    const totalRecords = users.length + attendanceRecords.length
    const activeUsers = users.filter(u => u.isActive).length
    
    // Storage estimation (rough calculation)
    const storageUsedMB = (totalRecords * 2) / 1000 // ~2KB per record average
    const storageLimitGB = 10 // Default limit
    
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentUsers = users.filter(u => 
      new Date(u.createdAt) > sevenDaysAgo
    ).length
    
    const recentAttendance = attendanceRecords.filter(r => 
      new Date(r.timestamp) > sevenDaysAgo
    ).length
    
    // Calculate system health
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy'
    const storagePercentage = (storageUsedMB / (storageLimitGB * 1000)) * 100
    
    if (storagePercentage > 90) {
      systemHealth = 'critical'
    } else if (storagePercentage > 75) {
      systemHealth = 'warning'
    }
    
    // Mock backup times (in production, read from backup logs)
    const lastBackup = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    const nextBackup = new Date(Date.now() + 22 * 60 * 60 * 1000) // in 22 hours
    
    // Count archived records (soft-deleted/inactive)
    const archivedRecords = users.filter(u => !u.isActive).length
    
    const stats = {
      totalRecords,
      activeRecords: activeUsers + attendanceRecords.length,
      lastBackup: lastBackup.toISOString(),
      nextBackup: nextBackup.toISOString(),
      storageUsed: parseFloat(storageUsedMB.toFixed(2)),
      storageLimit: storageLimitGB,
      storagePercentage: parseFloat(storagePercentage.toFixed(1)),
      recentImports: recentUsers,
      recentExports: 0, // Would come from export logs
      archivedRecords,
      systemHealth,
      breakdown: {
        users: users.length,
        attendance: attendanceRecords.length,
        activeUsers,
        inactiveUsers: users.length - activeUsers
      }
    }
    
    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error fetching data management stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch data management stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

const authenticatedGET = withAdminAuth(GET)
export { authenticatedGET as GET }
