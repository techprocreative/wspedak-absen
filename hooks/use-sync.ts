import { useState, useEffect, useCallback, useRef } from 'react'
import { syncManager, SyncStatus, SyncDirection, SyncPriority, SyncResult, SyncConflict } from '../lib/sync-manager'
import { syncStrategyRegistry, SyncStrategy } from '../lib/sync-strategies'
import { isOnline as checkIsOnline } from '../lib/supabase'
import { toast } from 'sonner'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Sync hook return type
export interface UseSyncReturn {
  // Status
  status: SyncStatus
  isOnline: boolean
  isSyncing: boolean
  
  // Stats
  lastSync: Date | null
  lastSuccessfulSync: Date | null
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  averageSyncTime: number
  itemsSynced: number
  conflictsResolved: number
  
  // Actions
  sync: (options?: {
    direction?: SyncDirection
    priority?: SyncPriority
    force?: boolean
  }) => Promise<SyncResult>
  forceSync: () => Promise<SyncResult>
  
  // Conflicts
  conflicts: SyncConflict[]
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => Promise<void>
  clearConflicts: () => void
  
  // Strategies
  strategies: SyncStrategy[]
  executeStrategy: (name: string, data: any) => Promise<SyncResult>
  executeStrategyForDataType: (dataType: string, data: any) => Promise<SyncResult>
}

// Sync hook options
export interface UseSyncOptions {
  autoSync?: boolean
  syncInterval?: number // in milliseconds
  showNotifications?: boolean
  enableRealtime?: boolean
}

// Default sync hook options
const DEFAULT_SYNC_OPTIONS: Required<UseSyncOptions> = {
  autoSync: true,
  syncInterval: 5 * 60 * 1000, // 5 minutes
  showNotifications: true,
  enableRealtime: true,
}

