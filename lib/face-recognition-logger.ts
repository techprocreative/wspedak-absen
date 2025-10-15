/**
 * Face Recognition Logger Integration
 * Wraps existing components with Vercel logging
 */

import { vercelLogger, logModelLoading, logFaceDetection, logFaceMatching, logAttendanceAction } from './vercel-logger';
import { logger as existingLogger } from './logger';

export class FaceRecognitionLogger {
  private startTime: number = 0;
  private sessionMetrics: {
    modelLoadTime?: number;
    detectionCount: number;
    matchCount: number;
    errorCount: number;
    startTime: number;
  };

  constructor() {
    this.sessionMetrics = {
      detectionCount: 0,
      matchCount: 0,
      errorCount: 0,
      startTime: Date.now()
    };
  }

  // Model loading lifecycle
  startModelLoading(modelName?: string): void {
    this.startTime = performance.now();
    logModelLoading('start', { model: modelName });
    existingLogger.info(`Starting to load face recognition models${modelName ? `: ${modelName}` : ''}`);
  }

  updateModelProgress(progress: number, modelName?: string): void {
    logModelLoading('progress', { model: modelName, progress });
    existingLogger.debug(`Model loading progress: ${progress}%${modelName ? ` for ${modelName}` : ''}`);
  }

  modelLoadSuccess(modelName?: string): void {
    const loadTime = Math.round(performance.now() - this.startTime);
    this.sessionMetrics.modelLoadTime = loadTime;
    
    logModelLoading('success', { model: modelName, loadTime });
    existingLogger.info(`✅ Model loaded successfully${modelName ? `: ${modelName}` : ''} (${loadTime}ms)`);
  }

  modelLoadError(error: string | Error, modelName?: string): void {
    const loadTime = Math.round(performance.now() - this.startTime);
    const errorMsg = error instanceof Error ? error.message : error;
    
    this.sessionMetrics.errorCount++;
    logModelLoading('error', { model: modelName, error: errorMsg, loadTime });
    existingLogger.error(`❌ Model load failed${modelName ? ` for ${modelName}` : ''}: ${errorMsg}`);
  }

  // Face detection lifecycle
  startFaceDetection(): void {
    this.startTime = performance.now();
    logFaceDetection('start');
    existingLogger.debug('Starting face detection...');
  }

  faceDetected(confidence: number, quality?: number, faceCount: number = 1): void {
    const detectionTime = Math.round(performance.now() - this.startTime);
    this.sessionMetrics.detectionCount++;
    
    logFaceDetection('detected', { 
      confidence, 
      quality, 
      faceCount, 
      detectionTime 
    });
    
    existingLogger.info(`✅ Face detected: ${(confidence * 100).toFixed(2)}% confidence, ${faceCount} face(s) (${detectionTime}ms)`);
  }

  noFaceDetected(reason?: string): void {
    const detectionTime = Math.round(performance.now() - this.startTime);
    
    logFaceDetection('no_face', { 
      error: reason,
      detectionTime 
    });
    
    existingLogger.warn(`⚠️ No face detected${reason ? `: ${reason}` : ''} (${detectionTime}ms)`);
  }

  faceDetectionError(error: string | Error): void {
    const detectionTime = Math.round(performance.now() - this.startTime);
    const errorMsg = error instanceof Error ? error.message : error;
    
    this.sessionMetrics.errorCount++;
    logFaceDetection('error', { 
      error: errorMsg,
      detectionTime 
    });
    
    existingLogger.error(`❌ Face detection error: ${errorMsg} (${detectionTime}ms)`);
  }

  // Face matching lifecycle
  startFaceMatching(candidatesCount: number): void {
    this.startTime = performance.now();
    logFaceMatching('start', { candidatesCount });
    existingLogger.debug(`Starting face matching against ${candidatesCount} candidates...`);
  }

  faceMatched(userId: string, confidence: number, threshold: number): void {
    const matchingTime = Math.round(performance.now() - this.startTime);
    this.sessionMetrics.matchCount++;
    
    logFaceMatching('matched', { 
      userId, 
      confidence, 
      threshold, 
      matchingTime 
    });
    
    existingLogger.info(`✅ Face matched: User ${userId} with ${(confidence * 100).toFixed(2)}% confidence (threshold: ${threshold}, time: ${matchingTime}ms)`);
  }

  noFaceMatch(bestConfidence?: number, threshold?: number): void {
    const matchingTime = Math.round(performance.now() - this.startTime);
    
    logFaceMatching('no_match', { 
      confidence: bestConfidence, 
      threshold, 
      matchingTime 
    });
    
    existingLogger.warn(`⚠️ No face match found${bestConfidence ? ` (best: ${(bestConfidence * 100).toFixed(2)}%)` : ''} (${matchingTime}ms)`);
  }

