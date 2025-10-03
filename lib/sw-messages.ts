/**
 * Service Worker Messages
 * 
 * This module handles message passing between the service worker and the app.
 * It provides event handlers for sync status updates, push notifications,
 * and offline/online status communication.
 */

import { isOnline } from './supabase';

export interface ServiceWorkerMessage {
  type: string;
  payload?: any;
}

export interface SyncStatusMessage extends ServiceWorkerMessage {
  type: 'SYNC_STATUS' | 'SYNC_STARTED' | 'SYNC_COMPLETED' | 'SYNC_ERROR';
  payload: {
    dataType?: string;
    status?: 'pending' | 'in-progress' | 'completed' | 'error';
    progress?: number;
    total?: number;
    processed?: number;
    successful?: number;
    failed?: number;
    error?: string;
  };
}

export interface PushNotificationMessage extends ServiceWorkerMessage {
  type: 'PUSH_NOTIFICATION_RECEIVED' | 'PUSH_NOTIFICATION_CLICKED' | 'PUSH_NOTIFICATION_CLOSED';
  payload: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    data?: any;
    action?: string;
  };
}

export interface NetworkStatusMessage extends ServiceWorkerMessage {
  type: 'NETWORK_STATUS_CHANGED';
  payload: {
    isOnline: boolean;
  };
}

export interface CacheStatsMessage extends ServiceWorkerMessage {
  type: 'CACHE_STATS';
  payload: {
    [key: string]: {
      count: number;
      size: number;
    };
  };
}

export interface UpdateAvailableMessage extends ServiceWorkerMessage {
  type: 'UPDATE_AVAILABLE';
  payload: {
    registration: ServiceWorkerRegistration;
  };
}

export type SWMessage = 
  | SyncStatusMessage 
  | PushNotificationMessage 
  | NetworkStatusMessage 
  | CacheStatsMessage 
  | UpdateAvailableMessage
  | ServiceWorkerMessage;

/**
 * Service Worker Message Handler
 * 
 * This class handles communication between the service worker and the app.
 */
export class ServiceWorkerMessageHandler {
  private messageListeners: Map<string, Function[]> = new Map();
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    // Initialize online status
    this.setupNetworkListeners();
    
