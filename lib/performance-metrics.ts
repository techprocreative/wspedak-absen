/**
 * Performance Metrics Collector
 * Provides performance metrics collection for the application
 * Optimized for DS223J hardware constraints
 */

export interface PerformanceMetricsOptions {
  // Collection options
  enableCollection?: boolean;
  collectionInterval?: number; // ms
  maxMetrics?: number; // Maximum number of metrics to keep
  
  // Performance options
  enablePerformanceOptimization?: boolean;
  enableMemoryMonitoring?: boolean;
  enableCPUMonitoring?: boolean;
  enableNetworkMonitoring?: boolean;
  
  // Reporting options
  enableReporting?: boolean;
  reportInterval?: number; // ms
  reportEndpoint?: string;
}

export interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface PerformanceReport {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // ms
  metrics: Metric[];
  summary: PerformanceSummary;
}

export interface PerformanceSummary {
  averageCPUUsage: number; // %
  averageMemoryUsage: number; // MB
  peakMemoryUsage: number; // MB
  totalNetworkRequests: number;
  averageResponseTime: number; // ms
  errorCount: number;
  warningCount: number;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

export class PerformanceMetricsCollector {
  private options: PerformanceMetricsOptions;
  private sessionId: string;
  private startTime: Date;
  private endTime: Date | null = null;
  private metrics: Metric[] = [];
  private collectionIntervalId: number | null = null;
  private reportIntervalId: number | null = null;
  private metricIdCounter = 0;
  private reportCallbacks: Array<(report: PerformanceReport) => void> = [];
  private thresholds: PerformanceThreshold[] = [];

  constructor(options: PerformanceMetricsOptions = {}) {
    this.options = {
      enableCollection: true,
      collectionInterval: 5000, // 5 seconds
      maxMetrics: 1000,
      enablePerformanceOptimization: true,
      enableMemoryMonitoring: true,
      enableCPUMonitoring: false, // Disabled by default for performance
      enableNetworkMonitoring: true,
      enableReporting: true,
      reportInterval: 60000, // 1 minute
      ...options,
    };
    
    this.sessionId = this.generateSessionId();
    this.startTime = new Date();
    
    // Initialize default thresholds
    this.initializeThresholds();
  }

  /**
   * Initialize the performance metrics collector
   */
  initialize(): void {
    if (!this.options.enableCollection) {
      return;
    }

    // Start collection interval
    this.startCollectionInterval();
    
    // Start report interval
    this.startReportInterval();
    
    console.log('Performance metrics collector initialized');
  }

  /**
   * Cleanup the performance metrics collector
   */
  cleanup(): void {
    // Stop collection interval
    this.stopCollectionInterval();
    
    // Stop report interval
    this.stopReportInterval();
    
    // Generate final report
    this.generateReport();
    
    console.log('Performance metrics collector cleaned up');
  }

