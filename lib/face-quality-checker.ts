/**
 * Face Quality Checker
 * 
 * Evaluates face detection quality for enrollment
 * Provides real-time feedback and scores
 */

import * as faceapi from 'face-api.js'

export interface FaceQualityResult {
  score: number // 0-100
  isGoodQuality: boolean
  feedback: string[]
  warnings: string[]
  details: {
    faceDetected: boolean
    confidence: number
    faceCentered: boolean
    faceSize: number
    lighting: 'good' | 'low' | 'high' | 'unknown'
    angle: 'good' | 'turned' | 'unknown'
    landmarksDetected: boolean
    eyesVisible: boolean
    mouthVisible: boolean
  }
}

export interface FaceQualityThresholds {
  minConfidence: number // 0-1
  minFaceSize: number // pixels
  minCenterDistance: number // 0-1 (0 = perfect center)
  maxCenterDistance: number // 0-1
  requireBothEyes: boolean
  requireMouth: boolean
}

export const DEFAULT_THRESHOLDS: FaceQualityThresholds = {
  minConfidence: 0.7,
  minFaceSize: 150,
  minCenterDistance: 0,
  maxCenterDistance: 0.3,
  requireBothEyes: true,
  requireMouth: true,
}

/**
 * Check face quality from detection result
 */
export function checkFaceQuality(
  detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }> | null,
  videoElement: HTMLVideoElement,
  thresholds: FaceQualityThresholds = DEFAULT_THRESHOLDS
): FaceQualityResult {
  const feedback: string[] = []
  const warnings: string[] = []
  let score = 0

  const result: FaceQualityResult = {
    score: 0,
    isGoodQuality: false,
    feedback,
    warnings,
    details: {
      faceDetected: false,
      confidence: 0,
      faceCentered: false,
      faceSize: 0,
      lighting: 'unknown',
      angle: 'unknown',
      landmarksDetected: false,
      eyesVisible: false,
      mouthVisible: false,
    },
  }

  // No face detected
  if (!detection) {
    warnings.push('No face detected')
    feedback.push('👤 Please position your face in the frame')
    return result
  }

  result.details.faceDetected = true
  score += 20 // Base score for detection

  // Check confidence
  const confidence = detection.detection.score
  result.details.confidence = confidence

  if (confidence < thresholds.minConfidence) {
    warnings.push(`Low detection confidence: ${(confidence * 100).toFixed(1)}%`)
    feedback.push('⚠️ Face detection unclear - improve lighting')
  } else {
    score += 20
    feedback.push('✅ Face detected clearly')
  }

  // Check face size
  const box = detection.detection.box
  const faceSize = Math.min(box.width, box.height)
  result.details.faceSize = faceSize

  if (faceSize < thresholds.minFaceSize) {
    warnings.push(`Face too small: ${faceSize}px`)
    feedback.push('📏 Move closer to the camera')
  } else if (faceSize > videoElement.width * 0.8) {
    warnings.push('Face too large')
    feedback.push('📏 Move back from the camera')
  } else {
    score += 15
    feedback.push('✅ Face size optimal')
  }

  // Check face position (centered)
  const videoWidth = videoElement.width
  const videoHeight = videoElement.height
  const faceCenterX = box.x + box.width / 2
  const faceCenterY = box.y + box.height / 2
  const videoCenterX = videoWidth / 2
  const videoCenterY = videoHeight / 2

  const distanceX = Math.abs(faceCenterX - videoCenterX) / videoWidth
  const distanceY = Math.abs(faceCenterY - videoCenterY) / videoHeight
  const centerDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)

  result.details.faceCentered = centerDistance <= thresholds.maxCenterDistance

  if (centerDistance > thresholds.maxCenterDistance) {
    warnings.push('Face not centered')
    if (faceCenterX < videoCenterX - 50) feedback.push('⬅️ Move face to the right')
    else if (faceCenterX > videoCenterX + 50) feedback.push('➡️ Move face to the left')
    if (faceCenterY < videoCenterY - 50) feedback.push('⬇️ Move face down')
    else if (faceCenterY > videoCenterY + 50) feedback.push('⬆️ Move face up')
  } else {
    score += 15
    feedback.push('✅ Face centered')
  }

  // Check landmarks
  if (detection.landmarks) {
    result.details.landmarksDetected = true
    score += 10

    const landmarks = detection.landmarks
    const positions = landmarks.positions

    // Check eyes visibility
    const leftEye = landmarks.getLeftEye()
    const rightEye = landmarks.getRightEye()
    const eyesVisible = leftEye.length > 0 && rightEye.length > 0
    result.details.eyesVisible = eyesVisible

    if (thresholds.requireBothEyes && !eyesVisible) {
      warnings.push('Eyes not clearly visible')
      feedback.push('👁️ Ensure both eyes are visible')
    } else if (eyesVisible) {
      score += 10
      feedback.push('✅ Eyes visible')
    }

    // Check mouth visibility
    const mouth = landmarks.getMouth()
    const mouthVisible = mouth.length > 0
    result.details.mouthVisible = mouthVisible

    if (thresholds.requireMouth && !mouthVisible) {
      warnings.push('Mouth not visible')
      feedback.push('👄 Show your mouth clearly')
    } else if (mouthVisible) {
      score += 5
      feedback.push('✅ Mouth visible')
    }

    // Check face angle (rough estimation)
    if (leftEye.length > 0 && rightEye.length > 0) {
      const leftEyeCenter = {
        x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length,
        y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length,
      }
      const rightEyeCenter = {
        x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length,
        y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length,
      }

      const eyeAngle = Math.abs(
        Math.atan2(rightEyeCenter.y - leftEyeCenter.y, rightEyeCenter.x - leftEyeCenter.x) *
          (180 / Math.PI)
      )

      if (eyeAngle > 15) {
        warnings.push('Face tilted')
        result.details.angle = 'turned'
        feedback.push('🔄 Keep your head straight')
      } else {
        score += 5
        result.details.angle = 'good'
        feedback.push('✅ Face angle good')
      }
    }
  }

  // Estimate lighting (very rough - based on average brightness)
  // Note: This is approximate - ideally would analyze actual pixel data
  if (confidence > 0.85) {
    result.details.lighting = 'good'
    feedback.push('✅ Lighting good')
  } else if (confidence < 0.6) {
    result.details.lighting = 'low'
    feedback.push('💡 Improve lighting')
  }

  // Calculate final score
  result.score = Math.min(100, score)
  result.isGoodQuality = result.score >= 80 && warnings.length === 0

  return result
}

/**
 * Get color code for quality score
 */
export function getQualityColor(score: number): string {
  if (score >= 80) return 'green'
  if (score >= 60) return 'yellow'
  if (score >= 40) return 'orange'
  return 'red'
}

/**
 * Get quality level text
 */
export function getQualityLevel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Good'
  if (score >= 60) return 'Fair'
  if (score >= 40) return 'Poor'
  return 'Very Poor'
}

/**
 * Check if ready for auto-capture
 */
export function isReadyForCapture(quality: FaceQualityResult): boolean {
  return (
    quality.isGoodQuality &&
    quality.score >= 80 &&
    quality.details.faceDetected &&
    quality.details.confidence >= 0.7 &&
    quality.details.faceCentered &&
    quality.details.eyesVisible &&
    quality.details.mouthVisible
  )
}
