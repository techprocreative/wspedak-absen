import { storageManager, AttendanceRecord, User, SyncQueueItem, OfflineData, AppSettings } from './db'

// Cache interface
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

// Storage options interface
interface StorageOptions {
  useCache?: boolean
  cacheTTL?: number // Default cache TTL in milliseconds
  enableQuotaManagement?: boolean
  enableCompression?: boolean
}

// Backup/Restore options interface
interface BackupOptions {
  includeAttendance?: boolean
  includeUsers?: boolean
  includeSettings?: boolean
  includeOfflineData?: boolean
}

// Default storage options
const DEFAULT_STORAGE_OPTIONS: Required<StorageOptions> = {
  useCache: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  enableQuotaManagement: true,
  enableCompression: false,
}

// Default backup options
const DEFAULT_BACKUP_OPTIONS: Required<BackupOptions> = {
  includeAttendance: true,
  includeUsers: true,
  includeSettings: true,
  includeOfflineData: true,
}

// Storage class with higher-level abstraction
export class StorageService {
  private cache: Map<string, CacheItem<any>> = new Map()
  private options: Required<StorageOptions>

  constructor(options: StorageOptions = {}) {
    this.options = { ...DEFAULT_STORAGE_OPTIONS, ...options }
    
    // Initialize cache cleanup interval
    if (this.options.useCache) {
      setInterval(() => this.cleanupCache(), 60 * 1000) // Clean up cache every minute
    }
  }

  // Cache management
  private getCacheKey(store: string, key?: string, filter?: any): string {
    const filterStr = filter ? JSON.stringify(filter) : ''
    return `${store}:${key || 'all'}:${filterStr}`
  }

