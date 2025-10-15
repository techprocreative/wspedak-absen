/**
 * Dashboard Statistics API
 * Provides real-time statistics for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/api-auth-middleware'
import { serverDbManager } from '@/lib/server-db'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async (request) => {
  try {
    // Get all users
    const users = await serverDbManager.getUsers()
    
    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Get today's attendance
    const todayAttendance = await serverDbManager.getAttendanceRecords({
      startDate: today,
      endDate: tomorrow
    })
    
    // Calculate statistics
    const stats = {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      byRole: {
        admin: users.filter(u => u.role === 'admin').length,
        hr: users.filter(u => u.role === 'hr').length,
        manager: users.filter(u => u.role === 'manager').length,
        employee: users.filter(u => u.role === 'employee').length
      },
      byDepartment: users.reduce((acc, user) => {
        const dept = user.department || 'Unassigned'
        acc[dept] = (acc[dept] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      attendance: {
        today: todayAttendance.length,
        todayCheckIns: todayAttendance.filter(r => r.type === 'check-in').length,
        todayCheckOuts: todayAttendance.filter(r => r.type === 'check-out').length,
        todayLate: todayAttendance.filter(r => {
          if (r.type !== 'check-in') return false
          const time = r.timestamp.getHours() * 60 + r.timestamp.getMinutes()
          const workStart = 8 * 60 // 8:00 AM
          return time > workStart + 15 // 15 minutes late threshold
        }).length,
        todayPresent: todayAttendance.filter(r => {
          if (r.type !== 'check-in') return false
          const time = r.timestamp.getHours() * 60 + r.timestamp.getMinutes()
          const workStart = 8 * 60
          return time <= workStart + 15
        }).length
      }
    }
    
    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Error fetching dashboard stats', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
})
