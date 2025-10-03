'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { attendanceService } from '@/lib/attendance';
import { useAuth } from '@/components/auth/AuthProvider';
import { FaceRecognitionCamera } from '@/components/face-recognition-camera';
import { Camera, MapPin, Clock, UserCheck, UserX } from 'lucide-react';
import { MemoryOptimizer } from '@/lib/hardware-optimization';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export function AttendanceRecorder() {
  const { authState } = useAuth();
  const user = authState.user;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<'not-clocked-in' | 'clocked-in' | 'clocked-out'>('not-clocked-in');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [useFaceRecognition, setUseFaceRecognition] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [memoryStatus, setMemoryStatus] = useState<"normal" | "warning" | "critical">("normal");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (user) {
      checkAttendanceStatus();
      getLocation();
      
      // Check memory status periodically
      const checkMemoryStatus = () => {
        if (MemoryOptimizer.isMemoryCritical()) {
          setMemoryStatus("critical");
          MemoryOptimizer.cleanup();
        } else {
          // Check if memory is approaching critical levels
          if (typeof window !== 'undefined' && window.performance) {
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
        }
      };
      
      // Check memory status initially and periodically
      checkMemoryStatus();
      const memoryInterval = setInterval(checkMemoryStatus, 30000); // Check every 30 seconds
      
      return () => {
        clearInterval(memoryInterval);
      };
    }
  }, [user]);

  const checkAttendanceStatus = async () => {
    if (!user) return;
    
    try {
      const todayAttendance = await attendanceService.getTodayAttendance(user.id);
      if (todayAttendance) {
        if (todayAttendance.clock_in && todayAttendance.clock_out) {
          setAttendanceStatus('clocked-out');
        } else if (todayAttendance.clock_in) {
          setAttendanceStatus('clocked-in');
        }
      } else {
        setAttendanceStatus('not-clocked-in');
      }
    } catch (error) {
      console.error('Error checking attendance status:', error);
      toast({
        title: 'Error',
        description: 'Failed to check attendance status',
        variant: 'destructive',
      });
    }
  };

  const getLocation = () => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      setLocationError('Geolocation is not available in this environment');
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocationError(null);
      },
      (error) => {
        setLocationError(error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleClockIn = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Check memory status before processing
      if (MemoryOptimizer.isMemoryCritical()) {
        MemoryOptimizer.cleanup();
        setMemoryStatus("critical");
      }
      
      // Optimize photo data for memory usage if it exists
      const optimizedPhotoData = photoData
        ? MemoryOptimizer.optimizeObject(photoData)
        : photoData;
      
      await attendanceService.clockIn(user.id, location || undefined, optimizedPhotoData || undefined);
      setAttendanceStatus('clocked-in');
      toast({
        title: 'Success',
        description: 'You have successfully clocked in',
      });
      setPhotoData(null);
    } catch (error) {
      console.error('Error clocking in:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clock in',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Check memory status before processing
      if (MemoryOptimizer.isMemoryCritical()) {
        MemoryOptimizer.cleanup();
        setMemoryStatus("critical");
      }
      
      // Optimize photo data for memory usage if it exists
      const optimizedPhotoData = photoData
        ? MemoryOptimizer.optimizeObject(photoData)
        : photoData;
      
      await attendanceService.clockOut(user.id, location || undefined, optimizedPhotoData || undefined);
      setAttendanceStatus('clocked-out');
      toast({
        title: 'Success',
        description: 'You have successfully clocked out',
      });
      setPhotoData(null);
    } catch (error) {
      console.error('Error clocking out:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clock out',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoCapture = async (photo: string) => {
    // Optimize photo data for memory usage
    const optimizedPhoto = MemoryOptimizer.optimizeObject(photo);
    setPhotoData(optimizedPhoto);
  };

  const toggleFaceRecognition = () => {
    setUseFaceRecognition(!useFaceRecognition);
    if (!useFaceRecognition) {
      setManualMode(false);
    }
  };

  const toggleManualMode = () => {
    setManualMode(!manualMode);
    if (manualMode) {
      setUseFaceRecognition(true);
    }
  };

  const refreshLocation = () => {
    setLocation(null);
    setLocationError(null);
    getLocation();
  };

  const getStatusBadge = () => {
    switch (attendanceStatus) {
      case 'clocked-in':
        return <Badge className="bg-green-500">Clocked In</Badge>;
      case 'clocked-out':
        return <Badge className="bg-blue-500">Clocked Out</Badge>;
      default:
        return <Badge className="bg-gray-500">Not Clocked In</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Attendance Recorder
          </CardTitle>
          <CardDescription>
            Record your attendance using face recognition or manual entry
            <span className="text-xs text-muted-foreground ml-2">(Hardware optimizations enabled)</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Memory Status Indicator */}
          {memoryStatus !== "normal" && (
            <Alert className={memoryStatus === "critical" ? "border-red-500 bg-red-500/10" : "border-yellow-500 bg-yellow-500/10"}>
              <UserX className={`h-4 w-4 ${memoryStatus === "critical" ? "text-red-500" : "text-yellow-500"}`} />
              <AlertDescription className={memoryStatus === "critical" ? "text-red-400" : "text-yellow-400"}>
                {memoryStatus === "critical"
                  ? "Memory usage is critical. Some features may be limited."
                  : "Memory usage is high. Performance may be affected."}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {getStatusBadge()}
            </div>
            <div className="flex gap-2">
              <Button
                variant={useFaceRecognition ? 'default' : 'outline'}
                size="sm"
                onClick={toggleFaceRecognition}
              >
                <Camera className="h-4 w-4 mr-2" />
                Face Recognition
              </Button>
              <Button
                variant={manualMode ? 'default' : 'outline'}
                size="sm"
                onClick={toggleManualMode}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Manual Mode
              </Button>
            </div>
          </div>

          {locationError && (
            <Alert variant="destructive">
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                Location error: {locationError}
                <Button variant="link" size="sm" onClick={refreshLocation} className="ml-2 p-0 h-auto">
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              <span>
                Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                {location.accuracy && ` (±${Math.round(location.accuracy)}m)`}
              </span>
              <Button variant="ghost" size="sm" onClick={refreshLocation}>
                Refresh
              </Button>
            </div>
          )}

          {useFaceRecognition && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Face Recognition</h3>
              <FaceRecognitionCamera
                onCapture={handlePhotoCapture}
                isProcessing={isLoading}
                enableHardwareOptimizations={true}
              />
            </div>
          )}

          {manualMode && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Manual Photo Capture</h3>
              <div className="flex flex-col items-center gap-4">
                {photoData ? (
                  <div className="relative">
                    <img
                      src={photoData}
                      alt="Captured"
                      className="rounded-lg border max-w-full h-auto"
                      style={{ maxHeight: '300px' }}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setPhotoData(null)}
                    >
                      Retake
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Camera className="h-12 w-12 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      No photo captured. Please use face recognition or enable manual mode to capture a photo.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            {attendanceStatus === 'not-clocked-in' || attendanceStatus === 'clocked-out' ? (
              <Button
                onClick={handleClockIn}
                disabled={isLoading || !location}
                className="flex-1"
              >
                {isLoading ? 'Processing...' : 'Clock In'}
              </Button>
            ) : null}
            
            {attendanceStatus === 'clocked-in' ? (
              <Button
                onClick={handleClockOut}
                disabled={isLoading || !location}
                variant="outline"
                className="flex-1"
              >
                {isLoading ? 'Processing...' : 'Clock Out'}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}