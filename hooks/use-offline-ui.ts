'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { 
  getNetworkStatus, 
  NetworkStatus,
  OfflineMessages,
  OfflineMessage,
  uiStateManager,
  debounce,
  throttle
} from '@/lib/offline-utils'
import { SyncStatus as SyncStatusType } from '@/lib/sync-manager'
import { useSync } from './use-sync'

export interface OfflineUIState {
  // Network status
  isOnline: boolean
  networkStatus: NetworkStatus
  isTransitioning: boolean
  
  // Sync status
  syncStatus: SyncStatusType
  isSyncing: boolean
  lastSyncTime: Date | null
  lastSuccessfulSyncTime: Date | null
  
  // UI state
  offlineBannerVisible: boolean
  offlineIndicatorVisible: boolean
  syncNotificationsEnabled: boolean
  autoSyncEnabled: boolean
  
  // Messages
  messages: OfflineMessage[]
  activeMessage: OfflineMessage | null
}

export interface OfflineUIActions {
  // Network actions
  checkNetworkStatus: () => NetworkStatus
  retryConnection: () => Promise<void>
  
  // Sync actions
  startSync: () => Promise<void>
  forceSync: () => Promise<void>
  
  // UI actions
  showOfflineBanner: (message?: OfflineMessage) => void
  hideOfflineBanner: () => void
  showOfflineIndicator: () => void
  hideOfflineIndicator: () => void
  toggleSyncNotifications: (enabled: boolean) => void
  toggleAutoSync: (enabled: boolean) => void
  
  // Message actions
  addMessage: (message: OfflineMessage) => void
  removeMessage: (id: string) => void
  clearMessages: () => void
  setActiveMessage: (message: OfflineMessage | null) => void
  
  // State management
  subscribe: (key: string, callback: (data: any) => void) => () => void
  notify: (key: string, data?: any) => void
}

export type UseOfflineUIReturn = OfflineUIState & OfflineUIActions

const DEFAULT_OFFLINE_UI_STATE: OfflineUIState = {
  isOnline: true,
  networkStatus: 'online',
  isTransitioning: false,
  syncStatus: SyncStatusType.IDLE,
  isSyncing: false,
  lastSyncTime: null,
  lastSuccessfulSyncTime: null,
  offlineBannerVisible: false,
  offlineIndicatorVisible: true,
  syncNotificationsEnabled: true,
  autoSyncEnabled: true,
  messages: [],
  activeMessage: null,
}

