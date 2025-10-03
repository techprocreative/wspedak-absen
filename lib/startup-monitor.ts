/**
 * Startup Performance Monitor
 * Provides monitoring of application startup performance
 * Optimized for DS223J hardware constraints
 */

export interface StartupMonitorOptions {
  // Monitoring options
  enableMonitoring?: boolean;
  trackingLevel?: 'basic' | 'detailed' | 'comprehensive';
  
  // Performance options
  enablePerformanceOptimization?: boolean;
  maxStartupTime?: number; // ms
  
  // Reporting options
  enableReporting?: boolean;
  reportInterval?: number; // ms
  reportEndpoint?: string;
}

export interface StartupMetric {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

export interface StartupReport {
  sessionId: string;
  startTime: number;
  endTime: number;
  totalDuration: number;
  metrics: StartupMetric[];
  deviceInfo: DeviceInfo;
  performanceScore: number; // 0-100
  issues: PerformanceIssue[];
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  cores: number;
  memory: number; // MB
  connectionType?: string;
  onlineStatus: boolean;
}

export interface PerformanceIssue {
  type: 'slow-startup' | 'memory-usage' | 'network-latency' | 'resource-size';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric?: string;
  threshold?: number;
  actualValue?: number;
}

export class StartupMonitor {
  private options: StartupMonitorOptions;
  private sessionId: string;
  private startTime: number;
  private endTime: number = 0;
  private metrics: StartupMetric[] = [];
  private deviceInfo: DeviceInfo | null = null;
  private reportIntervalId: number | null = null;
  private reportCallbacks: Array<(report: StartupReport) => void> = [];

  constructor(options: StartupMonitorOptions = {}) {
    this.options = {
      enableMonitoring: true,
      trackingLevel: 'detailed',
      enablePerformanceOptimization: true,
      maxStartupTime: 3000, // 3 seconds
      enableReporting: true,
      reportInterval: 60000, // 1 minute
      ...options,
    };
    
    this.sessionId = this.generateSessionId();
    this.startTime = performance.now();
  }

  /**
   * Initialize the startup monitor
   */
  initialize(): void {
    if (!this.options.enableMonitoring) {
      return;
    }

    // Collect device information
    this.collectDeviceInfo();
    
    // Start report interval
    this.startReportInterval();
    
    // Monitor page load
    this.monitorPageLoad();
    
    // Monitor critical resources
    this.monitorCriticalResources();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    console.log('Startup performance monitor initialized');
  }

  /**
   * Cleanup the startup monitor
   */
  cleanup(): void {
    // Stop report interval
    this.stopReportInterval();
    
    // Generate final report
    this.generateReport();
    
    console.log('Startup performance monitor cleaned up');
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Collect device information
   */
  private collectDeviceInfo(): void {
    const navigator = window.navigator;
    
    this.deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cores: navigator.hardwareConcurrency || 4, // Default to 4 cores
      memory: this.estimateMemory(),
      connectionType: this.getConnectionType(),
      onlineStatus: navigator.onLine,
    };
  }

  /**
   * Estimate device memory
   */
  private estimateMemory(): number {
    // Try to get device memory from navigator
    if ('deviceMemory' in navigator) {
      return (navigator as any).deviceMemory * 1024; // Convert GB to MB
    }
    
    // Default to 512MB for DS223J
    return 512;
  }

  /**
   * Get connection type
   */
  private getConnectionType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || 'unknown';
    }
    
    return 'unknown';
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
   * Monitor page load
   */
  private monitorPageLoad(): void {
    // Monitor DOM content loaded
    this.startMetric('dom-content-loaded');
    
    document.addEventListener('DOMContentLoaded', () => {
      this.endMetric('dom-content-loaded');
    });
    
    // Monitor page fully loaded
    this.startMetric('page-fully-loaded');
    
    window.addEventListener('load', () => {
      this.endMetric('page-fully-loaded');
      
      // End monitoring after page is fully loaded
      this.endTime = performance.now();
      
      // Check if startup took too long
      const totalDuration = this.endTime - this.startTime;
      if (this.options.enablePerformanceOptimization && 
          totalDuration > this.options.maxStartupTime!) {
        console.warn(`Startup took too long: ${totalDuration}ms`);
      }
    });
  }

