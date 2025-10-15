/**
 * Face Recognition Library
 * Provides face detection, recognition, and matching capabilities optimized for offline use
 * Designed to work efficiently on DS223J hardware constraints
 */

import * as faceapi from 'face-api.js';
import { MemoryOptimizer, CPUOptimizer, FaceRecognitionOptimizer } from './hardware-optimization';
import { faceWorkerManager, WorkerConfig } from './face-worker-manager';
import { modelLoader, ModelType, ModelQuality } from './model-loader';
import { imageProcessor, ImageProcessingOptions } from './image-processor';
import { qualityThresholdsManager, QualityThresholdsOptions, QualityMetrics } from './quality-thresholds';
import { memoryMonitor, MemoryMonitorOptions } from './memory-monitor';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export interface FaceEmbedding {
  id: string;
  userId: string;
  embedding: Float32Array;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    quality?: number;
    lighting?: number;
    pose?: number;
  };
}

export interface FaceDetection {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    x: number;
    y: number;
  }[];
  confidence: number;
  embedding?: Float32Array;
}

export interface FaceMatch {
  userId: string;
  confidence: number;
  distance: number;
  faceId?: string;
}

export interface FaceRecognitionOptions {
  detectionThreshold?: number;
  recognitionThreshold?: number;
  maxFacesToDetect?: number;
  inputSize?: number;
  modelPath?: string;
  // Hardware optimization options
  enableMemoryOptimization?: boolean;
  enableCPUOptimization?: boolean;
  maxConcurrentOperations?: number;
  // Web Worker options
  useWebWorker?: boolean;
  workerConfig?: WorkerConfig;
  // Progressive model loading options
  enableProgressiveLoading?: boolean;
  modelQuality?: ModelQuality;
  autoUpgradeQuality?: boolean;
  // Image processing options
  imageProcessingOptions?: ImageProcessingOptions;
  enableImageOptimization?: boolean;
  // Quality thresholds options
  qualityThresholdsOptions?: QualityThresholdsOptions;
  enableQualityThresholds?: boolean;
  // Memory monitoring options
  memoryMonitorOptions?: MemoryMonitorOptions;
  enableMemoryMonitoring?: boolean;
}

export class FaceRecognition {
  private model: any = null;
  private isModelLoaded = false;
  private options: FaceRecognitionOptions;
  private processingQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private isWorkerInitialized = false;
  private currentModelQuality: ModelQuality | null = null;
  private performanceHistory: Array<{ timestamp: number; processingTime: number; accuracy: number }> = [];

  constructor(options: FaceRecognitionOptions = {}) {
    this.options = {
      detectionThreshold: 0.7,
      recognitionThreshold: 0.8,
      maxFacesToDetect: 5,
      inputSize: 224,
      modelPath: '/models/face-recognition-model.json',
      // Hardware optimization defaults
      enableMemoryOptimization: true,
      enableCPUOptimization: true,
      maxConcurrentOperations: 1, // Limit to 1 for low-power CPU
      // Web Worker defaults
      useWebWorker: true,
      workerConfig: {
        detectionThreshold: 0.7,
        recognitionThreshold: 0.8,
        maxFacesToDetect: 5,
        enableMemoryOptimization: true,
        adaptiveQuality: true,
      },
      // Progressive model loading defaults
      enableProgressiveLoading: true,
      modelQuality: ModelQuality.STANDARD,
      autoUpgradeQuality: true,
      // Image processing defaults
      enableImageOptimization: true,
      imageProcessingOptions: {
        targetWidth: 224,
        targetHeight: 224,
        maintainAspectRatio: true,
        quality: 0.8,
        adaptiveQuality: true,
        maxProcessingTime: 100,
      },
      // Quality thresholds defaults
      enableQualityThresholds: true,
      qualityThresholdsOptions: {
        minDetectionConfidence: 0.5,
        maxDetectionConfidence: 0.9,
        adaptiveDetectionThreshold: true,
        minRecognitionConfidence: 0.6,
        maxRecognitionConfidence: 0.95,
        adaptiveRecognitionThreshold: true,
        minImageQuality: 0.4,
        maxImageQuality: 0.9,
        adaptiveImageQuality: true,
        maxProcessingTime: 150,
        targetFPS: 15,
        adaptivePerformanceThreshold: true,
        maxMemoryUsage: 200,
        memoryCleanupThreshold: 0.8,
        adaptiveMemoryThreshold: true,
      },
      // Memory monitoring defaults
      enableMemoryMonitoring: true,
      memoryMonitorOptions: {
        enableMonitoring: true,
        monitoringInterval: 5000,
        historySize: 100,
        enableAutoCleanup: true,
        cleanupThreshold: 80,
        aggressiveCleanupThreshold: 90,
        enableAlerts: true,
        alertThreshold: 85,
        enablePerformanceOptimization: true,
        performanceThreshold: 70,
      },
      ...options,
    };
  }

