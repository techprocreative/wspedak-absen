/**
 * Batch Size Optimizer
 * Provides dynamic batch size optimization based on system resources and performance
 * Optimized for DS223J hardware constraints (512MB RAM, quad-core 1.4GHz CPU)
 */

export interface BatchOptimizerOptions {
  // Optimization options
  enableOptimization?: boolean;
  optimizationInterval?: number; // ms
  
  // Hardware constraints
  maxMemoryUsage?: number; // MB
  maxCpuUsage?: number; // percentage
  targetProcessingTime?: number; // ms
  
  // Batch size options
  minBatchSize?: number;
  maxBatchSize?: number;
  initialBatchSize?: number;
  
  // Performance options
  enablePerformanceMonitoring?: boolean;
  performanceHistorySize?: number;
}

export interface PerformanceMetrics {
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  processingTime: number; // ms
  batchSize: number;
  timestamp: number;
}

export interface BatchSizeConfig {
  batchSize: number;
  reason: string;
  metrics: PerformanceMetrics;
  timestamp: number;
}

export class BatchSizeOptimizer {
  private options: BatchOptimizerOptions;
  private isOptimizing = false;
  private optimizationIntervalId: number | null = null;
  private currentBatchSize: number;
  private performanceHistory: PerformanceMetrics[] = [];
  private batchSizeHistory: BatchSizeConfig[] = [];
  private batchSizeChangeCallbacks: Array<(config: BatchSizeConfig) => void> = [];

  constructor(options: BatchOptimizerOptions = {}) {
    this.options = {
      enableOptimization: true,
      optimizationInterval: 30000, // 30 seconds
      maxMemoryUsage: 400, // 400MB (leave 112MB for system)
      maxCpuUsage: 80, // 80% CPU usage
      targetProcessingTime: 500, // 500ms
      minBatchSize: 5,
      maxBatchSize: 50,
      initialBatchSize: 20,
      enablePerformanceMonitoring: true,
      performanceHistorySize: 20,
      ...options,
    };
    
    this.currentBatchSize = this.options.initialBatchSize!;
  }

  /**
   * Initialize the batch size optimizer
   */
  initialize(): void {
    if (!this.options.enableOptimization) {
      return;
    }

    // Start periodic optimization
    this.startOptimization();
    
    console.log('Batch size optimizer initialized');
  }

  /**
   * Cleanup the batch size optimizer
   */
  cleanup(): void {
    // Stop optimization
    this.stopOptimization();
    
    console.log('Batch size optimizer cleaned up');
  }

  /**
   * Start periodic optimization
   */
  startOptimization(): void {
    if (this.optimizationIntervalId !== null) {
      return;
    }
    
    this.optimizationIntervalId = window.setInterval(() => {
      this.optimizeBatchSize();
    }, this.options.optimizationInterval);
  }

  /**
   * Stop periodic optimization
   */
  stopOptimization(): void {
    if (this.optimizationIntervalId !== null) {
      clearInterval(this.optimizationIntervalId);
      this.optimizationIntervalId = null;
    }
  }

  /**
   * Optimize batch size based on performance metrics
   */
  optimizeBatchSize(): BatchSizeConfig | null {
    if (!this.options.enablePerformanceMonitoring || this.isOptimizing) {
      return null;
    }
    
    this.isOptimizing = true;
    
    try {
      // Get current performance metrics
      const metrics = this.getPerformanceMetrics();
      
      // Add to history
      this.performanceHistory.push(metrics);
      
      // Limit history size
      if (this.performanceHistory.length > this.options.performanceHistorySize!) {
        this.performanceHistory.shift();
      }
      
      // Determine if we need to adjust batch size
      let newBatchSize = this.currentBatchSize;
      let reason = 'No change';
      
      // If memory usage is too high, reduce batch size
      if (metrics.memoryUsage > this.options.maxMemoryUsage!) {
        newBatchSize = Math.max(
          Math.floor(this.currentBatchSize * 0.8),
          this.options.minBatchSize!
        );
        reason = `Memory usage too high: ${metrics.memoryUsage}MB`;
      }
      // If CPU usage is too high, reduce batch size
      else if (metrics.cpuUsage > this.options.maxCpuUsage!) {
        newBatchSize = Math.max(
          Math.floor(this.currentBatchSize * 0.9),
          this.options.minBatchSize!
        );
        reason = `CPU usage too high: ${metrics.cpuUsage}%`;
      }
      // If processing time is too long, reduce batch size
      else if (metrics.processingTime > this.options.targetProcessingTime!) {
        newBatchSize = Math.max(
          Math.floor(this.currentBatchSize * 0.8),
          this.options.minBatchSize!
        );
        reason = `Processing time too long: ${metrics.processingTime}ms`;
      }
      // If we have enough history and performance is good, increase batch size
      else if (this.performanceHistory.length >= 5) {
        const recentMetrics = this.performanceHistory.slice(-5);
        const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length;
        const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length;
        const avgProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / recentMetrics.length;
        
        // If all metrics are within limits, increase batch size
        if (avgMemoryUsage < this.options.maxMemoryUsage! * 0.7 &&
            avgCpuUsage < this.options.maxCpuUsage! * 0.7 &&
            avgProcessingTime < this.options.targetProcessingTime! * 0.7) {
          newBatchSize = Math.min(
            Math.floor(this.currentBatchSize * 1.2),
            this.options.maxBatchSize!
          );
          reason = 'Performance is good, increasing batch size';
        }
      }
      
      // Update current batch size if changed
      if (newBatchSize !== this.currentBatchSize) {
        this.currentBatchSize = newBatchSize;
        
        // Create config
        const config: BatchSizeConfig = {
          batchSize: newBatchSize,
          reason,
          metrics,
          timestamp: Date.now(),
        };
        
        // Add to history
        this.batchSizeHistory.push(config);
        
        // Limit history size
        if (this.batchSizeHistory.length > 20) {
          this.batchSizeHistory.shift();
        }
        
        // Notify callbacks
        this.batchSizeChangeCallbacks.forEach(callback => callback(config));
        
        console.log(`Batch size optimized to ${newBatchSize}: ${reason}`);
        
        return config;
      }
      
      return null;
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    // Get memory usage
    let memoryUsage = 0;
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      memoryUsage = (window.performance as any).memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }
    
    // Get CPU usage (simplified implementation)
    let cpuUsage = 0;
    if (this.performanceHistory.length > 0) {
      // Estimate CPU usage based on processing time
      const lastMetrics = this.performanceHistory[this.performanceHistory.length - 1];
      const processingTimeRatio = lastMetrics.processingTime / this.options.targetProcessingTime!;
      cpuUsage = Math.min(processingTimeRatio * 100, 100);
    }
    
    // Get processing time (simplified implementation)
    let processingTime = 100; // Default to 100ms
    
    return {
      memoryUsage,
      cpuUsage,
      processingTime,
      batchSize: this.currentBatchSize,
      timestamp: Date.now(),
    };
  }

