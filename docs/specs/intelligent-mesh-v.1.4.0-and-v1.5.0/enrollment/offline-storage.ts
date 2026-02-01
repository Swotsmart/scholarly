/**
 * Offline Storage & Sync Manager
 * 
 * Enables enrollment forms to work without network connectivity, automatically
 * syncing when connection is restored. This is critical for real-world usage
 * where parents might be filling out forms on unreliable mobile connections.
 * 
 * ## The Granny Explanation
 * 
 * Imagine a parent sitting at the kitchen table after dinner, finally finding
 * 20 minutes to fill out the school enrollment form on their phone. They're
 * halfway through entering medical information when:
 * 
 * - The WiFi drops because someone started streaming video
 * - They walk to check on the kids and lose signal
 * - The mobile data is patchy in their area
 * 
 * Without offline support, they'd see a spinning wheel, then an error, then
 * potentially lose everything they'd typed. They'd have to start over - or
 * worse, give up entirely.
 * 
 * With offline support:
 * 
 * 1. **The form keeps working** - They don't even notice the connection dropped
 * 2. **Everything saves locally** - IndexedDB stores their progress on the device
 * 3. **Visual feedback** - A subtle indicator shows "Saved offline" vs "Synced"
 * 4. **Automatic sync** - When connection returns, changes flow to the server
 * 5. **Conflict resolution** - If they used two devices, smart merging handles it
 * 
 * The technical magic involves:
 * - Service Workers intercepting network requests
 * - IndexedDB providing persistent local storage
 * - A sync queue managing pending changes
 * - Background sync API triggering when online
 * 
 * ## Architecture
 * 
 * ```
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         CLIENT APPLICATION                              │
 * │                                                                         │
 * │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
 * │  │ Form UI     │───▶│ Offline     │───▶│ IndexedDB   │                 │
 * │  │             │    │ Manager     │    │ Storage     │                 │
 * │  └─────────────┘    └──────┬──────┘    └─────────────┘                 │
 * │                            │                                           │
 * │                            ▼                                           │
 * │                     ┌─────────────┐                                    │
 * │                     │ Sync Queue  │                                    │
 * │                     └──────┬──────┘                                    │
 * │                            │                                           │
 * └────────────────────────────┼───────────────────────────────────────────┘
 *                              │
 *                              ▼ (when online)
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         SERVER API                                      │
 * │                                                                         │
 * │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
 * │  │ Form Builder│───▶│ Submission  │───▶│ Database    │                 │
 * │  │ Service     │    │ Repository  │    │             │                 │
 * │  └─────────────┘    └─────────────┘    └─────────────┘                 │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 * ```
 * 
 * @module IntelligenceMesh/Enrollment/Offline
 * @version 1.4.1
 */

// ============================================================================
// OFFLINE STORAGE TYPES
// ============================================================================

/**
 * Represents the current connectivity state
 */
export interface ConnectivityState {
  isOnline: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;  // Mbps
  rtt?: number;       // Round-trip time in ms
  saveData?: boolean; // User has requested reduced data usage
  lastChecked: Date;
}

/**
 * A queued operation waiting to sync
 */
export interface SyncQueueItem {
  id: string;
  timestamp: Date;
  operation: 'create' | 'update' | 'delete';
  entityType: 'submission' | 'response' | 'document';
  entityId: string;
  data: any;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  priority: 'high' | 'normal' | 'low';
  dependencies?: string[];  // IDs of items that must sync first
}

/**
 * Stored form configuration for offline use
 */
export interface CachedFormConfig {
  id: string;
  tenantId: string;
  config: any;  // EnrollmentFormConfig
  cachedAt: Date;
  expiresAt: Date;
  version: number;
  eTag?: string;
}

/**
 * Locally stored submission
 */
export interface LocalSubmission {
  id: string;
  localId: string;  // Client-generated ID before server sync
  serverId?: string; // Server-assigned ID after sync
  formConfigId: string;
  tenantId: string;
  responses: LocalResponse[];
  customData: Record<string, any>;
  status: 'draft' | 'pending_sync' | 'synced' | 'submitted' | 'sync_error';
  syncStatus: SyncStatus;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
  localChanges: ChangeRecord[];
}