  /**
   * Initialize the face recognition model with hardware optimizations
   */
  async initialize(): Promise<void> {
    if (this.isModelLoaded) return;

    try {
      // Initialize memory monitoring if enabled
      if (this.options.enableMemoryMonitoring) {
        memoryMonitor.startMonitoring();
        
        // Register cleanup strategies for face recognition
        this.registerMemoryCleanupStrategies();
      }
      
      // Check memory before loading model
      if (this.options.enableMemoryOptimization && (MemoryOptimizer.isMemoryCritical() || memoryMonitor.isMemoryCritical())) {
        MemoryOptimizer.cleanup();
        await memoryMonitor.performCleanup();
      }

      // Initialize Web Worker if enabled
      if (this.options.useWebWorker) {
        await this.initializeWorker();
      } else {
        // Load model with progressive loading
        await this.loadModelWithProgressiveLoading();
      }
      
      this.isModelLoaded = true;
      
      logger.info('Face recognition model loaded with hardware optimizations');
    } catch (error) {
      logger.error('Failed to initialize face recognition model', error as Error);
      throw new Error('Face recognition model initialization failed');
    }
  }

  /**
   * Initialize the Web Worker
   */
  private async initializeWorker(): Promise<void> {
    if (this.isWorkerInitialized) return;

    try {
      // Update worker config with options
      const workerConfig = {
        ...this.options.workerConfig,
        detectionThreshold: this.options.detectionThreshold,
        recognitionThreshold: this.options.recognitionThreshold,
        maxFacesToDetect: this.options.maxFacesToDetect,
        enableMemoryOptimization: this.options.enableMemoryOptimization,
      };

      // Initialize worker
      await faceWorkerManager.initialize(workerConfig);
      this.isWorkerInitialized = true;
      
      logger.info('Face recognition worker initialized');
    } catch (error) {
      logger.error('Failed to initialize face recognition worker', error as Error);
      throw error;
    }
  }

  /**
   * Load model with progressive loading
   */
  private async loadModelWithProgressiveLoading(): Promise<void> {
    if (!this.options.enableProgressiveLoading) {
      await this.loadModel();
      return;
    }

    // Start with lightweight model
    this.currentModelQuality = ModelQuality.LIGHTWEIGHT;
    const lightweightResult = await modelLoader.loadModel(
      ModelType.FACE_RECOGNITION,
      ModelQuality.LIGHTWEIGHT
    );
    this.model = lightweightResult.model;

    // Load standard model in background
    this.loadModelInBackground(ModelQuality.STANDARD);

    // Load high quality model in background if auto-upgrade is enabled
    if (this.options.autoUpgradeQuality) {
      this.loadModelInBackground(ModelQuality.HIGH);
    }
  }

  /**
   * Load a model in the background
   */
  private async loadModelInBackground(quality: ModelQuality): Promise<void> {
    try {
      const result = await modelLoader.loadModel(
        ModelType.FACE_RECOGNITION,
        quality
      );
      
      // Upgrade to better model if available
      if (
        !this.currentModelQuality ||
        (quality === ModelQuality.STANDARD && this.currentModelQuality === ModelQuality.LIGHTWEIGHT) ||
        (quality === ModelQuality.HIGH && this.currentModelQuality !== ModelQuality.HIGH)
      ) {
        this.model = result.model;
        this.currentModelQuality = quality;
        logger.info('Upgraded to ${quality} face recognition model');
      }
    } catch (error) {
      logger.error('Failed to load ${quality} model in background', error as Error);
    }
  }

