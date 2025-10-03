/**
 * Code Splitter
 * Provides code splitting utilities for better bundle management
 * Optimized for DS223J hardware constraints
 */

export interface CodeSplitterOptions {
  // Splitting options
  enableCodeSplitting?: boolean;
  splittingStrategy?: 'route' | 'feature' | 'component';
  
  // Performance options
  enablePerformanceOptimization?: boolean;
  maxChunkSize?: number; // KB
  maxLoadingTime?: number; // ms
  
  // Caching options
  enableCaching?: boolean;
  cacheExpiry?: number; // ms
  
  // Prefetching options
  enablePrefetching?: boolean;
  prefetchThreshold?: number; // seconds
}

export interface ChunkInfo {
  id: string;
  name: string;
  size: number; // KB
  loaded: boolean;
  loading: boolean;
  error: Error | null;
  module: any;
  timestamp: number;
  dependencies: string[];
}

export interface ChunkLoadResult {
  chunk: ChunkInfo;
  success: boolean;
  loadingTime: number;
  error?: Error;
}

export class CodeSplitter {
  private options: CodeSplitterOptions;
  private chunks: Map<string, ChunkInfo> = new Map();
  private loadedChunks: Set<string> = new Set();
  private loadingChunks: Set<string> = new Set();
  private chunkCache: Map<string, { module: any; timestamp: number }> = new Map();
  private loadCallbacks: Map<string, Array<(result: ChunkLoadResult) => void>> = new Map();
  private prefetchTimer: number | null = null;

  constructor(options: CodeSplitterOptions = {}) {
    this.options = {
      enableCodeSplitting: true,
      splittingStrategy: 'feature',
      enablePerformanceOptimization: true,
      maxChunkSize: 100, // 100 KB
      maxLoadingTime: 3000, // 3 seconds
      enableCaching: true,
      cacheExpiry: 3600000, // 1 hour
      enablePrefetching: true,
      prefetchThreshold: 5, // 5 seconds
      ...options,
    };
  }

  /**
   * Initialize the code splitter
   */
  initialize(): void {
    if (!this.options.enableCodeSplitting) {
      return;
    }

    // Start prefetch timer
    this.startPrefetchTimer();
    
    console.log('Code splitter initialized');
  }

  /**
   * Cleanup the code splitter
   */
  cleanup(): void {
    // Stop prefetch timer
    this.stopPrefetchTimer();
    
    // Clear all chunks
    this.chunks.clear();
    this.loadedChunks.clear();
    this.loadingChunks.clear();
    this.chunkCache.clear();
    this.loadCallbacks.clear();
    
    console.log('Code splitter cleaned up');
  }

  /**
   * Register a code chunk
   */
  register(
    id: string,
    name: string,
    load: () => Promise<any>,
    dependencies: string[] = []
  ): ChunkInfo {
    // Check if chunk already exists
    if (this.chunks.has(id)) {
      return this.chunks.get(id)!;
    }
    
    // Create chunk info
    const chunk: ChunkInfo = {
      id,
      name,
      size: 0, // Will be calculated when loaded
      loaded: false,
      loading: false,
      error: null,
      module: null,
      timestamp: Date.now(),
      dependencies,
    };
    
    // Add to chunks
    this.chunks.set(id, chunk);
    
    return chunk;
  }

