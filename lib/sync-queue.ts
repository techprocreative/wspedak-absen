import { storageService } from './storage'
import { storageManager, SyncQueueItem, AttendanceRecord, User, AppSettings } from './db'
import { supabase, isOnline } from './supabase'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Sync queue configuration interface
interface SyncQueueConfig {
  maxRetries?: number
  retryDelay?: number // Base delay in milliseconds
  maxRetryDelay?: number // Maximum delay in milliseconds
  retryBackoffFactor?: number // Exponential backoff factor
  batchSize?: number // Number of items to process in a batch
  syncInterval?: number // Interval in milliseconds to check for sync
  enablePriority?: boolean // Whether to prioritize items
}

// Sync result interface
interface SyncResult {
  success: boolean
  itemId: string
  error?: string
  retryCount: number
}

// Sync statistics interface
interface SyncStats {
  totalItems: number
  processedItems: number
  successfulItems: number
  failedItems: number
  pendingItems: number
}

// Default sync queue configuration
const DEFAULT_SYNC_QUEUE_CONFIG: Required<SyncQueueConfig> = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  maxRetryDelay: 300000, // 5 minutes
  retryBackoffFactor: 2,
  batchSize: 5,
  syncInterval: 30000, // 30 seconds
  enablePriority: true,
}

// Sync Queue class
export class SyncQueue {
  private config: Required<SyncQueueConfig>
  private isProcessing: boolean = false
  private syncIntervalId: NodeJS.Timeout | null = null
  private eventListeners: Map<string, Function[]> = new Map()

