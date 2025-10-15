import { FaceEmbedding } from '@/lib/face-recognition'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export const faceService = {
  async enrollFace(embedding: FaceEmbedding): Promise<boolean> {
    try {
      const res = await fetch('/api/admin/face/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          id: embedding.id,
          userId: embedding.userId,
          descriptor: Array.from(embedding.embedding), // Changed from 'embedding' to 'descriptor' to match API
          quality: embedding.metadata?.quality,
          metadata: embedding.metadata,
        }),
      })
      const data = await res.json()
      return !!data?.success
    } catch (e) {
      logger.error('enrollFace error', e as Error)
      return false
    }
  },

  async getEmbeddingsByUser(userId: string) {
    const res = await fetch(`/api/admin/face/embeddings/user/${userId}`, {
      credentials: 'include',
      cache: 'no-store',
    })
    return res.json()
  },

  async deleteEmbedding(id: string) {
    const res = await fetch(`/api/admin/face/embeddings/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store',
    })
    return res.json()
  },
}

