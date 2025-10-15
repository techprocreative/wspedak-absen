
import { SyncStatus, SyncDirection, SyncPriority } from './sync-manager'
import { formatDistanceToNow, format } from 'date-fns'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Network status types
export type NetworkStatus = 'online' | 'offline' | 'connecting' | 'disconnecting'

// Sync status UI types
export type SyncStatusUI = 'idle' | 'syncing' | 'completed' | 'error' | 'offline' | 'pending'

// Offline message types
export type OfflineMessageType = 'info' | 'warning' | 'error' | 'success'

// Offline message interface
export interface OfflineMessage {
  id: string
  type: OfflineMessageType
  title: string
  description: string
  timestamp: Date
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

// Network status detection
export function getNetworkStatus(): NetworkStatus {
  if (typeof window === 'undefined') return 'online'
  
  return navigator.onLine ? 'online' : 'offline'
}

// Format sync status for UI
export function formatSyncStatus(status: SyncStatus): SyncStatusUI {
  switch (status) {
    case SyncStatus.IDLE:
      return 'idle'
    case SyncStatus.SYNCING:
      return 'syncing'
    case SyncStatus.COMPLETED:
      return 'completed'
    case SyncStatus.ERROR:
      return 'error'
    case SyncStatus.OFFLINE:
      return 'offline'
    default:
      return 'idle'
  }
}

// Format sync direction for UI
export function formatSyncDirection(direction: SyncDirection): string {
  switch (direction) {
    case SyncDirection.PUSH:
      return 'Uploading'
    case SyncDirection.PULL:
      return 'Downloading'
    case SyncDirection.BIDIRECTIONAL:
      return 'Syncing'
    default:
      return 'Syncing'
  }
}

// Format sync priority for UI
export function formatSyncPriority(priority: SyncPriority): string {
  switch (priority) {
    case SyncPriority.HIGH:
      return 'High'
    case SyncPriority.MEDIUM:
      return 'Medium'
    case SyncPriority.LOW:
      return 'Low'
    default:
      return 'Medium'
  }
}

// Format timestamp for UI
export function formatTimestamp(timestamp: Date | null): string {
  if (!timestamp) return 'Never'
  
  try {
    return formatDistanceToNow(timestamp, { addSuffix: true })
  } catch (error) {
    return 'Invalid date'
  }
}

// Format date for UI
export function formatDate(date: Date | null): string {
  if (!date) return 'N/A'
  
  try {
    return format(date, 'MMM d, yyyy h:mm a')
  } catch (error) {
    return 'Invalid date'
  }
}

// Get sync status color
export function getSyncStatusColor(status: SyncStatusUI): string {
  switch (status) {
    case 'idle':
      return 'text-muted-foreground'
    case 'syncing':
      return 'text-blue-500'
    case 'completed':
      return 'text-green-500'
    case 'error':
      return 'text-red-500'
    case 'offline':
      return 'text-yellow-500'
    case 'pending':
      return 'text-orange-500'
    default:
      return 'text-muted-foreground'
  }
}

// Get sync status icon
export function getSyncStatusIcon(status: SyncStatusUI): string {
  switch (status) {
    case 'idle':
      return 'circle'
    case 'syncing':
      return 'refresh-cw'
    case 'completed':
      return 'check-circle'
    case 'error':
      return 'x-circle'
    case 'offline':
      return 'wifi-off'
    case 'pending':
      return 'clock'
    default:
      return 'circle'
  }
}

// Get network status color
export function getNetworkStatusColor(status: NetworkStatus): string {
  switch (status) {
    case 'online':
      return 'text-green-500'
    case 'offline':
      return 'text-red-500'
    case 'connecting':
      return 'text-blue-500'
    case 'disconnecting':
      return 'text-yellow-500'
    default:
      return 'text-muted-foreground'
  }
}

// Get network status icon
export function getNetworkStatusIcon(status: NetworkStatus): string {
  switch (status) {
    case 'online':
      return 'wifi'
    case 'offline':
      return 'wifi-off'
    case 'connecting':
      return 'loader'
    case 'disconnecting':
      return 'loader'
    default:
      return 'wifi'
  }
}

// Create offline message templates
export function createOfflineMessage(
  type: OfflineMessageType,
  title: string,
  description: string,
  options?: {
    dismissible?: boolean
    action?: {
      label: string
      onClick: () => void
    }
  }
): OfflineMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    description,
    timestamp: new Date(),
    dismissible: options?.dismissible ?? true,
    action: options?.action,
  }
}

