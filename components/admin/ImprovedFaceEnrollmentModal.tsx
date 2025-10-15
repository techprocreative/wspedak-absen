/**
 * Improved Face Enrollment Modal
 * 
 * Features:
 * - Auto-capture mode with countdown
 * - Real-time quality feedback
 * - Face position guide overlay
 * - Progress tracking
 * - Better UX with visual indicators
 */

"use client"

import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Camera, X, Check, AlertCircle, Zap } from 'lucide-react'
import { logger } from '@/lib/logger'
import { 
  checkFaceQuality, 
  getQualityColor, 
  getQualityLevel,
  isReadyForCapture 
} from '@/lib/face-quality-checker'

interface ImprovedFaceEnrollmentModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  onSuccess: () => void
  targetSamples?: number
}

export function ImprovedFaceEnrollmentModal({
  isOpen,
  onClose,
  userId,
  userName,
  onSuccess,
  targetSamples = 3,
}: ImprovedFaceEnrollmentModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [detectorLoaded, setDetectorLoaded] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [fullModelsLoaded, setFullModelsLoaded] = useState(false)
  const [loadingStep, setLoadingStep] = useState('Initializing...')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [samplesCollected, setSamplesCollected] = useState(0)
  const [success, setSuccess] = useState(false)
  
  // Auto-capture state
  const [autoCapture, setAutoCapture] = useState(true)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [qualityScore, setQualityScore] = useState(0)
  const [qualityFeedback, setQualityFeedback] = useState<string[]>([])
  const [isReadyQuality, setIsReadyQuality] = useState(false)
  
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const autoCaptureTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load models PROGRESSIVELY for faster perceived performance
  useEffect(() => {
    if (!isOpen) return

    async function loadModelsProgressively() {
      try {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        const startTime = Date.now()
        
        // STEP 1: Load detector FIRST (189KB - FAST!)
        setLoadingStep('Loading face detector...')
        logger.info('📦 Loading tiny face detector (fast)...')
        
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
        
        const detectorTime = Date.now() - startTime
        logger.info(`✅ Detector loaded in ${detectorTime}ms`)
        
        // Enable detector and camera immediately!
        setDetectorLoaded(true)
        setModelsLoaded(true)
        setLoadingStep('Detector ready! Starting camera...')
        
        // STEP 2: Load remaining models in background
        setLoadingStep('Loading advanced models in background...')
        logger.info('📦 Loading landmarks and recognition models...')
        
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Advanced models timeout')),
            isMobile ? 40000 : 30000
          )
        )

        const advancedModels = Promise.all([
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ])

        await Promise.race([advancedModels, timeout])
        
        const totalTime = Date.now() - startTime
        logger.info(`✅ All models loaded in ${totalTime}ms`)
        
        setFullModelsLoaded(true)
        setLoadingStep('All models ready!')
        
      } catch (err) {
        logger.error('Failed to load models', err as Error)
        const errorMsg = err instanceof Error ? err.message : 'Failed to load models'
        setError(errorMsg + ' Please refresh and try again.')
      }
    }

    loadModelsProgressively()
  }, [isOpen])

  // Start camera as soon as detector is loaded
  useEffect(() => {
    if (!isOpen || !detectorLoaded) return

    async function startCamera() {
      try {
        logger.info('🎥 Starting camera for enrollment...')

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        })

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          await videoRef.current.play()
        }

        setStream(mediaStream)
        logger.info('✅ Camera started')

        // Start quality detection loop
        startQualityDetection()
      } catch (err: any) {
        logger.error('Camera error', err as Error)
        setError(`Camera error: ${err.message}`)
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
      if (autoCaptureTimeoutRef.current) {
        clearTimeout(autoCaptureTimeoutRef.current)
      }
    }
  }, [isOpen, modelsLoaded])

  // Quality detection loop
  const startQualityDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
    }

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || capturing || success) return

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()

        const quality = checkFaceQuality(detection, videoRef.current)
        
        setQualityScore(quality.score)
        setQualityFeedback(quality.feedback)
        setIsReadyQuality(isReadyForCapture(quality))

        // Draw overlay
        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
            
            // Draw face box if detected
            if (detection) {
              const box = detection.detection.box
              ctx.strokeStyle = quality.isGoodQuality ? '#22c55e' : '#eab308'
              ctx.lineWidth = 3
              ctx.strokeRect(box.x, box.y, box.width, box.height)
            }
          }
        }

        // Auto-capture logic
        if (autoCapture && isReadyForCapture(quality) && !capturing && samplesCollected < targetSamples) {
          triggerAutoCapture()
        }
      } catch (err) {
        // Ignore detection errors
      }
    }, 300) // Check every 300ms
  }

  // Trigger auto-capture with countdown
  const triggerAutoCapture = () => {
    if (autoCaptureTimeoutRef.current) return // Already counting down

    setCountdown(3)
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval)
          handleCapture()
          return null
        }
        return prev - 1
      })
    }, 1000)

    autoCaptureTimeoutRef.current = setTimeout(() => {
      clearInterval(countdownInterval)
      autoCaptureTimeoutRef.current = null
    }, 3000)
  }

  // Capture face
  const handleCapture = async () => {
    if (!videoRef.current || capturing) return

    // Check if full models loaded
    if (!fullModelsLoaded) {
      setError('Advanced models still loading. Please wait a moment...')
      return
    }

    setCapturing(true)
    setError(null)

    try {
      logger.info('Capturing face sample...')

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        throw new Error('No face detected. Please try again.')
      }

      const confidence = detection.detection.score
      if (confidence < 0.6) {
        throw new Error(`Detection confidence too low (${(confidence * 100).toFixed(1)}%). Please improve lighting.`)
      }

      const descriptor = Array.from(detection.descriptor)

      // Send to API
      const response = await fetch('/api/employee/face/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          descriptor,
          quality: confidence,
          metadata: {
            sampleNumber: samplesCollected + 1,
            totalSamples: targetSamples,
            enrolledAt: new Date().toISOString(),
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to enroll face')
      }

      // Success
      setSamplesCollected(prev => prev + 1)
      logger.info(`Sample ${samplesCollected + 1}/${targetSamples} captured`)

      // Check if done
      if (samplesCollected + 1 >= targetSamples) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 1500)
      }
    } catch (err: any) {
      logger.error('Capture error', err as Error)
      setError(err.message || 'Failed to capture face')
    } finally {
      setCapturing(false)
      setCountdown(null)
    }
  }

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
    }
    if (autoCaptureTimeoutRef.current) {
      clearTimeout(autoCaptureTimeoutRef.current)
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Enroll Face - {userName}</span>
            <Badge variant={success ? "default" : "secondary"}>
              {samplesCollected}/{targetSamples} Samples
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Card className="bg-red-500/10 border-red-500 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            </Card>
          )}

          {/* Success Alert */}
          {success && (
            <Card className="bg-green-500/10 border-green-500 p-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <p className="text-green-500 text-sm">Face enrolled successfully!</p>
              </div>
            </Card>
          )}

          {/* Loading State */}
          {!detectorLoaded && (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary mx-auto mb-4"></div>
              <p className="text-sm font-medium mb-1">{loadingStep}</p>
              <p className="text-xs text-muted-foreground">Please wait...</p>
            </Card>
          )}
          
          {/* Background Loading Indicator */}
          {detectorLoaded && !fullModelsLoaded && (
            <Card className="bg-blue-500/10 border-blue-500 p-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-200 border-t-blue-500"></div>
                <p className="text-blue-500 text-sm">
                  {loadingStep} - Camera ready, you can position your face now.
                </p>
              </div>
            </Card>
          )}

          {/* Camera View */}
          {modelsLoaded && stream && !success && (
            <>
              {/* Auto-Capture Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <Label htmlFor="auto-capture" className="cursor-pointer">
                    Auto-Capture Mode
                  </Label>
                </div>
                <Switch
                  id="auto-capture"
                  checked={autoCapture}
                  onCheckedChange={setAutoCapture}
                />
              </div>

              {/* Quality Score */}
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Face Quality</span>
                  <Badge variant="outline" style={{ 
                    borderColor: getQualityColor(qualityScore),
                    color: getQualityColor(qualityScore)
                  }}>
                    {qualityScore}% - {getQualityLevel(qualityScore)}
                  </Badge>
                </div>
                <Progress 
                  value={qualityScore} 
                  className="h-2"
                  style={{
                    backgroundColor: '#e5e7eb',
                  }}
                />
              </Card>

              {/* Camera with Overlay */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto transform scale-x-[-1]"
                  style={{ transform: 'scaleX(-1)' }}
                  onLoadedMetadata={() => {
                    if (canvasRef.current && videoRef.current) {
                      canvasRef.current.width = videoRef.current.videoWidth
                      canvasRef.current.height = videoRef.current.videoHeight
                    }
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full transform scale-x-[-1] pointer-events-none"
                  style={{ transform: 'scaleX(-1)' }}
                />
                
                {/* Countdown Overlay */}
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-white text-8xl font-bold animate-pulse">
                      {countdown}
                    </div>
                  </div>
                )}

                {/* Ready Indicator */}
                {isReadyQuality && !countdown && autoCapture && (
                  <div className="absolute top-4 right-4 bg-green-500/90 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Ready!
                  </div>
                )}
              </div>

              {/* Feedback List */}
              <Card className="p-3">
                <div className="space-y-1">
                  {qualityFeedback.map((feedback, index) => (
                    <p key={index} className="text-xs text-muted-foreground">
                      {feedback}
                    </p>
                  ))}
                </div>
              </Card>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {samplesCollected}/{targetSamples} samples collected
                  </span>
                </div>
                <Progress value={(samplesCollected / targetSamples) * 100} />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!autoCapture && (
                  <Button
                    onClick={handleCapture}
                    disabled={capturing || !isReadyQuality}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {capturing ? 'Processing...' : 'Capture Sample'}
                  </Button>
                )}
                <Button variant="outline" onClick={handleClose} disabled={capturing}>
                  {success ? 'Close' : 'Cancel'}
                </Button>
              </div>

              {/* Instructions */}
              <Card className="p-3 bg-muted">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Tips:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Ensure good lighting on your face</li>
                  <li>• Look directly at the camera</li>
                  <li>• Keep your face centered in the frame</li>
                  {autoCapture && <li>• Camera will auto-capture when ready</li>}
                </ul>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