/**
 * Individual field response stored locally
 */
export interface LocalResponse {
  fieldId: string;
  value: any;
  updatedAt: Date;
  syncedAt?: Date;
  pendingSync: boolean;
}

/**
 * Tracks sync state for an entity
 */
export interface SyncStatus {
  state: 'synced' | 'pending' | 'syncing' | 'error' | 'conflict';
  lastAttempt?: Date;
  errorMessage?: string;
  conflictData?: {
    localVersion: any;
    serverVersion: any;
    conflictFields: string[];
  };
}

/**
 * Records a local change for conflict resolution
 */
export interface ChangeRecord {
  timestamp: Date;
  fieldId?: string;
  previousValue: any;
  newValue: any;
  source: 'user' | 'sync' | 'merge';
}

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy = 
  | 'local_wins'      // Keep local changes
  | 'server_wins'     // Accept server version
  | 'merge'           // Attempt automatic merge
  | 'manual';         // Require user decision

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsFailed: number;
  conflicts: SyncConflict[];
  errors: SyncError[];
  nextSyncRecommended?: Date;
}

export interface SyncConflict {
  entityType: string;
  entityId: string;
  localVersion: any;
  serverVersion: any;
  conflictFields: string[];
  suggestedResolution: ConflictStrategy;
}

export interface SyncError {
  entityType: string;
  entityId: string;
  error: string;
  retryable: boolean;
}

// ============================================================================
// OFFLINE CONFIGURATION
// ============================================================================

export interface OfflineConfig {
  /** Enable offline support */
  enabled: boolean;
  
  /** IndexedDB database name */
  dbName: string;
  
  /** Database version for migrations */
  dbVersion: number;
  
  /** How long to cache form configurations (ms) */
  formConfigCacheDuration: number;
  
  /** Auto-save interval when offline (ms) */
  offlineAutoSaveInterval: number;
  
  /** Maximum items in sync queue before forcing sync */
  maxQueueSize: number;
  
  /** Maximum retries for failed sync operations */
  maxSyncRetries: number;
  
  /** Delay between retry attempts (ms) */
  retryDelayMs: number;
  
  /** Default conflict resolution strategy */
  defaultConflictStrategy: ConflictStrategy;
  
  /** Enable background sync when available */
  useBackgroundSync: boolean;
  
  /** Sync when connection quality improves */
  syncOnConnectionImprove: boolean;
  
  /** Minimum connection quality for sync ('2g' | '3g' | '4g') */
  minConnectionForSync: string;
  
  /** Storage quota warning threshold (bytes) */
  storageWarningThreshold: number;
}

export const DEFAULT_OFFLINE_CONFIG: OfflineConfig = {
  enabled: true,
  dbName: 'scholarly-enrollment-offline',
  dbVersion: 1,
  formConfigCacheDuration: 24 * 60 * 60 * 1000, // 24 hours
  offlineAutoSaveInterval: 5000, // 5 seconds
  maxQueueSize: 100,
  maxSyncRetries: 5,
  retryDelayMs: 5000,
  defaultConflictStrategy: 'merge',
  useBackgroundSync: true,
  syncOnConnectionImprove: true,
  minConnectionForSync: '3g',
  storageWarningThreshold: 50 * 1024 * 1024 // 50MB
};

// ============================================================================
// INDEXEDDB SCHEMA
// ============================================================================

/**
 * IndexedDB store definitions
 */
export const INDEXED_DB_STORES = {
  FORM_CONFIGS: {
    name: 'formConfigs',
    keyPath: 'id',
    indexes: [
      { name: 'tenantId', keyPath: 'tenantId', unique: false },
      { name: 'expiresAt', keyPath: 'expiresAt', unique: false }
    ]
  },
  SUBMISSIONS: {
    name: 'submissions',
    keyPath: 'localId',
    indexes: [
      { name: 'tenantId', keyPath: 'tenantId', unique: false },
      { name: 'formConfigId', keyPath: 'formConfigId', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'serverId', keyPath: 'serverId', unique: false },
      { name: 'updatedAt', keyPath: 'updatedAt', unique: false }
    ]
  },
  SYNC_QUEUE: {
    name: 'syncQueue',
    keyPath: 'id',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp', unique: false },
      { name: 'priority', keyPath: 'priority', unique: false },
      { name: 'entityType', keyPath: 'entityType', unique: false }
    ]
  },
  PENDING_UPLOADS: {
    name: 'pendingUploads',
    keyPath: 'id',
    indexes: [
      { name: 'submissionId', keyPath: 'submissionId', unique: false }
    ]
  },
  METADATA: {
    name: 'metadata',
    keyPath: 'key'
  }
} as const;

