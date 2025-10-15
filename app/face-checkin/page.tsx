"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as faceapi from 'face-api.js'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Camera, Check, X, Clock, MapPin, ArrowLeft, Home, User, Coffee, LogOut, RefreshCw, AlertCircle } from 'lucide-react'
import { ApiClient } from '@/lib/api-client'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
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

export default function FaceCheckinPage() {
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
  const [showPermissionHelper, setShowPermissionHelper] = useState(false)

  // Load models with timeout (especially important for mobile)
  useEffect(() => {
    async function loadModels() {
      try {
        logger.info('Loading face-api models...')
        setError('Initializing AI models... This may take 10-30 seconds on mobile.')
        
        // Create timeout promise (40 seconds for mobile)
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Model loading timeout. Please check your internet connection.')), 40000)
        )
        
        // Load models with timeout
        const loadPromise = Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ])
        
        await Promise.race([loadPromise, timeout])
        
        setModelsLoaded(true)
        setError(null) // Clear loading message
        logger.info('✅ All models loaded successfully')
      } catch (err) {
        logger.error('Failed to load models', err as Error)
        const errorMsg = err instanceof Error ? err.message : 'Failed to load face recognition models'
        setError(`${errorMsg}. Please refresh the page or check your internet connection.`)
        setModelsLoaded(false)
      }
    }
    loadModels()
  }, [])

  // Check camera permission
  useEffect(() => {
    async function checkCameraPermission() {
      if (!navigator.permissions || !navigator.permissions.query) {
        // Fallback for browsers that don't support permissions API
        return
      }

      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
        setCameraPermission(result.state as any)
        
        result.addEventListener('change', () => {
          setCameraPermission(result.state as any)
        })
      } catch (err) {
        logger.info('Permissions API not supported')
      }
    }

    checkCameraPermission()
  }, [])

  // Start camera with improved error handling
  const startCamera = async () => {
    try {
      logger.info('🎥 Requesting camera access...')
      setError(null)
      setShowPermissionHelper(false)
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser')
      }
      
      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      })
      
      logger.info('✅ Camera access granted')
      
      // Wait for video element to be ready
      if (!videoRef.current) {
        logger.warn('Video element not ready, waiting...')
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        
        // Force play the video
        try {
          await videoRef.current.play()
          logger.info('✅ Video playing')
        } catch (playErr) {
          logger.warn('Video play failed, will try auto-play', playErr)
        }
        
        // Set stream immediately and also on metadata load
        setStream(mediaStream)
        setCameraPermission('granted')
        
        // Also listen for metadata load event
        videoRef.current.onloadedmetadata = () => {
          logger.info('✅ Video metadata loaded')
          
          // Auto-identify user after camera starts (but wait for models)
          if (modelsLoaded) {
            setTimeout(() => identifyUser(), 1000)
          } else {
            logger.info('⏳ Camera ready, waiting for models to load...')
          }
        }
        
        // Fallback: start identifying after 2 seconds if metadata doesn't load
        setTimeout(() => {
          if (modelsLoaded && videoRef.current && videoRef.current.readyState >= 2) {
            logger.info('⏳ Starting identification (fallback)')
            identifyUser()
          }
        }, 2000)
      } else {
        throw new Error('Video element not available')
      }
    } catch (err: any) {
      logger.error('❌ Failed to access camera', err as Error)
      setCameraPermission('denied')
      
      // Detailed error messages
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access denied. Please click the camera icon in your browser address bar and allow access.')
        setShowPermissionHelper(true)
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera device and refresh the page.')
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is already in use by another application. Please close other apps using the camera.')
      } else if (err.name === 'OverconstrainedError') {
        setError('Camera does not meet the required specifications. Try a different camera.')
      } else if (err.message === 'Camera API not supported in this browser') {
        setError('Your browser does not support camera access. Please use Chrome, Firefox, or Edge.')
      } else {
        setError(`Failed to access camera: ${err.message || 'Unknown error'}`)
      }
    }
  }

  // Auto-start camera when models are loaded
  useEffect(() => {
    if (modelsLoaded && !stream && cameraPermission !== 'denied') {
      logger.info('🚀 Models loaded, starting camera...')
      startCamera()
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [modelsLoaded]) // Start camera after models load
  
  // Auto-identify when both camera AND models are ready
  useEffect(() => {
    if (modelsLoaded && stream && !userStatus && !identifying) {
      logger.info('Models and camera ready, starting auto-identify')
      setTimeout(() => identifyUser(), 1000)
    }
  }, [modelsLoaded, stream])

  // Get location (optional - don't block if not available)
  useEffect(() => {
    // Only try to get location if we're in a secure context (HTTPS)
    if (typeof window !== 'undefined' && window.isSecureContext && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          })
          logger.info('Location obtained')
        },
        (err) => {
          // Don't log warning for permission denied - it's expected in some environments
          if (err.code !== err.PERMISSION_DENIED) {
            logger.warn('Location not available', { error: err.message })
          }
          // Location is optional, so we continue without it
        },
        {
          timeout: 5000, // 5 second timeout
          enableHighAccuracy: false // Don't require high accuracy
        }
      )
    }
  }, [])

  // Removed auto-identify effect (now called from startCamera)

  const identifyUser = async () => {
    if (!videoRef.current) return

    setIdentifying(true)
    setError(null)
    setErrorCode(null)

    // Add overall timeout for entire identification process
    const overallTimeout = setTimeout(() => {
      setError('Face identification timeout. Please try again.')
      setIdentifying(false)
    }, 20000) // 20 second overall timeout

    try {
      logger.info('Identifying user...')

      // Check if models are loaded
      if (!modelsLoaded) {
        clearTimeout(overallTimeout)
        setError('Face recognition models not loaded. Please wait...')
        setIdentifying(false)
        return
      }

      // Detect face with timeout
      const detectionPromise = faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      // Add 10 second timeout for face detection
      const detectionTimeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Face detection timeout. Please ensure your face is visible and well-lit.')), 10000)
      )

      const detection = await Promise.race([detectionPromise, detectionTimeoutPromise]) as any

      if (!detection) {
        clearTimeout(overallTimeout)
        setError('No face detected. Please position your face clearly in the frame.')
        setIdentifying(false)
        return
      }

      const confidence = detection.detection.score
      setFaceConfidence(confidence)
      logger.info('Face detected with confidence', { confidence })

      if (confidence < 0.5) {
        clearTimeout(overallTimeout)
        setError('Face detection confidence too low. Please improve lighting.')
        setIdentifying(false)
        return
      }

      const descriptor = Array.from(detection.descriptor)

      // Identify user and get status with timeout
      const apiTimeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Server response timeout. Please check your internet connection.')), 15000)
      )

      const response = await Promise.race([
        ApiClient.identifyFaceStatus({ descriptor }),
        apiTimeoutPromise
      ])

      clearTimeout(overallTimeout)
      logger.info('User identified:', { data: response.data })
      setUserStatus(response.data)
      setError(null)
      setErrorCode(null)
    } catch (err: any) {
      clearTimeout(overallTimeout)
      logger.error('Identification failed', err as Error)
      
      // Extract error details from API response
      const errorMessage = err.message || err.error || 'Failed to identify user. Please try again.'
      const errorCodeValue = err.errorCode || null
      
      setError(errorMessage)
      setErrorCode(errorCodeValue)
    } finally {
      setIdentifying(false)
    }
  }

  const handleAction = async (action: 'check-in' | 'break-start' | 'break-end' | 'check-out') => {
    if (!videoRef.current) return

    setProcessing(true)
    setResult(null)
    setError(null)

    // Add overall timeout for action processing
    const actionTimeout = setTimeout(() => {
      setError(`${action} timeout. Please try again.`)
      setProcessing(false)
    }, 25000) // 25 second timeout

    try {
      logger.info(`Processing ${action}...`)

      // Detect face with timeout
      const detectionPromise = faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      const detectionTimeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Face detection timeout during action. Please try again.')), 10000)
      )

      const detection = await Promise.race([detectionPromise, detectionTimeoutPromise]) as any

      if (!detection) {
        clearTimeout(actionTimeout)
        throw new Error('No face detected. Please position your face clearly in the frame.')
      }

      logger.info('Face detected with confidence:', { data: detection.detection.score })

      const descriptor = Array.from(detection.descriptor)

      logger.info(`Submitting ${action}...`)

      // Call action API with timeout
      const apiTimeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Server response timeout. Please check your connection.')), 15000)
      )

      const response = await Promise.race([
        ApiClient.faceAction({
          descriptor,
          action,
          timestamp: new Date().toISOString(),
          location,
          lateExcuse: null
        }),
        apiTimeoutPromise
      ])

      clearTimeout(actionTimeout)
      logger.info('Action successful', { response })

      setResult({
        success: true,
        message: response.message,
        data: response.data
      })

      // Update user status
      if (userStatus) {
        const updatedStatus = { ...userStatus }
        const now = new Date().toISOString()
        
        switch (action) {
          case 'check-in':
            updatedStatus.todayAttendance.clockIn = now
            updatedStatus.todayAttendance.status = 'checked-in'
            break
          case 'break-start':
            updatedStatus.todayAttendance.breakStart = now
            updatedStatus.todayAttendance.status = 'on-break'
            break
          case 'break-end':
            updatedStatus.todayAttendance.breakEnd = now
            updatedStatus.todayAttendance.status = 'checked-in'
            break
          case 'check-out':
            updatedStatus.todayAttendance.clockOut = now
            updatedStatus.todayAttendance.status = 'checked-out'
            break
        }
        
        setUserStatus(updatedStatus)
      }

      // Stop camera after successful action
      if (stream && action === 'check-out') {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }
    } catch (err: any) {
      clearTimeout(actionTimeout)
      logger.error('Action failed', err as Error)
      setResult({
        success: false,
        message: err.message || 'Action failed',
        errorCode: err.errorCode
      })
      setError(err.message || 'Action failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setUserStatus(null)
    setFaceConfidence(0)
    
    // Restart camera
    if (!stream && modelsLoaded) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      })
        .then(s => {
          if (videoRef.current) {
            videoRef.current.srcObject = s
          }
          setStream(s)
          // Re-identify user
          setTimeout(() => identifyUser(), 1000)
        })
        .catch(err => {
          logger.error('Failed to restart camera', err as Error)
          setError('Failed to restart camera. Please refresh the page.')
        })
    }
  }

  const getNextAction = (): { action: 'check-in' | 'break-start' | 'break-end' | 'check-out', label: string, icon: any, color: string } | null => {
    if (!userStatus) return null

    const status = userStatus.todayAttendance.status

    switch (status) {
      case 'not-started':
        return { action: 'check-in', label: 'Check In', icon: Clock, color: 'bg-emerald-600 hover:bg-emerald-700' }
      case 'checked-in':
        return { action: 'check-out', label: 'Check Out', icon: LogOut, color: 'bg-orange-600 hover:bg-orange-700' }
      case 'on-break':
        return { action: 'break-end', label: 'End Break', icon: Coffee, color: 'bg-blue-600 hover:bg-blue-700' }
      case 'checked-out':
        return null
      default:
        return null
    }
  }

  const getStatusBadge = () => {
    if (!userStatus) return null

    const status = userStatus.todayAttendance.status

    const statusConfig = {
      'not-started': { label: 'Not Started', color: 'bg-slate-500' },
      'checked-in': { label: 'Checked In', color: 'bg-emerald-500' },
      'on-break': { label: 'On Break', color: 'bg-blue-500' },
      'checked-out': { label: 'Checked Out', color: 'bg-gray-500' }
    }

    const config = statusConfig[status]

    return (
      <Badge className={`${config.color} text-white px-3 py-1`}>
        {config.label}
      </Badge>
    )
  }

  const nextAction = getNextAction()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header with Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="text-slate-400 hover:text-white"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
          {userStatus && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/employee/dashboard')}
              className="text-slate-400 hover:text-white"
            >
              <User className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          )}
        </div>

        {/* Page Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Face Recognition Attendance</h1>
          <p className="text-slate-400">Position your face for automated attendance tracking</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl flex items-center gap-2 text-white">
                <Camera className="w-6 h-6 text-emerald-400" />
                {result?.success ? 'Action Complete' : identifying ? 'Identifying...' : userStatus ? 'Ready' : 'Loading...'}
              </CardTitle>
              {userStatus && !result && getStatusBadge()}
            </div>
            {userStatus && !result && (
              <CardDescription className="text-slate-300 mt-2">
                Welcome, <span className="font-semibold text-white">{userStatus.userName}</span> • {userStatus.department}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Video element - always rendered */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              muted
              className={modelsLoaded && stream ? "w-full h-auto transform scale-x-[-1] rounded-lg" : "hidden"}
            />

            {/* Loading State Overlay */}
            {!modelsLoaded && (
              <div className="text-center py-12 space-y-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-emerald-400 mx-auto"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold text-white mb-2">Loading Face Recognition</p>
                  <p className="text-sm text-slate-400">Initializing AI models...</p>
                  <div className="mt-4 w-48 mx-auto bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-emerald-400 animate-pulse" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {error || 'This may take 10-30 seconds on mobile...'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Please wait, do not close this page
                  </p>
                </div>
              </div>
            )}
            
            {/* Camera Starting State */}
            {modelsLoaded && !stream && cameraPermission !== 'denied' && !error && (
              <div className="text-center py-12 space-y-4">
                <div className="relative">
                  <div className="animate-pulse rounded-full h-16 w-16 bg-slate-700 mx-auto flex items-center justify-center">
                    <Camera className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold text-white mb-2">Starting Camera</p>
                  <p className="text-sm text-slate-400">Please allow camera access...</p>
                </div>
              </div>
            )}

            {/* Camera Permission Denied State */}
            {cameraPermission === 'denied' && showPermissionHelper && (
              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-400 mb-2">Camera Access Required</h3>
                    <p className="text-yellow-300 text-sm mb-3">
                      This feature requires camera access for face recognition. Please follow these steps:
                    </p>
                    <ol className="text-sm text-yellow-200 space-y-2 list-decimal list-inside">
                      <li>Click the camera icon in your browser's address bar</li>
                      <li>Select "Allow" for camera access</li>
                      <li>Click "Request Camera Access" button below</li>
                    </ol>
                  </div>
                </div>
                <Button
                  onClick={startCamera}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Request Camera Access
                </Button>
              </div>
            )}

            {/* Error State - No Faces Enrolled */}
            {errorCode === 'NO_FACES_ENROLLED' && !showPermissionHelper && !identifying && !processing && (
              <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-400 mb-2">No Enrolled Faces Found</h3>
                    <p className="text-amber-300 text-sm mb-4">
                      Face recognition is not set up yet. You need to enroll your face first before using this feature.
                    </p>
                    <div className="bg-amber-500/10 p-3 rounded-md mb-4">
                      <p className="text-amber-200 text-xs font-medium mb-2">How to enroll your face:</p>
                      <ol className="text-amber-200 text-xs space-y-1 list-decimal list-inside">
                        <li>Go to Employee Dashboard</li>
                        <li>Click on your profile or settings</li>
                        <li>Look for "Enroll Face" or "Face Recognition" option</li>
                        <li>Follow the instructions to capture your face</li>
                      </ol>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => router.push('/employee/dashboard')}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                  <Button
                    onClick={() => router.push('/')}
                    variant="outline"
                    className="flex-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Manual Check-In
                  </Button>
                </div>
              </div>
            )}

            {/* Error State - Face Not Recognized */}
            {errorCode === 'FACE_NOT_RECOGNIZED' && !showPermissionHelper && !identifying && !processing && (
              <div className="bg-orange-500/10 border border-orange-500/50 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-400 mb-2">Face Not Recognized</h3>
                    <p className="text-orange-300 text-sm mb-4">
                      We couldn't match your face with any enrolled user. This could be due to:
                    </p>
                    <ul className="text-orange-200 text-sm space-y-2 mb-4">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400">•</span>
                        <span>You haven't enrolled your face yet</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400">•</span>
                        <span>Poor lighting conditions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400">•</span>
                        <span>Face angle or distance from camera</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400">•</span>
                        <span>Wearing accessories (mask, glasses, hat)</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={identifyUser}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button
                    onClick={() => router.push('/employee/dashboard')}
                    variant="outline"
                    className="flex-1 border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Enroll Face
                  </Button>
                </div>
              </div>
            )}

            {/* Error State - Other Errors */}
            {error && !errorCode && !showPermissionHelper && !identifying && !processing && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-400 text-sm">{error}</p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => cameraPermission === 'denied' ? startCamera() : identifyUser()}
                      size="sm"
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {cameraPermission === 'denied' ? 'Request Camera' : 'Try Again'}
                    </Button>
                    <Button
                      onClick={() => router.push('/')}
                      size="sm"
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Manual Check-In
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Camera Permission Prompt */}
            {modelsLoaded && !stream && cameraPermission === 'prompt' && !error && (
              <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-6 text-center space-y-4">
                <Camera className="w-16 h-16 text-blue-400 mx-auto" />
                <div>
                  <h3 className="font-semibold text-blue-400 mb-2">Camera Access Needed</h3>
                  <p className="text-blue-300 text-sm">
                    We need access to your camera for face recognition attendance.
                    Your privacy is protected - images are processed locally and not stored.
                  </p>
                </div>
                <Button
                  onClick={startCamera}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Enable Camera
                </Button>
              </div>
            )}

            {/* Camera View - video element is already rendered above, just show overlay */}
            {modelsLoaded && stream && !result && (
              <>
                <div className="relative bg-black rounded-lg overflow-hidden">
                  {/* Video element is rendered at the top of CardContent */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    {location && (
                      <div className="bg-emerald-500/20 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-emerald-400">Location ON</span>
                      </div>
                    )}
                    {faceConfidence > 0 && (
                      <div className="bg-blue-500/20 backdrop-blur-sm px-3 py-1 rounded-full">
                        <span className="text-xs text-blue-400">
                          Confidence: {(faceConfidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                  {identifying && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                        <p className="text-white text-sm">Identifying...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Status Info */}
                {userStatus && !identifying && (
                  <div className="bg-slate-700/30 p-4 rounded-lg space-y-3">
                    <h3 className="text-sm font-semibold text-white">Today's Activity</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-400">Check In</p>
                        <p className="text-white font-medium">
                          {userStatus.todayAttendance.clockIn 
                            ? new Date(userStatus.todayAttendance.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Check Out</p>
                        <p className="text-white font-medium">
                          {userStatus.todayAttendance.clockOut 
                            ? new Date(userStatus.todayAttendance.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Break Start</p>
                        <p className="text-white font-medium">
                          {userStatus.todayAttendance.breakStart 
                            ? new Date(userStatus.todayAttendance.breakStart).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Break End</p>
                        <p className="text-white font-medium">
                          {userStatus.todayAttendance.breakEnd 
                            ? new Date(userStatus.todayAttendance.breakEnd).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-600">
                      <p className="text-slate-400 text-xs">
                        Shift: {userStatus.shift.startTime} - {userStatus.shift.endTime}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {userStatus && nextAction && (
                  <div className="space-y-3">
                    <Button 
                      onClick={() => handleAction(nextAction.action)} 
                      disabled={processing || !stream}
                      size="lg"
                      className={`w-full ${nextAction.color}`}
                    >
                      {processing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <nextAction.icon className="w-5 h-5 mr-2" />
                          {nextAction.label}
                        </>
                      )}
                    </Button>

                    {/* Alternative Action - Break */}
                    {userStatus.todayAttendance.status === 'checked-in' && (
                      <Button 
                        onClick={() => handleAction('break-start')} 
                        disabled={processing || !stream}
                        size="lg"
                        variant="outline"
                        className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Coffee className="w-5 h-5 mr-2" />
                        Start Break
                      </Button>
                    )}
                  </div>
                )}

                {/* Already Checked Out */}
                {userStatus && userStatus.todayAttendance.status === 'checked-out' && (
                  <div className="bg-slate-700/30 p-6 rounded-lg text-center">
                    <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">All Done for Today!</h3>
                    <p className="text-slate-400 text-sm mb-4">
                      You have successfully checked out. Have a great day!
                    </p>
                    <Button
                      onClick={() => router.push('/employee/dashboard')}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Go to Dashboard
                    </Button>
                  </div>
                )}

                {/* Tips */}
                {!userStatus && !identifying && (
                  <div className="text-sm text-slate-400 space-y-2 bg-slate-700/30 p-4 rounded-lg">
                    <p className="font-semibold text-white mb-2">Tips for best results:</p>
                    <p>✅ Position your face in the center</p>
                    <p>💡 Ensure good lighting</p>
                    <p>😊 Look directly at the camera</p>
                    <p>📱 Hold steady for detection</p>
                  </div>
                )}
              </>
            )}

            {/* Result Display */}
            {result && (
              <div className={`p-6 rounded-lg ${result.success ? 'bg-emerald-500/10 border border-emerald-500' : 'bg-red-500/10 border border-red-500'}`}>
                <div className="flex items-start gap-4">
                  {result.success ? (
                    <div className="bg-emerald-500 rounded-full p-3">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                  ) : (
                    <div className="bg-red-500 rounded-full p-3">
                      <X className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className={`text-xl font-semibold ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.success ? 'Success!' : 'Failed'}
                    </h3>
                    <p className="text-sm mt-1 text-slate-300">{result.message}</p>
                    {result.data && (
                      <div className="mt-4 space-y-2 text-sm bg-slate-800/50 p-4 rounded">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Action:</span>
                          <span className="text-white font-medium uppercase">{result.data.action}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Time:</span>
                          <span className="text-white">{new Date(result.data.timestamp).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Confidence:</span>
                          <span className="text-white">{(result.data.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  {result.success && userStatus?.todayAttendance.status !== 'checked-out' && (
                    <Button 
                      onClick={handleReset}
                      className="flex-1"
                      variant="outline"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Continue
                    </Button>
                  )}
                  <Button 
                    onClick={() => router.push('/employee/dashboard')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Powered by Face Recognition AI • Secure & Private
          </p>
        </div>
      </div>
    </div>
  )
}