export function useOfflineUI(options: {
  enableAutoSync?: boolean
  enableSyncNotifications?: boolean
  showOfflineBanner?: boolean
  showOfflineIndicator?: boolean
  autoHideBannerDelay?: number // in milliseconds
  syncInterval?: number // in milliseconds
} = {}): UseOfflineUIReturn {
  const {
    enableAutoSync = true,
    enableSyncNotifications = true,
    showOfflineBanner: showBannerOption = true,
    showOfflineIndicator: showIndicatorOption = true,
    autoHideBannerDelay = 5000,
    syncInterval = 5 * 60 * 1000, // 5 minutes
  } = options
  
  // State
  const [state, setState] = useState<OfflineUIState>(DEFAULT_OFFLINE_UI_STATE)
  const stateRef = useRef(state)
  stateRef.current = state
  
  // Sync hook
  const {
    status: syncStatus,
    isOnline: syncIsOnline,
    isSyncing,
    lastSync,
    lastSuccessfulSync,
    sync,
    forceSync: hookForceSync
  } = useSync({
    autoSync: enableAutoSync,
    syncInterval,
    showNotifications: enableSyncNotifications
  })
  
  // Update state from sync hook
  useEffect(() => {
    setState(prev => ({
      ...prev,
      syncStatus,
      isSyncing,
      lastSyncTime: lastSync,
      lastSuccessfulSyncTime: lastSuccessfulSync,
    }))
  }, [syncStatus, isSyncing, lastSync, lastSuccessfulSync])
  
  // Network status detection
  const updateNetworkStatus = useCallback((status: NetworkStatus) => {
    const isOnline = status === 'online'
    const wasOnline = stateRef.current.isOnline
    
    setState(prev => ({
      ...prev,
      isOnline,
      networkStatus: status,
      isTransitioning: false,
    }))
    
    // Notify state change
    uiStateManager.notify('networkStatusChange', { status, isOnline })
    
    // Show/hide offline banner based on network status
    if (showBannerOption) {
      if (!isOnline && wasOnline) {
        // Just went offline
        const message = OfflineMessages.offline()
        setState(prev => ({
          ...prev,
          offlineBannerVisible: true,
          activeMessage: message,
          messages: [...prev.messages, message],
        }))
        
        if (enableSyncNotifications) {
          toast.warning('You are now offline. Working in offline mode.')
        }
      } else if (isOnline && !wasOnline) {
        // Just came back online
        const message = OfflineMessages.online()
        setState(prev => ({
          ...prev,
          offlineBannerVisible: true,
          activeMessage: message,
          messages: [...prev.messages, message],
        }))
        
        if (enableSyncNotifications) {
          toast.success('You are back online. Syncing your data.')
        }
        
        // Auto-hide banner after delay
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            offlineBannerVisible: false,
          }))
        }, autoHideBannerDelay)
        
        // Start sync when coming back online
        if (enableAutoSync) {
          sync()
        }
      }
    }
    
    // Update offline indicator visibility
    if (showIndicatorOption) {
      setState(prev => ({
        ...prev,
        offlineIndicatorVisible: !isOnline,
      }))
    }
  }, [showBannerOption, showIndicatorOption, enableSyncNotifications, enableAutoSync, autoHideBannerDelay, sync])
  
  // Debounced network status update to prevent flickering
  const debouncedNetworkStatusUpdate = useCallback(
    debounce(updateNetworkStatus, 500),
    [updateNetworkStatus]
  )
  
  // Initialize network status
  useEffect(() => {
    const initialStatus = getNetworkStatus()
    updateNetworkStatus(initialStatus)
    
    const handleOnline = () => {
      setState(prev => ({ ...prev, isTransitioning: true }))
      debouncedNetworkStatusUpdate('online')
    }
    
    const handleOffline = () => {
      setState(prev => ({ ...prev, isTransitioning: true }))
      debouncedNetworkStatusUpdate('offline')
    }
    
    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Custom event for more granular network status changes
    const handleNetworkStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ status: NetworkStatus }>
      setState(prev => ({ ...prev, isTransitioning: true }))
      debouncedNetworkStatusUpdate(customEvent.detail.status)
    }
    
    window.addEventListener('networkStatusChange', handleNetworkStatusChange)
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('networkStatusChange', handleNetworkStatusChange)
    }
  }, [debouncedNetworkStatusUpdate])
  
  // Actions
  const checkNetworkStatus = useCallback((): NetworkStatus => {
    const status = getNetworkStatus()
    updateNetworkStatus(status)
    return status
  }, [updateNetworkStatus])
  
  const retryConnection = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isTransitioning: true }))
    
    try {
      // Simulate a connection check
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const status = getNetworkStatus()
      updateNetworkStatus(status)
      
      if (status === 'online' && enableSyncNotifications) {
        toast.success('Connection restored!')
      }
    } catch (error) {
      setState(prev => ({ ...prev, isTransitioning: false }))
      
      if (enableSyncNotifications) {
        toast.error('Failed to restore connection. Please try again.')
      }
    }
  }, [updateNetworkStatus, enableSyncNotifications])
  
  const startSync = useCallback(async (): Promise<void> => {
    try {
      await sync()
    } catch (error) {
      if (enableSyncNotifications) {
        toast.error('Sync failed. Please try again.')
      }
    }
  }, [sync, enableSyncNotifications])
  
  const forceSyncHandler = useCallback(async (): Promise<void> => {
    try {
      await hookForceSync()
    } catch (error) {
      if (enableSyncNotifications) {
        toast.error('Force sync failed. Please try again.')
      }
    }
  }, [hookForceSync, enableSyncNotifications])
  
  const showOfflineBanner = useCallback((message?: OfflineMessage): void => {
    const bannerMessage = message || OfflineMessages.offline()
    
    setState(prev => ({
      ...prev,
      offlineBannerVisible: true,
      activeMessage: bannerMessage,
      messages: message ? [...prev.messages, message] : prev.messages,
    }))
  }, [])
  
  const hideOfflineBanner = useCallback((): void => {
    setState(prev => ({
      ...prev,
      offlineBannerVisible: false,
    }))
  }, [])
  
  const showOfflineIndicator = useCallback((): void => {
    setState(prev => ({
      ...prev,
      offlineIndicatorVisible: true,
    }))
  }, [])
  
  const hideOfflineIndicator = useCallback((): void => {
    setState(prev => ({
      ...prev,
      offlineIndicatorVisible: false,
    }))
  }, [])
  
  const toggleSyncNotifications = useCallback((enabled: boolean): void => {
    setState(prev => ({
      ...prev,
      syncNotificationsEnabled: enabled,
    }))
  }, [])
  
  const toggleAutoSync = useCallback((enabled: boolean): void => {
    setState(prev => ({
      ...prev,
      autoSyncEnabled: enabled,
    }))
  }, [])
  
  const addMessage = useCallback((message: OfflineMessage): void => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }))
  }, [])
  
  const removeMessage = useCallback((id: string): void => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.filter(msg => msg.id !== id),
      activeMessage: prev.activeMessage?.id === id ? null : prev.activeMessage,
    }))
  }, [])
  
  const clearMessages = useCallback((): void => {
    setState(prev => ({
      ...prev,
      messages: [],
      activeMessage: null,
    }))
  }, [])
  
  const setActiveMessage = useCallback((message: OfflineMessage | null): void => {
    setState(prev => ({
      ...prev,
      activeMessage: message,
    }))
  }, [])
  
  const subscribe = useCallback((key: string, callback: (data: any) => void): () => void => {
    return uiStateManager.subscribe(key, callback)
  }, [])
  
  const notify = useCallback((key: string, data?: any): void => {
    uiStateManager.notify(key, data)
  }, [])
  
  return {
    ...state,
    checkNetworkStatus,
    retryConnection,
    startSync,
    forceSync: forceSyncHandler,
    showOfflineBanner,
    hideOfflineBanner,
    showOfflineIndicator,
    hideOfflineIndicator,
    toggleSyncNotifications,
    toggleAutoSync,
    addMessage,
    removeMessage,
    clearMessages,
    setActiveMessage,
    subscribe,
    notify,
  }
}