    // Set up service worker message listener
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
    }
  }

  /**
   * Set up network event listeners
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      this.isOnline = true;
      this.notifyNetworkStatusChanged(true);
    };

    const handleOffline = () => {
      this.isOnline = false;
      this.notifyNetworkStatusChanged(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  /**
   * Handle messages from the service worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const message = event.data as SWMessage;
    
    if (!message || !message.type) {
      return;
    }

    console.log('Message received from service worker:', message);

    // Notify all listeners for this message type
    const listeners = this.messageListeners.get(message.type) || [];
    listeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in service worker message listener:', error);
      }
    });
  }

  /**
   * Notify listeners about network status changes
   */
  private notifyNetworkStatusChanged(isOnline: boolean): void {
    const message: NetworkStatusMessage = {
      type: 'NETWORK_STATUS_CHANGED',
      payload: { isOnline }
    };

    const listeners = this.messageListeners.get(message.type) || [];
    listeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  /**
   * Add a message listener
   */
  addMessageListener(type: string, callback: (message: SWMessage) => void): void {
    if (!this.messageListeners.has(type)) {
      this.messageListeners.set(type, []);
    }
    
    this.messageListeners.get(type)!.push(callback);
  }

  /**
   * Remove a message listener
   */
  removeMessageListener(type: string, callback: (message: SWMessage) => void): void {
    const listeners = this.messageListeners.get(type);
    
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Send a message to the service worker
   */
  async sendMessageToServiceWorker(message: ServiceWorkerMessage): Promise<any> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported in this browser.');
    }

    try {
      // Create a message channel for communication
      const messageChannel = new MessageChannel();
      
      // Wait for the service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      this.registration = registration;
      
      // Send the message to the service worker
      registration.active?.postMessage(message, [messageChannel.port2]);
      
      // Return a promise that resolves with the response from the service worker
      return new Promise((resolve, reject) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data && event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data);
          }
        };
        
        // Set a timeout in case the service worker doesn't respond
        setTimeout(() => {
          reject(new Error('Service worker did not respond in time.'));
        }, 5000);
      });
    } catch (error) {
      console.error('Error sending message to service worker:', error);
      throw error;
    }
  }

  /**
   * Get the current online status
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Get the service worker registration
   */
  getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Set up sync status listeners
   */
  setupSyncStatusListeners(
    onSyncStarted?: (dataType?: string) => void,
    onSyncCompleted?: (result: { dataType?: string; successful: number; failed: number }) => void,
    onSyncError?: (error: { dataType?: string; error: string }) => void
  ): () => void {
    const handleSyncStarted = (message: SyncStatusMessage) => {
      if (message.type === 'SYNC_STARTED' && onSyncStarted) {
        onSyncStarted(message.payload.dataType);
      }
    };

    const handleSyncCompleted = (message: SyncStatusMessage) => {
      if (message.type === 'SYNC_COMPLETED' && onSyncCompleted) {
        onSyncCompleted({
          dataType: message.payload.dataType,
          successful: message.payload.successful || 0,
          failed: message.payload.failed || 0
        });
      }
    };

    const handleSyncError = (message: SyncStatusMessage) => {
      if (message.type === 'SYNC_ERROR' && onSyncError) {
        onSyncError({
          dataType: message.payload.dataType,
          error: message.payload.error || 'Unknown error'
        });
      }
    };

    this.addMessageListener('SYNC_STARTED', handleSyncStarted as (message: SWMessage) => void);
    this.addMessageListener('SYNC_COMPLETED', handleSyncCompleted as (message: SWMessage) => void);
    this.addMessageListener('SYNC_ERROR', handleSyncError as (message: SWMessage) => void);

    // Return cleanup function
    return () => {
      this.removeMessageListener('SYNC_STARTED', handleSyncStarted as (message: SWMessage) => void);
      this.removeMessageListener('SYNC_COMPLETED', handleSyncCompleted as (message: SWMessage) => void);
      this.removeMessageListener('SYNC_ERROR', handleSyncError as (message: SWMessage) => void);
    };
  }

  /**
   * Set up push notification listeners
   */
  setupPushNotificationListeners(
    onNotificationReceived?: (notification: { title?: string; body?: string; icon?: string; data?: any }) => void,
    onNotificationClicked?: (action?: string, data?: any) => void,
    onNotificationClosed?: () => void
  ): () => void {
    const handleNotificationReceived = (message: PushNotificationMessage) => {
      if (message.type === 'PUSH_NOTIFICATION_RECEIVED' && onNotificationReceived) {
        onNotificationReceived({
          title: message.payload.title,
          body: message.payload.body,
          icon: message.payload.icon,
          data: message.payload.data
        });
      }
    };

    const handleNotificationClicked = (message: PushNotificationMessage) => {
      if (message.type === 'PUSH_NOTIFICATION_CLICKED' && onNotificationClicked) {
        onNotificationClicked(message.payload.action, message.payload.data);
      }
    };

    const handleNotificationClosed = (message: PushNotificationMessage) => {
      if (message.type === 'PUSH_NOTIFICATION_CLOSED' && onNotificationClosed) {
        onNotificationClosed();
      }
    };

    this.addMessageListener('PUSH_NOTIFICATION_RECEIVED', handleNotificationReceived as (message: SWMessage) => void);
    this.addMessageListener('PUSH_NOTIFICATION_CLICKED', handleNotificationClicked as (message: SWMessage) => void);
    this.addMessageListener('PUSH_NOTIFICATION_CLOSED', handleNotificationClosed as (message: SWMessage) => void);

    // Return cleanup function
    return () => {
      this.removeMessageListener('PUSH_NOTIFICATION_RECEIVED', handleNotificationReceived as (message: SWMessage) => void);
      this.removeMessageListener('PUSH_NOTIFICATION_CLICKED', handleNotificationClicked as (message: SWMessage) => void);
      this.removeMessageListener('PUSH_NOTIFICATION_CLOSED', handleNotificationClosed as (message: SWMessage) => void);
    };
  }

  /**
   * Set up network status listeners
   */
  setupNetworkStatusListeners(
    onOnline?: () => void,
    onOffline?: () => void
  ): () => void {
    const handleNetworkStatusChanged = (message: NetworkStatusMessage) => {
      if (message.payload.isOnline && onOnline) {
        onOnline();
      } else if (!message.payload.isOnline && onOffline) {
        onOffline();
      }
    };

    this.addMessageListener('NETWORK_STATUS_CHANGED', handleNetworkStatusChanged as (message: SWMessage) => void);

    // Return cleanup function
    return () => {
      this.removeMessageListener('NETWORK_STATUS_CHANGED', handleNetworkStatusChanged as (message: SWMessage) => void);
    };
  }

  /**
   * Set up update available listeners
   */
  setupUpdateAvailableListener(
    onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void
  ): () => void {
    const handleUpdateAvailable = (message: UpdateAvailableMessage) => {
      if (onUpdateAvailable) {
        onUpdateAvailable(message.payload.registration);
      }
    };

    this.addMessageListener('UPDATE_AVAILABLE', handleUpdateAvailable as (message: SWMessage) => void);

    // Return cleanup function
    return () => {
      this.removeMessageListener('UPDATE_AVAILABLE', handleUpdateAvailable as (message: SWMessage) => void);
    };
  }

  /**
   * Request cache statistics from the service worker
   */
  async getCacheStats(): Promise<CacheStatsMessage['payload']> {
    const response = await this.sendMessageToServiceWorker({
      type: 'GET_CACHE_STATS'
    });

    return response.payload;
  }

  /**
   * Request manual sync from the service worker
   */
  async requestSync(dataType: string = 'all'): Promise<void> {
    await this.sendMessageToServiceWorker({
      type: 'SYNC_NOW',
      payload: { dataType }
    });
  }

  /**
   * Request cache cleanup from the service worker
   */
  async requestCacheCleanup(cacheName?: string): Promise<void> {
    await this.sendMessageToServiceWorker({
      type: 'CLEAR_CACHE',
      payload: { cacheName }
    });
  }

  /**
   * Request to cache new data
   */
  async requestCacheData(url: string, data: any): Promise<void> {
    await this.sendMessageToServiceWorker({
      type: 'CACHE_NEW_DATA',
      payload: { url, data }
    });
  }

  /**
   * Destroy the message handler and clean up listeners
   */
  destroy(): void {
    this.messageListeners.clear();
  }
}

// Create a singleton instance
export const swMessageHandler = new ServiceWorkerMessageHandler();