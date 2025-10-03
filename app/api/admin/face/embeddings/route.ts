/**
 * Face Embeddings Management API
 * Admin/HR can manage face embeddings for users
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/api-auth-middleware'
import { serverDbManager } from '@/lib/server-db'

export const dynamic = 'force-dynamic'

/**
 * GET - Get face embeddings for a user
 */
export const GET = withAdminAuth(async (request) => {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId parameter is required' },
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
    
    // Get face embeddings
    const embeddings = await serverDbManager.getFaceEmbeddings(userId)
    
    return NextResponse.json({
      success: true,
      data: embeddings.map(e => ({
        id: e.id,
        userId: e.userId,
        quality: e.quality,
        metadata: e.metadata,
        isActive: e.isActive,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt
      }))
    })
  } catch (error: any) {
    console.error('Error fetching face embeddings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch face embeddings' },
      { status: 500 }
    )
  }
})

/**
 * POST - Create/enroll new face embedding
 */
export const POST = withAdminAuth(async (request) => {
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
    
    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      return NextResponse.json(
        { success: false, error: 'Invalid descriptor: must be array of 128 numbers' },
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
    
    // Check if user already has embeddings (optional: limit to X embeddings per user)
    const existingEmbeddings = await serverDbManager.getFaceEmbeddings(userId)
    if (existingEmbeddings.length >= 5) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Maximum number of face embeddings (5) reached for this user. Please delete old embeddings first.' 
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
      metadata: metadata || {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const savedEmbedding = await serverDbManager.saveFaceEmbedding(embedding)
    
    // Create notification
    await serverDbManager.createNotification({
      userId,
      title: 'Face Enrolled Successfully',
      message: 'Your face has been enrolled in the attendance system. You can now use face recognition to check in.',
      type: 'success',
      priority: 'normal'
    })
    
    return NextResponse.json({
      success: true,
      message: 'Face embedding created successfully',
      data: {
        id: savedEmbedding.id,
        userId: savedEmbedding.userId,
        quality: savedEmbedding.quality,
        metadata: savedEmbedding.metadata,
        isActive: savedEmbedding.isActive,
        createdAt: savedEmbedding.createdAt
      }
    })
  } catch (error: any) {
    console.error('Error creating face embedding:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create face embedding' },
      { status: 500 }
    )
  }
})

/**
 * DELETE - Delete face embedding
 */
export const DELETE = withAdminAuth(async (request) => {
  try {
    const { searchParams } = request.nextUrl
    const embeddingId = searchParams.get('id')
    
    if (!embeddingId) {
      return NextResponse.json(
        { success: false, error: 'Embedding id parameter is required' },
        { status: 400 }
      )
    }
    
    const success = await serverDbManager.deleteFaceEmbedding(embeddingId)
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete face embedding' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Face embedding deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting face embedding:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete face embedding' },
      { status: 500 }
    )
  }
})
