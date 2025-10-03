// Cache names with versioning for easy updates
const CACHE_NAMES = {
  static: 'attendance-system-static-v1',
  dynamic: 'attendance-system-dynamic-v1',
  api: 'attendance-system-api-v1',
  images: 'attendance-system-images-v1',
  runtime: 'attendance-system-runtime-v1'
};

const OFFLINE_URL = '/offline';
const FALLBACK_IMAGE_URL = '/placeholder-logo.png';

// Cache configuration optimized for DS223J hardware constraints
const CACHE_CONFIG = {
  static: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 50,
    strategy: 'cacheFirst'
  },
  dynamic: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    maxEntries: 100,
    strategy: 'networkFirst'
  },
  api: {
    maxAge: 2 * 60 * 1000, // 2 minutes
    maxEntries: 30,
    strategy: 'networkFirst'
  },
  images: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 200,
    strategy: 'cacheFirst'
  },
  runtime: {
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 20,
    strategy: 'staleWhileRevalidate'
  }
};

// Files to cache when the service worker is installed
const STATIC_CACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/placeholder-logo.png',
  '/placeholder-logo.svg',
  '/placeholder.jpg',
  '/placeholder-user.jpg'
];

// API routes that should use network-first strategy
const API_ROUTES = [
  '/api/attendance',
  '/api/users',
  '/api/auth',
  '/api/sync'
];

// Image routes that should use cache-first strategy
const IMAGE_ROUTES = [
  '/placeholder-logo.png',
  '/placeholder-logo.svg',
  '/placeholder.jpg',
  '/placeholder-user.jpg'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Static assets cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match our current cache names
            if (!Object.values(CACHE_NAMES).includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Helper function to determine cache strategy and config based on request
function getCacheStrategyAndConfig(request) {
  const url = new URL(request.url);
  
  // API routes - Network First with fallback to cache
  if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
    return {
      strategy: 'network-first',
      cacheName: CACHE_NAMES.api,
      config: CACHE_CONFIG.api
    };
  }
  
  // Image routes - Cache First with network fallback
  if (IMAGE_ROUTES.some(route => url.pathname.includes(route)) ||
      request.destination === 'image') {
    return {
      strategy: 'cache-first',
      cacheName: CACHE_NAMES.images,
      config: CACHE_CONFIG.images
    };
  }
  
  // Static assets - Cache First
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'manifest') {
    return {
      strategy: 'cache-first',
      cacheName: CACHE_NAMES.static,
      config: CACHE_CONFIG.static
    };
  }
  
  // HTML pages - Stale While Revalidate
  if (request.destination === 'document' || request.mode === 'navigate') {
    return {
      strategy: 'stale-while-revalidate',
      cacheName: CACHE_NAMES.dynamic,
      config: CACHE_CONFIG.dynamic
    };
  }
  
  // Runtime data - Stale While Revalidate
  if (url.pathname.includes('/runtime/') ||
      url.pathname.includes('/实时/') ||
      url.pathname.includes('/realtime/')) {
    return {
      strategy: 'stale-while-revalidate',
      cacheName: CACHE_NAMES.runtime,
      config: CACHE_CONFIG.runtime
    };
  }
  
  // Default - Network First
  return {
    strategy: 'network-first',
    cacheName: CACHE_NAMES.dynamic,
    config: CACHE_CONFIG.dynamic
  };
}

// Cache First strategy - try cache first, then network
async function cacheFirstStrategy(request, cacheName, config) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Check if cache is still valid
      if (isCacheValid(cachedResponse, config.maxAge)) {
        // Update cache in background
        fetchAndUpdateCache(request, cacheName);
        return cachedResponse;
      }
      // Cache is stale, fetch from network
      return fetchAndUpdateCache(request, cacheName);
    }
    
    // No cache hit, fetch from network
    return fetchAndUpdateCache(request, cacheName);
  } catch (error) {
    console.error('Cache First strategy failed:', error);
    
    // For images, return fallback image
    if (request.destination === 'image') {
      return caches.match(FALLBACK_IMAGE_URL);
    }
    
    throw error;
  }
}

// Network First strategy - try network first, then cache
async function networkFirstStrategy(request, cacheName, config) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      // Clean up old entries if cache is too large
      cleanupCache(cacheName, config.maxEntries);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network request failed, trying cache:', error);
    
    // Try to get from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // For navigation requests, return offline page
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    
    throw error;
  }
}

