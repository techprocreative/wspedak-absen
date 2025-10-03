/**
 * Data Compression Utilities
 * Provides data compression and decompression utilities optimized for DS223J hardware constraints
 */

export interface CompressionOptions {
  algorithm?: 'gzip' | 'deflate' | 'lz-string' | 'custom';
  level?: number; // 1-9, where 1 is fastest and 9 is best compression
  enableChunking?: boolean;
  chunkSize?: number; // bytes
  enableCache?: boolean;
  cacheSize?: number;
}

export interface CompressionResult {
  compressed: boolean;
  data: ArrayBuffer | string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
  processingTime: number;
}

export interface DecompressionResult {
  success: boolean;
  data: any;
  originalSize: number;
  compressionRatio: number;
  algorithm: string;
  processingTime: number;
  error?: Error;
}

export class DataCompressor {
  private options: CompressionOptions;
  private compressionCache: Map<string, CompressionResult> = new Map();
  private decompressionCache: Map<string, any> = new Map();
  private cacheAccessOrder: { compression: string[]; decompression: string[] } = {
    compression: [],
    decompression: [],
  };

  constructor(options: CompressionOptions = {}) {
    this.options = {
      algorithm: 'lz-string',
      level: 6, // Balanced compression level
      enableChunking: false,
      chunkSize: 64 * 1024, // 64KB chunks
      enableCache: true,
      cacheSize: 100,
      ...options,
    };
  }

