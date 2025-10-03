/**
 * Memory Usage Monitor
 * Provides memory usage monitoring for the application
 * Optimized for DS223J hardware constraints
 */

export interface MemoryMonitorOptions {
  // Monitoring options
  enableMonitoring?: boolean;
  monitoringInterval?: number; // ms
  maxHistorySize?: number; // Maximum number of data points to keep
  historySize?: number; // Deprecated, use maxHistorySize
  
  // Performance options
  enablePerformanceOptimization?: boolean;
  enableGarbageCollection?: boolean;
  gcInterval?: number; // ms
  memoryThreshold?: number; // MB
  enableAutoCleanup?: boolean; // Enable automatic cleanup when memory is critical
  cleanupThreshold?: number; // Memory usage percentage to trigger cleanup
  aggressiveCleanupThreshold?: number; // Memory usage percentage to trigger aggressive cleanup
  enableAlerts?: boolean; // Enable alerts for memory issues
  alertThreshold?: number; // Memory usage percentage to trigger alerts
  performanceThreshold?: number; // Memory usage percentage to trigger performance optimizations
  
  // Reporting options
  enableReporting?: boolean;
  reportInterval?: number; // ms
  reportEndpoint?: string;
}

// Cleanup strategy interface
export interface CleanupStrategy {
  name: string;
  priority: number;
  execute: () => Promise<void>;
}

export interface MemoryUsage {
  timestamp: Date;
  used: number; // MB
  total: number; // MB
  limit: number; // MB
  percentage: number; // %
}

export interface MemoryReport {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // ms
  usageHistory: MemoryUsage[];
  summary: MemorySummary;
}

export interface MemorySummary {
  averageUsage: number; // MB
  peakUsage: number; // MB
  minUsage: number; // MB
  averagePercentage: number; // %
  peakPercentage: number; // %
  gcCount: number;
  memoryLeaks: number;
}

