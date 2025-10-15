"use client"

import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  Camera, 
  Check, 
  X, 
  Clock, 
  MapPin, 
  Coffee,
  LogOut,
  AlertCircle,
  User,
  Loader2,
  CheckCircle
} from 'lucide-react'
import { ApiClient } from '@/lib/api-client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const dynamic = 'force-dynamic'

type ActionType = 'check-in' | 'break-start' | 'break-end' | 'check-out'

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

interface LateExcuseData {
  reason: string
  reasonType: string
  notes: string
}

const LATE_EXCUSE_TYPES = [
  { value: 'traffic', label: 'Traffic Jam / Kemacetan' },
  { value: 'vehicle', label: 'Kendaraan Bermasalah' },
  { value: 'family', label: 'Urusan Keluarga' },
  { value: 'medical', label: 'Kesehatan / Medical' },
  { value: 'emergency', label: 'Emergency / Darurat' },
  { value: 'public-transport', label: 'Transportasi Umum Delay' },
  { value: 'weather', label: 'Cuaca Buruk' },
  { value: 'other', label: 'Lainnya' }
]

export default function FaceCheckinV2Page() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // States
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  // Face detection states
  const [faceDetected, setFaceDetected] = useState(false)
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [nextAction, setNextAction] = useState<ActionType | null>(null)
  
  // Location
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  
  // Late excuse dialog
  const [showLateDialog, setShowLateDialog] = useState(false)
  const [lateMinutes, setLateMinutes] = useState(0)
  const [lateExcuse, setLateExcuse] = useState<LateExcuseData>({
    reason: '',
    reasonType: '',
    notes: ''
  })
  
  // Result
  const [actionResult, setActionResult] = useState<{
    success: boolean
    message: string
    action: ActionType
  } | null>(null)

  // Load face-api models
  useEffect(() => {
    async function loadModels() {
      try {
        logger.info('Loading face-api models...')
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        setModelsLoaded(true)
        logger.info('✅ Models loaded successfully')
      } catch (err) {
        logger.error('❌ Failed to load models', err as Error)
      }
    }
    loadModels()
  }, [])

  // Start camera
  useEffect(() => {
    async function startCamera() {
      if (!modelsLoaded) return

      try {
        logger.info('Starting camera...')
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          } 
        })
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
        setStream(mediaStream)
        logger.info('✅ Camera started')
      } catch (err) {
        logger.error('❌ Failed to access camera', err as Error)
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
    }
  }, [modelsLoaded])

  // Get location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          })
        },
        (err) => {
          logger.warn('Location not available', { value: err })
        }
      )
    }
  }, [])

  // Auto-detect face and identify user
  useEffect(() => {
    if (!modelsLoaded || !videoRef.current || detecting) return

    const detectFace = async () => {
      if (!videoRef.current || processing) return

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor()

        if (detection) {
          setFaceDetected(true)
          
          // Auto-identify user if not already identified
          if (!userStatus) {
            await identifyUser(Array.from(detection.descriptor))
          }
        } else {
          setFaceDetected(false)
          // Reset user status if face is no longer detected
          if (userStatus && !processing) {
            setTimeout(() => {
              if (!faceDetected) {
                setUserStatus(null)
                setNextAction(null)
              }
            }, 3000) // Wait 3 seconds before resetting
          }
        }
      } catch (err) {
        logger.error('Detection error', err as Error)
      }
    }

    // Run detection every 2 seconds
    detectionIntervalRef.current = setInterval(detectFace, 2000)

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [modelsLoaded, userStatus, detecting, processing, faceDetected])

  // Identify user from face descriptor
  const identifyUser = async (descriptor: number[]) => {
    if (processing) return
    
    setDetecting(true)
    try {
      // Call API to identify user and get their status
      const response = await ApiClient.request<{
        success: boolean
        data: UserStatus
      }>('/api/face/identify-status', {
        method: 'POST',
        body: JSON.stringify({ descriptor })
      })

      if (response.success && response.data) {
        setUserStatus(response.data)
        
        // Determine next action based on status
        const status = response.data.todayAttendance.status
        if (status === 'not-started') {
          setNextAction('check-in')
        } else if (status === 'checked-in') {
          setNextAction('break-start')
        } else if (status === 'on-break') {
          setNextAction('break-end')
        }
      }
    } catch (err) {
      logger.error('Failed to identify user', err as Error)
    } finally {
      setDetecting(false)
    }
  }

  // Check if user is late
  const checkIfLate = (): { isLate: boolean; minutes: number } => {
    if (!userStatus) return { isLate: false, minutes: 0 }

    const now = new Date()
    const [shiftHours, shiftMinutes] = userStatus.shift.startTime.split(':').map(Number)
    const shiftStart = new Date(now)
    shiftStart.setHours(shiftHours, shiftMinutes, 0, 0)

    const diffMs = now.getTime() - shiftStart.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    const isLate = diffMinutes > userStatus.shift.lateThresholdMinutes

    return { isLate, minutes: Math.max(0, diffMinutes) }
  }

  // Handle action (check-in, break, check-out)
  const handleAction = async () => {
    if (!videoRef.current || !nextAction || !userStatus) return

    setProcessing(true)
    setActionResult(null)

    try {
      // Detect face again to get fresh descriptor
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        throw new Error('No face detected. Please position your face clearly in the frame.')
      }

      const descriptor = Array.from(detection.descriptor)

      // For check-in, check if late
      if (nextAction === 'check-in') {
        const { isLate, minutes } = checkIfLate()
        
        if (isLate) {
          setLateMinutes(minutes)
          setShowLateDialog(true)
          setProcessing(false)
          return // Wait for excuse submission
        }
      }

      // Proceed with action
      await performAction(descriptor, nextAction, null)

    } catch (err: any) {
      setActionResult({
        success: false,
        message: err.message || 'Failed to process action',
        action: nextAction
      })
      setProcessing(false)
    }
  }

  // Perform the actual action
  const performAction = async (
    descriptor: number[], 
    action: ActionType,
    lateExcuseData: LateExcuseData | null
  ) => {
    try {
      const response = await ApiClient.request<{
        success: boolean
        message: string
        data: any
      }>('/api/face/action', {
        method: 'POST',
        body: JSON.stringify({
          descriptor,
          action,
          timestamp: new Date().toISOString(),
          location,
          lateExcuse: lateExcuseData
        })
      })

      if (response.success) {
        setActionResult({
          success: true,
          message: response.message,
          action
        })

        // Update user status
        setTimeout(async () => {
          if (videoRef.current) {
            const detection = await faceapi
              .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceDescriptor()
            
            if (detection) {
              await identifyUser(Array.from(detection.descriptor))
            }
          }
        }, 2000)
      } else {
        throw new Error(response.message || 'Action failed')
      }
    } catch (err: any) {
      setActionResult({
        success: false,
        message: err.message || 'Failed to process action',
        action
      })
    } finally {
      setProcessing(false)
    }
  }

  // Handle late excuse submission
  const handleLateExcuseSubmit = async () => {
    if (!lateExcuse.reasonType || !videoRef.current || !nextAction) {
      alert('Please select a reason for being late')
      return
    }

    setShowLateDialog(false)
    setProcessing(true)

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        throw new Error('No face detected. Please try again.')
      }

      const descriptor = Array.from(detection.descriptor)
      await performAction(descriptor, nextAction, lateExcuse)
    } catch (err: any) {
      setActionResult({
        success: false,
        message: err.message || 'Failed to submit excuse',
        action: nextAction
      })
      setProcessing(false)
    }
  }

  // Get action button config
  const getActionButton = () => {
    if (!nextAction || !userStatus) return null

    const configs = {
      'check-in': {
        label: 'Check In',
        icon: CheckCircle,
        color: 'bg-emerald-600 hover:bg-emerald-700',
        description: 'Start your work day'
      },
      'break-start': {
        label: 'Start Break',
        icon: Coffee,
        color: 'bg-amber-600 hover:bg-amber-700',
        description: 'Take a break'
      },
      'break-end': {
        label: 'End Break',
        icon: Clock,
        color: 'bg-blue-600 hover:bg-blue-700',
        description: 'Resume work'
      },
      'check-out': {
        label: 'Check Out',
        icon: LogOut,
        color: 'bg-rose-600 hover:bg-rose-700',
        description: 'End your work day'
      }
    }

    return configs[nextAction]
  }

  const actionButton = getActionButton()
  const { isLate } = checkIfLate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Face Recognition Check-In
          </h1>
          <p className="text-slate-400">
            Auto-detect face untuk check-in, break, atau check-out
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Camera className="h-5 w-5" />
              Camera View
              {modelsLoaded && (
                <Badge variant="outline" className="ml-auto">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    AI Ready
                  </div>
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera View */}
            <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover mirror"
              />
              
              {/* Face Detection Indicator */}
              {faceDetected && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-emerald-600">
                    <Check className="h-4 w-4 mr-1" />
                    Face Detected
                  </Badge>
                </div>
              )}

              {/* Loading Models */}
              {!modelsLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
                    <p className="text-white">Loading AI Models...</p>
                  </div>
                </div>
              )}
            </div>

            {/* User Info Card */}
            {userStatus && (
              <Card className="bg-slate-700/50 border-slate-600">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {userStatus.userName}
                      </h3>
                      <p className="text-sm text-slate-400">{userStatus.department}</p>
                      <p className="text-xs text-slate-500">{userStatus.userEmail}</p>
                      
                      {/* Status badges */}
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">
                          Status: {userStatus.todayAttendance.status}
                        </Badge>
                        <Badge variant="outline">
                          Shift: {userStatus.shift.startTime} - {userStatus.shift.endTime}
                        </Badge>
                        {isLate && nextAction === 'check-in' && (
                          <Badge className="bg-amber-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Late
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Button */}
            {actionButton && userStatus && faceDetected && (
              <div className="space-y-3">
                {isLate && nextAction === 'check-in' && (
                  <div className="flex items-start gap-2 p-3 bg-amber-900/30 border border-amber-700 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-200">
                        You are late by {lateMinutes} minutes
                      </p>
                      <p className="text-xs text-amber-300/80">
                        You'll be asked to provide a reason after check-in
                      </p>
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={handleAction}
                  disabled={processing || !faceDetected}
                  className={`w-full h-14 text-lg ${actionButton.color}`}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <actionButton.icon className="h-5 w-5 mr-2" />
                      {actionButton.label}
                    </>
                  )}
                </Button>
                <p className="text-center text-sm text-slate-400">
                  {actionButton.description}
                </p>
              </div>
            )}

            {/* Waiting for face */}
            {!userStatus && modelsLoaded && !detecting && (
              <div className="text-center py-8">
                <Camera className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">
                  Position your face in the frame to auto-detect
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  System will automatically identify you
                </p>
              </div>
            )}

            {/* Detecting */}
            {detecting && (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 text-emerald-500 mx-auto mb-3 animate-spin" />
                <p className="text-slate-400">Identifying user...</p>
              </div>
            )}

            {/* Result Message */}
            {actionResult && (
              <div className={`p-4 rounded-lg border ${
                actionResult.success 
                  ? 'bg-emerald-900/30 border-emerald-700' 
                  : 'bg-rose-900/30 border-rose-700'
              }`}>
                <div className="flex items-start gap-2">
                  {actionResult.success ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
                  ) : (
                    <X className="h-5 w-5 text-rose-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${
                      actionResult.success ? 'text-emerald-200' : 'text-rose-200'
                    }`}>
                      {actionResult.success ? 'Success!' : 'Failed'}
                    </p>
                    <p className={`text-sm ${
                      actionResult.success ? 'text-emerald-300' : 'text-rose-300'
                    }`}>
                      {actionResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Location Info */}
            {location && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <MapPin className="h-4 w-4" />
                <span>
                  Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-slate-800/30 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-400">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs text-white mt-0.5">
                1
              </div>
              <p>Position your face clearly in the camera frame</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs text-white mt-0.5">
                2
              </div>
              <p>System will auto-detect and identify you</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs text-white mt-0.5">
                3
              </div>
              <p>Appropriate button will appear (Check-in, Break, or Check-out)</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs text-white mt-0.5">
                4
              </div>
              <p>If late, you'll be asked to provide a reason</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Late Excuse Dialog */}
      <Dialog open={showLateDialog} onOpenChange={setShowLateDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Late Arrival - Provide Reason
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              You are {lateMinutes} minutes late. Please provide a reason for your late arrival.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason-type" className="text-white">
                Reason Type *
              </Label>
              <Select
                value={lateExcuse.reasonType}
                onValueChange={(value) => setLateExcuse({ ...lateExcuse, reasonType: value })}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {LATE_EXCUSE_TYPES.map((type) => (
                    <SelectItem 
                      key={type.value} 
                      value={type.value}
                      className="text-white hover:bg-slate-600"
                    >
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-white">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Provide more details about why you're late..."
                value={lateExcuse.notes}
                onChange={(e) => setLateExcuse({ ...lateExcuse, notes: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
              />
            </div>

            <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
              <p className="text-sm text-amber-200">
                <strong>Note:</strong> Your reason will be sent to HR for review. Your work hours will be adjusted accordingly upon approval.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLateDialog(false)}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLateExcuseSubmit}
              disabled={!lateExcuse.reasonType}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Submit & Check In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  )
}
