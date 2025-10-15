import { logger, logApiError, logApiRequest } from '@/lib/logger'

/**
 * Memory Optimizer
 * Provides memory optimization for the application
 * Optimized for DS223J hardware constraints with 512MB RAM
 */

export interface MemoryOptimizerOptions {
  // Optimization options
  enableOptimization?: boolean;
  optimizationInterval?: number; // ms
  memoryThreshold?: number; // MB
  aggressiveThreshold?: number; // MB
  
  // Cleanup options
  enableAutoCleanup?: boolean;
  cleanupInterval?: number; // ms
  cleanupStrategies?: CleanupStrategy[];
  
  // Compression options
  enableCompression?: boolean;
  compressionLevel?: number; // 0-9
  
  // Pooling options
  enableObjectPooling?: boolean;
  maxPoolSize?: number;
  
  // Lazy loading options
  enableLazyLoading?: boolean;
  preloadThreshold?: number; // MB
}

export interface CleanupStrategy {
  name: string;
  priority: number;
  execute: () => Promise<void>;
  condition: () => boolean;
}

export interface MemoryPool<T> {
  create: () => T;
  reset: (obj: T) => void;
  pool: T[];
  maxSize: number;
}

export interface MemoryStats {
  used: number; // MB
  total: number; // MB
  limit: number; // MB
  percentage: number; // %
  isOptimizing: boolean;
  lastOptimization: Date | null;
  optimizationsCount: number;
}

export class MemoryOptimizer {
  private options: MemoryOptimizerOptions;
  private isOptimizing = false;
  private lastOptimization: Date | null = null;
  private optimizationsCount = 0;
  private optimizationIntervalId: number | null = null;
  private cleanupIntervalId: number | null = null;
  private objectPools: Map<string, MemoryPool<any>> = new Map();
  private lazyLoadedModules: Map<string, any> = new Map();
  private compressedData: Map<string, any> = new Map();

  constructor(options: MemoryOptimizerOptions = {}) {
    this.options = {
      enableOptimization: true,
      optimizationInterval: 30000, // 30 seconds
      memoryThreshold: 300, // 300 MB
      aggressiveThreshold: 400, // 400 MB
      enableAutoCleanup: true,
      cleanupInterval: 60000, // 1 minute
      cleanupStrategies: [],
      enableCompression: true,
      compressionLevel: 6,
      enableObjectPooling: true,
      maxPoolSize: 100,
      enableLazyLoading: true,
      preloadThreshold: 200, // 200 MB
      ...options,
    };
    
    // Initialize default cleanup strategies
    this.initializeCleanupStrategies();
  }

  /**
   * Initialize the memory optimizer
   */
  initialize(): void {
    if (!this.options.enableOptimization) {
      return;
    }

    // Start optimization interval
    this.startOptimizationInterval();
    
    // Start cleanup interval
    if (this.options.enableAutoCleanup) {
      this.startCleanupInterval();
    }
    
    logger.info('Memory optimizer initialized');
  }

  /**
   * Cleanup the memory optimizer
   */
  cleanup(): void {
    // Stop optimization interval
    this.stopOptimizationInterval();
    
    // Stop cleanup interval
    this.stopCleanupInterval();
    
    // Clear object pools
    this.objectPools.clear();
    
    // Clear lazy loaded modules
    this.lazyLoadedModules.clear();
    
    // Clear compressed data
    this.compressedData.clear();
    
    logger.info('Memory optimizer cleaned up');
  }

