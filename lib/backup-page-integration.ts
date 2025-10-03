/**
 * Backup Page Integration Functions
 * Replace mock functions in backup page with these real API integrations
 */

import { apiClient } from './api-client'
import { toast } from './toast-helper'

export async function fetchBackupData(
  setLoading: (loading: boolean) => void,
  setBackupHistory: (history: any[]) => void,
  setRestoreHistory: (history: any[]) => void,
  setSchedules: (schedules: any[]) => void,
  mockSchedules: any[]
) {
  try {
    setLoading(true)
    
    // Fetch real backup history
    const historyResponse = await apiClient.getBackupHistory()
    if (historyResponse.success && historyResponse.data) {
      const mappedHistory = historyResponse.data.map((item: any) => ({
        id: item.id || Date.now().toString(),
        name: item.details?.filename || 'Backup',
        type: item.details?.type || 'full',
        status: 'completed' as const,
        progress: 100,
        totalRecords: item.details?.totalRecords || 0,
        processedRecords: item.details?.totalRecords || 0,
        fileSize: (item.details?.fileSize || 0) / 1024 / 1024,
        compressedSize: (item.details?.fileSize || 0) / 1024 / 1024,
        encrypted: item.details?.encryption || false,
        downloadUrl: undefined, // URLs expire
        errors: [],
        warnings: [],
        createdAt: item.created_at,
        createdBy: item.user_id || 'System',
        location: '/backups'
      }))
      setBackupHistory(mappedHistory)
    }
    
    // Restore history would need a separate endpoint
    // For now, use empty array
    setRestoreHistory([])
    
    // Schedules would need a separate API (not implemented yet)
    setSchedules(mockSchedules)
    
  } catch (error: any) {
    console.error("Error fetching backup data:", error)
    toast.error(error.message || 'Failed to fetch backup data')
  } finally {
    setLoading(false)
  }
}

export async function startRealBackup(
  backupType: string,
  settings: any,
  setIsBackingUp: (backing: boolean) => void,
  setBackupProgress: (progress: number) => void,
  setCurrentBackupJob: (job: any) => void,
  setActiveTab: (tab: string) => void,
  refreshHistory: () => void
) {
  try {
    setIsBackingUp(true)
    setBackupProgress(0)

    // Simulate progress for UX
    const progressInterval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 5
      })
    }, 300)

    // Call real API
    const result = await apiClient.createBackup({
      type: backupType as any,
      includeTables: ['users', 'attendance', 'daily_attendance_records', 'attendance_policies', 'user_settings'],
      compression: settings.compression,
      encryption: settings.encryption
    })

    clearInterval(progressInterval)
    setBackupProgress(100)

    if (result.success) {
      const newJob = {
        id: result.backupId,
        name: result.filename,
        type: result.type as any,
        status: 'completed' as const,
        progress: 100,
        totalRecords: result.totalRecords,
        processedRecords: result.totalRecords,
        fileSize: result.fileSize,
        compressedSize: result.compressedSize || result.fileSize,
        encrypted: settings.encryption,
        downloadUrl: result.downloadUrl,
        errors: [],
        warnings: [],
        createdAt: result.createdAt,
        startedAt: result.createdAt,
        completedAt: new Date().toISOString(),
        createdBy: 'Admin',
        location: '/backups'
      }

      setCurrentBackupJob(newJob)
      setActiveTab('progress')
      
      toast.success(
        `Backup completed! ${result.totalRecords} records backed up`,
        'Backup Success'
      )
      
      setTimeout(refreshHistory, 1000)
    }
  } catch (error: any) {
    console.error('Backup error:', error)
    toast.error(error.message || 'Backup failed', 'Backup Error')
    
    const failedJob = {
      id: Date.now().toString(),
      name: `${backupType} Backup - ${new Date().toLocaleDateString()}`,
      type: backupType as any,
      status: 'failed' as const,
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      fileSize: 0,
      compressedSize: 0,
      encrypted: false,
      errors: [error.message],
      warnings: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      createdBy: 'Admin',
      location: '/backups'
    }
    
    setCurrentBackupJob(failedJob)
    setActiveTab('progress')
  } finally {
    setIsBackingUp(false)
  }
}

export async function startRealRestore(
  selectedBackup: any,
  restoreOptions: any,
  setCurrentRestoreJob: (job: any) => void,
  setActiveTab: (tab: string) => void,
  refreshHistory: () => void
) {
  if (!selectedBackup) {
    toast.warning('Please select a backup to restore')
    return
  }

  try {
    // Call real API
    const result = await apiClient.restoreBackup({
      filename: selectedBackup.name,
      conflictResolution: restoreOptions.conflictResolution,
      tables: []
    })

    if (result.success) {
      const newJob = {
        id: Date.now().toString(),
        backupId: selectedBackup.id,
        backupName: selectedBackup.name,
        status: 'completed' as const,
        progress: 100,
        totalRecords: result.totalRecords,
        processedRecords: result.restoredRecords,
        errors: result.errors,
        warnings: result.warnings,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        createdBy: 'Admin',
        conflictResolution: restoreOptions.conflictResolution
      }

      setCurrentRestoreJob(newJob)
      setActiveTab('restore-progress')
      
      toast.success(
        `Restored ${result.restoredRecords} of ${result.totalRecords} records`,
        'Restore Complete'
      )
      
      if (result.warnings.length > 0) {
        toast.warning(result.warnings.join(', '), 'Restore Warnings')
      }
      
      setTimeout(refreshHistory, 1000)
    }
  } catch (error: any) {
    console.error('Restore error:', error)
    toast.error(error.message || 'Restore failed', 'Restore Error')
    
    const failedJob = {
      id: Date.now().toString(),
      backupId: selectedBackup.id,
      backupName: selectedBackup.name,
      status: 'failed' as const,
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      errors: [error.message],
      warnings: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      createdBy: 'Admin',
      conflictResolution: restoreOptions.conflictResolution
    }
    
    setCurrentRestoreJob(failedJob)
    setActiveTab('restore-progress')
  }
}

export function downloadBackupFile(downloadUrl: string, filename: string) {
  if (!downloadUrl) {
    toast.error('Download URL not available or expired')
    return
  }

  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  toast.success('Download started', 'Backup')
}

export async function deleteBackupFile(filename: string, refreshHistory: () => void) {
  if (!confirm(`Are you sure you want to delete backup: ${filename}?`)) {
    return
  }

  try {
    const result = await apiClient.deleteBackup(filename)
    
    if (result.success) {
      toast.success('Backup deleted successfully', 'Delete Backup')
      setTimeout(refreshHistory, 500)
    }
  } catch (error: any) {
    console.error('Delete backup error:', error)
    toast.error(error.message || 'Failed to delete backup')
  }
}
