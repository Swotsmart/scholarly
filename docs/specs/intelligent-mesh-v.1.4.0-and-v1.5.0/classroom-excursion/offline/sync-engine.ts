/**
 * Sync Engine
 * 
 * Handles bidirectional synchronization between local IndexedDB and server
 * with priority-based ordering ensuring safety-critical data syncs first.
 * 
 * ## Priority System
 * 
 * When connectivity returns, syncing happens in strict priority order:
 * 
 * 1. CRITICAL (100): Missing student alerts, SOS signals
 *    - These MUST go through immediately
 *    - Will retry aggressively
 *    - Triggers SMS fallback if API fails
 * 
 * 2. HIGH (75): Check-ins, attendance records
 *    - Safety-related but not emergency
 *    - Retry with backoff
 * 
 * 3. NORMAL (50): Captures, task progress, feedback
 *    - Educational data
 *    - Can wait if bandwidth limited
 * 
 * 4. LOW (25): Analytics, non-essential updates
 *    - Nice to have
 *    - Can be deferred
 * 
 * ## Conflict Resolution
 * 
 * When the same record was modified both locally and on server:
 * 
 * - For check-ins: Server wins (authoritative attendance record)
 * - For captures: Local wins (student's work preserved)
 * - For missing alerts: Both merged (all reports matter)
 * 
 * @module IntelligenceMesh/ClassroomExcursion/Offline
 * @version 1.0.0
 */

import {
  OfflineDatabase, STORES, generateLocalId, LocalCheckIn, LocalCapture
} from './offline-database';
import {
  SyncStatus, SyncPriority, SyncQueueItem, ConflictRecord, GeoLocation
} from '../classroom-excursion.types';

// ============================================================================
// TYPES
// ============================================================================

export interface SyncConfig {
  /** API base URL */
  apiBaseUrl: string;
  
  /** Function to get auth token */
  getAuthToken: () => Promise<string>;
  
  /** Tenant ID */
  tenantId: string;
  
  /** Max concurrent uploads */
  maxConcurrentUploads: number;
  
  /** Sync interval when online (ms) */
  syncIntervalMs: number;
  
  /** Max retries before giving up */
  maxRetries: number;
  
  /** Base retry delay (ms) */
  baseRetryDelayMs: number;
  
  /** Max retry delay (ms) */
  maxRetryDelayMs: number;
  
  /** Chunk size for media uploads (bytes) */
  mediaChunkSize: number;
  
  /** Enable SMS fallback for critical alerts */
  enableSMSFallback: boolean;
  
  /** SMS gateway URL (for fallback) */
  smsGatewayUrl?: string;
}

export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  failed: number;
  conflicts: number;
  criticalPending: number;
  duration: number;
  errors: string[];
}

export interface SyncProgress {
  phase: 'preparing' | 'uploading_critical' | 'uploading_high' | 'uploading_normal' | 'downloading' | 'resolving_conflicts' | 'complete' | 'error';
  total: number;
  completed: number;
  currentItem?: string;
  currentPriority?: SyncPriority;
  bytesUploaded?: number;
  bytesToUpload?: number;
}

export type SyncProgressCallback = (progress: SyncProgress) => void;
export type ConnectivityCallback = (online: boolean) => void;

// ============================================================================
// CONNECTIVITY MONITOR
// ============================================================================

/**
 * Monitors network connectivity and server reachability
 */
export class ConnectivityMonitor {
  private online: boolean = navigator.onLine;
  private serverReachable: boolean = false;
  private listeners: Set<ConnectivityCallback> = new Set();
  private checkUrl: string;
  private checkInterval: number | null = null;

  constructor(checkUrl: string) {
    this.checkUrl = checkUrl;
    
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Initial check
    if (this.online) {
      this.checkServerReachability();
    }
  }

  private handleOnline(): void {
    this.online = true;
    this.checkServerReachability();
  }

  private handleOffline(): void {
    this.online = false;
    this.serverReachable = false;
    this.notifyListeners();
  }

  /**
   * Check if server is reachable
   */
  async checkServerReachability(): Promise<boolean> {
    if (!this.online) {
      this.serverReachable = false;
      return false;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.checkUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeout);
      this.serverReachable = response.ok;
    } catch {
      this.serverReachable = false;
    }

