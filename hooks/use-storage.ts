import { useState, useEffect, useCallback, useRef } from 'react'
import { storageService } from '../lib/storage'
import { syncQueue } from '../lib/sync-queue'
import { AttendanceRecord, User, AppSettings, OfflineData } from '../lib/db'
import { isOnline } from '../lib/supabase'

// Hook options interface
interface UseStorageOptions {
  enableRealtime?: boolean
  enableOptimisticUpdates?: boolean
  enableRetry?: boolean
  maxRetries?: number
  retryDelay?: number
}

// Default hook options
const DEFAULT_HOOK_OPTIONS: Required<UseStorageOptions> = {
  enableRealtime: true,
  enableOptimisticUpdates: true,
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
}

// Optimistic update state interface
interface OptimisticUpdateState<T> {
  isUpdating: boolean
  error: Error | null
  lastUpdate: T | null
  rollbackData: T | null
}

// Hook for attendance records
export function useAttendanceRecords(
  filter?: {
    userId?: string
    startDate?: Date
    endDate?: Date
    synced?: boolean
  },
  options: UseStorageOptions = {}
) {
  const config = { ...DEFAULT_HOOK_OPTIONS, ...options }
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [optimisticState, setOptimisticState] = useState<OptimisticUpdateState<AttendanceRecord[]>>({
    isUpdating: false,
    error: null,
    lastUpdate: null,
    rollbackData: null,
  })
  const retryCountRef = useRef(0)

  // Fetch records
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await storageService.getAttendanceRecords(filter)
      setRecords(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch attendance records'))
      
      // Retry logic
      if (config.enableRetry && retryCountRef.current < config.maxRetries) {
        retryCountRef.current++
        setTimeout(fetchRecords, config.retryDelay * retryCountRef.current)
      }
    } finally {
      setLoading(false)
    }
  }, [filter, config.enableRetry, config.maxRetries, config.retryDelay])

  // Initial fetch
  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // Real-time updates
  useEffect(() => {
    if (!config.enableRealtime) return

    const handleSyncCompleted = () => {
      fetchRecords()
    }

    syncQueue.on('syncCompleted', handleSyncCompleted)
    syncQueue.on('syncBatchCompleted', handleSyncCompleted)

    return () => {
      syncQueue.off('syncCompleted', handleSyncCompleted)
      syncQueue.off('syncBatchCompleted', handleSyncCompleted)
    }
  }, [fetchRecords, config.enableRealtime])

  // Optimistic update functions
  const addRecord = useCallback(async (record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!config.enableOptimisticUpdates) {
      return await storageService.saveAttendanceRecord({
        ...record,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Create optimistic record
    const optimisticRecord: AttendanceRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
      pendingSync: true,
    }

    // Update UI optimistically
    setOptimisticState(prev => ({
      isUpdating: true,
      error: null,
      lastUpdate: [...records, optimisticRecord],
      rollbackData: records,
    }))
    setRecords(prev => [...prev, optimisticRecord])

    try {
      // Save to local storage
      await storageService.saveAttendanceRecord(optimisticRecord)

      // Add to sync queue if offline
      if (!isOnline()) {
        await syncQueue.addItem({
          type: 'attendance',
          data: optimisticRecord,
          priority: 'medium',
        })
      }

      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        lastUpdate: [...records, optimisticRecord],
      }))
    } catch (err) {
      // Rollback on error
      setRecords(optimisticState.rollbackData || records)
      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        error: err instanceof Error ? err : new Error('Failed to add attendance record'),
      }))
      throw err
    }
  }, [records, config.enableOptimisticUpdates])

  const updateRecord = useCallback(async (id: string, updates: Partial<AttendanceRecord>) => {
    const recordIndex = records.findIndex(r => r.id === id)
    if (recordIndex === -1) {
      throw new Error('Record not found')
    }

    const originalRecord = records[recordIndex]
    const updatedRecord = { ...originalRecord, ...updates, updatedAt: new Date() }

    if (!config.enableOptimisticUpdates) {
      return await storageService.saveAttendanceRecord(updatedRecord)
    }

    // Update UI optimistically
    const newRecords = [...records]
    newRecords[recordIndex] = updatedRecord
    setOptimisticState(prev => ({
      isUpdating: true,
      error: null,
      lastUpdate: newRecords,
      rollbackData: records,
    }))
    setRecords(newRecords)

    try {
      // Save to local storage
      await storageService.saveAttendanceRecord(updatedRecord)

      // Add to sync queue if offline
      if (!isOnline()) {
        await syncQueue.addItem({
          type: 'attendance',
          data: updatedRecord,
          priority: 'medium',
        })
      }

      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        lastUpdate: newRecords,
      }))
    } catch (err) {
      // Rollback on error
      setRecords(optimisticState.rollbackData || records)
      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        error: err instanceof Error ? err : new Error('Failed to update attendance record'),
      }))
      throw err
    }
  }, [records, config.enableOptimisticUpdates])

  const deleteRecord = useCallback(async (id: string) => {
    const recordToDelete = records.find(r => r.id === id)
    if (!recordToDelete) {
      throw new Error('Record not found')
    }

    if (!config.enableOptimisticUpdates) {
      return await storageService.deleteAttendanceRecord(id)
    }

    // Update UI optimistically
    const newRecords = records.filter(r => r.id !== id)
    setOptimisticState(prev => ({
      isUpdating: true,
      error: null,
      lastUpdate: newRecords,
      rollbackData: records,
    }))
    setRecords(newRecords)

    try {
      // Delete from local storage
      await storageService.deleteAttendanceRecord(id)

      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        lastUpdate: newRecords,
      }))
    } catch (err) {
      // Rollback on error
      setRecords(optimisticState.rollbackData || records)
      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        error: err instanceof Error ? err : new Error('Failed to delete attendance record'),
      }))
      throw err
    }
  }, [records, config.enableOptimisticUpdates])

  return {
    records,
    loading,
    error,
    optimisticState,
    addRecord,
    updateRecord,
    deleteRecord,
    refetch: fetchRecords,
  }
}

