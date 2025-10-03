/**
 * Quality Thresholds Manager
 * Provides adaptive quality-based processing thresholds for face recognition
 * Designed to work efficiently on DS223J hardware constraints
 */

export interface QualityThresholdsOptions {
  // Face detection thresholds
  minDetectionConfidence?: number;
  maxDetectionConfidence?: number;
  adaptiveDetectionThreshold?: boolean;
  
  // Face recognition thresholds
  minRecognitionConfidence?: number;
  maxRecognitionConfidence?: number;
  adaptiveRecognitionThreshold?: boolean;
  
  // Image quality thresholds
  minImageQuality?: number;
  maxImageQuality?: number;
  adaptiveImageQuality?: boolean;
  
  // Performance thresholds
  maxProcessingTime?: number;
  targetFPS?: number;
  adaptivePerformanceThreshold?: boolean;
  
  // Memory thresholds
  maxMemoryUsage?: number; // MB
  memoryCleanupThreshold?: number; // Percentage
  adaptiveMemoryThreshold?: boolean;
}

export interface QualityMetrics {
  detectionConfidence: number;
  recognitionConfidence: number;
  imageQuality: number;
  processingTime: number;
  memoryUsage: number;
  fps: number;
}

export interface QualityThresholdsResult {
  shouldProcess: boolean;
  adjustedThresholds: QualityThresholdsOptions;
  qualityLevel: 'low' | 'medium' | 'high';
  reason: string;
}

export class QualityThresholdsManager {
  private options: QualityThresholdsOptions;
  private performanceHistory: QualityMetrics[] = [];
  private currentQualityLevel: 'low' | 'medium' | 'high' = 'medium';
  private adjustmentFactor = 0.1; // How much to adjust thresholds
  private maxHistorySize = 20; // Maximum number of metrics to keep

  constructor(options: QualityThresholdsOptions = {}) {
    this.options = {
      // Face detection thresholds
      minDetectionConfidence: 0.5,
      maxDetectionConfidence: 0.9,
      adaptiveDetectionThreshold: true,
      
      // Face recognition thresholds
      minRecognitionConfidence: 0.6,
      maxRecognitionConfidence: 0.95,
      adaptiveRecognitionThreshold: true,
      
      // Image quality thresholds
      minImageQuality: 0.4,
      maxImageQuality: 0.9,
      adaptiveImageQuality: true,
      
      // Performance thresholds
      maxProcessingTime: 150, // ms
      targetFPS: 15,
      adaptivePerformanceThreshold: true,
      
      // Memory thresholds
      maxMemoryUsage: 200, // MB
      memoryCleanupThreshold: 0.8, // 80%
      adaptiveMemoryThreshold: true,
      ...options,
    };
  }

  /**
   * Evaluate quality metrics and determine if processing should continue
   */
  evaluateQuality(metrics: QualityMetrics): QualityThresholdsResult {
    // Add metrics to history
    this.addToHistory(metrics);
    
    // Calculate average metrics
    const avgMetrics = this.calculateAverageMetrics();
    
    // Determine quality level
    this.currentQualityLevel = this.determineQualityLevel(avgMetrics);
    
    // Adjust thresholds based on quality level
    const adjustedThresholds = this.adjustThresholds(this.currentQualityLevel);
    
    // Determine if processing should continue
    const shouldProcess = this.shouldProcessFrame(metrics, adjustedThresholds);
    
    // Determine reason for decision
    const reason = this.getDecisionReason(metrics, adjustedThresholds, shouldProcess);
    
    return {
      shouldProcess,
      adjustedThresholds,
      qualityLevel: this.currentQualityLevel,
      reason,
    };
  }

