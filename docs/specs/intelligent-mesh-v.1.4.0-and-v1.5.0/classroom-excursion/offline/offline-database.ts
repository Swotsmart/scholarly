/**
 * Offline-First Database Layer
 * 
 * IndexedDB-based local storage enabling excursion management to work
 * with zero connectivity. Follows the patterns established in the
 * enrollment offline-storage.ts but specialized for safety-critical
 * excursion operations.
 * 
 * ## The Granny Explanation
 * 
 * When you're in the middle of a national park with 30 kids and no signal,
 * you can't just hope the internet works. This is the "smart clipboard" that
 * remembers everything even when the phone can't talk to the school.
 * 
 * It stores:
 * - The list of kids (downloaded before leaving)
 * - Every time you tick off a name at a checkpoint
 * - Every photo a kid takes for their assignment
 * - Any "help" signals that need to go out
 * 
 * When signal returns, it sends everything to the school in order of
 * importance: "missing student" alerts go first, then attendance, then
 * photos and homework stuff.
 * 
 * ## Architecture
 * 
 * ```
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         MOBILE APP                                      │
 * │                                                                         │
 * │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
 * │  │ UI Layer    │───▶│ Offline     │───▶│ IndexedDB   │                 │
 * │  │ (React)     │    │ Database    │    │ (Persistent)│                 │
 * │  └─────────────┘    └──────┬──────┘    └─────────────┘                 │
 * │                            │                                           │
 * │                            ▼                                           │
 * │  ┌─────────────────────────────────────────────────────────────┐      │
 * │  │                    SYNC ENGINE                               │      │
 * │  │  Priority Queue: CRITICAL → HIGH → NORMAL → LOW              │      │
 * │  │  Missing student alerts ALWAYS sync first                    │      │
 * │  └──────────────────────────┬──────────────────────────────────┘      │
 * │                              │                                         │
 * └──────────────────────────────┼─────────────────────────────────────────┘
 *                                │
 *                                ▼ (when signal returns)
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         SERVER API                                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 * ```
 * 
 * @module IntelligenceMesh/ClassroomExcursion/Offline
 * @version 1.0.0
 */

import {
  SyncStatus, SyncPriority, SyncQueueItem, LocalRecord, ConflictRecord,
  Excursion, ExcursionStudent, ExcursionCheckpoint, CheckInRecord,
  DiscoveryTask, DiscoveryTaskProgress, StudentCapture, GeoLocation
} from './classroom-excursion.types';

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

export const DB_NAME = 'scholarly_excursion_offline';
export const DB_VERSION = 1;

/**
 * Object store definitions
 */
export const STORES = {
  /** Cached excursion data */
  EXCURSIONS: 'excursions',
  /** Student manifest for excursions */
  STUDENTS: 'students',
  /** Checkpoint definitions */
  CHECKPOINTS: 'checkpoints',
  /** Check-in records (SAFETY CRITICAL) */
  CHECK_INS: 'check_ins',
  /** Discovery tasks */
  TASKS: 'tasks',
  /** Task progress */
  PROGRESS: 'progress',
  /** Student captures */
  CAPTURES: 'captures',
  /** Media blobs */
  MEDIA: 'media',
  /** Sync queue */
  SYNC_QUEUE: 'sync_queue',
  /** Sync metadata */
  SYNC_META: 'sync_meta',
  /** Conflicts awaiting resolution */
  CONFLICTS: 'conflicts'
} as const;

// ============================================================================
// LOCAL RECORD TYPES
// ============================================================================

/**
 * Locally cached excursion
 */
export interface LocalExcursion extends LocalRecord {
  excursionId: string;
  tenantId: string;
  schoolId: string;
  name: string;
  date: Date;
  departureTime: Date;
  expectedReturnTime: Date;
  status: string;
  
  leadTeacher: {
    id: string;
    name: string;
    mobile: string;
  };
  
  staff: {
    id: string;
    name: string;
    mobile: string;
    role: string;
  }[];
  
  emergencyContacts: {
    name: string;
    phone: string;
    role: string;
  }[];
  
  destinations: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    geofenceRadius: number;
  }[];
  
  cachedAt: Date;
}

/**
 * Locally cached student
 */
export interface LocalStudent extends LocalRecord {
  excursionId: string;
  studentId: string;
  studentName: string;
  yearLevel: string;
  classId: string;
  groupId?: string;
  groupName?: string;
  
