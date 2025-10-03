/**
 * Video Processing Optimizer
 * Provides optimized video processing pipeline with frame skipping for face recognition
 * Designed to work efficiently on DS223J hardware constraints
 */

export interface VideoProcessingOptions {
  targetFPS?: number;
  maxProcessingTime?: number; // Maximum processing time per frame in ms
  enableFrameSkipping?: boolean;
  adaptiveFrameSkipping?: boolean;
  qualityThreshold?: number; // Minimum quality for processing a frame
  maxConsecutiveSkips?: number; // Maximum consecutive frames to skip
  enableMotionDetection?: boolean; // Skip frames with no motion
  motionThreshold?: number; // Threshold for detecting motion
  bufferFrames?: boolean; // Buffer frames for smoother processing
  bufferSize?: number; // Number of frames to buffer
}

export interface VideoProcessingResult {
  processedFrame: HTMLCanvasElement;
  frameIndex: number;
  timestamp: number;
  processingTime: number;
  skipped: boolean;
  skipReason?: 'time-constraint' | 'quality-threshold' | 'no-motion' | 'consecutive-skips';
  motionLevel?: number;
  quality?: number;
}

export class VideoProcessor {
  private options: VideoProcessingOptions;
  private processingQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private maxConcurrentOperations = 1; // Limit to 1 for low-power CPU
  private frameBuffer: HTMLVideoElement[] = [];
  private lastProcessedFrame: HTMLCanvasElement | null = null;
  private consecutiveSkips = 0;
  private averageProcessingTime = 0;
  private processingTimeHistory: number[] = [];
  private lastMotionFrame: HTMLCanvasElement | null = null;
  private frameIndex = 0;

  constructor(options: VideoProcessingOptions = {}) {
    this.options = {
      targetFPS: 15,
      maxProcessingTime: 100, // 100ms max processing time
      enableFrameSkipping: true,
      adaptiveFrameSkipping: true,
      qualityThreshold: 0.5,
      maxConsecutiveSkips: 3,
      enableMotionDetection: true,
      motionThreshold: 0.1,
      bufferFrames: true,
      bufferSize: 3,
      ...options,
    };
  }

  /**
   * Process a video frame with optimizations
   */
  async processFrame(
    videoElement: HTMLVideoElement,
    frameIndex?: number
  ): Promise<VideoProcessingResult> {
    const actualFrameIndex = frameIndex !== undefined ? frameIndex : this.frameIndex++;
    const startTime = performance.now();
    
    // Check if we should skip this frame
    const skipReason = this.shouldSkipFrame(videoElement, actualFrameIndex);
    if (skipReason) {
      this.consecutiveSkips++;
      
      // Return the last processed frame if available
      if (this.lastProcessedFrame) {
        return {
          processedFrame: this.lastProcessedFrame,
          frameIndex: actualFrameIndex,
          timestamp: videoElement.currentTime * 1000,
          processingTime: performance.now() - startTime,
          skipped: true,
          skipReason: skipReason as 'time-constraint' | 'quality-threshold' | 'no-motion' | 'consecutive-skips',
        };
      }
      
      // Create a blank canvas if no previous frame
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      
      return {
        processedFrame: canvas,
        frameIndex: actualFrameIndex,
        timestamp: videoElement.currentTime * 1000,
        processingTime: performance.now() - startTime,
        skipped: true,
        skipReason: skipReason as 'time-constraint' | 'quality-threshold' | 'no-motion' | 'consecutive-skips',
      };
    }

    // Reset consecutive skips counter
    this.consecutiveSkips = 0;

    // Queue operation if already processing
    if (this.isProcessing) {
      if (this.options.bufferFrames) {
        // Add to buffer
        this.addToBuffer(videoElement);
        
        // Return the last processed frame
        if (this.lastProcessedFrame) {
          return {
            processedFrame: this.lastProcessedFrame,
            frameIndex: actualFrameIndex,
            timestamp: videoElement.currentTime * 1000,
            processingTime: performance.now() - startTime,
            skipped: true,
            skipReason: 'time-constraint',
          };
        }
      }
      
      return this.queueOperation(() => this.processFrameInternal(videoElement, actualFrameIndex));
    }

    return this.processFrameInternal(videoElement, actualFrameIndex);
  }

