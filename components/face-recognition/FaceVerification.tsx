/**
 * Face Verification Component
 * Provides real-time face verification during attendance
 * Includes confidence scoring, threshold management, and fallback to manual entry
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, CheckCircle, XCircle, RefreshCw, User, Keyboard, Fingerprint } from 'lucide-react';
import { faceAPI, FaceQualityMetrics } from '@/lib/face-api';
import { faceStorage } from '@/lib/face-storage';
import { FaceEmbedding } from '@/lib/face-recognition';
import { faceRecognition, FaceMatch } from '@/lib/face-recognition';
import { MemoryOptimizer } from '@/lib/hardware-optimization';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
interface FaceVerificationProps {
  onVerificationSuccess?: (userId: string, confidence: number) => void;
  onManualEntry?: (employeeId: string) => void;
  minConfidence?: number;
  maxRetries?: number;
  // Hardware optimization options
  enableHardwareOptimizations?: boolean;
}

interface VerificationResult {
  userId?: string;
  confidence: number;
  success: boolean;
  message: string;
}

export const FaceVerification: React.FC<FaceVerificationProps> = ({
  onVerificationSuccess,
  onManualEntry,
  minConfidence = 0.8,
  maxRetries = 3,
  enableHardwareOptimizations = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceQuality, setFaceQuality] = useState<FaceQualityMetrics | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [knownFaces, setKnownFaces] = useState<FaceEmbedding[]>([]);
  const [memoryStatus, setMemoryStatus] = useState<"normal" | "warning" | "critical">("normal");

  // Initialize face API and load known faces
  useEffect(() => {
    const initialize = async () => {
      try {
        // Configure face API with hardware optimizations
        if (enableHardwareOptimizations) {
          faceAPI.updateOptions({
            enableMemoryOptimization: true,
            enableCPUOptimization: true,
            maxConcurrentOperations: 1,
          });
          
          // Configure face recognition with hardware optimizations
          faceRecognition.updateOptions({
            enableMemoryOptimization: true,
            enableCPUOptimization: true,
            maxConcurrentOperations: 1,
          });
        }
        
        // Load face API models
        await faceAPI.loadModels();
        setIsModelLoaded(true);
        
        // Load known faces from storage
        const faces = await faceStorage.getAllFaceEmbeddings();
        
        // Optimize known faces for memory usage if hardware optimizations are enabled
        if (enableHardwareOptimizations) {
          const optimizedFaces = faces.map(face => ({
            ...face,
            embedding: MemoryOptimizer.optimizeObject(face.embedding)
          }));
          setKnownFaces(optimizedFaces);
        } else {
          setKnownFaces(faces);
        }
        
        if (faces.length === 0) {
          setError('No faces enrolled in the system. Please enroll faces first.');
        }
      } catch (err) {
        logger.error('Failed to initialize face verification', err as Error);
        setError('Failed to initialize face recognition. Please try again.');
      }
    };

    initialize();

    return () => {
      stopCamera();
      
      // Release face recognition models from memory if hardware optimizations are enabled
      if (enableHardwareOptimizations) {
        faceAPI.releaseModels();
        faceRecognition.releaseModel();
      }
    };
  }, [enableHardwareOptimizations]);

  // Start camera when component mounts
  useEffect(() => {
    if (isModelLoaded && knownFaces.length > 0) {
      startCamera();
    }
  }, [isModelLoaded, knownFaces]);

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
        setVerificationResult(null);
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

  // Verify face
  const verifyFace = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive || isProcessing || knownFaces.length === 0) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setVerificationResult(null);

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
      const qualityThreshold = enableHardwareOptimizations ? 0.4 : 0.5;
      
      // Check if quality is acceptable
      if (quality.overall < qualityThreshold) {
        setError('Face quality is too low. Please ensure good lighting and clear view of your face.');
        setIsProcessing(false);
        return;
      }

      // Generate face embedding
      const embedding = await faceAPI.generateFaceEmbedding(canvas, face);
      
      // Match face against known faces
      const matches = await faceRecognition.matchFace(embedding, knownFaces);
      
      if (matches.length === 0) {
        // No match found
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        
        if (newRetryCount >= maxRetries) {
          setVerificationResult({
            confidence: 0,
            success: false,
            message: 'Face not recognized after maximum retries. Please try manual entry.',
          });
        } else {
          setError(`Face not recognized. Please try again. (${newRetryCount}/${maxRetries})`);
        }
      } else {
        // Match found
        const bestMatch = matches[0];
        
        // Adjust confidence threshold based on hardware optimizations
        const adjustedMinConfidence = enableHardwareOptimizations ? minConfidence * 0.9 : minConfidence;
        
        if (bestMatch.confidence >= adjustedMinConfidence) {
          // Verification successful
          setVerificationResult({
            userId: bestMatch.userId,
            confidence: bestMatch.confidence,
            success: true,
            message: `Face recognized successfully with ${Math.round(bestMatch.confidence * 100)}% confidence.`,
          });
          
          if (onVerificationSuccess) {
            onVerificationSuccess(bestMatch.userId, bestMatch.confidence);
          }
        } else {
          // Low confidence match
          const newRetryCount = retryCount + 1;
          setRetryCount(newRetryCount);
          
          if (newRetryCount >= maxRetries) {
            setVerificationResult({
              confidence: bestMatch.confidence,
              success: false,
              message: `Low confidence match (${Math.round(bestMatch.confidence * 100)}%). Please try manual entry.`,
            });
          } else {
            setError(`Low confidence match (${Math.round(bestMatch.confidence * 100)}%). Please try again. (${newRetryCount}/${maxRetries})`);
          }
        }
      }
    } catch (err) {
      logger.error('Error verifying face', err as Error);
      setError('Failed to verify face. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Retry verification
  const retryVerification = () => {
    setRetryCount(0);
    setError(null);
    setVerificationResult(null);
    setFaceQuality(null);
  };

  // Submit manual entry
  const submitManualEntry = () => {
    if (employeeId.trim()) {
      if (onManualEntry) {
        onManualEntry(employeeId.trim());
      }
      setShowManualEntry(false);
      setEmployeeId('');
    }
  };

  // Reset verification
  const resetVerification = () => {
    setRetryCount(0);
    setError(null);
    setVerificationResult(null);
    setFaceQuality(null);
    setMemoryStatus("normal");
    
    if (!isCameraActive) {
      startCamera();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Face Verification
          </CardTitle>
          <CardDescription>
            Position your face in the frame for attendance verification
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
          
          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Verification result */}
          {verificationResult && (
            <Alert variant={verificationResult.success ? "default" : "destructive"}>
              {verificationResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{verificationResult.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Camera preview */}
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
            
            {/* Verification controls */}
            <div className="flex gap-2">
              <Button 
                onClick={verifyFace}
                disabled={!isCameraActive || isProcessing || knownFaces.length === 0}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {enableHardwareOptimizations ? 'Verifying (optimized)...' : 'Verifying...'}
                  </>
                ) : (
                  'Verify Face'
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={resetVerification}
                disabled={isProcessing}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              
              <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Keyboard className="mr-2 h-4 w-4" />
                    Manual
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manual Entry</DialogTitle>
                    <DialogDescription>
                      Enter your employee ID for manual attendance verification
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">Employee ID</Label>
                      <Input
                        id="employeeId"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="Enter your employee ID"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowManualEntry(false)}>
                        Cancel
                      </Button>
                      <Button onClick={submitManualEntry} disabled={!employeeId.trim()}>
                        Submit
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Quality metrics */}
          {faceQuality && (
            <div className="p-3 bg-gray-50 rounded-lg">
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

          {/* System info */}
          <div className="text-sm text-gray-500">
            <p>Minimum confidence threshold: {Math.round(minConfidence * 100)}%</p>
            <p>Maximum retries: {maxRetries}</p>
            <p>Known faces in system: {knownFaces.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};