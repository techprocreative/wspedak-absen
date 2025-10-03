/**
 * Query Optimizer
 * Provides query optimization for large datasets
 * Optimized for DS223J hardware constraints
 */

export interface QueryOptimizerOptions {
  // Optimization options
  enableOptimization?: boolean;
  maxResultSize?: number; // Maximum number of results to return
  enablePagination?: boolean;
  defaultPageSize?: number;
  
  // Performance options
  enablePerformanceOptimization?: boolean;
  maxQueryTime?: number; // ms
  enableQueryCaching?: boolean;
  cacheExpiry?: number; // ms
  
  // Memory options
  enableMemoryOptimization?: boolean;
  maxMemoryUsage?: number; // MB
}

export interface QueryOptions {
  // Filter options
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  
  // Pagination options
  offset?: number;
  limit?: number;
  
  // Performance options
  timeout?: number; // ms
  useCache?: boolean;
}

export interface QueryResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  queryTime: number; // ms
  fromCache: boolean;
}

export interface QueryCache {
  key: string;
  data: any[];
  timestamp: number;
  expiry: number;
}

export class QueryOptimizer {
  private options: QueryOptimizerOptions;
  private queryCache: Map<string, QueryCache> = new Map();
  private activeQueries: Map<string, AbortController> = new Map();

  constructor(options: QueryOptimizerOptions = {}) {
    this.options = {
      enableOptimization: true,
      maxResultSize: 1000,
      enablePagination: true,
      defaultPageSize: 50,
      enablePerformanceOptimization: true,
      maxQueryTime: 5000, // 5 seconds
      enableQueryCaching: true,
      cacheExpiry: 60000, // 1 minute
      enableMemoryOptimization: true,
      maxMemoryUsage: 100, // 100 MB
      ...options,
    };
  }

  /**
   * Initialize the query optimizer
   */
  initialize(): void {
    if (!this.options.enableOptimization) {
      return;
    }

    // Start cache cleanup interval
    this.startCacheCleanup();
    
    console.log('Query optimizer initialized');
  }

  /**
   * Cleanup the query optimizer
   */
  cleanup(): void {
    // Stop cache cleanup interval
    this.stopCacheCleanup();
    
    // Cancel all active queries
    for (const controller of this.activeQueries.values()) {
      controller.abort();
    }
    this.activeQueries.clear();
    
    // Clear cache
    this.queryCache.clear();
    
    console.log('Query optimizer cleaned up');
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    // Clean up expired cache entries every minute
    setInterval(() => {
      this.cleanupCache();
    }, 60000);
  }