// Hook for users
export function useUsers(
  filter?: {
    role?: string
    department?: string
    search?: string
  },
  options: UseStorageOptions = {}
) {
  const config = { ...DEFAULT_HOOK_OPTIONS, ...options }
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [optimisticState, setOptimisticState] = useState<OptimisticUpdateState<User[]>>({
    isUpdating: false,
    error: null,
    lastUpdate: null,
    rollbackData: null,
  })
  const retryCountRef = useRef(0)

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await storageService.getUsers(filter)
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch users'))
      
      // Retry logic
      if (config.enableRetry && retryCountRef.current < config.maxRetries) {
        retryCountRef.current++
        setTimeout(fetchUsers, config.retryDelay * retryCountRef.current)
      }
    } finally {
      setLoading(false)
    }
  }, [filter, config.enableRetry, config.maxRetries, config.retryDelay])

  // Initial fetch
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Real-time updates
  useEffect(() => {
    if (!config.enableRealtime) return

    const handleSyncCompleted = () => {
      fetchUsers()
    }

    syncQueue.on('syncCompleted', handleSyncCompleted)
    syncQueue.on('syncBatchCompleted', handleSyncCompleted)

    return () => {
      syncQueue.off('syncCompleted', handleSyncCompleted)
      syncQueue.off('syncBatchCompleted', handleSyncCompleted)
    }
  }, [fetchUsers, config.enableRealtime])

  // Optimistic update functions
  const addUser = useCallback(async (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!config.enableOptimisticUpdates) {
      return await storageService.saveUser({
        ...user,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Create optimistic user
    const optimisticUser: User = {
      ...user,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Update UI optimistically
    setOptimisticState(prev => ({
      isUpdating: true,
      error: null,
      lastUpdate: [...users, optimisticUser],
      rollbackData: users,
    }))
    setUsers(prev => [...prev, optimisticUser])

    try {
      // Save to local storage
      await storageService.saveUser(optimisticUser)

      // Add to sync queue if offline
      if (!isOnline()) {
        await syncQueue.addItem({
          type: 'user',
          data: optimisticUser,
          priority: 'medium',
        })
      }

      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        lastUpdate: [...users, optimisticUser],
      }))
    } catch (err) {
      // Rollback on error
      setUsers(optimisticState.rollbackData || users)
      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        error: err instanceof Error ? err : new Error('Failed to add user'),
      }))
      throw err
    }
  }, [users, config.enableOptimisticUpdates])

  const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
    const userIndex = users.findIndex(u => u.id === id)
    if (userIndex === -1) {
      throw new Error('User not found')
    }

    const originalUser = users[userIndex]
    const updatedUser = { ...originalUser, ...updates, updatedAt: new Date() }

    if (!config.enableOptimisticUpdates) {
      return await storageService.saveUser(updatedUser)
    }

    // Update UI optimistically
    const newUsers = [...users]
    newUsers[userIndex] = updatedUser
    setOptimisticState(prev => ({
      isUpdating: true,
      error: null,
      lastUpdate: newUsers,
      rollbackData: users,
    }))
    setUsers(newUsers)

    try {
      // Save to local storage
      await storageService.saveUser(updatedUser)

      // Add to sync queue if offline
      if (!isOnline()) {
        await syncQueue.addItem({
          type: 'user',
          data: updatedUser,
          priority: 'medium',
        })
      }

      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        lastUpdate: newUsers,
      }))
    } catch (err) {
      // Rollback on error
      setUsers(optimisticState.rollbackData || users)
      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        error: err instanceof Error ? err : new Error('Failed to update user'),
      }))
      throw err
    }
  }, [users, config.enableOptimisticUpdates])

  const deleteUser = useCallback(async (id: string) => {
    const userToDelete = users.find(u => u.id === id)
    if (!userToDelete) {
      throw new Error('User not found')
    }

    if (!config.enableOptimisticUpdates) {
      return await storageService.deleteUser(id)
    }

    // Update UI optimistically
    const newUsers = users.filter(u => u.id !== id)
    setOptimisticState(prev => ({
      isUpdating: true,
      error: null,
      lastUpdate: newUsers,
      rollbackData: users,
    }))
    setUsers(newUsers)

    try {
      // Delete from local storage
      await storageService.deleteUser(id)

      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        lastUpdate: newUsers,
      }))
    } catch (err) {
      // Rollback on error
      setUsers(optimisticState.rollbackData || users)
      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        error: err instanceof Error ? err : new Error('Failed to delete user'),
      }))
      throw err
    }
  }, [users, config.enableOptimisticUpdates])

  return {
    users,
    loading,
    error,
    optimisticState,
    addUser,
    updateUser,
    deleteUser,
    refetch: fetchUsers,
  }
}

