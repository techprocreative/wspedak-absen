/**
 * Memory Leak Detector
 * Provides memory leak detection utilities optimized for DS223J hardware constraints
 */

export interface MemoryLeakDetectorOptions {
  // Detection options
  enableDetection?: boolean;
  detectionInterval?: number; // ms
  maxSnapshots?: number;
  
  // Threshold options
  memoryGrowthThreshold?: number; // MB
  objectCountThreshold?: number;
  snapshotIntervalThreshold?: number; // ms
  
  // Reporting options
  enableReporting?: boolean;
  reportInterval?: number; // ms
  enableAutoCleanup?: boolean;
  
  // Performance options
  enablePerformanceOptimization?: boolean;
  maxDetectionTime?: number; // ms
}

export interface MemorySnapshot {
  timestamp: number;
  memoryUsage: number; // MB
  objectCount: number;
  domNodes: number;
  eventListeners: number;
  timers: number;
  customMetrics?: Record<string, number>;
}

export interface MemoryLeakReport {
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  memoryGrowth: number; // MB
  objectGrowth: number;
  timeSpan: number; // ms
  suspectedLeaks: string[];
  recommendations: string[];
  snapshots: MemorySnapshot[];
}

export class MemoryLeakDetector {
  private options: MemoryLeakDetectorOptions;
  private isDetecting = false;
  private detectionIntervalId: number | null = null;
  private reportIntervalId: number | null = null;
  private snapshots: MemorySnapshot[] = [];
  private lastReportTime = 0;
  private objectRegistry: Map<string, WeakRef<any>> = new Map();
  private customMetrics: Record<string, number> = {};
  private eventListeners: Map<string, EventListener[]> = new Map();
  private timers: Set<number> = new Set();

  constructor(options: MemoryLeakDetectorOptions = {}) {
    this.options = {
      enableDetection: true,
      detectionInterval: 30000, // 30 seconds
      maxSnapshots: 20,
      memoryGrowthThreshold: 50, // 50MB
      objectCountThreshold: 1000,
      snapshotIntervalThreshold: 60000, // 1 minute
      enableReporting: true,
      reportInterval: 60000, // 1 minute
      enableAutoCleanup: false,
      enablePerformanceOptimization: true,
      maxDetectionTime: 100, // 100ms
      ...options,
    };
  }

  /**
   * Start memory leak detection
   */
  startDetection(): void {
    if (this.isDetecting || !this.options.enableDetection) {
      return;
    }

    this.isDetecting = true;
    
    // Take initial snapshot
    this.takeSnapshot();
    
    // Set up interval detection
    this.detectionIntervalId = window.setInterval(() => {
      this.takeSnapshot();
      this.detectLeaks();
    }, this.options.detectionInterval);
    
    // Set up interval reporting
    if (this.options.enableReporting) {
      this.reportIntervalId = window.setInterval(() => {
        this.generateReport();
      }, this.options.reportInterval);
    }
    
    console.log('Memory leak detection started');
  }

  /**
   * Stop memory leak detection
   */
  stopDetection(): void {
    if (!this.isDetecting) {
      return;
    }

    // Clear intervals
    if (this.detectionIntervalId !== null) {
      clearInterval(this.detectionIntervalId);
      this.detectionIntervalId = null;
    }
    
    if (this.reportIntervalId !== null) {
      clearInterval(this.reportIntervalId);
      this.reportIntervalId = null;
    }
    
    this.isDetecting = false;
    console.log('Memory leak detection stopped');
  }

  /**
   * Take a memory snapshot
   */
  takeSnapshot(): MemorySnapshot {
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      memoryUsage: this.getMemoryUsage(),
      objectCount: this.getObjectCount(),
      domNodes: this.getDOMNodeCount(),
      eventListeners: this.getEventListenerCount(),
      timers: this.getTimerCount(),
      customMetrics: { ...this.customMetrics },
    };
    
    // Add to snapshots
    this.snapshots.push(snapshot);
    