  /**
   * Internal frame processing method
   */
  private async processFrameInternal(
    videoElement: HTMLVideoElement,
    frameIndex: number
  ): Promise<VideoProcessingResult> {
    this.isProcessing = true;
    const startTime = performance.now();
    
    try {
      // Convert video frame to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Calculate frame quality
      const quality = this.calculateFrameQuality(canvas);
      
      // Calculate motion level
      let motionLevel = 0;
      if (this.options.enableMotionDetection && this.lastMotionFrame) {
        motionLevel = this.calculateMotionLevel(canvas, this.lastMotionFrame);
      }
      
      // Store frame for motion detection
      if (this.options.enableMotionDetection) {
        this.lastMotionFrame = canvas;
      }

      const processingTime = performance.now() - startTime;
      
      // Update processing time history
      this.updateProcessingTimeHistory(processingTime);

      // Store the processed frame
      this.lastProcessedFrame = canvas;

      return {
        processedFrame: canvas,
        frameIndex,
        timestamp: videoElement.currentTime * 1000,
        processingTime,
        skipped: false,
        motionLevel,
        quality,
      };
    } finally {
      this.isProcessing = false;
      
      // Process next in queue
      if (this.processingQueue.length > 0) {
        this.processQueue();
      }
      
      // Process buffered frames
      if (this.options.bufferFrames && this.frameBuffer.length > 0) {
        this.processNextBufferedFrame();
      }
    }
  }