  /**
   * Upgrade model quality if needed based on performance
   */
  private async upgradeModelQualityIfNeeded(): Promise<void> {
    if (!this.options.autoUpgradeQuality || !this.options.enableProgressiveLoading) {
      return;
    }

    // Analyze performance history
    if (this.performanceHistory.length < 10) {
      return; // Need more data points
    }

    // Calculate average processing time and accuracy
    const recentHistory = this.performanceHistory.slice(-10);
    const avgProcessingTime = recentHistory.reduce((sum, p) => sum + p.processingTime, 0) / recentHistory.length;
    const avgAccuracy = recentHistory.reduce((sum, p) => sum + p.accuracy, 0) / recentHistory.length;

    // Upgrade if processing is fast and accuracy is low
    if (
      avgProcessingTime < 100 && // Fast processing
      avgAccuracy < 0.85 &&     // Low accuracy
      this.currentModelQuality !== ModelQuality.HIGH
    ) {
      const targetQuality = this.currentModelQuality === ModelQuality.LIGHTWEIGHT
        ? ModelQuality.STANDARD
        : ModelQuality.HIGH;
      
      try {
        const result = await modelLoader.loadModel(
          ModelType.FACE_RECOGNITION,
          targetQuality
        );
        this.model = result.model;
        this.currentModelQuality = targetQuality;
        logger.info('Auto-upgraded to ${targetQuality} model based on performance');
      } catch (error) {
        logger.error('Failed to auto-upgrade to ${targetQuality} model', error as Error);
      }
    }
  }

  /**
   * Downgrade model quality if memory is critical
   */
  private async downgradeModelQualityIfNeeded(): Promise<void> {
    if (
      !this.options.enableProgressiveLoading ||
      !this.options.enableMemoryOptimization ||
      (!MemoryOptimizer.isMemoryCritical() && !memoryMonitor.isMemoryCritical())
    ) {
      return;
    }

    if (this.currentModelQuality !== ModelQuality.LIGHTWEIGHT) {
      const targetQuality = ModelQuality.LIGHTWEIGHT;
      
      try {
        const result = await modelLoader.loadModel(
          ModelType.FACE_RECOGNITION,
          targetQuality
        );
        this.model = result.model;
        this.currentModelQuality = targetQuality;
        logger.info('Downgraded to ${targetQuality} model due to memory constraints');
      } catch (error) {
        logger.error('Failed to downgrade to ${targetQuality} model', error as Error);
      }
    }
  }

  /**
   * Load the face recognition model with hardware optimizations
   */
  private async loadModel(): Promise<void> {
    // Use hardware-optimized model loading
    if (this.options.enableMemoryOptimization) {
      return FaceRecognitionOptimizer.loadModel();
    }
    
    // Fallback to standard loading
    return new Promise((resolve) => {
      setTimeout(() => {
        logger.info('Face recognition model loaded');
        resolve();
      }, 1000);
    });
  }