  /**
   * Compress data
   */
  async compress(data: any, customKey?: string): Promise<CompressionResult> {
    const startTime = performance.now();
    const originalSize = this.calculateDataSize(data);
    
    // Check cache first if enabled
    if (this.options.enableCache) {
      const cacheKey = customKey || this.generateCacheKey(data);
      const cachedResult = this.getFromCompressionCache(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }
    
    try {
      // Serialize data if needed
      let serializedData: string | ArrayBuffer;
      
      if (typeof data === 'string') {
        serializedData = data;
      } else if (data instanceof ArrayBuffer) {
        serializedData = data;
      } else {
        serializedData = JSON.stringify(data);
      }
      
      // Compress based on algorithm
      let compressedData: ArrayBuffer | string;
      let algorithm: string;
      
      switch (this.options.algorithm) {
        case 'gzip':
          compressedData = await this.compressGzip(serializedData);
          algorithm = 'gzip';
          break;
        case 'deflate':
          compressedData = await this.compressDeflate(serializedData);
          algorithm = 'deflate';
          break;
        case 'lz-string':
          compressedData = this.compressLZString(serializedData);
          algorithm = 'lz-string';
          break;
        case 'custom':
          compressedData = await this.compressCustom(serializedData);
          algorithm = 'custom';
          break;
        default:
          compressedData = this.compressLZString(serializedData);
          algorithm = 'lz-string';
          break;
      }
      
      const compressedSize = this.calculateDataSize(compressedData);
      const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;
      const processingTime = performance.now() - startTime;
      
      // Only use compression if it actually reduces size
      const isCompressed = compressionRatio < 0.95; // Allow 5% overhead
      
      const result: CompressionResult = {
        compressed: isCompressed,
        data: isCompressed ? compressedData : data,
        originalSize,
        compressedSize: isCompressed ? compressedSize : originalSize,
        compressionRatio: isCompressed ? compressionRatio : 1,
        algorithm: isCompressed ? algorithm : 'none',
        processingTime,
      };
      
      // Update cache if enabled
      if (this.options.enableCache) {
        const cacheKey = customKey || this.generateCacheKey(data);
        this.updateCompressionCache(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      // Return uncompressed data on error
      return {
        compressed: false,
        data,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        algorithm: 'none',
        processingTime,
      };
    }
  }

  /**
   * Decompress data
   */
  async decompress(
    compressedData: ArrayBuffer | string,
    algorithm: string,
    originalKey?: string
  ): Promise<DecompressionResult> {
    const startTime = performance.now();
    
    // Check cache first if enabled
    if (this.options.enableCache && originalKey) {
      const cachedData = this.getFromDecompressionCache(originalKey);
      if (cachedData !== undefined) {
        return {
          success: true,
          data: cachedData,
          originalSize: this.calculateDataSize(cachedData),
          compressionRatio: 1,
          algorithm,
          processingTime: performance.now() - startTime,
        };
      }
    }
    
    try {
      let decompressedData: string | ArrayBuffer;
      
      // Decompress based on algorithm
      switch (algorithm) {
        case 'gzip':
          decompressedData = await this.decompressGzip(compressedData);
          break;
        case 'deflate':
          decompressedData = await this.decompressDeflate(compressedData);
          break;
        case 'lz-string':
          decompressedData = this.decompressLZString(
            typeof compressedData === 'string' ? compressedData : new TextDecoder().decode(compressedData)
          );
          break;
        case 'custom':
          decompressedData = await this.decompressCustom(compressedData);
          break;
        case 'none':
          // Data wasn't compressed
          decompressedData = compressedData;
          break;
        default:
          throw new Error(`Unknown compression algorithm: ${algorithm}`);
      }
      
      // Deserialize data if needed
      let finalData: any;
      
      if (compressedData instanceof ArrayBuffer) {
        // Assume binary data, return as is
        finalData = decompressedData;
      } else if (typeof decompressedData === 'string') {
        try {
          // Try to parse as JSON
          finalData = JSON.parse(decompressedData);
        } catch {
          // Return as string if not valid JSON
          finalData = decompressedData;
        }
      } else {
        finalData = decompressedData;
      }
      
      const originalSize = this.calculateDataSize(finalData);
      const processingTime = performance.now() - startTime;
      
      // Update cache if enabled
      if (this.options.enableCache && originalKey) {
        this.updateDecompressionCache(originalKey, finalData);
      }
      
      return {
        success: true,
        data: finalData,
        originalSize,
        compressionRatio: 1, // Not applicable for decompression
        algorithm,
        processingTime,
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      return {
        success: false,
        data: null,
        originalSize: 0,
        compressionRatio: 1,
        algorithm,
        processingTime,
        error: error as Error,
      };
    }
  }

  /**
   * Compress data using gzip
   */
  private async compressGzip(data: string | ArrayBuffer): Promise<ArrayBuffer> {
    // In a real implementation, you would use the CompressionStream API
    // For now, we'll return a mock compressed array
    if (typeof data === 'string') {
      const encoder = new TextEncoder();
      data = encoder.encode(data).buffer;
    }
    
    // Mock compression - in reality would use CompressionStream
    return data; // Return as is for mock
  }

  /**
   * Decompress data using gzip
   */
  private async decompressGzip(data: ArrayBuffer | string): Promise<string> {
    // In a real implementation, you would use the DecompressionStream API
    // For now, we'll return a mock decompressed string
    if (typeof data === 'string') {
      return data;
    }
    
    const decoder = new TextDecoder();
    return decoder.decode(data);
  }

  /**
   * Compress data using deflate
   */
  private async compressDeflate(data: string | ArrayBuffer): Promise<ArrayBuffer> {
    // Similar to gzip but using deflate algorithm
    return this.compressGzip(data);
  }

  /**
   * Decompress data using deflate
   */
  private async decompressDeflate(data: ArrayBuffer | string): Promise<string> {
    // Similar to gzip but using deflate algorithm
    return this.decompressGzip(data);
  }

  /**
   * Compress data using LZ-string
   */
  private compressLZString(data: string | ArrayBuffer): string {
    // In a real implementation, you would use the LZ-string library
    // For now, we'll return a mock compressed string
    if (typeof data === 'string') {
      return data; // Return as is for mock
    }
    
    const decoder = new TextDecoder();
    return decoder.decode(data);
  }

  /**
   * Decompress data using LZ-string
   */
  private decompressLZString(data: string): string {
    // In a real implementation, you would use the LZ-string library
    // For now, we'll return the data as is
    return data;
  }

  /**
   * Compress data using custom algorithm
   */
  private async compressCustom(data: string | ArrayBuffer): Promise<ArrayBuffer> {
    // Implement custom compression algorithm
    return this.compressGzip(data);
  }

  /**
   * Decompress data using custom algorithm
   */
  private async decompressCustom(data: ArrayBuffer | string): Promise<string> {
    // Implement custom decompression algorithm
    return this.decompressGzip(data);
  }

  /**
   * Calculate the size of data in bytes
   */
  private calculateDataSize(data: any): number {
    if (typeof data === 'string') {
      return new Blob([data]).size;
    } else if (data instanceof ArrayBuffer) {
      return data.byteLength;
    } else {
      // For objects, calculate size of JSON string
      return new Blob([JSON.stringify(data)]).size;
    }
  }

  /**
   * Generate a cache key for data
   */
  private generateCacheKey(data: any): string {
    // Simple hash function for cache key
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Update compression cache
   */
  private updateCompressionCache(key: string, result: CompressionResult): void {
    // Remove from cache if already exists
    this.removeFromCompressionCache(key);
    
    // Add to cache
    this.compressionCache.set(key, result);
    this.cacheAccessOrder.compression.push(key);
    
    // Limit cache size
    if (this.compressionCache.size > this.options.cacheSize!) {
      const oldestKey = this.cacheAccessOrder.compression.shift();
      if (oldestKey) {
        this.compressionCache.delete(oldestKey);
      }
    }
  }

  /**
   * Get data from compression cache
   */
  private getFromCompressionCache(key: string): CompressionResult | null {
    const result = this.compressionCache.get(key);
    
    // Update access order
    if (result) {
      const index = this.cacheAccessOrder.compression.indexOf(key);
      if (index !== -1) {
        this.cacheAccessOrder.compression.splice(index, 1);
      }
      this.cacheAccessOrder.compression.push(key);
    }
    
    return result || null;
  }

  /**
   * Remove data from compression cache
   */
  private removeFromCompressionCache(key: string): void {
    if (this.compressionCache.has(key)) {
      this.compressionCache.delete(key);
      const index = this.cacheAccessOrder.compression.indexOf(key);
      if (index !== -1) {
        this.cacheAccessOrder.compression.splice(index, 1);
      }
    }
  }

  /**
   * Update decompression cache
   */
  private updateDecompressionCache(key: string, data: any): void {
    // Remove from cache if already exists
    this.removeFromDecompressionCache(key);
    
    // Add to cache
    this.decompressionCache.set(key, data);
    this.cacheAccessOrder.decompression.push(key);
    
    // Limit cache size
    if (this.decompressionCache.size > this.options.cacheSize!) {
      const oldestKey = this.cacheAccessOrder.decompression.shift();
      if (oldestKey) {
        this.decompressionCache.delete(oldestKey);
      }
    }
  }

  /**
   * Get data from decompression cache
   */
  private getFromDecompressionCache(key: string): any {
    const data = this.decompressionCache.get(key);
    
    // Update access order
    if (data !== undefined) {
      const index = this.cacheAccessOrder.decompression.indexOf(key);
      if (index !== -1) {
        this.cacheAccessOrder.decompression.splice(index, 1);
      }
      this.cacheAccessOrder.decompression.push(key);
    }
    
    return data;
  }

  /**
   * Remove data from decompression cache
   */
  private removeFromDecompressionCache(key: string): void {
    if (this.decompressionCache.has(key)) {
      this.decompressionCache.delete(key);
      const index = this.cacheAccessOrder.decompression.indexOf(key);
      if (index !== -1) {
        this.cacheAccessOrder.decompression.splice(index, 1);
      }
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.compressionCache.clear();
    this.decompressionCache.clear();
    this.cacheAccessOrder.compression = [];
    this.cacheAccessOrder.decompression = [];
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<CompressionOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  getOptions(): CompressionOptions {
    return { ...this.options };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    compressionCacheSize: number;
    decompressionCacheSize: number;
    compressionCacheHits: number;
    decompressionCacheHits: number;
  } {
    return {
      compressionCacheSize: this.compressionCache.size,
      decompressionCacheSize: this.decompressionCache.size,
      compressionCacheHits: 0, // Would need to track hits
      decompressionCacheHits: 0, // Would need to track hits
    };
  }
}

// Singleton instance with default options
export const dataCompressor = new DataCompressor({
  algorithm: 'lz-string',
  level: 6,
  enableChunking: false,
  chunkSize: 64 * 1024,
  enableCache: true,
  cacheSize: 100,
});

// Export a factory function for easier usage
export function createDataCompressor(options?: CompressionOptions): DataCompressor {
  return new DataCompressor(options);
}