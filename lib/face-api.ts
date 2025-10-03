/**
 * Face API Library
 * Provides browser-compatible face detection, landmark detection, and embedding extraction
 * Optimized for offline use on DS223J hardware
 */

import { FaceDetection, FaceEmbedding } from './face-recognition';
import { MemoryOptimizer, CPUOptimizer, FaceRecognitionOptimizer } from './hardware-optimization';
import { faceWorkerManager, WorkerConfig } from './face-worker-manager';
import { modelLoader, ModelType, ModelQuality } from './model-loader';
import { imageProcessor, ImageProcessingOptions } from './image-processor';

export interface FaceLandmark {
  x: number;
  y: number;
  name?: string;
}

export interface FaceLandmarks {
  contours?: Record<string, FaceLandmark[]>;
  positions?: FaceLandmark[];
}

export interface FaceExpression {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

export interface FaceQualityMetrics {
  sharpness: number;
  brightness: number;
  contrast: number;
  lighting: number;
  pose: number;
  occlusion: number;
  overall: number;
}

export interface FaceDetectionOptions {
  inputSize?: number;
  scoreThreshold?: number;
  maxFaces?: number;
  flipHorizontal?: boolean;
  withLandmarks?: boolean;
  withExpressions?: boolean;
  withQualityMetrics?: boolean;
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
}

export class FaceAPI {
  private modelsLoaded = false;
  private faceDetectionNet: any = null;
  private faceLandmarkNet: any = null;
  private faceRecognitionNet: any = null;
  private options: FaceDetectionOptions;
  private processingQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private isWorkerInitialized = false;
  private currentModelQualities: Map<ModelType, ModelQuality | null> = new Map();
  private performanceHistory: Map<ModelType, Array<{ timestamp: number; processingTime: number; accuracy: number }>> = new Map();

  constructor(options: FaceDetectionOptions = {}) {
    this.options = {
      inputSize: 224,
      scoreThreshold: 0.7,
      maxFaces: 5,
      flipHorizontal: false,
      withLandmarks: true,
      withExpressions: false,
      withQualityMetrics: true,
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
      ...options,
    };

    // Initialize model quality tracking
    Object.values(ModelType).forEach(type => {
      this.currentModelQualities.set(type, null);
      this.performanceHistory.set(type, []);
    });
  }

  /**
   * Load all required models with hardware optimizations
   */
  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    try {
      // Check memory before loading models
      if (this.options.enableMemoryOptimization && MemoryOptimizer.isMemoryCritical()) {
        MemoryOptimizer.cleanup();
      }

      // Initialize Web Worker if enabled
      if (this.options.useWebWorker) {
        await this.initializeWorker();
      } else {
        // Load models with progressive loading
        await this.loadModelsWithProgressiveLoading();
      }
      
      this.modelsLoaded = true;
      console.log('Face API models loaded successfully with hardware optimizations');
    } catch (error) {
      console.error('Failed to load face API models:', error);
      throw new Error('Face API models loading failed');
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
        detectionThreshold: this.options.scoreThreshold,
        maxFacesToDetect: this.options.maxFaces,
        enableMemoryOptimization: this.options.enableMemoryOptimization,
      };

      // Initialize worker
      await faceWorkerManager.initialize(workerConfig);
      this.isWorkerInitialized = true;
      