export interface MemoryLeak {
  timestamp: Date;
  usage: number; // MB
  percentage: number; // %
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class MemoryMonitor {
  private options: MemoryMonitorOptions;
  private sessionId: string;
  private startTime: Date;
  private endTime: Date | null = null;
  private usageHistory: MemoryUsage[] = [];
  private monitoringIntervalId: number | null = null;
  private gcIntervalId: number | null = null;
  private reportIntervalId: number | null = null;
  private gcCount = 0;
  private memoryLeaks: MemoryLeak[] = [];
  private reportCallbacks: Array<(report: MemoryReport) => void> = [];
  private cleanupStrategies: CleanupStrategy[] = [];
  private isMonitoring = false;

  constructor(options: MemoryMonitorOptions = {}) {
    this.options = {
      enableMonitoring: true,
      monitoringInterval: 5000, // 5 seconds
      maxHistorySize: 1000,
      enablePerformanceOptimization: true,
      enableGarbageCollection: true,
      gcInterval: 30000, // 30 seconds
      memoryThreshold: 400, // 400 MB
      enableReporting: true,
      reportInterval: 60000, // 1 minute
      ...options,
    };
    
    this.sessionId = this.generateSessionId();
    this.startTime = new Date();
  }

  /**
   * Initialize the memory monitor
   */
  initialize(): void {
    if (!this.options.enableMonitoring) {
      return;
    }

    // Start monitoring interval
    this.startMonitoringInterval();
    
    // Start garbage collection interval if enabled
    if (this.options.enableGarbageCollection) {
      this.startGCInterval();
    }
    
    // Start report interval
    this.startReportInterval();
    
    this.isMonitoring = true;
    console.log('Memory monitor initialized');
  }

  /**
   * Cleanup the memory monitor
   */
  cleanup(): void {
    // Stop monitoring interval
    this.stopMonitoringInterval();
    
    // Stop garbage collection interval
    this.stopGCInterval();
    
    // Stop report interval
    this.stopReportInterval();
    
    // Generate final report
    this.generateReport();
    
    this.isMonitoring = false;
    console.log('Memory monitor cleaned up');
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Start monitoring interval
   */
  private startMonitoringInterval(): void {
    this.monitoringIntervalId = window.setInterval(() => {
      this.collectMemoryUsage();
    }, this.options.monitoringInterval);
  }

  /**
   * Stop monitoring interval
   */
  private stopMonitoringInterval(): void {
    if (this.monitoringIntervalId !== null) {
      clearInterval(this.monitoringIntervalId);
      this.monitoringIntervalId = null;
    }
  }

  /**
   * Start garbage collection interval
   */
  private startGCInterval(): void {
    this.gcIntervalId = window.setInterval(() => {
      this.performGarbageCollection();
    }, this.options.gcInterval);
  }

  /**
   * Stop garbage collection interval
   */
  private stopGCInterval(): void {
    if (this.gcIntervalId !== null) {
      clearInterval(this.gcIntervalId);
      this.gcIntervalId = null;
    }
  }

  /**
   * Start report interval
   */
  private startReportInterval(): void {
    if (!this.options.enableReporting) {
      return;
    }
    
    this.reportIntervalId = window.setInterval(() => {
      this.generateReport();
    }, this.options.reportInterval);
  }

  /**
   * Stop report interval
   */
  private stopReportInterval(): void {
    if (this.reportIntervalId !== null) {
      clearInterval(this.reportIntervalId);
      this.reportIntervalId = null;
    }
  }

  /**
   * Collect memory usage
   */
  private collectMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize / 1024 / 1024; // MB
      const total = memory.totalJSHeapSize / 1024 / 1024; // MB
      const limit = memory.jsHeapSizeLimit / 1024 / 1024; // MB
      const percentage = (used / limit) * 100;
      
      const usage: MemoryUsage = {
        timestamp: new Date(),
        used,
        total,
        limit,
        percentage,
      };
      
      this.usageHistory.push(usage);
      
      // Check if we have too much history
      if (this.usageHistory.length > this.options.maxHistorySize!) {
        // Remove oldest data points
        const toRemove = this.usageHistory.length - this.options.maxHistorySize!;
        this.usageHistory.splice(0, toRemove);
      }
      
      // Check for memory leaks
      this.checkForMemoryLeaks(usage);
      
      // Check if memory usage exceeds threshold
      if (this.options.enablePerformanceOptimization && used > this.options.memoryThreshold!) {
        console.warn(`Memory usage is high: ${used.toFixed(2)}MB (threshold: ${this.options.memoryThreshold}MB)`);
        
        // Perform garbage collection if enabled
        if (this.options.enableGarbageCollection) {
          this.performGarbageCollection();
        }
      }
    }
  }

  /**
   * Check for memory leaks
   */
  private checkForMemoryLeaks(usage: MemoryUsage): void {
    // We need at least 5 data points to detect a trend
    if (this.usageHistory.length < 5) {
      return;
    }
    
    // Get the last 5 data points
    const recentData = this.usageHistory.slice(-5);
    
    // Check if memory usage is consistently increasing
    let isIncreasing = true;
    for (let i = 1; i < recentData.length; i++) {
      if (recentData[i].used <= recentData[i - 1].used) {
        isIncreasing = false;
        break;
      }
    }
    
    if (isIncreasing) {
      // Calculate the rate of increase
      const firstUsage = recentData[0].used;
      const lastUsage = recentData[recentData.length - 1].used;
      const increaseRate = (lastUsage - firstUsage) / firstUsage;
      
      // Determine severity based on increase rate and current usage
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      
      if (increaseRate > 0.5 || usage.percentage > 80) {
        severity = 'critical';
      } else if (increaseRate > 0.3 || usage.percentage > 70) {
        severity = 'high';
      } else if (increaseRate > 0.1 || usage.percentage > 60) {
        severity = 'medium';
      }
      
      const memoryLeak: MemoryLeak = {
        timestamp: usage.timestamp,
        usage: usage.used,
        percentage: usage.percentage,
        severity,
      };
      
      this.memoryLeaks.push(memoryLeak);
      
      console.error(`Potential memory leak detected: ${usage.used.toFixed(2)}MB (${usage.percentage.toFixed(2)}%) - Severity: ${severity}`);
    }
  }

