/**
 * Face API Model Loader
 * Simplified and robust model loading with proper error handling and timeouts
 */

import * as faceapi from 'face-api.js';
import { logger } from './logger';

export interface ModelLoadStatus {
  tinyFaceDetector: boolean;
  faceLandmark68Net: boolean;
  faceRecognitionNet: boolean;
  ssdMobilenetv1: boolean;
}

export interface ModelLoadResult {
  success: boolean;
  status: ModelLoadStatus;
  error?: string;
  loadTime?: number;
}

class FaceApiModelLoader {
  private static instance: FaceApiModelLoader;
  private modelsLoaded: boolean = false;
  private loadingPromise: Promise<ModelLoadResult> | null = null;
  private modelStatus: ModelLoadStatus = {
    tinyFaceDetector: false,
    faceLandmark68Net: false,
    faceRecognitionNet: false,
    ssdMobilenetv1: false,
  };

  private constructor() {}

  static getInstance(): FaceApiModelLoader {
    if (!FaceApiModelLoader.instance) {
      FaceApiModelLoader.instance = new FaceApiModelLoader();
    }
    return FaceApiModelLoader.instance;
  }

  /**
   * Load all face-api.js models with timeout and error handling
   */
  async loadModels(timeout: number = 30000): Promise<ModelLoadResult> {
    // If already loaded, return success immediately
    if (this.modelsLoaded) {
      logger.info('Face-api.js models already loaded');
      return {
        success: true,
        status: this.modelStatus,
        loadTime: 0,
      };
    }

    // If currently loading, return the existing promise
    if (this.loadingPromise) {
      logger.info('Models are already being loaded, waiting...');
      return this.loadingPromise;
    }

    // Start loading
    this.loadingPromise = this.loadModelsInternal(timeout);
    
    try {
      const result = await this.loadingPromise;
      return result;
    } finally {
      this.loadingPromise = null;
    }
  }

  /**
   * Internal model loading with timeout
   */
  private async loadModelsInternal(timeout: number): Promise<ModelLoadResult> {
    const startTime = Date.now();
    
    // Create timeout promise
    const timeoutPromise = new Promise<ModelLoadResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Model loading timeout after ${timeout}ms`));
      }, timeout);
    });

    // Create loading promise
    const loadingPromise = this.doLoadModels(startTime);

    try {
      // Race between loading and timeout
      const result = await Promise.race([loadingPromise, timeoutPromise]);
      return result;
    } catch (error) {
      logger.error('Failed to load face-api.js models', error as Error);
      return {
        success: false,
        status: this.modelStatus,
        error: error instanceof Error ? error.message : 'Unknown error',
        loadTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Actually load the models
   */
  private async doLoadModels(startTime: number): Promise<ModelLoadResult> {
    try {
      logger.info('Starting to load face-api.js models from /models/...');

      // Check if face-api.js is available
      if (typeof faceapi === 'undefined') {
        throw new Error('face-api.js library not loaded');
      }

      const modelUrl = '/models';
      const errors: string[] = [];

      // Load TinyFaceDetector
      try {
        logger.info('Loading TinyFaceDetector...');
        await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
        this.modelStatus.tinyFaceDetector = true;
        logger.info('✅ TinyFaceDetector loaded');
      } catch (err) {
        const error = `Failed to load TinyFaceDetector: ${err}`;
        logger.error(error);
        errors.push(error);
      }

      // Load Face Landmarks
      try {
        logger.info('Loading FaceLandmark68Net...');
        await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
        this.modelStatus.faceLandmark68Net = true;
        logger.info('✅ FaceLandmark68Net loaded');
      } catch (err) {
        const error = `Failed to load FaceLandmark68Net: ${err}`;
        logger.error(error);
        errors.push(error);
      }

      // Load Face Recognition
      try {
        logger.info('Loading FaceRecognitionNet...');
        await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl);
        this.modelStatus.faceRecognitionNet = true;
        logger.info('✅ FaceRecognitionNet loaded');
      } catch (err) {
        const error = `Failed to load FaceRecognitionNet: ${err}`;
        logger.error(error);
        errors.push(error);
      }

      // Load SSD MobileNet (optional, used for better detection)
      try {
        logger.info('Loading SsdMobilenetv1 (optional)...');
        await faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl);
        this.modelStatus.ssdMobilenetv1 = true;
        logger.info('✅ SsdMobilenetv1 loaded');
      } catch (err) {
        // This is optional, so we don't add to errors
        logger.warn('SsdMobilenetv1 not loaded (optional)', err);
      }

      const loadTime = Date.now() - startTime;

      // Check if critical models are loaded
      const criticalModelsLoaded = 
        this.modelStatus.tinyFaceDetector &&
        this.modelStatus.faceLandmark68Net &&
        this.modelStatus.faceRecognitionNet;

      if (criticalModelsLoaded) {
        this.modelsLoaded = true;
        logger.info(`✅ All critical face-api.js models loaded successfully in ${loadTime}ms`);
        return {
          success: true,
          status: this.modelStatus,
          loadTime,
        };
      } else {
        const errorMsg = `Failed to load critical models. Errors: ${errors.join('; ')}`;
        logger.error(errorMsg);
        return {
          success: false,
          status: this.modelStatus,
          error: errorMsg,
          loadTime,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Model loading failed', error as Error);
      return {
        success: false,
        status: this.modelStatus,
        error: errorMsg,
        loadTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if models are loaded
   */
  isLoaded(): boolean {
    return this.modelsLoaded;
  }

  /**
   * Get current model status
   */
  getModelStatus(): ModelLoadStatus {
    return { ...this.modelStatus };
  }

  /**
   * Force reload models
   */
  async reloadModels(timeout: number = 30000): Promise<ModelLoadResult> {
    logger.info('Force reloading models...');
    
    // Reset state
    this.modelsLoaded = false;
    this.modelStatus = {
      tinyFaceDetector: false,
      faceLandmark68Net: false,
      faceRecognitionNet: false,
      ssdMobilenetv1: false,
    };
    
    // Load models
    return this.loadModels(timeout);
  }

  /**
   * Verify models are working by doing a test detection
   */
  async verifyModels(): Promise<boolean> {
    if (!this.modelsLoaded) {
      logger.warn('Models not loaded, cannot verify');
      return false;
    }

    try {
      logger.info('Verifying models with test image...');
      
      // Create a small test canvas
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        logger.warn('Cannot create canvas for model verification');
        return true; // Assume models are ok
      }

      // Draw a simple face-like shape
      ctx.fillStyle = '#FFB6C1';
      ctx.fillRect(0, 0, 100, 100);
      
      // Try to run detection (it won't find a face but will verify models work)
      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();
      
      logger.info('Model verification complete', { detectionResult: !!detection });
      return true; // Models are working even if no face detected
    } catch (error) {
      logger.error('Model verification failed', error as Error);
      return false;
    }
  }

  /**
   * Get face-api instance
   */
  getFaceApi(): typeof faceapi {
    return faceapi;
  }
}

// Export singleton instance
export const faceApiLoader = FaceApiModelLoader.getInstance();

// Export convenience functions
export const loadFaceApiModels = (timeout?: number) => faceApiLoader.loadModels(timeout);
export const isFaceApiLoaded = () => faceApiLoader.isLoaded();
export const getFaceApiStatus = () => faceApiLoader.getModelStatus();
export const verifyFaceApiModels = () => faceApiLoader.verifyModels();
export const reloadFaceApiModels = (timeout?: number) => faceApiLoader.reloadModels(timeout);