  /**
   * Add metrics to history
   */
  private addToHistory(metrics: QualityMetrics): void {
    this.performanceHistory.push(metrics);
    
    // Limit history size
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Calculate average metrics from history
   */
  private calculateAverageMetrics(): QualityMetrics {
    if (this.performanceHistory.length === 0) {
      return {
        detectionConfidence: 0.7,
        recognitionConfidence: 0.8,
        imageQuality: 0.7,
        processingTime: 100,
        memoryUsage: 100,
        fps: 15,
      };
    }

    const sum = this.performanceHistory.reduce(
      (acc, metrics) => ({
        detectionConfidence: acc.detectionConfidence + metrics.detectionConfidence,
        recognitionConfidence: acc.recognitionConfidence + metrics.recognitionConfidence,
        imageQuality: acc.imageQuality + metrics.imageQuality,
        processingTime: acc.processingTime + metrics.processingTime,
        memoryUsage: acc.memoryUsage + metrics.memoryUsage,
        fps: acc.fps + metrics.fps,
      }),
      {
        detectionConfidence: 0,
        recognitionConfidence: 0,
        imageQuality: 0,
        processingTime: 0,
        memoryUsage: 0,
        fps: 0,
      }
    );

    const count = this.performanceHistory.length;
    return {
      detectionConfidence: sum.detectionConfidence / count,
      recognitionConfidence: sum.recognitionConfidence / count,
      imageQuality: sum.imageQuality / count,
      processingTime: sum.processingTime / count,
      memoryUsage: sum.memoryUsage / count,
      fps: sum.fps / count,
    };
  }

  /**
   * Determine quality level based on metrics
   */
  private determineQualityLevel(metrics: QualityMetrics): 'low' | 'medium' | 'high' {
    // Calculate a quality score
    const performanceScore = this.calculatePerformanceScore(metrics);
    
    if (performanceScore > 0.8) {
      return 'high';
    } else if (performanceScore > 0.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate a performance score based on metrics
   */
  private calculatePerformanceScore(metrics: QualityMetrics): number {
    // Weight different metrics
    const weights = {
      detectionConfidence: 0.2,
      recognitionConfidence: 0.2,
      imageQuality: 0.2,
      processingTime: 0.2,
      memoryUsage: 0.1,
      fps: 0.1,
    };
    
    // Normalize metrics to 0-1 range
    const normalizedMetrics = {
      detectionConfidence: metrics.detectionConfidence,
      recognitionConfidence: metrics.recognitionConfidence,
      imageQuality: metrics.imageQuality,
      processingTime: Math.max(0, 1 - (metrics.processingTime / this.options.maxProcessingTime!)),
      memoryUsage: Math.max(0, 1 - (metrics.memoryUsage / this.options.maxMemoryUsage!)),
      fps: Math.min(1, metrics.fps / this.options.targetFPS!),
    };
    
    // Calculate weighted score
    let score = 0;
    for (const key in weights) {
      const metricKey = key as keyof typeof weights;
      score += normalizedMetrics[metricKey] * weights[metricKey];
    }
    
    return score;
  }

  /**
   * Adjust thresholds based on quality level
   */
  private adjustThresholds(qualityLevel: 'low' | 'medium' | 'high'): QualityThresholdsOptions {
    const adjustedThresholds = { ...this.options };
    
    switch (qualityLevel) {
      case 'low':
        // Lower thresholds for low quality
        if (adjustedThresholds.adaptiveDetectionThreshold) {
          adjustedThresholds.minDetectionConfidence = Math.max(
            0.3,
            this.options.minDetectionConfidence! - this.adjustmentFactor
          );
        }
        
        if (adjustedThresholds.adaptiveRecognitionThreshold) {
          adjustedThresholds.minRecognitionConfidence = Math.max(
            0.4,
            this.options.minRecognitionConfidence! - this.adjustmentFactor
          );
        }
        
        if (adjustedThresholds.adaptiveImageQuality) {
          adjustedThresholds.minImageQuality = Math.max(
            0.2,
            this.options.minImageQuality! - this.adjustmentFactor
          );
        }
        
        if (adjustedThresholds.adaptivePerformanceThreshold) {
          adjustedThresholds.maxProcessingTime = this.options.maxProcessingTime! + 50;
          adjustedThresholds.targetFPS = Math.max(
            5,
            this.options.targetFPS! - 5
          );
        }
        
        if (adjustedThresholds.adaptiveMemoryThreshold) {
          adjustedThresholds.maxMemoryUsage = this.options.maxMemoryUsage! + 50;
          adjustedThresholds.memoryCleanupThreshold = Math.max(
            0.6,
            this.options.memoryCleanupThreshold! - 0.1
          );
        }
        break;
        
      case 'high':
        // Raise thresholds for high quality
        if (adjustedThresholds.adaptiveDetectionThreshold) {
          adjustedThresholds.minDetectionConfidence = Math.min(
            0.8,
            this.options.minDetectionConfidence! + this.adjustmentFactor
          );
        }
        
        if (adjustedThresholds.adaptiveRecognitionThreshold) {
          adjustedThresholds.minRecognitionConfidence = Math.min(
            0.9,
            this.options.minRecognitionConfidence! + this.adjustmentFactor
          );
        }
        
        if (adjustedThresholds.adaptiveImageQuality) {
          adjustedThresholds.minImageQuality = Math.min(
            0.8,
            this.options.minImageQuality! + this.adjustmentFactor
          );
        }
        
        if (adjustedThresholds.adaptivePerformanceThreshold) {
          adjustedThresholds.maxProcessingTime = Math.max(
            50,
            this.options.maxProcessingTime! - 50
          );
          adjustedThresholds.targetFPS = Math.min(
            30,
            this.options.targetFPS! + 5
          );
        }
        
        if (adjustedThresholds.adaptiveMemoryThreshold) {
          adjustedThresholds.maxMemoryUsage = Math.max(
            100,
            this.options.maxMemoryUsage! - 50
          );
          adjustedThresholds.memoryCleanupThreshold = Math.min(
            0.9,
            this.options.memoryCleanupThreshold! + 0.1
          );
        }
        break;
        
      case 'medium':
      default:
        // Use default thresholds for medium quality
        break;
    }
    
    return adjustedThresholds;
  }

  /**
   * Determine if a frame should be processed based on metrics and thresholds
   */
  private shouldProcessFrame(
    metrics: QualityMetrics,
    thresholds: QualityThresholdsOptions
  ): boolean {
    // Check detection confidence
    if (metrics.detectionConfidence < thresholds.minDetectionConfidence!) {
      return false;
    }
    
    // Check recognition confidence
    if (metrics.recognitionConfidence < thresholds.minRecognitionConfidence!) {
      return false;
    }
    
    // Check image quality
    if (metrics.imageQuality < thresholds.minImageQuality!) {
      return false;
    }
    
    // Check processing time
    if (metrics.processingTime > thresholds.maxProcessingTime!) {
      return false;
    }
    
    // Check memory usage
    if (metrics.memoryUsage > thresholds.maxMemoryUsage!) {
      return false;
    }
    
    // Check FPS
    if (metrics.fps < thresholds.targetFPS! * 0.5) { // Allow 50% of target FPS
      return false;
    }
    
    return true;
  }

  /**
   * Get the reason for the processing decision
   */
  private getDecisionReason(
    metrics: QualityMetrics,
    thresholds: QualityThresholdsOptions,
    shouldProcess: boolean
  ): string {
    if (shouldProcess) {
      return 'All quality thresholds met';
    }
    
    // Find the first threshold that wasn't met
    if (metrics.detectionConfidence < thresholds.minDetectionConfidence!) {
      return `Detection confidence too low (${metrics.detectionConfidence.toFixed(2)} < ${thresholds.minDetectionConfidence!.toFixed(2)})`;
    }
    
    if (metrics.recognitionConfidence < thresholds.minRecognitionConfidence!) {
      return `Recognition confidence too low (${metrics.recognitionConfidence.toFixed(2)} < ${thresholds.minRecognitionConfidence!.toFixed(2)})`;
    }
    
    if (metrics.imageQuality < thresholds.minImageQuality!) {
      return `Image quality too low (${metrics.imageQuality.toFixed(2)} < ${thresholds.minImageQuality!.toFixed(2)})`;
    }
    
    if (metrics.processingTime > thresholds.maxProcessingTime!) {
      return `Processing time too high (${metrics.processingTime.toFixed(2)}ms > ${thresholds.maxProcessingTime!.toFixed(2)}ms)`;
    }
    
    if (metrics.memoryUsage > thresholds.maxMemoryUsage!) {
      return `Memory usage too high (${metrics.memoryUsage.toFixed(2)}MB > ${thresholds.maxMemoryUsage!.toFixed(2)}MB)`;
    }
    
    if (metrics.fps < thresholds.targetFPS! * 0.5) {
      return `FPS too low (${metrics.fps.toFixed(2)} < ${(thresholds.targetFPS! * 0.5).toFixed(2)})`;
    }
    
    return 'Unknown reason';
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<QualityThresholdsOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  getOptions(): QualityThresholdsOptions {
    return { ...this.options };
  }

  /**
   * Get current quality level
   */
  getCurrentQualityLevel(): 'low' | 'medium' | 'high' {
    return this.currentQualityLevel;
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): QualityMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * Reset performance history
   */
  resetHistory(): void {
    this.performanceHistory = [];
    this.currentQualityLevel = 'medium';
  }
}

// Singleton instance with default thresholds
export const qualityThresholdsManager = new QualityThresholdsManager({
  // Face detection thresholds
  minDetectionConfidence: 0.5,
  maxDetectionConfidence: 0.9,
  adaptiveDetectionThreshold: true,
  
  // Face recognition thresholds
  minRecognitionConfidence: 0.6,
  maxRecognitionConfidence: 0.95,
  adaptiveRecognitionThreshold: true,
  
  // Image quality thresholds
  minImageQuality: 0.4,
  maxImageQuality: 0.9,
  adaptiveImageQuality: true,
  
  // Performance thresholds
  maxProcessingTime: 150, // ms
  targetFPS: 15,
  adaptivePerformanceThreshold: true,
  
  // Memory thresholds
  maxMemoryUsage: 200, // MB
  memoryCleanupThreshold: 0.8, // 80%
  adaptiveMemoryThreshold: true,
});