  private setCache<T>(cacheKey: string, data: T): void {
    if (!this.options.useCache) return
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: this.options.cacheTTL,
    })
  }

  private getCache<T>(cacheKey: string): T | null {
    if (!this.options.useCache) return null
    
    const cachedItem = this.cache.get(cacheKey)
    if (!cachedItem) return null
    
    const now = Date.now()
    if (now - cachedItem.timestamp > cachedItem.ttl) {
      this.cache.delete(cacheKey)
      return null
    }
    
    return cachedItem.data
  }

  private cleanupCache(): void {
    if (!this.options.useCache) return
    
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  private clearCache(): void {
    this.cache.clear()
  }

  // Data serialization/deserialization
  private serialize<T>(data: T): string {
    return JSON.stringify(data)
  }

  private deserialize<T>(serialized: string): T {
    return JSON.parse(serialized)
  }

  // Storage quota management
  private async checkStorageQuota(): Promise<boolean> {
    if (!this.options.enableQuotaManagement) return true
    
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      const usedPercentage = (estimate.usage || 0) / (estimate.quota || 1)
      
      // If we're using more than 80% of available storage, return false
      return usedPercentage < 0.8
    }
    
    return true // Default to true if storage API is not available
  }

  private async getStorageUsage(): Promise<{ used: number; total: number; percentage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      const used = estimate.usage || 0
      const total = estimate.quota || 1
      const percentage = (used / total) * 100
      
      return { used, total, percentage }
    }
    
    return { used: 0, total: 1, percentage: 0 }
  }

  // Attendance record operations with caching
  async getAttendanceRecords(filter?: {
    userId?: string
    startDate?: Date
    endDate?: Date
    synced?: boolean
  }): Promise<AttendanceRecord[]> {
    const cacheKey = this.getCacheKey('attendance', undefined, filter)
    const cached = this.getCache<AttendanceRecord[]>(cacheKey)
    
    if (cached) {
      return cached
    }
    
    const records = await storageManager.getAttendanceRecords(filter)
    this.setCache(cacheKey, records)
    
    return records
  }

  async getAttendanceRecord(id: string): Promise<AttendanceRecord | null> {
    const cacheKey = this.getCacheKey('attendance', id)
    const cached = this.getCache<AttendanceRecord>(cacheKey)
    
    if (cached) {
      return cached
    }
    
    const record = await storageManager.getAttendanceRecord(id)
    if (record) {
      this.setCache(cacheKey, record)
    }
    
    return record
  }

  async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    // Check storage quota before saving
    const hasQuota = await this.checkStorageQuota()
    if (!hasQuota) {
      throw new Error('Storage quota exceeded')
    }
    
    await storageManager.saveAttendanceRecord(record)
    
    // Invalidate cache
    this.clearCache()
  }

  async deleteAttendanceRecord(id: string): Promise<void> {
    await storageManager.deleteAttendanceRecord(id)
    
    // Invalidate cache
    this.clearCache()
  }

  // User operations with caching
  async getUsers(filter?: {
    role?: string
    department?: string
    search?: string
  }): Promise<User[]> {
    const cacheKey = this.getCacheKey('users', undefined, filter)
    const cached = this.getCache<User[]>(cacheKey)
    
    if (cached) {
      return cached
    }
    
    const users = await storageManager.getUsers(filter)
    this.setCache(cacheKey, users)
    
    return users
  }

  async getUser(id: string): Promise<User | null> {
    const cacheKey = this.getCacheKey('users', id)
    const cached = this.getCache<User>(cacheKey)
    
    if (cached) {
      return cached
    }
    
    const user = await storageManager.getUser(id)
    if (user) {
      this.setCache(cacheKey, user)
    }
    
    return user
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const cacheKey = this.getCacheKey('users', `email:${email}`)
    const cached = this.getCache<User>(cacheKey)
    
    if (cached) {
      return cached
    }
    
    const user = await storageManager.getUserByEmail(email)
    if (user) {
      this.setCache(cacheKey, user)
    }
    
    return user
  }

  async saveUser(user: User): Promise<void> {
    // Check storage quota before saving
    const hasQuota = await this.checkStorageQuota()
    if (!hasQuota) {
      throw new Error('Storage quota exceeded')
    }
    
    await storageManager.saveUser(user)
    
    // Invalidate cache
    this.clearCache()
  }

  async deleteUser(id: string): Promise<void> {
    await storageManager.deleteUser(id)
    
    // Invalidate cache
    this.clearCache()
  }

  // Sync queue operations
  async getSyncQueueItems(filter?: {
    type?: string
    priority?: 'high' | 'medium' | 'low'
  }): Promise<SyncQueueItem[]> {
    // Don't cache sync queue items as they change frequently
    return await storageManager.getSyncQueueItems(filter)
  }

  async addSyncQueueItem(item: SyncQueueItem): Promise<void> {
    // Check storage quota before saving
    const hasQuota = await this.checkStorageQuota()
    if (!hasQuota) {
      throw new Error('Storage quota exceeded')
    }
    
    await storageManager.addSyncQueueItem(item)
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    await storageManager.updateSyncQueueItem(item)
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    await storageManager.removeSyncQueueItem(id)
  }

  // Offline data operations
  async getOfflineData(): Promise<OfflineData | null> {
    const cacheKey = this.getCacheKey('offlineData')
    const cached = this.getCache<OfflineData>(cacheKey)
    
    if (cached) {
      return cached
    }
    
    const offlineData = await storageManager.getOfflineData()
    if (offlineData) {
      this.setCache(cacheKey, offlineData)
    }
    
    return offlineData
  }

  async saveOfflineData(data: OfflineData): Promise<void> {
    // Check storage quota before saving
    const hasQuota = await this.checkStorageQuota()
    if (!hasQuota) {
      throw new Error('Storage quota exceeded')
    }
    
    await storageManager.saveOfflineData(data)
    
    // Invalidate cache
    this.clearCache()
  }

  // Settings operations
  async getSettings(): Promise<AppSettings | null> {
    const cacheKey = this.getCacheKey('settings')
    const cached = this.getCache<AppSettings>(cacheKey)
    
    if (cached) {
      return cached
    }
    
    const settings = await storageManager.getSettings()
    if (settings) {
      this.setCache(cacheKey, settings)
    }
    
    return settings
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await storageManager.saveSettings(settings)
    
    // Invalidate cache
    this.clearCache()
  }

  // Backup and restore functionality
  async createBackup(options: BackupOptions = {}): Promise<string> {
    const backupOptions = { ...DEFAULT_BACKUP_OPTIONS, ...options }
    const backup: any = {
      timestamp: new Date().toISOString(),
      version: '1.0',
    }
    
    if (backupOptions.includeAttendance) {
      backup.attendanceRecords = await this.getAttendanceRecords()
    }
    
    if (backupOptions.includeUsers) {
      backup.users = await this.getUsers()
    }
    
    if (backupOptions.includeSettings) {
      backup.settings = await this.getSettings()
    }
    
    if (backupOptions.includeOfflineData) {
      backup.offlineData = await this.getOfflineData()
    }
    
    return this.serialize(backup)
  }

  async restoreBackup(backupData: string, options: BackupOptions = {}): Promise<void> {
    const backupOptions = { ...DEFAULT_BACKUP_OPTIONS, ...options }
    const backup = this.deserialize<any>(backupData)
    
    // Validate backup format
    if (!backup.timestamp || !backup.version) {
      throw new Error('Invalid backup format')
    }
    
    // Check storage quota before restoring
    const hasQuota = await this.checkStorageQuota()
    if (!hasQuota) {
      throw new Error('Storage quota exceeded')
    }
    
    // Restore data based on options
    if (backupOptions.includeAttendance && backup.attendanceRecords) {
      for (const record of backup.attendanceRecords) {
        await this.saveAttendanceRecord(record)
      }
    }
    
    if (backupOptions.includeUsers && backup.users) {
      for (const user of backup.users) {
        await this.saveUser(user)
      }
    }
    
    if (backupOptions.includeSettings && backup.settings) {
      await this.saveSettings(backup.settings)
    }
    
    if (backupOptions.includeOfflineData && backup.offlineData) {
      await this.saveOfflineData(backup.offlineData)
    }
    
    // Invalidate cache
    this.clearCache()
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    await storageManager.clearAllData()
    this.clearCache()
  }

  async getStorageInfo(): Promise<{
    usage: { used: number; total: number; percentage: number }
    cacheSize: number
    cacheEntries: number
  }> {
    const usage = await this.getStorageUsage()
    const cacheSize = this.cache.size
    const cacheEntries = this.cache.size
    
    return {
      usage,
      cacheSize,
      cacheEntries,
    }
  }

  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const isPersistent = await navigator.storage.persist()
        return isPersistent
      } catch (error) {
        console.error('Error requesting persistent storage:', error)
        return false
      }
    }
    
    return false
  }
}

// Create a singleton instance
export const storageService = new StorageService()