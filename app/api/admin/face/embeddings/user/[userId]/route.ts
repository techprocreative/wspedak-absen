import { NextRequest, NextResponse } from 'next/server'
import { serverDbManager } from '@/lib/server-db'
import { hasAnyServerRole } from '@/lib/server-auth'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
async function checkAdminAuth(request: NextRequest) {
  if (!hasAnyServerRole(['admin', 'hr', 'manager'])) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// GET /api/admin/face/embeddings/user/[userId]
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    const { userId } = params
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const list = await serverDbManager.getFaceEmbeddingsByUser(userId)
    return NextResponse.json({ success: true, data: list })
  } catch (error) {
    logger.error('Error fetching user face embeddings', error as Error)
    return NextResponse.json({ success: false, error: 'Failed to fetch embeddings' }, { status: 500 })
  }
}

