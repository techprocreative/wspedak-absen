/**
 * Production-grade logging utility
 * Replaces console.log statements with structured logging
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private minLevel: LogLevel;
  private isProduction: boolean;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.minLevel = this.isProduction ? LogLevel.INFO : LogLevel.DEBUG;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  private formatEntry(entry: LogEntry): string {
    const { timestamp, level, message, context, error } = entry;
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    const errorStr = error ? ` | Error: ${error.message}\nStack: ${error.stack}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}${errorStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };

    const formattedMessage = this.formatEntry(entry);

    // In production, send to external logging service (e.g., Sentry, LogRocket)
    if (this.isProduction) {
      // For now, only log errors and warnings to console in production
      if (level === LogLevel.ERROR || level === LogLevel.WARN) {
        console[level](formattedMessage);
      }
      // TODO: Send to external logging service
      // await sendToLoggingService(entry);
    } else {
      // In development, use console with colors
      const consoleMethod = level === LogLevel.ERROR ? 'error' : 
                           level === LogLevel.WARN ? 'warn' : 
                           level === LogLevel.INFO ? 'info' : 'log';
      console[consoleMethod](formattedMessage);
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Helper functions for common use cases
export function logApiRequest(method: string, path: string, statusCode?: number): void {
  logger.info('API Request', { method, path, statusCode });
}

export function logApiError(method: string, path: string, error: Error): void {
  logger.error('API Error', error, { method, path });
}

export function logDatabaseQuery(query: string, duration?: number): void {
  logger.debug('Database Query', { query, duration });
}

export function logAuthEvent(event: string, userId?: string, success: boolean = true): void {
  logger.info('Auth Event', { event, userId, success });
}

export function logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', details?: Record<string, any>): void {
  logger.warn('Security Event', { event, severity, ...details });
}
