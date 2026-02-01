/**
 * Enrollment Form Service Worker
 * 
 * Provides offline capabilities for the enrollment form:
 * - Caches form assets and configurations
 * - Intercepts API requests when offline
 * - Manages background sync when connection returns
 * - Handles push notifications for sync status
 * 
 * ## Installation
 * 
 * This file should be served at `/enrollment-sw.js` from your web root.
 * The OfflineManager will register it automatically.
 * 
 * @module IntelligenceMesh/Enrollment/ServiceWorker
 * @version 1.4.1
 */

// TypeScript types for service worker globals
declare const self: ServiceWorkerGlobalScope;

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const CACHE_VERSION = 'v1.4.1';
const STATIC_CACHE = `enrollment-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `enrollment-dynamic-${CACHE_VERSION}`;
const API_CACHE = `enrollment-api-${CACHE_VERSION}`;

/**
 * Static assets to pre-cache on install
 */
const STATIC_ASSETS = [
  '/',
  '/enrollment',
  '/enrollment/form',
  '/css/enrollment.css',
  '/js/enrollment-bundle.js',
  '/js/offline-manager.js',
  '/fonts/scholarly-icons.woff2',
  '/images/logo.svg',
  '/images/offline-indicator.svg',
  '/offline.html'
];

/**
 * API endpoints that can be cached for offline use
 */
const CACHEABLE_API_PATTERNS = [
  /\/api\/v1\/enrollment\/forms\/active/,
  /\/api\/v1\/enrollment\/forms\/[a-z0-9-]+$/
];

/**
 * API endpoints that should use network-first strategy
 */
const NETWORK_FIRST_PATTERNS = [
  /\/api\/v1\/enrollment\/submissions/
];

// ============================================================================
// SERVICE WORKER LIFECYCLE
// ============================================================================

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      
      // Cache static assets
      await cache.addAll(STATIC_ASSETS);
      
      // Activate immediately
      await self.skipWaiting();
      
      console.log('[SW] Installed and cached static assets');
    })()
  );
});

/**
 * Activate event - clean old caches
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // Clean old caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => 
        name.startsWith('enrollment-') && 
        ![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(name)
      );
      
      await Promise.all(oldCaches.map(name => caches.delete(name)));
      
      // Take control of all clients
      await self.clients.claim();
      
      console.log('[SW] Activated and cleaned old caches');
    })()
  );
});

// ============================================================================
// FETCH HANDLING
// ============================================================================

/**
 * Fetch event - intercept network requests
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event));
    return;
  }
  
  // Handle static assets with cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }
  
  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }
  
  // Default: network first with cache fallback
  event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
});

/**
 * Handle API requests with appropriate strategy
 */
async function handleApiRequest(event: FetchEvent): Promise<Response> {
  const url = new URL(event.request.url);
  
  // Check if this is a cacheable GET request
  if (event.request.method === 'GET') {
    const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
    
    if (isCacheable) {
      return staleWhileRevalidate(event.request, API_CACHE);
    }
  }
  
  // Check if this should use network-first
  const isNetworkFirst = NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname));
  
  if (isNetworkFirst) {
    return networkFirstApi(event);
  }
  
  // Default: try network, queue if offline
  return networkWithOfflineQueue(event);
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') as Promise<Response>;
    }
    throw error;
  }
}

/**
 * Network-first strategy
 */
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Start fetch in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  
  // Return cached version immediately if available
  if (cached) {
    // Update in background
    fetchPromise;
    return cached;
  }
  
  // Wait for network if no cache
  const response = await fetchPromise;
  if (response) {
    return response;
  }
  
  throw new Error('No cached version and network failed');
}

/**
 * Network-first for API with timeout
 */
async function networkFirstApi(event: FetchEvent): Promise<Response> {
  const timeoutPromise = new Promise<Response>((_, reject) => {
    setTimeout(() => reject(new Error('Network timeout')), 5000);
  });
  
  try {
    const response = await Promise.race([
      fetch(event.request),
      timeoutPromise
    ]);
    
    // Cache successful GET responses
    if (response.ok && event.request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      cache.put(event.request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try cache for GET requests
    if (event.request.method === 'GET') {
      const cached = await caches.match(event.request);
      if (cached) {
        return cached;
      }
    }
    
    // Return offline response
    return createOfflineResponse(event.request);
  }
}

/**
 * Network with offline queue for mutations
 */
async function networkWithOfflineQueue(event: FetchEvent): Promise<Response> {
  try {
    return await fetch(event.request);
  } catch (error) {
    // For mutations (POST, PUT, DELETE), queue for later
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(event.request.method)) {
      await queueForSync(event.request);
      return createQueuedResponse(event.request);
    }
    
    return createOfflineResponse(event.request);
  }
}

/**
 * Handle navigation requests
 */
async function handleNavigation(event: FetchEvent): Promise<Response> {
  try {
    const response = await fetch(event.request);
    
    // Cache the page for offline use
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(event.request, response.clone());
    
    return response;
  } catch (error) {
    // Try to serve cached version
    const cached = await caches.match(event.request);
    if (cached) {
      return cached;
    }
    
    // Return offline page
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// ============================================================================
// OFFLINE QUEUE MANAGEMENT
// ============================================================================

const QUEUE_DB_NAME = 'enrollment-sw-queue';
const QUEUE_STORE_NAME = 'requests';

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
}

/**
 * Queue a failed request for later sync
 */
async function queueForSync(request: Request): Promise<void> {
  const db = await openQueueDatabase();
  
  const queuedRequest: QueuedRequest = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : undefined,
    timestamp: Date.now()
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE_NAME);
    const addRequest = store.add(queuedRequest);
    
    addRequest.onsuccess = () => resolve();
    addRequest.onerror = () => reject(addRequest.error);
  });
}

/**
 * Open the queue database
 */
function openQueueDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
        db.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Process the sync queue
 */
async function processQueue(): Promise<{ success: number; failed: number }> {
  const db = await openQueueDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE_NAME);
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = async () => {
      const items: QueuedRequest[] = getAllRequest.result;
      let success = 0;
      let failed = 0;
      
      for (const item of items) {
        try {
          const response = await fetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.body
          });
          
          if (response.ok) {
            // Remove from queue
            store.delete(item.id);
            success++;
          } else if (response.status >= 400 && response.status < 500) {
            // Client error - remove from queue (won't succeed on retry)
            store.delete(item.id);
            failed++;
          } else {
            // Server error - keep in queue for retry
            failed++;
          }
        } catch (error) {
          // Network error - keep in queue
          failed++;
        }
      }
      
      resolve({ success, failed });
    };
    
    getAllRequest.onerror = () => reject(getAllRequest.error);
  });
}

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

/**
 * Background sync event
 */
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'enrollment-sync') {
    event.waitUntil(
      (async () => {
        const result = await processQueue();
        
        // Notify all clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_COMPLETE',
            result
          });
        });
        
        console.log(`[SW] Background sync complete: ${result.success} synced, ${result.failed} failed`);
      })()
    );
  }
});

/**
 * Periodic background sync (if available)
 */
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'enrollment-periodic-sync') {
    event.waitUntil(processQueue());
  }
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Handle messages from main thread
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const message = event.data;
  
  switch (message.type) {
    case 'SYNC_NOW':
      event.waitUntil(
        processQueue().then(result => {
          event.source?.postMessage({ type: 'SYNC_COMPLETE', result });
        })
      );
      break;
      
    case 'CACHE_FORM':
      event.waitUntil(
        cacheFormConfig(message.formConfigId)
      );
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        clearOldCache(message.olderThan)
      );
      break;
      
    case 'GET_SYNC_STATUS':
      event.waitUntil(
        getSyncStatus().then(status => {
          event.source?.postMessage({ type: 'SYNC_STATUS', ...status });
        })
      );
      break;
  }
});

/**
 * Cache a specific form configuration
 */
async function cacheFormConfig(formConfigId: string): Promise<void> {
  const cache = await caches.open(API_CACHE);
  const url = `/api/v1/enrollment/forms/${formConfigId}`;
  
  try {
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response);
    }
  } catch (error) {
    console.warn('[SW] Failed to cache form config:', error);
  }
}

/**
 * Clear old cached items
 */
async function clearOldCache(olderThan?: Date): Promise<void> {
  const cache = await caches.open(API_CACHE);
  const requests = await cache.keys();
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const dateHeader = response.headers.get('date');
      if (dateHeader) {
        const cachedDate = new Date(dateHeader);
        if (olderThan && cachedDate < olderThan) {
          await cache.delete(request);
        }
      }
    }
  }
}

/**
 * Get current sync status
 */
async function getSyncStatus(): Promise<{ pending: number; errors: number }> {
  const db = await openQueueDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(QUEUE_STORE_NAME);
    const countRequest = store.count();
    
    countRequest.onsuccess = () => {
      resolve({ pending: countRequest.result, errors: 0 });
    };
    countRequest.onerror = () => reject(countRequest.error);
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a path is a static asset
 */
function isStaticAsset(pathname: string): boolean {
  const staticExtensions = ['.css', '.js', '.woff', '.woff2', '.png', '.jpg', '.svg', '.ico'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * Create an offline response
 */
function createOfflineResponse(request: Request): Response {
  return new Response(
    JSON.stringify({
      error: 'offline',
      message: 'You appear to be offline. This request has been saved and will be sent when you\'re back online.'
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-Offline': 'true'
      }
    }
  );
}

/**
 * Create a response indicating the request was queued
 */
function createQueuedResponse(request: Request): Response {
  return new Response(
    JSON.stringify({
      queued: true,
      message: 'Your changes have been saved offline and will sync when you\'re back online.'
    }),
    {
      status: 202, // Accepted
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Queued': 'true'
      }
    }
  );
}

// ============================================================================
// TYPE DECLARATIONS
// ============================================================================

interface SyncEvent extends ExtendableEvent {
  tag: string;
}

interface ExtendableMessageEvent extends ExtendableEvent {
  data: any;
  source: Client | ServiceWorker | MessagePort | null;
}

export {};
