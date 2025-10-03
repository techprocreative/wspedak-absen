/**
 * Hardware Optimization Utilities for DS223J
 * 
 * This module provides optimization techniques specifically designed for the 
 * DS223J's limited hardware resources (2GB RAM, low-power CPU, HDD storage).
 */

// Memory usage optimization
export class MemoryOptimizer {
  private static memoryThreshold = 0.8; // 80% of available memory
  private static lastCleanupTime = 0;
  private static cleanupInterval = 60000; // 1 minute

  /**
   * Check if memory usage is above threshold
   */
  static isMemoryCritical(): boolean {
    if (typeof window === 'undefined' || !('performance' in window) || !('memory' in (window.performance as any))) {
      return false;
    }
    
    const memory = (window.performance as any).memory;
    const usedRatio = memory.usedJSHeapSize / memory.totalJSHeapSize;
    return usedRatio > this.memoryThreshold;
  }

  /**
   * Perform memory cleanup
   */
  static cleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanupTime < this.cleanupInterval) {
      return;
    }
    
    this.lastCleanupTime = now;
    
    // Clear unused objects from memory
    if (typeof gc === 'function') {
      gc(); // Call garbage collector if available
    }
    
    // Clear any cached data that can be regenerated
    this.clearCaches();
    
    // Trigger any custom cleanup callbacks
    this.triggerCleanupCallbacks();
  }

  private static clearCaches(): void {
    // Implementation for clearing caches
    // This would be customized based on application needs
  }

  private static triggerCleanupCallbacks(): void {
    // Implementation for triggering cleanup callbacks
    // This would be customized based on application needs
  }

  /**
   * Optimize object for memory usage
   */
  static optimizeObject<T>(obj: T): T {
    // Create a deep clone to remove any hidden properties
    const optimized = JSON.parse(JSON.stringify(obj));
    return optimized;
  }

  /**
   * Create a memory-efficient array
   */
  static createOptimizedArray<T>(items: T[]): T[] {
    // Use typed arrays if possible for primitive values
    if (items.length > 1000 && items.every(item => typeof item === 'number')) {
      return new Float64Array(items as any) as any;
    }
    return items;
  }
}

// CPU usage reduction strategies
export class CPUOptimizer {
  private static taskQueue: Array<() => Promise<void>> = [];
  private static isProcessing = false;
  private static maxConcurrentTasks = 2; // Limit concurrent tasks for low-power CPU

  /**
   * Add a task to the queue
   */
  static async queueTask(task: () => Promise<void>): Promise<void> {
    return new Promise((resolve) => {
      this.taskQueue.push(async () => {
        await task();
        resolve();
      });
      
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the task queue with limited concurrency
   */
  private static async processQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      const tasksToProcess = this.taskQueue.splice(0, this.maxConcurrentTasks);
      await Promise.all(tasksToProcess.map(task => task()));
      
      // Add a small delay to prevent CPU overload
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Process remaining tasks
      if (this.taskQueue.length > 0) {
        this.processQueue();
      } else {
        this.isProcessing = false;
      }
    } catch (error) {
      console.error('Error processing task queue:', error);
      this.isProcessing = false;
    }
  }

  /**
   * Debounce function to limit CPU usage
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      
      timeout = setTimeout(() => {
        func(...args);
        timeout = null;
      }, wait);
    };
  }

  /**
   * Throttle function to limit CPU usage
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * Run intensive operations in chunks
   */
  static async runInChunks<T, R>(
    items: T[],
    chunkSize: number,
    processChunk: (chunk: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkResults = await processChunk(chunk);
      results.push(...chunkResults);
      
      // Allow event loop to process other tasks
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  }
}

// Storage I/O optimization for HDD-based systems
export class StorageOptimizer {
  private static readCache = new Map<string, { data: any; timestamp: number }>();
  private static writeQueue: Array<() => Promise<void>> = [];
  private static isProcessingWrites = false;
  private static cacheExpiry = 30000; // 30 seconds
  private static maxCacheSize = 50; // Limit cache size for memory efficiency

  /**
   * Read data with caching to minimize HDD access
   */
  static async readWithCache<T>(key: string, readFn: () => Promise<T>): Promise<T> {
    // Check cache first
    const cached = this.readCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data as T;
    }
    
    // Read from storage
    const data = await readFn();
    
    // Update cache
    this.updateCache(key, data);
    
    return data;
  }

  /**
   * Write data with batching to minimize HDD access
   */
  static async writeWithBatch(key: string, data: any, writeFn: (key: string, data: any) => Promise<void>): Promise<void> {
    return new Promise((resolve) => {
      this.writeQueue.push(async () => {
        await writeFn(key, data);
        resolve();
      });
      
      if (!this.isProcessingWrites) {
        this.processWriteQueue();
      }
    });
  }

  /**
   * Process write queue in batches
   */
  private static async processWriteQueue(): Promise<void> {
    if (this.isProcessingWrites || this.writeQueue.length === 0) {
      return;
    }
    
    this.isProcessingWrites = true;
    
    try {
      // Process up to 5 writes at a time
      const batch = this.writeQueue.splice(0, 5);
      await Promise.all(batch.map(task => task()));
      
      // Allow event loop to process other tasks
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Process remaining writes
      if (this.writeQueue.length > 0) {
        this.processWriteQueue();
      } else {
        this.isProcessingWrites = false;
      }
    } catch (error) {
      console.error('Error processing write queue:', error);
      this.isProcessingWrites = false;
    }
  }

  /**
   * Update cache with size limit
   */
  private static updateCache(key: string, data: any): void {
    // If cache is full, remove oldest entry
    if (this.readCache.size >= this.maxCacheSize) {
      const oldestKey = this.readCache.keys().next().value;
      if (oldestKey) {
        this.readCache.delete(oldestKey);
      }
    }
    
    this.readCache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.readCache.clear();
  }

  /**
   * Optimize data for storage
   */
  static optimizeForStorage(data: any): any {
    // Remove undefined values
    const cleaned = JSON.parse(JSON.stringify(data, (key, value) => 
      value === undefined ? null : value
    ));
    
    return cleaned;
  }
}

// Network bandwidth optimization
export class NetworkOptimizer {
  private static requestCache = new Map<string, { data: any; timestamp: number }>();
  private static pendingRequests = new Map<string, Promise<any>>();
  private static cacheExpiry = 60000; // 1 minute
  private static maxCacheSize = 30; // Limit cache size for memory efficiency

