import React from 'react'
import type {
  OperationProgress,
  ImportProgress,
  ExportProgress,
  BackupProgress,
  RestoreProgress,
  ArchivalProgress
} from '@/types/data-management'

// Progress tracking class
export class ProgressTracker {
  private static instance: ProgressTracker
  private progress: Map<string, OperationProgress> = new Map()
  private listeners: Map<string, (progress: OperationProgress) => void> = new Map()

  private constructor() {}

  static getInstance(): ProgressTracker {
    if (!ProgressTracker.instance) {
      ProgressTracker.instance = new ProgressTracker()
    }
    return ProgressTracker.instance
  }

  // Create a new progress tracker
  createProgress(id: string, total: number, initialMessage?: string): OperationProgress {
    const progress: OperationProgress = {
      current: 0,
      total,
      percentage: 0,
      status: 'pending',
      message: initialMessage || 'Initializing...'
    }
    
    this.progress.set(id, progress)
    return progress
  }

  // Create an import progress tracker
  createImportProgress(id: string, totalRows: number, initialMessage?: string): ImportProgress {
    const progress: ImportProgress = {
      current: 0,
      total: totalRows,
      percentage: 0,
      status: 'pending',
      message: initialMessage || 'Initializing import...',
      currentRow: 0,
      totalRows
    }
    
    this.progress.set(id, progress)
    return progress
  }

  // Create an export progress tracker
  createExportProgress(id: string, totalRecords: number, initialMessage?: string): ExportProgress {
    const progress: ExportProgress = {
      current: 0,
      total: totalRecords,
      percentage: 0,
      status: 'pending',
      message: initialMessage || 'Initializing export...',
      currentRecord: 0,
      totalRecords
    }
    
    this.progress.set(id, progress)
    return progress
  }

  // Create a backup progress tracker
  createBackupProgress(id: string, totalTables: number, totalRecords: number, initialMessage?: string): BackupProgress {
    const progress: BackupProgress = {
      current: 0,
      total: totalRecords,
      percentage: 0,
      status: 'pending',
      message: initialMessage || 'Initializing backup...',
      currentTable: '',
      totalTables,
      currentRecord: 0,
      totalRecords
    }
    
    this.progress.set(id, progress)
    return progress
  }

  // Create a restore progress tracker
  createRestoreProgress(id: string, totalTables: number, totalRecords: number, initialMessage?: string): RestoreProgress {
    const progress: RestoreProgress = {
      current: 0,
      total: totalRecords,
      percentage: 0,
      status: 'pending',
      message: initialMessage || 'Initializing restore...',
      currentTable: '',
      totalTables,
      currentRecord: 0,
      totalRecords
    }
    
    this.progress.set(id, progress)
    return progress
  }

  // Create an archival progress tracker
  createArchivalProgress(id: string, totalRecords: number, initialMessage?: string): ArchivalProgress {
    const progress: ArchivalProgress = {
      current: 0,
      total: totalRecords,
      percentage: 0,
      status: 'pending',
      message: initialMessage || 'Initializing archival...',
      currentRecord: 0,
      totalRecords
    }
    
    this.progress.set(id, progress)
    return progress
  }

  // Update progress
  updateProgress(id: string, updates: Partial<OperationProgress>): OperationProgress | null {
    const current = this.progress.get(id)
    if (!current) {
      return null
    }

    const updated: OperationProgress = {
      ...current,
      ...updates
    }

    // Calculate percentage if not provided
    if (updates.current !== undefined && updates.percentage === undefined) {
      updated.percentage = Math.round((updated.current / updated.total) * 100)
    }

    this.progress.set(id, updated)

    // Notify listeners
    const listener = this.listeners.get(id)
    if (listener) {
      listener(updated)
    }

    return updated
  }

  // Update import progress
  updateImportProgress(id: string, updates: Partial<ImportProgress>): ImportProgress | null {
    const current = this.progress.get(id) as ImportProgress
    if (!current) {
      return null
    }

    const updated: ImportProgress = {
      ...current,
      ...updates
    }

    // Calculate percentage if not provided
    if (updates.current !== undefined && updates.percentage === undefined) {
      updated.percentage = Math.round((updated.current / updated.total) * 100)
    }

    // Update currentRow if current is updated
    if (updates.current !== undefined) {
      updated.currentRow = updates.current
    }

    this.progress.set(id, updated)

    // Notify listeners
    const listener = this.listeners.get(id)
    if (listener) {
      listener(updated)
    }

    return updated
  }