  /**
   * Load a code chunk
   */
  async load(id: string): Promise<ChunkLoadResult> {
    const chunk = this.chunks.get(id);
    
    if (!chunk) {
      return {
        chunk: null as any,
        success: false,
        loadingTime: 0,
        error: new Error(`Chunk with id ${id} not found`),
      };
    }
    
    // Return early if already loaded or loading
    if (chunk.loaded) {
      return {
        chunk,
        success: true,
        loadingTime: 0,
      };
    }
    
    if (chunk.loading) {
      // Wait for loading to complete
      return new Promise((resolve) => {
        const callback = (result: ChunkLoadResult) => {
          resolve(result);
        };
        
        this.onLoad(id, callback);
      });
    }
    
    // Check cache
    if (this.options.enableCaching && this.chunkCache.has(id)) {
      const cached = this.chunkCache.get(id)!;
      
      // Check if cache is still valid
      if (Date.now() - cached.timestamp < this.options.cacheExpiry!) {
        chunk.loaded = true;
        chunk.loading = false;
        chunk.module = cached.module;
        chunk.error = null;
        
        this.loadedChunks.add(id);
        
        const result: ChunkLoadResult = {
          chunk,
          success: true,
          loadingTime: 0,
        };
        
        // Notify callbacks
        this.notifyCallbacks(id, result);
        
        return result;
      } else {
        // Cache expired, remove it
        this.chunkCache.delete(id);
      }
    }
    
    // Load dependencies first
    for (const depId of chunk.dependencies) {
      const depResult = await this.load(depId);
      if (!depResult.success) {
        return {
          chunk,
          success: false,
          loadingTime: 0,
          error: new Error(`Failed to load dependency ${depId}: ${depResult.error?.message}`),
        };
      }
    }
    
    // Set loading state
    chunk.loading = true;
    this.loadingChunks.add(id);
    
    const startTime = performance.now();
    
    try {
      // Load the module
      const module = await this.createChunkLoader(id)();
      
      const endTime = performance.now();
      const loadingTime = endTime - startTime;
      
      // Check if loading took too long
      if (this.options.enablePerformanceOptimization && 
          loadingTime > this.options.maxLoadingTime!) {
        console.warn(`Chunk loading took too long: ${loadingTime}ms for chunk ${id}`);
      }
      
      // Calculate chunk size (simplified)
      const size = this.calculateChunkSize(module);
      
      // Check if chunk is too large
      if (this.options.enablePerformanceOptimization && 
          size > this.options.maxChunkSize!) {
        console.warn(`Chunk size is too large: ${size}KB for chunk ${id}`);
      }
      
      // Update chunk
      chunk.loaded = true;
      chunk.loading = false;
      chunk.module = module;
      chunk.error = null;
      chunk.size = size;
      
      // Add to loaded chunks
      this.loadedChunks.add(id);
      this.loadingChunks.delete(id);
      
      // Add to cache
      if (this.options.enableCaching) {
        this.chunkCache.set(id, {
          module,
          timestamp: Date.now(),
        });
      }
      
      const result: ChunkLoadResult = {
        chunk,
        success: true,
        loadingTime,
      };
      
      // Notify callbacks
      this.notifyCallbacks(id, result);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const loadingTime = endTime - startTime;
      
      // Update chunk
      chunk.loaded = false;
      chunk.loading = false;
      chunk.module = null;
      chunk.error = error as Error;
      
      // Remove from loading chunks
      this.loadingChunks.delete(id);
      
      const result: ChunkLoadResult = {
        chunk,
        success: false,
        loadingTime,
        error: error as Error,
      };
      
      // Notify callbacks
      this.notifyCallbacks(id, result);
      
      return result;
    }
  }

  /**
   * Create a chunk loader function
   */
  private createChunkLoader(id: string): () => Promise<any> {
    // This is a placeholder implementation
    // In a real application, you would use dynamic imports based on the chunk ID
    return async () => {
      switch (id) {
        case 'attendance':
          // Return a mock module for now
          return { default: () => null, AttendanceComponent: () => null };
        case 'users':
          // Return a mock module for now
          return { default: () => null, UsersComponent: () => null };
        case 'reports':
          // Return a mock module for now
          return { default: () => null, ReportsComponent: () => null };
        case 'settings':
          // Return a mock module for now
          return { default: () => null, SettingsComponent: () => null };
        default:
          throw new Error(`Unknown chunk ID: ${id}`);
      }
    };
  }

  /**
   * Calculate chunk size (simplified implementation)
   */
  private calculateChunkSize(module: any): number {
    // This is a simplified implementation
    // In a real application, you would calculate the actual size of the module
    return Math.random() * 100; // Random size between 0-100 KB
  }

