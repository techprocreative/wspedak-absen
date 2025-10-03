/**
 * Incremental Sync Manager
 * Provides incremental synchronization utilities optimized for DS223J hardware constraints
 */

export interface IncrementalSyncOptions {
  // Sync options
  enableIncrementalSync?: boolean;
  syncInterval?: number; // ms
  maxRetries?: number;
  retryDelay?: number; // ms
  
  // Batch options
  batchSize?: number;
  maxBatchWaitTime?: number; // ms
  
  // Change tracking options
  enableChangeTracking?: boolean;
  changeTrackingStrategy?: 'timestamp' | 'version' | 'hash';
  maxChangeLogSize?: number;
  
  // Performance options
  enablePerformanceOptimization?: boolean;
  maxSyncTime?: number; // ms
  enableCompression?: boolean;
}

export interface SyncChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  tableName: string;
  recordId: string;
  data?: any;
  timestamp: number;
  version?: number;
  hash?: string;
}

export interface SyncResult {
  success: boolean;
  changesSynced: number;
  changesFailed: number;
  changesSkipped: number;
  processingTime: number;
  error?: Error;
}

export interface SyncBatch {
  id: string;
  changes: SyncChange[];
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  error?: Error;
}

export class IncrementalSyncManager {
  private options: IncrementalSyncOptions;
  private changeLog: SyncChange[] = [];
  private syncBatches: Map<string, SyncBatch> = new Map();
  private isSyncing = false;
  private syncIntervalId: number | null = null;
  private lastSyncTime = 0;
  private syncCallbacks: Array<(result: SyncResult) => void> = [];

  constructor(options: IncrementalSyncOptions = {}) {
    this.options = {
      enableIncrementalSync: true,
      syncInterval: 60000, // 1 minute
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      batchSize: 50,
      maxBatchWaitTime: 10000, // 10 seconds
      enableChangeTracking: true,
      changeTrackingStrategy: 'timestamp',
      maxChangeLogSize: 1000,
      enablePerformanceOptimization: true,
      maxSyncTime: 30000, // 30 seconds
      enableCompression: true,
      ...options,
    };
  }

  /**
   * Initialize the incremental sync manager
   */
  initialize(): void {
    if (!this.options.enableIncrementalSync) {
      return;
    }

    // Load change log from storage
    this.loadChangeLog();
    
    // Start periodic sync
    this.startPeriodicSync();
    
    console.log('Incremental sync manager initialized');
  }

  /**
   * Cleanup the incremental sync manager
   */
  cleanup(): void {
    // Stop periodic sync
    this.stopPeriodicSync();
    
    // Save change log to storage
    this.saveChangeLog();
    
    console.log('Incremental sync manager cleaned up');
  }

  /**
   * Track a change for synchronization
   */
  trackChange(
    type: 'create' | 'update' | 'delete',
    tableName: string,
    recordId: string,
    data?: any
  ): void {
    if (!this.options.enableIncrementalSync || !this.options.enableChangeTracking) {
      return;
    }

    const change: SyncChange = {
      id: this.generateChangeId(),
      type,
      tableName,
      recordId,
      data,
      timestamp: Date.now(),
    };
    
    // Add version if using version strategy
    if (this.options.changeTrackingStrategy === 'version' && data) {
      change.version = data.version;
    }
    
    // Add hash if using hash strategy
    if (this.options.changeTrackingStrategy === 'hash' && data) {
      change.hash = this.generateHash(data);
    }
    
    // Add to change log
    this.changeLog.push(change);
    
    // Limit change log size
    if (this.changeLog.length > this.options.maxChangeLogSize!) {
      this.changeLog.shift();
    }
    
    // Save change log
    this.saveChangeLog();
  }

  /**
   * Start periodic synchronization
   */
  startPeriodicSync(): void {
    if (this.syncIntervalId !== null) {
      return;
    }
    
    this.syncIntervalId = window.setInterval(() => {
      this.syncChanges();
    }, this.options.syncInterval);
  }