  /**
   * Perform garbage collection
   */
  private performGarbageCollection(): void {
    if ('gc' in window) {
      try {
        (window as any).gc();
        this.gcCount++;
        console.log('Manual garbage collection performed');
      } catch (error) {
        console.error('Error performing garbage collection:', error);
      }
    } else {
      // Fallback: try to trigger garbage collection by creating and cleaning up objects
      try {
        // Create a large array and then delete it
        const largeArray = new Array(1000000).fill(0);
        // Force garbage collection by setting to null
        (largeArray as any) = null;
        this.gcCount++;
        console.log('Garbage collection hint performed');
      } catch (error) {
        console.error('Error performing garbage collection hint:', error);
      }
    }
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemoryUsage | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize / 1024 / 1024; // MB
      const total = memory.totalJSHeapSize / 1024 / 1024; // MB
      const limit = memory.jsHeapSizeLimit / 1024 / 1024; // MB
      const percentage = (used / limit) * 100;
      
      return {
        timestamp: new Date(),
        used,
        total,
        limit,
        percentage,
      };
    }
    
    return null;
  }

  /**
   * Get memory usage history
   */
  getMemoryUsageHistory(filter?: {
    startTime?: Date;
    endTime?: Date;
  }): MemoryUsage[] {
    let history = [...this.usageHistory];
    
    // Apply filters
    if (filter?.startTime) {
      history = history.filter(usage => usage.timestamp >= filter.startTime!);
    }
    
    if (filter?.endTime) {
      history = history.filter(usage => usage.timestamp <= filter.endTime!);
    }
    
    return history;
  }

  /**
   * Get memory leaks
   */
  getMemoryLeaks(filter?: {
    startTime?: Date;
    endTime?: Date;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): MemoryLeak[] {
    let leaks = [...this.memoryLeaks];
    
    // Apply filters
    if (filter?.startTime) {
      leaks = leaks.filter(leak => leak.timestamp >= filter.startTime!);
    }
    
    if (filter?.endTime) {
      leaks = leaks.filter(leak => leak.timestamp <= filter.endTime!);
    }
    
    if (filter?.severity) {
      leaks = leaks.filter(leak => leak.severity === filter.severity);
    }
    
    return leaks;
  }

  /**
   * Generate a memory report
   */
  generateReport(): MemoryReport {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();
    
    // Calculate summary
    const summary = this.calculateSummary();
    
    const report: MemoryReport = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime,
      duration,
      usageHistory: [...this.usageHistory],
      summary,
    };
    
    // Notify callbacks
    this.reportCallbacks.forEach(callback => callback(report));
    
    // Send report to endpoint if enabled
    if (this.options.enableReporting && this.options.reportEndpoint) {
      this.sendReport(report);
    }
    
    return report;
  }

  /**
   * Calculate memory summary
   */
  private calculateSummary(): MemorySummary {
    if (this.usageHistory.length === 0) {
      return {
        averageUsage: 0,
        peakUsage: 0,
        minUsage: 0,
        averagePercentage: 0,
        peakPercentage: 0,
        gcCount: this.gcCount,
        memoryLeaks: this.memoryLeaks.length,
      };
    }
    
    const usages = this.usageHistory.map(usage => usage.used);
    const percentages = this.usageHistory.map(usage => usage.percentage);
    
    const averageUsage = usages.reduce((sum, usage) => sum + usage, 0) / usages.length;
    const peakUsage = Math.max(...usages);
    const minUsage = Math.min(...usages);
    const averagePercentage = percentages.reduce((sum, percentage) => sum + percentage, 0) / percentages.length;
    const peakPercentage = Math.max(...percentages);
    
    return {
      averageUsage,
      peakUsage,
      minUsage,
      averagePercentage,
      peakPercentage,
      gcCount: this.gcCount,
      memoryLeaks: this.memoryLeaks.length,
    };
  }

  /**
   * Send report to endpoint
   */
  private sendReport(report: MemoryReport): void {
    if (!this.options.reportEndpoint) {
      return;
    }
    
    // Use sendBeacon if available for reliable delivery
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(
        this.options.reportEndpoint,
        JSON.stringify(report)
      );
    } else {
      // Fallback to fetch
      fetch(this.options.reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      }).catch(error => {
        console.error('Failed to send memory report:', error);
      });
    }
  }

  /**
   * Register a report callback
   */
  onReport(callback: (report: MemoryReport) => void): void {
    this.reportCallbacks.push(callback);
  }

  /**
   * Unregister a report callback
   */
  offReport(callback: (report: MemoryReport) => void): void {
    const index = this.reportCallbacks.indexOf(callback);
    if (index !== -1) {
      this.reportCallbacks.splice(index, 1);
    }
  }

  /**
   * Force garbage collection
   */
  forceGarbageCollection(): void {
    this.performGarbageCollection();
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<MemoryMonitorOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart intervals if they changed
    if (this.monitoringIntervalId !== null && newOptions.monitoringInterval) {
      this.stopMonitoringInterval();
      this.startMonitoringInterval();
    }
    
    if (this.gcIntervalId !== null && newOptions.gcInterval) {
      this.stopGCInterval();
      this.startGCInterval();
    }
    
    if (this.reportIntervalId !== null && newOptions.reportInterval) {
      this.stopReportInterval();
      this.startReportInterval();
    }
  }

  /**
   * Get current options
   */
  getOptions(): MemoryMonitorOptions {
    return { ...this.options };
  }

  /**
   * Start monitoring
   */
  startMonitoring(): void {
    if (!this.isMonitoring) {
      this.initialize();
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.isMonitoring) {
      this.cleanup();
    }
  }

  /**
   * Check if memory usage is critical
   */
  isMemoryCritical(): boolean {
    const currentUsage = this.getCurrentMemoryUsage();
    if (!currentUsage) return false;
    
    const threshold = this.options.cleanupThreshold || 80;
    return currentUsage.percentage > threshold;
  }

  /**
   * Perform cleanup
   */
  async performCleanup(): Promise<void> {
    // Execute cleanup strategies
    for (const strategy of this.cleanupStrategies) {
      try {
        await strategy.execute();
      } catch (error) {
        console.error(`Error executing cleanup strategy ${strategy.name}:`, error);
      }
    }
    
    // Force garbage collection
    this.forceGarbageCollection();
  }

  /**
   * Register a cleanup strategy
   */
  registerCleanupStrategy(strategy: CleanupStrategy): void {
    this.cleanupStrategies.push(strategy);
  }
}

