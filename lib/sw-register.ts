/**
 * Service Worker Registration
 * 
 * This module handles the registration and lifecycle management of the service worker.
 * It provides functions to register, unregister, and update the service worker,
 * as well as handle communication between the service worker and the app.
 */

export interface ServiceWorkerConfig {
  scope?: string;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export interface ServiceWorkerMessage {
  type: string;
  payload?: any;
}

const isServiceWorkerSupported = 'serviceWorker' in navigator;

/**
 * Register the service worker
 */
export async function registerServiceWorker(
  swUrl: string = '/service-worker.js',
  config: ServiceWorkerConfig = {}
): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported) {
    console.warn('Service workers are not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: config.scope || '/'
    });

    console.log('Service worker registered successfully:', registration);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Check for updates every hour

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      
      if (installingWorker) {
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, notify the user
            if (config.onUpdate) {
              config.onUpdate(registration);
            }
          } else if (installingWorker.state === 'installed') {
            // Content is cached for offline use
            if (config.onSuccess) {
              config.onSuccess(registration);
            }
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Error during service worker registration:', error);
    if (config.onError) {
      config.onError(error as Error);
    }
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported) {
    console.warn('Service workers are not supported in this browser.');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (registration) {
      await registration.unregister();
      console.log('Service worker unregistered successfully.');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error during service worker unregistration:', error);
    return false;
  }
}

/**
 * Check if there's a waiting service worker (new version available)
 */
export async function checkForUpdate(): Promise<boolean> {
  if (!isServiceWorkerSupported) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration && registration.waiting) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for service worker update:', error);
    return false;
  }
}

/**
 * Skip waiting and activate the new service worker
 */
export async function skipWaiting(): Promise<void> {
  if (!isServiceWorkerSupported) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration && registration.waiting) {
      // Send a message to the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  } catch (error) {
    console.error('Error skipping waiting service worker:', error);
  }
}

/**
 * Send a message to the service worker
 */
export async function sendMessageToSW(message: ServiceWorkerMessage): Promise<any> {
  if (!isServiceWorkerSupported) {
    throw new Error('Service workers are not supported in this browser.');
  }

  try {
    // Create a message channel for communication
    const messageChannel = new MessageChannel();
    
    // Wait for the service worker to be ready
    const registration = await navigator.serviceWorker.ready;
    
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
 * Cache new data
 */
export async function cacheNewData(url: string, data: any): Promise<void> {
  await sendMessageToSW({
    type: 'CACHE_NEW_DATA',
    payload: { url, data }
  });
}

/**
 * Clear cache
 */
export async function clearCache(cacheName?: string): Promise<void> {
  await sendMessageToSW({
    type: 'CLEAR_CACHE',
    payload: { cacheName }
  });
}

/**
 * Trigger manual sync
 */
export async function syncNow(dataType: string = 'all'): Promise<void> {
  await sendMessageToSW({
    type: 'SYNC_NOW',
    payload: { dataType }
  });
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<any> {
  return await sendMessageToSW({
    type: 'GET_CACHE_STATS'
  });
}

/**
 * Register for push notifications
 */
export async function registerForPushNotifications(): Promise<PushSubscription | null> {
  if (!isServiceWorkerSupported) {
    console.warn('Service workers are not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if the user has already granted permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.warn('Push notification permission denied.');
      return null;
    }
    
    // Subscribe to push notifications
    const applicationServerKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      ? urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
      : undefined;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // Type assertion to handle the type compatibility issue
      applicationServerKey: applicationServerKey as any
    });
    
    console.log('Push notification subscription successful:', subscription);
    
    // Send the subscription to the server
    await sendSubscriptionToServer(subscription);
    
    return subscription;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Unregister from push notifications
 */
export async function unregisterFromPushNotifications(): Promise<boolean> {
  if (!isServiceWorkerSupported) {
    console.warn('Service workers are not supported in this browser.');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Push notification unsubscription successful.');
      
      // Notify the server to remove the subscription
      await removeSubscriptionFromServer(subscription);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error unregistering from push notifications:', error);
    return false;
  }
}

/**
 * Send subscription to server
 */
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }
    
    console.log('Push subscription sent to server successfully.');
  } catch (error) {
    console.error('Error sending push subscription to server:', error);
    throw error;
  }
}

/**
 * Remove subscription from server
 */
async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }
    
    console.log('Push subscription removed from server successfully.');
  } catch (error) {
    console.error('Error removing push subscription from server:', error);
    throw error;
  }
}

/**
 * Convert URL base64 to Uint8Array
 * This is needed for the applicationServerKey in pushManager.subscribe
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  // Type assertion to handle the type compatibility issue
  return outputArray as unknown as Uint8Array;
}

/**
 * Check if the app is installed (PWA)
 */
export function isAppInstalled(): boolean {
  // Check if the app is running in standalone mode (PWA)
  return window.matchMedia('(display-mode: standalone)').matches ||
         // @ts-ignore - For iOS
         window.navigator.standalone === true;
}

/**
 * Check if the app is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Set up online/offline event listeners
 */
export function setupNetworkListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  const handleOnline = () => {
    console.log('App is online');
    onOnline();
  };
  
  const handleOffline = () => {
    console.log('App is offline');
    onOffline();
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Default service worker configuration
 */
export const defaultServiceWorkerConfig: ServiceWorkerConfig = {
  onUpdate: (registration) => {
    console.log('New content is available; please refresh.');
    // You could show a notification to the user here
  },
  onSuccess: (registration) => {
    console.log('Content is cached for offline use.');
  },
  onError: (error) => {
    console.error('Error during service worker registration:', error);
  }
};