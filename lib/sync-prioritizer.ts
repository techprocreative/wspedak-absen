/**
 * Sync Prioritizer
 * Provides prioritization of sync operations based on data importance and user context
 * Optimized for DS223J hardware constraints
 */

export interface SyncPriorityOptions {
  // Prioritization options
  enablePrioritization?: boolean;
  priorityUpdateInterval?: number; // ms
  
  // Priority rules
  prioritizeRecentData?: boolean;
  prioritizeUserFacingData?: boolean;
  prioritizeCriticalData?: boolean;
  
  // Priority weights
  recencyWeight?: number; // 0-1
  userFacingWeight?: number; // 0-1
  criticalWeight?: number; // 0-1
  
  // Performance options
  enablePerformanceOptimization?: boolean;
  maxPriorityCalculationTime?: number; // ms
}

export interface SyncItem {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  isUserFacing: boolean;
  isCritical: boolean;
  priority: number; // 0-100
}

export interface PriorityRule {
  name: string;
  description: string;
  weight: number; // 0-1
  apply: (item: SyncItem) => number; // Returns a score from 0-1
}

export class SyncPrioritizer {
  private options: SyncPriorityOptions;
  private isUpdating = false;
  private priorityUpdateIntervalId: number | null = null;
  private priorityRules: PriorityRule[] = [];
  private syncQueue: SyncItem[] = [];
  private priorityChangeCallbacks: Array<(item: SyncItem, oldPriority: number) => void> = [];

  constructor(options: SyncPriorityOptions = {}) {
    this.options = {
      enablePrioritization: true,
      priorityUpdateInterval: 30000, // 30 seconds
      prioritizeRecentData: true,
      prioritizeUserFacingData: true,
      prioritizeCriticalData: true,
      recencyWeight: 0.4,
      userFacingWeight: 0.3,
      criticalWeight: 0.3,
      enablePerformanceOptimization: true,
      maxPriorityCalculationTime: 50, // 50ms
      ...options,
    };
    
    this.initializePriorityRules();
  }

  /**
   * Initialize the sync prioritizer
   */
  initialize(): void {
    if (!this.options.enablePrioritization) {
      return;
    }

    // Start periodic priority updates
    this.startPriorityUpdates();
    
    console.log('Sync prioritizer initialized');
  }

  /**
   * Cleanup the sync prioritizer
   */
  cleanup(): void {
    // Stop priority updates
    this.stopPriorityUpdates();
    
    console.log('Sync prioritizer cleaned up');
  }

  /**
   * Initialize priority rules
   */
  private initializePriorityRules(): void {
    this.priorityRules = [];
    
    // Recency rule
    if (this.options.prioritizeRecentData) {
      this.priorityRules.push({
        name: 'recency',
        description: 'Prioritize recent data',
        weight: this.options.recencyWeight!,
        apply: (item: SyncItem) => {
          const now = Date.now();
          const age = now - item.timestamp;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          // Score decreases with age
          return Math.max(0, 1 - (age / maxAge));
        },
      });
    }
    
    // User-facing rule
    if (this.options.prioritizeUserFacingData) {
      this.priorityRules.push({
        name: 'userFacing',
        description: 'Prioritize user-facing data',
        weight: this.options.userFacingWeight!,
        apply: (item: SyncItem) => {
          // Score is 1 for user-facing data, 0 otherwise
          return item.isUserFacing ? 1 : 0;
        },
      });
    }
    
    // Critical rule
    if (this.options.prioritizeCriticalData) {
      this.priorityRules.push({
        name: 'critical',
        description: 'Prioritize critical data',
        weight: this.options.criticalWeight!,
        apply: (item: SyncItem) => {
          // Score is 1 for critical data, 0 otherwise
          return item.isCritical ? 1 : 0;
        },
      });
    }
    
    // Normalize weights
    const totalWeight = this.priorityRules.reduce((sum, rule) => sum + rule.weight, 0);
    if (totalWeight > 0) {
      this.priorityRules.forEach(rule => {
        rule.weight = rule.weight / totalWeight;
      });
    }
  }

