/**
 * Log Aggregator (Stub)
 * Stub implementation for backward compatibility
 */

export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  context?: any;
}

export class LogAggregator {
  private logs: LogEntry[] = [];

  add(entry: LogEntry) {
    this.logs.push(entry);
  }

  getLogs(filters?: any): LogEntry[] {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }
}

export const logAggregator = new LogAggregator();

export default logAggregator;
