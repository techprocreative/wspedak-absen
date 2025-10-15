/**
 * Face Recognition Check-in API
 * Allows employees to check-in using face recognition
 */

import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'
import { findBestMatch, assessMatchQuality } from '@/lib/face-matching'
import { logger, logApiRequest, logApiError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { descriptor, timestamp, location, type } = body
    
    // Validate input
    if (!descriptor || !Array.isArray(descriptor)) {
      return NextResponse.json(
        { success: false, error: 'Invalid face descriptor' },
        { status: 400 }
      )
    }
    
    if (descriptor.length !== 128) {
      return NextResponse.json(
        { success: false, error: 'Invalid descriptor dimensions. Expected 128, got ' + descriptor.length },
        { status: 400 }
      )
    }
    
    // Match face against all enrolled faces
    logger.debug('Attempting to match face')
    
    // Get all users with face embeddings
    const users = await serverDbManager.getUsers()
    const allEmbeddings = await Promise.all(
      users.map(async (user) => {
        const embeddings = await serverDbManager.getFaceEmbeddings(user.id)
        return embeddings.map(emb => ({
          userId: user.id,
          embedding: emb.embedding,
          embeddingId: emb.id,
          user: user
        }))
      })
    )

    const knownEmbeddings = allEmbeddings.flat().filter(e => e.embedding)

    if (knownEmbeddings.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No enrolled faces found. Please enroll your face first.',
          errorCode: 'NO_FACES_ENROLLED'
        },
        { status: 404 }
      )
    }

    // Find best matching user
    const match = findBestMatch(
      descriptor,
      knownEmbeddings.map(e => ({
        userId: e.userId,
        embedding: e.embedding
      }))
    )
    
    if (!match) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Face not recognized. Please enroll your face first or use manual check-in.',
          errorCode: 'FACE_NOT_RECOGNIZED'
        },
        { status: 404 }
      )
    }
    
    // Assess match quality
    const matchQuality = assessMatchQuality(match)
    
    if (matchQuality.quality === 'poor') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Face match confidence too low (${(match.confidence * 100).toFixed(1)}%). Please try again with better lighting.`,
          errorCode: 'LOW_CONFIDENCE',
          confidence: match.confidence
        },
        { status: 400 }
      )
    }
    
    // Get matched embedding info
    const matchedEmbedding = knownEmbeddings.find(e => e.userId === match.userId)
    
    // Get user details
    const user = await serverDbManager.getUser(match.userId)
    
    if (!user || !user.isActive) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not found or inactive',
          errorCode: 'USER_INACTIVE'
        },
        { status: 404 }
      )
    }
    
    // Determine check-in type if not provided
    const checkType = type || 'check-in'
    
    // Check if already checked in today (prevent duplicate check-ins)
    if (checkType === 'check-in') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayRecords = await serverDbManager.getAttendanceRecords({
        userId: user.id,
        startDate: today,
        type: 'check-in'
      })
      
      if (todayRecords.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'You have already checked in today',
            errorCode: 'ALREADY_CHECKED_IN',
            existingRecord: todayRecords[0]
          },
          { status: 400 }
        )
      }
    }
    
    // Calculate status (present/late)
    const checkInTime = new Date(timestamp || Date.now())
    const time = checkInTime.getHours() * 60 + checkInTime.getMinutes()
    const workStart = 8 * 60 // 8:00 AM
    const lateThreshold = 15 // 15 minutes
    
    let status: 'present' | 'late' = 'present'
    if (checkType === 'check-in' && time > workStart + lateThreshold) {
      status = 'late'
    }
    
    // Create attendance record
    const record = {
      id: crypto.randomUUID(),
      userId: user.id,
      timestamp: checkInTime,
      type: checkType as any,
      location: location ? JSON.stringify(location) : undefined,
      status,
      verified: true, // Face recognition verified
      synced: true,
      metadata: {
        faceMatchConfidence: match.confidence,
        matchQuality: matchQuality.quality,
        similarity: match.similarity,
        method: 'face-recognition',
        matchedEmbeddingId: matchedEmbedding?.embeddingId
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const savedRecord = await serverDbManager.saveAttendanceRecord(record)
    
    // Create notification for user
    await serverDbManager.createNotification({
      userId: user.id,
      title: checkType === 'check-in' ? 'Check-in Successful' : 'Check-out Successful',
      message: `You have successfully ${checkType === 'check-in' ? 'checked in' : 'checked out'} at ${checkInTime.toLocaleTimeString('id-ID')}${status === 'late' ? ' (Late)' : ''}`,
      type: status === 'late' ? 'warning' : 'success',
      priority: 'normal'
    })
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: `${checkType === 'check-in' ? 'Check-in' : 'Check-out'} successful`,
      data: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        department: user.department,
        timestamp: checkInTime.toISOString(),
        type: checkType,
        status,
        confidence: match.confidence,
        matchQuality: matchQuality.quality,
        similarity: match.similarity,
        record: savedRecord
      }
    })
  } catch (error: any) {
    logApiError('POST', '/api/attendance/face-checkin', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Check-in failed',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}