// Main sync hook
export function useSync(options: UseSyncOptions = {}): UseSyncReturn {
  const mergedOptions = { ...DEFAULT_SYNC_OPTIONS, ...options }
  
  // State
  const [status, setStatus] = useState<SyncStatus>(SyncStatus.IDLE)
  const [isOnline, setIsOnline] = useState<boolean>(checkIsOnline())
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<Date | null>(null)
  const [totalSyncs, setTotalSyncs] = useState<number>(0)
  const [successfulSyncs, setSuccessfulSyncs] = useState<number>(0)
  const [failedSyncs, setFailedSyncs] = useState<number>(0)
  const [averageSyncTime, setAverageSyncTime] = useState<number>(0)
  const [itemsSynced, setItemsSynced] = useState<number>(0)
  const [conflictsResolved, setConflictsResolved] = useState<number>(0)
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [strategies, setStrategies] = useState<SyncStrategy[]>(syncStrategyRegistry.getAllStrategies())
  
  // Refs
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef<boolean>(true)
  
  // Update stats from sync manager
  const updateStats = useCallback(() => {
    if (!isMountedRef.current) return
    
    const stats = syncManager.getStats()
    setLastSync(stats.lastSync)
    setLastSuccessfulSync(stats.lastSuccessfulSync)
    setTotalSyncs(stats.totalSyncs)
    setSuccessfulSyncs(stats.successfulSyncs)
    setFailedSyncs(stats.failedSyncs)
    setAverageSyncTime(stats.averageSyncTime)
    setItemsSynced(stats.itemsSynced)
    setConflictsResolved(stats.conflictsResolved)
  }, [])
  
  // Update conflicts from sync manager
  const updateConflicts = useCallback(() => {
    if (!isMountedRef.current) return
    
    setConflicts(syncManager.getConflicts())
  }, [])
  
  // Handle sync started
  const handleSyncStarted = useCallback(() => {
    if (!isMountedRef.current) return
    
    setIsSyncing(true)
    setStatus(SyncStatus.SYNCING)
  }, [])
  
  // Handle sync completed
  const handleSyncCompleted = useCallback((result: SyncResult) => {
    if (!isMountedRef.current) return
    
    setIsSyncing(false)
    setStatus(SyncStatus.COMPLETED)
    updateStats()
    
    if (mergedOptions.showNotifications) {
      if (result.success) {
        toast.success(`Sync completed successfully. ${result.itemsSucceeded} items synced.`)
      } else {
        toast.error(`Sync failed. ${result.itemsFailed} items failed to sync.`)
      }
    }
  }, [mergedOptions.showNotifications, updateStats])
  
  // Handle sync error
  const handleSyncError = useCallback((error: any) => {
    if (!isMountedRef.current) return
    
    setIsSyncing(false)
    setStatus(SyncStatus.ERROR)
    
    if (mergedOptions.showNotifications) {
      toast.error(`Sync error: ${error.message || 'Unknown error'}`)
    }
  }, [mergedOptions.showNotifications])
  
  // Handle status change
  const handleStatusChange = useCallback((newStatus: SyncStatus) => {
    if (!isMountedRef.current) return
    
    setStatus(newStatus)
  }, [])
  
  // Handle conflict
  const handleConflict = useCallback((conflict: SyncConflict) => {
    if (!isMountedRef.current) return
    
    updateConflicts()
    
    if (mergedOptions.showNotifications) {
      toast.warning(`Sync conflict detected for ${conflict.type} ${conflict.id}`)
    }
  }, [mergedOptions.showNotifications, updateConflicts])
  
  // Handle conflict resolved
  const handleConflictResolved = useCallback((conflict: SyncConflict) => {
    if (!isMountedRef.current) return
    
    updateConflicts()
    updateStats()
    
    if (mergedOptions.showNotifications) {
      toast.success(`Conflict resolved for ${conflict.type} ${conflict.id}`)
    }
  }, [mergedOptions.showNotifications, updateConflicts, updateStats])
  
  // Handle conflicts cleared
  const handleConflictsCleared = useCallback(() => {
    if (!isMountedRef.current) return
    
    setConflicts([])
  }, [])
  
  // Handle online status change
  const handleOnlineStatusChange = useCallback(() => {
    if (!isMountedRef.current) return
    
    setIsOnline(checkIsOnline())
    
    if (checkIsOnline() && mergedOptions.autoSync) {
      sync()
    }
  }, [mergedOptions.autoSync])
  
  // Sync function
  const sync = useCallback(async (options?: {
    direction?: SyncDirection
    priority?: SyncPriority
    force?: boolean
  }): Promise<SyncResult> => {
    return await syncManager.sync(options)
  }, [])
  
  // Force sync function
  const forceSync = useCallback(async (): Promise<SyncResult> => {
    return await syncManager.forceSync()
  }, [])
  
  // Resolve conflict function
  const resolveConflict = useCallback(async (conflictId: string, resolution: 'local' | 'remote' | 'merge'): Promise<void> => {
    await syncManager.resolveConflict(conflictId, resolution)
  }, [])
  
  // Clear conflicts function
  const clearConflicts = useCallback((): void => {
    syncManager.clearConflicts()
  }, [])
  
  // Execute strategy function
  const executeStrategy = useCallback(async (name: string, data: any): Promise<SyncResult> => {
    return await syncStrategyRegistry.executeStrategy(name, data)
  }, [])
  
  // Execute strategy for data type function
  const executeStrategyForDataType = useCallback(async (dataType: string, data: any): Promise<SyncResult> => {
    return await syncStrategyRegistry.executeStrategyForDataType(dataType, data)
  }, [])
  
  // Setup event listeners
  useEffect(() => {
    // Sync manager events
    syncManager.on('syncStarted', handleSyncStarted)
    syncManager.on('syncCompleted', handleSyncCompleted)
    syncManager.on('syncError', handleSyncError)
    syncManager.on('statusChange', handleStatusChange)
    syncManager.on('conflict', handleConflict)
    syncManager.on('conflictResolved', handleConflictResolved)
    syncManager.on('conflictsCleared', handleConflictsCleared)
    
    // Network status events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnlineStatusChange)
      window.addEventListener('offline', handleOnlineStatusChange)
      window.addEventListener('networkStatusChange', handleOnlineStatusChange as EventListener)
    }
    
    // Initial stats update
    updateStats()
    updateConflicts()
    
    // Cleanup
    return () => {
      isMountedRef.current = false
      
      // Remove event listeners
      syncManager.off('syncStarted', handleSyncStarted)
      syncManager.off('syncCompleted', handleSyncCompleted)
      syncManager.off('syncError', handleSyncError)
      syncManager.off('statusChange', handleStatusChange)
      syncManager.off('conflict', handleConflict)
      syncManager.off('conflictResolved', handleConflictResolved)
      syncManager.off('conflictsCleared', handleConflictsCleared)
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnlineStatusChange)
        window.removeEventListener('offline', handleOnlineStatusChange)
        window.removeEventListener('networkStatusChange', handleOnlineStatusChange as EventListener)
      }
    }
  }, [
    handleSyncStarted,
    handleSyncCompleted,
    handleSyncError,
    handleStatusChange,
    handleConflict,
    handleConflictResolved,
    handleConflictsCleared,
    handleOnlineStatusChange,
    updateStats,
    updateConflicts,
  ])
  
  // Setup auto sync interval
  useEffect(() => {
    if (mergedOptions.autoSync) {
      syncIntervalRef.current = setInterval(() => {
        if (checkIsOnline()) {
          sync()
        }
      }, mergedOptions.syncInterval)
    }
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [mergedOptions.autoSync, mergedOptions.syncInterval, sync])
  
  // Setup realtime subscriptions if enabled
  useEffect(() => {
    if (mergedOptions.enableRealtime) {
      // This would setup realtime subscriptions to Supabase
      // For now, it's a placeholder for future implementation
      logger.info('Realtime subscriptions enabled')
    }
    
    return () => {
      // Cleanup realtime subscriptions
      if (mergedOptions.enableRealtime) {
        logger.info('Realtime subscriptions disabled')
      }
    }
  }, [mergedOptions.enableRealtime])
  
  return {
    // Status
    status,
    isOnline,
    isSyncing,
    
    // Stats
    lastSync,
    lastSuccessfulSync,
    totalSyncs,
    successfulSyncs,
    failedSyncs,
    averageSyncTime,
    itemsSynced,
    conflictsResolved,
    
    // Actions
    sync,
    forceSync,
    
    // Conflicts
    conflicts,
    resolveConflict,
    clearConflicts,
    
    // Strategies
    strategies,
    executeStrategy,
    executeStrategyForDataType,
  }
}

