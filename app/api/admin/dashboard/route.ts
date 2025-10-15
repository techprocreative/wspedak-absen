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

// Helper function to validate query parameters
function parseQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const query = {
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
  }

  return query
}

// GET /api/admin/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    // Parse query parameters
    const query = parseQueryParams(request)

    // Parse dates
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30))
    const endDate = query.endDate ? new Date(query.endDate) : new Date()

    // Get total users count
    const allUsers = await serverDbManager.getUsers()
    const totalUsers = allUsers.length

    // Get today's attendance statistics
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayAttendanceRecords = await serverDbManager.getAttendanceRecords({
      startDate: today,
      endDate: tomorrow,
    })

    // Group records by user
    const recordsByUser = new Map<string, any[]>()
    for (const record of todayAttendanceRecords) {
      if (!recordsByUser.has(record.userId)) {
        recordsByUser.set(record.userId, [])
      }
      recordsByUser.get(record.userId)!.push(record)
    }

    // Calculate attendance statistics
    let presentToday = 0
    let lateToday = 0
    let absentToday = 0

    for (const [userId, records] of recordsByUser) {
      const checkIn = records.find(r => r.type === 'check-in')
      
      if (checkIn) {
        presentToday++
        
        // Check if late
        const checkInTime = new Date(checkIn.timestamp)
        const workStartTime = new Date(checkInTime)
        workStartTime.setHours(8, 0, 0, 0) // 8:00 AM
        const lateThreshold = 15 * 60 * 1000 // 15 minutes
        
        if (checkInTime.getTime() > workStartTime.getTime() + lateThreshold) {
          lateToday++
        }
      } else {
        absentToday++
      }
    }

    // Calculate absent users (users who didn't check in today)
    const checkedInUsers = Array.from(recordsByUser.keys())
    const absentUsers = allUsers.filter(user => !checkedInUsers.includes(user.id))
    absentToday = absentUsers.length

    // Calculate average attendance rate for the period
    const periodAttendanceRecords = await serverDbManager.getAttendanceRecords({
      startDate,
      endDate,
    })

    // Group records by user and date
    const recordsByUserAndDate = new Map<string, Map<string, any[]>>()
    for (const record of periodAttendanceRecords) {
      const date = new Date(record.timestamp).toDateString()
      
      if (!recordsByUserAndDate.has(record.userId)) {
        recordsByUserAndDate.set(record.userId, new Map())
      }
      
      const userRecords = recordsByUserAndDate.get(record.userId)!
      if (!userRecords.has(date)) {
        userRecords.set(date, [])
      }
      userRecords.get(date)!.push(record)
    }

    // Calculate attendance rate
    let totalExpectedDays = 0
    let totalPresentDays = 0

    for (const [userId, dateRecords] of recordsByUserAndDate) {
      for (const [date, records] of dateRecords) {
        totalExpectedDays++
        
        const checkIn = records.find(r => r.type === 'check-in')
        if (checkIn) {
          totalPresentDays++
        }
      }
    }

    const averageAttendanceRate = totalExpectedDays > 0 ? (totalPresentDays / totalExpectedDays) * 100 : 0

    // Get department statistics
    const usersByDepartment = new Map<string, any[]>()
    for (const user of allUsers) {
      const dept = user.department || 'Unknown'
      if (!usersByDepartment.has(dept)) {
        usersByDepartment.set(dept, [])
      }
      usersByDepartment.get(dept)!.push(user)
    }

    const departmentStats = []
    for (const [department, deptUsers] of usersByDepartment) {
      // Get attendance records for this department
      const deptRecords = periodAttendanceRecords.filter(record =>
        deptUsers.some((user: any) => user.id === record.userId)
      )

      // Group records by user and date
      const deptRecordsByUserAndDate = new Map<string, Map<string, any[]>>()
      for (const record of deptRecords) {
        const date = new Date(record.timestamp).toDateString()
        
        if (!deptRecordsByUserAndDate.has(record.userId)) {
          deptRecordsByUserAndDate.set(record.userId, new Map())
        }
        
        const userRecords = deptRecordsByUserAndDate.get(record.userId)!
        if (!userRecords.has(date)) {
          userRecords.set(date, [])
        }
        userRecords.get(date)!.push(record)
      }

      // Calculate department attendance
      let deptTotalExpectedDays = 0
      let deptTotalPresentDays = 0

      for (const [userId, dateRecords] of deptRecordsByUserAndDate) {
        for (const [date, records] of dateRecords) {
          deptTotalExpectedDays++
          
          const checkIn = records.find(r => r.type === 'check-in')
          if (checkIn) {
            deptTotalPresentDays++
          }
        }
      }

      // Calculate today's attendance for this department
      const deptCheckedInUsers = checkedInUsers.filter(userId =>
        deptUsers.some((user: any) => user.id === userId)
      )
      const deptPresentToday = deptCheckedInUsers.length

      departmentStats.push({
        department,
        totalEmployees: deptUsers.length,
        presentToday: deptPresentToday,
        attendanceRate: deptTotalExpectedDays > 0 ? (deptTotalPresentDays / deptTotalExpectedDays) * 100 : 0,
      })
    }

    // Get recent users
    const recentUsers = await serverDbManager.getUsers({
      limit: 5,
      offset: 0,
    })
    recentUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Get recent attendance records
    const recentAttendance = await serverDbManager.getAttendanceRecords({
      limit: 10,
      offset: 0,
    })
    recentAttendance.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Get user information for recent attendance records
    const recentAttendanceWithUsers = await Promise.all(
      recentAttendance.slice(0, 5).map(async (record) => {
        const user = await serverDbManager.getUser(record.userId)
        return {
          ...record,
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
          } : null,
        }
      })
    )

    // Generate recent activity
    const recentActivity: any[] = []

    // Return dashboard statistics
    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        presentToday,
        lateToday,
        absentToday,
        averageAttendanceRate,
        departmentStats,
        recentUsers: recentUsers.slice(0, 5),
        recentAttendance: recentAttendanceWithUsers,
        recentActivity,
      },
    })
  } catch (error) {
    logger.error('Error fetching dashboard statistics', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}
