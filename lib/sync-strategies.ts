import { syncManager, SyncDirection, SyncPriority, SyncStatus, SyncResult } from './sync-manager'
import { storageService } from './storage'
import { AttendanceRecord, User } from './db'
import { supabaseService, isOnline } from './supabase'
import { syncQueue } from './sync-queue'

import { logger } from '@/lib/logger'
// Sync strategy interface
export interface SyncStrategy {
  name: string
  description: string
  execute: (data: any) => Promise<SyncResult>
  shouldExecute: (data: any) => boolean
  priority: SyncPriority
  throttle?: number // in milliseconds
}

// Optimistic sync strategy interface
export interface OptimisticSyncStrategy extends SyncStrategy {
  onSyncSuccess?: (data: any) => void
  onSyncFailure?: (data: any, error: any) => void
  rollback?: (data: any) => Promise<void>
}

// Lazy sync strategy interface
export interface LazySyncStrategy extends SyncStrategy {
  delay: number // in milliseconds
  maxDelay: number // in milliseconds
  condition?: () => boolean
}

// Priority-based sync strategy interface
export interface PrioritySyncStrategy extends SyncStrategy {
  priorityRules: PriorityRule[]
}

// Priority rule interface
export interface PriorityRule {
  condition: (data: any) => boolean
  priority: SyncPriority
}

// Throttled sync strategy interface
export interface ThrottledSyncStrategy extends SyncStrategy {
  throttleTime: number // in milliseconds
  maxBatchSize: number
  queue: any[]
}

// Sync strategy factory interface
export interface SyncStrategyFactory {
  createOptimisticStrategy: (options: OptimisticSyncOptions) => OptimisticSyncStrategy
  createLazyStrategy: (options: LazySyncOptions) => LazySyncStrategy
  createPriorityStrategy: (options: PrioritySyncOptions) => PrioritySyncStrategy
  createThrottledStrategy: (options: ThrottledSyncOptions) => ThrottledSyncStrategy
}

// Optimistic sync options interface
export interface OptimisticSyncOptions {
  name?: string
  description?: string
  priority?: SyncPriority
  onSyncSuccess?: (data: any) => void
  onSyncFailure?: (data: any, error: any) => void
  rollback?: (data: any) => Promise<void>
}

// Lazy sync options interface
export interface LazySyncOptions {
  name?: string
  description?: string
  priority?: SyncPriority
  delay: number
  maxDelay: number
  condition?: () => boolean
}

// Priority sync options interface
export interface PrioritySyncOptions {
  name?: string
  description?: string
  priorityRules: PriorityRule[]
}

// Throttled sync options interface
export interface ThrottledSyncOptions {
  name?: string
  description?: string
  priority?: SyncPriority
  throttleTime: number
  maxBatchSize: number
}

// Default sync strategy factory implementation
export class DefaultSyncStrategyFactory implements SyncStrategyFactory {
  createOptimisticStrategy(options: OptimisticSyncOptions): OptimisticSyncStrategy {
    return {
      name: options.name || 'Optimistic Sync',
      description: options.description || 'Syncs data optimistically, assuming success',
      priority: options.priority || SyncPriority.HIGH,
      execute: async (data: any) => {
        // For optimistic sync, we assume success and update UI immediately
        // Then we sync in the background
        
        try {
          // Add to sync queue
          await syncQueue.addItem({
            type: data.type || 'unknown',
            data,
            priority: options.priority || SyncPriority.HIGH,
          })
          
          // Return success result immediately
          return {
            success: true,
            status: SyncStatus.COMPLETED,
            timestamp: new Date(),
            itemsProcessed: 1,
            itemsSucceeded: 1,
            itemsFailed: 0,
            conflicts: [],
            duration: 0,
          }
        } catch (error) {
          // If adding to queue fails, return error
          return {
            success: false,
            status: SyncStatus.ERROR,
            timestamp: new Date(),
            itemsProcessed: 1,
            itemsSucceeded: 0,
            itemsFailed: 1,
            conflicts: [],
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: 0,
          }
        }
      },
      shouldExecute: (data: any) => {
        // Optimistic sync should execute for all data
        return true
      },
      onSyncSuccess: options.onSyncSuccess,
      onSyncFailure: options.onSyncFailure,
      rollback: options.rollback,
    }
  }