  // Update export progress
  updateExportProgress(id: string, updates: Partial<ExportProgress>): ExportProgress | null {
    const current = this.progress.get(id) as ExportProgress
    if (!current) {
      return null
    }

    const updated: ExportProgress = {
      ...current,
      ...updates
    }

    // Calculate percentage if not provided
    if (updates.current !== undefined && updates.percentage === undefined) {
      updated.percentage = Math.round((updated.current / updated.total) * 100)
    }

    // Update currentRecord if current is updated
    if (updates.current !== undefined) {
      updated.currentRecord = updates.current
    }

    this.progress.set(id, updated)

    // Notify listeners
    const listener = this.listeners.get(id)
    if (listener) {
      listener(updated)
    }

    return updated
  }

  // Update backup progress
  updateBackupProgress(id: string, updates: Partial<BackupProgress>): BackupProgress | null {
    const current = this.progress.get(id) as BackupProgress
    if (!current) {
      return null
    }

    const updated: BackupProgress = {
      ...current,
      ...updates
    }

    // Calculate percentage if not provided
    if (updates.current !== undefined && updates.percentage === undefined) {
      updated.percentage = Math.round((updated.current / updated.total) * 100)
    }

    // Update currentRecord if current is updated
    if (updates.current !== undefined) {
      updated.currentRecord = updates.current
    }

    this.progress.set(id, updated)

    // Notify listeners
    const listener = this.listeners.get(id)
    if (listener) {
      listener(updated)
    }

    return updated
  }

  // Update restore progress
  updateRestoreProgress(id: string, updates: Partial<RestoreProgress>): RestoreProgress | null {
    const current = this.progress.get(id) as RestoreProgress
    if (!current) {
      return null
    }

    const updated: RestoreProgress = {
      ...current,
      ...updates
    }

    // Calculate percentage if not provided
    if (updates.current !== undefined && updates.percentage === undefined) {
      updated.percentage = Math.round((updated.current / updated.total) * 100)
    }

    // Update currentRecord if current is updated
    if (updates.current !== undefined) {
      updated.currentRecord = updates.current
    }

    this.progress.set(id, updated)

    // Notify listeners
    const listener = this.listeners.get(id)
    if (listener) {
      listener(updated)
    }

    return updated
  }

  // Update archival progress
  updateArchivalProgress(id: string, updates: Partial<ArchivalProgress>): ArchivalProgress | null {
    const current = this.progress.get(id) as ArchivalProgress
    if (!current) {
      return null
    }

    const updated: ArchivalProgress = {
      ...current,
      ...updates
    }

    // Calculate percentage if not provided
    if (updates.current !== undefined && updates.percentage === undefined) {
      updated.percentage = Math.round((updated.current / updated.total) * 100)
    }

    // Update currentRecord if current is updated
    if (updates.current !== undefined) {
      updated.currentRecord = updates.current
    }

    this.progress.set(id, updated)

    // Notify listeners
    const listener = this.listeners.get(id)
    if (listener) {
      listener(updated)
    }

    return updated
  }

  // Get progress
  getProgress(id: string): OperationProgress | null {
    return this.progress.get(id) || null
  }

  // Get all progress
  getAllProgress(): Map<string, OperationProgress> {
    return new Map(this.progress)
  }

  // Add progress listener
  addProgressListener(id: string, listener: (progress: OperationProgress) => void): void {
    this.listeners.set(id, listener)
  }

  // Remove progress listener
  removeProgressListener(id: string): void {
    this.listeners.delete(id)
  }

  // Complete progress
  completeProgress(id: string, message?: string): OperationProgress | null {
    return this.updateProgress(id, {
      current: this.progress.get(id)?.total || 0,
      percentage: 100,
      status: 'completed',
      message: message || 'Operation completed successfully'
    })
  }

  // Fail progress
  failProgress(id: string, message?: string): OperationProgress | null {
    return this.updateProgress(id, {
      status: 'failed',
      message: message || 'Operation failed'
    })
  }