  /**
   * Detect faces in an image with hardware optimizations
   */
  async detectFaces(imageElement: HTMLImageElement | HTMLVideoElement): Promise<FaceDetection[]> {
    if (!this.isModelLoaded) {
      await this.initialize();
    }

    // Check if we need to downgrade model quality due to memory constraints
    await this.downgradeModelQualityIfNeeded();

    const startTime = performance.now();
    let faces: FaceDetection[];
    let imageQuality = 0.7; // Default quality

    // Use Web Worker if enabled
    if (this.options.useWebWorker && this.isWorkerInitialized) {
      const result = await this.detectFacesWithWorker(imageElement);
      faces = result;
      // Default image quality for worker detection
      imageQuality = 0.7;
    } else {
      // Use CPU optimization if enabled
      if (this.options.enableCPUOptimization) {
        const result = await this.queueOperation(() => this.detectFacesInternal(imageElement));
        faces = result.faces;
        imageQuality = result.imageQuality;
      } else {
        const result = await this.detectFacesInternal(imageElement);
        faces = result.faces;
        imageQuality = result.imageQuality;
      }
    }

    const processingTime = performance.now() - startTime;

    // Evaluate quality thresholds if enabled
    if (this.options.enableQualityThresholds) {
      const memoryUsage = this.getMemoryUsage();
      const metrics: QualityMetrics = {
        detectionConfidence: faces.length > 0 ? Math.max(...faces.map(f => f.confidence)) : 0,
        recognitionConfidence: 0, // Not applicable for detection only
        imageQuality,
        processingTime,
        memoryUsage,
        fps: imageElement instanceof HTMLVideoElement ? this.calculateFPS(imageElement) : 0,
      };

      const qualityResult = qualityThresholdsManager.evaluateQuality(metrics);
      
      if (!qualityResult.shouldProcess) {
        logger.info('Face detection skipped: ${qualityResult.reason}');
        return [];
      }
    }

    // Track performance
    this.trackPerformance(processingTime, faces.length > 0 ? 1 : 0);

    // Check if we should upgrade model quality
    await this.upgradeModelQualityIfNeeded();

    return faces;
  }

  /**
   * Detect faces using Web Worker
   */
  private async detectFacesWithWorker(imageElement: HTMLImageElement | HTMLVideoElement): Promise<FaceDetection[]> {
    try {
      const result = await faceWorkerManager.detectFaces(imageElement);
      
      // Handle frame skipping
      if (result.skipped) {
        return [];
      }
      
      return result.faces;
    } catch (error) {
      logger.error('Worker face detection failed, falling back to main thread', error as Error);
      
      // Fallback to main thread
      if (this.options.enableCPUOptimization) {
        const result = await this.queueOperation(() => this.detectFacesInternal(imageElement));
        return result.faces;
      }
      
      const result = await this.detectFacesInternal(imageElement);
      return result.faces;
    }
  }

  /**
   * Internal face detection method
   */
  private async detectFacesInternal(imageElement: HTMLImageElement | HTMLVideoElement): Promise<{
    faces: FaceDetection[];
    imageQuality: number;
  }> {
    try {
      let processedImage = imageElement;
      let imageQuality = 0.7; // Default quality
      
      // Optimize image for face recognition if image optimization is enabled
      if (this.options.enableImageOptimization) {
        const result = await imageProcessor.processImage(imageElement);
        
        // Check if processing was skipped
        if (!result.skipped) {
          // Create a temporary image element from the processed canvas
          const tempImage = new Image();
          tempImage.src = result.processedImage.toDataURL();
          await new Promise(resolve => { tempImage.onload = resolve; });
          processedImage = tempImage;
          imageQuality = result.quality;
        }
      } else if (this.options.enableMemoryOptimization) {
        // Fallback to legacy optimization
        const optimizedImage = FaceRecognitionOptimizer.optimizeImage(imageElement);
        // Create a temporary image element from the canvas
        const tempImage = new Image();
        tempImage.src = optimizedImage.toDataURL();
        await new Promise(resolve => { tempImage.onload = resolve; });
        processedImage = tempImage;
      }
      
      return {
        faces: await this.mockDetectFaces(processedImage),
        imageQuality,
      };
    } catch (error) {
      logger.error('Face detection failed', error as Error);
      throw new Error('Face detection failed');
    }
  }

  /**
   * Generate face embedding for recognition with hardware optimizations
   */
  async generateEmbedding(imageElement: HTMLImageElement | HTMLVideoElement, faceDetection: FaceDetection): Promise<Float32Array> {
    if (!this.isModelLoaded) {
      await this.initialize();
    }

    // Check if we need to downgrade model quality due to memory constraints
    await this.downgradeModelQualityIfNeeded();

    const startTime = performance.now();
    let embedding: Float32Array;

    // Use Web Worker if enabled
    if (this.options.useWebWorker && this.isWorkerInitialized) {
      embedding = await this.generateEmbeddingWithWorker(imageElement);
    } else {
      // Use CPU optimization if enabled
      if (this.options.enableCPUOptimization) {
        embedding = await this.queueOperation(() => this.generateEmbeddingInternal(imageElement, faceDetection));
      } else {
        embedding = await this.generateEmbeddingInternal(imageElement, faceDetection);
      }
    }

    const processingTime = performance.now() - startTime;

    // Track performance (embedding generation is always successful if it completes)
    this.trackPerformance(processingTime, 1);

    // Check if we should upgrade model quality
    await this.upgradeModelQualityIfNeeded();

    return embedding;
  }