// Hook for network status only
export function useNetworkStatus(): {
  isOnline: boolean
  networkStatus: NetworkStatus
  isTransitioning: boolean
  checkNetworkStatus: () => NetworkStatus
  retryConnection: () => Promise<void>
  subscribe: (key: string, callback: (data: any) => void) => () => void
} {
  const { 
    isOnline, 
    networkStatus, 
    isTransitioning, 
    checkNetworkStatus, 
    retryConnection,
    subscribe 
  } = useOfflineUI()
  
  return {
    isOnline,
    networkStatus,
    isTransitioning,
    checkNetworkStatus,
    retryConnection,
    subscribe,
  }
}

// Hook for sync status only
export function useSyncUI(): {
  syncStatus: SyncStatusType
  isSyncing: boolean
  lastSyncTime: Date | null
  lastSuccessfulSyncTime: Date | null
  startSync: () => Promise<void>
  forceSync: () => Promise<void>
  subscribe: (key: string, callback: (data: any) => void) => () => void
} {
  const { 
    syncStatus, 
    isSyncing, 
    lastSyncTime, 
    lastSuccessfulSyncTime, 
    startSync, 
    forceSync,
    subscribe 
  } = useOfflineUI()
  
  return {
    syncStatus,
    isSyncing,
    lastSyncTime,
    lastSuccessfulSyncTime,
    startSync,
    forceSync,
    subscribe,
  }
}

// Hook for offline messages only
export function useOfflineMessages(): {
  messages: OfflineMessage[]
  activeMessage: OfflineMessage | null
  addMessage: (message: OfflineMessage) => void
  removeMessage: (id: string) => void
  clearMessages: () => void
  setActiveMessage: (message: OfflineMessage | null) => void
  subscribe: (key: string, callback: (data: any) => void) => () => void
} {
  const { 
    messages, 
    activeMessage, 
    addMessage, 
    removeMessage, 
    clearMessages, 
    setActiveMessage,
    subscribe 
  } = useOfflineUI()
  
  return {
    messages,
    activeMessage,
    addMessage,
    removeMessage,
    clearMessages,
    setActiveMessage,
    subscribe,
  }
}