  createLazyStrategy(options: LazySyncOptions): LazySyncStrategy {
    let timeoutId: NodeJS.Timeout | null = null
    
    return {
      name: options.name || 'Lazy Sync',
      description: options.description || 'Syncs data lazily, with a delay',
      priority: options.priority || SyncPriority.LOW,
      delay: options.delay,
      maxDelay: options.maxDelay,
      condition: options.condition,
      execute: async (data: any) => {
        // For lazy sync, we delay the sync
        
        return new Promise((resolve) => {
          // Clear any existing timeout
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          
          // Calculate delay
          let delay = options.delay
          if (options.condition && !options.condition()) {
            delay = Math.min(delay * 2, options.maxDelay)
          }
          
          // Set timeout for sync
          timeoutId = setTimeout(async () => {
            try {
              // Add to sync queue
              await syncQueue.addItem({
                type: data.type || 'unknown',
                data,
                priority: options.priority || SyncPriority.LOW,
              })
              
              // Return success result
              resolve({
                success: true,
                status: SyncStatus.COMPLETED,
                timestamp: new Date(),
                itemsProcessed: 1,
                itemsSucceeded: 1,
                itemsFailed: 0,
                conflicts: [],
                duration: delay,
              })
            } catch (error) {
              // If adding to queue fails, return error
              resolve({
                success: false,
                status: SyncStatus.ERROR,
                timestamp: new Date(),
                itemsProcessed: 1,
                itemsSucceeded: 0,
                itemsFailed: 1,
                conflicts: [],
                error: error instanceof Error ? error.message : 'Unknown error',
                duration: delay,
              })
            }
          }, delay)
        })
      },
      shouldExecute: (data: any) => {
        // Lazy sync should execute for all data
        return true
      },
    }
  }

  createPriorityStrategy(options: PrioritySyncOptions): PrioritySyncStrategy {
    return {
      name: options.name || 'Priority Sync',
      description: options.description || 'Syncs data based on priority rules',
      priority: SyncPriority.MEDIUM,
      priorityRules: options.priorityRules,
      execute: async (data: any) => {
        // Determine priority based on rules
        let priority = SyncPriority.MEDIUM
        
        for (const rule of options.priorityRules) {
          if (rule.condition(data)) {
            priority = rule.priority
            break
          }
        }
        
        // Add to sync queue with determined priority
        try {
          await syncQueue.addItem({
            type: data.type || 'unknown',
            data,
            priority,
          })
          
          // Return success result
          return {
            success: true,
            status: SyncStatus.COMPLETED,
            timestamp: new Date(),
            itemsProcessed: 1,
            itemsSucceeded: 1,
            itemsFailed: 0,
            conflicts: [],
            duration: 0,
          }
        } catch (error) {
          // If adding to queue fails, return error
          return {
            success: false,
            status: SyncStatus.ERROR,
            timestamp: new Date(),
            itemsProcessed: 1,
            itemsSucceeded: 0,
            itemsFailed: 1,
            conflicts: [],
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: 0,
          }
        }
      },
      shouldExecute: (data: any) => {
        // Priority sync should execute for all data
        return true
      },
    }
  }

  createThrottledStrategy(options: ThrottledSyncOptions): ThrottledSyncStrategy {
    let lastSyncTime = 0
    const queue: any[] = []
    
    return {
      name: options.name || 'Throttled Sync',
      description: options.description || 'Syncs data with throttling',
      priority: options.priority || SyncPriority.MEDIUM,
      throttleTime: options.throttleTime,
      maxBatchSize: options.maxBatchSize,
      queue,
      execute: async (data: any) => {
        // Add data to queue
        queue.push(data)
        
        // Check if we should sync now
        const now = Date.now()
        const timeSinceLastSync = now - lastSyncTime
        
        if (timeSinceLastSync >= options.throttleTime || queue.length >= options.maxBatchSize) {
          // Get batch to sync
          const batch = queue.splice(0, options.maxBatchSize)
          
          // Update last sync time
          lastSyncTime = now
          
          // Add batch to sync queue
          try {
            for (const item of batch) {
              await syncQueue.addItem({
                type: item.type || 'unknown',
                data: item,
                priority: options.priority || SyncPriority.MEDIUM,
              })
            }
            
            // Return success result
            return {
              success: true,
              status: SyncStatus.COMPLETED,
              timestamp: new Date(),
              itemsProcessed: batch.length,
              itemsSucceeded: batch.length,
              itemsFailed: 0,
              conflicts: [],
              duration: 0,
            }
          } catch (error) {
            // If adding to queue fails, return error
            return {
              success: false,
              status: SyncStatus.ERROR,
              timestamp: new Date(),
              itemsProcessed: batch.length,
              itemsSucceeded: 0,
              itemsFailed: batch.length,
              conflicts: [],
              error: error instanceof Error ? error.message : 'Unknown error',
              duration: 0,
            }
          }
        } else {
          // Not time to sync yet, return success but with 0 items processed
          return {
            success: true,
            status: SyncStatus.COMPLETED,
            timestamp: new Date(),
            itemsProcessed: 0,
            itemsSucceeded: 0,
            itemsFailed: 0,
            conflicts: [],
            duration: 0,
          }
        }
      },
      shouldExecute: (data: any) => {
        // Throttled sync should execute for all data
        return true
      },
    }
  }
}