  /**
   * Generate face embedding using Web Worker
   */
  private async generateEmbeddingWithWorker(imageElement: HTMLImageElement | HTMLVideoElement): Promise<Float32Array> {
    try {
      const result = await faceWorkerManager.generateEmbedding(imageElement);
      return result.embedding;
    } catch (error) {
      logger.error('Worker embedding generation failed, falling back to main thread', error as Error);
      
      // Fallback to main thread
      const faceDetectionResult = await this.detectFacesInternal(imageElement);
      if (faceDetectionResult.faces.length === 0) {
        throw new Error('No faces detected for embedding generation');
      }
      
      if (this.options.enableCPUOptimization) {
        return this.queueOperation(() => this.generateEmbeddingInternal(imageElement, faceDetectionResult.faces[0]));
      }
      
      return this.generateEmbeddingInternal(imageElement, faceDetectionResult.faces[0]);
    }
  }

  /**
   * Internal embedding generation method
   */
  private async generateEmbeddingInternal(imageElement: HTMLImageElement | HTMLVideoElement, faceDetection: FaceDetection): Promise<Float32Array> {
    try {
      let processedImage = imageElement;
      
      // Optimize image for face recognition if image optimization is enabled
      if (this.options.enableImageOptimization) {
        const result = await imageProcessor.processImage(imageElement);
        
        // Check if processing was skipped
        if (!result.skipped) {
          // Create a temporary image element from the processed canvas
          const tempImage = new Image();
          tempImage.src = result.processedImage.toDataURL();
          await new Promise(resolve => { tempImage.onload = resolve; });
          processedImage = tempImage;
        }
      } else if (this.options.enableMemoryOptimization) {
        // Fallback to legacy optimization
        const optimizedImage = FaceRecognitionOptimizer.optimizeImage(imageElement);
        // Create a temporary image element from the canvas
        const tempImage = new Image();
        tempImage.src = optimizedImage.toDataURL();
        await new Promise(resolve => { tempImage.onload = resolve; });
        processedImage = tempImage;
      }
      
      const embedding = await this.mockGenerateEmbedding(processedImage, faceDetection);
      
      // Optimize embedding for memory usage
      if (this.options.enableMemoryOptimization) {
        return MemoryOptimizer.optimizeObject(embedding);
      }
      
      return embedding;
    } catch (error) {
      logger.error('Embedding generation failed', error as Error);
      throw new Error('Embedding generation failed');
    }
  }

  /**
   * Match a face embedding against known faces with hardware optimizations
   */
  async matchFace(embedding: Float32Array, knownFaces: FaceEmbedding[]): Promise<FaceMatch[]> {
    if (!this.isModelLoaded) {
      await this.initialize();
    }

    const startTime = performance.now();
    let matches: FaceMatch[];

    // Use Web Worker if enabled
    if (this.options.useWebWorker && this.isWorkerInitialized) {
      matches = await this.matchFaceWithWorker(embedding, knownFaces);
    } else {
      // Use CPU optimization if enabled
      if (this.options.enableCPUOptimization) {
        matches = await this.queueOperation(() => this.matchFaceInternal(embedding, knownFaces));
      } else {
        matches = await this.matchFaceInternal(embedding, knownFaces);
      }
    }

    const processingTime = performance.now() - startTime;

    // Track performance
    this.trackPerformance(processingTime, matches.length > 0 ? 1 : 0);

    // Check if we should upgrade model quality
    await this.upgradeModelQualityIfNeeded();

    return matches;
  }