      console.log('Face API worker initialized');
    } catch (error) {
      console.error('Failed to initialize face API worker:', error);
      throw error;
    }
  }

  /**
   * Load models with progressive loading
   */
  private async loadModelsWithProgressiveLoading(): Promise<void> {
    if (!this.options.enableProgressiveLoading) {
      await this.mockLoadModels();
      return;
    }

    // Define models to load with priority
    const modelsToLoad = [
      { type: ModelType.FACE_DETECTION, quality: this.options.modelQuality },
      { type: ModelType.FACE_RECOGNITION, quality: this.options.modelQuality },
      { type: ModelType.FACE_LANDMARKS, quality: this.options.modelQuality },
      { type: ModelType.FACE_EXPRESSIONS, quality: this.options.modelQuality },
    ];

    // Load models with progressive loading
    const results = await modelLoader.loadModels(modelsToLoad);

    // Set models and track quality
    results.forEach(result => {
      switch (result.type) {
        case ModelType.FACE_DETECTION:
          this.faceDetectionNet = result.model;
          this.currentModelQualities.set(ModelType.FACE_DETECTION, result.quality);
          break;
        case ModelType.FACE_RECOGNITION:
          this.faceRecognitionNet = result.model;
          this.currentModelQualities.set(ModelType.FACE_RECOGNITION, result.quality);
          break;
        case ModelType.FACE_LANDMARKS:
          this.faceLandmarkNet = result.model;
          this.currentModelQualities.set(ModelType.FACE_LANDMARKS, result.quality);
          break;
        case ModelType.FACE_EXPRESSIONS:
          // Note: Face expressions model is not directly used in this implementation
          this.currentModelQualities.set(ModelType.FACE_EXPRESSIONS, result.quality);
          break;
      }
    });

    // Load higher quality models in background if auto-upgrade is enabled
    if (this.options.autoUpgradeQuality) {
      this.loadHigherQualityModelsInBackground();
    }
  }

  /**
   * Load higher quality models in background
   */
  private async loadHigherQualityModelsInBackground(): Promise<void> {
    const models = [
      ModelType.FACE_DETECTION,
      ModelType.FACE_RECOGNITION,
      ModelType.FACE_LANDMARKS,
      ModelType.FACE_EXPRESSIONS,
    ];

    for (const modelType of models) {
      const currentQuality = this.currentModelQualities.get(modelType);
      if (!currentQuality) continue;

      // Determine next quality level
      let nextQuality: ModelQuality | null = null;
      if (currentQuality === ModelQuality.LIGHTWEIGHT) {
        nextQuality = ModelQuality.STANDARD;
      } else if (currentQuality === ModelQuality.STANDARD) {
        nextQuality = ModelQuality.HIGH;
      }

      if (!nextQuality) continue;

      // Load model in background
      try {
        const result = await modelLoader.loadModel(modelType, nextQuality);
        
        // Update model if loaded successfully
        switch (modelType) {
          case ModelType.FACE_DETECTION:
            this.faceDetectionNet = result.model;
            break;
          case ModelType.FACE_RECOGNITION:
            this.faceRecognitionNet = result.model;
            break;
          case ModelType.FACE_LANDMARKS:
            this.faceLandmarkNet = result.model;
            break;
        }
        
        this.currentModelQualities.set(modelType, nextQuality);
        console.log(`Upgraded ${modelType} to ${nextQuality} model`);
      } catch (error) {
        console.error(`Failed to load ${nextQuality} ${modelType} model in background:`, error);
      }
    }
  }

  /**
   * Upgrade model quality if needed based on performance
   */
  private async upgradeModelQualityIfNeeded(modelType: ModelType): Promise<void> {
    if (!this.options.autoUpgradeQuality || !this.options.enableProgressiveLoading) {
      return;
    }

    const performanceHistory = this.performanceHistory.get(modelType) || [];
    if (performanceHistory.length < 10) {
      return; // Need more data points
    }

    // Calculate average processing time and accuracy
    const recentHistory = performanceHistory.slice(-10);
    const avgProcessingTime = recentHistory.reduce((sum, p) => sum + p.processingTime, 0) / recentHistory.length;
    const avgAccuracy = recentHistory.reduce((sum, p) => sum + p.accuracy, 0) / recentHistory.length;

    const currentQuality = this.currentModelQualities.get(modelType);
    if (!currentQuality) return;

    // Upgrade if processing is fast and accuracy is low
    if (
      avgProcessingTime < 100 && // Fast processing
      avgAccuracy < 0.85 &&     // Low accuracy
      currentQuality !== ModelQuality.HIGH
    ) {
      const targetQuality = currentQuality === ModelQuality.LIGHTWEIGHT
        ? ModelQuality.STANDARD
        : ModelQuality.HIGH;
      
      try {
        const result = await modelLoader.loadModel(modelType, targetQuality);
        
        // Update model
        switch (modelType) {
          case ModelType.FACE_DETECTION:
            this.faceDetectionNet = result.model;
            break;
          case ModelType.FACE_RECOGNITION:
            this.faceRecognitionNet = result.model;
            break;
          case ModelType.FACE_LANDMARKS:
            this.faceLandmarkNet = result.model;
            break;
        }
        
        this.currentModelQualities.set(modelType, targetQuality);
        console.log(`Auto-upgraded ${modelType} to ${targetQuality} model based on performance`);
      } catch (error) {
        console.error(`Failed to auto-upgrade ${modelType} to ${targetQuality} model:`, error);
      }
    }
  }

  /**
   * Downgrade model quality if memory is critical
   */
  private async downgradeModelQualityIfNeeded(modelType: ModelType): Promise<void> {
    if (
      !this.options.enableProgressiveLoading ||
      !this.options.enableMemoryOptimization ||
      !MemoryOptimizer.isMemoryCritical()
    ) {
      return;
    }

    const currentQuality = this.currentModelQualities.get(modelType);
    if (!currentQuality || currentQuality === ModelQuality.LIGHTWEIGHT) {
      return;
    }

    try {
      const result = await modelLoader.loadModel(modelType, ModelQuality.LIGHTWEIGHT);
      
      // Update model
      switch (modelType) {
        case ModelType.FACE_DETECTION:
          this.faceDetectionNet = result.model;
          break;
        case ModelType.FACE_RECOGNITION:
          this.faceRecognitionNet = result.model;
          break;
        case ModelType.FACE_LANDMARKS:
          this.faceLandmarkNet = result.model;
          break;
      }
      
      this.currentModelQualities.set(modelType, ModelQuality.LIGHTWEIGHT);
      console.log(`Downgraded ${modelType} to lightweight model due to memory constraints`);
    } catch (error) {
      console.error(`Failed to downgrade ${modelType} to lightweight model:`, error);
    }
  }

  /**
   * Track performance for adaptive model quality
   */
  private trackPerformance(modelType: ModelType, processingTime: number, accuracy: number): void {
    const performanceHistory = this.performanceHistory.get(modelType) || [];
    performanceHistory.push({
      timestamp: Date.now(),
      processingTime,
      accuracy,
    });

    // Keep only recent history (last 100 entries)
    if (performanceHistory.length > 100) {
      performanceHistory.splice(0, performanceHistory.length - 100);
    }

    this.performanceHistory.set(modelType, performanceHistory);
  }

  /**
   * Get current model quality for a model type
   */
  getCurrentModelQuality(modelType: ModelType): ModelQuality | null {
    return this.currentModelQualities.get(modelType) || null;
  }

  /**
   * Get performance history for a model type
   */
  getPerformanceHistory(modelType: ModelType): Array<{ timestamp: number; processingTime: number; accuracy: number }> {
    return [...(this.performanceHistory.get(modelType) || [])];
  }

  /**
   * Get average performance metrics for a model type
   */
  getAveragePerformanceMetrics(modelType: ModelType): { avgProcessingTime: number; avgAccuracy: number } | null {
    const performanceHistory = this.performanceHistory.get(modelType) || [];
    if (performanceHistory.length === 0) {
      return null;
    }

    const avgProcessingTime = performanceHistory.reduce(
      (sum, p) => sum + p.processingTime,
      0
    ) / performanceHistory.length;
    const avgAccuracy = performanceHistory.reduce(
      (sum, p) => sum + p.accuracy,
      0
    ) / performanceHistory.length;

    return { avgProcessingTime, avgAccuracy };
  }

  /**
   * Manually upgrade model quality
   */
  async upgradeModelQuality(modelType: ModelType, targetQuality: ModelQuality): Promise<void> {
    if (!this.options.enableProgressiveLoading) {
      throw new Error('Progressive loading is not enabled');
    }

    const currentQuality = this.currentModelQualities.get(modelType);
    if (currentQuality === targetQuality) {
      return; // Already at target quality
    }

    try {
      const result = await modelLoader.loadModel(modelType, targetQuality);
      
      // Update model
      switch (modelType) {
        case ModelType.FACE_DETECTION:
          this.faceDetectionNet = result.model;
          break;
        case ModelType.FACE_RECOGNITION:
          this.faceRecognitionNet = result.model;
          break;
        case ModelType.FACE_LANDMARKS:
          this.faceLandmarkNet = result.model;
          break;
      }
      
      this.currentModelQualities.set(modelType, targetQuality);
      console.log(`Manually upgraded ${modelType} to ${targetQuality} model`);
    } catch (error) {
      console.error(`Failed to upgrade ${modelType} to ${targetQuality} model:`, error);
      throw error;
    }
  }

  /**
   * Detect faces in an image or video element with hardware optimizations
   */
  async detectFaces(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<FaceDetection[]> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    // Check if we need to downgrade model quality due to memory constraints
    await this.downgradeModelQualityIfNeeded(ModelType.FACE_DETECTION);

    const startTime = performance.now();
    let faces: FaceDetection[];

    // Use Web Worker if enabled
    if (this.options.useWebWorker && this.isWorkerInitialized) {
      faces = await this.detectFacesWithWorker(input);
    } else {
      // Use CPU optimization if enabled
      if (this.options.enableCPUOptimization) {
        faces = await this.queueOperation(() => this.detectFacesInternal(input));
      } else {
        faces = await this.detectFacesInternal(input);
      }
    }

    const processingTime = performance.now() - startTime;

    // Track performance
    this.trackPerformance(ModelType.FACE_DETECTION, processingTime, faces.length > 0 ? 1 : 0);

    // Check if we should upgrade model quality
    await this.upgradeModelQualityIfNeeded(ModelType.FACE_DETECTION);

    return faces;
  }

  /**
   * Detect faces using Web Worker
   */
  private async detectFacesWithWorker(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<FaceDetection[]> {
    try {
      // Convert canvas to image if needed
      let imageInput: HTMLImageElement | HTMLVideoElement;
      if (input instanceof HTMLCanvasElement) {
        imageInput = await this.canvasToImage(input);
      } else {
        imageInput = input;
      }
      
      const result = await faceWorkerManager.detectFaces(imageInput);
      
      // Handle frame skipping
      if (result.skipped) {
        return [];
      }
      
      return result.faces;
    } catch (error) {
      console.error('Worker face detection failed, falling back to main thread:', error);
      
      // Fallback to main thread
      if (this.options.enableCPUOptimization) {
        return this.queueOperation(() => this.detectFacesInternal(input));
      }
      
      return this.detectFacesInternal(input);
    }
  }

  /**
   * Internal face detection method
   */
  private async detectFacesInternal(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<FaceDetection[]> {
    try {
      let processedInput = input;
      
      // Optimize image for face recognition if image optimization is enabled
      if (this.options.enableImageOptimization) {
        const result = await imageProcessor.processImage(input);
        
        // Check if processing was skipped
        if (!result.skipped) {
          // Create a temporary image element from the processed canvas
          const tempImage = new Image();
          tempImage.src = result.processedImage.toDataURL();
          await new Promise(resolve => { tempImage.onload = resolve; });
          processedInput = tempImage;
        }
      } else if (this.options.enableMemoryOptimization) {
        // Fallback to legacy optimization
        const optimizedImage = FaceRecognitionOptimizer.optimizeImage(input);
        // Create a temporary image element from the canvas
        const tempImage = new Image();
        tempImage.src = optimizedImage.toDataURL();
        await new Promise(resolve => { tempImage.onload = resolve; });
        processedInput = tempImage;
      }
      
      return this.mockDetectFaces(processedInput);
    } catch (error) {
      console.error('Face detection failed:', error);
      throw new Error('Face detection failed');
    }
  }

  /**
   * Detect face landmarks with hardware optimizations
   */
  async detectFaceLandmarks(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    faceDetection: FaceDetection
  ): Promise<FaceLandmarks> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    // Use CPU optimization if enabled
    if (this.options.enableCPUOptimization) {
      return this.queueOperation(() => this.detectFaceLandmarksInternal(input, faceDetection));
    }

    return this.detectFaceLandmarksInternal(input, faceDetection);
  }

  /**
   * Internal face landmark detection method
   */
  private async detectFaceLandmarksInternal(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    faceDetection: FaceDetection
  ): Promise<FaceLandmarks> {
    try {
      let processedInput = input;
      
      // Optimize image for face recognition if image optimization is enabled
      if (this.options.enableImageOptimization) {
        const result = await imageProcessor.processImage(input);
        
        // Check if processing was skipped
        if (!result.skipped) {
          // Create a temporary image element from the processed canvas
          const tempImage = new Image();
          tempImage.src = result.processedImage.toDataURL();
          await new Promise(resolve => { tempImage.onload = resolve; });
          processedInput = tempImage;
        }
      } else if (this.options.enableMemoryOptimization) {
        // Fallback to legacy optimization
        const optimizedImage = FaceRecognitionOptimizer.optimizeImage(input);
        // Create a temporary image element from the canvas
        const tempImage = new Image();
        tempImage.src = optimizedImage.toDataURL();
        await new Promise(resolve => { tempImage.onload = resolve; });
        processedInput = tempImage;
      }
      
      return this.mockDetectFaceLandmarks(processedInput, faceDetection);
    } catch (error) {
      console.error('Face landmark detection failed:', error);
      throw new Error('Face landmark detection failed');
    }
  }

  /**
   * Detect face expressions with hardware optimizations
   */
  async detectFaceExpressions(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    faceDetection: FaceDetection
  ): Promise<FaceExpression> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    // Use CPU optimization if enabled
    if (this.options.enableCPUOptimization) {
      return this.queueOperation(() => this.detectFaceExpressionsInternal(input, faceDetection));
    }

    return this.detectFaceExpressionsInternal(input, faceDetection);
  }

  /**
   * Internal face expression detection method
   */
  private async detectFaceExpressionsInternal(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    faceDetection: FaceDetection
  ): Promise<FaceExpression> {
    try {
      let processedInput = input;
      
      // Optimize image for face recognition if image optimization is enabled
      if (this.options.enableImageOptimization) {
        const result = await imageProcessor.processImage(input);
        
        // Check if processing was skipped
        if (!result.skipped) {
          // Create a temporary image element from the processed canvas
          const tempImage = new Image();
          tempImage.src = result.processedImage.toDataURL();
          await new Promise(resolve => { tempImage.onload = resolve; });
          processedInput = tempImage;
        }
      } else if (this.options.enableMemoryOptimization) {
        // Fallback to legacy optimization
        const optimizedImage = FaceRecognitionOptimizer.optimizeImage(input);
        // Create a temporary image element from the canvas
        const tempImage = new Image();
        tempImage.src = optimizedImage.toDataURL();
        await new Promise(resolve => { tempImage.onload = resolve; });
        processedInput = tempImage;
      }
      
      return this.mockDetectFaceExpressions(processedInput, faceDetection);
    } catch (error) {
      console.error('Face expression detection failed:', error);
      throw new Error('Face expression detection failed');
    }
  }

  /**
   * Calculate face quality metrics with hardware optimizations
   */
  async calculateFaceQuality(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    faceDetection: FaceDetection
  ): Promise<FaceQualityMetrics> {
    // Use CPU optimization if enabled
    if (this.options.enableCPUOptimization) {
      return this.queueOperation(() => this.calculateFaceQualityInternal(input, faceDetection));
    }

    return this.calculateFaceQualityInternal(input, faceDetection);
  }

  /**
   * Internal face quality calculation method
   */
  private async calculateFaceQualityInternal(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    faceDetection: FaceDetection
  ): Promise<FaceQualityMetrics> {
    try {
      let processedInput = input;
      
      // Optimize image for face recognition if image optimization is enabled
      if (this.options.enableImageOptimization) {
        const result = await imageProcessor.processImage(input);
        
        // Check if processing was skipped
        if (!result.skipped) {
          // Create a temporary image element from the processed canvas
          const tempImage = new Image();
          tempImage.src = result.processedImage.toDataURL();
          await new Promise(resolve => { tempImage.onload = resolve; });
          processedInput = tempImage;
        }
      } else if (this.options.enableMemoryOptimization) {
        // Fallback to legacy optimization
        const optimizedImage = FaceRecognitionOptimizer.optimizeImage(input);
        // Create a temporary image element from the canvas
        const tempImage = new Image();
        tempImage.src = optimizedImage.toDataURL();
        await new Promise(resolve => { tempImage.onload = resolve; });
        processedInput = tempImage;
      }
      
      return this.mockCalculateFaceQuality(processedInput, faceDetection);
    } catch (error) {
      console.error('Face quality calculation failed:', error);
      throw new Error('Face quality calculation failed');
    }
  }

  /**
   * Generate face embedding with hardware optimizations
   */
  async generateFaceEmbedding(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    faceDetection: FaceDetection
  ): Promise<Float32Array> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    // Check if we need to downgrade model quality due to memory constraints
    await this.downgradeModelQualityIfNeeded(ModelType.FACE_RECOGNITION);

    const startTime = performance.now();
    let embedding: Float32Array;

    // Use Web Worker if enabled
    if (this.options.useWebWorker && this.isWorkerInitialized) {
      embedding = await this.generateFaceEmbeddingWithWorker(input);
    } else {
      // Use CPU optimization if enabled
      if (this.options.enableCPUOptimization) {
        embedding = await this.queueOperation(() => this.generateFaceEmbeddingInternal(input, faceDetection));
      } else {
        embedding = await this.generateFaceEmbeddingInternal(input, faceDetection);
      }
    }

    const processingTime = performance.now() - startTime;

    // Track performance (embedding generation is always successful if it completes)
    this.trackPerformance(ModelType.FACE_RECOGNITION, processingTime, 1);

    // Check if we should upgrade model quality
    await this.upgradeModelQualityIfNeeded(ModelType.FACE_RECOGNITION);

    return embedding;
  }

  /**
   * Generate face embedding using Web Worker
   */
  private async generateFaceEmbeddingWithWorker(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<Float32Array> {
    try {
      // Convert canvas to image if needed
      let imageInput: HTMLImageElement | HTMLVideoElement;
      if (input instanceof HTMLCanvasElement) {
        imageInput = await this.canvasToImage(input);
      } else {
        imageInput = input;
      }
      
      const result = await faceWorkerManager.generateEmbedding(imageInput);
      return result.embedding;
    } catch (error) {
      console.error('Worker embedding generation failed, falling back to main thread:', error);
      
      // Fallback to main thread
      const faceDetection = await this.detectFacesInternal(input);
      if (faceDetection.length === 0) {
        throw new Error('No faces detected for embedding generation');
      }
      
      if (this.options.enableCPUOptimization) {
        return this.queueOperation(() => this.generateFaceEmbeddingInternal(input, faceDetection[0]));
      }
      
      return this.generateFaceEmbeddingInternal(input, faceDetection[0]);
    }
  }

  /**
   * Internal face embedding generation method
   */
  private async generateFaceEmbeddingInternal(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    faceDetection: FaceDetection
  ): Promise<Float32Array> {
    try {
      let processedInput = input;
      
      // Optimize image for face recognition if image optimization is enabled
      if (this.options.enableImageOptimization) {
        const result = await imageProcessor.processImage(input);
        
        // Check if processing was skipped
        if (!result.skipped) {
          // Create a temporary image element from the processed canvas
          const tempImage = new Image();
          tempImage.src = result.processedImage.toDataURL();
          await new Promise(resolve => { tempImage.onload = resolve; });
          processedInput = tempImage;
        }
      } else if (this.options.enableMemoryOptimization) {
        // Fallback to legacy optimization
        const optimizedImage = FaceRecognitionOptimizer.optimizeImage(input);
        // Create a temporary image element from the canvas
        const tempImage = new Image();
        tempImage.src = optimizedImage.toDataURL();
        await new Promise(resolve => { tempImage.onload = resolve; });
        processedInput = tempImage;
      }
      
      const embedding = this.mockGenerateFaceEmbedding(processedInput, faceDetection);
      
      // Optimize embedding for memory usage
      if (this.options.enableMemoryOptimization) {
        return MemoryOptimizer.optimizeObject(embedding);
      }
      
      return embedding;
    } catch (error) {
      console.error('Face embedding generation failed:', error);
      throw new Error('Face embedding generation failed');
    }
  }

  /**
   * Match face against known embeddings with hardware optimizations
   */
  async matchFace(
    embedding: Float32Array,
    knownEmbeddings: FaceEmbedding[],
    threshold = 0.6
  ): Promise<{ userId: string; distance: number; confidence: number }[]> {
    // Use Web Worker if enabled
    if (this.options.useWebWorker && this.isWorkerInitialized) {
      return this.matchFaceWithWorker(embedding, knownEmbeddings, threshold);
    }

    // Use CPU optimization if enabled
    if (this.options.enableCPUOptimization) {
      return this.queueOperation(() => this.matchFaceInternal(embedding, knownEmbeddings, threshold));
    }

    return this.matchFaceInternal(embedding, knownEmbeddings, threshold);
  }

  /**
   * Match face embedding using Web Worker
   */
  private async matchFaceWithWorker(
    embedding: Float32Array,
    knownEmbeddings: FaceEmbedding[],
    threshold = 0.6
  ): Promise<{ userId: string; distance: number; confidence: number }[]> {
    try {
      const result = await faceWorkerManager.matchFaces(embedding, knownEmbeddings);
      return result.matches;
    } catch (error) {
      console.error('Worker face matching failed, falling back to main thread:', error);
      
      // Fallback to main thread
      if (this.options.enableCPUOptimization) {
        return this.queueOperation(() => this.matchFaceInternal(embedding, knownEmbeddings, threshold));
      }
      
      return this.matchFaceInternal(embedding, knownEmbeddings, threshold);
    }
  }

  /**
   * Internal face matching method
   */
  private async matchFaceInternal(
    embedding: Float32Array,
    knownEmbeddings: FaceEmbedding[],
    threshold = 0.6
  ): Promise<{ userId: string; distance: number; confidence: number }[]> {
    try {
      // Process in chunks if there are many known embeddings to prevent CPU overload
      if (this.options.enableCPUOptimization && knownEmbeddings.length > 50) {
        return CPUOptimizer.runInChunks(
          knownEmbeddings,
          25, // Process 25 embeddings at a time
          async (chunk) => {
            const matches: { userId: string; distance: number; confidence: number }[] = [];
            
            for (const knownEmbedding of chunk) {
              const distance = this.calculateEuclideanDistance(embedding, knownEmbedding.embedding);
              const confidence = 1 - Math.min(1, distance / threshold);
              
              if (distance <= threshold) {
                matches.push({
                  userId: knownEmbedding.userId,
                  distance,
                  confidence,
                });
              }
            }
            
            return matches;
          }
        ).then(results => {
          // Sort by confidence (highest first)
          return results.sort((a, b) => b.confidence - a.confidence);
        });
      }
      
      // Standard processing for smaller datasets
      const matches: { userId: string; distance: number; confidence: number }[] = [];

      for (const knownEmbedding of knownEmbeddings) {
        const distance = this.calculateEuclideanDistance(embedding, knownEmbedding.embedding);
        const confidence = 1 - Math.min(1, distance / threshold);
        
        if (distance <= threshold) {
          matches.push({
            userId: knownEmbedding.userId,
            distance,
            confidence,
          });
        }
      }

      // Sort by confidence (highest first)
      return matches.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Face matching failed:', error);
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
      console.error('Error processing operation queue:', error);
      this.isProcessing = false;
    }
  }

  /**
   * Calculate Euclidean distance between two embeddings
   */
  private calculateEuclideanDistance(embedding1: Float32Array, embedding2: Float32Array): number {
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
   * Mock model loading
   */
  private async mockLoadModels(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Face API models loaded');
        resolve();
      }, 1000);
    });
  }

  /**
   * Mock face detection
   */
  private mockDetectFaces(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): FaceDetection[] {
    // Simulate face detection with random data
    const faceCount = Math.floor(Math.random() * 2) + 1; // 1-2 faces
    
    return Array.from({ length: faceCount }, (_, i) => ({
      boundingBox: {
        x: Math.random() * 0.3,
        y: Math.random() * 0.3,
        width: 0.3 + Math.random() * 0.2,
        height: 0.3 + Math.random() * 0.2,
      },
      landmarks: Array.from({ length: 5 }, () => ({
        x: Math.random(),
        y: Math.random(),
      })),
      confidence: 0.8 + Math.random() * 0.2,
    }));
  }

  /**
   * Mock face landmark detection
   */
  private mockDetectFaceLandmarks(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    faceDetection: FaceDetection
  ): FaceLandmarks {
    // Generate mock landmarks
    const positions: FaceLandmark[] = Array.from({ length: 68 }, () => ({
      x: Math.random(),
      y: Math.random(),
    }));

    const contours: Record<string, FaceLandmark[]> = {
      jaw: positions.slice(0, 17),
      rightEyebrow: positions.slice(17, 22),
      leftEyebrow: positions.slice(22, 27),
      nose: positions.slice(27, 36),
      rightEye: positions.slice(36, 42),
      leftEye: positions.slice(42, 48),
      mouth: positions.slice(48, 68),
    };

    return { contours, positions };
  }

  /**
   * Mock face expression detection
   */
  private mockDetectFaceExpressions(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    faceDetection: FaceDetection
  ): FaceExpression {
    // Generate random expression probabilities that sum to 1
    const expressions = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];
    const values = Array.from({ length: expressions.length }, () => Math.random());
    const sum = values.reduce((a, b) => a + b, 0);
    const normalizedValues = values.map(v => v / sum);

    return {
      neutral: normalizedValues[0],
      happy: normalizedValues[1],
      sad: normalizedValues[2],
      angry: normalizedValues[3],
      fearful: normalizedValues[4],
      disgusted: normalizedValues[5],
      surprised: normalizedValues[6],
    };
  }

  /**
   * Mock face quality calculation
   */
  private mockCalculateFaceQuality(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    faceDetection: FaceDetection
  ): FaceQualityMetrics {
    // Generate random quality metrics
    const sharpness = 0.5 + Math.random() * 0.5;
    const brightness = 0.5 + Math.random() * 0.5;
    const contrast = 0.5 + Math.random() * 0.5;
    const lighting = 0.5 + Math.random() * 0.5;
    const pose = 0.5 + Math.random() * 0.5;
    const occlusion = Math.random() * 0.3; // Lower is better
    
    // Calculate overall quality as weighted average
    const overall = (
      sharpness * 0.2 +
      brightness * 0.15 +
      contrast * 0.15 +
      lighting * 0.2 +
      pose * 0.2 +
      (1 - occlusion) * 0.1
    );

    return {
      sharpness,
      brightness,
      contrast,
      lighting,
      pose,
      occlusion,
      overall,
    };
  }

  /**
   * Mock face embedding generation
   */
  private mockGenerateFaceEmbedding(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    faceDetection: FaceDetection
  ): Float32Array {
    // Generate a random embedding of fixed size
    const embeddingSize = 128; // Typical embedding size
    const embedding = new Float32Array(embeddingSize);
    
    for (let i = 0; i < embeddingSize; i++) {
      embedding[i] = Math.random() * 2 - 1; // Values between -1 and 1
    }
    
    return embedding;
  }

  /**
   * Check if models are loaded
   */
  isModelsLoaded(): boolean {
    return this.modelsLoaded;
  }

  /**
   * Get current options
   */
  getOptions(): FaceDetectionOptions {
    return { ...this.options };
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<FaceDetectionOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Release models from memory to free resources
   */
  async releaseModels(): Promise<void> {
    // Cleanup Web Worker if initialized
    if (this.options.useWebWorker && this.isWorkerInitialized) {
      try {
        await faceWorkerManager.cleanup();
        this.isWorkerInitialized = false;
      } catch (error) {
        console.error('Failed to cleanup face API worker:', error);
      }
    }
    
    // Release models from model loader
    Object.values(ModelType).forEach(type => {
      const quality = this.currentModelQualities.get(type);
      if (quality) {
        modelLoader.releaseModel(type, quality);
      }
    });
    
    if (this.options.enableMemoryOptimization) {
      FaceRecognitionOptimizer.releaseModel();
    }
    
    this.faceDetectionNet = null;
    this.faceLandmarkNet = null;
    this.faceRecognitionNet = null;
    this.modelsLoaded = false;
    
    // Clear processing queue
    this.processingQueue = [];
    this.isProcessing = false;
    
    // Clear model quality tracking
    this.currentModelQualities.forEach((_, type) => {
      this.currentModelQualities.set(type, null);
    });
    
    // Clear performance history
    this.performanceHistory.forEach((_, type) => {
      this.performanceHistory.set(type, []);
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
        console.error('Failed to get worker performance metrics:', error);
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
          this.options.scoreThreshold = config.detectionThreshold;
        }
        if (config.maxFacesToDetect !== undefined) {
          this.options.maxFaces = config.maxFacesToDetect;
        }
        
        // Update worker config in options
        this.options.workerConfig = { ...this.options.workerConfig, ...config };
      } catch (error) {
        console.error('Failed to update worker config:', error);
        throw error;
      }
    }
  }

  /**
   * Convert canvas to image element
   */
  private canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = canvas.toDataURL();
    });
  }
}

// Singleton instance with hardware optimizations enabled by default
export const faceAPI = new FaceAPI({
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
});