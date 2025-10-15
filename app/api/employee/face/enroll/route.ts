/**
 * Employee Face Enrollment API
 * Allows employees to enroll their own face
 */

import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'
import { validateEmbedding } from '@/lib/face-matching'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, descriptor, quality, metadata } = body

    // Validate input
    if (!userId || !descriptor) {
      return NextResponse.json(
        { success: false, error: 'userId and descriptor are required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(descriptor)) {
      return NextResponse.json(
        { success: false, error: 'descriptor must be an array' },
        { status: 400 }
      )
    }

    // Validate embedding
    if (!validateEmbedding(descriptor)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid face descriptor. Please try capturing your face again with better lighting.' 
        },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await serverDbManager.getUser(userId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user already has embeddings
    const existingEmbeddings = await serverDbManager.getFaceEmbeddings(userId)
    
    // Limit to 3 face embeddings per user
    if (existingEmbeddings.length >= 3) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Maximum number of face enrollments (3) reached. Please delete an old enrollment first.',
          data: {
            currentCount: existingEmbeddings.length,
            maxCount: 3
          }
        },
        { status: 400 }
      )
    }

    // Create new embedding
    const embedding = {
      id: crypto.randomUUID(),
      userId,
      embedding: descriptor,
      quality: quality || 0.8,
      metadata: {
        ...metadata,
        enrolledAt: new Date().toISOString(),
        method: 'webcam',
        enrollmentNumber: existingEmbeddings.length + 1
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const savedEmbedding = await serverDbManager.saveFaceEmbedding(embedding)

    logger.info('Face enrolled successfully', {
      userId,
      embeddingId: savedEmbedding.id,
      quality: savedEmbedding.quality
    })

    // Create notification for user
    await serverDbManager.createNotification({
      userId,
      title: 'Face Enrolled Successfully',
      message: `Your face has been enrolled (#${embedding.metadata.enrollmentNumber}). You can now use face recognition for attendance.`,
      type: 'success',
      priority: 'normal'
    })

    return NextResponse.json({
      success: true,
      message: 'Face enrolled successfully',
      data: {
        id: savedEmbedding.id,
        userId: savedEmbedding.userId,
        quality: savedEmbedding.quality,
        enrollmentNumber: embedding.metadata.enrollmentNumber,
        totalEnrollments: existingEmbeddings.length + 1,
        maxEnrollments: 3,
        createdAt: savedEmbedding.createdAt
      }
    })
  } catch (error: any) {
    logger.error('Error enrolling face', error as Error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to enroll face. Please try again.' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Get user's enrolled faces
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId parameter is required' },
        { status: 400 }
      )
    }

    // Get face embeddings
    const embeddings = await serverDbManager.getFaceEmbeddings(userId)

    return NextResponse.json({
      success: true,
      data: {
        userId,
        embeddings: embeddings.map(e => ({
          id: e.id,
          quality: e.quality,
          metadata: e.metadata,
          isActive: e.isActive,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt
        })),
        count: embeddings.length,
        maxCount: 3
      }
    })
  } catch (error: any) {
    logger.error('Error fetching user face embeddings', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch face enrollments' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete a face enrollment
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const embeddingId = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!embeddingId || !userId) {
      return NextResponse.json(
        { success: false, error: 'embeddingId and userId are required' },
        { status: 400 }
      )
    }

    // Verify the embedding belongs to the user
    const embeddings = await serverDbManager.getFaceEmbeddings(userId)
    const embedding = embeddings.find(e => e.id === embeddingId)

    if (!embedding) {
      return NextResponse.json(
        { success: false, error: 'Face enrollment not found or does not belong to this user' },
        { status: 404 }
      )
    }

    const success = await serverDbManager.deleteFaceEmbedding(embeddingId)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete face enrollment' },
        { status: 500 }
      )
    }

    logger.info('Face enrollment deleted', { userId, embeddingId })

    await serverDbManager.createNotification({
      userId,
      title: 'Face Enrollment Deleted',
      message: 'One of your face enrollments has been deleted.',
      type: 'info',
      priority: 'normal'
    })

    return NextResponse.json({
      success: true,
      message: 'Face enrollment deleted successfully'
    })
  } catch (error: any) {
    logger.error('Error deleting face enrollment', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete face enrollment' },
      { status: 500 }
    )
  }
}
