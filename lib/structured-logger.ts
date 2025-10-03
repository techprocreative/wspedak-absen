/**
 * Structured Logger System
 * Provides centralized, structured logging with multiple output formats
 * Optimized for DS223J hardware constraints
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  tags?: string[];
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

export interface LogFilter {
  level?: LogLevel;
  component?: string;
  userId?: string;
  sessionId?: string;
  startTime?: Date;
  endTime?: Date;
  tags?: string[];
  search?: string;
}

export interface LogOutput {
  name: string;
  write: (entry: LogEntry) => Promise<void> | void;
  flush?: () => Promise<void> | void;
  close?: () => Promise<void> | void;
}

export interface LoggerOptions {
  level?: LogLevel;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableRemote?: boolean;
  maxLogEntries?: number;
  enableCompression?: boolean;
  compressionThreshold?: number;
  remoteEndpoint?: string;
  remoteBatchSize?: number;
  remoteFlushInterval?: number;
  enableEncryption?: boolean;
  encryptionKey?: string;
  enableSampling?: boolean;
  samplingRate?: number;
}

export class StructuredLogger {
  private options: LoggerOptions;
  private logEntries: LogEntry[] = [];
  private outputs: LogOutput[] = [];
  private logIdCounter = 0;
  private sessionId: string;
  private remoteBuffer: LogEntry[] = [];
  private remoteFlushIntervalId: number | null = null;
  private compressionWorker: Worker | null = null;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      enableRemote: false,
      maxLogEntries: 10000,
      enableCompression: false,
      compressionThreshold: 1000,
      remoteBatchSize: 100,
      remoteFlushInterval: 30000, // 30 seconds
      enableEncryption: false,
      enableSampling: false,
      samplingRate: 1.0,
      ...options,
    };

    this.sessionId = this.generateSessionId();
    this.initializeOutputs();
    this.initializeRemoteFlush();
  }

  /**
   * Initialize logger outputs
   */
  private initializeOutputs(): void {
    // Console output
    if (this.options.enableConsole) {
      this.outputs.push(this.createConsoleOutput());
    }

    // File output (simulated in browser)
    if (this.options.enableFile) {
      this.outputs.push(this.createFileOutput());
    }

    // Remote output
    if (this.options.enableRemote && this.options.remoteEndpoint) {
      this.outputs.push(this.createRemoteOutput());
    }

    // Initialize compression worker if enabled
    if (this.options.enableCompression && typeof Worker !== 'undefined') {
      this.initializeCompressionWorker();
    }
  }

  /**
   * Initialize compression worker
   */
  private initializeCompressionWorker(): void {
    try {
      const workerCode = `
        self.onmessage = function(e) {
          if (e.data.type === 'compress') {
            try {
              const compressed = JSON.stringify(e.data.logs);
              self.postMessage({
                type: 'compress-result',
                data: compressed,
                success: true
              });
            } catch (error) {
              self.postMessage({
                type: 'compress-result',
                error: error.message,
                success: false
              });
            }
          }
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.compressionWorker = new Worker(URL.createObjectURL(blob));
    } catch (error) {
      console.warn('Failed to initialize compression worker:', error);
    }
  }

  /**
   * Initialize remote flush interval
   */
  private initializeRemoteFlush(): void {
    if (this.options.enableRemote && this.options.remoteFlushInterval) {
      this.remoteFlushIntervalId = window.setInterval(() => {
        this.flushRemoteLogs();
      }, this.options.remoteFlushInterval);
    }
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate a log ID
   */
  private generateLogId(): string {
    return `log_${++this.logIdCounter}_${Date.now()}`;
  }

  /**
   * Create console output
   */
  private createConsoleOutput(): LogOutput {
    return {
      name: 'console',
      write: (entry: LogEntry) => {
        const levelName = LogLevel[entry.level];
        const message = `[${entry.timestamp.toISOString()}] ${levelName}: ${entry.message}`;
        
        switch (entry.level) {
          case LogLevel.DEBUG:
            console.debug(message, entry.context);
            break;
          case LogLevel.INFO:
            console.info(message, entry.context);
            break;
          case LogLevel.WARN:
            console.warn(message, entry.context);
            break;
          case LogLevel.ERROR:
          case LogLevel.FATAL:
            console.error(message, entry.context);
            break;
        }
      },
    };
  }

  /**
   * Create file output (simulated in browser with localStorage)
   */
  private createFileOutput(): LogOutput {
    return {
      name: 'file',
      write: async (entry: LogEntry) => {
        try {
          const existingLogs = localStorage.getItem('structured_logs') || '[]';
          const logs = JSON.parse(existingLogs);
          logs.push(entry);
          
          // Keep only the most recent logs
          if (logs.length > this.options.maxLogEntries!) {
            logs.splice(0, logs.length - this.options.maxLogEntries!);
          }
          
          localStorage.setItem('structured_logs', JSON.stringify(logs));
        } catch (error) {
          console.error('Failed to write log to localStorage:', error);
        }
      },
      flush: async () => {
        // localStorage is synchronous, so no flush needed
      },
    };
  }

  /**
   * Create remote output
   */
  private createRemoteOutput(): LogOutput {
    return {
      name: 'remote',
      write: async (entry: LogEntry) => {
        this.remoteBuffer.push(entry);
        
        if (this.remoteBuffer.length >= this.options.remoteBatchSize!) {
          await this.flushRemoteLogs();
        }
      },
      flush: async () => {
        await this.flushRemoteLogs();
      },
    };
  }

  /**
   * Flush remote logs
   */
  private async flushRemoteLogs(): Promise<void> {
    if (this.remoteBuffer.length === 0 || !this.options.remoteEndpoint) {
      return;
    }

    const logsToSend = [...this.remoteBuffer];
    this.remoteBuffer = [];

    try {
      // Compress logs if enabled
      let dataToSend = logsToSend;
      if (this.options.enableCompression && this.compressionWorker) {
        dataToSend = await this.compressLogs(logsToSend);
      }

      // Encrypt logs if enabled
      if (this.options.enableEncryption && this.options.encryptionKey) {
        dataToSend = await this.encryptLogs(dataToSend);
      }

      await fetch(this.options.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: dataToSend,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
      // Re-add failed logs to buffer for retry
      this.remoteBuffer.unshift(...logsToSend);
    }
  }

  /**
   * Compress logs using worker
   */
  private async compressLogs(logs: LogEntry[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.compressionWorker) {
        resolve(logs);
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Compression timeout'));
      }, 5000);

      this.compressionWorker!.onmessage = (e) => {
        clearTimeout(timeoutId);
        if (e.data.success) {
          resolve(e.data.data);
        } else {
          reject(new Error(e.data.error));
        }
      };

      this.compressionWorker!.postMessage({
        type: 'compress',
        logs,
      });
    });
  }

  /**
   * Encrypt logs (placeholder implementation)
   */
  private async encryptLogs(logs: any): Promise<any> {
    // This is a placeholder implementation
    // In a real application, you would use a proper encryption library
    return logs;
  }

  /**
   * Check if log should be sampled
   */
  private shouldSample(): boolean {
    if (!this.options.enableSampling) {
      return true;
    }
    
    return Math.random() < this.options.samplingRate!;
  }

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    tags?: string[]
  ): LogEntry {
    return {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      message,
      context,
      tags,
      sessionId: this.sessionId,
      component: context?.component,
      action: context?.action,
      duration: context?.duration,
      error: context?.error ? {
        name: context.error.name,
        message: context.error.message,
        stack: context.error.stack,
      } : undefined,
      metadata: context?.metadata,
    };
  }

  /**
   * Write a log entry
   */
  private async writeLog(entry: LogEntry): Promise<void> {
    // Check if log level is enabled
    if (entry.level < this.options.level!) {
      return;
    }

    // Check sampling
    if (!this.shouldSample()) {
      return;
    }

    // Add to internal storage
    this.logEntries.push(entry);

    // Check if we have too many log entries
    if (this.logEntries.length > this.options.maxLogEntries!) {
      const toRemove = this.logEntries.length - this.options.maxLogEntries!;
      this.logEntries.splice(0, toRemove);
    }

    // Write to all outputs
    const writePromises = this.outputs.map(output => 
      Promise.resolve(output.write(entry)).catch(error => 
        console.error(`Error writing to output ${output.name}:`, error)
      )
    );

    await Promise.allSettled(writePromises);
  }

  /**
   * Log debug message
   */
  async debug(message: string, context?: Record<string, any>, tags?: string[]): Promise<void> {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, tags);
    await this.writeLog(entry);
  }

  /**
   * Log info message
   */
  async info(message: string, context?: Record<string, any>, tags?: string[]): Promise<void> {
    const entry = this.createLogEntry(LogLevel.INFO, message, context, tags);
    await this.writeLog(entry);
  }

  /**
   * Log warning message
   */
  async warn(message: string, context?: Record<string, any>, tags?: string[]): Promise<void> {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, tags);
    await this.writeLog(entry);
  }

  /**
   * Log error message
   */
  async error(message: string, context?: Record<string, any>, tags?: string[]): Promise<void> {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, tags);
    await this.writeLog(entry);
  }

  /**
   * Log fatal message
   */
  async fatal(message: string, context?: Record<string, any>, tags?: string[]): Promise<void> {
    const entry = this.createLogEntry(LogLevel.FATAL, message, context, tags);
    await this.writeLog(entry);
  }

  /**
   * Log performance metric
   */
  async performance(
    operation: string,
    duration: number,
    context?: Record<string, any>
  ): Promise<void> {
    const entry = this.createLogEntry(
      LogLevel.INFO,
      `Performance: ${operation}`,
      {
        ...context,
        component: 'performance',
        action: operation,
        duration,
        metadata: {
          operation,
          duration,
          ...context?.metadata,
        },
      },
      ['performance']
    );
    await this.writeLog(entry);
  }

  /**
   * Log user action
   */
  async userAction(
    action: string,
    userId: string,
    context?: Record<string, any>
  ): Promise<void> {
    const entry = this.createLogEntry(
      LogLevel.INFO,
      `User action: ${action}`,
      {
        ...context,
        userId,
        component: 'user',
        action,
        metadata: {
          action,
          userId,
          ...context?.metadata,
        },
      },
      ['user-action']
    );
    await this.writeLog(entry);
  }

  /**
   * Log security event
   */
  async security(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: Record<string, any>
  ): Promise<void> {
    const level = severity === 'critical' ? LogLevel.FATAL : 
                  severity === 'high' ? LogLevel.ERROR :
                  severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;
    
    const entry = this.createLogEntry(
      level,
      `Security event: ${event}`,
      {
        ...context,
        component: 'security',
        action: event,
        metadata: {
          securityEvent: event,
          severity,
          ...context?.metadata,
        },
      },
      ['security']
    );
    await this.writeLog(entry);
  }

  /**
   * Log business event
   */
  async business(
    event: string,
    data: Record<string, any>,
    context?: Record<string, any>
  ): Promise<void> {
    const entry = this.createLogEntry(
      LogLevel.INFO,
      `Business event: ${event}`,
      {
        ...context,
        component: 'business',
        action: event,
        metadata: {
          businessEvent: event,
          data,
          ...context?.metadata,
        },
      },
      ['business']
    );
    await this.writeLog(entry);
  }

  /**
   * Get log entries
   */
  getLogs(filter?: LogFilter): LogEntry[] {
    let logs = [...this.logEntries];

    // Apply filters
    if (filter?.level !== undefined) {
      logs = logs.filter(log => log.level >= filter.level!);
    }

    if (filter?.component) {
      logs = logs.filter(log => log.component === filter.component);
    }

    if (filter?.userId) {
      logs = logs.filter(log => log.userId === filter.userId);
    }

    if (filter?.sessionId) {
      logs = logs.filter(log => log.sessionId === filter.sessionId);
    }

    if (filter?.startTime) {
      logs = logs.filter(log => log.timestamp >= filter.startTime!);
    }

    if (filter?.endTime) {
      logs = logs.filter(log => log.timestamp <= filter.endTime!);
    }

    if (filter?.tags && filter.tags.length > 0) {
      logs = logs.filter(log => 
        log.tags && filter.tags!.some(tag => log.tags!.includes(tag))
      );
    }

    if (filter?.search) {
      const searchLower = filter.search.toLowerCase();
      logs = logs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        (log.context && JSON.stringify(log.context).toLowerCase().includes(searchLower))
      );
    }

    return logs;
  }

  /**
   * Get log statistics
   */
  getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byComponent: Record<string, number>;
    byTag: Record<string, number>;
    oldest: Date | null;
    newest: Date | null;
  } {
    const stats = {
      total: this.logEntries.length,
      byLevel: {} as Record<string, number>,
      byComponent: {} as Record<string, number>,
      byTag: {} as Record<string, number>,
      oldest: this.logEntries.length > 0 ? this.logEntries[0].timestamp : null,
      newest: this.logEntries.length > 0 ? this.logEntries[this.logEntries.length - 1].timestamp : null,
    };

    this.logEntries.forEach(log => {
      // Count by level
      const levelName = LogLevel[log.level];
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;

      // Count by component
      if (log.component) {
        stats.byComponent[log.component] = (stats.byComponent[log.component] || 0) + 1;
      }

      // Count by tag
      if (log.tags) {
        log.tags.forEach(tag => {
          stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        });
      }
    });

    return stats;
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logEntries = [];
    this.remoteBuffer = [];
    
    // Clear localStorage
    try {
      localStorage.removeItem('structured_logs');
    } catch (error) {
      console.error('Failed to clear logs from localStorage:', error);
    }
  }

  /**
   * Export logs to JSON
   */
  exportLogs(filter?: LogFilter): string {
    const logs = this.getLogs(filter);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Export logs to CSV
   */
  exportLogsToCSV(filter?: LogFilter): string {
    const logs = this.getLogs(filter);
    
    if (logs.length === 0) {
      return '';
    }

    const headers = [
      'id', 'timestamp', 'level', 'message', 'component', 'action', 
      'duration', 'userId', 'sessionId', 'tags'
    ];

    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        log.id,
        log.timestamp.toISOString(),
        LogLevel[log.level],
        `"${log.message.replace(/"/g, '""')}"`,
        log.component || '',
        log.action || '',
        log.duration || '',
        log.userId || '',
        log.sessionId || '',
        `"${(log.tags || []).join(';')}"`,
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  /**
   * Flush all outputs
   */
  async flush(): Promise<void> {
    const flushPromises = this.outputs
      .filter(output => output.flush)
      .map(output => Promise.resolve(output.flush!()).catch(error => 
        console.error(`Error flushing output ${output.name}:`, error)
      ));

    await Promise.allSettled(flushPromises);
  }

  /**
   * Close logger and cleanup resources
   */
  async close(): Promise<void> {
    // Clear intervals
    if (this.remoteFlushIntervalId !== null) {
      clearInterval(this.remoteFlushIntervalId);
      this.remoteFlushIntervalId = null;
    }

    // Flush remaining logs
    await this.flush();

    // Close outputs
    const closePromises = this.outputs
      .filter(output => output.close)
      .map(output => Promise.resolve(output.close!()).catch(error => 
        console.error(`Error closing output ${output.name}:`, error)
      ));

    await Promise.allSettled(closePromises);

    // Terminate compression worker
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }
  }

  /**
   * Update logger options
   */
  updateOptions(newOptions: Partial<LoggerOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Reinitialize outputs if needed
    if (newOptions.enableConsole !== undefined || 
        newOptions.enableFile !== undefined || 
        newOptions.enableRemote !== undefined) {
      this.outputs = [];
      this.initializeOutputs();
    }
    
    // Restart remote flush if interval changed
    if (newOptions.remoteFlushInterval !== undefined && this.remoteFlushIntervalId !== null) {
      clearInterval(this.remoteFlushIntervalId);
      this.initializeRemoteFlush();
    }
  }

  /**
   * Get current options
   */
  getOptions(): LoggerOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const structuredLogger = new StructuredLogger({
  level: LogLevel.INFO,
  enableConsole: true,
  enableFile: true,
  enableRemote: false,
  maxLogEntries: 10000,
  enableCompression: false,
  compressionThreshold: 1000,
  remoteBatchSize: 100,
  remoteFlushInterval: 30000,
  enableEncryption: false,
  enableSampling: false,
  samplingRate: 1.0,
});

