/**
 * IndexedDB Batch Operations Manager
 * Provides optimized batch operations for IndexedDB to improve performance on DS223J hardware
 */

import { dataCompressor, CompressionOptions } from './data-compression';

export interface BatchOperation {
  type: 'add' | 'put' | 'delete' | 'get' | 'getAll';
  storeName: string;
  key?: IDBValidKey;
  value?: any;
  range?: IDBKeyRange;
  index?: string;
}

export interface BatchOptions {
  batchSize?: number;
  maxWaitTime?: number; // ms
  enableCompression?: boolean;
  compressionOptions?: CompressionOptions;
  enableCache?: boolean;
  cacheSize?: number;
}

export interface BatchResult {
  success: boolean;
  results: any[];
  errors: Error[];
  operationCount: number;
  processingTime: number;
}

export class IndexedDBBatcher {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private dbVersion: number;
  private options: BatchOptions;
  private pendingOperations: BatchOperation[] = [];
  private batchTimer: number | null = null;
  private isProcessing = false;
  private cache: Map<string, any> = new Map();
  private cacheAccessOrder: string[] = [];

  constructor(
    dbName: string,
    dbVersion: number,
    options: BatchOptions = {}
  ) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this.options = {
      batchSize: 50,
      maxWaitTime: 1000, // 1 second
      enableCompression: true,
      compressionOptions: {
        algorithm: 'lz-string',
        level: 6,
        enableChunking: false,
        chunkSize: 64 * 1024,
        enableCache: true,
        cacheSize: 100,
      },
      enableCache: true,
      cacheSize: 100,
      ...options,
    };
  }

  /**
   * Initialize the database connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        // This should be handled by the application
        // We're just opening the database here
      };
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Clear batch timer
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Add an operation to the batch queue
   */
  addOperation(operation: BatchOperation): void {
    this.pendingOperations.push(operation);

    // Check if we should process the batch
    if (this.pendingOperations.length >= this.options.batchSize!) {
      this.processBatch();
    } else if (this.batchTimer === null) {
      // Set a timer to process the batch after maxWaitTime
      this.batchTimer = window.setTimeout(() => {
        this.processBatch();
      }, this.options.maxWaitTime);
    }
  }

  /**
   * Add multiple operations to the batch queue
   */
  addOperations(operations: BatchOperation[]): void {
    operations.forEach(operation => this.addOperation(operation));
  }

  /**
   * Force processing of the current batch
   */
  async forceProcessBatch(): Promise<BatchResult> {
    return this.processBatch();
  }

  /**
   * Process the current batch of operations
   */
  private async processBatch(): Promise<BatchResult> {
    if (this.isProcessing || this.pendingOperations.length === 0 || !this.db) {
      return {
        success: false,
        results: [],
        errors: [],
        operationCount: 0,
        processingTime: 0,
      };
    }

    // Clear batch timer
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.isProcessing = true;
    const startTime = performance.now();

    // Take a snapshot of pending operations
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    try {
      // Group operations by store and type for efficient processing
      const groupedOperations = this.groupOperations(operations);
      
      // Process each group
      const results: any[] = [];
      const errors: Error[] = [];
      
      for (const [storeName, storeOperations] of Object.entries(groupedOperations)) {
        try {
          const storeResults = await this.processStoreOperations(storeName, storeOperations);
          results.push(...storeResults);
        } catch (error) {
          errors.push(error as Error);
        }
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      return {
        success: errors.length === 0,
        results,
        errors,
        operationCount: operations.length,
        processingTime,
      };
    } catch (error) {
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      return {
        success: false,
        results: [],
        errors: [error as Error],
        operationCount: operations.length,
        processingTime,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Group operations by store and type
   */
  private groupOperations(operations: BatchOperation[]): Record<string, BatchOperation[]> {
    const grouped: Record<string, BatchOperation[]> = {};
    
    for (const operation of operations) {
      const key = `${operation.storeName}:${operation.type}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      
      grouped[key].push(operation);
    }
    
    return grouped;
  }

  /**
   * Process operations for a specific store
   */
  private async processStoreOperations(
    storeName: string,
    operations: BatchOperation[]
  ): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // Process operations based on type
    const operationType = operations[0].type;
    
    switch (operationType) {
      case 'add':
        return this.processAddOperations(store, operations);
      case 'put':
        return this.processPutOperations(store, operations);
      case 'delete':
        return this.processDeleteOperations(store, operations);
      case 'get':
        return this.processGetOperations(store, operations);
      case 'getAll':
        return this.processGetAllOperations(store, operations);
      default:
        throw new Error(`Unknown operation type: ${operationType}`);
    }
  }

  /**
   * Process add operations
   */
  private async processAddOperations(
    store: IDBObjectStore,
    operations: BatchOperation[]
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (const operation of operations) {
      if (operation.type !== 'add') continue;
      
      try {
        const value = this.options.enableCompression
          ? await this.compressData(operation.value)
          : operation.value;
          
        const request = store.add(value, operation.key);
        const result = await this.promisifyRequest(request);
        results.push(result);
        
        // Update cache if enabled
        if (this.options.enableCache && operation.key) {
          this.updateCache(operation.key.toString(), operation.value);
        }
      } catch (error) {
        results.push({ error });
      }
    }
    
    return results;
  }

  /**
   * Process put operations
   */
  private async processPutOperations(
    store: IDBObjectStore,
    operations: BatchOperation[]
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (const operation of operations) {
      if (operation.type !== 'put') continue;
      
      try {
        const value = this.options.enableCompression
          ? await this.compressData(operation.value)
          : operation.value;
          
        const request = store.put(value, operation.key);
        const result = await this.promisifyRequest(request);
        results.push(result);
        
        // Update cache if enabled
        if (this.options.enableCache && operation.key) {
          this.updateCache(operation.key.toString(), operation.value);
        }
      } catch (error) {
        results.push({ error });
      }
    }
    
    return results;
  }

  /**
   * Process delete operations
   */
  private async processDeleteOperations(
    store: IDBObjectStore,
    operations: BatchOperation[]
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (const operation of operations) {
      if (operation.type !== 'delete') continue;
      
      try {
        if (operation.key !== undefined) {
          const deleteRequest = store.delete(operation.key);
          const result = await this.promisifyRequest(deleteRequest);
          results.push(result);
          
          // Update cache if enabled
          if (this.options.enableCache) {
            this.removeFromCache(operation.key.toString());
          }
        } else {
          results.push({ error: new Error('Key is required for delete operation') });
        }
      } catch (error) {
        results.push({ error });
      }
    }
    
    return results;
  }

  /**
   * Process get operations
   */
  private async processGetOperations(
    store: IDBObjectStore,
    operations: BatchOperation[]
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (const operation of operations) {
      if (operation.type !== 'get') continue;
      
      try {
        // Check cache first if enabled
        if (this.options.enableCache && operation.key) {
          const cachedValue = this.getFromCache(operation.key.toString());
          if (cachedValue !== undefined) {
            results.push(cachedValue);
            continue;
          }
        }
        
        if (operation.key !== undefined) {
          const getRequest = store.get(operation.key);
          let result = await this.promisifyRequest(getRequest);
          
          // Decompress if needed
          if (this.options.enableCompression && result) {
            result = await this.decompressData(result);
          }
          
          results.push(result);
          
          // Update cache if enabled
          if (this.options.enableCache && operation.key) {
            this.updateCache(operation.key.toString(), result);
          }
        } else {
          results.push({ error: new Error('Key is required for get operation') });
        }
      } catch (error) {
        results.push({ error });
      }
    }
    
    return results;
  }

  /**
   * Process getAll operations
   */
  private async processGetAllOperations(
    store: IDBObjectStore,
    operations: BatchOperation[]
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (const operation of operations) {
      if (operation.type !== 'getAll') continue;
      
      try {
        const request = operation.range
          ? store.getAll(operation.range)
          : operation.index
            ? store.index(operation.index).getAll(operation.range)
            : store.getAll();
            
        let result = await this.promisifyRequest(request);
        
        // Decompress if needed
        if (this.options.enableCompression && result) {
          result = await Promise.all(
            result.map(async (item: any) => item ? await this.decompressData(item) : item)
          );
        }
        
        results.push(result);
      } catch (error) {
        results.push({ error });
      }
    }
    
    return results;
  }

  /**
   * Promisify an IDBRequest
   */
  private promisifyRequest(request: IDBRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Compress data using the data compressor
   */
  private async compressData(data: any): Promise<any> {
    if (!this.options.enableCompression) {
      return data;
    }
    
    try {
      const result = await dataCompressor.compress(data);
      return result.compressed ? { _compressed: true, data: result.data, algorithm: result.algorithm } : data;
    } catch (error) {
      console.error('Compression failed:', error);
      return data;
    }
  }

  /**
   * Decompress data using the data compressor
   */
  private async decompressData(data: any): Promise<any> {
    if (!this.options.enableCompression || !data || !data._compressed) {
      return data;
    }
    
    try {
      const result = await dataCompressor.decompress(data.data, data.algorithm);
      return result.success ? result.data : data;
    } catch (error) {
      console.error('Decompression failed:', error);
      return data;
    }
  }

  /**
   * Update cache with new data
   */
  private updateCache(key: string, value: any): void {
    // Remove from cache if already exists
    this.removeFromCache(key);
    
    // Add to cache
    this.cache.set(key, value);
    this.cacheAccessOrder.push(key);
    
    // Limit cache size
    if (this.cache.size > this.options.cacheSize!) {
      const oldestKey = this.cacheAccessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Get data from cache
   */
  private getFromCache(key: string): any {
    const value = this.cache.get(key);
    
    // Update access order
    if (value !== undefined) {
      const index = this.cacheAccessOrder.indexOf(key);
      if (index !== -1) {
        this.cacheAccessOrder.splice(index, 1);
      }
      this.cacheAccessOrder.push(key);
    }
    
    return value;
  }

  /**
   * Remove data from cache
   */
  private removeFromCache(key: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      const index = this.cacheAccessOrder.indexOf(key);
      if (index !== -1) {
        this.cacheAccessOrder.splice(index, 1);
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheAccessOrder = [];
  }

  /**
   * Get pending operation count
   */
  getPendingOperationCount(): number {
    return this.pendingOperations.length;
  }

  /**
   * Check if processing
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<BatchOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  getOptions(): BatchOptions {
    return { ...this.options };
  }
}

// Export a factory function for easier usage
export function createIndexedDBBatcher(
  dbName: string,
  dbVersion: number,
  options?: BatchOptions
): IndexedDBBatcher {
  return new IndexedDBBatcher(dbName, dbVersion, options);
}