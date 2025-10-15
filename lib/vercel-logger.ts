/**
 * Vercel-optimized Logger for Face Recognition
 * Ensures logs appear in Vercel Functions and Runtime logs
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  action?: string;
  component?: string;
  metadata?: Record<string, any>;
  timing?: {
    start: number;
    end?: number;
    duration?: number;
  };
}

export interface FaceRecognitionLogEvent {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    modelLoadTime?: number;
    detectionTime?: number;
    matchingTime?: number;
    totalTime?: number;
  };
}

class VercelLogger {
  private static instance: VercelLogger;
  private logLevel: LogLevel;
  private sessionId: string;
  private logBuffer: FaceRecognitionLogEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Set log level based on environment
    const envLogLevel = process.env.NEXT_PUBLIC_LOG_LEVEL || process.env.LOG_LEVEL;
    this.logLevel = this.parseLogLevel(envLogLevel);
    this.sessionId = this.generateSessionId();
    
    // Start flush interval for buffered logs
    if (typeof window === 'undefined') {
      // Server-side: flush immediately
      this.flushInterval = null;
    } else {
      // Client-side: batch logs
      this.flushInterval = setInterval(() => this.flush(), 5000);
    }
  }

  static getInstance(): VercelLogger {
    if (!VercelLogger.instance) {
      VercelLogger.instance = new VercelLogger();
    }
    return VercelLogger.instance;
  }

  private parseLogLevel(level?: string): LogLevel {
    switch (level?.toUpperCase()) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'FATAL': return LogLevel.FATAL;
      default: 
        // Default to INFO in production, DEBUG in development
        return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatMessage(event: FaceRecognitionLogEvent): string {
    const levelStr = LogLevel[event.level];
    const timestamp = event.timestamp;
    const context = event.context ? JSON.stringify(event.context) : '';
    
    // Format for Vercel logs
    return `[${timestamp}] [${levelStr}] [FR-${this.sessionId}] ${event.message} ${context}`;
  }

  private createEvent(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): FaceRecognitionLogEvent {
    const event: FaceRecognitionLogEvent = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        sessionId: this.sessionId,
      }
    };

    if (error) {
      event.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    if (context?.timing?.start && context?.timing?.end) {
      context.timing.duration = context.timing.end - context.timing.start;
    }

    return event;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private writeLog(event: FaceRecognitionLogEvent): void {
    const formattedMessage = this.formatMessage(event);
    
    // Server-side logging (appears in Vercel Functions logs)
    if (typeof window === 'undefined') {
      switch (event.level) {
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          console.log(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(formattedMessage);
          if (event.error?.stack) {
            console.error(event.error.stack);
          }
          break;
      }
    } else {
      // Client-side: buffer logs for batch sending
      this.logBuffer.push(event);
      
      // Also log to browser console in development
      if (process.env.NODE_ENV !== 'production') {
        switch (event.level) {
          case LogLevel.DEBUG:
            console.debug(formattedMessage);
            break;
          case LogLevel.INFO:
            console.log(formattedMessage);
            break;
          case LogLevel.WARN:
            console.warn(formattedMessage);
            break;
          case LogLevel.ERROR:
          case LogLevel.FATAL:
            console.error(formattedMessage);
            break;
        }
      }
    }
  }

  // Public logging methods
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const event = this.createEvent(LogLevel.DEBUG, message, context);
      this.writeLog(event);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const event = this.createEvent(LogLevel.INFO, message, context);
      this.writeLog(event);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const event = this.createEvent(LogLevel.WARN, message, context);
      this.writeLog(event);
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const err = error instanceof Error ? error : new Error(String(error));
      const event = this.createEvent(LogLevel.ERROR, message, context, err);
      this.writeLog(event);
    }
  }

  fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog(LogLevel.FATAL)) {
      const err = error instanceof Error ? error : new Error(String(error));
      const event = this.createEvent(LogLevel.FATAL, message, context, err);
      this.writeLog(event);
      // Force flush on fatal errors
      this.flush();
    }
  }

  // Face Recognition specific logging methods
  logModelLoading(
    status: 'start' | 'progress' | 'success' | 'error',
    details?: {
      model?: string;
      progress?: number;
      error?: string;
      loadTime?: number;
    }
  ): void {
    const message = `Model Loading: ${status}`;
    const context: LogContext = {
      action: 'model_loading',
      component: 'face-api',
      metadata: details
    };

    switch (status) {
      case 'start':
        this.info(message, context);
        break;
      case 'progress':
        this.debug(message, context);
        break;
      case 'success':
        this.info(message, { ...context, timing: { duration: details?.loadTime } });
        break;
      case 'error':
        this.error(message, new Error(details?.error || 'Unknown error'), context);
        break;
    }
  }

  logFaceDetection(
    status: 'start' | 'detected' | 'no_face' | 'error',
    details?: {
      confidence?: number;
      faceCount?: number;
      quality?: number;
      error?: string;
      detectionTime?: number;
    }
  ): void {
    const message = `Face Detection: ${status}`;
    const context: LogContext = {
      action: 'face_detection',
      component: 'camera',
      metadata: details
    };

    switch (status) {
      case 'start':
        this.debug(message, context);
        break;
      case 'detected':
        this.info(message, { ...context, timing: { duration: details?.detectionTime } });
        break;
      case 'no_face':
        this.warn(message, context);
        break;
      case 'error':
        this.error(message, new Error(details?.error || 'Detection failed'), context);
        break;
    }
  }

  logFaceMatching(
    status: 'start' | 'matched' | 'no_match' | 'error',
    details?: {
      userId?: string;
      confidence?: number;
      threshold?: number;
      candidatesCount?: number;
      error?: string;
      matchingTime?: number;
    }
  ): void {
    const message = `Face Matching: ${status}`;
    const context: LogContext = {
      action: 'face_matching',
      component: 'recognition',
      userId: details?.userId,
      metadata: details
    };

    switch (status) {
      case 'start':
        this.debug(message, context);
        break;
      case 'matched':
        this.info(message, { ...context, timing: { duration: details?.matchingTime } });
        break;
      case 'no_match':
        this.warn(message, context);
        break;
      case 'error':
        this.error(message, new Error(details?.error || 'Matching failed'), context);
        break;
    }
  }

  logAttendanceAction(
    action: 'check_in' | 'check_out' | 'break_start' | 'break_end',
    status: 'success' | 'failed',
    details?: {
      userId?: string;
      userName?: string;
      timestamp?: string;
      location?: { lat: number; lng: number };
      error?: string;
    }
  ): void {
    const message = `Attendance ${action}: ${status}`;
    const context: LogContext = {
      action: `attendance_${action}`,
      component: 'attendance',
      userId: details?.userId,
      metadata: details
    };

    if (status === 'success') {
      this.info(message, context);
    } else {
      this.error(message, new Error(details?.error || 'Attendance action failed'), context);
    }
  }

  // Batch send logs to server (for client-side)
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    
    const logs = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Send logs to API endpoint
      await fetch('/api/logs/face-recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs, sessionId: this.sessionId }),
      });
    } catch (error) {
      // If sending fails, don't re-buffer to avoid infinite loop
      console.error('Failed to send logs to server:', error);
    }
  }

  // Performance tracking
  startTimer(action: string): () => void {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      const duration = Math.round(end - start);
      
      this.debug(`Performance: ${action}`, {
        action: 'performance',
        component: 'timing',
        timing: { start, end, duration }
      });
      
      return duration;
    };
  }

  // Cleanup
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

// Export singleton instance
export const vercelLogger = VercelLogger.getInstance();

// Export convenience functions
export const logModelLoading = (status: Parameters<typeof vercelLogger.logModelLoading>[0], details?: Parameters<typeof vercelLogger.logModelLoading>[1]) => 
  vercelLogger.logModelLoading(status, details);

export const logFaceDetection = (status: Parameters<typeof vercelLogger.logFaceDetection>[0], details?: Parameters<typeof vercelLogger.logFaceDetection>[1]) => 
  vercelLogger.logFaceDetection(status, details);

export const logFaceMatching = (status: Parameters<typeof vercelLogger.logFaceMatching>[0], details?: Parameters<typeof vercelLogger.logFaceMatching>[1]) => 
  vercelLogger.logFaceMatching(status, details);

export const logAttendanceAction = (
  action: Parameters<typeof vercelLogger.logAttendanceAction>[0],
  status: Parameters<typeof vercelLogger.logAttendanceAction>[1],
  details?: Parameters<typeof vercelLogger.logAttendanceAction>[2]
) => vercelLogger.logAttendanceAction(action, status, details);