// Export a factory function for easier usage
export function createStructuredLogger(options?: LoggerOptions): StructuredLogger {
  return new StructuredLogger(options);
}

// React hook for structured logging
export function useStructuredLogger() {
  return {
    debug: structuredLogger.debug.bind(structuredLogger),
    info: structuredLogger.info.bind(structuredLogger),
    warn: structuredLogger.warn.bind(structuredLogger),
    error: structuredLogger.error.bind(structuredLogger),
    fatal: structuredLogger.fatal.bind(structuredLogger),
    performance: structuredLogger.performance.bind(structuredLogger),
    userAction: structuredLogger.userAction.bind(structuredLogger),
    security: structuredLogger.security.bind(structuredLogger),
    business: structuredLogger.business.bind(structuredLogger),
    getLogs: structuredLogger.getLogs.bind(structuredLogger),
    getLogStats: structuredLogger.getLogStats.bind(structuredLogger),
    clearLogs: structuredLogger.clearLogs.bind(structuredLogger),
    exportLogs: structuredLogger.exportLogs.bind(structuredLogger),
    exportLogsToCSV: structuredLogger.exportLogsToCSV.bind(structuredLogger),
    flush: structuredLogger.flush.bind(structuredLogger),
    close: structuredLogger.close.bind(structuredLogger),
    updateOptions: structuredLogger.updateOptions.bind(structuredLogger),
    getOptions: structuredLogger.getOptions.bind(structuredLogger),
  };
}