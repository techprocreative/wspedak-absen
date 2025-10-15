"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as faceapi from 'face-api.js'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Camera, Check, X, Clock, MapPin, ArrowLeft, Home, User, Coffee, LogOut, RefreshCw, AlertCircle } from 'lucide-react'
import { ApiClient } from '@/lib/api-client'

// Import the new debug logger
import { 
  frLogger, 
  logFRModelLoading, 
  logFRDetection, 
  logFRMatching,
  logFRAttendance,
  logFRSession 
} from '@/lib/face-recognition-logger'

export const dynamic = 'force-dynamic'

interface UserStatus {
  userId: string
  userName: string
  userEmail: string
  department: string
  todayAttendance: {
    clockIn: string | null
    clockOut: string | null
    breakStart: string | null
    breakEnd: string | null
    status: 'not-started' | 'checked-in' | 'on-break' | 'checked-out'
  }
  shift: {
    startTime: string
    endTime: string
    lateThresholdMinutes: number
  }
}

interface ActionResult {
  success: boolean
  message: string
  data?: {
    userId: string
    userName: string
    action: string
    timestamp: string
    confidence: number
  }
  errorCode?: string
}

export default function FaceCheckinPageWithDebug() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [processing, setProcessing] = useState(false)
  const [identifying, setIdentifying] = useState(false)
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [faceConfidence, setFaceConfidence] = useState<number>(0)
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')

  // Log environment info on mount
  useEffect(() => {
    logFRSession.environment()
  }, [])

  // Load models with debug logging
  useEffect(() => {
    async function loadModels() {
      try {
        logFRModelLoading.start('all')
        
        // Track individual model loading
        const models = [
          { name: 'tinyFaceDetector', loader: () => faceapi.nets.tinyFaceDetector.loadFromUri('/models') },
          { name: 'faceLandmark68Net', loader: () => faceapi.nets.faceLandmark68Net.loadFromUri('/models') },
          { name: 'faceRecognitionNet', loader: () => faceapi.nets.faceRecognitionNet.loadFromUri('/models') }
        ]
        
        let loadedCount = 0
        for (const model of models) {
          try {
            logFRModelLoading.start(model.name)
            await model.loader()
            loadedCount++
            logFRModelLoading.success(model.name)
            logFRModelLoading.progress((loadedCount / models.length) * 100, 'all')
          } catch (err) {
            logFRModelLoading.error(err as Error, model.name)
            throw err
          }
        }
        
        setModelsLoaded(true)
        logFRModelLoading.success('all')
        
      } catch (err) {
        logFRModelLoading.error(err as Error, 'all')
        setError('Failed to load face recognition models. Please refresh the page.')
        setModelsLoaded(false)
        logFRSession.criticalError(err as Error, 'Model Loading')
      }
    }
    
    loadModels()
  }, [])

  // Start camera
  const startCamera = async () => {
    try {
      frLogger.logEnvironmentInfo() // Log environment when camera starts
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        },
        audio: false
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          setStream(mediaStream)
          setCameraPermission('granted')
        }
      }
      
    } catch (err: any) {
      const errorMsg = `Camera error: ${err.name} - ${err.message}`
      setError(errorMsg)
      setCameraPermission('denied')
      logFRSession.criticalError(err, 'Camera Initialization')
    }
  }

  // Auto-start camera when models load
  useEffect(() => {
    if (modelsLoaded && !stream && cameraPermission !== 'denied') {
      startCamera()
    }
  }, [modelsLoaded])

  // Auto-identify when ready
  useEffect(() => {
    if (modelsLoaded && stream && !userStatus && !identifying) {
      setTimeout(() => identifyUser(), 1000)
    }
  }, [modelsLoaded, stream])

  // Identify user with debug logging
  const identifyUser = async () => {
    if (!videoRef.current) return

    setIdentifying(true)
    setError(null)
    setErrorCode(null)

    try {
      // Start detection logging
      logFRDetection.start()
      
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        logFRDetection.noFace('No face visible in camera')
        setError('No face detected. Please position your face clearly in the frame.')
        setIdentifying(false)
        return
      }

      const confidence = detection.detection.score
      setFaceConfidence(confidence)
      
      logFRDetection.detected(confidence, confidence, 1)

      if (confidence < 0.5) {
        logFRDetection.error('Confidence too low')
        setError('Face detection confidence too low. Please improve lighting.')
        setIdentifying(false)
        return
      }

      const descriptor = Array.from(detection.descriptor)
      
      // Start matching logging
      logFRMatching.start(1) // We don't know candidate count here
      
      const response = await ApiClient.identifyFaceStatus({ descriptor })
      
      if (response.data) {
        const matchConfidence = response.confidence || 0
        logFRMatching.matched(response.data.userId, matchConfidence, 0.6)
        setUserStatus(response.data)
        setError(null)
        setErrorCode(null)
      } else {
        logFRMatching.noMatch(response.confidence, 0.6)
        setError('Face not recognized')
        setErrorCode('NO_MATCH')
      }
      
    } catch (err: any) {
      logFRDetection.error(err)
      logFRMatching.error(err)
      
      const errorMessage = err.message || err.error || 'Failed to identify user'
      const errorCodeValue = err.errorCode || null
      
      setError(errorMessage)
      setErrorCode(errorCodeValue)
      
      logFRSession.criticalError(err, 'User Identification')
      
    } finally {
      setIdentifying(false)
    }
  }

  // Handle attendance actions with logging
  const handleAction = async (action: 'check-in' | 'break-start' | 'break-end' | 'check-out') => {
    if (!videoRef.current || !userStatus) return

    setProcessing(true)
    setResult(null)
    setError(null)

    try {
      logFRDetection.start()
      
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        logFRDetection.noFace('No face during action')
        setError('No face detected')
        setProcessing(false)
        return
      }

      const confidence = detection.detection.score
      logFRDetection.detected(confidence, confidence, 1)
      
      const descriptor = Array.from(detection.descriptor)
      
      const response = await ApiClient.performFaceAction({
        action,
        descriptor,
        location: location || undefined,
      })

      if (response.success) {
        setResult(response)
        
        // Log attendance action
        if (action === 'check-in') {
          logFRAttendance.checkIn(userStatus.userId, userStatus.userName, true)
        } else if (action === 'check-out') {
          logFRAttendance.checkOut(userStatus.userId, userStatus.userName, true)
        }
        
        // Refresh user status
        await identifyUser()
      } else {
        const errorMsg = response.error || `Failed to ${action}`
        setError(errorMsg)
        
        if (action === 'check-in') {
          logFRAttendance.checkIn(userStatus.userId, userStatus.userName, false, errorMsg)
        } else if (action === 'check-out') {
          logFRAttendance.checkOut(userStatus.userId, userStatus.userName, false, errorMsg)
        }
      }
      
    } catch (err: any) {
      const errorMsg = err.message || `Failed to ${action}`
      setError(errorMsg)
      logFRSession.criticalError(err, `Attendance Action: ${action}`)
    } finally {
      setProcessing(false)
    }
  }

  // Log session summary on unmount
  useEffect(() => {
    return () => {
      logFRSession.summary()
    }
  }, [])

  // Get location (optional)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.isSecureContext && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          })
        },
        (err) => {
          // Location is optional, don't log as error
          console.debug('Location not available:', err.message)
        },
        {
          timeout: 5000,
          enableHighAccuracy: false
        }
      )
    }
  }, [])

  // Retry function
  const retry = () => {
    setError(null)
    setResult(null)
    setUserStatus(null)
    identifyUser()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Face Recognition Check-in</h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/')}
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Camera Section */}
          <Card>
            <CardHeader>
              <CardTitle>Face Recognition Camera</CardTitle>
              <CardDescription>
                Position your face clearly in the frame
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
                    <div className="text-center text-white">
                      <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{modelsLoaded ? 'Starting camera...' : 'Loading AI models...'}</p>
                    </div>
                  </div>
                )}
                {identifying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
                      <p>Identifying face...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Face Confidence Indicator */}
              {faceConfidence > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Face Confidence</span>
                    <span>{(faceConfidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        faceConfidence > 0.8 ? 'bg-green-500' :
                        faceConfidence > 0.5 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${faceConfidence * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex gap-2 text-red-700">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold">Error</p>
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Result */}
              {result && result.success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex gap-2 text-green-700">
                    <Check className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold">Success</p>
                      <p>{result.message}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Status Section */}
          <div className="space-y-4">
            {userStatus ? (
              <>
                {/* User Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      User Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Name</span>
                        <p className="font-semibold">{userStatus.userName}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Email</span>
                        <p className="text-sm">{userStatus.userEmail}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Department</span>
                        <p className="text-sm">{userStatus.department}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Shift</span>
                        <p className="text-sm">{userStatus.shift.startTime} - {userStatus.shift.endTime}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleAction('check-in')}
                        disabled={processing || userStatus.todayAttendance.status !== 'not-started'}
                        className="w-full"
                        variant={userStatus.todayAttendance.status === 'not-started' ? 'default' : 'secondary'}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Check In
                      </Button>

                      <Button
                        onClick={() => handleAction('break-start')}
                        disabled={processing || userStatus.todayAttendance.status !== 'checked-in'}
                        className="w-full"
                        variant={userStatus.todayAttendance.status === 'checked-in' ? 'default' : 'secondary'}
                      >
                        <Coffee className="h-4 w-4 mr-2" />
                        Start Break
                      </Button>

                      <Button
                        onClick={() => handleAction('break-end')}
                        disabled={processing || userStatus.todayAttendance.status !== 'on-break'}
                        className="w-full"
                        variant={userStatus.todayAttendance.status === 'on-break' ? 'default' : 'secondary'}
                      >
                        <Coffee className="h-4 w-4 mr-2" />
                        End Break
                      </Button>

                      <Button
                        onClick={() => handleAction('check-out')}
                        disabled={processing || userStatus.todayAttendance.status === 'checked-out' || userStatus.todayAttendance.status === 'not-started'}
                        className="w-full"
                        variant={userStatus.todayAttendance.status === 'checked-in' ? 'default' : 'secondary'}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Check Out
                      </Button>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={retry}
                        variant="outline"
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry Recognition
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No User Identified</p>
                    <p className="text-sm mb-4">Position your face in the camera to begin</p>
                    {!identifying && modelsLoaded && stream && (
                      <Button onClick={identifyUser}>
                        Start Identification
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
