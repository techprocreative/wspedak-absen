import { get, set, del, clear, keys, createStore } from 'idb-keyval'
import { openDB, DBSchema, IDBPDatabase, IDBPTransaction } from 'idb'

// Database store names
export const DB_STORES = {
  ATTENDANCE: 'attendance',
  USERS: 'users',
  SYNC_QUEUE: 'syncQueue',
  OFFLINE_DATA: 'offlineData',
  SETTINGS: 'settings',
} as const

// Attendance policy type
export interface AttendancePolicy {
  id: string
  work_start_time: string
  work_end_time: string
  late_threshold_minutes: number
  early_leave_threshold_minutes: number
  overtime_enabled: boolean
  weekend_work_enabled: boolean
  created_at: string
  updated_at: string
}

// Database name and version
const DB_NAME = 'edo-attendance-db'
const DB_VERSION = 2 // Incremented to add new indexes

// Database schema - using type assertion to bypass strict typing
interface AttendanceDBSchema extends DBSchema {
  attendance: any
  users: any
  syncQueue: any
  offlineData: any
  settings: any
}

// Attendance record type
export interface AttendanceRecord {
  id: string
  userId: string
  timestamp: Date
  type: 'check-in' | 'check-out'
  location?: {
    latitude: number
    longitude: number
  }
  photo?: string // Base64 encoded photo
  synced: boolean
  pendingSync?: boolean
  createdAt?: Date
  updatedAt?: Date
}

// User type
export interface User {
  id: string
  name: string
  email: string
  role: 'employee' | 'admin' | 'hr' | 'manager'
  department?: string
  photo?: string
  createdAt?: Date
  updatedAt?: Date
}

// Sync queue item type
export interface SyncQueueItem {
  id: string
  type: 'attendance' | 'user' | 'settings'
  data: any
  timestamp: Date
  retryCount: number
  priority: 'high' | 'medium' | 'low'
}

// Offline data type
export interface OfflineData {
  id: string
  lastSync: Date
  userData: User[]
  attendanceData: AttendanceRecord[]
}

// App settings type
export interface AppSettings {
  id: string
  syncInterval: number // in minutes
  maxRetries: number
  offlineMode: boolean
  lastUpdated: Date
  attendancePolicy?: AttendancePolicy
}

// Database connection
let db: IDBPDatabase<AttendanceDBSchema> | null = null

// Storage Manager class
export class StorageManager {
  private dbPromise: Promise<IDBPDatabase<AttendanceDBSchema>>

  constructor() {
    this.dbPromise = this.initDB()
  }

  // Initialize database
  private async initDB(): Promise<IDBPDatabase<AttendanceDBSchema>> {
    if (db) return db

    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not available in this environment')
    }