// Hook for sync status
export function useSyncStatus(): {
  status: SyncStatus
  isOnline: boolean
  isSyncing: boolean
} {
  const [status, setStatus] = useState<SyncStatus>(SyncStatus.IDLE)
  const [isOnline, setIsOnline] = useState<boolean>(checkIsOnline())
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  
  useEffect(() => {
    const handleStatusChange = (newStatus: SyncStatus) => {
      setStatus(newStatus)
      setIsSyncing(newStatus === SyncStatus.SYNCING)
    }
    
    const handleOnlineStatusChange = () => {
      setIsOnline(checkIsOnline())
    }
    
    // Setup event listeners
    syncManager.on('statusChange', handleStatusChange)
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnlineStatusChange)
      window.addEventListener('offline', handleOnlineStatusChange)
      window.addEventListener('networkStatusChange', handleOnlineStatusChange as EventListener)
    }
    
    // Initial status
    setStatus(syncManager.getStatus())
    
    // Cleanup
    return () => {
      syncManager.off('statusChange', handleStatusChange)
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnlineStatusChange)
        window.removeEventListener('offline', handleOnlineStatusChange)
        window.removeEventListener('networkStatusChange', handleOnlineStatusChange as EventListener)
      }
    }
  }, [])
  
  return {
    status,
    isOnline,
    isSyncing,
  }
}