  // Reset progress
  resetProgress(id: string): OperationProgress | null {
    const current = this.progress.get(id)
    if (!current) {
      return null
    }

    const reset: OperationProgress = {
      ...current,
      current: 0,
      percentage: 0,
      status: 'pending',
      message: 'Resetting...'
    }

    this.progress.set(id, reset)

    // Notify listeners
    const listener = this.listeners.get(id)
    if (listener) {
      listener(reset)
    }

    return reset
  }

  // Remove progress
  removeProgress(id: string): boolean {
    this.listeners.delete(id)
    return this.progress.delete(id)
  }

  // Clear all progress
  clearAllProgress(): void {
    this.progress.clear()
    this.listeners.clear()
  }
}

// Progress hook for React components
export function useProgress(id: string) {
  const [progress, setProgress] = React.useState<OperationProgress | null>(null)
  const tracker = ProgressTracker.getInstance()

  React.useEffect(() => {
    // Get initial progress
    const initialProgress = tracker.getProgress(id)
    if (initialProgress) {
      setProgress(initialProgress)
    }

    // Add listener
    const listener = (newProgress: OperationProgress) => {
      setProgress(newProgress)
    }
    tracker.addProgressListener(id, listener)

    // Cleanup
    return () => {
      tracker.removeProgressListener(id)
    }
  }, [id, tracker])

  const updateProgress = React.useCallback((updates: Partial<OperationProgress>) => {
    return tracker.updateProgress(id, updates)
  }, [id, tracker])

  const completeProgress = React.useCallback((message?: string) => {
    return tracker.completeProgress(id, message)
  }, [id, tracker])

  const failProgress = React.useCallback((message?: string) => {
    return tracker.failProgress(id, message)
  }, [id, tracker])

  const resetProgress = React.useCallback(() => {
    return tracker.resetProgress(id)
  }, [id, tracker])

  return {
    progress,
    updateProgress,
    completeProgress,
    failProgress,
    resetProgress
  }
}

// Progress hook for import operations
export function useImportProgress(id: string) {
  const [progress, setProgress] = React.useState<ImportProgress | null>(null)
  const tracker = ProgressTracker.getInstance()

  React.useEffect(() => {
    // Get initial progress
    const initialProgress = tracker.getProgress(id) as ImportProgress
    if (initialProgress) {
      setProgress(initialProgress)
    }

    // Add listener
    const listener = (newProgress: OperationProgress) => {
      setProgress(newProgress as ImportProgress)
    }
    tracker.addProgressListener(id, listener)

    // Cleanup
    return () => {
      tracker.removeProgressListener(id)
    }
  }, [id, tracker])

  const updateProgress = React.useCallback((updates: Partial<ImportProgress>) => {
    return tracker.updateImportProgress(id, updates)
  }, [id, tracker])

  const completeProgress = React.useCallback((message?: string) => {
    return tracker.completeProgress(id, message)
  }, [id, tracker])

  const failProgress = React.useCallback((message?: string) => {
    return tracker.failProgress(id, message)
  }, [id, tracker])

  const resetProgress = React.useCallback(() => {
    return tracker.resetProgress(id)
  }, [id, tracker])

  return {
    progress,
    updateProgress,
    completeProgress,
    failProgress,
    resetProgress
  }
}

// Progress hook for export operations
export function useExportProgress(id: string) {
  const [progress, setProgress] = React.useState<ExportProgress | null>(null)
  const tracker = ProgressTracker.getInstance()

  React.useEffect(() => {
    // Get initial progress
    const initialProgress = tracker.getProgress(id) as ExportProgress
    if (initialProgress) {
      setProgress(initialProgress)
    }

    // Add listener
    const listener = (newProgress: OperationProgress) => {
      setProgress(newProgress as ExportProgress)
    }
    tracker.addProgressListener(id, listener)

    // Cleanup
    return () => {
      tracker.removeProgressListener(id)
    }
  }, [id, tracker])

  const updateProgress = React.useCallback((updates: Partial<ExportProgress>) => {
    return tracker.updateExportProgress(id, updates)
  }, [id, tracker])

  const completeProgress = React.useCallback((message?: string) => {
    return tracker.completeProgress(id, message)
  }, [id, tracker])

  const failProgress = React.useCallback((message?: string) => {
    return tracker.failProgress(id, message)
  }, [id, tracker])

  const resetProgress = React.useCallback(() => {
    return tracker.resetProgress(id)
  }, [id, tracker])

  return {
    progress,
    updateProgress,
    completeProgress,
    failProgress,
    resetProgress
  }
}

