import { supabaseService, isOnline, NetworkStatus, AuthState } from './supabase'
import { storageService } from './storage'
import { storageManager, AttendanceRecord, User, SyncQueueItem, AppSettings } from './db'
import { syncQueue } from './sync-queue'
import { incrementalSyncManager, IncrementalSyncOptions } from './incremental-sync'
import { adaptiveSyncManager, AdaptiveSyncOptions } from './adaptive-sync'
import { batchSizeOptimizer, BatchOptimizerOptions } from './batch-optimizer'
import { syncPrioritizer, SyncPriorityOptions } from './sync-prioritizer'

// Sync status enum
export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  COMPLETED = 'completed',
  ERROR = 'error',
  OFFLINE = 'offline',
}

// Sync direction enum
export enum SyncDirection {
  PUSH = 'push', // Local to remote
  PULL = 'pull', // Remote to local
  BIDIRECTIONAL = 'bidirectional', // Both ways
}

// Sync priority enum
export enum SyncPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// Sync configuration interface
export interface SyncConfig {
  direction: SyncDirection
  priority: SyncPriority
  batchSize: number
  retryCount: number
  retryDelay: number
  enableConflictResolution: boolean
  enableRealtime: boolean
  syncInterval: number // in milliseconds
  enableIncrementalSync: boolean
  incrementalSyncOptions: IncrementalSyncOptions
  enableAdaptiveSync: boolean
  adaptiveSyncOptions: AdaptiveSyncOptions
  enableBatchSizeOptimization: boolean
  batchSizeOptimizerOptions: BatchOptimizerOptions
  enableSyncPrioritization: boolean
  syncPrioritizationOptions: SyncPriorityOptions
}

// Sync result interface
export interface SyncResult {
  success: boolean
  status: SyncStatus
  timestamp: Date
  itemsProcessed: number
  itemsSucceeded: number
  itemsFailed: number
  conflicts: SyncConflict[]
  error?: string
  duration: number // in milliseconds
}

// Sync conflict interface
export interface SyncConflict {
  id: string
  type: 'attendance' | 'user' | 'settings'
  localData: any
  remoteData: any
  resolution?: 'local' | 'remote' | 'merge' | 'manual'
  resolvedAt?: Date
}

// Sync statistics interface
export interface SyncStats {
  lastSync: Date | null
  lastSuccessfulSync: Date | null
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  averageSyncTime: number // in milliseconds
  itemsSynced: number
  conflictsResolved: number
}

// Default sync configuration
const DEFAULT_SYNC_CONFIG: SyncConfig = {
  direction: SyncDirection.BIDIRECTIONAL,
  priority: SyncPriority.MEDIUM,
  batchSize: 10,
  retryCount: 3,
  retryDelay: 1000,
  enableConflictResolution: true,
  enableRealtime: true,
  syncInterval: 5 * 60 * 1000, // 5 minutes
  enableIncrementalSync: true,
  incrementalSyncOptions: {
    enableIncrementalSync: true,
    syncInterval: 60000, // 1 minute
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
  },
  enableAdaptiveSync: true,
  adaptiveSyncOptions: {
    enableAdaptiveSync: true,
    networkCheckInterval: 30000,
    baseSyncInterval: 5 * 60 * 1000,
    minSyncInterval: 60000,
    maxSyncInterval: 10 * 60 * 1000,
    slowNetworkThreshold: 1,
    fastNetworkThreshold: 10,
    highLatencyThreshold: 1000,
    enablePerformanceOptimization: true,
    maxNetworkCheckTime: 100,
  },
  enableBatchSizeOptimization: true,
  batchSizeOptimizerOptions: {
    enableOptimization: true,
    optimizationInterval: 30000,
    maxMemoryUsage: 400, // 400MB (leave 112MB for system)
    maxCpuUsage: 80, // 80% CPU usage
    targetProcessingTime: 500, // 500ms
    minBatchSize: 5,
    maxBatchSize: 50,
    initialBatchSize: 20,
    enablePerformanceMonitoring: true,
    performanceHistorySize: 20,
  },
  enableSyncPrioritization: true,
  syncPrioritizationOptions: {
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
  },
}