    try {
      db = await openDB<AttendanceDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db: IDBPDatabase<AttendanceDBSchema>, oldVersion: number, newVersion: number | null) {
          // Create attendance store
          if (!db.objectStoreNames.contains(DB_STORES.ATTENDANCE)) {
            const attendanceStore = db.createObjectStore(DB_STORES.ATTENDANCE, { keyPath: 'id' })
            attendanceStore.createIndex('by-user', 'userId')
            attendanceStore.createIndex('by-timestamp', 'timestamp')
            attendanceStore.createIndex('by-synced', 'synced')
            attendanceStore.createIndex('by-user-timestamp', ['userId', 'timestamp'])
            attendanceStore.createIndex('by-type', 'type')
            attendanceStore.createIndex('by-pending-sync', 'pendingSync')
            attendanceStore.createIndex('by-user-synced', ['userId', 'synced'])
            attendanceStore.createIndex('by-user-type', ['userId', 'type'])
            attendanceStore.createIndex('by-date', 'date') // For date-based queries
          } else if (oldVersion < 2) {
            // Add new indexes to existing store
            const attendanceStore = db.transaction(DB_STORES.ATTENDANCE, 'versionchange').objectStore(DB_STORES.ATTENDANCE)
            attendanceStore.createIndex('by-type', 'type')
            attendanceStore.createIndex('by-pending-sync', 'pendingSync')
            attendanceStore.createIndex('by-user-synced', ['userId', 'synced'])
            attendanceStore.createIndex('by-user-type', ['userId', 'type'])
            attendanceStore.createIndex('by-date', 'date') // For date-based queries
          }

          // Create users store
          if (!db.objectStoreNames.contains(DB_STORES.USERS)) {
            const usersStore = db.createObjectStore(DB_STORES.USERS, { keyPath: 'id' })
            usersStore.createIndex('by-email', 'email', { unique: true })
            usersStore.createIndex('by-role', 'role')
            usersStore.createIndex('by-department', 'department')
            usersStore.createIndex('by-name', 'name') // For name-based search
            usersStore.createIndex('by-role-department', ['role', 'department'])
          } else if (oldVersion < 2) {
            // Add new indexes to existing store
            const usersStore = db.transaction(DB_STORES.USERS, 'versionchange').objectStore(DB_STORES.USERS)
            usersStore.createIndex('by-name', 'name') // For name-based search
            usersStore.createIndex('by-role-department', ['role', 'department'])
          }

          // Create sync queue store
          if (!db.objectStoreNames.contains(DB_STORES.SYNC_QUEUE)) {
            const syncQueueStore = db.createObjectStore(DB_STORES.SYNC_QUEUE, { keyPath: 'id' })
            syncQueueStore.createIndex('by-type', 'type')
            syncQueueStore.createIndex('by-timestamp', 'timestamp')
            syncQueueStore.createIndex('by-retry-count', 'retryCount')
            syncQueueStore.createIndex('by-priority', 'priority')
            syncQueueStore.createIndex('by-type-priority', ['type', 'priority'])
            syncQueueStore.createIndex('by-priority-timestamp', ['priority', 'timestamp'])
          } else if (oldVersion < 2) {
            // Add new indexes to existing store
            const syncQueueStore = db.transaction(DB_STORES.SYNC_QUEUE, 'versionchange').objectStore(DB_STORES.SYNC_QUEUE)
            syncQueueStore.createIndex('by-priority', 'priority')
            syncQueueStore.createIndex('by-type-priority', ['type', 'priority'])
            syncQueueStore.createIndex('by-priority-timestamp', ['priority', 'timestamp'])
          }

          // Create offline data store
          if (!db.objectStoreNames.contains(DB_STORES.OFFLINE_DATA)) {
            const offlineDataStore = db.createObjectStore(DB_STORES.OFFLINE_DATA, { keyPath: 'id' })
            offlineDataStore.createIndex('by-last-sync', 'lastSync')
          } else if (oldVersion < 2) {
            // Add new indexes to existing store
            const offlineDataStore = db.transaction(DB_STORES.OFFLINE_DATA, 'versionchange').objectStore(DB_STORES.OFFLINE_DATA)
            offlineDataStore.createIndex('by-last-sync', 'lastSync')
          }

          // Create settings store
          if (!db.objectStoreNames.contains(DB_STORES.SETTINGS)) {
            const settingsStore = db.createObjectStore(DB_STORES.SETTINGS, { keyPath: 'id' })
            settingsStore.createIndex('by-last-updated', 'lastUpdated')
          } else if (oldVersion < 2) {
            // Add new indexes to existing store
            const settingsStore = db.transaction(DB_STORES.SETTINGS, 'versionchange').objectStore(DB_STORES.SETTINGS)
            settingsStore.createIndex('by-last-updated', 'lastUpdated')
          }
        },
        blocked() {
          console.error('Database upgrade blocked by other tabs')
        },
        blocking() {
          console.log('Database upgrade blocking other tabs')
        },
        terminated() {
          console.error('Database connection terminated')
          db = null
        },
      })

      // Initialize default settings if not exists
      await this.initializeDefaultSettings()

      return db
    } catch (error) {
      console.error('Error initializing database:', error)
      throw error
    }
  }

  // Initialize default settings
  private async initializeDefaultSettings(): Promise<void> {
    try {
      const settings = await this.getSettings()
      if (!settings) {
        await this.saveSettings({
          id: 'default',
          syncInterval: 5, // 5 minutes
          maxRetries: 3,
          offlineMode: false,
          lastUpdated: new Date(),
        })
      }
    } catch (error) {
      console.error('Error initializing default settings:', error)
      throw error
    }
  }

  // Get database instance
  async getDB(): Promise<IDBPDatabase<AttendanceDBSchema>> {
    return this.dbPromise
  }

  // Execute a transaction with rollback on error
  async executeTransaction<T>(
    stores: string[],
    mode: IDBTransactionMode,
    callback: (transaction: any) => Promise<T>
  ): Promise<T> {
    const db = await this.getDB()
    const transaction = db.transaction(stores as any, mode)

    try {
      const result = await callback(transaction)
      await transaction.done
      return result
    } catch (error) {
      console.error('Transaction failed, rolling back:', error)
      transaction.abort()
      throw error
    }
  }

  // Attendance record operations
  async getAttendanceRecords(filter?: {
    userId?: string
    startDate?: Date
    endDate?: Date
    synced?: boolean
    type?: 'check-in' | 'check-out'
    pendingSync?: boolean
    limit?: number
    offset?: number
  }): Promise<AttendanceRecord[]> {
    const db = await this.getDB()
    let records: AttendanceRecord[] = []

    try {
      // Use the most specific index based on the filter
      if (filter?.userId && filter?.synced !== undefined) {
        // Use by-user-synced index for user and synced filter
        const index = db
          .transaction(DB_STORES.ATTENDANCE)
          .objectStore(DB_STORES.ATTENDANCE)
          .index('by-user-synced')

        records = await index.getAll([filter.userId, filter.synced])
        
        // Apply date filter if provided
        if (filter?.startDate || filter?.endDate) {
          records = records.filter(record => {
            const timestamp = new Date(record.timestamp)
            return (!filter.startDate || timestamp >= filter.startDate) &&
                   (!filter.endDate || timestamp <= filter.endDate)
          })
        }
      } else if (filter?.userId && filter?.type) {
        // Use by-user-type index for user and type filter
        const index = db
          .transaction(DB_STORES.ATTENDANCE)
          .objectStore(DB_STORES.ATTENDANCE)
          .index('by-user-type')

        records = await index.getAll([filter.userId, filter.type])
        
        // Apply date filter if provided
        if (filter?.startDate || filter?.endDate) {
          records = records.filter(record => {
            const timestamp = new Date(record.timestamp)
            return (!filter.startDate || timestamp >= filter.startDate) &&
                   (!filter.endDate || timestamp <= filter.endDate)
          })
        }
      } else if (filter?.userId) {
        // Use by-user-timestamp index for user filter with date range
        const index = db
          .transaction(DB_STORES.ATTENDANCE)
          .objectStore(DB_STORES.ATTENDANCE)
          .index('by-user-timestamp')

        const keyRange = IDBKeyRange.bound(
          [filter.userId, filter.startDate || new Date(0)],
          [filter.userId, filter.endDate || new Date(9999, 11, 31)]
        )

        records = await index.getAll(keyRange)
      } else if (filter?.synced !== undefined) {
        // Use by-synced index for synced filter
        const index = db
          .transaction(DB_STORES.ATTENDANCE)
          .objectStore(DB_STORES.ATTENDANCE)
          .index('by-synced')

        records = await index.getAll(filter.synced)
        
        // Apply date filter if provided
        if (filter?.startDate || filter?.endDate) {
          records = records.filter(record => {
            const timestamp = new Date(record.timestamp)
            return (!filter.startDate || timestamp >= filter.startDate) &&
                   (!filter.endDate || timestamp <= filter.endDate)
          })
        }
      } else if (filter?.type) {
        // Use by-type index for type filter
        const index = db
          .transaction(DB_STORES.ATTENDANCE)
          .objectStore(DB_STORES.ATTENDANCE)
          .index('by-type')

        records = await index.getAll(filter.type)
        
        // Apply date filter if provided
        if (filter?.startDate || filter?.endDate) {
          records = records.filter(record => {
            const timestamp = new Date(record.timestamp)
            return (!filter.startDate || timestamp >= filter.startDate) &&
                   (!filter.endDate || timestamp <= filter.endDate)
          })
        }
      } else if (filter?.pendingSync !== undefined) {
        // Use by-pending-sync index for pendingSync filter
        const index = db
          .transaction(DB_STORES.ATTENDANCE)
          .objectStore(DB_STORES.ATTENDANCE)
          .index('by-pending-sync')

        records = await index.getAll(filter.pendingSync)
        
        // Apply date filter if provided
        if (filter?.startDate || filter?.endDate) {
          records = records.filter(record => {
            const timestamp = new Date(record.timestamp)
            return (!filter.startDate || timestamp >= filter.startDate) &&
                   (!filter.endDate || timestamp <= filter.endDate)
          })
        }
      } else {
        // Get all records
        records = await db.getAll(DB_STORES.ATTENDANCE)
        
        // Apply date filter if provided
        if (filter?.startDate || filter?.endDate) {
          records = records.filter(record => {
            const timestamp = new Date(record.timestamp)
            return (!filter.startDate || timestamp >= filter.startDate) &&
                   (!filter.endDate || timestamp <= filter.endDate)
          })
        }
      }

      // Apply additional filters that weren't handled by indexes
      if (filter?.synced !== undefined && !filter.userId) {
        records = records.filter(record => record.synced === filter.synced)
      }
      
      if (filter?.type && !filter.userId) {
        records = records.filter(record => record.type === filter.type)
      }
      
      if (filter?.pendingSync !== undefined) {
        records = records.filter(record => record.pendingSync === filter.pendingSync)
      }
      
      // Sort by timestamp (newest first)
      records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      // Apply pagination if provided
      if (filter?.offset !== undefined || filter?.limit !== undefined) {
        const offset = filter.offset || 0
        const limit = filter.limit || records.length
        records = records.slice(offset, offset + limit)
      }

      return records
    } catch (error) {
      console.error('Error getting attendance records:', error)
      return []
    }
  }

  async getAttendanceRecord(id: string): Promise<AttendanceRecord | null> {
    try {
      const db = await this.getDB()
      const result = await db.get(DB_STORES.ATTENDANCE, id)
      return result || null
    } catch (error) {
      console.error(`Error getting attendance record ${id}:`, error)
      return null
    }
  }

  async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    try {
      const db = await this.getDB()
      record.updatedAt = new Date()
      await db.put(DB_STORES.ATTENDANCE, record)
    } catch (error) {
      console.error('Error saving attendance record:', error)
      throw error
    }
  }

  async deleteAttendanceRecord(id: string): Promise<void> {
    try {
      const db = await this.getDB()
      await db.delete(DB_STORES.ATTENDANCE, id)
    } catch (error) {
      console.error(`Error deleting attendance record ${id}:`, error)
      throw error
    }
  }

  // User operations
  async getUsers(filter?: {
    role?: string
    department?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<User[]> {
    const db = await this.getDB()
    let users: User[] = []

    try {
      // Use the most specific index based on the filter
      if (filter?.role && filter?.department) {
        // Use by-role-department index for role and department filter
        const index = db
          .transaction(DB_STORES.USERS)
          .objectStore(DB_STORES.USERS)
          .index('by-role-department')
        
        users = await index.getAll([filter.role, filter.department])
      } else if (filter?.role) {
        // Use by-role index for role filter
        const index = db
          .transaction(DB_STORES.USERS)
          .objectStore(DB_STORES.USERS)
          .index('by-role')
        
        users = await index.getAll(filter.role)
      } else if (filter?.department) {
        // Use by-department index for department filter
        const index = db
          .transaction(DB_STORES.USERS)
          .objectStore(DB_STORES.USERS)
          .index('by-department')
        
        users = await index.getAll(filter.department)
      } else {
        // Get all users
        users = await db.getAll(DB_STORES.USERS)
      }

      // Apply search filter if provided
      if (filter?.search) {
        const searchLower = filter.search.toLowerCase()
        users = users.filter(user =>
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        )
      }
      
      // Sort by name
      users.sort((a, b) => a.name.localeCompare(b.name))
      
      // Apply pagination if provided
      if (filter?.offset !== undefined || filter?.limit !== undefined) {
        const offset = filter.offset || 0
        const limit = filter.limit || users.length
        users = users.slice(offset, offset + limit)
      }

      return users
    } catch (error) {
      console.error('Error getting users:', error)
      return []
    }
  }

  async getUser(id: string): Promise<User | null> {
    try {
      const db = await this.getDB()
      const result = await db.get(DB_STORES.USERS, id)
      return result || null
    } catch (error) {
      console.error(`Error getting user ${id}:`, error)
      return null
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const db = await this.getDB()
      const index = db
        .transaction(DB_STORES.USERS)
        .objectStore(DB_STORES.USERS)
        .index('by-email')
      
      const result = await index.get(email)
      return result || null
    } catch (error) {
      console.error(`Error getting user by email ${email}:`, error)
      return null
    }
  }

  async saveUser(user: User): Promise<void> {
    try {
      const db = await this.getDB()
      user.updatedAt = new Date()
      await db.put(DB_STORES.USERS, user)
    } catch (error) {
      console.error('Error saving user:', error)
      throw error
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const db = await this.getDB()
      await db.delete(DB_STORES.USERS, id)
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error)
      throw error
    }
  }

  // Sync queue operations
  async getSyncQueueItems(filter?: {
    type?: string
    priority?: 'high' | 'medium' | 'low'
    limit?: number
  }): Promise<SyncQueueItem[]> {
    const db = await this.getDB()
    let items: SyncQueueItem[] = []

    try {
      // Use the most specific index based on the filter
      if (filter?.type && filter?.priority) {
        // Use by-type-priority index for type and priority filter
        const index = db
          .transaction(DB_STORES.SYNC_QUEUE)
          .objectStore(DB_STORES.SYNC_QUEUE)
          .index('by-type-priority')
        
        items = await index.getAll([filter.type, filter.priority])
      } else if (filter?.priority) {
        // Use by-priority-timestamp index for priority filter
        const index = db
          .transaction(DB_STORES.SYNC_QUEUE)
          .objectStore(DB_STORES.SYNC_QUEUE)
          .index('by-priority-timestamp')
        
        // Get all items with the specified priority
        const allItems = await index.getAll()
        items = allItems.filter(item => item.priority === filter.priority)
      } else if (filter?.type) {
        // Use by-type index for type filter
        const index = db
          .transaction(DB_STORES.SYNC_QUEUE)
          .objectStore(DB_STORES.SYNC_QUEUE)
          .index('by-type')
        
        items = await index.getAll(filter.type)
      } else {
        // Get all items
        items = await db.getAll(DB_STORES.SYNC_QUEUE)
      }

      // Sort by priority (high first) and then by timestamp (oldest first)
      items.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        const aPriority = priorityOrder[a.priority]
        const bPriority = priorityOrder[b.priority]
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }
        
        return a.timestamp.getTime() - b.timestamp.getTime()
      })
      
      // Apply limit if provided
      if (filter?.limit !== undefined) {
        items = items.slice(0, filter.limit)
      }

      return items
    } catch (error) {
      console.error('Error getting sync queue items:', error)
      return []
    }
  }

  async addSyncQueueItem(item: SyncQueueItem): Promise<void> {
    try {
      const db = await this.getDB()
      await db.add(DB_STORES.SYNC_QUEUE, item)
    } catch (error) {
      console.error('Error adding sync queue item:', error)
      throw error
    }
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    try {
      const db = await this.getDB()
      await db.put(DB_STORES.SYNC_QUEUE, item)
    } catch (error) {
      console.error('Error updating sync queue item:', error)
      throw error
    }
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    try {
      const db = await this.getDB()
      await db.delete(DB_STORES.SYNC_QUEUE, id)
    } catch (error) {
      console.error(`Error removing sync queue item ${id}:`, error)
      throw error
    }
  }

  // Offline data operations
  async getOfflineData(): Promise<OfflineData | null> {
    try {
      const db = await this.getDB()
      const result = await db.get(DB_STORES.OFFLINE_DATA, 'offlineData')
      return result || null
    } catch (error) {
      console.error('Error getting offline data:', error)
      return null
    }
  }

  async saveOfflineData(data: OfflineData): Promise<void> {
    try {
      const db = await this.getDB()
      await db.put(DB_STORES.OFFLINE_DATA, { ...data, id: 'offlineData' })
    } catch (error) {
      console.error('Error saving offline data:', error)
      throw error
    }
  }

  // Settings operations
  async getSettings(): Promise<AppSettings | null> {
    try {
      const db = await this.getDB()
      const result = await db.get(DB_STORES.SETTINGS, 'default')
      return result || null
    } catch (error) {
      console.error('Error getting settings:', error)
      return null
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const db = await this.getDB()
      settings.lastUpdated = new Date()
      await db.put(DB_STORES.SETTINGS, settings)
    } catch (error) {
      console.error('Error saving settings:', error)
      throw error
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    try {
      const db = await this.getDB()
      await this.executeTransaction(
        Object.values(DB_STORES),
        'readwrite',
        async (transaction) => {
          for (const store of Object.values(DB_STORES)) {
            const storeObj = transaction.objectStore(store as any)
            if (storeObj) {
              await (storeObj as any).clear()
            } else {
              console.warn(`Store ${store} not found in transaction`)
            }
          }
        }
      )
      
      // Reinitialize default settings
      await this.initializeDefaultSettings()
    } catch (error) {
      console.error('Error clearing all data:', error)
      throw error
    }
  }

  // Close database connection
  async close(): Promise<void> {
    if (db) {
      db.close()
      db = null
    }
  }
}

