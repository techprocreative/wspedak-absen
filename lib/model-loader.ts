/**
 * Progressive Model Loader
 * Implements progressive loading of face recognition models with lightweight fallbacks
 * Optimized for DS223J hardware constraints
 */

// Model types
export enum ModelType {
  FACE_DETECTION = 'face-detection',
  FACE_LANDMARKS = 'face-landmarks',
  FACE_RECOGNITION = 'face-recognition',
  FACE_EXPRESSIONS = 'face-expressions',
}

// Model quality levels
export enum ModelQuality {
  LIGHTWEIGHT = 'lightweight',   // Fast, low accuracy, low memory
  STANDARD = 'standard',         // Balanced performance
  HIGH = 'high',                 // High accuracy, high memory
}

// Model configuration interface
export interface ModelConfig {
  type: ModelType;
  quality: ModelQuality;
  path: string;
  size: number;                  // Approximate model size in MB
  accuracy: number;              // Accuracy score (0-1)
  memoryUsage: number;           // Approximate memory usage in MB
  loadTime: number;              // Approximate load time in ms
}

// Model loading options interface
export interface ModelLoadingOptions {
  quality?: ModelQuality;
  enableProgressiveLoading?: boolean;
  enableCache?: boolean;
  maxConcurrentLoads?: number;
  timeout?: number;
}

// Model loading progress interface
export interface ModelLoadingProgress {
  type: ModelType;
  quality: ModelQuality;
  loaded: number;
  total: number;
  percentage: number;
}

// Model loading result interface
export interface ModelLoadingResult {
  type: ModelType;
  quality: ModelQuality;
  model: any;
  loadTime: number;
  memoryUsage: number;
}

// Model cache interface
interface ModelCache {
  [key: string]: {
    model: any;
    loadTime: number;
    timestamp: number;
  };
}

// Default model configurations
const DEFAULT_MODEL_CONFIGS: Record<ModelType, Record<ModelQuality, ModelConfig>> = {
  [ModelType.FACE_DETECTION]: {
    [ModelQuality.LIGHTWEIGHT]: {
      type: ModelType.FACE_DETECTION,
      quality: ModelQuality.LIGHTWEIGHT,
      path: '/models/face-detection-lightweight.tflite',
      size: 0.5,          // 0.5 MB
      accuracy: 0.75,      // 75% accuracy
      memoryUsage: 10,     // 10 MB
      loadTime: 500,       // 500ms
    },
    [ModelQuality.STANDARD]: {
      type: ModelType.FACE_DETECTION,
      quality: ModelQuality.STANDARD,
      path: '/models/face-detection-standard.tflite',
      size: 2.0,          // 2 MB
      accuracy: 0.85,      // 85% accuracy
      memoryUsage: 30,     // 30 MB
      loadTime: 1500,      // 1.5s
    },
    [ModelQuality.HIGH]: {
      type: ModelType.FACE_DETECTION,
      quality: ModelQuality.HIGH,
      path: '/models/face-detection-high.tflite',
      size: 5.0,          // 5 MB
      accuracy: 0.95,      // 95% accuracy
      memoryUsage: 60,     // 60 MB
      loadTime: 3000,      // 3s
    },
  },
  [ModelType.FACE_LANDMARKS]: {
    [ModelQuality.LIGHTWEIGHT]: {
      type: ModelType.FACE_LANDMARKS,
      quality: ModelQuality.LIGHTWEIGHT,
      path: '/models/face-landmarks-lightweight.tflite',
      size: 0.3,          // 0.3 MB
      accuracy: 0.80,      // 80% accuracy
      memoryUsage: 8,      // 8 MB
      loadTime: 300,       // 300ms
    },
    [ModelQuality.STANDARD]: {
      type: ModelType.FACE_LANDMARKS,
      quality: ModelQuality.STANDARD,
      path: '/models/face-landmarks-standard.tflite',
      size: 1.5,          // 1.5 MB
      accuracy: 0.90,      // 90% accuracy
      memoryUsage: 20,     // 20 MB
      loadTime: 1000,      // 1s
    },
    [ModelQuality.HIGH]: {
      type: ModelType.FACE_LANDMARKS,
      quality: ModelQuality.HIGH,
      path: '/models/face-landmarks-high.tflite',
      size: 3.0,          // 3 MB
      accuracy: 0.98,      // 98% accuracy
      memoryUsage: 40,     // 40 MB
      loadTime: 2000,      // 2s
    },
  },
  [ModelType.FACE_RECOGNITION]: {
    [ModelQuality.LIGHTWEIGHT]: {
      type: ModelType.FACE_RECOGNITION,
      quality: ModelQuality.LIGHTWEIGHT,
      path: '/models/face-recognition-lightweight.tflite',
      size: 1.0,          // 1 MB
      accuracy: 0.75,      // 75% accuracy
      memoryUsage: 15,     // 15 MB
      loadTime: 800,       // 800ms
    },
    [ModelQuality.STANDARD]: {
      type: ModelType.FACE_RECOGNITION,
      quality: ModelQuality.STANDARD,
      path: '/models/face-recognition-standard.tflite',
      size: 4.0,          // 4 MB
      accuracy: 0.90,      // 90% accuracy
      memoryUsage: 50,     // 50 MB
      loadTime: 2500,      // 2.5s
    },
    [ModelQuality.HIGH]: {
      type: ModelType.FACE_RECOGNITION,
      quality: ModelQuality.HIGH,
      path: '/models/face-recognition-high.tflite',
      size: 10.0,         // 10 MB
      accuracy: 0.98,      // 98% accuracy
      memoryUsage: 100,    // 100 MB
      loadTime: 5000,      // 5s
    },
  },
  [ModelType.FACE_EXPRESSIONS]: {
    [ModelQuality.LIGHTWEIGHT]: {
      type: ModelType.FACE_EXPRESSIONS,
      quality: ModelQuality.LIGHTWEIGHT,
      path: '/models/face-expressions-lightweight.tflite',
      size: 0.4,          // 0.4 MB
      accuracy: 0.70,      // 70% accuracy
      memoryUsage: 10,     // 10 MB
      loadTime: 400,       // 400ms
    },
    [ModelQuality.STANDARD]: {
      type: ModelType.FACE_EXPRESSIONS,
      quality: ModelQuality.STANDARD,
      path: '/models/face-expressions-standard.tflite',
      size: 1.5,          // 1.5 MB
      accuracy: 0.85,      // 85% accuracy
      memoryUsage: 25,     // 25 MB
      loadTime: 1200,      // 1.2s
    },
    [ModelQuality.HIGH]: {
      type: ModelType.FACE_EXPRESSIONS,
      quality: ModelQuality.HIGH,
      path: '/models/face-expressions-high.tflite',
      size: 3.5,          // 3.5 MB
      accuracy: 0.95,      // 95% accuracy
      memoryUsage: 50,     // 50 MB
      loadTime: 2500,      // 2.5s
    },
  },
};