// Sync strategy registry
export class SyncStrategyRegistry {
  private strategies: Map<string, SyncStrategy> = new Map()
  private factory: SyncStrategyFactory

  constructor(factory: SyncStrategyFactory = new DefaultSyncStrategyFactory()) {
    this.factory = factory
    
    // Register default strategies
    this.registerDefaultStrategies()
  }

  private registerDefaultStrategies(): void {
    // Optimistic sync for attendance records
    this.registerStrategy('attendance-optimistic', this.factory.createOptimisticStrategy({
      name: 'Attendance Optimistic Sync',
      description: 'Optimistic sync for attendance records',
      priority: SyncPriority.HIGH,
      onSyncSuccess: (data: AttendanceRecord) => {
        // Update UI to show record as synced
        logger.info('Attendance record synced successfully', { value: data.id })
      },
      onSyncFailure: (data: AttendanceRecord, error: any) => {
        // Show error to user
        logger.error('Failed to sync attendance record', error as Error, { value: data.id })
      },
      rollback: async (data: AttendanceRecord) => {
        // Rollback the record
        try {
          await storageService.deleteAttendanceRecord(data.id)
        } catch (error) {
          logger.error('Failed to rollback attendance record', error as Error, { value: data.id })
        }
      },
    }))
    
    // Lazy sync for user data
    this.registerStrategy('user-lazy', this.factory.createLazyStrategy({
      name: 'User Lazy Sync',
      description: 'Lazy sync for user data',
      priority: SyncPriority.MEDIUM,
      delay: 5000, // 5 seconds
      maxDelay: 60000, // 1 minute
      condition: () => isOnline(),
    }))
    
    // Priority sync for settings
    this.registerStrategy('settings-priority', this.factory.createPriorityStrategy({
      name: 'Settings Priority Sync',
      description: 'Priority sync for settings',
      priorityRules: [
        {
          condition: (data: any) => data.critical === true,
          priority: SyncPriority.HIGH,
        },
        {
          condition: (data: any) => data.important === true,
          priority: SyncPriority.MEDIUM,
        },
        {
          condition: () => true,
          priority: SyncPriority.LOW,
        },
      ],
    }))
    
    // Throttled sync for analytics
    this.registerStrategy('analytics-throttled', this.factory.createThrottledStrategy({
      name: 'Analytics Throttled Sync',
      description: 'Throttled sync for analytics data',
      priority: SyncPriority.LOW,
      throttleTime: 60000, // 1 minute
      maxBatchSize: 10,
    }))
  }

  registerStrategy(name: string, strategy: SyncStrategy): void {
    this.strategies.set(name, strategy)
  }

  getStrategy(name: string): SyncStrategy | undefined {
    return this.strategies.get(name)
  }

  getAllStrategies(): SyncStrategy[] {
    return Array.from(this.strategies.values())
  }

  async executeStrategy(name: string, data: any): Promise<SyncResult> {
    const strategy = this.getStrategy(name)
    
    if (!strategy) {
      throw new Error(`Strategy with name '${name}' not found`)
    }
    
    if (!strategy.shouldExecute(data)) {
      return {
        success: false,
        status: SyncStatus.ERROR,
        timestamp: new Date(),
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        conflicts: [],
        error: `Strategy '${name}' should not execute for this data`,
        duration: 0,
      }
    }
    
    return await strategy.execute(data)
  }

  // Get strategy for data type
  getStrategyForDataType(dataType: string): SyncStrategy | undefined {
    switch (dataType) {
      case 'attendance':
        return this.getStrategy('attendance-optimistic')
      case 'user':
        return this.getStrategy('user-lazy')
      case 'settings':
        return this.getStrategy('settings-priority')
      case 'analytics':
        return this.getStrategy('analytics-throttled')
      default:
        return undefined
    }
  }

  // Execute strategy for data type
  async executeStrategyForDataType(dataType: string, data: any): Promise<SyncResult> {
    const strategy = this.getStrategyForDataType(dataType)
    
    if (!strategy) {
      throw new Error(`No strategy found for data type '${dataType}'`)
    }
    
    return await this.executeStrategy(strategy.name, data)
  }
}

// Create a singleton instance
export const syncStrategyRegistry = new SyncStrategyRegistry()