  /**
   * Prefetch chunks
   */
  async prefetch(chunkIds: string[]): Promise<ChunkLoadResult[]> {
    const results: ChunkLoadResult[] = [];
    
    for (const id of chunkIds) {
      const chunk = this.chunks.get(id);
      
      if (chunk && !chunk.loaded && !chunk.loading) {
        // Load chunk but don't add to loaded chunks
        const result = await this.load(id);
        
        // If loaded, remove from loaded chunks to keep it in memory but not count towards limits
        if (result.success) {
          this.loadedChunks.delete(id);
        }
        
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Start prefetch timer
   */
  private startPrefetchTimer(): void {
    if (!this.options.enablePrefetching) {
      return;
    }
    
    this.prefetchTimer = window.setInterval(() => {
      // Prefetch chunks that are likely to be needed soon
      this.prefetchLikelyChunks();
    }, this.options.prefetchThreshold! * 1000);
  }

  /**
   * Stop prefetch timer
   */
  private stopPrefetchTimer(): void {
    if (this.prefetchTimer !== null) {
      clearInterval(this.prefetchTimer);
      this.prefetchTimer = null;
    }
  }

  /**
   * Prefetch chunks that are likely to be needed soon
   */
  private async prefetchLikelyChunks(): Promise<void> {
    // This is a simplified implementation
    // In a real application, you would use user behavior and context to determine likely chunks
    
    const likelyChunkIds: string[] = [];
    
    // Get current path
    const currentPath = window.location.pathname;
    
    // Determine likely chunks based on current path
    if (currentPath.includes('/attendance')) {
      likelyChunkIds.push('reports');
    } else if (currentPath.includes('/users')) {
      likelyChunkIds.push('attendance', 'reports');
    } else if (currentPath.includes('/reports')) {
      likelyChunkIds.push('attendance', 'users');
    } else if (currentPath.includes('/settings')) {
      likelyChunkIds.push('users');
    }
    
    // Prefetch likely chunks
    if (likelyChunkIds.length > 0) {
      this.prefetch(likelyChunkIds);
    }
  }

  /**
   * Get a chunk
   */
  getChunk(id: string): ChunkInfo | null {
    return this.chunks.get(id) || null;
  }

  /**
   * Check if a chunk is loaded
   */
  isLoaded(id: string): boolean {
    return this.loadedChunks.has(id);
  }

  /**
   * Check if a chunk is loading
   */
  isLoading(id: string): boolean {
    return this.loadingChunks.has(id);
  }

  /**
   * Get all loaded chunks
   */
  getLoadedChunks(): ChunkInfo[] {
    return Array.from(this.loadedChunks).map(id => this.chunks.get(id)!).filter(Boolean);
  }

  /**
   * Get all loading chunks
   */
  getLoadingChunks(): ChunkInfo[] {
    return Array.from(this.loadingChunks).map(id => this.chunks.get(id)!).filter(Boolean);
  }

  /**
   * Get chunk statistics
   */
  getChunkStats(): {
    total: number;
    loaded: number;
    loading: number;
    totalSize: number; // KB
    averageSize: number; // KB
  } {
    const total = this.chunks.size;
    const loaded = this.loadedChunks.size;
    const loading = this.loadingChunks.size;
    
    let totalSize = 0;
    let loadedCount = 0;
    
    for (const chunk of this.chunks.values()) {
      if (chunk.loaded) {
        totalSize += chunk.size;
        loadedCount++;
      }
    }
    
    const averageSize = loadedCount > 0 ? totalSize / loadedCount : 0;
    
    return {
      total,
      loaded,
      loading,
      totalSize,
      averageSize,
    };
  }

  /**
   * Register a load callback
   */
  onLoad(id: string, callback: (result: ChunkLoadResult) => void): void {
    if (!this.loadCallbacks.has(id)) {
      this.loadCallbacks.set(id, []);
    }
    
    this.loadCallbacks.get(id)!.push(callback);
  }

  /**
   * Unregister a load callback
   */
  offLoad(id: string, callback: (result: ChunkLoadResult) => void): void {
    const callbacks = this.loadCallbacks.get(id);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notify callbacks
   */
  private notifyCallbacks(id: string, result: ChunkLoadResult): void {
    const callbacks = this.loadCallbacks.get(id);
    if (callbacks) {
      callbacks.forEach(callback => callback(result));
    }
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<CodeSplitterOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart prefetch timer if threshold changed
    if (this.prefetchTimer !== null && newOptions.prefetchThreshold) {
      this.stopPrefetchTimer();
      this.startPrefetchTimer();
    }
  }

  /**
   * Get current options
   */
  getOptions(): CodeSplitterOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const codeSplitter = new CodeSplitter({
  enableCodeSplitting: true,
  splittingStrategy: 'feature',
  enablePerformanceOptimization: true,
  maxChunkSize: 100,
  maxLoadingTime: 3000,
  enableCaching: true,
  cacheExpiry: 3600000,
  enablePrefetching: true,
  prefetchThreshold: 5,
});

// Export a factory function for easier usage
export function createCodeSplitter(options?: CodeSplitterOptions): CodeSplitter {
  return new CodeSplitter(options);
}

// React hook for code splitting
export function useCodeSplitter() {
  return {
    register: codeSplitter.register.bind(codeSplitter),
    load: codeSplitter.load.bind(codeSplitter),
    prefetch: codeSplitter.prefetch.bind(codeSplitter),
    getChunk: codeSplitter.getChunk.bind(codeSplitter),
    isLoaded: codeSplitter.isLoaded.bind(codeSplitter),
    isLoading: codeSplitter.isLoading.bind(codeSplitter),
    onLoad: codeSplitter.onLoad.bind(codeSplitter),
    offLoad: codeSplitter.offLoad.bind(codeSplitter),
    getChunkStats: codeSplitter.getChunkStats.bind(codeSplitter),
  };
}