  constructor(config: SyncQueueConfig = {}) {
    this.config = { ...DEFAULT_SYNC_QUEUE_CONFIG, ...config }
    
    // Initialize sync interval
    this.startSyncInterval()
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline())
      window.addEventListener('offline', () => this.handleOffline())
    }
  }

  // Event handling
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || []
    listeners.forEach(listener => listener(data))
  }

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  // Queue management
  async addItem(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const id = this.generateId()
    const queueItem: SyncQueueItem = {
      id,
      timestamp: new Date(),
      retryCount: 0,
      ...item,
    }
    
    await storageService.addSyncQueueItem(queueItem)
    this.emit('itemAdded', queueItem)
    
    // If online, try to sync immediately
    if (isOnline()) {
      this.processQueue()
    }
    
    return id
  }

  async removeItem(id: string): Promise<void> {
    await storageService.removeSyncQueueItem(id)
    this.emit('itemRemoved', id)
  }

  async updateItem(item: SyncQueueItem): Promise<void> {
    await storageService.updateSyncQueueItem(item)
    this.emit('itemUpdated', item)
  }

  async getItems(filter?: {
    type?: string
    priority?: 'high' | 'medium' | 'low'
  }): Promise<SyncQueueItem[]> {
    return await storageService.getSyncQueueItems(filter)
  }

  async getStats(): Promise<SyncStats> {
    const items = await this.getItems()
    const stats: SyncStats = {
      totalItems: items.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      pendingItems: items.length,
    }
    
    // Calculate processed items (items with retryCount > 0)
    stats.processedItems = items.filter(item => item.retryCount > 0).length
    
    // Calculate successful items (items that have been synced)
    stats.successfulItems = items.filter(item => item.retryCount > 0 && item.data.synced).length
    
    // Calculate failed items (items that have reached max retries)
    stats.failedItems = items.filter(item => item.retryCount >= this.config.maxRetries).length
    
    return stats
  }

  async clearQueue(): Promise<void> {
    const items = await this.getItems()
    for (const item of items) {
      await this.removeItem(item.id)
    }
    this.emit('queueCleared')
  }

  // Priority-based queue processing
  private async getPrioritizedItems(): Promise<SyncQueueItem[]> {
    if (!this.config.enablePriority) {
      return await this.getItems()
    }
    
    const items = await this.getItems()
    
    // Sort by priority (high -> medium -> low) and then by timestamp (oldest first)
    return items.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 }
      const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]
      
      if (priorityDiff !== 0) {
        return priorityDiff
      }
      
      // If same priority, sort by timestamp (oldest first)
      return a.timestamp.getTime() - b.timestamp.getTime()
    })
  }

  // Retry logic with exponential backoff
  private calculateRetryDelay(retryCount: number): number {
    const delay = this.config.retryDelay * Math.pow(this.config.retryBackoffFactor, retryCount)
    return Math.min(delay, this.config.maxRetryDelay)
  }

  // Sync processing
  async processQueue(): Promise<void> {
    if (this.isProcessing || !isOnline()) {
      return
    }
    
    this.isProcessing = true
    this.emit('syncStarted')
    
    try {
      const items = await this.getPrioritizedItems()
      const batchSize = Math.min(this.config.batchSize, items.length)
      
      if (batchSize === 0) {
        this.emit('syncCompleted', { processed: 0, successful: 0, failed: 0 })
        return
      }
      
      const batch = items.slice(0, batchSize)
      const results: SyncResult[] = []
      
      for (const item of batch) {
        const result = await this.processItem(item)
        results.push(result)
        
        // Update item in queue
        if (result.success) {
          await this.removeItem(item.id)
        } else {
          // Update retry count
          item.retryCount += 1
          
          if (item.retryCount < this.config.maxRetries) {
            // Schedule retry with exponential backoff
            setTimeout(() => {
              this.processQueue()
            }, this.calculateRetryDelay(item.retryCount))
          } else {
            // Max retries reached, emit error event
            this.emit('maxRetriesReached', item)
          }
          
          await this.updateItem(item)
        }
      }
      
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      this.emit('syncBatchCompleted', {
        processed: results.length,
        successful,
        failed,
        results,
      })
      
      // If there are more items, process next batch
      if (items.length > batchSize) {
        setTimeout(() => this.processQueue(), 1000) // Small delay between batches
      } else {
        this.emit('syncCompleted', {
          processed: results.length,
          successful,
          failed,
        })
      }
    } catch (error) {
      logger.error('Error processing sync queue', error as Error)
      this.emit('syncError', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async processItem(item: SyncQueueItem): Promise<SyncResult> {
    try {
      switch (item.type) {
        case 'attendance':
          return await this.syncAttendanceRecord(item)
        case 'user':
          return await this.syncUser(item)
        case 'settings':
          return await this.syncSettings(item)
        default:
          return {
            success: false,
            itemId: item.id,
            error: `Unknown item type: ${item.type}`,
            retryCount: item.retryCount,
          }
      }
    } catch (error) {
      return {
        success: false,
        itemId: item.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: item.retryCount,
      }
    }
  }

  private async syncAttendanceRecord(item: SyncQueueItem): Promise<SyncResult> {
    const record = item.data as AttendanceRecord
    
    try {
      // Sync with Supabase
      const { data, error } = await supabase
        .from('attendance')
        .upsert({
          id: record.id,
          user_id: record.userId,
          timestamp: record.timestamp.toISOString(),
          type: record.type,
          location: record.location,
          photo: record.photo,
          synced: true,
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      // Update local record to mark as synced
      record.synced = true
      await storageService.saveAttendanceRecord(record)
      
      return {
        success: true,
        itemId: item.id,
        retryCount: item.retryCount,
      }
    } catch (error) {
      return {
        success: false,
        itemId: item.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: item.retryCount,
      }
    }
  }

  private async syncUser(item: SyncQueueItem): Promise<SyncResult> {
    const user = item.data as User
    
    try {
      // Sync with Supabase
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          photo: user.photo,
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      return {
        success: true,
        itemId: item.id,
        retryCount: item.retryCount,
      }
    } catch (error) {
      return {
        success: false,
        itemId: item.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: item.retryCount,
      }
    }
  }

  private async syncSettings(item: SyncQueueItem): Promise<SyncResult> {
    const settings = item.data as AppSettings
    
    try {
      // Sync with Supabase (assuming there's a settings table)
      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          id: settings.id,
          sync_interval: settings.syncInterval,
          max_retries: settings.maxRetries,
          offline_mode: settings.offlineMode,
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      return {
        success: true,
        itemId: item.id,
        retryCount: item.retryCount,
      }
    } catch (error) {
      return {
        success: false,
        itemId: item.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: item.retryCount,
      }
    }
  }

  // Queue persistence across browser sessions
  private startSyncInterval(): void {
    this.stopSyncInterval()
    
    this.syncIntervalId = setInterval(() => {
      if (isOnline()) {
        this.processQueue()
      }
    }, this.config.syncInterval)
  }

  private stopSyncInterval(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId)
      this.syncIntervalId = null
    }
  }

  // Event handlers
  private handleOnline(): void {
    this.emit('online')
    this.processQueue()
  }

  private handleOffline(): void {
    this.emit('offline')
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  async forceSync(): Promise<void> {
    if (isOnline()) {
      await this.processQueue()
    } else {
      throw new Error('Cannot sync while offline')
    }
  }

  // Cleanup
  destroy(): void {
    this.stopSyncInterval()
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', () => this.handleOnline())
      window.removeEventListener('offline', () => this.handleOffline())
    }
    
    this.eventListeners.clear()
  }
}

// Create a singleton instance
export const syncQueue = new SyncQueue()