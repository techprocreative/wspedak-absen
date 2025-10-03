/**
 * Face Action API
 * POST /api/face/action
 * 
 * Handles check-in, break-start, break-end, check-out with late excuse support
 */

import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'

export const dynamic = 'force-dynamic'

type ActionType = 'check-in' | 'break-start' | 'break-end' | 'check-out'

interface LateExcuse {
  reasonType: string
  reason: string
  notes: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      descriptor, 
      action, 
      timestamp, 
      location,
      lateExcuse 
    }: {
      descriptor: number[]
      action: ActionType
      timestamp: string
      location: { latitude: number; longitude: number } | null
      lateExcuse: LateExcuse | null
    } = body

    if (!descriptor || !action || !timestamp) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Identify user
    const users = await serverDbManager.getUsers()
    const usersWithFace = users.filter(u => u.faceDescriptor)

    let matchedUser = null
    let bestDistance = Infinity
    const MATCH_THRESHOLD = 0.6

    for (const user of usersWithFace) {
      const userDescriptor = JSON.parse(user.faceDescriptor as string)
      const distance = euclideanDistance(descriptor, userDescriptor)
      
      if (distance < bestDistance && distance < MATCH_THRESHOLD) {
        bestDistance = distance
        matchedUser = user
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { success: false, error: 'Face not recognized' },
        { status: 404 }
      )
    }

    // Create attendance record
    const attendanceRecord = {
      userId: matchedUser.id,
      timestamp,
      type: action,
      location: location ? JSON.stringify(location) : null,
      photo: null,
      notes: lateExcuse ? `Late excuse: ${lateExcuse.reasonType} - ${lateExcuse.notes}` : null
    }

    await serverDbManager.addAttendanceRecord(attendanceRecord)

    // If late excuse provided, create exception request
    if (lateExcuse && action === 'check-in') {
      // In production, save to attendance_exceptions table
      console.log('Late excuse submitted:', {
        user: matchedUser.name,
        type: lateExcuse.reasonType,
        notes: lateExcuse.notes,
        timestamp
      })
      
      // Create audit log
      await serverDbManager.addAuditLog({
        userId: matchedUser.id,
        action: 'late_excuse_submitted',
        details: `Late excuse: ${lateExcuse.reasonType}`,
        metadata: {
          lateExcuse,
          timestamp
        }
      })
    }

    // Create audit log for action
    await serverDbManager.addAuditLog({
      userId: matchedUser.id,
      action: `attendance_${action}`,
      details: `${getActionLabel(action)} via face recognition`,
      metadata: {
        confidence: 1 - bestDistance,
        location,
        timestamp
      }
    })

    return NextResponse.json({
      success: true,
      message: getSuccessMessage(action, matchedUser.name),
      data: {
        userId: matchedUser.id,
        userName: matchedUser.name,
        action,
        timestamp,
        confidence: 1 - bestDistance
      }
    })

  } catch (error) {
    console.error('Error processing action:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process action',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2)
  }
  
  return Math.sqrt(sum)
}

function getActionLabel(action: ActionType): string {
  const labels = {
    'check-in': 'Check In',
    'break-start': 'Break Start',
    'break-end': 'Break End',
    'check-out': 'Check Out'
  }
  return labels[action]
}

function getSuccessMessage(action: ActionType, userName: string): string {
  const messages = {
    'check-in': `Welcome ${userName}! You have successfully checked in.`,
    'break-start': `Break started. Enjoy your break, ${userName}!`,
    'break-end': `Break ended. Welcome back, ${userName}!`,
    'check-out': `Goodbye ${userName}! You have successfully checked out.`
  }
  return messages[action]
}
