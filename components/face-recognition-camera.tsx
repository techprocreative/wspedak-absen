"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Camera, Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { faceAPI, FaceQualityMetrics } from "@/lib/face-api"
import { faceRecognition, FaceMatch, FaceDetection } from "@/lib/face-recognition"
import { faceStorage } from "@/lib/face-storage"
import { FaceEmbedding } from "@/lib/face-recognition"
import { MemoryOptimizer, CPUOptimizer } from "@/lib/hardware-optimization"

import { logger, logApiError, logApiRequest } from '@/lib/logger'
interface FaceRecognitionCameraProps {
  onCapture?: (imageData: string) => Promise<void>
  onFaceDetected?: (detection: FaceDetection) => void
  onFaceVerified?: (match: FaceMatch) => void
  onEnrolled?: (embedding: FaceEmbedding) => void | Promise<void>
  isProcessing?: boolean
  mode?: "capture" | "verification" | "enrollment"
  minConfidence?: number
  userId?: string
  // Hardware optimization options
  enableHardwareOptimizations?: boolean
}

export function FaceRecognitionCamera({
  onCapture,
  onFaceDetected,
  onFaceVerified,
  onEnrolled,
  isProcessing = false,
  mode = "capture",
  minConfidence = 0.8,
  userId,
  enableHardwareOptimizations = true
}: FaceRecognitionCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [faceQuality, setFaceQuality] = useState<FaceQualityMetrics | null>(null)
  const [faceDetected, setFaceDetected] = useState<FaceDetection | null>(null)
  const [faceMatch, setFaceMatch] = useState<FaceMatch | null>(null)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [knownFaces, setKnownFaces] = useState<FaceEmbedding[]>([])
  const [memoryStatus, setMemoryStatus] = useState<"normal" | "warning" | "critical">("normal")

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      
      // Check memory status if hardware optimizations are enabled (but don't block camera startup)
      if (enableHardwareOptimizations && MemoryOptimizer.isMemoryCritical()) {
        setMemoryStatus("critical")
        // Cleanup but don't prevent camera from starting
        MemoryOptimizer.cleanup()
        logger.warn('Memory critical during camera start, cleanup performed')
      } else if (enableHardwareOptimizations) {
        // Check if memory is approaching critical levels
        const memory = (window.performance as any).memory
        if (memory) {
          const usedRatio = memory.usedJSHeapSize / memory.totalJSHeapSize
          if (usedRatio > 0.85) {
            setMemoryStatus("critical")
          } else if (usedRatio > 0.7) {
            setMemoryStatus("warning")
          } else {
            setMemoryStatus("normal")
          }
        }
      }
      
      // Optimize camera resolution for hardware constraints
      const videoConstraints = enableHardwareOptimizations
        ? {
            width: { ideal: 480 }, // Reduced resolution for better performance
            height: { ideal: 360 }, // Reduced resolution for better performance
            facingMode: "user",
          }
        : {
            width: 640,
            height: 480,
            facingMode: "user",
          }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsStreaming(true)
      }
    } catch (err) {
      setError("Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.")
      logger.error('Camera access error', err as Error)
    }
  }, [enableHardwareOptimizations])

  // Initialize face recognition system
  useEffect(() => {
    const initializeFaceRecognition = async () => {
      try {
        // Load face API models with hardware optimizations
        if (enableHardwareOptimizations) {
          // Configure face API with hardware optimizations
          faceAPI.updateOptions({
            enableMemoryOptimization: true,
            enableCPUOptimization: true,
            maxConcurrentOperations: 1,
          })
          
          // Configure face recognition with hardware optimizations
          faceRecognition.updateOptions({
            enableMemoryOptimization: true,
            enableCPUOptimization: true,
            maxConcurrentOperations: 1,
          })
        }
        
        // Load face API models
        await faceAPI.loadModels()
        setIsModelLoaded(true)
        
        // Load known faces from storage if in verification mode
        if (mode === "verification") {
          const faces = await faceStorage.getAllFaceEmbeddings()
          
          // Optimize known faces for memory usage if hardware optimizations are enabled
          if (enableHardwareOptimizations) {
            const optimizedFaces = faces.map(face => ({
              ...face,
              embedding: MemoryOptimizer.optimizeObject(face.embedding)
            }))
            setKnownFaces(optimizedFaces)
          } else {
            setKnownFaces(faces)
          }
          
          if (faces.length === 0) {
            setError("No faces enrolled in the system. Please enroll faces first.")
          }
        }
      } catch (err) {
        logger.error('Failed to initialize face recognition', err as Error)
        setError("Failed to initialize face recognition. Please try again.")
      }
    }

    initializeFaceRecognition()
  }, [mode, enableHardwareOptimizations])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setIsStreaming(false)
    }
  }, [])

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Optimize image quality for hardware constraints
    const imageQuality = enableHardwareOptimizations ? 0.7 : 0.8
    
    // Convert to base64
    const imageData = canvas.toDataURL("image/jpeg", imageQuality)
    setCapturedImage(imageData)

    try {
      // Check memory status before processing
      if (enableHardwareOptimizations && MemoryOptimizer.isMemoryCritical()) {
        MemoryOptimizer.cleanup()
        setMemoryStatus("critical")
      }
      
      // Detect faces
      const faces = await faceAPI.detectFaces(canvas)
      
      if (faces.length === 0) {
        setError("No face detected. Please position your face within the frame.")
        return
      }

      if (faces.length > 1) {
        setError("Multiple faces detected. Please ensure only your face is in the frame.")
        return
      }

      const face = faces[0]
      setFaceDetected(face)
      
      // Calculate face quality
      const quality = await faceAPI.calculateFaceQuality(canvas, face)
      setFaceQuality(quality)

      // Adjust quality threshold based on hardware optimizations
      const qualityThreshold = enableHardwareOptimizations ? 0.4 : 0.5
      
      // Check if quality is acceptable
      if (quality.overall < qualityThreshold) {
        setError("Face quality is too low. Please ensure good lighting and clear view of your face.")
        return
      }

      // Handle different modes
      if (mode === "capture") {
        // Just capture the image and notify parent
        if (onFaceDetected) {
          onFaceDetected(face)
        }
      } else if (mode === "verification" && knownFaces.length > 0) {
        // Generate face embedding
        const embedding = await faceAPI.generateFaceEmbedding(canvas, face)
        
        // Match face against known faces
        const matches = await faceRecognition.matchFace(embedding, knownFaces)
        
        if (matches.length > 0) {
          const bestMatch = matches[0]
          setFaceMatch(bestMatch)
          
          // Adjust confidence threshold based on hardware optimizations
          const adjustedMinConfidence = enableHardwareOptimizations ? minConfidence * 0.9 : minConfidence
          
          if (bestMatch.confidence >= adjustedMinConfidence) {
            // Verification successful
            if (onFaceVerified) {
              onFaceVerified(bestMatch)
            }
          } else {
            setError(`Low confidence match (${Math.round(bestMatch.confidence * 100)}%). Please try again.`)
          }
        } else {
          setError("Face not recognized. Please try again.")
        }
      } else if (mode === "enrollment" && userId) {
        // Generate face embedding
        const embedding = await faceAPI.generateFaceEmbedding(canvas, face)
        
        // Optimize embedding for memory usage if hardware optimizations are enabled
        const optimizedEmbedding = enableHardwareOptimizations
          ? MemoryOptimizer.optimizeObject(embedding)
          : embedding
        
        // Create face embedding object
        const faceEmbedding: FaceEmbedding = {
          id: `face_${userId}_${Date.now()}`,
          userId,
          embedding: optimizedEmbedding,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            quality: quality.overall,
            lighting: quality.lighting,
            pose: quality.pose,
          },
        }

        // Store face embedding
        await faceStorage.storeFaceEmbedding(faceEmbedding)
        if (onEnrolled) {
          await onEnrolled(faceEmbedding)
        }
        
        if (onFaceDetected) {
          onFaceDetected(face)
        }
      }
    } catch (err) {
      logger.error('Error processing face', err as Error)
      setError("Failed to process face. Please try again.")
    }

    // Stop camera
    stopCamera()

    // Send to parent component for processing
    if (onCapture) {
      await onCapture(imageData)
    }
  }, [onCapture, stopCamera, isModelLoaded, mode, knownFaces, minConfidence, userId, onFaceDetected, onFaceVerified, enableHardwareOptimizations])

  const resetCapture = useCallback(() => {
    setCapturedImage(null)
    setFaceQuality(null)
    setFaceDetected(null)
    setFaceMatch(null)
    setError(null)
    setMemoryStatus("normal")
    startCamera()
  }, [startCamera])

  useEffect(() => {
    return () => {
      stopCamera()
      
      // Release face recognition models from memory if hardware optimizations are enabled
      if (enableHardwareOptimizations) {
        faceAPI.releaseModels()
        faceRecognition.releaseModel()
      }
    }
  }, [stopCamera, enableHardwareOptimizations])

  return (
    <div className="space-y-4">
      {/* Memory Status Indicator */}
      {enableHardwareOptimizations && memoryStatus !== "normal" && (
        <Alert className={memoryStatus === "critical" ? "border-red-500 bg-red-500/10" : "border-yellow-500 bg-yellow-500/10"}>
          <AlertCircle className={`h-4 w-4 ${memoryStatus === "critical" ? "text-red-500" : "text-yellow-500"}`} />
          <AlertDescription className={memoryStatus === "critical" ? "text-red-400" : "text-yellow-400"}>
            {memoryStatus === "critical"
              ? "Memory usage is critical. Some features may be limited."
              : "Memory usage is high. Performance may be affected."}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Camera/Image Display */}
      <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
        {!isStreaming && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Kamera belum aktif</p>
              {enableHardwareOptimizations && (
                <p className="text-xs mt-2">Hardware optimizations enabled</p>
              )}
            </div>
          </div>
        )}

        {isStreaming && <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />}

        {capturedImage && (
          <img src={capturedImage || "/placeholder.svg"} alt="Captured face" className="w-full h-full object-cover" />
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Mengenali wajah...</p>
              {enableHardwareOptimizations && (
                <p className="text-xs opacity-75">Using optimized processing</p>
              )}
            </div>
          </div>
        )}

        {/* Face Detection Guide */}
        {isStreaming && !isProcessing && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-48 h-48 border-2 border-emerald-400 rounded-full opacity-50"></div>
            </div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/80 px-3 py-1 rounded text-white text-sm">
              Posisikan wajah di dalam lingkaran
            </div>
          </div>
        )}

        {/* Face Quality Indicator */}
        {faceQuality && (
          <div className="absolute top-2 right-2">
            <Badge
              variant={faceQuality.overall >= 0.8 ? "default" : faceQuality.overall >= 0.6 ? "secondary" : "destructive"}
            >
              Quality: {Math.round(faceQuality.overall * 100)}%
            </Badge>
          </div>
        )}

        {/* Verification Status */}
        {faceMatch && (
          <div className="absolute top-2 left-2">
            <Badge
              variant={faceMatch.confidence >= minConfidence ? "default" : "destructive"}
              className="flex items-center gap-1"
            >
              {faceMatch.confidence >= minConfidence ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {Math.round(faceMatch.confidence * 100)}%
            </Badge>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-500 bg-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3 justify-center">
        {!isStreaming && !capturedImage && (
          <Button
            onClick={startCamera}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isProcessing}
          >
            <Camera className="w-4 h-4 mr-2" />
            Aktifkan Kamera
          </Button>
        )}

        {isStreaming && !capturedImage && (
          <>
            <Button
              onClick={capturePhoto}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isProcessing}
            >
              <Camera className="w-4 h-4 mr-2" />
              Ambil Foto
            </Button>
            <Button
              onClick={stopCamera}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
              disabled={isProcessing}
            >
              Batal
            </Button>
          </>
        )}

        {capturedImage && !isProcessing && (
          <Button
            onClick={resetCapture}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
          >
            Ambil Ulang
          </Button>
        )}
      </div>
    </div>
  )
}
