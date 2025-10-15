/**
 * Face Action API
 * POST /api/face/action
 * 
 * Handles check-in, break-start, break-end, check-out with late excuse support
 */

import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'
import { findBestMatch, assessMatchQuality } from '@/lib/face-matching'
import { logger } from '@/lib/logger'

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
        { success: false, error: 'No enrolled faces found' },
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
        { success: false, error: 'Face not recognized' },
        { status: 404 }
      )
    }

    const matchedUser = knownEmbeddings.find(e => e.userId === bestMatch.userId)?.user
    if (!matchedUser) {
      return NextResponse.json(
        { success: false, error: 'User data not found' },
        { status: 404 }
      )
    }

    // Assess match quality
    const matchQuality = assessMatchQuality(bestMatch)
    logger.info('Face matched for action', {
      userId: matchedUser.id,
      action,
      confidence: bestMatch.confidence,
      quality: matchQuality.quality
    })

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
      logger.info('Late excuse submitted', {
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
        confidence: bestMatch.confidence,
        similarity: bestMatch.similarity,
        matchQuality: matchQuality.quality,
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
        confidence: bestMatch.confidence,
        matchQuality: matchQuality.quality
      }
    })

  } catch (error) {
    logger.error('Error processing action', error as Error)
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
