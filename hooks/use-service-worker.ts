/**
 * Service Worker Hook
 * 
 * This React hook provides functionality for working with service workers,
 * including registration status tracking, message handling, and offline/online state management.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { registerServiceWorker, unregisterServiceWorker, checkForUpdate, skipWaiting, isOnline, setupNetworkListeners } from '../lib/sw-register';
import { swMessageHandler, SWMessage, SyncStatusMessage, PushNotificationMessage, NetworkStatusMessage, CacheStatsMessage, UpdateAvailableMessage } from '../lib/sw-messages';

export interface UseServiceWorkerOptions {
  autoRegister?: boolean;
  swUrl?: string;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  cacheStats: CacheStatsMessage['payload'] | null;
  syncStatus: {
    isSyncing: boolean;
    dataType?: string;
    progress?: number;
    total?: number;
    processed?: number;
    successful?: number;
    failed?: number;
    error?: string;
  };
}

export function useServiceWorker(options: UseServiceWorkerOptions = {}): ServiceWorkerState {
  const {
    autoRegister = true,
    swUrl = '/service-worker.js',
    onUpdate,
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    updateAvailable: false,
    registration: null,
    cacheStats: null,
    syncStatus: {
      isSyncing: false
    }
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Initialize service worker
  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator;
    
    setState(prev => ({
      ...prev,
      isSupported
    }));

    if (isSupported && autoRegister) {
      registerServiceWorker(swUrl, {
        onUpdate: (registration) => {
          setState(prev => ({
            ...prev,
            updateAvailable: true,
            registration
          }));
          
          if (onUpdate) {
            onUpdate(registration);
          }
        },
        onSuccess: (registration) => {
          setState(prev => ({
            ...prev,
            isRegistered: true,
            registration
          }));
          
          if (onSuccess) {
            onSuccess(registration);
          }
        },
        onError: (error) => {
          console.error('Service worker registration error:', error);
          
          if (onError) {
            onError(error);
          }
        }
      }).then(registration => {
        if (registration) {
          setState(prev => ({
            ...prev,
            isRegistered: true,
            registration
          }));
        }
      });
    }

    // Set up network listeners
    const cleanupNetworkListeners = setupNetworkListeners(
      () => {
        setState(prev => ({
          ...prev,
          isOnline: true
        }));
      },
      () => {
        setState(prev => ({
          ...prev,
          isOnline: false
        }));
      }
    );

    // Set up message listeners
    const cleanupSyncListeners = swMessageHandler.setupSyncStatusListeners(
      (dataType) => {
        setState(prev => ({
          ...prev,
          syncStatus: {
            ...prev.syncStatus,
            isSyncing: true,
            dataType,
            progress: 0,
            processed: 0,
            successful: 0,
            failed: 0,
            error: undefined
          }
        }));
      },
      (result) => {
        setState(prev => ({
          ...prev,
          syncStatus: {
            ...prev.syncStatus,
            isSyncing: false,
            successful: result.successful,
            failed: result.failed,
            progress: 100
          }
        }));
      },
      (error) => {
        setState(prev => ({
          ...prev,
          syncStatus: {
            ...prev.syncStatus,
            isSyncing: false,
            error: error.error
          }
        }));
      }
    );

    const cleanupPushListeners = swMessageHandler.setupPushNotificationListeners(
      (notification) => {
        console.log('Push notification received:', notification);
        // You could show a toast notification here
      },
      (action, data) => {
        console.log('Push notification clicked:', action, data);
        // Handle notification click action
      },
      () => {
        console.log('Push notification closed');
      }
    );

    const cleanupNetworkStatusListeners = swMessageHandler.setupNetworkStatusListeners(
      () => {
        setState(prev => ({
          ...prev,
          isOnline: true
        }));
      },
      () => {
        setState(prev => ({
          ...prev,
          isOnline: false
        }));
      }
    );

    const cleanupUpdateListener = swMessageHandler.setupUpdateAvailableListener(
      (registration) => {
        setState(prev => ({
          ...prev,
          updateAvailable: true,
          registration
        }));
      }
    );

    // Check for updates periodically
    const updateInterval = setInterval(async () => {
      if (stateRef.current.isRegistered) {
        const hasUpdate = await checkForUpdate();
        if (hasUpdate) {
          setState(prev => ({
            ...prev,
            updateAvailable: true
          }));
        }
      }
    }, 60 * 60 * 1000); // Check for updates every hour

    // Cleanup function
    return () => {
      cleanupNetworkListeners();
      cleanupSyncListeners();
      cleanupPushListeners();
      cleanupNetworkStatusListeners();
      cleanupUpdateListener();
      clearInterval(updateInterval);
    };
  }, [autoRegister, swUrl, onUpdate, onSuccess, onError]);

  // Function to manually register the service worker
  const register = useCallback(async () => {
    if (!state.isSupported) {
      throw new Error('Service workers are not supported in this browser.');
    }

    const registration = await registerServiceWorker(swUrl, {
      onUpdate: (registration) => {
        setState(prev => ({
          ...prev,
          updateAvailable: true,
          registration
        }));
        
        if (onUpdate) {
          onUpdate(registration);
        }
      },
      onSuccess: (registration) => {
        setState(prev => ({
          ...prev,
          isRegistered: true,
          registration
        }));
        
        if (onSuccess) {
          onSuccess(registration);
        }
      },
      onError: (error) => {
        console.error('Service worker registration error:', error);
        
        if (onError) {
          onError(error);
        }
      }
    });

    if (registration) {
      setState(prev => ({
        ...prev,
        isRegistered: true,
        registration
      }));
    }

    return registration;
  }, [state.isSupported, swUrl, onUpdate, onSuccess, onError]);

  // Function to unregister the service worker
  const unregister = useCallback(async () => {
    if (!state.isSupported || !state.isRegistered) {
      return false;
    }

    const success = await unregisterServiceWorker();
    
    if (success) {
      setState(prev => ({
        ...prev,
        isRegistered: false,
        registration: null,
        updateAvailable: false
      }));
    }

    return success;
  }, [state.isSupported, state.isRegistered]);

  // Function to apply update
  const applyUpdate = useCallback(async () => {
    if (!state.updateAvailable) {
      return false;
    }

    await skipWaiting();
    
    // Reload the page to activate the new service worker
    window.location.reload();
    
    return true;
  }, [state.updateAvailable]);

  // Function to get cache statistics
  const getCacheStats = useCallback(async () => {
    if (!state.isRegistered) {
      return null;
    }

    try {
      const cacheStats = await swMessageHandler.getCacheStats();
      setState(prev => ({
        ...prev,
        cacheStats
      }));
      
      return cacheStats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }, [state.isRegistered]);

  // Function to request manual sync
  const requestSync = useCallback(async (dataType: string = 'all') => {
    if (!state.isRegistered || !state.isOnline) {
      return false;
    }

    try {
      await swMessageHandler.requestSync(dataType);
      return true;
    } catch (error) {
      console.error('Error requesting sync:', error);
      return false;
    }
  }, [state.isRegistered, state.isOnline]);

  // Function to request cache cleanup
  const requestCacheCleanup = useCallback(async (cacheName?: string) => {
    if (!state.isRegistered) {
      return false;
    }

    try {
      await swMessageHandler.requestCacheCleanup(cacheName);
      
      // Refresh cache stats after cleanup
      await getCacheStats();
      
      return true;
    } catch (error) {
      console.error('Error requesting cache cleanup:', error);
      return false;
    }
  }, [state.isRegistered, getCacheStats]);

  // Function to request to cache new data
  const requestCacheData = useCallback(async (url: string, data: any) => {
    if (!state.isRegistered) {
      return false;
    }

    try {
      await swMessageHandler.requestCacheData(url, data);
      return true;
    } catch (error) {
      console.error('Error requesting to cache data:', error);
      return false;
    }
  }, [state.isRegistered]);

  // Function to add a custom message listener
  const addMessageListener = useCallback((type: string, callback: (message: SWMessage) => void) => {
    swMessageHandler.addMessageListener(type, callback);
  }, []);

  // Function to remove a custom message listener
  const removeMessageListener = useCallback((type: string, callback: (message: SWMessage) => void) => {
    swMessageHandler.removeMessageListener(type, callback);
  }, []);

  // Function to send a message to the service worker
  const sendMessage = useCallback(async (message: SWMessage) => {
    if (!state.isRegistered) {
      throw new Error('Service worker is not registered.');
    }

    return await swMessageHandler.sendMessageToServiceWorker(message);
  }, [state.isRegistered]);

  return {
    ...state,
    register,
    unregister,
    applyUpdate,
    getCacheStats,
    requestSync,
    requestCacheCleanup,
    requestCacheData,
    addMessageListener,
    removeMessageListener,
    sendMessage
  } as ServiceWorkerState & {
    register: () => Promise<ServiceWorkerRegistration | null>;
    unregister: () => Promise<boolean>;
    applyUpdate: () => Promise<boolean>;
    getCacheStats: () => Promise<CacheStatsMessage['payload'] | null>;
    requestSync: (dataType?: string) => Promise<boolean>;
    requestCacheCleanup: (cacheName?: string) => Promise<boolean>;
    requestCacheData: (url: string, data: any) => Promise<boolean>;
    addMessageListener: (type: string, callback: (message: SWMessage) => void) => void;
    removeMessageListener: (type: string, callback: (message: SWMessage) => void) => void;
    sendMessage: (message: SWMessage) => Promise<any>;
  };
}

export default useServiceWorker;