// Create a singleton instance
export const storageManager = new StorageManager()

// Legacy compatibility - these will be deprecated in favor of StorageManager
// Create IndexedDB stores
const attendanceStore = createStore(DB_STORES.ATTENDANCE, 'attendance_records')
const usersStore = createStore(DB_STORES.USERS, 'users_data')
const syncQueueStore = createStore(DB_STORES.SYNC_QUEUE, 'sync_queue')
const offlineDataStore = createStore(DB_STORES.OFFLINE_DATA, 'offline_data')

// Attendance database operations
export const attendanceDB = {
  // Get all attendance records
  getAll: async (): Promise<AttendanceRecord[]> => {
    try {
      return await storageManager.getAttendanceRecords()
    } catch (error) {
      console.error('Error getting attendance records:', error)
      return []
    }
  },

  // Get a single attendance record by ID
  getById: async (id: string): Promise<AttendanceRecord | null> => {
    try {
      return await storageManager.getAttendanceRecord(id)
    } catch (error) {
      console.error(`Error getting attendance record ${id}:`, error)
      return null
    }
  },

  // Save an attendance record
  save: async (record: AttendanceRecord): Promise<void> => {
    try {
      await storageManager.saveAttendanceRecord(record)
    } catch (error) {
      console.error('Error saving attendance record:', error)
      throw error
    }
  },

  // Delete an attendance record
  delete: async (id: string): Promise<void> => {
    try {
      await storageManager.deleteAttendanceRecord(id)
    } catch (error) {
      console.error(`Error deleting attendance record ${id}:`, error)
      throw error
    }
  },

  // Clear all attendance records
  clear: async (): Promise<void> => {
    try {
      const db = await storageManager.getDB()
      await db.clear(DB_STORES.ATTENDANCE)
    } catch (error) {
      console.error('Error clearing attendance records:', error)
      throw error
    }
  },
}

