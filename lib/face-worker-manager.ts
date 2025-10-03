/**
 * Face Recognition Worker Manager
 * Manages communication with the face recognition web worker
 * Provides a high-level API for face recognition operations
 * Optimized for DS223J hardware constraints
 */

import { FaceDetection, FaceEmbedding, FaceMatch } from './face-recognition';
import { videoProcessor, VideoProcessingOptions } from './video-processor';

// Worker message types
export enum WorkerMessageType {
  INIT = 'INIT',
  DETECT_FACES = 'DETECT_FACES',
  RECOGNIZE_FACE = 'RECOGNIZE_FACE',
  GENERATE_EMBEDDING = 'GENERATE_EMBEDDING',
  MATCH_FACES = 'MATCH_FACES',
  UPDATE_CONFIG = 'UPDATE_CONFIG',
  GET_PERFORMANCE_METRICS = 'GET_PERFORMANCE_METRICS',
  CLEANUP = 'CLEANUP',
}

// Worker configuration interface
export interface WorkerConfig {
  maxDetectionSize?: number;
  detectionThreshold?: number;
  recognitionThreshold?: number;
  maxFacesToDetect?: number;
  enableMemoryOptimization?: boolean;
  processingInterval?: number;
  adaptiveQuality?: boolean;
  // Video processing options
  videoProcessingOptions?: VideoProcessingOptions;
  enableFrameSkipping?: boolean;
}

// Performance metrics interface
export interface WorkerPerformanceMetrics {
  totalProcessed: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  memoryUsage: number;
  lastCleanupTime: number;
  frameSkipCount: number;
  maxFrameSkip: number;
  isInitialized: boolean;
}

// Worker response interface
interface WorkerResponse<T> {
  id: string;
  type: 'RESPONSE';
  success: boolean;
  data?: T;
  error?: string;
}

// Promise resolver interface
interface PromiseResolver<T> {
  resolve: (value: T) => void;
  reject: (reason: any) => void;
}