  photoThumbnail?: string;
  
  medicalInfo: {
    conditions: string[];
    medications: string[];
    allergies: string[];
    dietaryRequirements: string[];
  };
  
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  
  checkInStatus: string;
  lastLocation?: GeoLocation & { timestamp: Date };
}

/**
 * Local check-in record
 */
export interface LocalCheckIn extends LocalRecord {
  excursionId: string;
  checkpointId: string;
  checkpointName: string;
  studentId: string;
  studentName: string;
  
  status: string;
  checkedAt: Date;
  checkedBy: string;
  checkedByName: string;
  method: string;
  
  location?: GeoLocation;
  notes?: string;
  
  // For missing → found tracking
  foundAt?: Date;
  foundBy?: string;
  foundNotes?: string;
}

/**
 * Local capture record
 */
export interface LocalCapture extends LocalRecord {
  excursionId: string;
  taskId: string;
  studentId: string;
  participantType: 'student' | 'group';
  participantId: string;
  
  type: string;
  
  mediaBlobId?: string;
  mediaSize?: number;
  mediaMimeType?: string;
  
  textContent?: string;
  transcription?: string;
  
  caption?: string;
  tags?: string[];
  
  location?: GeoLocation;
  capturedAt: Date;
  
  sensorData?: {
    sensorType: string;
    value: number;
    unit: string;
  };
}

// ============================================================================
// DATABASE CLASS
// ============================================================================

/**
 * Offline database manager
 */
export class OfflineDatabase {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private version: number;