// Progressive Model Loader class
export class ProgressiveModelLoader {
  private cache: ModelCache = {};
  private loadingPromises: Map<string, Promise<any>> = new Map();
  private progressCallbacks: Map<string, (progress: ModelLoadingProgress) => void> = new Map();
  private options: ModelLoadingOptions;
  private loadedModels: Map<ModelType, Map<ModelQuality, any>> = new Map();
  private isMemoryCritical = false;

  constructor(options: ModelLoadingOptions = {}) {
    this.options = {
      quality: ModelQuality.STANDARD,
      enableProgressiveLoading: true,
      enableCache: true,
      maxConcurrentLoads: 2,
      timeout: 30000,      // 30 seconds
      ...options,
    };

    // Initialize loaded models map
    Object.values(ModelType).forEach(type => {
      this.loadedModels.set(type, new Map());
    });

    // Monitor memory usage
    this.monitorMemoryUsage();
  }

  /**
   * Load a model with progressive loading support
   */
  async loadModel(
    type: ModelType,
    quality: ModelQuality = this.options.quality!
  ): Promise<ModelLoadingResult> {
    const cacheKey = this.getCacheKey(type, quality);

    // Check if model is already loaded
    if (this.loadedModels.get(type)?.has(quality)) {
      const model = this.loadedModels.get(type)!.get(quality)!;
      return {
        type,
        quality,
        model,
        loadTime: 0,
        memoryUsage: DEFAULT_MODEL_CONFIGS[type][quality].memoryUsage,
      };
    }

    // Check cache
    if (this.options.enableCache && this.cache[cacheKey]) {
      const cachedModel = this.cache[cacheKey];
      this.loadedModels.get(type)!.set(quality, cachedModel.model);
      return {
        type,
        quality,
        model: cachedModel.model,
        loadTime: cachedModel.loadTime,
        memoryUsage: DEFAULT_MODEL_CONFIGS[type][quality].memoryUsage,
      };
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      const model = await this.loadingPromises.get(cacheKey)!;
      return {
        type,
        quality,
        model,
        loadTime: 0, // Already accounted for in the original load
        memoryUsage: DEFAULT_MODEL_CONFIGS[type][quality].memoryUsage,
      };
    }

    // Load model
    const loadPromise = this.loadModelInternal(type, quality);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const model = await loadPromise;
      this.loadedModels.get(type)!.set(quality, model);
      
      // Cache the model
      if (this.options.enableCache) {
        this.cache[cacheKey] = {
          model,
          loadTime: DEFAULT_MODEL_CONFIGS[type][quality].loadTime,
          timestamp: Date.now(),
        };
      }

      return {
        type,
        quality,
        model,
        loadTime: DEFAULT_MODEL_CONFIGS[type][quality].loadTime,
        memoryUsage: DEFAULT_MODEL_CONFIGS[type][quality].memoryUsage,
      };
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Load multiple models with progressive loading
   */
  async loadModels(
    models: Array<{ type: ModelType; quality?: ModelQuality }>
  ): Promise<ModelLoadingResult[]> {
    if (!this.options.enableProgressiveLoading) {
      // Load models sequentially
      const results: ModelLoadingResult[] = [];
      for (const model of models) {
        const result = await this.loadModel(model.type, model.quality);
        results.push(result);
      }
      return results;
    }

    // Load models progressively based on memory constraints
    const sortedModels = this.sortModelsByPriority(models);
    const results: ModelLoadingResult[] = [];
    const concurrentLoads: Promise<ModelLoadingResult>[] = [];
    
    for (const model of sortedModels) {
      const quality = model.quality || this.options.quality!;
      
      // Check memory constraints
      if (this.isMemoryCritical) {
        // Use lightweight model if memory is critical
        const lightweightResult = await this.loadModel(model.type, ModelQuality.LIGHTWEIGHT);
        results.push(lightweightResult);
        continue;
      }
      
      // Add to concurrent loads if within limit
      if (concurrentLoads.length < this.options.maxConcurrentLoads!) {
        const loadPromise = this.loadModel(model.type, quality);
        concurrentLoads.push(loadPromise);
      } else {
        // Wait for one to complete before adding another
        const resultIndex = await Promise.race(
          concurrentLoads.map(async (p, i) => {
            await p;
            return i;
          })
        );
        const resultPromise = concurrentLoads[resultIndex];
        const result = await resultPromise;
        results.push(result);
        
        // Remove the completed promise
        concurrentLoads.splice(resultIndex, 1);
        
        // Add the new model
        const loadPromise = this.loadModel(model.type, quality);
        concurrentLoads.push(loadPromise);
      }
    }
    
    // Wait for remaining loads
    const remainingResults = await Promise.all(concurrentLoads);
    results.push(...remainingResults);
    
    return results;
  }

  /**
   * Get a loaded model
   */
  getModel(type: ModelType, quality: ModelQuality = this.options.quality!): any | null {
    return this.loadedModels.get(type)?.get(quality) || null;
  }

  /**
   * Get the best available model for a type
   */
  getBestModel(type: ModelType): any | null {
    const models = this.loadedModels.get(type);
    if (!models || models.size === 0) {
      return null;
    }
    
    // Prefer high quality, then standard, then lightweight
    if (models.has(ModelQuality.HIGH)) {
      return models.get(ModelQuality.HIGH);
    }
    if (models.has(ModelQuality.STANDARD)) {
      return models.get(ModelQuality.STANDARD);
    }
    return models.get(ModelQuality.LIGHTWEIGHT);
  }

  /**
   * Release a model from memory
   */
  releaseModel(type: ModelType, quality: ModelQuality): void {
    const models = this.loadedModels.get(type);
    if (models && models.has(quality)) {
      models.delete(quality);
    }
  }

  /**
   * Release all models from memory
   */
  releaseAllModels(): void {
    this.loadedModels.forEach(models => models.clear());
    this.cache = {};
  }

  /**
   * Clear model cache
   */
  clearCache(): void {
    this.cache = {};
  }

  /**
   * Get model configuration
   */
  getModelConfig(type: ModelType, quality: ModelQuality): ModelConfig {
    return DEFAULT_MODEL_CONFIGS[type][quality];
  }

  /**
   * Get all model configurations
   */
  getAllModelConfigs(): Record<ModelType, Record<ModelQuality, ModelConfig>> {
    return DEFAULT_MODEL_CONFIGS;
  }

  /**
   * Add a progress callback for model loading
   */
  addProgressCallback(
    type: ModelType,
    quality: ModelQuality,
    callback: (progress: ModelLoadingProgress) => void
  ): void {
    const key = this.getCacheKey(type, quality);
    this.progressCallbacks.set(key, callback);
  }

  /**
   * Remove a progress callback
   */
  removeProgressCallback(type: ModelType, quality: ModelQuality): void {
    const key = this.getCacheKey(type, quality);
    this.progressCallbacks.delete(key);
  }

  /**
   * Internal method to load a model
   */
  private async loadModelInternal(
    type: ModelType,
    quality: ModelQuality
  ): Promise<any> {
    const config = DEFAULT_MODEL_CONFIGS[type][quality];
    const cacheKey = this.getCacheKey(type, quality);
    
    // Simulate model loading with progress
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let loaded = 0;
      
      // Simulate loading progress
      const progressInterval = setInterval(() => {
        loaded += Math.random() * 20;
        const percentage = Math.min(100, (loaded / config.size) * 100);
        
        // Notify progress callbacks
        const callback = this.progressCallbacks.get(cacheKey);
        if (callback) {
          callback({
            type,
            quality,
            loaded: Math.min(config.size, loaded),
            total: config.size,
            percentage,
          });
        }
        
        if (loaded >= config.size) {
          clearInterval(progressInterval);
          
          // Create mock model
          const model = {
            type,
            quality,
            accuracy: config.accuracy,
            memoryUsage: config.memoryUsage,
            loadTime: Date.now() - startTime,
            // Mock model methods
            detect: (input: any) => ({ confidence: Math.random(), boundingBox: {} }),
            recognize: (input: any) => ({ userId: 'user-123', confidence: Math.random() }),
            generateEmbedding: (input: any) => new Float32Array(128),
          };
          
          resolve(model);
        }
      }, 100);
      
      // Set timeout
      setTimeout(() => {
        clearInterval(progressInterval);
        reject(new Error(`Model loading timed out: ${type} ${quality}`));
      }, this.options.timeout);
    });
  }

  /**
   * Sort models by priority for progressive loading
   */
  private sortModelsByPriority(
    models: Array<{ type: ModelType; quality?: ModelQuality }>
  ): Array<{ type: ModelType; quality?: ModelQuality }> {
    // Priority order: face detection > face recognition > face landmarks > face expressions
    const priorityOrder = {
      [ModelType.FACE_DETECTION]: 1,
      [ModelType.FACE_RECOGNITION]: 2,
      [ModelType.FACE_LANDMARKS]: 3,
      [ModelType.FACE_EXPRESSIONS]: 4,
    };
    
    return models.sort((a, b) => {
      const priorityA = priorityOrder[a.type];
      const priorityB = priorityOrder[b.type];
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same type, prioritize lightweight models
      const qualityA = a.quality || this.options.quality!;
      const qualityB = b.quality || this.options.quality!;
      
      const qualityOrder = {
        [ModelQuality.LIGHTWEIGHT]: 1,
        [ModelQuality.STANDARD]: 2,
        [ModelQuality.HIGH]: 3,
      };
      
      return qualityOrder[qualityA] - qualityOrder[qualityB];
    });
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedMemory = memory.usedJSHeapSize / 1024 / 1024; // MB
        const totalMemory = memory.totalJSHeapSize / 1024 / 1024; // MB
        
        // Consider memory critical if using more than 80% of available memory
        this.isMemoryCritical = usedMemory / totalMemory > 0.8;
        
        // If memory is critical, release high-quality models
        if (this.isMemoryCritical) {
          this.releaseHighQualityModels();
        }
      }, 5000); // Check every 5 seconds
    }
  }

  /**
   * Release high-quality models when memory is critical
   */
  private releaseHighQualityModels(): void {
    this.loadedModels.forEach((models, type) => {
      if (models.has(ModelQuality.HIGH)) {
        console.log(`Releasing high-quality model for ${type} due to memory constraints`);
        models.delete(ModelQuality.HIGH);
      }
    });
  }

  /**
   * Get cache key for a model
   */
  private getCacheKey(type: ModelType, quality: ModelQuality): string {
    return `${type}-${quality}`;
  }
}

// Create singleton instance
export const modelLoader = new ProgressiveModelLoader({
  quality: ModelQuality.STANDARD,
  enableProgressiveLoading: true,
  enableCache: true,
  maxConcurrentLoads: 2,
  timeout: 30000,
});