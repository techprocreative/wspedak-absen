/**
 * Face Identify & Status API
 * POST /api/face/identify-status
 * 
 * Identifies user from face descriptor and returns their current attendance status
 */

import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'
import { findBestMatch, assessMatchQuality } from '@/lib/face-matching'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { descriptor } = body

    if (!descriptor || !Array.isArray(descriptor)) {
      return NextResponse.json(
        { success: false, error: 'Face descriptor is required' },
        { status: 400 }
      )
    }

    // Get all users with face embeddings
    const users = await serverDbManager.getUsers()
    const allEmbeddings = await Promise.all(
      users.map(async (user) => {
        const embeddings = await serverDbManager.getFaceEmbeddings(user.id)
        return embeddings.map(emb => ({
          userId: user.id,
          embedding: emb.embedding,
          user: user
        }))
      })
    )

    const knownEmbeddings = allEmbeddings.flat().filter(e => e.embedding)

    if (knownEmbeddings.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No enrolled faces found',
          errorCode: 'NO_FACES_ENROLLED',
          message: 'No users have enrolled their faces yet. Please enroll your face first to use face recognition attendance.',
          helpUrl: '/employee/dashboard'
        },
        { status: 404 }
      )
    }

    // Find best matching user using cosine similarity
    const bestMatch = findBestMatch(
      descriptor,
      knownEmbeddings.map(e => ({
        userId: e.userId,
        embedding: e.embedding
      }))
    )

    if (!bestMatch) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Face not recognized',
          errorCode: 'FACE_NOT_RECOGNIZED',
          message: 'Your face was not recognized. Please ensure you have enrolled your face or try again with better lighting.',
          details: {
            enrolledFaces: knownEmbeddings.length,
            minConfidenceRequired: 0.65
          }
        },
        { status: 404 }
      )
    }

    // Assess match quality
    const matchQuality = assessMatchQuality(bestMatch)
    
    if (matchQuality.quality === 'poor') {
      logger.warn('Low confidence face match', {
        userId: bestMatch.userId,
        confidence: bestMatch.confidence,
        quality: matchQuality.quality
      })
    }

    const matchedUser = knownEmbeddings.find(e => e.userId === bestMatch.userId)?.user
    if (!matchedUser) {
      return NextResponse.json(
        { success: false, error: 'User data not found' },
        { status: 404 }
      )
    }

    // Get today's attendance for this user
    const today = new Date().toISOString().split('T')[0]
    const attendanceRecords = await serverDbManager.getAttendanceRecords()
    const todayAttendance = attendanceRecords.filter(
      r => r.userId === matchedUser.id && r.timestamp.startsWith(today)
    )

    // Determine current status
    const clockIn = todayAttendance.find(r => r.type === 'check-in')
    const clockOut = todayAttendance.find(r => r.type === 'check-out')
    const breakStart = todayAttendance.find(r => r.type === 'break-start')
    const breakEnd = todayAttendance.find(r => r.type === 'break-end')

    let status: 'not-started' | 'checked-in' | 'on-break' | 'checked-out' = 'not-started'
    
    if (clockOut) {
      status = 'checked-out'
    } else if (breakStart && !breakEnd) {
      status = 'on-break'
    } else if (clockIn) {
      status = 'checked-in'
    }

    // Get user's shift info (using default for now)
    const shift = {
      startTime: '08:00',
      endTime: '17:00',
      lateThresholdMinutes: 15
    }

    const userStatus = {
      userId: matchedUser.id,
      userName: matchedUser.name,
      userEmail: matchedUser.email,
      department: matchedUser.department || 'General',
      todayAttendance: {
        clockIn: clockIn?.timestamp || null,
        clockOut: clockOut?.timestamp || null,
        breakStart: breakStart?.timestamp || null,
        breakEnd: breakEnd?.timestamp || null,
        status
      },
      shift
    }

    return NextResponse.json({
      success: true,
      data: userStatus,
      confidence: bestMatch.confidence,
      matchQuality: matchQuality.quality,
      similarity: bestMatch.similarity
    })

  } catch (error) {
    logger.error('Error identifying user', error as Error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to identify user',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
