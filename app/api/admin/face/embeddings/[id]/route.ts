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

// DELETE /api/admin/face/embeddings/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await checkAdminAuth(request)
    if (authError) return authError

    const { id } = params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    await serverDbManager.deleteFaceEmbedding(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting face embedding', error as Error)
    return NextResponse.json({ success: false, error: 'Failed to delete embedding' }, { status: 500 })
  }
}

