/**
 * Face Recognition Web Worker
 * Handles intensive face recognition operations in a separate thread
 * Optimized for DS223J hardware constraints
 */

// Import scripts for face recognition (in a real implementation)
// importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest');
// importScripts('https://cdn.jsdelivr.net/npm/@tensorflow-models/face-detection@latest');
// importScripts('https://cdn.jsdelivr.net/npm/@tensorflow-models/face-landmarks-detection@latest');

// Worker state
let isInitialized = false;
let model = null;
let config = {
  maxDetectionSize: 640,
  detectionThreshold: 0.7,
  recognitionThreshold: 0.8,
  maxFacesToDetect: 5,
  enableMemoryOptimization: true,
  processingInterval: 100, // ms between processing frames
};

// Performance monitoring
let performanceMetrics = {
  totalProcessed: 0,
  totalProcessingTime: 0,
  averageProcessingTime: 0,
  memoryUsage: 0,
  lastCleanupTime: 0,
};

// Frame skipping for video processing
let frameSkipCount = 0;
let maxFrameSkip = 2; // Process every 3rd frame on low-end devices

// Message handler
self.addEventListener('message', async (event) => {
  const { type, data, id } = event.data;
  
  try {
    switch (type) {
      case 'INIT':
        await handleInit(data, id);
        break;
      case 'DETECT_FACES':
        await handleDetectFaces(data, id);
        break;
      case 'RECOGNIZE_FACE':
        await handleRecognizeFace(data, id);
        break;
      case 'GENERATE_EMBEDDING':
        await handleGenerateEmbedding(data, id);
        break;
      case 'MATCH_FACES':
        await handleMatchFaces(data, id);
        break;
      case 'UPDATE_CONFIG':
        handleUpdateConfig(data, id);
        break;
      case 'GET_PERFORMANCE_METRICS':
        handleGetPerformanceMetrics(id);
        break;
      case 'CLEANUP':
        handleCleanup(id);
        break;
      default:
        sendError(id, `Unknown message type: ${type}`);
    }
  } catch (error) {
    sendError(id, error.message);
  }
});

/**
 * Initialize the face recognition model
 */
async function handleInit(data, id) {
  if (isInitialized) {
    sendResponse(id, { success: true, message: 'Already initialized' });
    return;
  }

  try {
    // Update config with provided data
    if (data.config) {
      config = { ...config, ...data.config };
    }

    // Simulate model loading (in real implementation, load actual models)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Initialize mock model
    model = {
      detect: mockDetectFaces,
      recognize: mockRecognizeFace,
      generateEmbedding: mockGenerateEmbedding,
    };

    isInitialized = true;
    
    // Update performance metrics
    performanceMetrics.lastCleanupTime = Date.now();
    
    sendResponse(id, { 
      success: true, 
      message: 'Face recognition worker initialized',
      config,
    });
  } catch (error) {
    sendError(id, `Initialization failed: ${error.message}`);
  }
}

/**
 * Detect faces in an image
 */
async function handleDetectFaces(data, id) {
  if (!isInitialized) {
    sendError(id, 'Worker not initialized');
    return;
  }

  const startTime = performance.now();
  
  try {
    // Frame skipping logic
    frameSkipCount++;
    if (frameSkipCount <= maxFrameSkip) {
      sendResponse(id, { 
        faces: [], 
        skipped: true,
        message: `Frame skipped (${frameSkipCount}/${maxFrameSkip})`,
      });
      return;
    }
    
    frameSkipCount = 0;

    // Optimize image if needed
    const optimizedImageData = optimizeImageData(data.imageData);
    
    // Detect faces
    const faces = await model.detect(optimizedImageData);
    
    // Apply quality-based filtering
    const filteredFaces = applyQualityFilter(faces);
    
    // Update performance metrics
    const processingTime = performance.now() - startTime;
    updatePerformanceMetrics(processingTime);
    
    // Memory cleanup if needed
    if (config.enableMemoryOptimization && shouldCleanup()) {
      performMemoryCleanup();
    }
    
    sendResponse(id, { 
      faces: filteredFaces,
      processingTime,
      metrics: getPerformanceMetrics(),
    });
  } catch (error) {
    sendError(id, `Face detection failed: ${error.message}`);
  }
}