  /**
   * Determine if a frame should be skipped
   */
  private shouldSkipFrame(
    videoElement: HTMLVideoElement,
    frameIndex: number
  ): string | null {
    // Skip if already processing too many frames
    if (this.isProcessing && this.processingQueue.length > 2) {
      return 'time-constraint';
    }

    // Skip if consecutive skips limit reached
    if (this.consecutiveSkips >= this.options.maxConsecutiveSkips!) {
      return null; // Don't skip this frame
    }

    // Skip if average processing time is too high
    if (this.options.enableFrameSkipping && this.averageProcessingTime > this.options.maxProcessingTime!) {
      return 'time-constraint';
    }

    // Skip if motion detection is enabled and there's no motion
    if (this.options.enableMotionDetection && this.lastMotionFrame) {
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        tempCanvas.width = videoElement.videoWidth || 640;
        tempCanvas.height = videoElement.videoHeight || 480;
        ctx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);
        
        const motionLevel = this.calculateMotionLevel(tempCanvas, this.lastMotionFrame);
        if (motionLevel < this.options.motionThreshold!) {
          return 'no-motion';
        }
      }
    }

    return null;
  }

  /**
   * Calculate frame quality based on various metrics
   */
  private calculateFrameQuality(canvas: HTMLCanvasElement): number {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return 0.5; // Default quality
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Calculate sharpness using Laplacian variance
    let sharpness = 0;
    const width = canvas.width;
    const height = canvas.height;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Convert to grayscale
        const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        
        // Calculate Laplacian
        const topIdx = ((y - 1) * width + x) * 4;
        const bottomIdx = ((y + 1) * width + x) * 4;
        const leftIdx = (y * width + (x - 1)) * 4;
        const rightIdx = (y * width + (x + 1)) * 4;
        
        const topGray = data[topIdx] * 0.299 + data[topIdx + 1] * 0.587 + data[topIdx + 2] * 0.114;
        const bottomGray = data[bottomIdx] * 0.299 + data[bottomIdx + 1] * 0.587 + data[bottomIdx + 2] * 0.114;
        const leftGray = data[leftIdx] * 0.299 + data[leftIdx + 1] * 0.587 + data[leftIdx + 2] * 0.114;
        const rightGray = data[rightIdx] * 0.299 + data[rightIdx + 1] * 0.587 + data[rightIdx + 2] * 0.114;
        
        const laplacian = -4 * gray + topGray + bottomGray + leftGray + rightGray;
        sharpness += laplacian * laplacian;
      }
    }
    
    // Normalize sharpness
    sharpness = Math.sqrt(sharpness / ((width - 2) * (height - 2))) / 255;
    
    // Calculate brightness
    let brightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    brightness = brightness / (data.length / 4) / 255;
    
    // Calculate contrast
    let contrast = 0;
    const meanBrightness = brightness;
    for (let i = 0; i < data.length; i += 4) {
      const pixelBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
      contrast += Math.abs(pixelBrightness - meanBrightness);
    }
    contrast = contrast / (data.length / 4);
    
    // Combine metrics
    const quality = (
      sharpness * 0.4 +
      (1 - Math.abs(brightness - 0.5)) * 0.3 +
      contrast * 0.3
    );
    
    return Math.min(1, Math.max(0, quality));
  }

  /**
   * Calculate motion level between two frames
   */
  private calculateMotionLevel(frame1: HTMLCanvasElement, frame2: HTMLCanvasElement): number {
    const ctx1 = frame1.getContext('2d');
    const ctx2 = frame2.getContext('2d');
    
    if (!ctx1 || !ctx2) {
      return 0;
    }
    
    const imageData1 = ctx1.getImageData(0, 0, frame1.width, frame1.height);
    const imageData2 = ctx2.getImageData(0, 0, frame2.width, frame2.height);
    const data1 = imageData1.data;
    const data2 = imageData2.data;
    
    let diff = 0;
    for (let i = 0; i < data1.length; i += 4) {
      const gray1 = data1[i] * 0.299 + data1[i + 1] * 0.587 + data1[i + 2] * 0.114;
      const gray2 = data2[i] * 0.299 + data2[i + 1] * 0.587 + data2[i + 2] * 0.114;
      diff += Math.abs(gray1 - gray2);
    }
    
    // Normalize motion level
    return diff / (data1.length / 4) / 255;
  }

  /**
   * Update processing time history
   */
  private updateProcessingTimeHistory(processingTime: number): void {
    this.processingTimeHistory.push(processingTime);
    
    // Keep only recent history (last 10 entries)
    if (this.processingTimeHistory.length > 10) {
      this.processingTimeHistory.shift();
    }
    
    // Calculate average processing time
    this.averageProcessingTime = this.processingTimeHistory.reduce(
      (sum, time) => sum + time,
      0
    ) / this.processingTimeHistory.length;
  }

  /**
   * Add frame to buffer
   */
  private addToBuffer(videoElement: HTMLVideoElement): void {
    // Create a clone of the video element
    const clone = document.createElement('video');
    clone.src = videoElement.src;
    clone.currentTime = videoElement.currentTime;
    
    this.frameBuffer.push(clone);
    
    // Limit buffer size
    if (this.frameBuffer.length > this.options.bufferSize!) {
      this.frameBuffer.shift();
    }
  }

  /**
   * Process next buffered frame
   */
  private async processNextBufferedFrame(): Promise<void> {
    if (this.frameBuffer.length === 0 || this.isProcessing) {
      return;
    }
    
    const videoElement = this.frameBuffer.shift()!;
    this.processFrame(videoElement);
  }

  /**
   * Queue an operation to limit concurrent processing
   */
  private async queueOperation<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.processingQueue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the operation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      const operationsToProcess = this.processingQueue.splice(0, this.maxConcurrentOperations);
      
      await Promise.all(operationsToProcess.map(operation => operation()));
      
      // Allow event loop to process other tasks
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Process remaining operations
      if (this.processingQueue.length > 0) {
        this.processQueue();
      } else {
        this.isProcessing = false;
      }
    } catch (error) {
      console.error('Error processing video queue:', error);
      this.isProcessing = false;
    }
  }

  /**
   * Update processing options
   */
  updateOptions(newOptions: Partial<VideoProcessingOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  getOptions(): VideoProcessingOptions {
    return { ...this.options };
  }

  /**
   * Get average processing time
   */
  getAverageProcessingTime(): number {
    return this.averageProcessingTime;
  }

  /**
   * Get processing time history
   */
  getProcessingTimeHistory(): number[] {
    return [...this.processingTimeHistory];
  }

  /**
   * Reset frame buffer and history
   */
  reset(): void {
    this.frameBuffer = [];
    this.lastProcessedFrame = null;
    this.lastMotionFrame = null;
    this.consecutiveSkips = 0;
    this.processingTimeHistory = [];
    this.averageProcessingTime = 0;
    this.frameIndex = 0;
  }
}

// Singleton instance with optimizations enabled by default
export const videoProcessor = new VideoProcessor({
  targetFPS: 15,
  maxProcessingTime: 100,
  enableFrameSkipping: true,
  adaptiveFrameSkipping: true,
  qualityThreshold: 0.5,
  maxConsecutiveSkips: 3,
  enableMotionDetection: true,
  motionThreshold: 0.1,
  bufferFrames: true,
  bufferSize: 3,
});