  /**
   * Initialize default performance thresholds
   */
  private initializeThresholds(): void {
    this.thresholds = [
      {
        metric: 'memoryUsage',
        warning: 300, // 300 MB
        critical: 400, // 400 MB
        unit: 'MB',
      },
      {
        metric: 'responseTime',
        warning: 1000, // 1 second
        critical: 3000, // 3 seconds
        unit: 'ms',
      },
      {
        metric: 'errorRate',
        warning: 0.05, // 5%
        critical: 0.1, // 10%
        unit: '%',
      },
    ];
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate a metric ID
   */
  private generateMetricId(): string {
    return `metric_${++this.metricIdCounter}_${Date.now()}`;
  }

  /**
   * Start collection interval
   */
  private startCollectionInterval(): void {
    this.collectionIntervalId = window.setInterval(() => {
      this.collectMetrics();
    }, this.options.collectionInterval);
  }

  /**
   * Stop collection interval
   */
  private stopCollectionInterval(): void {
    if (this.collectionIntervalId !== null) {
      clearInterval(this.collectionIntervalId);
      this.collectionIntervalId = null;
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
   * Collect performance metrics
   */
  private collectMetrics(): void {
    // Collect memory usage
    if (this.options.enableMemoryMonitoring) {
      this.collectMemoryMetrics();
    }
    
    // Collect CPU usage
    if (this.options.enableCPUMonitoring) {
      this.collectCPUMetrics();
    }
    
    // Collect network metrics
    if (this.options.enableNetworkMonitoring) {
      this.collectNetworkMetrics();
    }
    
    // Check if we have too many metrics
    if (this.metrics.length > this.options.maxMetrics!) {
      // Remove oldest metrics
      const toRemove = this.metrics.length - this.options.maxMetrics!;
      this.metrics.splice(0, toRemove);
    }
  }

  /**
   * Collect memory metrics
   */
  private collectMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize / 1024 / 1024; // MB
      
      this.addMetric({
        name: 'memoryUsage',
        value: usedMemory,
        unit: 'MB',
        tags: {
          type: 'used',
        },
      });
      
      const totalMemory = memory.totalJSHeapSize / 1024 / 1024; // MB
      this.addMetric({
        name: 'memoryUsage',
        value: totalMemory,
        unit: 'MB',
        tags: {
          type: 'total',
        },
      });
      
      const limitMemory = memory.jsHeapSizeLimit / 1024 / 1024; // MB
      this.addMetric({
        name: 'memoryUsage',
        value: limitMemory,
        unit: 'MB',
        tags: {
          type: 'limit',
        },
      });
    }
  }

  /**
   * Collect CPU metrics
   */
  private collectCPUMetrics(): void {
    // This is a placeholder implementation
    // In a real application, you would use a more sophisticated method to measure CPU usage
    
    // For now, just add a placeholder metric
    this.addMetric({
      name: 'cpuUsage',
      value: Math.random() * 100, // Random value between 0 and 100
      unit: '%',
    });
  }

  /**
   * Collect network metrics
   */
  private collectNetworkMetrics(): void {
    // This is a placeholder implementation
    // In a real application, you would use the Navigation Timing API to collect network metrics
    
    if ('navigation' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        // Add response time metric
        this.addMetric({
          name: 'responseTime',
          value: navigation.responseEnd - navigation.requestStart,
          unit: 'ms',
          tags: {
            type: 'navigation',
          },
        });
        
        // Add dom load time metric
        this.addMetric({
          name: 'domLoadTime',
          value: navigation.loadEventEnd - navigation.domContentLoadedEventStart,
          unit: 'ms',
        });
      }
    }
  }

  /**
   * Add a metric
   */
  addMetric(metric: Omit<Metric, 'id' | 'timestamp'>): void {
    const fullMetric: Metric = {
      id: this.generateMetricId(),
      timestamp: new Date(),
      ...metric,
    };
    
    this.metrics.push(fullMetric);
    
    // Check thresholds
    this.checkThresholds(fullMetric);
  }

  /**
   * Check if a metric exceeds any thresholds
   */
  private checkThresholds(metric: Metric): void {
    for (const threshold of this.thresholds) {
      if (threshold.metric === metric.name) {
        if (metric.value >= threshold.critical) {
          console.error(`Critical performance alert: ${metric.name} is ${metric.value}${metric.unit} (threshold: ${threshold.critical}${threshold.unit})`);
        } else if (metric.value >= threshold.warning) {
          console.warn(`Performance warning: ${metric.name} is ${metric.value}${metric.unit} (threshold: ${threshold.warning}${threshold.unit})`);
        }
      }
    }
  }

  /**
   * Get metrics
   */
  getMetrics(filter?: {
    name?: string;
    startTime?: Date;
    endTime?: Date;
    tags?: Record<string, string>;
  }): Metric[] {
    let metrics = [...this.metrics];
    
    // Apply filters
    if (filter?.name) {
      metrics = metrics.filter(metric => metric.name === filter.name);
    }
    
    if (filter?.startTime) {
      metrics = metrics.filter(metric => metric.timestamp >= filter.startTime!);
    }
    
    if (filter?.endTime) {
      metrics = metrics.filter(metric => metric.timestamp <= filter.endTime!);
    }
    
    if (filter?.tags) {
      metrics = metrics.filter(metric => {
        if (!metric.tags) return false;
        
        for (const [key, value] of Object.entries(filter.tags!)) {
          if (metric.tags![key] !== value) {
            return false;
          }
        }
        
        return true;
      });
    }
    
    return metrics;
  }

  /**
   * Get metric summary
   */
  getMetricSummary(metricName: string): {
    count: number;
    min: number;
    max: number;
    average: number;
    sum: number;
  } | null {
    const metrics = this.getMetrics({ name: metricName });
    
    if (metrics.length === 0) {
      return null;
    }
    
    const values = metrics.map(metric => metric.value);
    const sum = values.reduce((acc, value) => acc + value, 0);
    
    return {
      count: metrics.length,
      min: Math.min(...values),
      max: Math.max(...values),
      average: sum / metrics.length,
      sum,
    };
  }