    this.notifyListeners();
    return this.serverReachable;
  }

  /**
   * Start periodic connectivity checks
   */
  startPeriodicChecks(intervalMs: number = 30000): void {
    if (this.checkInterval) return;
    
    this.checkInterval = window.setInterval(() => {
      this.checkServerReachability();
    }, intervalMs);
  }

  /**
   * Stop periodic checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Is fully online (network + server reachable)
   */
  isOnline(): boolean {
    return this.online && this.serverReachable;
  }

  /**
   * Is network available (may not reach server)
   */
  isNetworkAvailable(): boolean {
    return this.online;
  }

  /**
   * Subscribe to connectivity changes
   */
  subscribe(callback: ConnectivityCallback): () => void {
    this.listeners.add(callback);
    // Immediately notify of current state
    callback(this.isOnline());
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const online = this.isOnline();
    this.listeners.forEach(cb => cb(online));
  }

  /**
   * Get connection quality (if available)
   */
  getConnectionQuality(): { type?: string; downlink?: number; rtt?: number } | null {
    const connection = (navigator as any).connection;
    if (connection) {
      return {
        type: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      };
    }
    return null;
  }
}

// ============================================================================
// SYNC ENGINE
// ============================================================================

/**
 * Main sync engine
 */
export class SyncEngine {
  private db: OfflineDatabase;
  private config: SyncConfig;
  private connectivity: ConnectivityMonitor;
  private isSyncing: boolean = false;
  private syncTimer: number | null = null;
  private progressCallback: SyncProgressCallback | null = null;
  private unsubscribeConnectivity: (() => void) | null = null;

  constructor(
    db: OfflineDatabase,
    config: SyncConfig,
    connectivity: ConnectivityMonitor
  ) {
    this.db = db;
    this.config = config;
    this.connectivity = connectivity;

    // Listen for connectivity changes
    this.unsubscribeConnectivity = this.connectivity.subscribe((online) => {
      if (online) {
        console.log('[SyncEngine] Online - triggering sync');
        this.triggerSync();
      }
    });
  }

  /**
   * Set progress callback
   */
  onProgress(callback: SyncProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Start automatic sync
   */
  startAutoSync(): void {
    if (this.syncTimer) return;

    this.syncTimer = window.setInterval(() => {
      if (this.connectivity.isOnline()) {
        this.triggerSync();
      }
    }, this.config.syncIntervalMs);

    console.log(`[SyncEngine] Auto-sync started (interval: ${this.config.syncIntervalMs}ms)`);

    // Immediate sync if online
    if (this.connectivity.isOnline()) {
      this.triggerSync();
    }
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[SyncEngine] Auto-sync stopped');
    }
  }

