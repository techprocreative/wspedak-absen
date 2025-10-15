import { logger, logApiError, logApiRequest } from '@/lib/logger'

/**
 * Image Processing Optimizer
 * Provides optimized image processing pipeline for face recognition
 * Designed to work efficiently on DS223J hardware constraints
 */

export interface ImageProcessingOptions {
  targetWidth?: number;
  targetHeight?: number;
  maintainAspectRatio?: boolean;
  quality?: number;
  enableCropping?: boolean;
  enableGrayscale?: boolean;
  enableHistogramEqualization?: boolean;
  enableNoiseReduction?: boolean;
  enableEdgeEnhancement?: boolean;
  adaptiveQuality?: boolean;
  maxProcessingTime?: number; // Maximum processing time in ms
}

export interface ImageProcessingResult {
  processedImage: HTMLCanvasElement;
  originalSize: { width: number; height: number };
  processedSize: { width: number; height: number };
  processingTime: number;
  quality: number;
  skipped: boolean;
}

export class ImageProcessor {
  private options: ImageProcessingOptions;
  private processingQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private maxConcurrentOperations = 1; // Limit to 1 for low-power CPU

  constructor(options: ImageProcessingOptions = {}) {
    this.options = {
      targetWidth: 224,
      targetHeight: 224,
      maintainAspectRatio: true,
      quality: 0.8,
      enableCropping: false,
      enableGrayscale: false,
      enableHistogramEqualization: false,
      enableNoiseReduction: false,
      enableEdgeEnhancement: false,
      adaptiveQuality: true,
      maxProcessingTime: 100, // 100ms max processing time
      ...options,
    };
  }

