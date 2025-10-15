/**
 * Face Matching Library
 * Provides robust face matching algorithms with cosine similarity
 */

import { logger } from '@/lib/logger'

export interface FaceMatchResult {
  userId: string
  confidence: number
  distance: number
  similarity: number
}

export interface MatchingConditions {
  lighting?: number
  imageQuality?: number
  faceSize?: number
}

/**
 * Calculate cosine similarity between two face embeddings
 * Returns value between 0 and 1 (higher is more similar)
 */
export function calculateCosineSimilarity(
  embedding1: number[] | Float32Array,
  embedding2: number[] | Float32Array
): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length')
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i]
    norm1 += embedding1[i] * embedding1[i]
    norm2 += embedding2[i] * embedding2[i]
  }

  if (norm1 === 0 || norm2 === 0) {
    return 0
  }

  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))

  // Convert from [-1, 1] to [0, 1] scale
  return (similarity + 1) / 2
}

/**
 * Calculate Euclidean distance between two face embeddings
 * Returns distance value (lower is more similar)
 */
export function calculateEuclideanDistance(
  embedding1: number[] | Float32Array,
  embedding2: number[] | Float32Array
): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length')
  }

  let sum = 0
  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i]
    sum += diff * diff
  }

  return Math.sqrt(sum)
}

/**
 * Get adaptive threshold based on image quality conditions
 */
export function getAdaptiveThreshold(conditions: MatchingConditions = {}): number {
  let baseThreshold = 0.65 // Base threshold for cosine similarity

  const { lighting = 1, imageQuality = 1, faceSize = 150 } = conditions

  // Adjust threshold based on conditions
  if (lighting < 0.5) {
    baseThreshold -= 0.1
    logger.info('Low lighting detected, lowering threshold')
  }

  if (imageQuality < 0.6) {
    baseThreshold -= 0.05
    logger.info('Low image quality detected, lowering threshold')
  }

  if (faceSize < 100) {
    baseThreshold -= 0.05
    logger.info('Small face size detected, lowering threshold')
  }

  // Ensure threshold stays within reasonable bounds
  return Math.max(0.45, Math.min(0.85, baseThreshold))
}

/**
 * Match a face embedding against known embeddings
 * Returns matches sorted by confidence (highest first)
 */
export function matchFaceEmbedding(
  targetEmbedding: number[] | Float32Array,
  knownEmbeddings: Array<{
    userId: string
    embedding: number[] | Float32Array
  }>,
  conditions: MatchingConditions = {}
): FaceMatchResult[] {
  const threshold = getAdaptiveThreshold(conditions)
  const matches: FaceMatchResult[] = []

  for (const known of knownEmbeddings) {
    try {
      // Calculate both similarity and distance
      const similarity = calculateCosineSimilarity(targetEmbedding, known.embedding)
      const distance = calculateEuclideanDistance(targetEmbedding, known.embedding)

      // Use similarity as primary metric (cosine similarity)
      const confidence = similarity

      if (confidence >= threshold) {
        matches.push({
          userId: known.userId,
          confidence,
          distance,
          similarity
        })
      }
    } catch (error) {
      logger.error(`Error matching face for user ${known.userId}`, error as Error)
    }
  }

  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence)

  return matches
}

/**
 * Find best match from multiple candidates
 */
export function findBestMatch(
  targetEmbedding: number[] | Float32Array,
  knownEmbeddings: Array<{
    userId: string
    embedding: number[] | Float32Array
  }>,
  conditions: MatchingConditions = {}
): FaceMatchResult | null {
  const matches = matchFaceEmbedding(targetEmbedding, knownEmbeddings, conditions)

  if (matches.length === 0) {
    return null
  }

  // Return the best match (highest confidence)
  return matches[0]
}

/**
 * Normalize face embedding vector
 * Useful for improving matching consistency
 */
export function normalizeEmbedding(embedding: number[] | Float32Array): Float32Array {
  const normalized = new Float32Array(embedding.length)
  let magnitude = 0

  // Calculate magnitude
  for (let i = 0; i < embedding.length; i++) {
    magnitude += embedding[i] * embedding[i]
  }
  magnitude = Math.sqrt(magnitude)

  // Normalize
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      normalized[i] = embedding[i] / magnitude
    }
  } else {
    // If magnitude is 0, return original
    for (let i = 0; i < embedding.length; i++) {
      normalized[i] = embedding[i]
    }
  }

  return normalized
}

/**
 * Validate face embedding
 * Checks if embedding is valid and not corrupted
 */
export function validateEmbedding(embedding: number[] | Float32Array): boolean {
  if (!embedding || embedding.length === 0) {
    return false
  }

  // Check if all values are valid numbers
  for (let i = 0; i < embedding.length; i++) {
    if (!isFinite(embedding[i])) {
      return false
    }
  }

  // Check if embedding is not all zeros
  let hasNonZero = false
  for (let i = 0; i < embedding.length; i++) {
    if (embedding[i] !== 0) {
      hasNonZero = true
      break
    }
  }

  return hasNonZero
}

/**
 * Calculate confidence score from distance
 * Converts distance to confidence score (0-1)
 */
export function distanceToConfidence(distance: number, maxDistance: number = 1.5): number {
  // Convert distance to confidence (inverse relationship)
  const confidence = Math.max(0, 1 - (distance / maxDistance))
  return confidence
}

/**
 * Assess face match quality
 */
export function assessMatchQuality(matchResult: FaceMatchResult): {
  quality: 'excellent' | 'good' | 'fair' | 'poor'
  message: string
} {
  const { confidence } = matchResult

  if (confidence >= 0.85) {
    return {
      quality: 'excellent',
      message: 'Very high confidence match'
    }
  } else if (confidence >= 0.75) {
    return {
      quality: 'good',
      message: 'High confidence match'
    }
  } else if (confidence >= 0.65) {
    return {
      quality: 'fair',
      message: 'Moderate confidence match'
    }
  } else {
    return {
      quality: 'poor',
      message: 'Low confidence match'
    }
  }
}
