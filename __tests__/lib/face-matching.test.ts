/**
 * Unit Tests for Face Matching Engine
 */

import FaceMatcher from '@/lib/face-matching'

describe('FaceMatcher', () => {
  describe('getMatchThreshold', () => {
    it('should return the default match threshold', () => {
      const threshold = FaceMatcher.getMatchThreshold()
      expect(threshold).toBe(0.6)
    })
  })

  describe('isConfidenceAcceptable', () => {
    it('should return true for confidence >= threshold', () => {
      expect(FaceMatcher.isConfidenceAcceptable(0.8)).toBe(true)
      expect(FaceMatcher.isConfidenceAcceptable(0.6)).toBe(true)
    })

    it('should return false for confidence < threshold', () => {
      expect(FaceMatcher.isConfidenceAcceptable(0.5)).toBe(false)
      expect(FaceMatcher.isConfidenceAcceptable(0.3)).toBe(false)
    })
  })

  describe('getConfidenceLevel', () => {
    it('should return "high" for confidence >= 0.8', () => {
      expect(FaceMatcher.getConfidenceLevel(0.9)).toBe('high')
      expect(FaceMatcher.getConfidenceLevel(0.8)).toBe('high')
    })

    it('should return "medium" for confidence >= 0.6 and < 0.8', () => {
      expect(FaceMatcher.getConfidenceLevel(0.7)).toBe('medium')
      expect(FaceMatcher.getConfidenceLevel(0.6)).toBe('medium')
    })

    it('should return "low" for confidence < 0.6', () => {
      expect(FaceMatcher.getConfidenceLevel(0.5)).toBe('low')
      expect(FaceMatcher.getConfidenceLevel(0.2)).toBe('low')
    })
  })

  describe('matchFace', () => {
    it('should return null for invalid descriptor', async () => {
      const invalidDescriptor = new Float32Array(64) // Wrong size
      const result = await FaceMatcher.matchFace(invalidDescriptor)
      expect(result).toBeNull()
    })

    it('should return null for empty descriptor', async () => {
      const result = await FaceMatcher.matchFace(null as any)
      expect(result).toBeNull()
    })
  })

  describe('verifyFace', () => {
    it('should return not matched for invalid descriptor', async () => {
      const invalidDescriptor = new Float32Array(64) // Wrong size
      const result = await FaceMatcher.verifyFace(invalidDescriptor, 'test-user-id')
      
      expect(result.matched).toBe(false)
      expect(result.confidence).toBe(0)
      expect(result.details).toContain('Invalid descriptor')
    })
  })
})
