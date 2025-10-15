/**
 * Face Enrollment Component
 * Provides face registration and enrollment process with multiple face capture
 * Includes face quality validation and feedback
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, CheckCircle, XCircle, RefreshCw, User } from 'lucide-react';
import { faceAPI, FaceQualityMetrics } from '@/lib/face-api';
import { faceStorage } from '@/lib/face-storage';
import { FaceEmbedding } from '@/lib/face-recognition';
import { MemoryOptimizer, CPUOptimizer } from '@/lib/hardware-optimization';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
interface FaceEnrollmentProps {
  userId: string;
  userName: string;
  onEnrollmentComplete?: (success: boolean, faceCount?: number) => void;
  onCancel?: () => void;
  // Hardware optimization options
  enableHardwareOptimizations?: boolean;
}

interface EnrollmentStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  quality?: number;
}

export const FaceEnrollment: React.FC<FaceEnrollmentProps> = ({
  userId,
  userName,
  onEnrollmentComplete,
  onCancel,
  enableHardwareOptimizations = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enrollmentSteps, setEnrollmentSteps] = useState<EnrollmentStep[]>([
    { id: 1, title: 'Front View', description: 'Look directly at the camera', completed: false },
    { id: 2, title: 'Slight Left', description: 'Turn your head slightly to the left', completed: false },
    { id: 3, title: 'Slight Right', description: 'Turn your head slightly to the right', completed: false },
    { id: 4, title: 'Look Up', description: 'Tilt your head up slightly', completed: false },
    { id: 5, title: 'Look Down', description: 'Tilt your head down slightly', completed: false },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [faceQuality, setFaceQuality] = useState<FaceQualityMetrics | null>(null);
  const [capturedFaces, setCapturedFaces] = useState<FaceEmbedding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [memoryStatus, setMemoryStatus] = useState<"normal" | "warning" | "critical">("normal");

  // Initialize face API
  useEffect(() => {
    const initializeFaceAPI = async () => {
      try {
        // Configure face API with hardware optimizations
        if (enableHardwareOptimizations) {
          faceAPI.updateOptions({
            enableMemoryOptimization: true,
            enableCPUOptimization: true,
            maxConcurrentOperations: 1,
          });
        }
        
        await faceAPI.loadModels();
        setIsModelLoaded(true);
      } catch (err) {
        logger.error('Failed to load face API models', err as Error);
        setError('Failed to initialize face recognition. Please try again.');
      }
    };

    initializeFaceAPI();

    return () => {
      stopCamera();
      
      // Release face recognition models from memory if hardware optimizations are enabled
      if (enableHardwareOptimizations) {
        faceAPI.releaseModels();
      }
    };
  }, [enableHardwareOptimizations]);

  // Start camera when component mounts
  useEffect(() => {
    if (isModelLoaded) {
      startCamera();
    }
  }, [isModelLoaded]);

  // Start camera
  const startCamera = async () => {
    try {
      // Check memory status if hardware optimizations are enabled
      if (enableHardwareOptimizations && MemoryOptimizer.isMemoryCritical()) {
        setMemoryStatus("critical");
        MemoryOptimizer.cleanup();
      } else if (enableHardwareOptimizations) {
        // Check if memory is approaching critical levels
        const memory = (window.performance as any).memory;
        if (memory) {
          const usedRatio = memory.usedJSHeapSize / memory.totalJSHeapSize;
          if (usedRatio > 0.7) {
            setMemoryStatus("warning");
          } else {
            setMemoryStatus("normal");
          }
        }
      }
      
      // Optimize camera resolution for hardware constraints
      const videoConstraints = enableHardwareOptimizations
        ? {
            video: {
              width: { ideal: 480 }, // Reduced resolution for better performance
              height: { ideal: 360 }, // Reduced resolution for better performance
              facingMode: 'user'
            }
          }
        : {
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user'
            }
          };
      
      const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setError(null);
      }
    } catch (err) {
      logger.error('Error accessing camera', err as Error);
      setError('Could not access the camera. Please ensure you have granted camera permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  // Capture face
  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Check memory status before processing
      if (enableHardwareOptimizations && MemoryOptimizer.isMemoryCritical()) {
        MemoryOptimizer.cleanup();
        setMemoryStatus("critical");
      }
      
      // Draw video frame to canvas
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect faces
      const faces = await faceAPI.detectFaces(canvas);
      
      if (faces.length === 0) {
        setError('No face detected. Please position your face within the frame.');
        setIsProcessing(false);
        return;
      }

      if (faces.length > 1) {
        setError('Multiple faces detected. Please ensure only your face is in the frame.');
        setIsProcessing(false);
        return;
      }

      const face = faces[0];
      
      // Calculate face quality
      const quality = await faceAPI.calculateFaceQuality(canvas, face);
      setFaceQuality(quality);

      // Adjust quality threshold based on hardware optimizations
      const qualityThreshold = enableHardwareOptimizations ? 0.5 : 0.6;
      
      // Check if quality is acceptable
      if (quality.overall < qualityThreshold) {
        setError('Face quality is too low. Please ensure good lighting and clear view of your face.');
        setIsProcessing(false);
        return;
      }

      // Generate face embedding
      const embedding = await faceAPI.generateFaceEmbedding(canvas, face);
      
      // Optimize embedding for memory usage if hardware optimizations are enabled
      const optimizedEmbedding = enableHardwareOptimizations
        ? MemoryOptimizer.optimizeObject(embedding)
        : embedding;
      
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
      };

      // Store face embedding
      await faceStorage.storeFaceEmbedding(faceEmbedding);
      
      // Update captured faces
      setCapturedFaces(prev => [...prev, faceEmbedding]);
      
      // Update enrollment step
      const updatedSteps = [...enrollmentSteps];
      updatedSteps[currentStep] = {
        ...updatedSteps[currentStep],
        completed: true,
        quality: quality.overall,
      };
      setEnrollmentSteps(updatedSteps);
      
      // Move to next step or complete enrollment
      if (currentStep < enrollmentSteps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        // Enrollment complete
        stopCamera();
        if (onEnrollmentComplete) {
          onEnrollmentComplete(true, capturedFaces.length + 1);
        }
      }
    } catch (err) {
      logger.error('Error capturing face', err as Error);
      setError('Failed to capture face. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Retake current step
  const retakeCurrentStep = () => {
    const updatedSteps = [...enrollmentSteps];
    updatedSteps[currentStep] = {
      ...updatedSteps[currentStep],
      completed: false,
      quality: undefined,
    };
    setEnrollmentSteps(updatedSteps);
    setFaceQuality(null);
    setError(null);
  };

  // Reset enrollment
  const resetEnrollment = async () => {
    // Delete captured faces
    for (const face of capturedFaces) {
      await faceStorage.deleteFaceEmbedding(face.id);
    }
    
    setCapturedFaces([]);
    setEnrollmentSteps(enrollmentSteps.map(step => ({
      ...step,
      completed: false,
      quality: undefined,
    })));
    setCurrentStep(0);
    setFaceQuality(null);
    setError(null);
    setMemoryStatus("normal");
    
    if (!isCameraActive) {
      startCamera();
    }
  };

  // Cancel enrollment
  const cancelEnrollment = async () => {
    // Delete captured faces
    for (const face of capturedFaces) {
      await faceStorage.deleteFaceEmbedding(face.id);
    }
    
    stopCamera();
    if (onCancel) {
      onCancel();
    }
  };

  // Calculate enrollment progress
  const enrollmentProgress = (enrollmentSteps.filter(step => step.completed).length / enrollmentSteps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Face Enrollment for {userName}
          </CardTitle>
          <CardDescription>
            Follow the steps below to enroll your face for attendance recognition
            {enableHardwareOptimizations && (
              <span className="text-xs text-muted-foreground ml-2">(Hardware optimizations enabled)</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Memory Status Indicator */}
          {enableHardwareOptimizations && memoryStatus !== "normal" && (
            <Alert className={memoryStatus === "critical" ? "border-red-500 bg-red-500/10" : "border-yellow-500 bg-yellow-500/10"}>
              <XCircle className={`h-4 w-4 ${memoryStatus === "critical" ? "text-red-500" : "text-yellow-500"}`} />
              <AlertDescription className={memoryStatus === "critical" ? "text-red-400" : "text-yellow-400"}>
                {memoryStatus === "critical"
                  ? "Memory usage is critical. Some features may be limited."
                  : "Memory usage is high. Performance may be affected."}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Enrollment Progress</span>
              <span>{Math.round(enrollmentProgress)}%</span>
            </div>
            <Progress value={enrollmentProgress} className="h-2" />
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Camera preview */}
            <div className="space-y-4">
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border">
                {!isCameraActive ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="h-12 w-12 mx-auto text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">Camera not active</p>
                    </div>
                  </div>
                ) : (
                  <video 
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Face quality indicator */}
                {faceQuality && (
                  <div className="absolute top-2 right-2">
                    <Badge 
                      variant={faceQuality.overall >= 0.8 ? "default" : faceQuality.overall >= 0.6 ? "secondary" : "destructive"}
                    >
                      Quality: {Math.round(faceQuality.overall * 100)}%
                    </Badge>
                  </div>
                )}
              </div>
              
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Camera controls */}
              <div className="flex gap-2">
                <Button
                  onClick={captureFace}
                  disabled={!isCameraActive || isProcessing || enrollmentSteps[currentStep].completed}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      {enableHardwareOptimizations ? 'Processing (optimized)...' : 'Processing...'}
                    </>
                  ) : enrollmentSteps[currentStep].completed ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Captured
                    </>
                  ) : (
                    'Capture Face'
                  )}
                </Button>
                
                {enrollmentSteps[currentStep].completed && (
                  <Button
                    variant="outline"
                    onClick={retakeCurrentStep}
                    disabled={isProcessing}
                  >
                    Retake
                  </Button>
                )}
              </div>
            </div>

            {/* Enrollment steps */}
            <div className="space-y-4">
              <h3 className="font-medium">Enrollment Steps</h3>
              
              <div className="space-y-3">
                {enrollmentSteps.map((step, index) => (
                  <div 
                    key={step.id}
                    className={`p-3 rounded-lg border ${
                      index === currentStep 
                        ? 'border-primary bg-primary/5' 
                        : step.completed 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        step.completed 
                          ? 'bg-green-500 text-white' 
                          : index === currentStep 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-gray-200 text-gray-500'
                      }`}>
                        {step.completed ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          step.id
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium">{step.title}</h4>
                        <p className="text-sm text-gray-600">{step.description}</p>
                        
                        {step.quality !== undefined && (
                          <div className="mt-1">
                            <Badge variant="outline">
                              Quality: {Math.round(step.quality * 100)}%
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Quality metrics */}
              {faceQuality && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Face Quality Metrics</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Sharpness:</span>
                      <span>{Math.round(faceQuality.sharpness * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lighting:</span>
                      <span>{Math.round(faceQuality.lighting * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pose:</span>
                      <span>{Math.round(faceQuality.pose * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overall:</span>
                      <span>{Math.round(faceQuality.overall * 100)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={cancelEnrollment}>
              Cancel
            </Button>
            
            <Button variant="outline" onClick={resetEnrollment}>
              Reset Enrollment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};