  /**
   * Make a network request with caching and deduplication
   */
  static async fetchWithCache<T>(
    url: string,
    options: RequestInit = {},
    cacheKey?: string
  ): Promise<T> {
    const key = cacheKey || url;
    
    // Check if there's a pending request for the same URL
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    
    // Check cache first
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data as T;
    }
    
    // Create a new request
    const requestPromise = this.makeRequest<T>(url, options, key);
    this.pendingRequests.set(key, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Make the actual network request
   */
  private static async makeRequest<T>(
    url: string,
    options: RequestInit,
    cacheKey: string
  ): Promise<T> {
    try {
      // Add compression header if not already present
      if (!options.headers) {
        options.headers = {};
      }
      
      if (!(options.headers as Record<string, string>)['Accept-Encoding']) {
        (options.headers as Record<string, string>)['Accept-Encoding'] = 'gzip, deflate';
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Network request failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update cache
      this.updateCache(cacheKey, data);
      
      return data as T;
    } catch (error) {
      console.error('Network request failed:', error);
      throw error;
    }
  }

  /**
   * Update cache with size limit
   */
  private static updateCache(key: string, data: any): void {
    // If cache is full, remove oldest entry
    if (this.requestCache.size >= this.maxCacheSize) {
      const oldestKey = this.requestCache.keys().next().value;
      if (oldestKey) {
        this.requestCache.delete(oldestKey);
      }
    }
    
    this.requestCache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * Optimize data for network transfer
   */
  static optimizeForNetwork(data: any): any {
    // Remove unnecessary properties
    const optimized = JSON.parse(JSON.stringify(data, (key, value) => {
      // Skip functions and undefined values
      if (typeof value === 'function' || value === undefined) {
        return undefined;
      }
      return value;
    }));
    
    return optimized;
  }

  /**
   * Compress data for network transfer
   */
  static async compressData(data: any): Promise<string> {
    // In a real implementation, this would use a compression library
    // For now, we'll just return the JSON string
    return JSON.stringify(data);
  }

  /**
   * Decompress data from network transfer
   */
  static async decompressData(compressed: string): Promise<any> {
    // In a real implementation, this would use a decompression library
    // For now, we'll just parse the JSON string
    return JSON.parse(compressed);
  }
}

// Face recognition optimization for low-memory environments
export class FaceRecognitionOptimizer {
  private static modelCache: any = null;
  private static isModelLoading = false;
  private static maxFaceDetectionSize = 640; // Limit image size for processing

  /**
   * Load face recognition model with memory optimization
   */
  static async loadModel(): Promise<any> {
    if (this.modelCache) {
      return this.modelCache;
    }
    
    if (this.isModelLoading) {
      // Wait for model to load if already in progress
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.modelCache) {
            clearInterval(checkInterval);
            resolve(this.modelCache);
          }
        }, 100);
      });
    }
    
    this.isModelLoading = true;
    