  /**
   * Stop periodic synchronization
   */
  stopPeriodicSync(): void {
    if (this.syncIntervalId !== null) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  /**
   * Force synchronization of changes
   */
  async forceSync(): Promise<SyncResult> {
    return this.syncChanges();
  }

  /**
   * Synchronize changes
   */
  private async syncChanges(): Promise<SyncResult> {
    if (this.isSyncing || this.changeLog.length === 0) {
      return {
        success: false,
        changesSynced: 0,
        changesFailed: 0,
        changesSkipped: 0,
        processingTime: 0,
      };
    }

    this.isSyncing = true;
    const startTime = performance.now();
    
    try {
      // Create sync batches
      const batches = this.createSyncBatches();
      
      // Process batches
      let changesSynced = 0;
      let changesFailed = 0;
      let changesSkipped = 0;
      
      for (const batch of batches) {
        const batchResult = await this.processSyncBatch(batch);
        
        changesSynced += batchResult.changesSynced;
        changesFailed += batchResult.changesFailed;
        changesSkipped += batchResult.changesSkipped;
        
        // Check if we've exceeded max sync time
        if (this.options.enablePerformanceOptimization) {
          const elapsed = performance.now() - startTime;
          if (elapsed > this.options.maxSyncTime!) {
            console.warn(`Sync exceeded max time: ${elapsed}ms`);
            break;
          }
        }
      }
      
      const processingTime = performance.now() - startTime;
      this.lastSyncTime = Date.now();
      
      const result: SyncResult = {
        success: changesFailed === 0,
        changesSynced,
        changesFailed,
        changesSkipped,
        processingTime,
      };
      
      // Notify callbacks
      this.syncCallbacks.forEach(callback => callback(result));
      
      return result;
    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      return {
        success: false,
        changesSynced: 0,
        changesFailed: 0,
        changesSkipped: 0,
        processingTime,
        error: error as Error,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Create sync batches from changes
   */
  private createSyncBatches(): SyncBatch[] {
    const batches: SyncBatch[] = [];
    const batchSize = this.options.batchSize!;
    
    // Group changes by table
    const changesByTable: Record<string, SyncChange[]> = {};
    
    for (const change of this.changeLog) {
      if (!changesByTable[change.tableName]) {
        changesByTable[change.tableName] = [];
      }
      
      changesByTable[change.tableName].push(change);
    }
    
    // Create batches for each table
    for (const [tableName, changes] of Object.entries(changesByTable)) {
      for (let i = 0; i < changes.length; i += batchSize) {
        const batchChanges = changes.slice(i, i + batchSize);
        
        const batch: SyncBatch = {
          id: this.generateBatchId(),
          changes: batchChanges,
          timestamp: Date.now(),
          status: 'pending',
          retryCount: 0,
        };
        
        batches.push(batch);
        this.syncBatches.set(batch.id, batch);
      }
    }
    
    return batches;
  }

  /**
   * Process a sync batch
   */
  private async processSyncBatch(batch: SyncBatch): Promise<SyncResult> {
    batch.status = 'processing';
    
    try {
      // This is where you would send the batch to the server
      // For now, we'll simulate a successful sync
      const result = await this.syncBatchWithServer(batch);
      
      batch.status = result.success ? 'completed' : 'failed';
      
      if (result.success) {
        // Remove synced changes from change log
        this.removeSyncedChanges(batch.changes);
      } else {
        // Increment retry count
        batch.retryCount++;
        batch.error = result.error;
        
        // Retry if max retries not reached
        if (batch.retryCount < this.options.maxRetries!) {
          setTimeout(() => {
            this.processSyncBatch(batch);
          }, this.options.retryDelay);
        }
      }
      
      return result;
    } catch (error) {
      batch.status = 'failed';
      batch.retryCount++;
      batch.error = error as Error;
      
      return {
        success: false,
        changesSynced: 0,
        changesFailed: batch.changes.length,
        changesSkipped: 0,
        processingTime: 0,
        error: error as Error,
      };
    }
  }

  /**
   * Sync a batch with the server
   */
  private async syncBatchWithServer(batch: SyncBatch): Promise<SyncResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      return {
        success: false,
        changesSynced: 0,
        changesFailed: batch.changes.length,
        changesSkipped: 0,
        processingTime: 0,
        error: new Error('Simulated network error'),
      };
    }
    
    // Simulate successful sync
    return {
      success: true,
      changesSynced: batch.changes.length,
      changesFailed: 0,
      changesSkipped: 0,
      processingTime: 0,
    };
  }

  /**
   * Remove synced changes from the change log
   */
  private removeSyncedChanges(changes: SyncChange[]): void {
    for (const change of changes) {
      const index = this.changeLog.findIndex(c => c.id === change.id);
      if (index !== -1) {
        this.changeLog.splice(index, 1);
      }
    }
    
    // Save change log
    this.saveChangeLog();
  }

  /**
   * Generate a unique change ID
   */
  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a hash for data
   */
  private generateHash(data: any): string {
    // Simple hash function for demonstration
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Load change log from storage
   */
  private loadChangeLog(): void {
    // In a real implementation, you would load from IndexedDB or localStorage
    // For now, we'll start with an empty change log
    this.changeLog = [];
  }

  /**
   * Save change log to storage
   */
  private saveChangeLog(): void {
    // In a real implementation, you would save to IndexedDB or localStorage
    // For now, we'll just log the change log
    console.log(`Saving change log with ${this.changeLog.length} changes`);
  }

  /**
   * Register a sync callback
   */
  onSyncComplete(callback: (result: SyncResult) => void): void {
    this.syncCallbacks.push(callback);
  }

  /**
   * Unregister a sync callback
   */
  offSyncComplete(callback: (result: SyncResult) => void): void {
    const index = this.syncCallbacks.indexOf(callback);
    if (index !== -1) {
      this.syncCallbacks.splice(index, 1);
    }
  }

  /**
   * Get change log
   */
  getChangeLog(): SyncChange[] {
    return [...this.changeLog];
  }

  /**
   * Get sync batches
   */
  getSyncBatches(): SyncBatch[] {
    return Array.from(this.syncBatches.values());
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * Check if currently syncing
   */
  isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<IncrementalSyncOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart periodic sync if interval changed
    if (this.syncIntervalId !== null && newOptions.syncInterval) {
      this.stopPeriodicSync();
      this.startPeriodicSync();
    }
  }

  /**
   * Get current options
   */
  getOptions(): IncrementalSyncOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const incrementalSyncManager = new IncrementalSyncManager({
  enableIncrementalSync: true,
  syncInterval: 60000,
  maxRetries: 3,
  retryDelay: 5000,
  batchSize: 50,
  maxBatchWaitTime: 10000,
  enableChangeTracking: true,
  changeTrackingStrategy: 'timestamp',
  maxChangeLogSize: 1000,
  enablePerformanceOptimization: true,
  maxSyncTime: 30000,
  enableCompression: true,
});

// Export a factory function for easier usage
export function createIncrementalSyncManager(options?: IncrementalSyncOptions): IncrementalSyncManager {
  return new IncrementalSyncManager(options);
}