// Stale While Revalidate strategy - return cached response immediately, then update cache
async function staleWhileRevalidateStrategy(request, cacheName, config) {
  const cachedResponse = await caches.match(request);
  
  // Fetch from network in background
  const fetchPromise = fetch(request)
    .then(async networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
        // Clean up old entries if cache is too large
        cleanupCache(cacheName, config.maxEntries);
      }
      return networkResponse;
    })
    .catch(error => {
      console.error('Background fetch failed:', error);
      // If background fetch fails, we still have the cached response
    });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network response
  return fetchPromise;
}

// Fetch and update cache in background (for Cache First strategy)
async function fetchAndUpdateCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Background cache update failed:', error);
    throw error;
  }
}

// Check if cache is still valid based on max age
function isCacheValid(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;
  
  const responseDate = new Date(dateHeader);
  const now = new Date();
  return (now - responseDate) < maxAge;
}

// Clean up old cache entries if cache is too large
function cleanupCache(cacheName, maxEntries) {
  caches.open(cacheName)
    .then(cache => {
      cache.keys()
        .then(keys => {
          if (keys.length > maxEntries) {
            // Sort by date (oldest first)
            keys.sort((a, b) => {
              const aDate = a.headers.get('date') || 0;
              const bDate = b.headers.get('date') || 0;
              return new Date(aDate) - new Date(bDate);
            });
            
            // Delete oldest entries
            const keysToDelete = keys.slice(0, keys.length - maxEntries);
            return Promise.all(
              keysToDelete.map(key => cache.delete(key))
            );
          }
        });
    });
}

// Main fetch event handler
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Determine cache strategy and cache name
  const { strategy, cacheName, config } = getCacheStrategyAndConfig(event.request);
  
  event.respondWith(
    (async () => {
      try {
        switch (strategy) {
          case 'cache-first':
            return await cacheFirstStrategy(event.request, cacheName, config);
          case 'network-first':
            return await networkFirstStrategy(event.request, cacheName, config);
          case 'stale-while-revalidate':
            return await staleWhileRevalidateStrategy(event.request, cacheName, config);
          default:
            return await networkFirstStrategy(event.request, cacheName, config);
        }
      } catch (error) {
        console.error('All strategies failed for request:', event.request.url, error);
        
        // Final fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        
        // For other requests, just throw the error
        throw error;
      }
    })()
  );
});

// Handle background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendanceData());
  }
  
  if (event.tag === 'sync-users') {
    event.waitUntil(syncUsersData());
  }
  
  if (event.tag === 'sync-settings') {
    event.waitUntil(syncSettingsData());
  }
});

// Function to sync attendance data when online
async function syncAttendanceData() {
  try {
    console.log('Syncing attendance data...');
    
    // Get all pending sync items from IndexedDB
    const pendingItems = await getPendingSyncItems('attendance');
    
    if (pendingItems.length === 0) {
      console.log('No pending attendance data to sync');
      return Promise.resolve('No data to sync');
    }
    
    // Send each item to the server
    const results = await Promise.allSettled(
      pendingItems.map(item => sendToServer('/api/attendance', item))
    );
    
    // Process results
    const successful = [];
    const failed = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(pendingItems[index]);
      } else {
        console.error('Failed to sync attendance item:', result.reason);
        failed.push({...pendingItems[index], error: result.reason.message});
      }
    });
    
    // Remove successfully synced items from IndexedDB
    if (successful.length > 0) {
      await removeSyncItems('attendance', successful.map(item => item.id));
      console.log(`Successfully synced ${successful.length} attendance records`);
    }
    
    // Update failed items with retry count
    if (failed.length > 0) {
      await updateFailedSyncItems('attendance', failed);
      console.log(`Failed to sync ${failed.length} attendance records`);
    }
    
    // Notify clients about sync completion
    notifyClients({
      type: 'SYNC_COMPLETED',
      payload: {
        dataType: 'attendance',
        successful: successful.length,
        failed: failed.length
      }
    });
    
    return Promise.resolve(`Sync completed: ${successful.length} successful, ${failed.length} failed`);
  } catch (error) {
    console.error('Error syncing attendance data:', error);
    throw error;
  }
}

// Function to sync users data when online
async function syncUsersData() {
  try {
    console.log('Syncing users data...');
    
    // Similar implementation to syncAttendanceData but for users
    // This is a placeholder implementation
    console.log('Users data sync completed');
    return Promise.resolve('Users data sync completed');
  } catch (error) {
    console.error('Error syncing users data:', error);
    throw error;
  }
}

// Function to sync settings data when online
async function syncSettingsData() {
  try {
    console.log('Syncing settings data...');
    
    // Similar implementation to syncAttendanceData but for settings
    // This is a placeholder implementation
    console.log('Settings data sync completed');
    return Promise.resolve('Settings data sync completed');
  } catch (error) {
    console.error('Error syncing settings data:', error);
    throw error;
  }
}