// Singleton instance with default options
export const memoryMonitor = new MemoryMonitor({
  enableMonitoring: true,
  monitoringInterval: 5000,
  maxHistorySize: 1000,
  enablePerformanceOptimization: true,
  enableGarbageCollection: true,
  gcInterval: 30000,
  memoryThreshold: 400,
  enableReporting: true,
  reportInterval: 60000,
});

// Export a factory function for easier usage
export function createMemoryMonitor(options?: MemoryMonitorOptions): MemoryMonitor {
  return new MemoryMonitor(options);
}

// React hook for memory monitoring
export function useMemoryMonitor() {
  return {
    getCurrentMemoryUsage: memoryMonitor.getCurrentMemoryUsage.bind(memoryMonitor),
    getMemoryUsageHistory: memoryMonitor.getMemoryUsageHistory.bind(memoryMonitor),
    getMemoryLeaks: memoryMonitor.getMemoryLeaks.bind(memoryMonitor),
    generateReport: memoryMonitor.generateReport.bind(memoryMonitor),
    onReport: memoryMonitor.onReport.bind(memoryMonitor),
    offReport: memoryMonitor.offReport.bind(memoryMonitor),
    forceGarbageCollection: memoryMonitor.forceGarbageCollection.bind(memoryMonitor),
    startMonitoring: memoryMonitor.startMonitoring.bind(memoryMonitor),
    stopMonitoring: memoryMonitor.stopMonitoring.bind(memoryMonitor),
    isMemoryCritical: memoryMonitor.isMemoryCritical.bind(memoryMonitor),
  };
}