  /**
   * Report batch processing performance
   */
  reportBatchPerformance(processingTime: number): void {
    if (!this.options.enablePerformanceMonitoring) {
      return;
    }
    
    // Get current metrics
    const metrics = this.getPerformanceMetrics();
    metrics.processingTime = processingTime;
    
    // Add to history
    this.performanceHistory.push(metrics);
    
    // Limit history size
    if (this.performanceHistory.length > this.options.performanceHistorySize!) {
      this.performanceHistory.shift();
    }
    
    // Optimize batch size if needed
    this.optimizeBatchSize();
  }

  /**
   * Force optimization of batch size
   */
  forceOptimization(): BatchSizeConfig | null {
    // Update performance metrics
    this.getPerformanceMetrics();
    
    // Optimize batch size
    return this.optimizeBatchSize();
  }

  /**
   * Get current batch size
   */
  getCurrentBatchSize(): number {
    return this.currentBatchSize;
  }

  /**
   * Set batch size
   */
  setBatchSize(batchSize: number, reason: string = 'Manual adjustment'): void {
    // Clamp to min/max
    batchSize = Math.max(this.options.minBatchSize!, Math.min(batchSize, this.options.maxBatchSize!));
    
    // Update current batch size
    this.currentBatchSize = batchSize;
    
    // Create config
    const config: BatchSizeConfig = {
      batchSize,
      reason,
      metrics: this.getPerformanceMetrics(),
      timestamp: Date.now(),
    };
    
    // Add to history
    this.batchSizeHistory.push(config);
    
    // Limit history size
    if (this.batchSizeHistory.length > 20) {
      this.batchSizeHistory.shift();
    }
    
    // Notify callbacks
    this.batchSizeChangeCallbacks.forEach(callback => callback(config));
    
    console.log(`Batch size set to ${batchSize}: ${reason}`);
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * Get batch size history
   */
  getBatchSizeHistory(): BatchSizeConfig[] {
    return [...this.batchSizeHistory];
  }

  /**
   * Register a batch size change callback
   */
  onBatchSizeChange(callback: (config: BatchSizeConfig) => void): void {
    this.batchSizeChangeCallbacks.push(callback);
  }

  /**
   * Unregister a batch size change callback
   */
  offBatchSizeChange(callback: (config: BatchSizeConfig) => void): void {
    const index = this.batchSizeChangeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.batchSizeChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Check if currently optimizing
   */
  isCurrentlyOptimizing(): boolean {
    return this.isOptimizing;
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<BatchOptimizerOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart optimization if interval changed
    if (this.optimizationIntervalId !== null && newOptions.optimizationInterval) {
      this.stopOptimization();
      this.startOptimization();
    }
  }

  /**
   * Get current options
   */
  getOptions(): BatchOptimizerOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options optimized for DS223J
export const batchSizeOptimizer = new BatchSizeOptimizer({
  enableOptimization: true,
  optimizationInterval: 30000,
  maxMemoryUsage: 400, // 400MB (leave 112MB for system)
  maxCpuUsage: 80, // 80% CPU usage
  targetProcessingTime: 500, // 500ms
  minBatchSize: 5,
  maxBatchSize: 50,
  initialBatchSize: 20,
  enablePerformanceMonitoring: true,
  performanceHistorySize: 20,
});

// Export a factory function for easier usage
export function createBatchSizeOptimizer(options?: BatchOptimizerOptions): BatchSizeOptimizer {
  return new BatchSizeOptimizer(options);
}