// Helper functions for IndexedDB operations
async function getPendingSyncItems(dataType) {
  // This would be implemented with IndexedDB operations
  // For now, return an empty array as a placeholder
  return [];
}

async function sendToServer(endpoint, data) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`Server responded with status ${response.status}`);
  }
  
  return response.json();
}

async function removeSyncItems(dataType, itemIds) {
  // This would be implemented with IndexedDB operations
  // For now, it's a placeholder
  console.log(`Removed ${itemIds.length} ${dataType} items from sync queue`);
}

async function updateFailedSyncItems(dataType, failedItems) {
  // This would be implemented with IndexedDB operations
  // For now, it's a placeholder
  console.log(`Updated ${failedItems.length} failed ${dataType} items`);
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification',
      icon: data.icon || '/placeholder-logo.png',
      badge: data.badge || '/placeholder-logo.png',
      vibrate: data.vibrate || [100, 50, 100],
      data: data.data || {},
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Attendance System', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action) {
    // Handle specific action buttons
    console.log('Action button clicked:', event.action);
    
    // Navigate to specific URL based on action
    if (event.action === 'view-attendance') {
      event.waitUntil(
        clients.openWindow('/attendance')
      );
    } else if (event.action === 'view-profile') {
      event.waitUntil(
        clients.openWindow('/profile')
      );
    }
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Message received from main thread:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'CACHE_NEW_DATA':
        cacheNewData(event.data.payload);
        break;
      case 'CLEAR_CACHE':
        clearCache(event.data.payload);
        break;
      case 'SYNC_NOW':
        syncNow(event.data.payload);
        break;
      case 'GET_CACHE_STATS':
        getCacheStats().then(stats => {
          event.ports[0].postMessage({ type: 'CACHE_STATS', payload: stats });
        });
        break;
    }
  }
});

// Cache new data
async function cacheNewData(payload) {
  console.log('Caching new data:', payload);
  
  try {
    const { url, data } = payload;
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const cache = await caches.open(CACHE_NAMES.api);
    await cache.put(url, response);
    
    console.log('Data cached successfully');
  } catch (error) {
    console.error('Failed to cache new data:', error);
  }
}

// Clear cache
async function clearCache(payload) {
  console.log('Clearing cache:', payload);
  
  try {
    const { cacheName } = payload;
    
    if (cacheName && CACHE_NAMES[cacheName]) {
      await caches.delete(CACHE_NAMES[cacheName]);
      console.log(`Cache ${cacheName} cleared successfully`);
    } else if (!cacheName) {
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
      console.log('All caches cleared successfully');
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

// Sync now
async function syncNow(payload) {
  console.log('Manual sync triggered:', payload);
  
  try {
    const { dataType } = payload;
    
    switch (dataType) {
      case 'attendance':
        await syncAttendanceData();
        break;
      case 'users':
        await syncUsersData();
        break;
      case 'settings':
        await syncSettingsData();
        break;
      case 'all':
        await Promise.all([
          syncAttendanceData(),
          syncUsersData(),
          syncSettingsData()
        ]);
        break;
    }
    
    console.log('Manual sync completed');
  } catch (error) {
    console.error('Manual sync failed:', error);
  }
}

// Get cache statistics
async function getCacheStats() {
  console.log('Getting cache statistics');
  
  try {
    const stats = {};
    
    for (const [name, cacheName] of Object.entries(CACHE_NAMES)) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      stats[name] = {
        count: requests.length,
        size: await calculateCacheSize(requests)
      };
    }
    
    return stats;
  } catch (error) {
    console.error('Failed to get cache statistics:', error);
    return {};
  }
}

// Calculate cache size
async function calculateCacheSize(requests) {
  let size = 0;
  
  for (const request of requests) {
    const response = await caches.match(request);
    if (response) {
      const blob = await response.blob();
      size += blob.size;
    }
  }
  
  return size;
}

// Notify all clients
function notifyClients(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message);
    });
  });
}

// Periodic cache cleanup (run once a day)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync triggered:', event.tag);
  
  if (event.tag === 'cleanup-cache') {
    event.waitUntil(cleanupOldCache());
  }
});

// Clean up old cache entries
async function cleanupOldCache() {
  console.log('Running cache cleanup');
  
  try {
    const cacheNames = Object.values(CACHE_NAMES);
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      // Remove entries older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const dateHeader = response.headers.get('date');
          if (dateHeader) {
            const responseDate = new Date(dateHeader);
            if (responseDate < thirtyDaysAgo) {
              await cache.delete(request);
              console.log('Removed old cache entry:', request.url);
            }
          }
        }
      }
    }
    
    console.log('Cache cleanup completed');
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}