// Users database operations
export const usersDB = {
  // Get all users
  getAll: async (): Promise<User[]> => {
    try {
      return await storageManager.getUsers()
    } catch (error) {
      console.error('Error getting users:', error)
      return []
    }
  },

  // Get a single user by ID
  getById: async (id: string): Promise<User | null> => {
    try {
      return await storageManager.getUser(id)
    } catch (error) {
      console.error(`Error getting user ${id}:`, error)
      return null
    }
  },

  // Save a user
  save: async (user: User): Promise<void> => {
    try {
      await storageManager.saveUser(user)
    } catch (error) {
      console.error('Error saving user:', error)
      throw error
    }
  },

  // Delete a user
  delete: async (id: string): Promise<void> => {
    try {
      await storageManager.deleteUser(id)
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error)
      throw error
    }
  },

  // Clear all users
  clear: async (): Promise<void> => {
    try {
      const db = await storageManager.getDB()
      await db.clear(DB_STORES.USERS)
    } catch (error) {
      console.error('Error clearing users:', error)
      throw error
    }
  },
}

// Sync queue operations
export const syncQueueDB = {
  // Get all sync queue items
  getAll: async (): Promise<SyncQueueItem[]> => {
    try {
      return await storageManager.getSyncQueueItems()
    } catch (error) {
      console.error('Error getting sync queue items:', error)
      return []
    }
  },

  // Add an item to the sync queue
  add: async (item: SyncQueueItem): Promise<void> => {
    try {
      await storageManager.addSyncQueueItem(item)
    } catch (error) {
      console.error('Error adding item to sync queue:', error)
      throw error
    }
  },

  // Remove an item from the sync queue
  remove: async (id: string): Promise<void> => {
    try {
      await storageManager.removeSyncQueueItem(id)
    } catch (error) {
      console.error(`Error removing item ${id} from sync queue:`, error)
      throw error
    }
  },

  // Clear the sync queue
  clear: async (): Promise<void> => {
    try {
      const db = await storageManager.getDB()
      await db.clear(DB_STORES.SYNC_QUEUE)
    } catch (error) {
      console.error('Error clearing sync queue:', error)
      throw error
    }
  },
}

// Offline data operations
export const offlineDataDB = {
  // Get offline data
  get: async (): Promise<OfflineData | null> => {
    try {
      return await storageManager.getOfflineData()
    } catch (error) {
      console.error('Error getting offline data:', error)
      return null
    }
  },

  // Save offline data
  save: async (data: OfflineData): Promise<void> => {
    try {
      await storageManager.saveOfflineData(data)
    } catch (error) {
      console.error('Error saving offline data:', error)
      throw error
    }
  },

  // Clear offline data
  clear: async (): Promise<void> => {
    try {
      const db = await storageManager.getDB()
      await db.clear(DB_STORES.OFFLINE_DATA)
    } catch (error) {
      console.error('Error clearing offline data:', error)
      throw error
    }
  },
}

// Initialize database with default data if needed
export const initializeDB = async (): Promise<void> => {
  try {
    // Initialize the storage manager
    await storageManager.getDB()
    
    // Check if offline data exists, if not create it
    const offlineData = await storageManager.getOfflineData()
    if (!offlineData) {
      await storageManager.saveOfflineData({
        id: 'offlineData',
        lastSync: new Date(),
        userData: [],
        attendanceData: [],
      })
    }
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}