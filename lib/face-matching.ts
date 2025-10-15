/**
 * Face Matching Engine
 * Matches face descriptors against stored embeddings
 */

import { serverDbManager } from './server-db'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export interface FaceMatchResult {
  userId: string
  userName?: string
  confidence: number
  matchedEmbeddingId: string
}

export class FaceMatcher {
  // Confidence threshold for face matching (0-1)
  private static readonly MATCH_THRESHOLD = 0.6
  
  // Maximum distance for face matching (lower is better)
  private static readonly MAX_DISTANCE = 0.6
  
  /**
   * Calculate Euclidean distance between two descriptors
   */
  private static euclideanDistance(descriptor1: Float32Array | number[], descriptor2: number[]): number {
    if (descriptor1.length !== descriptor2.length) {
      throw new Error('Descriptor dimensions do not match')
    }
    
    let sum = 0
    for (let i = 0; i < descriptor1.length; i++) {
      const diff = descriptor1[i] - descriptor2[i]
      sum += diff * diff
    }
    
    return Math.sqrt(sum)
  }
  
  /**
   * Match a face descriptor against all stored embeddings
   * Returns the best matching user ID and confidence score
   */
  static async matchFace(
    descriptor: Float32Array | number[]
  ): Promise<FaceMatchResult | null> {
    try {
      // Validate descriptor
      if (!descriptor || descriptor.length !== 128) {
        logger.error('Invalid descriptor: must be 128 dimensions', new Error())
        return null
      }
      
      // Get all active face embeddings
      const allEmbeddings = await serverDbManager.getAllFaceEmbeddings()
      
      if (allEmbeddings.length === 0) {
        logger.info('No face embeddings found in database')
        return null
      }
      
      logger.info('Matching face against ${allEmbeddings.length} embeddings')
      
      // Find best match
      let bestMatch: FaceMatchResult | null = null
      let bestDistance = Infinity
      
      for (const embedding of allEmbeddings) {
        if (!embedding.embedding || embedding.embedding.length !== 128) {
          logger.warn('Skipping invalid embedding ${embedding.id}')
          continue
        }
        
        const distance = this.euclideanDistance(descriptor, embedding.embedding)
        
        if (distance < bestDistance) {
          bestDistance = distance
          const confidence = 1 - distance // Convert distance to confidence (0-1)
          
          bestMatch = {
            userId: embedding.userId,
            confidence,
            matchedEmbeddingId: embedding.id
          }
        }
      }
      
      // Check if best match meets threshold
      if (bestMatch && bestMatch.confidence >= this.MATCH_THRESHOLD && bestDistance <= this.MAX_DISTANCE) {
        // Get user info
        const user = await serverDbManager.getUser(bestMatch.userId)
        if (user) {
          bestMatch.userName = user.name
        }
        
        logger.info('Match found: ${bestMatch.userName} (confidence: ${(bestMatch.confidence * 100).toFixed(2)}%)')
        return bestMatch
      }
      
      logger.info('No match found. Best distance: ${bestDistance}, confidence: ${bestMatch?.confidence}')
      return null
    } catch (error) {
      logger.error('Error matching face', error as Error)
      return null
    }
  }
  
  /**
   * Verify if a face matches a specific user
   * Used for verification scenarios (1:1 matching)
   */
  static async verifyFace(
    descriptor: Float32Array | number[],
    userId: string
  ): Promise<{ matched: boolean; confidence: number; details?: string }> {
    try {
      // Validate descriptor
      if (!descriptor || descriptor.length !== 128) {
        return { 
          matched: false, 
          confidence: 0, 
          details: 'Invalid descriptor dimensions' 
        }
      }
      
      // Get user's embeddings
      const userEmbeddings = await serverDbManager.getFaceEmbeddings(userId)
      
      if (userEmbeddings.length === 0) {
        return { 
          matched: false, 
          confidence: 0, 
          details: 'No face embeddings found for user' 
        }
      }
      
      logger.info('Verifying face against ${userEmbeddings.length} embeddings for user ${userId}')
      
      // Check against all user's embeddings (take best match)
      let maxConfidence = 0
      let minDistance = Infinity
      
      for (const embedding of userEmbeddings) {
        if (!embedding.embedding || embedding.embedding.length !== 128) {
          continue
        }
        
        const distance = this.euclideanDistance(descriptor, embedding.embedding)
        const confidence = 1 - distance
        
        if (distance < minDistance) {
          minDistance = distance
          maxConfidence = confidence
        }
      }
      
      const matched = maxConfidence >= this.MATCH_THRESHOLD && minDistance <= this.MAX_DISTANCE
      
      logger.debug('Verification result', { matched, confidence: (maxConfidence * 100).toFixed(2) });
      
      return {
        matched,
        confidence: maxConfidence,
        details: matched 
          ? `Face verified with ${(maxConfidence * 100).toFixed(2)}% confidence`
          : `Confidence too low: ${(maxConfidence * 100).toFixed(2)}%`
      }
    } catch (error) {
      logger.error('Error verifying face', error as Error)
      return { 
        matched: false, 
        confidence: 0, 
        details: 'Error during verification' 
      }
    }
  }
  
  /**
   * Get match threshold (for UI display)
   */
  static getMatchThreshold(): number {
    return this.MATCH_THRESHOLD
  }
  
  /**
   * Check if confidence score is good enough
   */
  static isConfidenceAcceptable(confidence: number): boolean {
    return confidence >= this.MATCH_THRESHOLD
  }
  
  /**
   * Get confidence level label
   */
  static getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.8) return 'high'
    if (confidence >= 0.6) return 'medium'
    return 'low'
  }
}

export default FaceMatcher