    try {
      // In a real implementation, this would load the face recognition model
      // with memory optimizations
      // For now, we'll simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate loaded model
      this.modelCache = {
        detect: async (image: any) => {
          // Simulate face detection
          return [];
        },
        recognize: async (face: any) => {
          // Simulate face recognition
          return null;
        }
      };
      
      return this.modelCache;
    } catch (error) {
      console.error('Failed to load face recognition model:', error);
      throw error;
    } finally {
      this.isModelLoading = false;
    }
  }

  /**
   * Optimize image for face recognition
   */
  static optimizeImage(image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Calculate dimensions to maintain aspect ratio
    let width = image.width;
    let height = image.height;
    
    if (width > this.maxFaceDetectionSize || height > this.maxFaceDetectionSize) {
      const ratio = Math.min(
        this.maxFaceDetectionSize / width,
        this.maxFaceDetectionSize / height
      );
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw image to canvas
    ctx.drawImage(image, 0, 0, width, height);
    
    return canvas;
  }

  /**
   * Release face recognition model from memory
   */
  static releaseModel(): void {
    this.modelCache = null;
    
    // Trigger garbage collection if available
    if (typeof gc === 'function') {
      gc();
    }
  }
}

// Progressive loading and virtualization
export class ProgressiveLoader {
  private static loadedItems = new Set<string>();
  private static loadingPromises = new Map<string, Promise<any>>();

  /**
   * Load an item progressively
   */
  static async loadItem<T>(
    id: string,
    loadFn: () => Promise<T>,
    priority: 'high' | 'low' = 'low'
  ): Promise<T> {
    // Check if already loaded
    if (this.loadedItems.has(id)) {
      return this.loadingPromises.get(id) as Promise<T>;
    }
    
    // Check if already loading
    if (this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id) as Promise<T>;
    }
    
    // Create loading promise
    const loadPromise = this.loadItemInternal(id, loadFn, priority);
    this.loadingPromises.set(id, loadPromise);
    
    try {
      const result = await loadPromise;
      this.loadedItems.add(id);
      return result;
    } catch (error) {
      this.loadingPromises.delete(id);
      throw error;
    }
  }

  /**
   * Internal method to load an item
   */
  private static async loadItemInternal<T>(
    id: string,
    loadFn: () => Promise<T>,
    priority: 'high' | 'low'
  ): Promise<T> {
    // For low priority items, add a small delay to allow high priority items to load first
    if (priority === 'low') {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return loadFn();
  }

  /**
   * Check if an item is loaded
   */
  static isLoaded(id: string): boolean {
    return this.loadedItems.has(id);
  }

  /**
   * Unload an item to free memory
   */
  static unloadItem(id: string): void {
    this.loadedItems.delete(id);
    this.loadingPromises.delete(id);
  }

  /**
   * Clear all loaded items
   */
  static clearAll(): void {
    this.loadedItems.clear();
    this.loadingPromises.clear();
  }
}

// Virtual list for efficient rendering of large lists
export class VirtualList {
  private items: any[];
  private itemHeight: number;
  private containerHeight: number;
  private scrollTop = 0;
  private visibleItems: any[] = [];
  private startIndex = 0;
  private endIndex = 0;

  constructor(items: any[], itemHeight: number, containerHeight: number) {
    this.items = items;
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
    this.updateVisibleItems();
  }

  /**
   * Update scroll position
   */
  setScrollTop(scrollTop: number): void {
    this.scrollTop = scrollTop;
    this.updateVisibleItems();
  }

  /**
   * Update items
   */
  setItems(items: any[]): void {
    this.items = items;
    this.updateVisibleItems();
  }

  /**
   * Update container height
   */
  setContainerHeight(height: number): void {
    this.containerHeight = height;
    this.updateVisibleItems();
  }

  /**
   * Update visible items based on scroll position
   */
  private updateVisibleItems(): void {
    // Calculate visible range
    this.startIndex = Math.floor(this.scrollTop / this.itemHeight);
    this.endIndex = Math.min(
      this.startIndex + Math.ceil(this.containerHeight / this.itemHeight) + 1,
      this.items.length - 1
    );
    
    // Get visible items
    this.visibleItems = this.items.slice(this.startIndex, this.endIndex + 1);
  }

  /**
   * Get visible items
   */
  getVisibleItems(): any[] {
    return this.visibleItems;
  }

  /**
   * Get total height
   */
  getTotalHeight(): number {
    return this.items.length * this.itemHeight;
  }

  /**
   * Get offset for item
   */
  getItemOffset(index: number): number {
    return index * this.itemHeight;
  }

  /**
   * Get start index
   */
  getStartIndex(): number {
    return this.startIndex;
  }
}