// Progress hook for backup operations
export function useBackupProgress(id: string) {
  const [progress, setProgress] = React.useState<BackupProgress | null>(null)
  const tracker = ProgressTracker.getInstance()

  React.useEffect(() => {
    // Get initial progress
    const initialProgress = tracker.getProgress(id) as BackupProgress
    if (initialProgress) {
      setProgress(initialProgress)
    }

    // Add listener
    const listener = (newProgress: OperationProgress) => {
      setProgress(newProgress as BackupProgress)
    }
    tracker.addProgressListener(id, listener)

    // Cleanup
    return () => {
      tracker.removeProgressListener(id)
    }
  }, [id, tracker])

  const updateProgress = React.useCallback((updates: Partial<BackupProgress>) => {
    return tracker.updateBackupProgress(id, updates)
  }, [id, tracker])

  const completeProgress = React.useCallback((message?: string) => {
    return tracker.completeProgress(id, message)
  }, [id, tracker])

  const failProgress = React.useCallback((message?: string) => {
    return tracker.failProgress(id, message)
  }, [id, tracker])

  const resetProgress = React.useCallback(() => {
    return tracker.resetProgress(id)
  }, [id, tracker])

  return {
    progress,
    updateProgress,
    completeProgress,
    failProgress,
    resetProgress
  }
}

// Progress hook for restore operations
export function useRestoreProgress(id: string) {
  const [progress, setProgress] = React.useState<RestoreProgress | null>(null)
  const tracker = ProgressTracker.getInstance()

  React.useEffect(() => {
    // Get initial progress
    const initialProgress = tracker.getProgress(id) as RestoreProgress
    if (initialProgress) {
      setProgress(initialProgress)
    }

    // Add listener
    const listener = (newProgress: OperationProgress) => {
      setProgress(newProgress as RestoreProgress)
    }
    tracker.addProgressListener(id, listener)

    // Cleanup
    return () => {
      tracker.removeProgressListener(id)
    }
  }, [id, tracker])

  const updateProgress = React.useCallback((updates: Partial<RestoreProgress>) => {
    return tracker.updateRestoreProgress(id, updates)
  }, [id, tracker])

  const completeProgress = React.useCallback((message?: string) => {
    return tracker.completeProgress(id, message)
  }, [id, tracker])

  const failProgress = React.useCallback((message?: string) => {
    return tracker.failProgress(id, message)
  }, [id, tracker])

  const resetProgress = React.useCallback(() => {
    return tracker.resetProgress(id)
  }, [id, tracker])

  return {
    progress,
    updateProgress,
    completeProgress,
    failProgress,
    resetProgress
  }
}

// Progress hook for archival operations
export function useArchivalProgress(id: string) {
  const [progress, setProgress] = React.useState<ArchivalProgress | null>(null)
  const tracker = ProgressTracker.getInstance()

  React.useEffect(() => {
    // Get initial progress
    const initialProgress = tracker.getProgress(id) as ArchivalProgress
    if (initialProgress) {
      setProgress(initialProgress)
    }

    // Add listener
    const listener = (newProgress: OperationProgress) => {
      setProgress(newProgress as ArchivalProgress)
    }
    tracker.addProgressListener(id, listener)

    // Cleanup
    return () => {
      tracker.removeProgressListener(id)
    }
  }, [id, tracker])

  const updateProgress = React.useCallback((updates: Partial<ArchivalProgress>) => {
    return tracker.updateArchivalProgress(id, updates)
  }, [id, tracker])

  const completeProgress = React.useCallback((message?: string) => {
    return tracker.completeProgress(id, message)
  }, [id, tracker])

  const failProgress = React.useCallback((message?: string) => {
    return tracker.failProgress(id, message)
  }, [id, tracker])

  const resetProgress = React.useCallback(() => {
    return tracker.resetProgress(id)
  }, [id, tracker])

  return {
    progress,
    updateProgress,
    completeProgress,
    failProgress,
    resetProgress
  }
}