// Hook for settings
export function useSettings(options: UseStorageOptions = {}) {
  const config = { ...DEFAULT_HOOK_OPTIONS, ...options }
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [optimisticState, setOptimisticState] = useState<OptimisticUpdateState<AppSettings | null>>({
    isUpdating: false,
    error: null,
    lastUpdate: null,
    rollbackData: null,
  })
  const retryCountRef = useRef(0)

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await storageService.getSettings()
      setSettings(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch settings'))
      
      // Retry logic
      if (config.enableRetry && retryCountRef.current < config.maxRetries) {
        retryCountRef.current++
        setTimeout(fetchSettings, config.retryDelay * retryCountRef.current)
      }
    } finally {
      setLoading(false)
    }
  }, [config.enableRetry, config.maxRetries, config.retryDelay])

  // Initial fetch
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Real-time updates
  useEffect(() => {
    if (!config.enableRealtime) return

    const handleSyncCompleted = () => {
      fetchSettings()
    }

    syncQueue.on('syncCompleted', handleSyncCompleted)

    return () => {
      syncQueue.off('syncCompleted', handleSyncCompleted)
    }
  }, [fetchSettings, config.enableRealtime])

  // Optimistic update function
  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    if (!settings) {
      throw new Error('Settings not loaded')
    }

    const updatedSettings: AppSettings = {
      ...settings,
      ...updates,
      lastUpdated: new Date(),
    }

    if (!config.enableOptimisticUpdates) {
      return await storageService.saveSettings(updatedSettings)
    }

    // Update UI optimistically
    setOptimisticState(prev => ({
      isUpdating: true,
      error: null,
      lastUpdate: updatedSettings,
      rollbackData: settings,
    }))
    setSettings(updatedSettings)

    try {
      // Save to local storage
      await storageService.saveSettings(updatedSettings)

      // Add to sync queue if offline
      if (!isOnline()) {
        await syncQueue.addItem({
          type: 'settings',
          data: updatedSettings,
          priority: 'low',
        })
      }

      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        lastUpdate: updatedSettings,
      }))
    } catch (err) {
      // Rollback on error
      setSettings(optimisticState.rollbackData || settings)
      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        error: err instanceof Error ? err : new Error('Failed to update settings'),
      }))
      throw err
    }
  }, [settings, config.enableOptimisticUpdates])

  return {
    settings,
    loading,
    error,
    optimisticState,
    updateSettings,
    refetch: fetchSettings,
  }
}