/**
 * Recognize a face
 */
async function handleRecognizeFace(data, id) {
  if (!isInitialized) {
    sendError(id, 'Worker not initialized');
    return;
  }

  const startTime = performance.now();
  
  try {
    const { faceImageData, knownFaces } = data;
    
    // Optimize image
    const optimizedImageData = optimizeImageData(faceImageData);
    
    // Generate embedding
    const embedding = await model.generateEmbedding(optimizedImageData);
    
    // Match against known faces
    const matches = matchFace(embedding, knownFaces);
    
    // Update performance metrics
    const processingTime = performance.now() - startTime;
    updatePerformanceMetrics(processingTime);
    
    sendResponse(id, { 
      matches,
      embedding,
      processingTime,
      metrics: getPerformanceMetrics(),
    });
  } catch (error) {
    sendError(id, `Face recognition failed: ${error.message}`);
  }
}

/**
 * Generate face embedding
 */
async function handleGenerateEmbedding(data, id) {
  if (!isInitialized) {
    sendError(id, 'Worker not initialized');
    return;
  }

  const startTime = performance.now();
  
  try {
    const optimizedImageData = optimizeImageData(data.imageData);
    const embedding = await model.generateEmbedding(optimizedImageData);
    
    // Update performance metrics
    const processingTime = performance.now() - startTime;
    updatePerformanceMetrics(processingTime);
    
    sendResponse(id, { 
      embedding,
      processingTime,
      metrics: getPerformanceMetrics(),
    });
  } catch (error) {
    sendError(id, `Embedding generation failed: ${error.message}`);
  }
}

/**
 * Match faces against known embeddings
 */
async function handleMatchFaces(data, id) {
  if (!isInitialized) {
    sendError(id, 'Worker not initialized');
    return;
  }

  const startTime = performance.now();
  
  try {
    const { embedding, knownFaces } = data;
    const matches = matchFace(embedding, knownFaces);
    
    // Update performance metrics
    const processingTime = performance.now() - startTime;
    updatePerformanceMetrics(processingTime);
    
    sendResponse(id, { 
      matches,
      processingTime,
      metrics: getPerformanceMetrics(),
    });
  } catch (error) {
    sendError(id, `Face matching failed: ${error.message}`);
  }
}

/**
 * Update worker configuration
 */
function handleUpdateConfig(data, id) {
  config = { ...config, ...data };
  
  // Update frame skipping based on performance
  if (config.adaptiveQuality) {
    const avgTime = performanceMetrics.averageProcessingTime;
    if (avgTime > 200) { // If processing is slow
      maxFrameSkip = Math.min(maxFrameSkip + 1, 5);
    } else if (avgTime < 50) { // If processing is fast
      maxFrameSkip = Math.max(maxFrameSkip - 1, 0);
    }
  }
  
  sendResponse(id, { config, maxFrameSkip });
}

/**
 * Get performance metrics
 */
function handleGetPerformanceMetrics(id) {
  sendResponse(id, { metrics: getPerformanceMetrics() });
}

/**
 * Cleanup resources
 */
function handleCleanup(id) {
  try {
    // Clear model
    model = null;
    isInitialized = false;
    
    // Reset metrics
    performanceMetrics = {
      totalProcessed: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      memoryUsage: 0,
      lastCleanupTime: Date.now(),
    };
    
    // Force garbage collection if available
    if (typeof gc === 'function') {
      gc();
    }
    
    sendResponse(id, { success: true, message: 'Worker cleaned up' });
  } catch (error) {
    sendError(id, `Cleanup failed: ${error.message}`);
  }
}

/**
 * Optimize image data for processing
 */
function optimizeImageData(imageData) {
  // In a real implementation, this would resize and optimize the image
  // For now, just return the original data
  return imageData;
}

/**
 * Apply quality-based filtering to detected faces
 */
