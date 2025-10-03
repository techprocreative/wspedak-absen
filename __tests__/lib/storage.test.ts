import { StorageService } from '@/lib/storage'
import { mockIndexedDB } from '../mocks/indexeddb.mock'

// Mock the storage manager
jest.mock('@/lib/db')

describe('StorageService', () => {
  let storageService: StorageService

  beforeEach(() => {
    storageService = new StorageService()
    mockIndexedDB.clearAll()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Cache management', () => {
    it('should cache data with TTL', async () => {
      const mockData = [{ id: '1', name: 'Test' }]
      const mockGetAttendanceRecords = require('@/lib/db').storageManager.getAttendanceRecords
      mockGetAttendanceRecords.mockResolvedValue(mockData)

      // First call should fetch from storage
      const result1 = await storageService.getAttendanceRecords()
      expect(mockGetAttendanceRecords).toHaveBeenCalledTimes(1)
      expect(result1).toEqual(mockData)

      // Second call should use cache
      const result2 = await storageService.getAttendanceRecords()
      expect(mockGetAttendanceRecords).toHaveBeenCalledTimes(1)
      expect(result2).toEqual(mockData)
    })

    it('should invalidate cache when data is modified', async () => {
      const mockData = [{ id: '1', name: 'Test' }]
      const mockGetAttendanceRecords = require('@/lib/db').storageManager.getAttendanceRecords
      const mockSaveAttendanceRecord = require('@/lib/db').storageManager.saveAttendanceRecord
      mockGetAttendanceRecords.mockResolvedValue(mockData)
      mockSaveAttendanceRecord.mockResolvedValue(undefined)

      // First call
      await storageService.getAttendanceRecords()
      expect(mockGetAttendanceRecords).toHaveBeenCalledTimes(1)

      // Save new record (should invalidate cache)
      await storageService.saveAttendanceRecord({ id: '2', name: 'Test 2' } as any)

      // Next call should fetch from storage again
      await storageService.getAttendanceRecords()
      expect(mockGetAttendanceRecords).toHaveBeenCalledTimes(2)
    })
  })

  describe('Storage quota management', () => {
    it('should throw error when storage quota is exceeded', async () => {
      // Mock storage quota check to return false
      Object.defineProperty(navigator.storage, 'estimate', {
        value: jest.fn(() => Promise.resolve({
          usage: 1000 * 1024 * 1024, // 1GB
          quota: 100 * 1024 * 1024,  // 100MB
        })),
        writable: true,
      })

      const mockSaveAttendanceRecord = require('@/lib/db').storageManager.saveAttendanceRecord
      mockSaveAttendanceRecord.mockResolvedValue(undefined)

      await expect(
        storageService.saveAttendanceRecord({ id: '1', name: 'Test' } as any)
      ).rejects.toThrow('Storage quota exceeded')
    })

    it('should allow saving when storage quota is available', async () => {
      // Mock storage quota check to return true
      Object.defineProperty(navigator.storage, 'estimate', {
        value: jest.fn(() => Promise.resolve({
          usage: 50 * 1024 * 1024,  // 50MB
          quota: 100 * 1024 * 1024, // 100MB
        })),
        writable: true,
      })

      const mockSaveAttendanceRecord = require('@/lib/db').storageManager.saveAttendanceRecord
      mockSaveAttendanceRecord.mockResolvedValue(undefined)

      await expect(
        storageService.saveAttendanceRecord({ id: '1', name: 'Test' } as any)
      ).resolves.not.toThrow()
    })
  })

  describe('Backup and restore', () => {
    it('should create backup with all data', async () => {
      const mockAttendanceRecords = [{ id: '1', userId: '1', timestamp: new Date() }]
      const mockUsers = [{ id: '1', name: 'Test User' }]
      const mockSettings = { theme: 'dark' }

      const mockGetAttendanceRecords = require('@/lib/db').storageManager.getAttendanceRecords
      const mockGetUsers = require('@/lib/db').storageManager.getUsers
      const mockGetSettings = require('@/lib/db').storageManager.getSettings

      mockGetAttendanceRecords.mockResolvedValue(mockAttendanceRecords)
      mockGetUsers.mockResolvedValue(mockUsers)
      mockGetSettings.mockResolvedValue(mockSettings)

      const backup = await storageService.createBackup()
      const backupData = JSON.parse(backup)

      expect(backupData).toHaveProperty('timestamp')
      expect(backupData).toHaveProperty('version')
      expect(backupData.attendanceRecords).toEqual(mockAttendanceRecords)
      expect(backupData.users).toEqual(mockUsers)
      expect(backupData.settings).toEqual(mockSettings)
    })

    it('should restore data from backup', async () => {
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        attendanceRecords: [{ id: '1', userId: '1', timestamp: new Date() }],
        users: [{ id: '1', name: 'Test User' }],
        settings: { theme: 'dark' },
      }

      const mockSaveAttendanceRecord = require('@/lib/db').storageManager.saveAttendanceRecord
      const mockSaveUser = require('@/lib/db').storageManager.saveUser
      const mockSaveSettings = require('@/lib/db').storageManager.saveSettings

      mockSaveAttendanceRecord.mockResolvedValue(undefined)
      mockSaveUser.mockResolvedValue(undefined)
      mockSaveSettings.mockResolvedValue(undefined)

      await storageService.restoreBackup(JSON.stringify(backupData))

      expect(mockSaveAttendanceRecord).toHaveBeenCalledWith(backupData.attendanceRecords[0])
      expect(mockSaveUser).toHaveBeenCalledWith(backupData.users[0])
      expect(mockSaveSettings).toHaveBeenCalledWith(backupData.settings)
    })

    it('should throw error for invalid backup format', async () => {
      const invalidBackup = JSON.stringify({ invalid: 'data' })

      await expect(storageService.restoreBackup(invalidBackup)).rejects.toThrow('Invalid backup format')
    })
  })

  describe('Storage info', () => {
    it('should return storage information', async () => {
      Object.defineProperty(navigator.storage, 'estimate', {
        value: jest.fn(() => Promise.resolve({
          usage: 50 * 1024 * 1024,  // 50MB
          quota: 100 * 1024 * 1024, // 100MB
        })),
        writable: true,
      })

      const info = await storageService.getStorageInfo()

      expect(info).toHaveProperty('usage')
      expect(info).toHaveProperty('cacheSize')
      expect(info).toHaveProperty('cacheEntries')
      expect(info.usage.percentage).toBe(50)
    })
  })

  describe('Persistent storage', () => {
    it('should request persistent storage', async () => {
      Object.defineProperty(navigator.storage, 'persist', {
        value: jest.fn(() => Promise.resolve(true)),
        writable: true,
      })

      const isPersistent = await storageService.requestPersistentStorage()
      expect(isPersistent).toBe(true)
    })

    it('should handle persistent storage request failure', async () => {
      Object.defineProperty(navigator.storage, 'persist', {
        value: jest.fn(() => Promise.resolve(false)),
        writable: true,
      })

      const isPersistent = await storageService.requestPersistentStorage()
      expect(isPersistent).toBe(false)
    })
  })
})