  /**
   * Process an image with optimizations
   */
  async processImage(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<ImageProcessingResult> {
    const startTime = performance.now();
    
    // Check if we should skip processing based on time constraints
    if (this.options.maxProcessingTime && this.isProcessing) {
      return {
        processedImage: this.convertToCanvas(input),
        originalSize: this.getImageSize(input),
        processedSize: this.getImageSize(input),
        processingTime: 0,
        quality: 1.0,
        skipped: true,
      };
    }

    // Queue operation if already processing
    if (this.isProcessing) {
      return this.queueOperation(() => this.processImageInternal(input));
    }

    return this.processImageInternal(input);
  }

  /**
   * Internal image processing method
   */
  private async processImageInternal(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<ImageProcessingResult> {
    this.isProcessing = true;
    const startTime = performance.now();
    
    try {
      // Convert to canvas
      const canvas = this.convertToCanvas(input);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      const originalSize = { width: canvas.width, height: canvas.height };
      
      // Determine processing quality based on constraints
      let quality = this.options.quality!;
      if (this.options.adaptiveQuality) {
        quality = this.calculateAdaptiveQuality(originalSize);
      }

      // Resize image
      const processedSize = this.resizeCanvas(canvas, quality);
      
      // Apply optimizations
      if (this.options.enableGrayscale) {
        this.applyGrayscale(ctx, processedSize);
      }
      
      if (this.options.enableHistogramEqualization) {
        this.applyHistogramEqualization(ctx, processedSize);
      }
      
      if (this.options.enableNoiseReduction) {
        this.applyNoiseReduction(ctx, processedSize);
      }
      
      if (this.options.enableEdgeEnhancement) {
        this.applyEdgeEnhancement(ctx, processedSize);
      }

      const processingTime = performance.now() - startTime;

      return {
        processedImage: canvas,
        originalSize,
        processedSize,
        processingTime,
        quality,
        skipped: false,
      };
    } finally {
      this.isProcessing = false;
      
      // Process next in queue
      if (this.processingQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * Convert input to canvas
   */
  private convertToCanvas(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    if (input instanceof HTMLCanvasElement) {
      canvas.width = input.width;
      canvas.height = input.height;
      ctx.drawImage(input, 0, 0);
    } else if (input instanceof HTMLImageElement) {
      canvas.width = input.naturalWidth || input.width;
      canvas.height = input.naturalHeight || input.height;
      ctx.drawImage(input, 0, 0);
    } else if (input instanceof HTMLVideoElement) {
      canvas.width = input.videoWidth;
      canvas.height = input.videoHeight;
      ctx.drawImage(input, 0, 0);
    }

    return canvas;
  }

  /**
   * Get image size
   */
  private getImageSize(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): { width: number; height: number } {
    if (input instanceof HTMLCanvasElement) {
      return { width: input.width, height: input.height };
    } else if (input instanceof HTMLImageElement) {
      return { width: input.naturalWidth || input.width, height: input.naturalHeight || input.height };
    } else if (input instanceof HTMLVideoElement) {
      return { width: input.videoWidth, height: input.videoHeight };
    }
    return { width: 0, height: 0 };
  }

  /**
   * Calculate adaptive quality based on image size and processing constraints
   */
  private calculateAdaptiveQuality(size: { width: number; height: number }): number {
    const pixelCount = size.width * size.height;
    
    // Base quality on pixel count
    let quality = this.options.quality!;
    
    // Reduce quality for large images
    if (pixelCount > 1920 * 1080) {
      quality = Math.max(0.5, quality - 0.2);
    } else if (pixelCount > 1280 * 720) {
      quality = Math.max(0.6, quality - 0.1);
    }
    
    // Further reduce quality if memory is constrained
    if (this.isMemoryConstrained()) {
      quality = Math.max(0.5, quality - 0.1);
    }
    
    return quality;
  }

  /**
   * Resize canvas to target dimensions
   */
  private resizeCanvas(
    canvas: HTMLCanvasElement,
    quality: number
  ): { width: number; height: number } {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    
    // Calculate target dimensions based on quality
    const scaleFactor = Math.sqrt(quality);
    let targetWidth = Math.round(this.options.targetWidth! * scaleFactor);
    let targetHeight = Math.round(this.options.targetHeight! * scaleFactor);
    
    // Maintain aspect ratio if enabled
    if (this.options.maintainAspectRatio) {
      const aspectRatio = originalWidth / originalHeight;
      
      if (targetWidth / targetHeight > aspectRatio) {
        targetWidth = Math.round(targetHeight * aspectRatio);
      } else {
        targetHeight = Math.round(targetWidth / aspectRatio);
      }
    }
    
    // Create a temporary canvas for high-quality resize
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) {
      throw new Error('Failed to get temporary canvas context');
    }
    
    // Use high-quality image smoothing
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    
    // Draw resized image
    tempCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
    
    // Update original canvas
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.drawImage(tempCanvas, 0, 0);
    
    return { width: targetWidth, height: targetHeight };
  }

  /**
   * Apply grayscale filter
   */
  private applyGrayscale(
    ctx: CanvasRenderingContext2D,
    size: { width: number; height: number }
  ): void {
    const imageData = ctx.getImageData(0, 0, size.width, size.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = gray;     // Red
      data[i + 1] = gray; // Green
      data[i + 2] = gray; // Blue
      // Alpha channel (data[i + 3]) remains unchanged
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply histogram equalization
   */
  private applyHistogramEqualization(
    ctx: CanvasRenderingContext2D,
    size: { width: number; height: number }
  ): void {
    const imageData = ctx.getImageData(0, 0, size.width, size.height);
    const data = imageData.data;
    
    // Calculate histogram for each channel
    const histogram = {
      r: new Array(256).fill(0),
      g: new Array(256).fill(0),
      b: new Array(256).fill(0)
    };
    
    // Build histogram
    for (let i = 0; i < data.length; i += 4) {
      histogram.r[data[i]]++;
      histogram.g[data[i + 1]]++;
      histogram.b[data[i + 2]]++;
    }
    
    // Calculate cumulative distribution
    const cdf = {
      r: new Array(256).fill(0),
      g: new Array(256).fill(0),
      b: new Array(256).fill(0)
    };
    
    cdf.r[0] = histogram.r[0];
    cdf.g[0] = histogram.g[0];
    cdf.b[0] = histogram.b[0];
    
    for (let i = 1; i < 256; i++) {
      cdf.r[i] = cdf.r[i - 1] + histogram.r[i];
      cdf.g[i] = cdf.g[i - 1] + histogram.g[i];
      cdf.b[i] = cdf.b[i - 1] + histogram.b[i];
    }
    
    // Normalize CDF
    const pixelCount = data.length / 4;
    for (let i = 0; i < 256; i++) {
      cdf.r[i] = Math.round((cdf.r[i] / pixelCount) * 255);
      cdf.g[i] = Math.round((cdf.g[i] / pixelCount) * 255);
      cdf.b[i] = Math.round((cdf.b[i] / pixelCount) * 255);
    }
    
    // Apply equalization
    for (let i = 0; i < data.length; i += 4) {
      data[i] = cdf.r[data[i]];         // Red
      data[i + 1] = cdf.g[data[i + 1]]; // Green
      data[i + 2] = cdf.b[data[i + 2]]; // Blue
      // Alpha channel (data[i + 3]) remains unchanged
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply noise reduction using a simple box blur
   */
  private applyNoiseReduction(
    ctx: CanvasRenderingContext2D,
    size: { width: number; height: number }
  ): void {
    const imageData = ctx.getImageData(0, 0, size.width, size.height);
    const data = imageData.data;
    const width = size.width;
    const height = size.height;
    
    // Create a copy for the blur operation
    const outputData = new Uint8ClampedArray(data);
    
    // Simple 3x3 box blur
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const idx = ((y + dy) * width + (x + dx)) * 4 + c;
              sum += data[idx];
            }
          }
          outputData[(y * width + x) * 4 + c] = sum / 9;
        }
        // Alpha channel remains unchanged
      }
    }
    
    // Put the blurred image back
    const outputImageData = new ImageData(outputData, width, height);
    ctx.putImageData(outputImageData, 0, 0);
  }

  /**
   * Apply edge enhancement using a simple sharpening filter
   */
  private applyEdgeEnhancement(
    ctx: CanvasRenderingContext2D,
    size: { width: number; height: number }
  ): void {
    const imageData = ctx.getImageData(0, 0, size.width, size.height);
    const data = imageData.data;
    const width = size.width;
    const height = size.height;
    
    // Create a copy for the enhancement operation
    const outputData = new Uint8ClampedArray(data);
    
    // Simple sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    
    // Apply convolution
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              const kernelIdx = (ky + 1) * 3 + (kx + 1);
              sum += data[idx] * kernel[kernelIdx];
            }
          }
          outputData[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
        }
        // Alpha channel remains unchanged
      }
    }
    
    // Put the enhanced image back
    const outputImageData = new ImageData(outputData, width, height);
    ctx.putImageData(outputImageData, 0, 0);
  }

  /**
   * Check if memory is constrained
   */
  private isMemoryConstrained(): boolean {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize / 1024 / 1024; // MB
      const totalMemory = memory.totalJSHeapSize / 1024 / 1024; // MB
      
      // Consider memory constrained if using more than 70% of available memory
      return usedMemory / totalMemory > 0.7;
    }
    return false;
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
      logger.error('Error processing image queue', error as Error);
      this.isProcessing = false;
    }
  }

  /**
   * Update processing options
   */
  updateOptions(newOptions: Partial<ImageProcessingOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  getOptions(): ImageProcessingOptions {
    return { ...this.options };
  }
}

// Singleton instance with optimizations enabled by default
export const imageProcessor = new ImageProcessor({
  targetWidth: 224,
  targetHeight: 224,
  maintainAspectRatio: true,
  quality: 0.8,
  enableGrayscale: false,
  enableHistogramEqualization: false,
  enableNoiseReduction: false,
  enableEdgeEnhancement: false,
  adaptiveQuality: true,
  maxProcessingTime: 100,
});