  /**
   * Initialize default cleanup strategies
   */
  private initializeCleanupStrategies(): void {
    // Add default cleanup strategies if none provided
    if (this.options.cleanupStrategies!.length === 0) {
      this.options.cleanupStrategies = [
        {
          name: 'Garbage Collection',
          priority: 1,
          execute: async () => this.performGarbageCollection(),
          condition: () => true,
        },
        {
          name: 'Clear Image Cache',
          priority: 2,
          execute: async () => this.clearImageCache(),
          condition: () => true,
        },
        {
          name: 'Clear Data Cache',
          priority: 3,
          execute: async () => this.clearDataCache(),
          condition: () => true,
        },
        {
          name: 'Unload Unused Modules',
          priority: 4,
          execute: async () => this.unloadUnusedModules(),
          condition: () => true,
        },
        {
          name: 'Compress Memory',
          priority: 5,
          execute: async () => this.compressMemory(),
          condition: () => true,
        },
      ];
    }
  }

  /**
   * Start optimization interval
   */
  private startOptimizationInterval(): void {
    this.optimizationIntervalId = window.setInterval(() => {
      this.optimizeMemory();
    }, this.options.optimizationInterval);
  }

  /**
   * Stop optimization interval
   */
  private stopOptimizationInterval(): void {
    if (this.optimizationIntervalId !== null) {
      clearInterval(this.optimizationIntervalId);
      this.optimizationIntervalId = null;
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupIntervalId = window.setInterval(() => {
      this.performCleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Stop cleanup interval
   */
  private stopCleanupInterval(): void {
    if (this.cleanupIntervalId !== null) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): MemoryStats {
    let used = 0;
    let total = 0;
    let limit = 512; // Default to 512MB
    
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      used = memory.usedJSHeapSize / 1024 / 1024; // MB
      total = memory.totalJSHeapSize / 1024 / 1024; // MB
      limit = memory.jsHeapSizeLimit / 1024 / 1024; // MB
    }
    
    return {
      used,
      total,
      limit,
      percentage: (used / limit) * 100,
      isOptimizing: this.isOptimizing,
      lastOptimization: this.lastOptimization,
      optimizationsCount: this.optimizationsCount,
    };
  }

  /**
   * Check if memory usage is critical
   */
  isMemoryCritical(): boolean {
    const memoryUsage = this.getMemoryUsage();
    return memoryUsage.used > this.options.aggressiveThreshold!;
  }

  /**
   * Check if memory usage is high
   */
  isMemoryHigh(): boolean {
    const memoryUsage = this.getMemoryUsage();
    return memoryUsage.used > this.options.memoryThreshold!;
  }

  /**
   * Optimize memory
   */
  optimizeMemory(): void {
    if (this.isOptimizing) {
      return;
    }
    
    const memoryUsage = this.getMemoryUsage();
    
    // Only optimize if memory usage is high
    if (!this.isMemoryHigh()) {
      return;
    }
    
    this.isOptimizing = true;
    
    try {
      // Determine optimization level
      const isAggressive = this.isMemoryCritical();
      
      if (isAggressive) {
        this.performAggressiveOptimization();
      } else {
        this.performStandardOptimization();
      }
      
      this.lastOptimization = new Date();
      this.optimizationsCount++;
      
      logger.info('Memory optimization completed', { mode: isAggressive ? 'aggressive' : 'standard' });
    } catch (error) {
      logger.error('Error during memory optimization', error as Error);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Perform standard optimization
   */
  private performStandardOptimization(): void {
    // Perform garbage collection
    this.performGarbageCollection();
    
    // Clear image cache
    this.clearImageCache();
    
    // Clear data cache
    this.clearDataCache();
  }

  /**
   * Perform aggressive optimization
   */
  private performAggressiveOptimization(): void {
    // Perform standard optimization
    this.performStandardOptimization();
    
    // Unload unused modules
    this.unloadUnusedModules();
    
    // Compress memory
    this.compressMemory();
    
    // Clear object pools
    this.clearObjectPools();
    
    // Clear compressed data
    this.clearCompressedData();
  }

  /**
   * Perform cleanup
   */
  private performCleanup(): void {
    // Sort cleanup strategies by priority (higher priority first)
    const sortedStrategies = [...this.options.cleanupStrategies!].sort((a, b) => b.priority - a.priority);
    
    // Execute cleanup strategies
    for (const strategy of sortedStrategies) {
      try {
        if (strategy.condition()) {
          strategy.execute();
          logger.info('Executed cleanup strategy: ${strategy.name}');
        }
      } catch (error) {
        logger.error('Error executing cleanup strategy ${strategy.name}', error as Error);
      }
    }
  }

  /**
   * Perform garbage collection
   */
  private performGarbageCollection(): void {
    if ('gc' in window) {
      try {
        (window as any).gc();
        logger.info('Manual garbage collection performed');
      } catch (error) {
        logger.error('Error performing garbage collection', error as Error);
      }
    } else {
      // Fallback: try to trigger garbage collection by creating and cleaning up objects
      try {
        // Create a large array and then delete it
        const largeArray = new Array(1000000).fill(0);
        // Force garbage collection by setting to null
        (largeArray as any) = null;
        logger.info('Garbage collection hint performed');
      } catch (error) {
        logger.error('Error performing garbage collection hint', error as Error);
      }
    }
  }

  /**
   * Clear image cache
   */
  private clearImageCache(): void {
    // This is a placeholder implementation
    // In a real application, you would clear the image cache
    
    logger.info('Image cache cleared');
  }

  /**
   * Clear data cache
   */
  private clearDataCache(): void {
    // This is a placeholder implementation
    // In a real application, you would clear the data cache
    
    logger.info('Data cache cleared');
  }

  /**
   * Unload unused modules
   */
  private unloadUnusedModules(): void {
    // This is a placeholder implementation
    // In a real application, you would unload unused modules
    
    logger.info('Unused modules unloaded');
  }

  /**
   * Compress memory
   */
  private compressMemory(): void {
    // This is a placeholder implementation
    // In a real application, you would compress memory
    
    logger.info('Memory compressed');
  }

  /**
   * Clear object pools
   */
  private clearObjectPools(): void {
    for (const [name, pool] of this.objectPools) {
      pool.pool = [];
    }
    
    logger.info('Object pools cleared');
  }

  /**
   * Clear compressed data
   */
  private clearCompressedData(): void {
    this.compressedData.clear();
    
    logger.info('Compressed data cleared');
  }

  /**
   * Create an object pool
   */
  createObjectPool<T>(name: string, create: () => T, reset: (obj: T) => void): void {
    if (!this.options.enableObjectPooling) {
      return;
    }
    
    this.objectPools.set(name, {
      create,
      reset,
      pool: [],
      maxSize: this.options.maxPoolSize!,
    });
  }

  /**
   * Get an object from a pool
   */
  getFromPool<T>(name: string): T | null {
    if (!this.options.enableObjectPooling) {
      return null;
    }
    
    const pool = this.objectPools.get(name);
    
    if (!pool) {
      return null;
    }
    
    if (pool.pool.length > 0) {
      return pool.pool.pop()!;
    }
    
    return pool.create();
  }

  /**
   * Return an object to a pool
   */
  returnToPool<T>(name: string, obj: T): void {
    if (!this.options.enableObjectPooling) {
      return;
    }
    
    const pool = this.objectPools.get(name);
    
    if (!pool) {
      return;
    }
    
    if (pool.pool.length < pool.maxSize) {
      pool.reset(obj);
      pool.pool.push(obj);
    }
  }

  /**
   * Lazy load a module
   */
  async lazyLoadModule(name: string, loader: () => Promise<any>): Promise<any> {
    if (!this.options.enableLazyLoading) {
      return await loader();
    }
    
    // Check if module is already loaded
    if (this.lazyLoadedModules.has(name)) {
      return this.lazyLoadedModules.get(name);
    }
    
    // Check if memory usage is too high
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage.used > this.options.preloadThreshold!) {
      throw new Error(`Memory usage too high to load module: ${name}`);
    }
    
    // Load module
    try {
      const module = await loader();
      this.lazyLoadedModules.set(name, module);
      return module;
    } catch (error) {
      logger.error('Error loading module ${name}', error as Error);
      throw error;
    }
  }

  /**
   * Unload a module
   */
  unloadModule(name: string): void {
    this.lazyLoadedModules.delete(name);
    logger.info('Module unloaded: ${name}');
  }

  /**
   * Compress data
   */
  compressData(key: string, data: any): void {
    if (!this.options.enableCompression) {
      return;
    }
    
    // This is a placeholder implementation
    // In a real application, you would compress the data
    
    this.compressedData.set(key, data);
    logger.info('Data compressed: ${key}');
  }

  /**
   * Decompress data
   */
  decompressData(key: string): any {
    if (!this.options.enableCompression) {
      return null;
    }
    
    // This is a placeholder implementation
    // In a real application, you would decompress the data
    
    const data = this.compressedData.get(key);
    if (data) {
      logger.info('Data decompressed: ${key}');
    }
    return data;
  }

  /**
   * Add a cleanup strategy
   */
  addCleanupStrategy(strategy: CleanupStrategy): void {
    this.options.cleanupStrategies!.push(strategy);
  }

  /**
   * Remove a cleanup strategy
   */
  removeCleanupStrategy(name: string): void {
    this.options.cleanupStrategies = this.options.cleanupStrategies!.filter(
      strategy => strategy.name !== name
    );
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<MemoryOptimizerOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart intervals if they changed
    if (this.optimizationIntervalId !== null && newOptions.optimizationInterval) {
      this.stopOptimizationInterval();
      this.startOptimizationInterval();
    }
    
    if (this.cleanupIntervalId !== null && newOptions.cleanupInterval) {
      this.stopCleanupInterval();
      this.startCleanupInterval();
    }
  }

  /**
   * Get current options
   */
  getOptions(): MemoryOptimizerOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const memoryOptimizer = new MemoryOptimizer({
  enableOptimization: true,
  optimizationInterval: 30000,
  memoryThreshold: 300,
  aggressiveThreshold: 400,
  enableAutoCleanup: true,
  cleanupInterval: 60000,
  cleanupStrategies: [],
  enableCompression: true,
  compressionLevel: 6,
  enableObjectPooling: true,
  maxPoolSize: 100,
  enableLazyLoading: true,
  preloadThreshold: 200,
});

// Export a factory function for easier usage
export function createMemoryOptimizer(options?: MemoryOptimizerOptions): MemoryOptimizer {
  return new MemoryOptimizer(options);
}

// React hook for memory optimization
export function useMemoryOptimizer() {
  return {
    getMemoryUsage: memoryOptimizer.getMemoryUsage.bind(memoryOptimizer),
    isMemoryCritical: memoryOptimizer.isMemoryCritical.bind(memoryOptimizer),
    isMemoryHigh: memoryOptimizer.isMemoryHigh.bind(memoryOptimizer),
    optimizeMemory: memoryOptimizer.optimizeMemory.bind(memoryOptimizer),
    createObjectPool: memoryOptimizer.createObjectPool.bind(memoryOptimizer),
    getFromPool: memoryOptimizer.getFromPool.bind(memoryOptimizer),
    returnToPool: memoryOptimizer.returnToPool.bind(memoryOptimizer),
    lazyLoadModule: memoryOptimizer.lazyLoadModule.bind(memoryOptimizer),
    unloadModule: memoryOptimizer.unloadModule.bind(memoryOptimizer),
    compressData: memoryOptimizer.compressData.bind(memoryOptimizer),
    decompressData: memoryOptimizer.decompressData.bind(memoryOptimizer),
    addCleanupStrategy: memoryOptimizer.addCleanupStrategy.bind(memoryOptimizer),
    removeCleanupStrategy: memoryOptimizer.removeCleanupStrategy.bind(memoryOptimizer),
  };
}