// Hook for offline data
export function useOfflineData(options: UseStorageOptions = {}) {
  const config = { ...DEFAULT_HOOK_OPTIONS, ...options }
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [optimisticState, setOptimisticState] = useState<OptimisticUpdateState<OfflineData | null>>({
    isUpdating: false,
    error: null,
    lastUpdate: null,
    rollbackData: null,
  })
  const retryCountRef = useRef(0)

  // Fetch offline data
  const fetchOfflineData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await storageService.getOfflineData()
      setOfflineData(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch offline data'))
      
      // Retry logic
      if (config.enableRetry && retryCountRef.current < config.maxRetries) {
        retryCountRef.current++
        setTimeout(fetchOfflineData, config.retryDelay * retryCountRef.current)
      }
    } finally {
      setLoading(false)
    }
  }, [config.enableRetry, config.maxRetries, config.retryDelay])

  // Initial fetch
  useEffect(() => {
    fetchOfflineData()
  }, [fetchOfflineData])

  // Real-time updates
  useEffect(() => {
    if (!config.enableRealtime) return

    const handleSyncCompleted = () => {
      fetchOfflineData()
    }

    syncQueue.on('syncCompleted', handleSyncCompleted)

    return () => {
      syncQueue.off('syncCompleted', handleSyncCompleted)
    }
  }, [fetchOfflineData, config.enableRealtime])

  // Optimistic update function
  const updateOfflineData = useCallback(async (updates: Partial<OfflineData>) => {
    if (!offlineData) {
      throw new Error('Offline data not loaded')
    }

    const updatedOfflineData: OfflineData = {
      ...offlineData,
      ...updates,
    }

    if (!config.enableOptimisticUpdates) {
      return await storageService.saveOfflineData(updatedOfflineData)
    }

    // Update UI optimistically
    setOptimisticState(prev => ({
      isUpdating: true,
      error: null,
      lastUpdate: updatedOfflineData,
      rollbackData: offlineData,
    }))
    setOfflineData(updatedOfflineData)

    try {
      // Save to local storage
      await storageService.saveOfflineData(updatedOfflineData)

      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        lastUpdate: updatedOfflineData,
      }))
    } catch (err) {
      // Rollback on error
      setOfflineData(optimisticState.rollbackData || offlineData)
      setOptimisticState(prev => ({
        ...prev,
        isUpdating: false,
        error: err instanceof Error ? err : new Error('Failed to update offline data'),
      }))
      throw err
    }
  }, [offlineData, config.enableOptimisticUpdates])

  return {
    offlineData,
    loading,
    error,
    optimisticState,
    updateOfflineData,
    refetch: fetchOfflineData,
  }
}

// Hook for sync queue status
export function useSyncQueue() {
  const [stats, setStats] = useState({
    totalItems: 0,
    processedItems: 0,
    successfulItems: 0,
    failedItems: 0,
    pendingItems: 0,
  })
  const [isOnline, setIsOnline] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch stats
  const fetchStats = useCallback(async () => {
    const queueStats = await syncQueue.getStats()
    setStats(queueStats)
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchStats()
    setIsOnline(window.navigator.onLine)
  }, [fetchStats])

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Listen for sync events
  useEffect(() => {
    const handleSyncStarted = () => setIsProcessing(true)
    const handleSyncCompleted = () => {
      setIsProcessing(false)
      fetchStats()
    }
    const handleSyncError = () => setIsProcessing(false)

    syncQueue.on('syncStarted', handleSyncStarted)
    syncQueue.on('syncCompleted', handleSyncCompleted)
    syncQueue.on('syncError', handleSyncError)

    return () => {
      syncQueue.off('syncStarted', handleSyncStarted)
      syncQueue.off('syncCompleted', handleSyncCompleted)
      syncQueue.off('syncError', handleSyncError)
    }
  }, [fetchStats])

  const forceSync = useCallback(async () => {
    await syncQueue.forceSync()
    fetchStats()
  }, [fetchStats])

  const clearQueue = useCallback(async () => {
    await syncQueue.clearQueue()
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    isOnline,
    isProcessing,
    forceSync,
    clearQueue,
    refetch: fetchStats,
  }
}