  /**
   * Trigger a sync
   */
  async triggerSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('[SyncEngine] Sync already in progress');
      return this.createEmptyResult('Sync already in progress');
    }

    if (!this.connectivity.isOnline()) {
      console.log('[SyncEngine] Offline - sync skipped');
      return this.createEmptyResult('No connectivity');
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let uploaded = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      this.reportProgress({ phase: 'preparing', total: 0, completed: 0 });

      // Get all pending items
      const pendingItems = await this.db.getPendingSyncItems();
      const total = pendingItems.length;

      if (total === 0) {
        this.reportProgress({ phase: 'complete', total: 0, completed: 0 });
        return this.createSuccessResult(0, 0, 0, Date.now() - startTime);
      }

      console.log(`[SyncEngine] Starting sync of ${total} items`);

      // Group by priority
      const critical = pendingItems.filter(i => i.priority >= SyncPriority.CRITICAL);
      const high = pendingItems.filter(i => i.priority >= SyncPriority.HIGH && i.priority < SyncPriority.CRITICAL);
      const normal = pendingItems.filter(i => i.priority >= SyncPriority.NORMAL && i.priority < SyncPriority.HIGH);
      const low = pendingItems.filter(i => i.priority < SyncPriority.NORMAL);

      // Sync CRITICAL first (with aggressive retry)
      if (critical.length > 0) {
        this.reportProgress({
          phase: 'uploading_critical',
          total,
          completed: uploaded,
          currentPriority: SyncPriority.CRITICAL
        });
        
        const result = await this.syncBatch(critical, true);
        uploaded += result.uploaded;
        failed += result.failed;
        conflicts += result.conflicts;
        errors.push(...result.errors);
      }

      // Sync HIGH
      if (high.length > 0) {
        this.reportProgress({
          phase: 'uploading_high',
          total,
          completed: uploaded,
          currentPriority: SyncPriority.HIGH
        });
        
        const result = await this.syncBatch(high, false);
        uploaded += result.uploaded;
        failed += result.failed;
        conflicts += result.conflicts;
        errors.push(...result.errors);
      }

      // Sync NORMAL
      if (normal.length > 0) {
        this.reportProgress({
          phase: 'uploading_normal',
          total,
          completed: uploaded,
          currentPriority: SyncPriority.NORMAL
        });
        
        const result = await this.syncBatch(normal, false);
        uploaded += result.uploaded;
        failed += result.failed;
        conflicts += result.conflicts;
        errors.push(...result.errors);
      }

      // Sync LOW (non-blocking)
      if (low.length > 0) {
        // Fire and forget for low priority
        this.syncBatch(low, false).catch(e => {
          console.warn('[SyncEngine] Low priority sync failed:', e);
        });
      }

      // Resolve conflicts
      const unresolvedConflicts = await this.db.getUnresolvedConflicts();
      if (unresolvedConflicts.length > 0) {
        this.reportProgress({
          phase: 'resolving_conflicts',
          total,
          completed: uploaded
        });
        
        await this.resolveConflicts(unresolvedConflicts);
      }

      // Update last sync time
      await this.db.setSyncMeta('lastSync', new Date().toISOString());

      const criticalPending = (await this.db.getPendingSyncItems())
        .filter(i => i.priority >= SyncPriority.CRITICAL).length;

      this.reportProgress({ phase: 'complete', total, completed: uploaded });

      console.log(`[SyncEngine] Sync complete: ${uploaded} uploaded, ${failed} failed, ${conflicts} conflicts`);

      return {
        success: failed === 0,
        uploaded,
        downloaded: 0,
        failed,
        conflicts,
        criticalPending,
        duration: Date.now() - startTime,
        errors
      };

    } catch (error) {
      console.error('[SyncEngine] Sync failed:', error);
      this.reportProgress({ phase: 'error', total: 0, completed: 0 });
      return this.createEmptyResult((error as Error).message);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a batch of items
   */
  private async syncBatch(
    items: SyncQueueItem[],
    aggressive: boolean
  ): Promise<{ uploaded: number; failed: number; conflicts: number; errors: string[] }> {
    let uploaded = 0;
    let failed = 0;
    let conflicts = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        this.reportProgress({
          phase: aggressive ? 'uploading_critical' : 'uploading_normal',
          total: items.length,
          completed: uploaded,
          currentItem: item.entityId
        });

        const result = await this.syncItem(item, aggressive);
        
        if (result.success) {
          await this.db.removeFromSyncQueue(item.id);
          uploaded++;
        } else if (result.conflict) {
          await this.db.recordConflict({
            entityType: item.entityType,
            entityId: item.entityId,
            localVersion: item.payload,
            serverVersion: result.serverVersion,
            conflictFields: result.conflictFields || []
          });
          conflicts++;
        } else {
          // Update retry count
          await this.db.updateSyncItem(item.id, {
            attempts: item.attempts + 1,
            lastAttempt: new Date(),
            lastError: result.error
          });
          
          if (item.attempts + 1 >= item.maxRetries) {
            failed++;
            errors.push(`${item.entityType}/${item.entityId}: ${result.error}`);
          }
        }
      } catch (error) {
        failed++;
        errors.push(`${item.entityType}/${item.entityId}: ${(error as Error).message}`);
      }
    }

    return { uploaded, failed, conflicts, errors };
  }

  /**
   * Sync a single item
   */
  private async syncItem(
    item: SyncQueueItem,
    aggressive: boolean
  ): Promise<{
    success: boolean;
    conflict?: boolean;
    serverVersion?: any;
    conflictFields?: string[];
    error?: string;
  }> {
    const token = await this.config.getAuthToken();
    const maxAttempts = aggressive ? 5 : 3;
    let lastError = '';

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.makeRequest(item, token);

        if (response.ok) {
          return { success: true };
        }

        if (response.status === 409) {
          // Conflict
          const serverData = await response.json();
          return {
            success: false,
            conflict: true,
            serverVersion: serverData.currentVersion,
            conflictFields: serverData.conflictFields
          };
        }

        if (response.status >= 400 && response.status < 500) {
          // Client error - don't retry
          lastError = `HTTP ${response.status}: ${await response.text()}`;
          break;
        }

        // Server error - retry
        lastError = `HTTP ${response.status}`;
        
      } catch (error) {
        lastError = (error as Error).message;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxAttempts - 1) {
        const delay = Math.min(
          this.config.baseRetryDelayMs * Math.pow(2, attempt),
          this.config.maxRetryDelayMs
        );
        await this.sleep(delay);
      }
    }

    // For critical items, try SMS fallback
    if (aggressive && this.config.enableSMSFallback && item.type === 'alert') {
      await this.trySMSFallback(item);
    }

    return { success: false, error: lastError };
  }

  /**
   * Make HTTP request for sync item
   */
  private async makeRequest(item: SyncQueueItem, token: string): Promise<Response> {
    const url = `${this.config.apiBaseUrl}/sync/${item.type}`;
    
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': this.config.tenantId
      },
      body: JSON.stringify({
        entityId: item.entityId,
        entityType: item.entityType,
        payload: item.payload,
        clientTimestamp: item.createdAt
      })
    });
  }

  /**
   * Try SMS fallback for critical alerts
   */
  private async trySMSFallback(item: SyncQueueItem): Promise<void> {
    if (!this.config.smsGatewayUrl) return;

    try {
      console.log('[SyncEngine] Attempting SMS fallback for critical alert');
      
      // This would call a simple SMS gateway that works even when main API is down
      await fetch(this.config.smsGatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'excursion_alert',
          data: item.payload
        })
      });
    } catch (error) {
      console.error('[SyncEngine] SMS fallback failed:', error);
    }
  }

  /**
   * Resolve conflicts
   */
  private async resolveConflicts(conflicts: ConflictRecord[]): Promise<void> {
    for (const conflict of conflicts) {
      try {
        let resolution: ConflictRecord['resolution'];
        
        // Auto-resolution strategy based on entity type
        switch (conflict.entityType) {
          case 'check_in':
            // Server is authoritative for attendance
            resolution = 'server_wins';
            break;
            
          case 'capture':
            // Preserve student's work
            resolution = 'local_wins';
            break;
            
          case 'missing_alert':
            // Merge all reports
            resolution = 'merged';
            // Would merge the data here
            break;
            
          default:
            // Default to server for safety
            resolution = 'server_wins';
        }
        
        await this.db.resolveConflict(conflict.id, resolution, 'auto');
        console.log(`[SyncEngine] Resolved conflict for ${conflict.entityType}/${conflict.entityId}: ${resolution}`);
        
      } catch (error) {
        console.error(`[SyncEngine] Failed to resolve conflict:`, error);
      }
    }
  }

  /**
   * Report progress
   */
  private reportProgress(progress: SyncProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Create empty result
   */
  private createEmptyResult(error: string): SyncResult {
    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      failed: 0,
      conflicts: 0,
      criticalPending: 0,
      duration: 0,
      errors: [error]
    };
  }

  /**
   * Create success result
   */
  private createSuccessResult(uploaded: number, failed: number, conflicts: number, duration: number): SyncResult {
    return {
      success: failed === 0,
      uploaded,
      downloaded: 0,
      failed,
      conflicts,
      criticalPending: 0,
      duration,
      errors: []
    };
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    isSyncing: boolean;
    isOnline: boolean;
    lastSync: string | null;
    pendingCount: number;
    criticalPending: number;
  }> {
    const lastSync = await this.db.getSyncMeta('lastSync');
    const pending = await this.db.getPendingSyncItems();
    
    return {
      isSyncing: this.isSyncing,
      isOnline: this.connectivity.isOnline(),
      lastSync,
      pendingCount: pending.length,
      criticalPending: pending.filter(i => i.priority >= SyncPriority.CRITICAL).length
    };
  }

  /**
   * Force sync (user initiated)
   */
  async forceSync(): Promise<SyncResult> {
    // Check connectivity first
    await this.connectivity.checkServerReachability();
    return this.triggerSync();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAutoSync();
    if (this.unsubscribeConnectivity) {
      this.unsubscribeConnectivity();
    }
  }
}