    // Limit snapshots
    if (this.snapshots.length > this.options.maxSnapshots!) {
      this.snapshots.shift();
    }
    
    return snapshot;
  }

  /**
   * Detect memory leaks
   */
  detectLeaks(): MemoryLeakReport | null {
    if (this.snapshots.length < 2) {
      return null;
    }
    
    const startTime = performance.now();
    
    // Get oldest and newest snapshots
    const oldestSnapshot = this.snapshots[0];
    const newestSnapshot = this.snapshots[this.snapshots.length - 1];
    
    // Calculate growth
    const memoryGrowth = newestSnapshot.memoryUsage - oldestSnapshot.memoryUsage;
    const objectGrowth = newestSnapshot.objectCount - oldestSnapshot.objectCount;
    const timeSpan = newestSnapshot.timestamp - oldestSnapshot.timestamp;
    
    // Check if thresholds are exceeded
    const memoryThresholdExceeded = memoryGrowth > this.options.memoryGrowthThreshold!;
    const objectThresholdExceeded = objectGrowth > this.options.objectCountThreshold!;
    const timeThresholdExceeded = timeSpan > this.options.snapshotIntervalThreshold!;
    
    if (!memoryThresholdExceeded && !objectThresholdExceeded) {
      return null;
    }
    
    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (memoryGrowth > this.options.memoryGrowthThreshold! * 3) {
      severity = 'critical';
    } else if (memoryGrowth > this.options.memoryGrowthThreshold! * 2) {
      severity = 'high';
    } else if (memoryGrowth > this.options.memoryGrowthThreshold! * 1.5) {
      severity = 'medium';
    }
    
    // Identify suspected leaks
    const suspectedLeaks: string[] = [];
    
    if (memoryThresholdExceeded) {
      suspectedLeaks.push('Memory usage growth');
    }
    
    if (objectThresholdExceeded) {
      suspectedLeaks.push('Object count growth');
    }
    
    if (newestSnapshot.eventListeners > oldestSnapshot.eventListeners * 1.5) {
      suspectedLeaks.push('Event listener growth');
    }
    
    if (newestSnapshot.timers > oldestSnapshot.timers * 1.5) {
      suspectedLeaks.push('Timer growth');
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (memoryThresholdExceeded) {
      recommendations.push('Consider clearing caches or releasing unused objects');
    }
    
    if (objectThresholdExceeded) {
      recommendations.push('Check for objects that are not being garbage collected');
    }
    
    if (newestSnapshot.eventListeners > oldestSnapshot.eventListeners * 1.5) {
      recommendations.push('Remove event listeners when they are no longer needed');
    }
    
    if (newestSnapshot.timers > oldestSnapshot.timers * 1.5) {
      recommendations.push('Clear intervals and timeouts when they are no longer needed');
    }
    
    const endTime = performance.now();
    
    // Check if detection took too long
    if (this.options.enablePerformanceOptimization && 
        endTime - startTime > this.options.maxDetectionTime!) {
      console.warn('Memory leak detection took too long, consider increasing interval or reducing snapshot count');
    }
    
    const report: MemoryLeakReport = {
      timestamp: Date.now(),
      severity,
      memoryGrowth,
      objectGrowth,
      timeSpan,
      suspectedLeaks,
      recommendations,
      snapshots: [oldestSnapshot, newestSnapshot],
    };
    
    // Auto cleanup if enabled and severity is high or critical
    if (this.options.enableAutoCleanup && 
        (severity === 'high' || severity === 'critical')) {
      this.performAutoCleanup();
    }
    
    // Dispatch custom event for UI to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('memory-leak-detected', {
        detail: report
      }));
    }
    
    return report;
  }

  /**
   * Generate a memory leak report
   */
  generateReport(): MemoryLeakReport | null {
    const report = this.detectLeaks();
    
    if (report) {
      this.lastReportTime = Date.now();
      console.warn('Memory leak detected:', report);
    }
    
    return report;
  }

  /**
   * Perform automatic cleanup
   */
  performAutoCleanup(): void {
    console.log('Performing automatic cleanup for memory leaks');
    
    // Clear object registry
    this.cleanupObjectRegistry();
    
    // Clear custom metrics
    this.customMetrics = {};
    
    // Force garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
    
    // Take a new snapshot after cleanup
    setTimeout(() => {
      this.takeSnapshot();
    }, 1000);
  }

  /**
   * Register an object for tracking
   */
  registerObject(id: string, object: any): void {
    this.objectRegistry.set(id, new WeakRef(object));
  }

  /**
   * Unregister an object
   */
  unregisterObject(id: string): void {
    this.objectRegistry.delete(id);
  }

  /**
   * Register an event listener for tracking
   */
  registerEventListener(target: string, listener: EventListener): void {
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, []);
    }
    
    this.eventListeners.get(target)!.push(listener);
  }

  /**
   * Unregister an event listener
   */
  unregisterEventListener(target: string, listener: EventListener): void {
    const listeners = this.eventListeners.get(target);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Register a timer for tracking
   */
  registerTimer(timerId: number): void {
    this.timers.add(timerId);
  }

  /**
   * Unregister a timer
   */
  unregisterTimer(timerId: number): void {
    this.timers.delete(timerId);
  }

  /**
   * Set a custom metric
   */
  setCustomMetric(name: string, value: number): void {
    this.customMetrics[name] = value;
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    if (typeof window === 'undefined' || !('performance' in window) || !('memory' in window.performance)) {
      return 0;
    }

    const memory = (performance as any).memory;
    return memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
  }

  /**
   * Get object count
   */
  private getObjectCount(): number {
    // This is a simplified implementation
    // In a real implementation, you would use more sophisticated techniques
    return this.objectRegistry.size;
  }

  /**
   * Get DOM node count
   */
  private getDOMNodeCount(): number {
    if (typeof document === 'undefined') {
      return 0;
    }
    
    return document.getElementsByTagName('*').length;
  }

  /**
   * Get event listener count
   */
  private getEventListenerCount(): number {
    let count = 0;
    
    for (const listeners of this.eventListeners.values()) {
      count += listeners.length;
    }
    
    return count;
  }

  /**
   * Get timer count
   */
  private getTimerCount(): number {
    return this.timers.size;
  }

  /**
   * Clean up object registry
   */
  private cleanupObjectRegistry(): void {
    const toDelete: string[] = [];
    
    for (const [id, weakRef] of this.objectRegistry.entries()) {
      if (!weakRef.deref()) {
        toDelete.push(id);
      }
    }
    
    for (const id of toDelete) {
      this.objectRegistry.delete(id);
    }
  }

  /**
   * Get memory snapshots
   */
  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get the last report time
   */
  getLastReportTime(): number {
    return this.lastReportTime;
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<MemoryLeakDetectorOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart detection if interval changed
    if (this.isDetecting && newOptions.detectionInterval) {
      this.stopDetection();
      this.startDetection();
    }
  }

  /**
   * Get current options
   */
  getOptions(): MemoryLeakDetectorOptions {
    return { ...this.options };
  }

  /**
   * Check if detection is active
   */
  isActive(): boolean {
    return this.isDetecting;
  }
}

// Singleton instance with default options
export const memoryLeakDetector = new MemoryLeakDetector({
  enableDetection: true,
  detectionInterval: 30000,
  maxSnapshots: 20,
  memoryGrowthThreshold: 50,
  objectCountThreshold: 1000,
  snapshotIntervalThreshold: 60000,
  enableReporting: true,
  reportInterval: 60000,
  enableAutoCleanup: false,
  enablePerformanceOptimization: true,
  maxDetectionTime: 100,
});

// Export a factory function for easier usage
export function createMemoryLeakDetector(options?: MemoryLeakDetectorOptions): MemoryLeakDetector {
  return new MemoryLeakDetector(options);
}