// ============================================================================
// SERVICE WORKER MESSAGES
// ============================================================================

/**
 * Messages sent between main thread and service worker
 */
export type ServiceWorkerMessage =
  | { type: 'SYNC_NOW'; priority?: 'high' | 'normal' }
  | { type: 'SYNC_COMPLETE'; result: SyncResult }
  | { type: 'CONNECTIVITY_CHANGE'; state: ConnectivityState }
  | { type: 'CACHE_FORM'; formConfigId: string }
  | { type: 'CLEAR_CACHE'; olderThan?: Date }
  | { type: 'GET_SYNC_STATUS' }
  | { type: 'SYNC_STATUS'; pending: number; errors: number }
  | { type: 'STORAGE_WARNING'; usedBytes: number; quotaBytes: number };

// ============================================================================
// OFFLINE MANAGER CLASS (CLIENT-SIDE)
// ============================================================================

/**
 * Client-side offline manager
 * 
 * This would typically run in the browser. The implementation here
 * provides the interface and core logic; actual IndexedDB and 
 * Service Worker integration would be in client-specific code.
 */
export class OfflineManager {
  private config: OfflineConfig;
  private db: IDBDatabase | null = null;
  private syncInProgress: boolean = false;
  private connectivityState: ConnectivityState;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = { ...DEFAULT_OFFLINE_CONFIG, ...config };
    this.connectivityState = {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastChecked: new Date()
    };
  }

  /**
   * Initialize the offline manager
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) return;

    // Open IndexedDB
    this.db = await this.openDatabase();

    // Set up connectivity listeners
    this.setupConnectivityListeners();

    // Register service worker if available
    await this.registerServiceWorker();

    // Clean up expired cache
    await this.cleanExpiredCache();

    // Check for pending sync items
    const pendingCount = await this.getPendingSyncCount();
    if (pendingCount > 0 && this.connectivityState.isOnline) {
      this.scheduleSync();
    }

    this.emit('initialized', { pendingSync: pendingCount });
  }

  /**
   * Open or create the IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        for (const store of Object.values(INDEXED_DB_STORES)) {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, { 
              keyPath: store.keyPath 
            });
            
            // Create indexes
            if ('indexes' in store) {
              for (const index of store.indexes) {
                objectStore.createIndex(index.name, index.keyPath, { 
                  unique: index.unique 
                });
              }
            }
          }
        }
      };
    });
  }

  /**
   * Set up network connectivity listeners
   */
  private setupConnectivityListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.updateConnectivity(true);
    });

    window.addEventListener('offline', () => {
      this.updateConnectivity(false);
    });

    // Monitor connection quality changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.updateConnectivityDetails(connection);
      });
      this.updateConnectivityDetails(connection);
    }
  }

  private updateConnectivity(isOnline: boolean): void {
    const wasOnline = this.connectivityState.isOnline;
    this.connectivityState.isOnline = isOnline;
    this.connectivityState.lastChecked = new Date();

    this.emit('connectivityChange', this.connectivityState);

    // Trigger sync when coming back online
    if (!wasOnline && isOnline) {
      this.emit('backOnline', {});
      this.scheduleSync();
    }
  }

  private updateConnectivityDetails(connection: any): void {
    this.connectivityState.effectiveType = connection.effectiveType;
    this.connectivityState.downlink = connection.downlink;
    this.connectivityState.rtt = connection.rtt;
    this.connectivityState.saveData = connection.saveData;
    this.connectivityState.lastChecked = new Date();

    // Check if connection improved enough to sync
    if (this.config.syncOnConnectionImprove && this.shouldSyncOnConnection()) {
      this.scheduleSync();
    }
  }

  private shouldSyncOnConnection(): boolean {
    const qualityOrder = ['slow-2g', '2g', '3g', '4g'];
    const currentIndex = qualityOrder.indexOf(this.connectivityState.effectiveType || '4g');
    const minIndex = qualityOrder.indexOf(this.config.minConnectionForSync);
    return currentIndex >= minIndex;
  }

  /**
   * Register the service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register('/enrollment-sw.js');
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });

      // Register for background sync if available
      if (this.config.useBackgroundSync && 'sync' in registration) {
        await (registration as any).sync.register('enrollment-sync');
      }
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  }

  private handleServiceWorkerMessage(message: ServiceWorkerMessage): void {
    switch (message.type) {
      case 'SYNC_COMPLETE':
        this.emit('syncComplete', message.result);
        break;
      case 'CONNECTIVITY_CHANGE':
        this.connectivityState = message.state;
        this.emit('connectivityChange', message.state);
        break;
      case 'STORAGE_WARNING':
        this.emit('storageWarning', { 
          usedBytes: message.usedBytes, 
          quotaBytes: message.quotaBytes 
        });
        break;
    }
  }

  // ==========================================================================
  // FORM CONFIGURATION CACHING
  // ==========================================================================

  /**
   * Cache a form configuration for offline use
   */
  async cacheFormConfig(formConfig: any, tenantId: string): Promise<void> {
    if (!this.db) return;

    const cached: CachedFormConfig = {
      id: formConfig.id,
      tenantId,
      config: formConfig,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.formConfigCacheDuration),
      version: formConfig.version
    };

    const transaction = this.db.transaction(INDEXED_DB_STORES.FORM_CONFIGS.name, 'readwrite');
    const store = transaction.objectStore(INDEXED_DB_STORES.FORM_CONFIGS.name);
    await this.promisifyRequest(store.put(cached));
  }

  /**
   * Get a cached form configuration
   */
  async getCachedFormConfig(formConfigId: string): Promise<CachedFormConfig | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction(INDEXED_DB_STORES.FORM_CONFIGS.name, 'readonly');
    const store = transaction.objectStore(INDEXED_DB_STORES.FORM_CONFIGS.name);
    const cached = await this.promisifyRequest<CachedFormConfig>(store.get(formConfigId));

    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }

    return null;
  }

  // ==========================================================================
  // LOCAL SUBMISSION MANAGEMENT
  // ==========================================================================

  /**
   * Create a new local submission
   */
  async createLocalSubmission(
    formConfigId: string,
    tenantId: string
  ): Promise<LocalSubmission> {
    const localId = this.generateLocalId();
    
    const submission: LocalSubmission = {
      id: localId,
      localId,
      formConfigId,
      tenantId,
      responses: [],
      customData: {},
      status: 'draft',
      syncStatus: { state: 'pending' },
      createdAt: new Date(),
      updatedAt: new Date(),
      localChanges: []
    };

    await this.saveLocalSubmission(submission);
    
    // Queue for sync when online
    await this.queueSync({
      id: this.generateLocalId(),
      timestamp: new Date(),
      operation: 'create',
      entityType: 'submission',
      entityId: localId,
      data: submission,
      retryCount: 0,
      maxRetries: this.config.maxSyncRetries,
      priority: 'normal'
    });

    return submission;
  }

  /**
   * Save a response locally
   */
  async saveResponseLocally(
    localSubmissionId: string,
    fieldId: string,
    value: any
  ): Promise<LocalSubmission> {
    const submission = await this.getLocalSubmission(localSubmissionId);
    if (!submission) {
      throw new Error(`Submission ${localSubmissionId} not found`);
    }

    const now = new Date();
    const existingIndex = submission.responses.findIndex(r => r.fieldId === fieldId);
    const previousValue = existingIndex >= 0 ? submission.responses[existingIndex].value : undefined;

    const response: LocalResponse = {
      fieldId,
      value,
      updatedAt: now,
      pendingSync: true
    };

    if (existingIndex >= 0) {
      submission.responses[existingIndex] = response;
    } else {
      submission.responses.push(response);
    }

    // Record the change
    submission.localChanges.push({
      timestamp: now,
      fieldId,
      previousValue,
      newValue: value,
      source: 'user'
    });

    submission.updatedAt = now;
    submission.syncStatus = { state: 'pending' };

    await this.saveLocalSubmission(submission);

    // Queue for sync
    await this.queueSync({
      id: this.generateLocalId(),
      timestamp: now,
      operation: 'update',
      entityType: 'response',
      entityId: `${localSubmissionId}:${fieldId}`,
      data: { submissionId: localSubmissionId, fieldId, value },
      retryCount: 0,
      maxRetries: this.config.maxSyncRetries,
      priority: 'normal'
    });

    // Trigger sync if online
    if (this.connectivityState.isOnline) {
      this.scheduleSync();
    }

    this.emit('responseSaved', { submissionId: localSubmissionId, fieldId, offline: !this.connectivityState.isOnline });

    return submission;
  }

  /**
   * Get a local submission by ID
   */
  async getLocalSubmission(localId: string): Promise<LocalSubmission | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction(INDEXED_DB_STORES.SUBMISSIONS.name, 'readonly');
    const store = transaction.objectStore(INDEXED_DB_STORES.SUBMISSIONS.name);
    return this.promisifyRequest<LocalSubmission>(store.get(localId));
  }

  /**
   * Get all local submissions for a form
   */
  async getLocalSubmissions(formConfigId: string): Promise<LocalSubmission[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(INDEXED_DB_STORES.SUBMISSIONS.name, 'readonly');
    const store = transaction.objectStore(INDEXED_DB_STORES.SUBMISSIONS.name);
    const index = store.index('formConfigId');
    return this.promisifyRequest<LocalSubmission[]>(index.getAll(formConfigId));
  }

  /**
   * Save a local submission
   */
  private async saveLocalSubmission(submission: LocalSubmission): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(INDEXED_DB_STORES.SUBMISSIONS.name, 'readwrite');
    const store = transaction.objectStore(INDEXED_DB_STORES.SUBMISSIONS.name);
    await this.promisifyRequest(store.put(submission));
  }

  // ==========================================================================
  // SYNC QUEUE MANAGEMENT
  // ==========================================================================

  /**
   * Add an item to the sync queue
   */
  private async queueSync(item: SyncQueueItem): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(INDEXED_DB_STORES.SYNC_QUEUE.name, 'readwrite');
    const store = transaction.objectStore(INDEXED_DB_STORES.SYNC_QUEUE.name);
    await this.promisifyRequest(store.put(item));

    // Check queue size
    const count = await this.getPendingSyncCount();
    if (count >= this.config.maxQueueSize) {
      this.scheduleSync('high');
    }
  }

  /**
   * Get count of pending sync items
   */
  async getPendingSyncCount(): Promise<number> {
    if (!this.db) return 0;

    const transaction = this.db.transaction(INDEXED_DB_STORES.SYNC_QUEUE.name, 'readonly');
    const store = transaction.objectStore(INDEXED_DB_STORES.SYNC_QUEUE.name);
    return this.promisifyRequest<number>(store.count());
  }

  /**
   * Get all pending sync items
   */
  private async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(INDEXED_DB_STORES.SYNC_QUEUE.name, 'readonly');
    const store = transaction.objectStore(INDEXED_DB_STORES.SYNC_QUEUE.name);
    const index = store.index('timestamp');
    return this.promisifyRequest<SyncQueueItem[]>(index.getAll());
  }

  /**
   * Remove an item from the sync queue
   */
  private async removeSyncQueueItem(id: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(INDEXED_DB_STORES.SYNC_QUEUE.name, 'readwrite');
    const store = transaction.objectStore(INDEXED_DB_STORES.SYNC_QUEUE.name);
    await this.promisifyRequest(store.delete(id));
  }

  // ==========================================================================
  // SYNCHRONIZATION
  // ==========================================================================

  private syncTimeout: any = null;

  /**
   * Schedule a sync operation
   */
  private scheduleSync(priority: 'high' | 'normal' = 'normal'): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    const delay = priority === 'high' ? 0 : 1000;
    this.syncTimeout = setTimeout(() => this.performSync(), delay);
  }

  /**
   * Perform synchronization with the server
   */
  async performSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { success: false, itemsSynced: 0, itemsFailed: 0, conflicts: [], errors: [] };
    }

    if (!this.connectivityState.isOnline) {
      return { success: false, itemsSynced: 0, itemsFailed: 0, conflicts: [], errors: [
        { entityType: 'sync', entityId: '', error: 'No network connection', retryable: true }
      ]};
    }

    this.syncInProgress = true;
    this.emit('syncStarted', {});

    const result: SyncResult = {
      success: true,
      itemsSynced: 0,
      itemsFailed: 0,
      conflicts: [],
      errors: []
    };

    try {
      const queue = await this.getSyncQueue();
      
      // Sort by priority and dependencies
      const sortedQueue = this.sortSyncQueue(queue);

      for (const item of sortedQueue) {
        try {
          await this.syncItem(item, result);
          await this.removeSyncQueueItem(item.id);
          result.itemsSynced++;
        } catch (error) {
          result.itemsFailed++;
          
          if (item.retryCount < item.maxRetries) {
            // Update retry count and keep in queue
            item.retryCount++;
            item.lastError = (error as Error).message;
            await this.queueSync(item);
          } else {
            result.errors.push({
              entityType: item.entityType,
              entityId: item.entityId,
              error: (error as Error).message,
              retryable: false
            });
            await this.removeSyncQueueItem(item.id);
          }
        }
      }

      result.success = result.itemsFailed === 0;
    } finally {
      this.syncInProgress = false;
      this.emit('syncComplete', result);
    }

    return result;
  }

  private sortSyncQueue(queue: SyncQueueItem[]): SyncQueueItem[] {
    // Priority order: high > normal > low
    // Then by timestamp
    // Respect dependencies
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    
    return [...queue].sort((a, b) => {
      // Dependencies first
      if (b.dependencies?.includes(a.id)) return -1;
      if (a.dependencies?.includes(b.id)) return 1;
      
      // Then priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then timestamp
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }

  private async syncItem(item: SyncQueueItem, result: SyncResult): Promise<void> {
    // This would call the actual API
    // For now, we'll define the interface
    
    switch (item.operation) {
      case 'create':
        await this.syncCreate(item, result);
        break;
      case 'update':
        await this.syncUpdate(item, result);
        break;
      case 'delete':
        await this.syncDelete(item, result);
        break;
    }
  }

  private async syncCreate(item: SyncQueueItem, result: SyncResult): Promise<void> {
    // Call API to create entity
    // Update local record with server ID
    // This is where you'd integrate with the actual FormBuilderService
    
    const response = await fetch('/api/v1/enrollment/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.data)
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const serverData = await response.json();
    
    // Update local submission with server ID
    const submission = await this.getLocalSubmission(item.entityId);
    if (submission) {
      submission.serverId = serverData.id;
      submission.syncStatus = { state: 'synced' };
      submission.lastSyncedAt = new Date();
      await this.saveLocalSubmission(submission);
    }
  }

  private async syncUpdate(item: SyncQueueItem, result: SyncResult): Promise<void> {
    const { submissionId, fieldId, value } = item.data;
    
    // Get the server ID for this submission
    const submission = await this.getLocalSubmission(submissionId);
    if (!submission?.serverId) {
      throw new Error('Submission not yet synced to server');
    }

    const response = await fetch(`/api/v1/enrollment/submissions/${submission.serverId}/responses`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses: [{ fieldId, value }] })
    });

    if (response.status === 409) {
      // Conflict detected
      const serverData = await response.json();
      result.conflicts.push({
        entityType: 'response',
        entityId: `${submissionId}:${fieldId}`,
        localVersion: value,
        serverVersion: serverData.currentValue,
        conflictFields: [fieldId],
        suggestedResolution: this.config.defaultConflictStrategy
      });
      return;
    }

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    // Update local response sync status
    const responseIndex = submission.responses.findIndex(r => r.fieldId === fieldId);
    if (responseIndex >= 0) {
      submission.responses[responseIndex].syncedAt = new Date();
      submission.responses[responseIndex].pendingSync = false;
      await this.saveLocalSubmission(submission);
    }
  }

  private async syncDelete(item: SyncQueueItem, result: SyncResult): Promise<void> {
    // Handle deletion sync
    const response = await fetch(`/api/v1/enrollment/submissions/${item.entityId}`, {
      method: 'DELETE'
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Server error: ${response.status}`);
    }
  }

  // ==========================================================================
  // CONFLICT RESOLUTION
  // ==========================================================================

  /**
   * Resolve a sync conflict
   */
  async resolveConflict(
    conflict: SyncConflict,
    strategy: ConflictStrategy,
    manualResolution?: any
  ): Promise<void> {
    switch (strategy) {
      case 'local_wins':
        // Re-queue the local change with force flag
        await this.queueSync({
          id: this.generateLocalId(),
          timestamp: new Date(),
          operation: 'update',
          entityType: conflict.entityType as any,
          entityId: conflict.entityId,
          data: { ...conflict.localVersion, force: true },
          retryCount: 0,
          maxRetries: 1,
          priority: 'high'
        });
        break;

      case 'server_wins':
        // Update local with server version
        await this.applyServerVersion(conflict);
        break;

      case 'merge':
        // Attempt automatic merge
        const merged = this.mergeVersions(conflict.localVersion, conflict.serverVersion, conflict.conflictFields);
        await this.applyMergedVersion(conflict.entityId, merged);
        break;

      case 'manual':
        if (manualResolution) {
          await this.applyMergedVersion(conflict.entityId, manualResolution);
        }
        break;
    }
  }

  private async applyServerVersion(conflict: SyncConflict): Promise<void> {
    const [submissionId, fieldId] = conflict.entityId.split(':');
    const submission = await this.getLocalSubmission(submissionId);
    if (submission) {
      const responseIndex = submission.responses.findIndex(r => r.fieldId === fieldId);
      if (responseIndex >= 0) {
        submission.responses[responseIndex].value = conflict.serverVersion;
        submission.responses[responseIndex].pendingSync = false;
        submission.localChanges.push({
          timestamp: new Date(),
          fieldId,
          previousValue: conflict.localVersion,
          newValue: conflict.serverVersion,
          source: 'sync'
        });
        await this.saveLocalSubmission(submission);
      }
    }
  }

  private mergeVersions(local: any, server: any, conflictFields: string[]): any {
    // Simple merge: use server for conflicting fields, local for others
    // More sophisticated merge logic could be implemented
    return { ...local, ...server };
  }

  private async applyMergedVersion(entityId: string, merged: any): Promise<void> {
    const [submissionId, fieldId] = entityId.split(':');
    await this.saveResponseLocally(submissionId, fieldId, merged);
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  private generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private promisifyRequest<T>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async cleanExpiredCache(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(INDEXED_DB_STORES.FORM_CONFIGS.name, 'readwrite');
    const store = transaction.objectStore(INDEXED_DB_STORES.FORM_CONFIGS.name);
    const index = store.index('expiresAt');
    const now = new Date();

    const expiredRange = IDBKeyRange.upperBound(now);
    const request = index.openCursor(expiredRange);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
  }

  // ==========================================================================
  // EVENT EMITTER
  // ==========================================================================

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error(`Error in event handler for ${event}:`, e);
      }
    });
  }

  // ==========================================================================
  // PUBLIC STATUS METHODS
  // ==========================================================================

  /**
   * Get current connectivity state
   */
  getConnectivityState(): ConnectivityState {
    return { ...this.connectivityState };
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.connectivityState.isOnline;
  }

  /**
   * Force a sync attempt
   */
  async forceSync(): Promise<SyncResult> {
    return this.performSync();
  }

  /**
   * Get sync status summary
   */
  async getSyncStatus(): Promise<{
    pendingItems: number;
    lastSyncAttempt?: Date;
    isOnline: boolean;
    syncInProgress: boolean;
  }> {
    return {
      pendingItems: await this.getPendingSyncCount(),
      isOnline: this.connectivityState.isOnline,
      syncInProgress: this.syncInProgress
    };
  }
}