// Predefined offline messages
export const OfflineMessages = {
  // Network status messages
  online: () => createOfflineMessage(
    'success',
    'You\'re back online',
    'Your connection has been restored. Any pending changes will now sync.'
  ),
  
  offline: () => createOfflineMessage(
    'warning',
    'You\'re offline',
    'You\'re currently offline. Changes will be saved locally and synced when you reconnect.',
    {
      action: {
        label: 'Learn More',
        onClick: () => logger.info('Show offline help')
      }
    }
  ),
  
  connecting: () => createOfflineMessage(
    'info',
    'Connecting...',
    'Attempting to restore your connection.'
  ),
  
  disconnecting: () => createOfflineMessage(
    'warning',
    'Connection lost',
    'Your connection has been interrupted. Switching to offline mode.'
  ),
  
  // Sync status messages
  syncStarted: () => createOfflineMessage(
    'info',
    'Sync started',
    'Your data is now being synchronized.'
  ),
  
  syncCompleted: (itemsSynced: number) => createOfflineMessage(
    'success',
    'Sync completed',
    `Successfully synced ${itemsSynced} item${itemsSynced !== 1 ? 's' : ''}.`
  ),
  
  syncError: (error?: string) => createOfflineMessage(
    'error',
    'Sync failed',
    error || 'An error occurred while syncing your data. Please try again.',
    {
      action: {
        label: 'Retry',
        onClick: () => logger.info('Retry sync')
      }
    }
  ),
  
  syncConflict: (count: number) => createOfflineMessage(
    'warning',
    'Sync conflicts detected',
    `${count} conflict${count !== 1 ? 's' : ''} need${count === 1 ? 's' : ''} to be resolved.`,
    {
      action: {
        label: 'Resolve Conflicts',
        onClick: () => logger.info('Show conflict resolution')
      }
    }
  ),
  
  // Data messages
  dataSavedLocally: () => createOfflineMessage(
    'success',
    'Saved locally',
    'Your changes have been saved locally and will sync when you\'re online.'
  ),
  
  dataSynced: () => createOfflineMessage(
    'success',
    'Synced',
    'Your changes have been successfully synced to the server.'
  ),
  
  // Feature messages
  offlineModeEnabled: () => createOfflineMessage(
    'info',
    'Offline mode enabled',
    'You can now use this app without an internet connection.'
  ),
  
  offlineModeDisabled: () => createOfflineMessage(
    'info',
    'Offline mode disabled',
    'You now need an internet connection to use this app.'
  ),
}

// UI state management utilities
export class UIStateManager {
  private listeners: Map<string, Set<Function>> = new Map()
  
  // Subscribe to state changes
  subscribe(key: string, callback: Function): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    
    this.listeners.get(key)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.listeners.delete(key)
        }
      }
    }
  }
  
  // Notify all subscribers of a state change
  notify(key: string, data?: any): void {
    const callbacks = this.listeners.get(key)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }
  
  // Get all subscribers for a key
  getSubscribers(key: string): Function[] {
    const callbacks = this.listeners.get(key)
    return callbacks ? Array.from(callbacks) : []
  }
  
  // Clear all subscribers
  clear(): void {
    this.listeners.clear()
  }
}

// Create a singleton instance
export const uiStateManager = new UIStateManager()

// Debounce utility for UI updates
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// Throttle utility for UI updates
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// Format file size for UI
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format sync progress percentage
export function formatSyncProgress(
  processed: number,
  total: number
): { percentage: number; text: string } {
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0
  const text = `${processed} of ${total} (${percentage}%)`
  
  return { percentage, text }
}

// Check if device is mobile
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// Check if device has touch support