function applyQualityFilter(faces) {
  return faces.filter(face => {
    // Filter by confidence threshold
    if (face.confidence < config.detectionThreshold) {
      return false;
    }
    
    // Filter by quality metrics if available
    if (face.quality && face.quality.overall < 0.5) {
      return false;
    }
    
    return true;
  }).slice(0, config.maxFacesToDetect);
}

/**
 * Match face embedding against known faces
 */
function matchFace(embedding, knownFaces) {
  const matches = [];
  
  for (const knownFace of knownFaces) {
    const distance = calculateDistance(embedding, knownFace.embedding);
    const confidence = distanceToConfidence(distance);
    
    if (confidence >= config.recognitionThreshold) {
      matches.push({
        userId: knownFace.userId,
        confidence,
        distance,
        faceId: knownFace.id,
      });
    }
  }
  
  // Sort by confidence (highest first)
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate Euclidean distance between embeddings
 */
function calculateDistance(embedding1, embedding2) {
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
 * Convert distance to confidence score
 */
function distanceToConfidence(distance) {
  const maxDistance = 2.0;
  return Math.max(0, 1 - (distance / maxDistance));
}

/**
 * Update performance metrics
 */
function updatePerformanceMetrics(processingTime) {
  performanceMetrics.totalProcessed++;
  performanceMetrics.totalProcessingTime += processingTime;
  performanceMetrics.averageProcessingTime = 
    performanceMetrics.totalProcessingTime / performanceMetrics.totalProcessed;
  
  // Update memory usage if available
  if (typeof performance !== 'undefined' && performance.memory) {
    performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize;
  }
}

/**
 * Get current performance metrics
 */
function getPerformanceMetrics() {
  return {
    ...performanceMetrics,
    frameSkipCount,
    maxFrameSkip,
    isInitialized,
  };
}

/**
 * Check if memory cleanup should be performed
 */
function shouldCleanup() {
  const now = Date.now();
  const timeSinceLastCleanup = now - performanceMetrics.lastCleanupTime;
  
  // Clean up every 5 minutes or if memory usage is high
  return timeSinceLastCleanup > 5 * 60 * 1000 || 
         (performanceMetrics.memoryUsage > 50 * 1024 * 1024); // 50MB
}

/**
 * Perform memory cleanup
 */
function performMemoryCleanup() {
  // Clear any caches
  if (typeof caches !== 'undefined') {
    // Clear any caches used by the worker
  }
  
  // Force garbage collection if available
  if (typeof gc === 'function') {
    gc();
  }
  
  performanceMetrics.lastCleanupTime = Date.now();
}

/**
 * Send success response
 */
function sendResponse(id, data) {
  self.postMessage({
    id,
    type: 'RESPONSE',
    success: true,
    data,
  });
}

/**
 * Send error response
 */
function sendError(id, error) {
  self.postMessage({
    id,
    type: 'RESPONSE',
    success: false,
    error,
  });
}

// Mock implementations (in a real implementation, these would use actual models)
function mockDetectFaces(imageData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const faceCount = Math.floor(Math.random() * 2) + 1;
      const faces = Array.from({ length: faceCount }, (_, i) => ({
        id: `face-${i}`,
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
        quality: {
          sharpness: 0.5 + Math.random() * 0.5,
          brightness: 0.5 + Math.random() * 0.5,
          contrast: 0.5 + Math.random() * 0.5,
          lighting: 0.5 + Math.random() * 0.5,
          pose: 0.5 + Math.random() * 0.5,
          occlusion: Math.random() * 0.3,
          overall: 0.5 + Math.random() * 0.5,
        },
      }));
      resolve(faces);
    }, 50);
  });
}

function mockRecognizeFace(imageData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        userId: 'user-123',
        confidence: 0.9 + Math.random() * 0.1,
      });
    }, 100);
  });
}

function mockGenerateEmbedding(imageData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const embeddingSize = 128;
      const embedding = new Float32Array(embeddingSize);
      for (let i = 0; i < embeddingSize; i++) {
        embedding[i] = Math.random() * 2 - 1;
      }
      resolve(embedding);
    }, 75);
  });
}