  constructor(dbName: string = DB_NAME, version: number = DB_VERSION) {
    this.dbName = dbName;
    this.version = version;
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineDB] Database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
      };
    });
  }

  /**
   * Create object stores and indexes
   */
  private createStores(db: IDBDatabase): void {
    // Excursions store
    if (!db.objectStoreNames.contains(STORES.EXCURSIONS)) {
      const store = db.createObjectStore(STORES.EXCURSIONS, { keyPath: 'localId' });
      store.createIndex('by_excursion_id', 'excursionId', { unique: true });
    }

    // Students store
    if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
      const store = db.createObjectStore(STORES.STUDENTS, { keyPath: 'localId' });
      store.createIndex('by_excursion', 'excursionId', { unique: false });
      store.createIndex('by_student', ['excursionId', 'studentId'], { unique: true });
      store.createIndex('by_status', ['excursionId', 'checkInStatus'], { unique: false });
    }

    // Checkpoints store
    if (!db.objectStoreNames.contains(STORES.CHECKPOINTS)) {
      const store = db.createObjectStore(STORES.CHECKPOINTS, { keyPath: 'localId' });
      store.createIndex('by_excursion', 'excursionId', { unique: false });
    }

    // Check-ins store (CRITICAL)
    if (!db.objectStoreNames.contains(STORES.CHECK_INS)) {
      const store = db.createObjectStore(STORES.CHECK_INS, { keyPath: 'localId' });
      store.createIndex('by_excursion', 'excursionId', { unique: false });
      store.createIndex('by_student', ['excursionId', 'studentId'], { unique: false });
      store.createIndex('by_checkpoint', ['excursionId', 'checkpointId'], { unique: false });
      store.createIndex('by_sync_status', 'syncStatus', { unique: false });
    }

    // Tasks store
    if (!db.objectStoreNames.contains(STORES.TASKS)) {
      const store = db.createObjectStore(STORES.TASKS, { keyPath: 'localId' });
      store.createIndex('by_excursion', 'excursionId', { unique: false });
    }

    // Progress store
    if (!db.objectStoreNames.contains(STORES.PROGRESS)) {
      const store = db.createObjectStore(STORES.PROGRESS, { keyPath: 'localId' });
      store.createIndex('by_task', ['excursionId', 'taskId'], { unique: false });
      store.createIndex('by_participant', ['excursionId', 'participantId'], { unique: false });
    }

    // Captures store
    if (!db.objectStoreNames.contains(STORES.CAPTURES)) {
      const store = db.createObjectStore(STORES.CAPTURES, { keyPath: 'localId' });
      store.createIndex('by_task', ['excursionId', 'taskId'], { unique: false });
      store.createIndex('by_student', ['excursionId', 'studentId'], { unique: false });
      store.createIndex('by_sync_status', 'syncStatus', { unique: false });
    }

    // Media store (for blobs)
    if (!db.objectStoreNames.contains(STORES.MEDIA)) {
      db.createObjectStore(STORES.MEDIA, { keyPath: 'id' });
    }

    // Sync queue store
    if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
      const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
      store.createIndex('by_priority', 'priority', { unique: false });
      store.createIndex('by_type', 'type', { unique: false });
      store.createIndex('by_created', 'createdAt', { unique: false });
    }

    // Sync metadata store
    if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
      db.createObjectStore(STORES.SYNC_META, { keyPath: 'key' });
    }

    // Conflicts store
    if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
      const store = db.createObjectStore(STORES.CONFLICTS, { keyPath: 'id' });
      store.createIndex('by_entity', ['entityType', 'entityId'], { unique: false });
    }

    console.log('[OfflineDB] Stores created');
  }

  // ==========================================================================
  // GENERIC OPERATIONS
  // ==========================================================================

  /**
   * Get a record by local ID
   */
  async get<T>(store: string, localId: string): Promise<T | null> {
    return this.promisifyRequest<T | null>(
      this.getStore(store, 'readonly').get(localId)
    );
  }

  /**
   * Get all records from a store
   */
  async getAll<T>(store: string): Promise<T[]> {
    return this.promisifyRequest<T[]>(
      this.getStore(store, 'readonly').getAll()
    );
  }

  /**
   * Query by index
   */
  async queryByIndex<T>(store: string, indexName: string, value: IDBValidKey | IDBKeyRange): Promise<T[]> {
    const objectStore = this.getStore(store, 'readonly');
    const index = objectStore.index(indexName);
    return this.promisifyRequest<T[]>(index.getAll(value));
  }

  /**
   * Put a record (insert or update)
   */
  async put<T extends { localId: string }>(store: string, record: T): Promise<void> {
    await this.promisifyRequest(
      this.getStore(store, 'readwrite').put(record)
    );
  }

  /**
   * Put multiple records
   */
  async putBatch<T extends { localId: string }>(store: string, records: T[]): Promise<void> {
    const objectStore = this.getStore(store, 'readwrite');
    for (const record of records) {
      objectStore.put(record);
    }
  }

  /**
   * Delete a record
   */
  async delete(store: string, localId: string): Promise<void> {
    await this.promisifyRequest(
      this.getStore(store, 'readwrite').delete(localId)
    );
  }

  /**
   * Clear all records from a store
   */
  async clear(store: string): Promise<void> {
    await this.promisifyRequest(
      this.getStore(store, 'readwrite').clear()
    );
  }

  /**
   * Count records in a store
   */
  async count(store: string): Promise<number> {
    return this.promisifyRequest<number>(
      this.getStore(store, 'readonly').count()
    );
  }

  // ==========================================================================
  // MEDIA OPERATIONS
  // ==========================================================================

  /**
   * Store a media blob
   */
  async storeMedia(id: string, blob: Blob, metadata?: Record<string, any>): Promise<void> {
    const objectStore = this.getStore(STORES.MEDIA, 'readwrite');
    await this.promisifyRequest(
      objectStore.put({
        id,
        blob,
        size: blob.size,
        type: blob.type,
        metadata,
        storedAt: new Date()
      })
    );
  }

  /**
   * Get a media blob
   */
  async getMedia(id: string): Promise<Blob | null> {
    const result = await this.promisifyRequest<{ blob: Blob } | undefined>(
      this.getStore(STORES.MEDIA, 'readonly').get(id)
    );
    return result?.blob || null;
  }

  /**
   * Delete a media blob
   */
  async deleteMedia(id: string): Promise<void> {
    await this.delete(STORES.MEDIA, id);
  }

  /**
   * Get total media storage used
   */
  async getMediaStorageUsed(): Promise<number> {
    const all = await this.getAll<{ size: number }>(STORES.MEDIA);
    return all.reduce((total, item) => total + (item.size || 0), 0);
  }

  // ==========================================================================
  // SYNC QUEUE OPERATIONS
  // ==========================================================================

  /**
   * Add item to sync queue
   */
  async queueForSync(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'attempts'>): Promise<string> {
    const id = generateLocalId();
    const queueItem: SyncQueueItem = {
      ...item,
      id,
      createdAt: new Date(),
      attempts: 0,
      maxRetries: item.maxRetries || 5
    };
    
    await this.put(STORES.SYNC_QUEUE, { localId: id, ...queueItem });
    return id;
  }

  /**
   * Get pending sync items by priority (highest first)
   */
  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const all = await this.getAll<SyncQueueItem & { localId: string }>(STORES.SYNC_QUEUE);
    return all
      .map(item => ({ ...item, id: item.localId }))
      .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Get sync items by type
   */
  async getSyncItemsByType(type: SyncQueueItem['type']): Promise<SyncQueueItem[]> {
    return this.queryByIndex<SyncQueueItem>(STORES.SYNC_QUEUE, 'by_type', type);
  }

  /**
   * Update sync item after attempt
   */
  async updateSyncItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    const item = await this.get<SyncQueueItem & { localId: string }>(STORES.SYNC_QUEUE, id);
    if (item) {
      await this.put(STORES.SYNC_QUEUE, { ...item, ...updates, localId: id });
    }
  }

  /**
   * Remove from sync queue
   */
  async removeFromSyncQueue(id: string): Promise<void> {
    await this.delete(STORES.SYNC_QUEUE, id);
  }

  /**
   * Get sync queue count
   */
  async getSyncQueueCount(): Promise<{ total: number; byPriority: Record<string, number> }> {
    const items = await this.getPendingSyncItems();
    const byPriority: Record<string, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0
    };
    
    for (const item of items) {
      if (item.priority >= SyncPriority.CRITICAL) byPriority.critical++;
      else if (item.priority >= SyncPriority.HIGH) byPriority.high++;
      else if (item.priority >= SyncPriority.NORMAL) byPriority.normal++;
      else byPriority.low++;
    }
    
    return { total: items.length, byPriority };
  }

  // ==========================================================================
  // SYNC METADATA
  // ==========================================================================

  /**
   * Get sync metadata
   */
  async getSyncMeta(key: string): Promise<any> {
    const result = await this.get<{ key: string; value: any }>(STORES.SYNC_META, key);
    return result?.value;
  }

  /**
   * Set sync metadata
   */
  async setSyncMeta(key: string, value: any): Promise<void> {
    await this.put(STORES.SYNC_META, { localId: key, key, value });
  }

  // ==========================================================================
  // CONFLICT MANAGEMENT
  // ==========================================================================

  /**
   * Record a conflict
   */
  async recordConflict(conflict: Omit<ConflictRecord, 'id' | 'detectedAt'>): Promise<string> {
    const id = generateLocalId();
    await this.put(STORES.CONFLICTS, {
      localId: id,
      ...conflict,
      id,
      detectedAt: new Date()
    });
    return id;
  }

  /**
   * Get unresolved conflicts
   */
  async getUnresolvedConflicts(): Promise<ConflictRecord[]> {
    const all = await this.getAll<ConflictRecord & { localId: string }>(STORES.CONFLICTS);
    return all.filter(c => !c.resolvedAt).map(c => ({ ...c, id: c.localId }));
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    id: string,
    resolution: ConflictRecord['resolution'],
    resolvedBy: string
  ): Promise<void> {
    const conflict = await this.get<ConflictRecord & { localId: string }>(STORES.CONFLICTS, id);
    if (conflict) {
      await this.put(STORES.CONFLICTS, {
        ...conflict,
        resolvedAt: new Date(),
        resolution,
        resolvedBy
      });
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  private promisifyRequest<T>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get storage estimate
   */
  async getStorageEstimate(): Promise<{ used: number; available: number; percentage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const available = estimate.quota || 0;
      return {
        used,
        available,
        percentage: available > 0 ? (used / available) * 100 : 0
      };
    }
    return { used: 0, available: 0, percentage: 0 };
  }

  /**
   * Request persistent storage
   */
  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      return navigator.storage.persist();
    }
    return false;
  }

  /**
   * Check if storage is persistent
   */
  async isStoragePersistent(): Promise<boolean> {
    if ('storage' in navigator && 'persisted' in navigator.storage) {
      return navigator.storage.persisted();
    }
    return false;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique local ID
 */
export function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate an ordered ID (timestamp-based for sorting)
 */
export function generateOrderedId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Create a local record wrapper
 */
export function createLocalRecord<T>(data: T): T & LocalRecord {
  const localId = generateLocalId();
  return {
    ...data,
    localId,
    serverId: null,
    syncStatus: SyncStatus.PENDING,
    localModifiedAt: new Date(),
    syncedAt: null,
    version: 1,
    serverVersion: null
  };
}