  faceMatchingError(error: string | Error): void {
    const matchingTime = Math.round(performance.now() - this.startTime);
    const errorMsg = error instanceof Error ? error.message : error;
    
    this.sessionMetrics.errorCount++;
    logFaceMatching('error', { 
      error: errorMsg,
      matchingTime 
    });
    
    existingLogger.error(`❌ Face matching error: ${errorMsg} (${matchingTime}ms)`);
  }

  // Attendance actions
  logCheckIn(userId: string, userName: string, success: boolean, error?: string): void {
    logAttendanceAction('check_in', success ? 'success' : 'failed', {
      userId,
      userName,
      timestamp: new Date().toISOString(),
      error
    });
    
    if (success) {
      existingLogger.info(`✅ Check-in successful for ${userName} (${userId})`);
    } else {
      existingLogger.error(`❌ Check-in failed for ${userName}: ${error}`);
    }
  }

  logCheckOut(userId: string, userName: string, success: boolean, error?: string): void {
    logAttendanceAction('check_out', success ? 'success' : 'failed', {
      userId,
      userName,
      timestamp: new Date().toISOString(),
      error
    });
    
    if (success) {
      existingLogger.info(`✅ Check-out successful for ${userName} (${userId})`);
    } else {
      existingLogger.error(`❌ Check-out failed for ${userName}: ${error}`);
    }
  }

  // Session summary
  getSessionSummary(): void {
    const sessionDuration = Math.round((Date.now() - this.sessionMetrics.startTime) / 1000);
    
    vercelLogger.info('Face Recognition Session Summary', {
      component: 'session_summary',
      metadata: {
        ...this.sessionMetrics,
        sessionDuration
      }
    });

    existingLogger.info(`
📊 Face Recognition Session Summary:
- Duration: ${sessionDuration}s
- Model Load Time: ${this.sessionMetrics.modelLoadTime || 'N/A'}ms
- Detections: ${this.sessionMetrics.detectionCount}
- Matches: ${this.sessionMetrics.matchCount}
- Errors: ${this.sessionMetrics.errorCount}
    `);
  }

  // Environment info for debugging
  logEnvironmentInfo(): void {
    const info = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'N/A',
      language: typeof navigator !== 'undefined' ? navigator.language : 'N/A',
      screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A',
      deviceMemory: typeof navigator !== 'undefined' ? (navigator as any).deviceMemory : 'N/A',
      hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 'N/A',
      connection: typeof navigator !== 'undefined' ? (navigator as any).connection?.effectiveType : 'N/A',
      isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    };

    vercelLogger.info('Face Recognition Environment Info', {
      component: 'environment',
      metadata: info
    });

    existingLogger.info('Environment Info:', info);
  }

  // Critical error logging
  logCriticalError(error: Error, context?: string): void {
    vercelLogger.fatal(`Critical Error in Face Recognition${context ? `: ${context}` : ''}`, error, {
      component: 'critical_error',
      metadata: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        context
      }
    });

    existingLogger.error(`🚨 CRITICAL ERROR${context ? ` in ${context}` : ''}: ${error.message}`, error);
  }
}

// Export singleton instance for easy use
export const frLogger = new FaceRecognitionLogger();

// Export convenience methods
export const logFRModelLoading = {
  start: (model?: string) => frLogger.startModelLoading(model),
  progress: (progress: number, model?: string) => frLogger.updateModelProgress(progress, model),
  success: (model?: string) => frLogger.modelLoadSuccess(model),
  error: (error: string | Error, model?: string) => frLogger.modelLoadError(error, model),
};

export const logFRDetection = {
  start: () => frLogger.startFaceDetection(),
  detected: (confidence: number, quality?: number, count?: number) => frLogger.faceDetected(confidence, quality, count),
  noFace: (reason?: string) => frLogger.noFaceDetected(reason),
  error: (error: string | Error) => frLogger.faceDetectionError(error),
};

export const logFRMatching = {
  start: (candidates: number) => frLogger.startFaceMatching(candidates),
  matched: (userId: string, confidence: number, threshold: number) => frLogger.faceMatched(userId, confidence, threshold),
  noMatch: (bestConfidence?: number, threshold?: number) => frLogger.noFaceMatch(bestConfidence, threshold),
  error: (error: string | Error) => frLogger.faceMatchingError(error),
};

export const logFRAttendance = {
  checkIn: (userId: string, userName: string, success: boolean, error?: string) => 
    frLogger.logCheckIn(userId, userName, success, error),
  checkOut: (userId: string, userName: string, success: boolean, error?: string) => 
    frLogger.logCheckOut(userId, userName, success, error),
};

export const logFRSession = {
  summary: () => frLogger.getSessionSummary(),
  environment: () => frLogger.logEnvironmentInfo(),
  criticalError: (error: Error, context?: string) => frLogger.logCriticalError(error, context),
};