// Sync Manager class
export class SyncManager {
  private config: SyncConfig
  private status: SyncStatus = SyncStatus.IDLE
  private stats: SyncStats = {
    lastSync: null,
    lastSuccessfulSync: null,
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncTime: 0,
    itemsSynced: 0,
    conflictsResolved: 0,
  }
  private conflicts: SyncConflict[] = []
  private syncIntervalId: NodeJS.Timeout | null = null
  private eventListeners: Map<string, Function[]> = new Map()
  private isSyncing: boolean = false

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config }
    
    // Initialize incremental sync if enabled
    if (this.config.enableIncrementalSync) {
      incrementalSyncManager.initialize()
      
      // Set up sync callback
      incrementalSyncManager.onSyncComplete((result) => {
        if (result.success) {
          console.log(`Incremental sync completed: ${result.changesSynced} changes synced`)
          this.emit('incrementalSyncCompleted', result)
        } else {
          console.error(`Incremental sync failed: ${result.error?.message}`)
          this.emit('incrementalSyncFailed', result)
        }
      })
    }
    
    // Initialize adaptive sync if enabled
    if (this.config.enableAdaptiveSync) {
      adaptiveSyncManager.initialize()
      
      // Set up sync interval change callback
      adaptiveSyncManager.onSyncIntervalChange((config) => {
        console.log(`Sync interval adapted to ${config.interval / 1000}s: ${config.reason}`)
        this.config.syncInterval = config.interval
        this.startSyncInterval()
        this.emit('syncIntervalChanged', config)
      })
    }
    
    // Initialize batch size optimizer if enabled
    if (this.config.enableBatchSizeOptimization) {
      batchSizeOptimizer.initialize()
      
      // Set up batch size change callback
      batchSizeOptimizer.onBatchSizeChange((config) => {
        console.log(`Batch size optimized to ${config.batchSize}: ${config.reason}`)
        this.config.batchSize = config.batchSize
        this.emit('batchSizeChanged', config)
      })
    }
    
    // Initialize sync interval
    this.startSyncInterval()
    
    // Listen for network status changes
    if (typeof window !== 'undefined') {
      window.addEventListener('networkStatusChange', this.handleNetworkChange as EventListener)
    }
    
    // Listen for auth state changes
    if (typeof window !== 'undefined') {
      window.addEventListener('authStateChange', this.handleAuthChange as EventListener)
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

  // Network status change handler
  private handleNetworkChange = (event: CustomEvent): void => {
    const networkStatus: NetworkStatus = event.detail
    
    if (networkStatus.isOnline) {
      this.emit('online')
      // If we came back online, try to sync
      this.sync()
    } else {
      this.status = SyncStatus.OFFLINE
      this.emit('offline')
    }
  }

  // Auth state change handler
  private handleAuthChange = (event: CustomEvent): void => {
    const authState: AuthState = event.detail
    
    if (authState.user) {
      // User is authenticated, start syncing
      this.sync()
    } else {
      // User is not authenticated, stop syncing
      this.stopSyncInterval()
    }
  }

  // Sync interval management
  private startSyncInterval(): void {
    this.stopSyncInterval()
    
    // Get current sync interval from adaptive sync manager if enabled
    let syncInterval = this.config.syncInterval
    if (this.config.enableAdaptiveSync) {
      syncInterval = adaptiveSyncManager.getCurrentSyncInterval()
    }
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      this.syncIntervalId = setInterval(() => {
        if (isOnline() && supabaseService.getAuthState().user) {
          this.sync()
        }
      }, syncInterval)
    }
  }

  private stopSyncInterval(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId)
      this.syncIntervalId = null
    }
  }

  // Main sync method
  async sync(options?: {
    direction?: SyncDirection
    priority?: SyncPriority
    force?: boolean
  }): Promise<SyncResult> {
    if (this.isSyncing && !options?.force) {
      return {
        success: false,
        status: this.status,
        timestamp: new Date(),
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        conflicts: [],
        duration: 0,
      }
    }

    if (!isOnline()) {
      this.status = SyncStatus.OFFLINE
      this.emit('statusChange', this.status)
      
      return {
        success: false,
        status: this.status,
        timestamp: new Date(),
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        conflicts: [],
        error: 'Cannot sync while offline',
        duration: 0,
      }
    }

    const authState = supabaseService.getAuthState()
    if (!authState.user) {
      return {
        success: false,
        status: SyncStatus.ERROR,
        timestamp: new Date(),
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        conflicts: [],
        error: 'User not authenticated',
        duration: 0,
      }
    }

    this.isSyncing = true
    this.status = SyncStatus.SYNCING
    this.emit('statusChange', this.status)
    this.emit('syncStarted')

    const startTime = Date.now()
    let result: SyncResult

    try {
      const direction = options?.direction || this.config.direction
      const priority = options?.priority || this.config.priority

      switch (direction) {
        case SyncDirection.PUSH:
          result = await this.pushSync(priority)
          break
        case SyncDirection.PULL:
          result = await this.pullSync(priority)
          break
        case SyncDirection.BIDIRECTIONAL:
          result = await this.bidirectionalSync(priority)
          break
        default:
          throw new Error(`Unknown sync direction: ${direction}`)
      }

      // Update stats
      this.updateStats(result)
      
      // Emit completion event
      this.emit('syncCompleted', result)
      
      return result
    } catch (error) {
      const errorResult: SyncResult = {
        success: false,
        status: SyncStatus.ERROR,
        timestamp: new Date(),
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        conflicts: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      }
      
      // Update stats
      this.updateStats(errorResult)
      
      // Emit error event
      this.emit('syncError', error)
      
      return errorResult
    } finally {
      this.isSyncing = false
      this.status = SyncStatus.IDLE
      this.emit('statusChange', this.status)
    }
  }

  // Push sync (local to remote)
  private async pushSync(priority: SyncPriority): Promise<SyncResult> {
    const startTime = Date.now()
    let itemsProcessed = 0
    let itemsSucceeded = 0
    let itemsFailed = 0
    const conflicts: SyncConflict[] = []

    try {
      // Get unsynced attendance records
      const unsyncedAttendance = await storageService.getAttendanceRecords({ synced: false })
      
      // Get unsynced users
      const unsyncedUsers = await storageService.getUsers()
      
      // Combine all items to sync
      const itemsToSync = [
        ...unsyncedAttendance.map(record => ({ type: 'attendance', data: record })),
        ...unsyncedUsers.map(user => ({ type: 'user', data: user })),
      ]
      
      // Sort by priority
      if (priority === SyncPriority.HIGH) {
        // High priority: attendance records first
        itemsToSync.sort((a, b) => {
          if (a.type === 'attendance' && b.type !== 'attendance') return -1
          if (a.type !== 'attendance' && b.type === 'attendance') return 1
          return 0
        })
      }

      // Process in batches
      for (let i = 0; i < itemsToSync.length; i += this.config.batchSize) {
        const batch = itemsToSync.slice(i, i + this.config.batchSize)
        
        for (const item of batch) {
          itemsProcessed++
          
          try {
            if (item.type === 'attendance') {
              await this.syncAttendanceRecord(item.data as AttendanceRecord)
            } else if (item.type === 'user') {
              await this.syncUser(item.data as User)
            }
            
            itemsSucceeded++
          } catch (error) {
            itemsFailed++
            
            // If conflict resolution is enabled, handle conflicts
            if (this.config.enableConflictResolution && this.isConflictError(error)) {
              const conflict = await this.handleConflict(item.type, item.data, error)
              if (conflict) {
                conflicts.push(conflict)
              }
            }
          }
        }
      }

      return {
        success: itemsFailed === 0,
        status: SyncStatus.COMPLETED,
        timestamp: new Date(),
        itemsProcessed,
        itemsSucceeded,
        itemsFailed,
        conflicts,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      throw error
    }
  }

  // Pull sync (remote to local)
  private async pullSync(priority: SyncPriority): Promise<SyncResult> {
    const startTime = Date.now()
    let itemsProcessed = 0
    let itemsSucceeded = 0
    let itemsFailed = 0
    const conflicts: SyncConflict[] = []

    try {
      // Fetch remote attendance records
      const client = await supabaseService.getClient()
      const { data: remoteAttendance, error: attendanceError } = await client
        .from('attendance')
        .select('*')
        .order('timestamp', { ascending: false })
      
      if (attendanceError) throw attendanceError
      
      // Fetch remote users
      const { data: remoteUsers, error: usersError } = await client
        .from('users')
        .select('*')
      
      if (usersError) throw usersError
      
      // Combine all items to sync
      const itemsToSync = [
        ...remoteAttendance.map(record => ({ type: 'attendance', data: record })),
        ...remoteUsers.map(user => ({ type: 'user', data: user })),
      ]
      
      // Sort by priority
      if (priority === SyncPriority.HIGH) {
        // High priority: users first (needed for attendance records)
        itemsToSync.sort((a, b) => {
          if (a.type === 'user' && b.type !== 'user') return -1
          if (a.type !== 'user' && b.type === 'user') return 1
          return 0
        })
      }

      // Process in batches
      for (let i = 0; i < itemsToSync.length; i += this.config.batchSize) {
        const batch = itemsToSync.slice(i, i + this.config.batchSize)
        
        for (const item of batch) {
          itemsProcessed++
          
          try {
            if (item.type === 'attendance') {
              await this.saveAttendanceRecordLocally(item.data)
            } else if (item.type === 'user') {
              await this.saveUserLocally(item.data)
            }
            
            itemsSucceeded++
          } catch (error) {
            itemsFailed++
            
            // If conflict resolution is enabled, handle conflicts
            if (this.config.enableConflictResolution && this.isConflictError(error)) {
              const conflict = await this.handleConflict(item.type, item.data, error)
              if (conflict) {
                conflicts.push(conflict)
              }
            }
          }
        }
      }

      return {
        success: itemsFailed === 0,
        status: SyncStatus.COMPLETED,
        timestamp: new Date(),
        itemsProcessed,
        itemsSucceeded,
        itemsFailed,
        conflicts,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      throw error
    }
  }

  // Bidirectional sync (both ways)
  private async bidirectionalSync(priority: SyncPriority): Promise<SyncResult> {
    const startTime = Date.now()
    
    // If incremental sync is enabled, force a sync of all pending changes
    if (this.config.enableIncrementalSync) {
      const incrementalResult = await incrementalSyncManager.forceSync()
      
      // If incremental sync was successful, return the result
      if (incrementalResult.success) {
        return {
          success: true,
          status: SyncStatus.COMPLETED,
          timestamp: new Date(),
          itemsProcessed: incrementalResult.changesSynced,
          itemsSucceeded: incrementalResult.changesSynced,
          itemsFailed: incrementalResult.changesFailed,
          conflicts: [],
          duration: Date.now() - startTime,
        }
      }
    }
    
    // First push local changes to remote
    const pushResult = await this.pushSync(priority)
    
    // Then pull remote changes to local
    const pullResult = await this.pullSync(priority)
    
    return {
      success: pushResult.success && pullResult.success,
      status: SyncStatus.COMPLETED,
      timestamp: new Date(),
      itemsProcessed: pushResult.itemsProcessed + pullResult.itemsProcessed,
      itemsSucceeded: pushResult.itemsSucceeded + pullResult.itemsSucceeded,
      itemsFailed: pushResult.itemsFailed + pullResult.itemsFailed,
      conflicts: [...pushResult.conflicts, ...pullResult.conflicts],
      duration: Date.now() - startTime,
    }
  }

  // Sync attendance record to remote
  private async syncAttendanceRecord(record: AttendanceRecord): Promise<void> {
    // Track change for incremental sync
    if (this.config.enableIncrementalSync) {
      incrementalSyncManager.trackChange('update', 'attendance', record.id, {
        id: record.id,
        user_id: record.userId,
        timestamp: record.timestamp.toISOString(),
        type: record.type,
        location: record.location,
        photo: record.photo,
        synced: true,
      })
    }
    
    const client = await supabaseService.getClient()
    const { error } = await client
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
    
    if (error) throw error
    
    // Mark local record as synced
    record.synced = true
    await storageService.saveAttendanceRecord(record)
  }

  // Sync user to remote
  private async syncUser(user: User): Promise<void> {
    // Track change for incremental sync
    if (this.config.enableIncrementalSync) {
      incrementalSyncManager.trackChange('update', 'users', user.id, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        photo: user.photo,
      })
    }
    
    const client = await supabaseService.getClient()
    const { error } = await client
      .from('users')
      .upsert({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        photo: user.photo,
      })
    
    if (error) throw error
  }

  // Save attendance record locally
  private async saveAttendanceRecordLocally(record: any): Promise<void> {
    // Convert timestamp string to Date object
    const localRecord: AttendanceRecord = {
      ...record,
      userId: record.user_id,
      timestamp: new Date(record.timestamp),
      synced: true,
    }
    
    // Track change for incremental sync
    if (this.config.enableIncrementalSync) {
      const existingRecord = await storageService.getAttendanceRecord(localRecord.id)
      
      if (existingRecord) {
        incrementalSyncManager.trackChange('update', 'attendance', localRecord.id, localRecord)
      } else {
        incrementalSyncManager.trackChange('create', 'attendance', localRecord.id, localRecord)
      }
    }
    
    // Check if record already exists locally
    const existingRecord = await storageService.getAttendanceRecord(localRecord.id)
    
    if (existingRecord) {
      // If conflict resolution is enabled, handle conflicts
      if (this.config.enableConflictResolution) {
        const conflict = await this.handleConflict('attendance', localRecord, new Error('Record already exists'))
        if (conflict) {
          // Apply resolution
          if (conflict.resolution === 'remote') {
            await storageService.saveAttendanceRecord(localRecord)
          }
          // If resolution is 'local', we keep the existing record
        }
      } else {
        // Default to remote
        await storageService.saveAttendanceRecord(localRecord)
      }
    } else {
      // Record doesn't exist locally, save it
      await storageService.saveAttendanceRecord(localRecord)
    }
  }

  // Save user locally
  private async saveUserLocally(user: any): Promise<void> {
    // Track change for incremental sync
    if (this.config.enableIncrementalSync) {
      const existingUser = await storageService.getUser(user.id)
      
      if (existingUser) {
        incrementalSyncManager.trackChange('update', 'users', user.id, user)
      } else {
        incrementalSyncManager.trackChange('create', 'users', user.id, user)
      }
    }
    
    // Check if user already exists locally
    const existingUser = await storageService.getUser(user.id)
    
    if (existingUser) {
      // If conflict resolution is enabled, handle conflicts
      if (this.config.enableConflictResolution) {
        const conflict = await this.handleConflict('user', user, new Error('User already exists'))
        if (conflict) {
          // Apply resolution
          if (conflict.resolution === 'remote') {
            await storageService.saveUser(user)
          }
          // If resolution is 'local', we keep the existing user
        }
      } else {
        // Default to remote
        await storageService.saveUser(user)
      }
    } else {
      // User doesn't exist locally, save it
      await storageService.saveUser(user)
    }
  }

  // Conflict detection and resolution
  private isConflictError(error: any): boolean {
    // Check if error is a conflict error
    // This depends on how Supabase reports conflicts
    return error && error.code === '23505' // Unique violation error code
  }

  private async handleConflict(type: string, localData: any, error: any): Promise<SyncConflict | null> {
    // Get remote data
    let remoteData: any = null
    
    try {
      const client = await supabaseService.getClient()
      if (type === 'attendance') {
        const { data } = await client
          .from('attendance')
          .select('*')
          .eq('id', localData.id)
          .single()
        
        remoteData = data
      } else if (type === 'user') {
        const { data } = await client
          .from('users')
          .select('*')
          .eq('id', localData.id)
          .single()
        
        remoteData = data
      }
    } catch (error) {
      console.error('Error fetching remote data for conflict resolution:', error)
      return null
    }
    
    if (!remoteData) return null
    
    // Create conflict
    const conflict: SyncConflict = {
      id: `${type}_${localData.id}`,
      type: type as 'attendance' | 'user' | 'settings',
      localData,
      remoteData,
    }
    
    // Add to conflicts list
    this.conflicts.push(conflict)
    
    // Emit conflict event
    this.emit('conflict', conflict)
    
    // If automatic resolution is enabled, resolve the conflict
    if (this.config.enableConflictResolution) {
      // Default resolution strategy: remote wins
      conflict.resolution = 'remote'
      conflict.resolvedAt = new Date()
      
      // Update stats
      this.stats.conflictsResolved++
      
      // Emit conflict resolved event
      this.emit('conflictResolved', conflict)
    }
    
    return conflict
  }

  // Manual conflict resolution
  async resolveConflict(conflictId: string, resolution: 'local' | 'remote' | 'merge'): Promise<void> {
    const conflict = this.conflicts.find(c => c.id === conflictId)
    
    if (!conflict) {
      throw new Error(`Conflict with ID ${conflictId} not found`)
    }
    
    // Apply resolution
    conflict.resolution = resolution
    conflict.resolvedAt = new Date()
    
    if (resolution === 'local') {
      // Keep local data
      if (conflict.type === 'attendance') {
        await storageService.saveAttendanceRecord(conflict.localData)
      } else if (conflict.type === 'user') {
        await storageService.saveUser(conflict.localData)
      }
    } else if (resolution === 'remote') {
      // Use remote data
      if (conflict.type === 'attendance') {
        await this.saveAttendanceRecordLocally(conflict.remoteData)
      } else if (conflict.type === 'user') {
        await this.saveUserLocally(conflict.remoteData)
      }
    } else if (resolution === 'merge') {
      // Merge data (this would be more complex in a real application)
      // For now, we'll just use remote data
      if (conflict.type === 'attendance') {
        await this.saveAttendanceRecordLocally(conflict.remoteData)
      } else if (conflict.type === 'user') {
        await this.saveUserLocally(conflict.remoteData)
      }
    }
    
    // Update stats
    this.stats.conflictsResolved++
    
    // Remove from conflicts list
    this.conflicts = this.conflicts.filter(c => c.id !== conflictId)
    
    // Emit conflict resolved event
    this.emit('conflictResolved', conflict)
  }

  // Update sync statistics
  private updateStats(result: SyncResult): Promise<void> {
    this.stats.lastSync = result.timestamp
    this.stats.totalSyncs++
    
    if (result.success) {
      this.stats.lastSuccessfulSync = result.timestamp
      this.stats.successfulSyncs++
    } else {
      this.stats.failedSyncs++
    }
    
    // Update average sync time
    const totalTime = this.stats.averageSyncTime * (this.stats.totalSyncs - 1) + result.duration
    this.stats.averageSyncTime = totalTime / this.stats.totalSyncs
    
    // Update items synced
    this.stats.itemsSynced += result.itemsSucceeded
    
    return Promise.resolve()
  }

  // Getters
  getStatus(): SyncStatus {
    return this.status
  }

  getStats(): SyncStats {
    return { ...this.stats }
  }

  getConflicts(): SyncConflict[] {
    return [...this.conflicts]
  }

  getConfig(): SyncConfig {
    return { ...this.config }
  }

  // Setters
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config }
    
    // Restart sync interval if needed
    if (config.syncInterval !== undefined) {
      this.startSyncInterval()
    }
    
    this.emit('configChange', this.config)
  }

  // Force sync
  async forceSync(): Promise<SyncResult> {
    return await this.sync({ force: true })
  }

  // Clear conflicts
  clearConflicts(): void {
    this.conflicts = []
    this.emit('conflictsCleared')
  }

  // Cleanup
  destroy(): void {
    this.stopSyncInterval()
    
    // Cleanup incremental sync
    if (this.config.enableIncrementalSync) {
      incrementalSyncManager.cleanup()
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('networkStatusChange', this.handleNetworkChange as EventListener)
      window.removeEventListener('authStateChange', this.handleAuthChange as EventListener)
    }
    
    this.eventListeners.clear()
  }
}

// Create a singleton instance
export const syncManager = new SyncManager()