  /**
   * Monitor critical resources
   */
  private monitorCriticalResources(): void {
    if (this.options.trackingLevel === 'basic') {
      return;
    }
    
    // Monitor CSS loading
    this.startMetric('css-loading');
    
    // Monitor JavaScript loading
    this.startMetric('js-loading');
    
    // Monitor image loading
    if (this.options.trackingLevel === 'comprehensive') {
      this.startMetric('image-loading');
    }
    
    // Use PerformanceObserver to monitor resource loading
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            
            if (resource.name.includes('.css')) {
              this.updateMetric('css-loading', resource.responseEnd);
            } else if (resource.name.includes('.js')) {
              this.updateMetric('js-loading', resource.responseEnd);
            } else if (resource.name.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
              this.updateMetric('image-loading', resource.responseEnd);
            }
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    if (this.options.trackingLevel !== 'comprehensive') {
      return;
    }
    
    this.startMetric('memory-usage');
    
    // Monitor memory usage at intervals
    const memoryCheckInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMemory = memory.usedJSHeapSize / 1024 / 1024; // MB
        
        // Update metric with current memory usage
        this.updateMetric('memory-usage', usedMemory, { usedMemory });
        
        // Check if memory usage is too high
        if (this.options.enablePerformanceOptimization && 
            usedMemory > this.deviceInfo!.memory * 0.8) {
          console.warn(`Memory usage is high: ${usedMemory}MB`);
        }
      }
    }, 500);
    
    // Stop monitoring after page is fully loaded
    window.addEventListener('load', () => {
      clearInterval(memoryCheckInterval);
    });
  }

  /**
   * Start tracking a metric
   */
  startMetric(name: string, metadata?: Record<string, any>): void {
    // Check if metric already exists
    const existingMetric = this.metrics.find(m => m.name === name);
    if (existingMetric) {
      return;
    }
    
    const metric: StartupMetric = {
      name,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      metadata,
    };
    
    this.metrics.push(metric);
  }

  /**
   * End tracking a metric
   */
  endMetric(name: string): void {
    const metric = this.metrics.find(m => m.name === name);
    if (!metric || metric.endTime > 0) {
      return;
    }
    
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
  }

  /**
   * Update a metric with a specific end time
   */
  updateMetric(name: string, endTime: number, metadata?: Record<string, any>): void {
    const metric = this.metrics.find(m => m.name === name);
    if (!metric) {
      return;
    }
    
    metric.endTime = Math.max(metric.endTime, endTime);
    metric.duration = metric.endTime - metric.startTime;
    
    if (metadata) {
      metric.metadata = { ...metric.metadata, ...metadata };
    }
  }

  /**
   * Generate a startup report
   */
  generateReport(): StartupReport {
    const now = performance.now();
    const endTime = this.endTime || now;
    const totalDuration = endTime - this.startTime;
    
    // Calculate performance score
    const performanceScore = this.calculatePerformanceScore(totalDuration);
    
    // Identify performance issues
    const issues = this.identifyPerformanceIssues(totalDuration);
    
    const report: StartupReport = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime,
      totalDuration,
      metrics: [...this.metrics],
      deviceInfo: this.deviceInfo!,
      performanceScore,
      issues,
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
   * Calculate performance score
   */
  private calculatePerformanceScore(totalDuration: number): number {
    let score = 100;
    
    // Deduct points for slow startup
    if (totalDuration > this.options.maxStartupTime!) {
      score -= Math.min(30, (totalDuration - this.options.maxStartupTime!) / 100);
    }
    
    // Deduct points for slow metrics
    for (const metric of this.metrics) {
      if (metric.name === 'dom-content-loaded' && metric.duration > 1000) {
        score -= Math.min(20, (metric.duration - 1000) / 50);
      }
      
      if (metric.name === 'page-fully-loaded' && metric.duration > 3000) {
        score -= Math.min(20, (metric.duration - 3000) / 100);
      }
    }
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Identify performance issues
   */
  private identifyPerformanceIssues(totalDuration: number): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    
    // Check for slow startup
    if (totalDuration > this.options.maxStartupTime!) {
      issues.push({
        type: 'slow-startup',
        severity: totalDuration > this.options.maxStartupTime! * 2 ? 'high' : 'medium',
        message: `Startup took ${totalDuration.toFixed(2)}ms, which is longer than the expected ${this.options.maxStartupTime}ms`,
        threshold: this.options.maxStartupTime,
        actualValue: totalDuration,
      });
    }
    
    // Check for slow DOM content loaded
    const domMetric = this.metrics.find(m => m.name === 'dom-content-loaded');
    if (domMetric && domMetric.duration > 1000) {
      issues.push({
        type: 'slow-startup',
        severity: domMetric.duration > 2000 ? 'medium' : 'low',
        message: `DOM content loaded in ${domMetric.duration.toFixed(2)}ms`,
        metric: 'dom-content-loaded',
        threshold: 1000,
        actualValue: domMetric.duration,
      });
    }
    
    // Check for slow page fully loaded
    const pageMetric = this.metrics.find(m => m.name === 'page-fully-loaded');
    if (pageMetric && pageMetric.duration > 3000) {
      issues.push({
        type: 'slow-startup',
        severity: pageMetric.duration > 5000 ? 'high' : 'medium',
        message: `Page fully loaded in ${pageMetric.duration.toFixed(2)}ms`,
        metric: 'page-fully-loaded',
        threshold: 3000,
        actualValue: pageMetric.duration,
      });
    }
    
    // Check for high memory usage
    const memoryMetric = this.metrics.find(m => m.name === 'memory-usage');
    if (memoryMetric && memoryMetric.metadata && memoryMetric.metadata.usedMemory) {
      const usedMemory = memoryMetric.metadata.usedMemory;
      const totalMemory = this.deviceInfo!.memory;
      
      if (usedMemory > totalMemory * 0.8) {
        issues.push({
          type: 'memory-usage',
          severity: usedMemory > totalMemory * 0.9 ? 'critical' : 'high',
          message: `Memory usage is ${usedMemory.toFixed(2)}MB, which is ${((usedMemory / totalMemory) * 100).toFixed(1)}% of total memory`,
          metric: 'memory-usage',
          threshold: totalMemory * 0.8,
          actualValue: usedMemory,
        });
      }
    }
    
    return issues;
  }

  /**
   * Send report to endpoint
   */
  private sendReport(report: StartupReport): void {
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
        console.error('Failed to send startup report:', error);
      });
    }
  }

  /**
   * Register a report callback
   */
  onReport(callback: (report: StartupReport) => void): void {
    this.reportCallbacks.push(callback);
  }

  /**
   * Unregister a report callback
   */
  offReport(callback: (report: StartupReport) => void): void {
    const index = this.reportCallbacks.indexOf(callback);
    if (index !== -1) {
      this.reportCallbacks.splice(index, 1);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): StartupMetric[] {
    return [...this.metrics];
  }

  /**
   * Get device information
   */
  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo ? { ...this.deviceInfo } : null;
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<StartupMonitorOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart report interval if interval changed
    if (this.reportIntervalId !== null && newOptions.reportInterval) {
      this.stopReportInterval();
      this.startReportInterval();
    }
  }

  /**
   * Get current options
   */
  getOptions(): StartupMonitorOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const startupMonitor = new StartupMonitor({
  enableMonitoring: true,
  trackingLevel: 'detailed',
  enablePerformanceOptimization: true,
  maxStartupTime: 3000,
  enableReporting: true,
  reportInterval: 60000,
});

// Export a factory function for easier usage
export function createStartupMonitor(options?: StartupMonitorOptions): StartupMonitor {
  return new StartupMonitor(options);
}

// React hook for startup monitoring
export function useStartupMonitor() {
  return {
    startMetric: startupMonitor.startMetric.bind(startupMonitor),
    endMetric: startupMonitor.endMetric.bind(startupMonitor),
    updateMetric: startupMonitor.updateMetric.bind(startupMonitor),
    getMetrics: startupMonitor.getMetrics.bind(startupMonitor),
    getDeviceInfo: startupMonitor.getDeviceInfo.bind(startupMonitor),
    generateReport: startupMonitor.generateReport.bind(startupMonitor),
    onReport: startupMonitor.onReport.bind(startupMonitor),
    offReport: startupMonitor.offReport.bind(startupMonitor),
  };
}