class FaceWorkerManager {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingMessages = new Map<string, PromiseResolver<any>>();
  private isInitialized = false;
  private config: WorkerConfig = {
    maxDetectionSize: 640,
    detectionThreshold: 0.7,
    recognitionThreshold: 0.8,
    maxFacesToDetect: 5,
    enableMemoryOptimization: true,
    processingInterval: 100,
    adaptiveQuality: true,
    enableFrameSkipping: true,
    videoProcessingOptions: {
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
    },
  };
  private performanceMetrics: WorkerPerformanceMetrics | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the worker
   */
  async initialize(config?: WorkerConfig): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.isInitialized && this.worker) {
      return;
    }

    // Create initialization promise
    this.initPromise = this.initializeWorker(config);

    try {
      await this.initPromise;
      this.isInitialized = true;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Internal method to initialize the worker
   */
  private async initializeWorker(config?: WorkerConfig): Promise<void> {
    try {
      // Update config
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Create worker
      this.worker = new Worker('/face-recognition-worker.js');

      // Set up message handler
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      // Initialize worker
      await this.sendMessage(WorkerMessageType.INIT, { config: this.config });
    } catch (error) {
      console.error('Failed to initialize face recognition worker:', error);
      throw error;
    }
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(event: MessageEvent<WorkerResponse<any>>): void {
    const { id, success, data, error } = event.data;
    const resolver = this.pendingMessages.get(id);

    if (resolver) {
      this.pendingMessages.delete(id);

      if (success) {
        resolver.resolve(data);
      } else {
        resolver.reject(new Error(error));
      }
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(event: ErrorEvent): void {
    console.error('Face recognition worker error:', event);
    
    // Reject all pending messages
    for (const [id, resolver] of this.pendingMessages.entries()) {
      resolver.reject(new Error('Worker error occurred'));
      this.pendingMessages.delete(id);
    }
  }

  /**
   * Send a message to the worker
   */
  private async sendMessage<T>(type: WorkerMessageType, data?: any): Promise<T> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const id = `msg-${this.messageId++}`;
    
    return new Promise<T>((resolve, reject) => {
      // Store resolver
      this.pendingMessages.set(id, { resolve, reject });

      // Send message
      this.worker!.postMessage({
        id,
        type,
        data,
      });

      // Set timeout
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error('Worker request timed out'));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Detect faces in an image
   */
  async detectFaces(imageData: ImageData | HTMLImageElement | HTMLVideoElement): Promise<{
    faces: FaceDetection[];
    processingTime: number;
    skipped?: boolean;
    metrics?: WorkerPerformanceMetrics;
  }> {
    await this.initialize();

    try {
      // Process video frames with frame skipping if enabled
      if (this.config.enableFrameSkipping && imageData instanceof HTMLVideoElement) {
        const result = await videoProcessor.processFrame(imageData);
        
        if (result.skipped) {
          return {
            faces: [],
            processingTime: result.processingTime,
            skipped: true,
          };
        }
        
        // Use the processed frame for face detection
        return this.detectFacesOnCanvas(result.processedFrame);
      }

      // Convert image to ImageData if needed
      let imageDataToSend: ImageData;
      
      if (imageData instanceof ImageData) {
        imageDataToSend = imageData;
      } else {
        imageDataToSend = this.imageToImageData(imageData);
      }

      const result = await this.sendMessage<{
        faces: FaceDetection[];
        processingTime: number;
        skipped?: boolean;
        metrics?: WorkerPerformanceMetrics;
      }>(WorkerMessageType.DETECT_FACES, {
        imageData: imageDataToSend,
      });

      // Update performance metrics
      if (result.metrics) {
        this.performanceMetrics = result.metrics;
      }

      return result;
    } catch (error) {
      console.error('Face detection failed:', error);
      throw error;
    }
  }

  /**
   * Detect faces on a canvas element
   */
  private async detectFacesOnCanvas(canvas: HTMLCanvasElement): Promise<{
    faces: FaceDetection[];
    processingTime: number;
    skipped?: boolean;
    metrics?: WorkerPerformanceMetrics;
  }> {
    try {
      // Convert canvas to ImageData
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const result = await this.sendMessage<{
        faces: FaceDetection[];
        processingTime: number;
        skipped?: boolean;
        metrics?: WorkerPerformanceMetrics;
      }>(WorkerMessageType.DETECT_FACES, {
        imageData,
      });

      // Update performance metrics
      if (result.metrics) {
        this.performanceMetrics = result.metrics;
      }

      return result;
    } catch (error) {
      console.error('Face detection failed:', error);
      throw error;
    }
  }

  /**
   * Recognize a face
   */
  async recognizeFace(
    faceImageData: ImageData | HTMLImageElement | HTMLVideoElement,
    knownFaces: FaceEmbedding[]
  ): Promise<{
    matches: FaceMatch[];
    embedding: Float32Array;
    processingTime: number;
    metrics?: WorkerPerformanceMetrics;
  }> {
    await this.initialize();

    try {
      // Convert image to ImageData if needed
      let imageDataToSend: ImageData;
      
      if (faceImageData instanceof ImageData) {
        imageDataToSend = faceImageData;
      } else {
        imageDataToSend = this.imageToImageData(faceImageData);
      }

      const result = await this.sendMessage<{
        matches: FaceMatch[];
        embedding: Float32Array;
        processingTime: number;
        metrics?: WorkerPerformanceMetrics;
      }>(WorkerMessageType.RECOGNIZE_FACE, {
        faceImageData: imageDataToSend,
        knownFaces,
      });

      // Update performance metrics
      if (result.metrics) {
        this.performanceMetrics = result.metrics;
      }

      return result;
    } catch (error) {
      console.error('Face recognition failed:', error);
      throw error;
    }
  }

  /**
   * Generate face embedding
   */
  async generateEmbedding(imageData: ImageData | HTMLImageElement | HTMLVideoElement): Promise<{
    embedding: Float32Array;
    processingTime: number;
    metrics?: WorkerPerformanceMetrics;
  }> {
    await this.initialize();

    try {
      // Process video frames with frame skipping if enabled
      if (this.config.enableFrameSkipping && imageData instanceof HTMLVideoElement) {
        const result = await videoProcessor.processFrame(imageData);
        
        if (result.skipped) {
          return {
            embedding: new Float32Array(128), // Return empty embedding
            processingTime: result.processingTime,
          };
        }
        
        // Use the processed frame for embedding generation
        return this.generateEmbeddingOnCanvas(result.processedFrame);
      }

      // Convert image to ImageData if needed
      let imageDataToSend: ImageData;
      
      if (imageData instanceof ImageData) {
        imageDataToSend = imageData;
      } else {
        imageDataToSend = this.imageToImageData(imageData);
      }

      const result = await this.sendMessage<{
        embedding: Float32Array;
        processingTime: number;
        metrics?: WorkerPerformanceMetrics;
      }>(WorkerMessageType.GENERATE_EMBEDDING, {
        imageData: imageDataToSend,
      });

      // Update performance metrics
      if (result.metrics) {
        this.performanceMetrics = result.metrics;
      }

      return result;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate face embedding on a canvas element
   */
  private async generateEmbeddingOnCanvas(canvas: HTMLCanvasElement): Promise<{
    embedding: Float32Array;
    processingTime: number;
    metrics?: WorkerPerformanceMetrics;
  }> {
    try {
      // Convert canvas to ImageData
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const result = await this.sendMessage<{
        embedding: Float32Array;
        processingTime: number;
        metrics?: WorkerPerformanceMetrics;
      }>(WorkerMessageType.GENERATE_EMBEDDING, {
        imageData,
      });

      // Update performance metrics
      if (result.metrics) {
        this.performanceMetrics = result.metrics;
      }

      return result;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Match faces against known embeddings
   */
  async matchFaces(
    embedding: Float32Array,
    knownFaces: FaceEmbedding[]
  ): Promise<{
    matches: FaceMatch[];
    processingTime: number;
    metrics?: WorkerPerformanceMetrics;
  }> {
    await this.initialize();

    try {
      const result = await this.sendMessage<{
        matches: FaceMatch[];
        processingTime: number;
        metrics?: WorkerPerformanceMetrics;
      }>(WorkerMessageType.MATCH_FACES, {
        embedding,
        knownFaces,
      });

      // Update performance metrics
      if (result.metrics) {
        this.performanceMetrics = result.metrics;
      }

      return result;
    } catch (error) {
      console.error('Face matching failed:', error);
      throw error;
    }
  }

  /**
   * Update worker configuration
   */
  async updateConfig(config: Partial<WorkerConfig>): Promise<{
    config: WorkerConfig;
    maxFrameSkip: number;
  }> {
    await this.initialize();

    try {
      // Update local config
      this.config = { ...this.config, ...config };

      // Send config to worker
      const result = await this.sendMessage<{
        config: WorkerConfig;
        maxFrameSkip: number;
      }>(WorkerMessageType.UPDATE_CONFIG, this.config);

      return result;
    } catch (error) {
      console.error('Config update failed:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<WorkerPerformanceMetrics> {
    await this.initialize();

    try {
      const result = await this.sendMessage<{
        metrics: WorkerPerformanceMetrics;
      }>(WorkerMessageType.GET_PERFORMANCE_METRICS);
      
      // Update local metrics
      this.performanceMetrics = result.metrics;
      
      return result.metrics;
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  /**
   * Cleanup worker resources
   */
  async cleanup(): Promise<void> {
    if (!this.worker) {
      return;
    }

    try {
      // Send cleanup message
      await this.sendMessage(WorkerMessageType.CLEANUP);
      
      // Terminate worker
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.performanceMetrics = null;
      
      // Clear pending messages
      for (const [id, resolver] of this.pendingMessages.entries()) {
        resolver.reject(new Error('Worker cleaned up'));
        this.pendingMessages.delete(id);
      }
    } catch (error) {
      console.error('Worker cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): WorkerConfig {
    return { ...this.config };
  }

  /**
   * Get current performance metrics
   */
  getCurrentPerformanceMetrics(): WorkerPerformanceMetrics | null {
    return this.performanceMetrics ? { ...this.performanceMetrics } : null;
  }

  /**
   * Check if worker is initialized
   */
  isWorkerInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Convert image to ImageData
   */
  private imageToImageData(image: HTMLImageElement | HTMLVideoElement): ImageData {
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Set canvas dimensions
    if (image instanceof HTMLImageElement) {
      canvas.width = image.width;
      canvas.height = image.height;
    } else {
      canvas.width = image.videoWidth;
      canvas.height = image.videoHeight;
    }

    // Draw image to canvas
    ctx.drawImage(image, 0, 0);

    // Get ImageData
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Restart the worker
   */
  async restart(): Promise<void> {
    await this.cleanup();
    await this.initialize(this.config);
  }
}

// Create singleton instance
export const faceWorkerManager = new FaceWorkerManager();

// Export types
export type { WorkerResponse };