  /**
   * Start periodic priority updates
   */
  private startPriorityUpdates(): void {
    if (this.priorityUpdateIntervalId !== null) {
      return;
    }
    
    this.priorityUpdateIntervalId = window.setInterval(() => {
      this.updatePriorities();
    }, this.options.priorityUpdateInterval);
  }

  /**
   * Stop periodic priority updates
   */
  private stopPriorityUpdates(): void {
    if (this.priorityUpdateIntervalId !== null) {
      clearInterval(this.priorityUpdateIntervalId);
      this.priorityUpdateIntervalId = null;
    }
  }

  /**
   * Update priorities for all items in the queue
   */
  updatePriorities(): void {
    if (this.isUpdating || this.syncQueue.length === 0) {
      return;
    }
    
    this.isUpdating = true;
    const startTime = performance.now();
    
    try {
      // Update priorities for all items
      for (const item of this.syncQueue) {
        const oldPriority = item.priority;
        const newPriority = this.calculatePriority(item);
        
        if (oldPriority !== newPriority) {
          item.priority = newPriority;
          
          // Notify callbacks
          this.priorityChangeCallbacks.forEach(callback => callback(item, oldPriority));
        }
      }
      
      // Sort queue by priority (highest first)
      this.syncQueue.sort((a, b) => b.priority - a.priority);
      
      const endTime = performance.now();
      
      // Check if priority calculation took too long
      if (this.options.enablePerformanceOptimization && 
          endTime - startTime > this.options.maxPriorityCalculationTime!) {
        console.warn(`Priority calculation took too long: ${endTime - startTime}ms`);
      }
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Calculate priority for a sync item
   */
  calculatePriority(item: SyncItem): number {
    let totalScore = 0;
    
    // Apply each rule
    for (const rule of this.priorityRules) {
      const score = rule.apply(item);
      totalScore += score * rule.weight;
    }
    
    // Convert to 0-100 scale
    return Math.round(totalScore * 100);
  }

  /**
   * Add an item to the sync queue
   */
  addToQueue(item: Omit<SyncItem, 'priority'>): SyncItem {
    // Calculate priority
    const priority = this.calculatePriority(item as SyncItem);
    
    // Create sync item
    const syncItem: SyncItem = {
      ...item,
      priority,
    };
    
    // Add to queue
    this.syncQueue.push(syncItem);
    
    // Sort queue by priority (highest first)
    this.syncQueue.sort((a, b) => b.priority - a.priority);
    
    return syncItem;
  }

  /**
   * Remove an item from the sync queue
   */
  removeFromQueue(itemId: string): SyncItem | null {
    const index = this.syncQueue.findIndex(item => item.id === itemId);
    
    if (index !== -1) {
      const item = this.syncQueue[index];
      this.syncQueue.splice(index, 1);
      return item;
    }
    
    return null;
  }

  /**
   * Get the next item to sync
   */
  getNextItem(): SyncItem | null {
    return this.syncQueue.length > 0 ? this.syncQueue[0] : null;
  }

  /**
   * Get the next batch of items to sync
   */
  getNextBatch(batchSize: number): SyncItem[] {
    return this.syncQueue.slice(0, batchSize);
  }

  /**
   * Mark items as synced (remove from queue)
   */
  markAsSynced(itemIds: string[]): SyncItem[] {
    const syncedItems: SyncItem[] = [];
    
    for (const itemId of itemIds) {
      const item = this.removeFromQueue(itemId);
      if (item) {
        syncedItems.push(item);
      }
    }
    
    return syncedItems;
  }

  /**
   * Get the sync queue
   */
  getQueue(): SyncItem[] {
    return [...this.syncQueue];
  }

  /**
   * Get the queue size
   */
  getQueueSize(): number {
    return this.syncQueue.length;
  }

  /**
   * Get items by type
   */
  getItemsByType(type: string): SyncItem[] {
    return this.syncQueue.filter(item => item.type === type);
  }

  /**
   * Get high priority items (priority >= 80)
   */
  getHighPriorityItems(): SyncItem[] {
    return this.syncQueue.filter(item => item.priority >= 80);
  }

  /**
   * Get medium priority items (50 <= priority < 80)
   */
  getMediumPriorityItems(): SyncItem[] {
    return this.syncQueue.filter(item => item.priority >= 50 && item.priority < 80);
  }

  /**
   * Get low priority items (priority < 50)
   */
  getLowPriorityItems(): SyncItem[] {
    return this.syncQueue.filter(item => item.priority < 50);
  }

  /**
   * Get priority statistics
   */
  getPriorityStats(): {
    total: number;
    high: number;
    medium: number;
    low: number;
    average: number;
  } {
    const total = this.syncQueue.length;
    const high = this.getHighPriorityItems().length;
    const medium = this.getMediumPriorityItems().length;
    const low = this.getLowPriorityItems().length;
    
    let average = 0;
    if (total > 0) {
      const sum = this.syncQueue.reduce((acc, item) => acc + item.priority, 0);
      average = sum / total;
    }
    
    return {
      total,
      high,
      medium,
      low,
      average,
    };
  }

  /**
   * Register a priority change callback
   */
  onPriorityChange(callback: (item: SyncItem, oldPriority: number) => void): void {
    this.priorityChangeCallbacks.push(callback);
  }

  /**
   * Unregister a priority change callback
   */
  offPriorityChange(callback: (item: SyncItem, oldPriority: number) => void): void {
    const index = this.priorityChangeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.priorityChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Add a custom priority rule
   */
  addPriorityRule(rule: PriorityRule): void {
    this.priorityRules.push(rule);
    
    // Normalize weights
    const totalWeight = this.priorityRules.reduce((sum, r) => sum + r.weight, 0);
    if (totalWeight > 0) {
      this.priorityRules.forEach(r => {
        r.weight = r.weight / totalWeight;
      });
    }
    
    // Update priorities
    this.updatePriorities();
  }

  /**
   * Remove a priority rule
   */
  removePriorityRule(ruleName: string): boolean {
    const index = this.priorityRules.findIndex(rule => rule.name === ruleName);
    
    if (index !== -1) {
      this.priorityRules.splice(index, 1);
      
      // Normalize weights
      const totalWeight = this.priorityRules.reduce((sum, rule) => sum + rule.weight, 0);
      if (totalWeight > 0) {
        this.priorityRules.forEach(rule => {
          rule.weight = rule.weight / totalWeight;
        });
      }
      
      // Update priorities
      this.updatePriorities();
      
      return true;
    }
    
    return false;
  }

  /**
   * Get priority rules
   */
  getPriorityRules(): PriorityRule[] {
    return [...this.priorityRules];
  }

  /**
   * Check if currently updating priorities
   */
  isCurrentlyUpdating(): boolean {
    return this.isUpdating;
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<SyncPriorityOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Reinitialize priority rules
    this.initializePriorityRules();
    
    // Restart priority updates if interval changed
    if (this.priorityUpdateIntervalId !== null && newOptions.priorityUpdateInterval) {
      this.stopPriorityUpdates();
      this.startPriorityUpdates();
    }
  }

  /**
   * Get current options
   */
  getOptions(): SyncPriorityOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const syncPrioritizer = new SyncPrioritizer({
  enablePrioritization: true,
  priorityUpdateInterval: 30000,
  prioritizeRecentData: true,
  prioritizeUserFacingData: true,
  prioritizeCriticalData: true,
  recencyWeight: 0.4,
  userFacingWeight: 0.3,
  criticalWeight: 0.3,
  enablePerformanceOptimization: true,
  maxPriorityCalculationTime: 50,
});

// Export a factory function for easier usage
export function createSyncPrioritizer(options?: SyncPriorityOptions): SyncPrioritizer {
  return new SyncPrioritizer(options);
}