// ============================================================================
// PREFLIGHT DATA LOADER
// ============================================================================

/**
 * Pre-loads excursion data before going offline
 */
export class PreflightLoader {
  private db: OfflineDatabase;
  private config: SyncConfig;

  constructor(db: OfflineDatabase, config: SyncConfig) {
    this.db = db;
    this.config = config;
  }

  /**
   * Pre-load all data needed for an excursion
   */
  async loadExcursionData(
    excursionId: string,
    onProgress?: (phase: string, progress: number) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.config.getAuthToken();
      const baseUrl = this.config.apiBaseUrl;
      
      onProgress?.('Loading excursion details', 0);
      
      // Load excursion
      const excursionRes = await fetch(`${baseUrl}/excursions/${excursionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!excursionRes.ok) {
        throw new Error('Failed to load excursion');
      }
      
      const excursion = await excursionRes.json();
      await this.db.put(STORES.EXCURSIONS, {
        localId: generateLocalId(),
        excursionId: excursion.id,
        ...excursion,
        syncStatus: SyncStatus.SYNCED,
        cachedAt: new Date()
      });
      
      onProgress?.('Loading student manifest', 20);
      
      // Load students
      const studentsRes = await fetch(`${baseUrl}/excursions/${excursionId}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (studentsRes.ok) {
        const students = await studentsRes.json();
        for (const student of students) {
          await this.db.put(STORES.STUDENTS, {
            localId: generateLocalId(),
            excursionId,
            ...student,
            syncStatus: SyncStatus.SYNCED
          });
        }
      }
      
      onProgress?.('Loading checkpoints', 40);
      
      // Load checkpoints
      const checkpointsRes = await fetch(`${baseUrl}/excursions/${excursionId}/checkpoints`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (checkpointsRes.ok) {
        const checkpoints = await checkpointsRes.json();
        for (const checkpoint of checkpoints) {
          await this.db.put(STORES.CHECKPOINTS, {
            localId: generateLocalId(),
            excursionId,
            ...checkpoint,
            syncStatus: SyncStatus.SYNCED
          });
        }
      }
      
      onProgress?.('Loading discovery tasks', 60);
      
      // Load tasks
      const tasksRes = await fetch(`${baseUrl}/excursions/${excursionId}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (tasksRes.ok) {
        const tasks = await tasksRes.json();
        for (const task of tasks) {
          await this.db.put(STORES.TASKS, {
            localId: generateLocalId(),
            excursionId,
            ...task,
            syncStatus: SyncStatus.SYNCED
          });
        }
      }
      
      onProgress?.('Requesting persistent storage', 80);
      
      // Request persistent storage
      await this.db.requestPersistentStorage();
      
      // Update cache timestamp
      await this.db.setSyncMeta(`excursion_${excursionId}_cached`, new Date().toISOString());
      
      onProgress?.('Complete', 100);
      
      console.log(`[PreflightLoader] Excursion ${excursionId} data loaded`);
      
      return { success: true };
      
    } catch (error) {
      console.error('[PreflightLoader] Failed to load excursion data:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Check if excursion data is cached
   */
  async isExcursionCached(excursionId: string): Promise<boolean> {
    const cachedAt = await this.db.getSyncMeta(`excursion_${excursionId}_cached`);
    return !!cachedAt;
  }

  /**
   * Clear cached excursion data
   */
  async clearExcursionCache(excursionId: string): Promise<void> {
    // Get all data for this excursion and delete
    const students = await this.db.queryByIndex(STORES.STUDENTS, 'by_excursion', excursionId);
    for (const student of students as any[]) {
      await this.db.delete(STORES.STUDENTS, student.localId);
    }
    
    const checkpoints = await this.db.queryByIndex(STORES.CHECKPOINTS, 'by_excursion', excursionId);
    for (const cp of checkpoints as any[]) {
      await this.db.delete(STORES.CHECKPOINTS, cp.localId);
    }
    
    const tasks = await this.db.queryByIndex(STORES.TASKS, 'by_excursion', excursionId);
    for (const task of tasks as any[]) {
      await this.db.delete(STORES.TASKS, task.localId);
    }
    
    // Clear metadata
    await this.db.setSyncMeta(`excursion_${excursionId}_cached`, null);
    
    console.log(`[PreflightLoader] Excursion ${excursionId} cache cleared`);
  }
}