// Hook for sync stats
export function useSyncStats(): {
  lastSync: Date | null
  lastSuccessfulSync: Date | null
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  averageSyncTime: number
  itemsSynced: number
  conflictsResolved: number
  refresh: () => void
} {
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<Date | null>(null)
  const [totalSyncs, setTotalSyncs] = useState<number>(0)
  const [successfulSyncs, setSuccessfulSyncs] = useState<number>(0)
  const [failedSyncs, setFailedSyncs] = useState<number>(0)
  const [averageSyncTime, setAverageSyncTime] = useState<number>(0)
  const [itemsSynced, setItemsSynced] = useState<number>(0)
  const [conflictsResolved, setConflictsResolved] = useState<number>(0)
  
  const refresh = useCallback(() => {
    const stats = syncManager.getStats()
    setLastSync(stats.lastSync)
    setLastSuccessfulSync(stats.lastSuccessfulSync)
    setTotalSyncs(stats.totalSyncs)
    setSuccessfulSyncs(stats.successfulSyncs)
    setFailedSyncs(stats.failedSyncs)
    setAverageSyncTime(stats.averageSyncTime)
    setItemsSynced(stats.itemsSynced)
    setConflictsResolved(stats.conflictsResolved)
  }, [])
  
  useEffect(() => {
    // Initial stats
    refresh()
    
    // Setup event listeners
    const handleSyncCompleted = () => {
      refresh()
    }
    
    const handleConflictResolved = () => {
      refresh()
    }
    
    syncManager.on('syncCompleted', handleSyncCompleted)
    syncManager.on('conflictResolved', handleConflictResolved)
    
    // Cleanup
    return () => {
      syncManager.off('syncCompleted', handleSyncCompleted)
      syncManager.off('conflictResolved', handleConflictResolved)
    }
  }, [refresh])
  
  return {
    lastSync,
    lastSuccessfulSync,
    totalSyncs,
    successfulSyncs,
    failedSyncs,
    averageSyncTime,
    itemsSynced,
    conflictsResolved,
    refresh,
  }
}

// Hook for sync conflicts
export function useSyncConflicts(): {
  conflicts: SyncConflict[]
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => Promise<void>
  clearConflicts: () => void
  refresh: () => void
} {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  
  const refresh = useCallback(() => {
    setConflicts(syncManager.getConflicts())
  }, [])
  
  const resolveConflict = useCallback(async (conflictId: string, resolution: 'local' | 'remote' | 'merge'): Promise<void> => {
    await syncManager.resolveConflict(conflictId, resolution)
  }, [])
  
  const clearConflicts = useCallback((): void => {
    syncManager.clearConflicts()
  }, [])
  
  useEffect(() => {
    // Initial conflicts
    refresh()
    
    // Setup event listeners
    const handleConflict = () => {
      refresh()
    }
    
    const handleConflictResolved = () => {
      refresh()
    }
    
    const handleConflictsCleared = () => {
      setConflicts([])
    }
    
    syncManager.on('conflict', handleConflict)
    syncManager.on('conflictResolved', handleConflictResolved)
    syncManager.on('conflictsCleared', handleConflictsCleared)
    
    // Cleanup
    return () => {
      syncManager.off('conflict', handleConflict)
      syncManager.off('conflictResolved', handleConflictResolved)
      syncManager.off('conflictsCleared', handleConflictsCleared)
    }
  }, [refresh])
  
  return {
    conflicts,
    resolveConflict,
    clearConflicts,
    refresh,
  }
}

// Hook for sync strategies
export function useSyncStrategies(): {
  strategies: SyncStrategy[]
  executeStrategy: (name: string, data: any) => Promise<SyncResult>
  executeStrategyForDataType: (dataType: string, data: any) => Promise<SyncResult>
  refresh: () => void
} {
  const [strategies, setStrategies] = useState<SyncStrategy[]>(syncStrategyRegistry.getAllStrategies())
  
  const refresh = useCallback(() => {
    setStrategies(syncStrategyRegistry.getAllStrategies())
  }, [])
  
  const executeStrategy = useCallback(async (name: string, data: any): Promise<SyncResult> => {
    return await syncStrategyRegistry.executeStrategy(name, data)
  }, [])
  
  const executeStrategyForDataType = useCallback(async (dataType: string, data: any): Promise<SyncResult> => {
    return await syncStrategyRegistry.executeStrategyForDataType(dataType, data)
  }, [])
  
  useEffect(() => {
    // Initial strategies
    refresh()
  }, [refresh])
  
  return {
    strategies,
    executeStrategy,
    executeStrategyForDataType,
    refresh,
  }
}