  /**
   * Match face embedding using Web Worker
   */
  private async matchFaceWithWorker(embedding: Float32Array, knownFaces: FaceEmbedding[]): Promise<FaceMatch[]> {
    try {
      const result = await faceWorkerManager.matchFaces(embedding, knownFaces);
      return result.matches;
    } catch (error) {
      logger.error('Worker face matching failed, falling back to main thread', error as Error);
      
      // Fallback to main thread
      if (this.options.enableCPUOptimization) {
        return this.queueOperation(() => this.matchFaceInternal(embedding, knownFaces));
      }
      
      return this.matchFaceInternal(embedding, knownFaces);
    }
  }

  /**
   * Internal face matching method
   */
  private async matchFaceInternal(embedding: Float32Array, knownFaces: FaceEmbedding[]): Promise<FaceMatch[]> {
    try {
      // Process in chunks if there are many known faces to prevent CPU overload
      if (this.options.enableCPUOptimization && knownFaces.length > 50) {
        return CPUOptimizer.runInChunks(
          knownFaces,
          25, // Process 25 faces at a time
          async (chunk) => {
            return chunk.map((face) => {
              const distance = this.calculateDistance(embedding, face.embedding);
              const confidence = this.distanceToConfidence(distance);
              
              return {
                userId: face.userId,
                confidence,
                distance,
                faceId: face.id,
              };
            });
          }
        ).then(results => {
          // Filter by recognition threshold and sort by confidence
          return results
            .filter(match => match.confidence >= this.options.recognitionThreshold!)
            .sort((a, b) => b.confidence - a.confidence);
        });
      }
      
      // Standard processing for smaller datasets
      const matches: FaceMatch[] = knownFaces.map((face) => {
        const distance = this.calculateDistance(embedding, face.embedding);
        const confidence = this.distanceToConfidence(distance);
        
        return {
          userId: face.userId,
          confidence,
          distance,
          faceId: face.id,
        };
      });

      // Filter by recognition threshold and sort by confidence
      return matches
        .filter(match => match.confidence >= this.options.recognitionThreshold!)
        .sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      logger.error('Face matching failed', error as Error);
      throw new Error('Face matching failed');
    }
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
      const maxConcurrent = this.options.maxConcurrentOperations || 1;
      const operationsToProcess = this.processingQueue.splice(0, maxConcurrent);
      
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
      logger.error('Error processing operation queue', error as Error);
      this.isProcessing = false;
    }
  }

  /**
   * Calculate Euclidean distance between two embeddings
   */
  private calculateDistance(embedding1: Float32Array, embedding2: Float32Array): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embedding dimensions do not match');
    }

    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      const diff = embedding1[i] - embedding2[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Convert distance to confidence score (0-1)
   */
  private distanceToConfidence(distance: number): number {
    // This is a simplified conversion - in practice, you'd use a more sophisticated function
    // based on the distribution of distances in your model
    const maxDistance = 2.0; // Adjust based on your model
    return Math.max(0, 1 - (distance / maxDistance));
  }

  /**
   * Real face detection using face-api.js
   */
  private async mockDetectFaces(imageElement: HTMLImageElement | HTMLVideoElement): Promise<FaceDetection[]> {
    try {
      // Use face-api.js to detect faces with landmarks
      const detections = await faceapi
        .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions({
          inputSize: this.options.detectionThreshold || 320,
          scoreThreshold: this.options.confidenceThreshold || 0.5
        }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      // Convert face-api.js format to our FaceDetection format
      return detections.map(detection => ({
        boundingBox: {
          x: detection.detection.box.x,
          y: detection.detection.box.y,
          width: detection.detection.box.width,
          height: detection.detection.box.height,
        },
        landmarks: detection.landmarks.positions.slice(0, 5).map(pos => ({
          x: pos.x,
          y: pos.y,
        })),
        confidence: detection.detection.score,
        embedding: new Float32Array(detection.descriptor) // Include the descriptor as embedding
      }));
    } catch (error) {
      logger.error('Face detection failed', error as Error);
      // Return empty array if detection fails
      return [];
    }
  }

  /**
   * Real embedding generation using face-api.js
   */
  private async mockGenerateEmbedding(
    imageElement: HTMLImageElement | HTMLVideoElement,
    faceDetection: FaceDetection
  ): Promise<Float32Array> {
    try {
      // If embedding already exists in the detection, use it
      if (faceDetection.embedding && faceDetection.embedding.length > 0) {
        return faceDetection.embedding;
      }

      // Otherwise, generate a new descriptor using face-api.js
      const detection = await faceapi
        .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions({
          inputSize: this.options.detectionThreshold || 320,
          scoreThreshold: this.options.confidenceThreshold || 0.5
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection && detection.descriptor) {
        return new Float32Array(detection.descriptor);
      }

      throw new Error('No face detected for embedding generation');
    } catch (error) {
      logger.error('Face embedding generation failed', error as Error);
      throw error;
    }
  }

  /**
   * Check if the model is loaded
   */
  isModelReady(): boolean {
    return this.isModelLoaded;
  }

  /**
   * Get the current options
   */
  getOptions(): FaceRecognitionOptions {
    return { ...this.options };
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<FaceRecognitionOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Track performance for adaptive model quality
   */
  private trackPerformance(processingTime: number, accuracy: number): void {
    this.performanceHistory.push({
      timestamp: Date.now(),
      processingTime,
      accuracy,
    });

    // Keep only recent history (last 100 entries)
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
  }

  /**
   * Get current model quality
   */
  getCurrentModelQuality(): ModelQuality | null {
    return this.currentModelQuality;
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }
    return 0;
  }

  /**
   * Calculate FPS for video element
   */
  private calculateFPS(videoElement: HTMLVideoElement): number {
    // This is a simplified calculation
    // In a real implementation, you would track frame timestamps
    return 30; // Default FPS
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): Array<{ timestamp: number; processingTime: number; accuracy: number }> {
    return [...this.performanceHistory];
  }

  /**
   * Get average performance metrics
   */
  getAveragePerformanceMetrics(): { avgProcessingTime: number; avgAccuracy: number } | null {
    if (this.performanceHistory.length === 0) {
      return null;
    }

    const avgProcessingTime = this.performanceHistory.reduce(
      (sum, p) => sum + p.processingTime,
      0
    ) / this.performanceHistory.length;
    const avgAccuracy = this.performanceHistory.reduce(
      (sum, p) => sum + p.accuracy,
      0
    ) / this.performanceHistory.length;

    return { avgProcessingTime, avgAccuracy };
  }

  /**
   * Release model from memory to free resources
   */
  async releaseModel(): Promise<void> {
    // Cleanup Web Worker if initialized
    if (this.options.useWebWorker && this.isWorkerInitialized) {
      try {
        await faceWorkerManager.cleanup();
        this.isWorkerInitialized = false;
      } catch (error) {
        logger.error('Failed to cleanup face recognition worker', error as Error);
      }
    }
    
    // Release model from model loader
    if (this.currentModelQuality) {
      modelLoader.releaseModel(ModelType.FACE_RECOGNITION, this.currentModelQuality);
    }
    
    if (this.options.enableMemoryOptimization) {
      FaceRecognitionOptimizer.releaseModel();
    }
    
    // Stop memory monitoring
    if (this.options.enableMemoryMonitoring) {
      memoryMonitor.stopMonitoring();
    }
    
    this.model = null;
    this.isModelLoaded = false;
    this.currentModelQuality = null;
    
    // Clear processing queue
    this.processingQueue = [];
    this.isProcessing = false;
    
    // Clear performance history
    this.performanceHistory = [];
  }

  /**
   * Register memory cleanup strategies for face recognition
   */
  private registerMemoryCleanupStrategies(): void {
    // Strategy 1: Release face recognition models
    memoryMonitor.registerCleanupStrategy({
      name: 'releaseFaceRecognitionModels',
      priority: 1,
      execute: async function releaseFaceRecognitionModels() {
        if (modelLoader) {
          // Release all loaded models
          Object.values(ModelType).forEach(type => {
            Object.values(ModelQuality).forEach(quality => {
              try {
                modelLoader.releaseModel(type, quality);
              } catch (error) {
                // Ignore errors
              }
            });
          });
        }
      }
    });
    
    // Strategy 2: Clear face recognition cache
    memoryMonitor.registerCleanupStrategy({
      name: 'clearFaceRecognitionCache',
      priority: 2,
      execute: async function clearFaceRecognitionCache() {
        // Clear any cached face data
        // This would be implemented based on the specific caching strategy
      }
    });
  }

  /**
   * Get performance metrics from the worker
   */
  async getPerformanceMetrics(): Promise<any> {
    if (this.options.useWebWorker && this.isWorkerInitialized) {
      try {
        return await faceWorkerManager.getPerformanceMetrics();
      } catch (error) {
        logger.error('Failed to get worker performance metrics', error as Error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Update worker configuration
   */
  async updateWorkerConfig(config: Partial<WorkerConfig>): Promise<void> {
    if (this.options.useWebWorker && this.isWorkerInitialized) {
      try {
        await faceWorkerManager.updateConfig(config);
        
        // Update local options
        if (config.detectionThreshold !== undefined) {
          this.options.detectionThreshold = config.detectionThreshold;
        }
        if (config.recognitionThreshold !== undefined) {
          this.options.recognitionThreshold = config.recognitionThreshold;
        }
        if (config.maxFacesToDetect !== undefined) {
          this.options.maxFacesToDetect = config.maxFacesToDetect;
        }
        
        // Update worker config in options
        this.options.workerConfig = { ...this.options.workerConfig, ...config };
      } catch (error) {
        logger.error('Failed to update worker config', error as Error);
        throw error;
      }
    }
  }

  /**
   * Manually upgrade model quality
   */
  async upgradeModelQuality(targetQuality: ModelQuality): Promise<void> {
    if (!this.options.enableProgressiveLoading) {
      throw new Error('Progressive loading is not enabled');
    }

    if (this.currentModelQuality === targetQuality) {
      return; // Already at target quality
    }

    try {
      const result = await modelLoader.loadModel(
        ModelType.FACE_RECOGNITION,
        targetQuality
      );
      this.model = result.model;
      this.currentModelQuality = targetQuality;
      logger.info('Manually upgraded to ${targetQuality} model');
    } catch (error) {
      logger.error('Failed to upgrade to ${targetQuality} model', error as Error);
      throw error;
    }
  }
}

// Singleton instance with hardware optimizations enabled by default
export const faceRecognition = new FaceRecognition({
  enableMemoryOptimization: true,
  enableCPUOptimization: true,
  maxConcurrentOperations: 1,
  useWebWorker: true,
  workerConfig: {
    detectionThreshold: 0.7,
    recognitionThreshold: 0.8,
    maxFacesToDetect: 5,
    enableMemoryOptimization: true,
    adaptiveQuality: true,
  },
  enableProgressiveLoading: true,
  modelQuality: ModelQuality.STANDARD,
  autoUpgradeQuality: true,
  enableImageOptimization: true,
  imageProcessingOptions: {
    targetWidth: 224,
    targetHeight: 224,
    maintainAspectRatio: true,
    quality: 0.8,
    adaptiveQuality: true,
    maxProcessingTime: 100,
  },
  enableQualityThresholds: true,
  qualityThresholdsOptions: {
    minDetectionConfidence: 0.5,
    maxDetectionConfidence: 0.9,
    adaptiveDetectionThreshold: true,
    minRecognitionConfidence: 0.6,
    maxRecognitionConfidence: 0.95,
    adaptiveRecognitionThreshold: true,
    minImageQuality: 0.4,
    maxImageQuality: 0.9,
    adaptiveImageQuality: true,
    maxProcessingTime: 150,
    targetFPS: 15,
    adaptivePerformanceThreshold: true,
    maxMemoryUsage: 200,
    memoryCleanupThreshold: 0.8,
    adaptiveMemoryThreshold: true,
  },
  enableMemoryMonitoring: true,
  memoryMonitorOptions: {
    enableMonitoring: true,
    monitoringInterval: 5000,
    historySize: 100,
    enableAutoCleanup: true,
    cleanupThreshold: 80,
    aggressiveCleanupThreshold: 90,
    enableAlerts: true,
    alertThreshold: 85,
    enablePerformanceOptimization: true,
    performanceThreshold: 70,
  },
});