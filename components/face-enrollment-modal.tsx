"use client"

import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, X, Check } from 'lucide-react'
import { ApiClient } from '@/lib/api-client'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
interface FaceEnrollmentModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  onSuccess: () => void
}

export function FaceEnrollmentModal({ 
  isOpen, 
  onClose, 
  userId, 
  userName,
  onSuccess 
}: FaceEnrollmentModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load face-api.js models
  useEffect(() => {
    async function loadModels() {
      if (!isOpen) return
      
      try {
        logger.info('Loading face-api models...')
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        setModelsLoaded(true)
        logger.info('Models loaded successfully')
      } catch (err) {
        logger.error('Failed to load models', err as Error)
        setError('Failed to load face recognition models. Please ensure models are downloaded.')
      }
    }
    
    loadModels()
  }, [isOpen])

  // Start camera
  useEffect(() => {
    async function startCamera() {
      if (!isOpen || !videoRef.current || !modelsLoaded) return

      try {
        logger.info('Starting camera...')
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          } 
        })
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
        logger.info('Camera started')
      } catch (err) {
        logger.error('Camera error', err as Error)
        setError('Failed to access camera. Please grant camera permissions.')
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [isOpen, modelsLoaded])

  // Capture and enroll face
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setCapturing(true)
    setError(null)

    try {
      logger.info('Detecting face with face-api.js...')
      
      // Use real face-api.js detection
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5
        }))
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        throw new Error('No face detected. Please ensure your face is clearly visible and well-lit.')
      }

      const confidence = detection.detection.score
      logger.info('Face detected', { confidence })

      // Validate confidence
      if (confidence < 0.6) {
        throw new Error(`Face detection confidence too low (${(confidence * 100).toFixed(1)}%). Please improve lighting and face positioning.`)
      }

      // Get descriptor (real face embedding from face-api.js)
      const descriptor = Array.from(detection.descriptor)

      // Validate descriptor
      if (descriptor.length !== 128) {
        throw new Error('Invalid face descriptor length. Please try again.')
      }

      logger.info('Enrolling face...', { descriptorLength: descriptor.length, quality: confidence })

      // Send to user enrollment API (not admin API)
      const response = await fetch('/api/employee/face/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          descriptor,
          quality: confidence,
          metadata: {
            enrolledAt: new Date().toISOString(),
            method: 'webcam',
            detectionConfidence: confidence
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to enroll face')
      }

      const data = await response.json()
      logger.info('Face enrolled successfully', data)

      // Success
      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 1500)
    } catch (err: any) {
      logger.error('Enrollment error', err as Error)
      setError(err.message || 'Failed to enroll face')
    } finally {
      setCapturing(false)
    }
  }

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    setSuccess(false)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Enroll Face - {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded flex items-center">
              <Check className="w-5 h-5 mr-2" />
              Face enrolled successfully!
            </div>
          )}

          {!modelsLoaded && !error && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading face recognition models...</p>
            </div>
          )}

          {modelsLoaded && !success && (
            <>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  className="w-full h-auto transform scale-x-[-1]"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleCapture} 
                  disabled={capturing || !stream}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {capturing ? 'Processing...' : 'Capture & Enroll'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={capturing}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>📸 Position your face in the center of the frame</p>
                <p>💡 Ensure good lighting for best results</p>
                <p>😊 Look directly at the camera</p>
                <p>🔒 Your face data is encrypted and secure</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