  /**
   * Generate a performance report
   */
  generateReport(): PerformanceReport {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();
    
    // Calculate summary
    const summary = this.calculateSummary();
    
    const report: PerformanceReport = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime,
      duration,
      metrics: [...this.metrics],
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
   * Calculate performance summary
   */
  private calculateSummary(): PerformanceSummary {
    // Calculate average memory usage
    const memoryMetrics = this.getMetrics({ name: 'memoryUsage', tags: { type: 'used' } });
    const averageMemoryUsage = memoryMetrics.length > 0
      ? memoryMetrics.reduce((sum, metric) => sum + metric.value, 0) / memoryMetrics.length
      : 0;
    
    // Calculate peak memory usage
    const peakMemoryUsage = memoryMetrics.length > 0
      ? Math.max(...memoryMetrics.map(metric => metric.value))
      : 0;
    
    // Calculate average response time
    const responseTimeMetrics = this.getMetrics({ name: 'responseTime' });
    const averageResponseTime = responseTimeMetrics.length > 0
      ? responseTimeMetrics.reduce((sum, metric) => sum + metric.value, 0) / responseTimeMetrics.length
      : 0;
    
    // Count errors and warnings
    const errorCount = this.metrics.filter(metric =>
      metric.name === 'error' || metric.tags?.level === 'error'
    ).length;
    
    const warningCount = this.metrics.filter(metric =>
      metric.name === 'warning' || metric.tags?.level === 'warning'
    ).length;
    
    // Count network requests
    const networkRequestCount = this.metrics.filter(metric =>
      metric.name === 'networkRequest'
    ).length;
    
    return {
      averageCPUUsage: 0, // Placeholder
      averageMemoryUsage,
      peakMemoryUsage,
      totalNetworkRequests: networkRequestCount,
      averageResponseTime,
      errorCount,
      warningCount,
    };
  }

  /**
   * Send report to endpoint
   */
  private sendReport(report: PerformanceReport): void {
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
        console.error('Failed to send performance report:', error);
      });
    }
  }

  /**
   * Register a report callback
   */
  onReport(callback: (report: PerformanceReport) => void): void {
    this.reportCallbacks.push(callback);
  }

  /**
   * Unregister a report callback
   */
  offReport(callback: (report: PerformanceReport) => void): void {
    const index = this.reportCallbacks.indexOf(callback);
    if (index !== -1) {
      this.reportCallbacks.splice(index, 1);
    }
  }

  /**
   * Add a custom threshold
   */
  addThreshold(threshold: PerformanceThreshold): void {
    this.thresholds.push(threshold);
  }

  /**
   * Remove a threshold
   */
  removeThreshold(metric: string): void {
    this.thresholds = this.thresholds.filter(threshold => threshold.metric !== metric);
  }

  /**
   * Get thresholds
   */
  getThresholds(): PerformanceThreshold[] {
    return [...this.thresholds];
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<PerformanceMetricsOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart intervals if they changed
    if (this.collectionIntervalId !== null && newOptions.collectionInterval) {
      this.stopCollectionInterval();
      this.startCollectionInterval();
    }
    
    if (this.reportIntervalId !== null && newOptions.reportInterval) {
      this.stopReportInterval();
      this.startReportInterval();
    }
  }

  /**
   * Get current options
   */
  getOptions(): PerformanceMetricsOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const performanceMetricsCollector = new PerformanceMetricsCollector({
  enableCollection: true,
  collectionInterval: 5000,
  maxMetrics: 1000,
  enablePerformanceOptimization: true,
  enableMemoryMonitoring: true,
  enableCPUMonitoring: false,
  enableNetworkMonitoring: true,
  enableReporting: true,
  reportInterval: 60000,
});

// Export a factory function for easier usage
export function createPerformanceMetricsCollector(options?: PerformanceMetricsOptions): PerformanceMetricsCollector {
  return new PerformanceMetricsCollector(options);
}

// React hook for performance metrics collection
export function usePerformanceMetrics() {
  return {
    addMetric: performanceMetricsCollector.addMetric.bind(performanceMetricsCollector),
    getMetrics: performanceMetricsCollector.getMetrics.bind(performanceMetricsCollector),
    getMetricSummary: performanceMetricsCollector.getMetricSummary.bind(performanceMetricsCollector),
    generateReport: performanceMetricsCollector.generateReport.bind(performanceMetricsCollector),
    onReport: performanceMetricsCollector.onReport.bind(performanceMetricsCollector),
    offReport: performanceMetricsCollector.offReport.bind(performanceMetricsCollector),
    addThreshold: performanceMetricsCollector.addThreshold.bind(performanceMetricsCollector),
    removeThreshold: performanceMetricsCollector.removeThreshold.bind(performanceMetricsCollector),
    getThresholds: performanceMetricsCollector.getThresholds.bind(performanceMetricsCollector),
  };
}