  /**
   * Stop cache cleanup interval
   */
  private stopCacheCleanup(): void {
    // In a real implementation, you would store the interval ID and clear it
    // For now, this is just a placeholder
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    for (const [key, cache] of this.queryCache.entries()) {
      if (now > cache.expiry) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Generate a cache key for a query
   */
  private generateCacheKey(store: string, options: QueryOptions): string {
    return `${store}:${JSON.stringify(options)}`;
  }

  /**
   * Get data from cache
   */
  private getFromCache(key: string): any[] | null {
    const cache = this.queryCache.get(key);
    
    if (!cache) {
      return null;
    }
    
    // Check if cache is still valid
    const now = Date.now();
    if (now > cache.expiry) {
      this.queryCache.delete(key);
      return null;
    }
    
    return cache.data;
  }

  /**
   * Store data in cache
   */
  private storeInCache(key: string, data: any[]): void {
    if (!this.options.enableQueryCaching) {
      return;
    }
    
    const now = Date.now();
    const cache: QueryCache = {
      key,
      data,
      timestamp: now,
      expiry: now + this.options.cacheExpiry!,
    };
    
    this.queryCache.set(key, cache);
  }

  /**
   * Execute a query with optimization
   */
  async executeQuery<T>(
    store: string,
    queryFn: (options: QueryOptions) => Promise<{ data: T[]; total: number }>,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    if (!this.options.enableOptimization) {
      // Execute query without optimization
      const startTime = performance.now();
      const result = await queryFn(options);
      const endTime = performance.now();
      
      return {
        data: result.data,
        total: result.total,
        hasMore: false,
        queryTime: endTime - startTime,
        fromCache: false,
      };
    }
    
    const startTime = performance.now();
    const queryId = this.generateQueryId();
    
    // Set up timeout
    const timeout = options.timeout || this.options.maxQueryTime!;
    const controller = new AbortController();
    this.activeQueries.set(queryId, controller);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        controller.abort();
        reject(new Error(`Query timed out after ${timeout}ms`));
      }, timeout);
    });
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(store, options);
      let fromCache = false;
      let data: T[] = [];
      let total = 0;
      
      if (options.useCache !== false) {
        const cachedData = this.getFromCache(cacheKey);
        if (cachedData) {
          data = cachedData;
          total = cachedData.length;
          fromCache = true;
        }
      }
      
      if (!fromCache) {
        // Execute query with timeout
        const queryPromise = queryFn(options);
        const result = await Promise.race([queryPromise, timeoutPromise]);
        
        data = result.data;
        total = result.total;
        
        // Store in cache
        this.storeInCache(cacheKey, data);
      }
      
      // Apply pagination if not already applied
      if (this.options.enablePagination && !options.offset && !options.limit) {
        const pageSize = this.options.defaultPageSize!;
        const offset = 0;
        const limit = pageSize;
        
        data = data.slice(offset, offset + limit);
      }
      
      // Apply result size limit
      if (data.length > this.options.maxResultSize!) {
        data = data.slice(0, this.options.maxResultSize);
      }
      
      // Check memory usage
      if (this.options.enableMemoryOptimization) {
        this.checkMemoryUsage();
      }
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      // Check if query took too long
      if (this.options.enablePerformanceOptimization && queryTime > this.options.maxQueryTime!) {
        console.warn(`Query took too long: ${queryTime}ms`);
      }
      
      // Determine if there are more results
      const hasMore = (options.offset || 0) + (options.limit || data.length) < total;
      
      return {
        data,
        total,
        hasMore,
        queryTime,
        fromCache,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        console.error('Query timed out:', error);
        throw error;
      }
      
      console.error('Query failed:', error);
      throw error;
    } finally {
      // Clean up
      this.activeQueries.delete(queryId);
    }
  }

  /**
   * Generate a unique query ID
   */
  private generateQueryId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Check memory usage and clean up if necessary
   */
  private checkMemoryUsage(): void {
    // This is a simplified implementation
    // In a real application, you would calculate the actual memory usage
    
    // If cache is too large, clean up oldest entries
    if (this.queryCache.size > 100) {
      const entries = Array.from(this.queryCache.entries());
      
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 25% of entries
      const toRemove = Math.floor(entries.length * 0.25);
      for (let i = 0; i < toRemove; i++) {
        this.queryCache.delete(entries[i][0]);
      }
      
      console.log(`Cleaned up ${toRemove} cache entries to free memory`);
    }
  }

  /**
   * Cancel a query
   */
  cancelQuery(queryId: string): boolean {
    const controller = this.activeQueries.get(queryId);
    
    if (controller) {
      controller.abort();
      this.activeQueries.delete(queryId);
      return true;
    }
    
    return false;
  }

  /**
   * Cancel all active queries
   */
  cancelAllQueries(): void {
    for (const [queryId, controller] of this.activeQueries.entries()) {
      controller.abort();
    }
    this.activeQueries.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    totalEntries: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    if (this.queryCache.size === 0) {
      return {
        size: 0,
        totalEntries: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
    
    const entries = Array.from(this.queryCache.values());
    const timestamps = entries.map(entry => entry.timestamp);
    
    const oldestTimestamp = Math.min(...timestamps);
    const newestTimestamp = Math.max(...timestamps);
    
    let totalEntries = 0;
    for (const entry of entries) {
      totalEntries += entry.data.length;
    }
    
    return {
      size: this.queryCache.size,
      totalEntries,
      oldestEntry: new Date(oldestTimestamp),
      newestEntry: new Date(newestTimestamp),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<QueryOptimizerOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  getOptions(): QueryOptimizerOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const queryOptimizer = new QueryOptimizer({
  enableOptimization: true,
  maxResultSize: 1000,
  enablePagination: true,
  defaultPageSize: 50,
  enablePerformanceOptimization: true,
  maxQueryTime: 5000,
  enableQueryCaching: true,
  cacheExpiry: 60000,
  enableMemoryOptimization: true,
  maxMemoryUsage: 100,
});

// Export a factory function for easier usage
export function createQueryOptimizer(options?: QueryOptimizerOptions): QueryOptimizer {
  return new QueryOptimizer(options);
}

// React hook for query optimization
export function useQueryOptimizer() {
  return {
    executeQuery: queryOptimizer.executeQuery.bind(queryOptimizer),
    cancelQuery: queryOptimizer.cancelQuery.bind(queryOptimizer),
    cancelAllQueries: queryOptimizer.cancelAllQueries.bind(queryOptimizer),
    getCacheStats: queryOptimizer.getCacheStats.bind(queryOptimizer),
    clearCache: queryOptimizer.clearCache.bind(queryOptimizer),
  };
}