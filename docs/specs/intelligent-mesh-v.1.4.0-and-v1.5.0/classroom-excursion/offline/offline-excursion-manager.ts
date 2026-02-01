/**
 * Offline Excursion Manager
 * 
 * The primary client-side API for offline-first excursion management.
 * Provides a clean interface for the UI to perform excursion operations
 * that work seamlessly whether online or offline.
 * 
 * ## Usage Example
 * 
 * ```typescript
 * // Initialize
 * const manager = new OfflineExcursionManager(config);
 * await manager.initialize();
 * 
 * // Pre-load excursion data before leaving
 * await manager.preloadExcursion(excursionId);
 * 
 * // During excursion (works offline!)
 * await manager.checkInStudent(excursionId, checkpointId, studentId, 'present');
 * await manager.markStudentMissing(excursionId, checkpointId, studentId);
 * await manager.submitCapture(excursionId, taskId, captureData);
 * 
 * // Check sync status
 * const status = await manager.getSyncStatus();
 * console.log(`${status.pendingCount} items pending sync`);
 * ```
 * 
 * @module IntelligenceMesh/ClassroomExcursion/Offline
 * @version 1.0.0
 */

import {
  OfflineDatabase, STORES, generateLocalId, createLocalRecord,
  LocalExcursion, LocalStudent, LocalCheckIn, LocalCapture
} from './offline-database';
import { SyncEngine, ConnectivityMonitor, PreflightLoader, SyncProgress, SyncResult } from './sync-engine';
import {
  SyncStatus, SyncPriority, CheckInStatus, CaptureType, GeoLocation,
  ExcursionStudent, ExcursionCheckpoint, DiscoveryTask, StudentCapture,
  CLASSROOM_EXCURSION_EVENTS
} from '../classroom-excursion.types';

// ============================================================================
// TYPES
// ============================================================================

export interface OfflineManagerConfig {
  /** API base URL */
  apiBaseUrl: string;
  
  /** Function to get auth token */
  getAuthToken: () => Promise<string>;
  
  /** Tenant ID */
  tenantId: string;
  
  /** School ID */
  schoolId: string;
  
  /** Current user ID */
  userId: string;
  
  /** Current user name */
  userName: string;
  
  /** Sync interval when online (ms) */
  syncIntervalMs?: number;
  
  /** Enable SMS fallback for critical alerts */
  enableSMSFallback?: boolean;
  
  /** SMS gateway URL */
  smsGatewayUrl?: string;
  
  /** Health check endpoint */
  healthCheckUrl?: string;
}

export interface CheckInResult {
  success: boolean;
  localId: string;
  syncStatus: SyncStatus;
  studentStatus: CheckInStatus;
}

export interface CaptureResult {
  success: boolean;
  localId: string;
  syncStatus: SyncStatus;
}

export interface MissingStudentAlert {
  excursionId: string;
  checkpointId: string;
  checkpointName: string;
  studentIds: string[];
  studentNames: string[];
  reportedBy: string;
  reportedAt: Date;
  location?: GeoLocation;
}

// ============================================================================
// EVENT EMITTER
// ============================================================================

type EventCallback = (data: any) => void;

class EventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error(`Error in event handler for ${event}:`, e);
      }
    });
  }
}

// ============================================================================
// OFFLINE EXCURSION MANAGER
// ============================================================================

export class OfflineExcursionManager extends EventEmitter {
  private db: OfflineDatabase;
  private syncEngine: SyncEngine;
  private connectivity: ConnectivityMonitor;
  private preflight: PreflightLoader;
  private config: OfflineManagerConfig;
  private initialized: boolean = false;

  constructor(config: OfflineManagerConfig) {
    super();
    this.config = config;
    
    this.db = new OfflineDatabase();
    this.connectivity = new ConnectivityMonitor(
      config.healthCheckUrl || `${config.apiBaseUrl}/health`
    );
    
    const syncConfig = {
      apiBaseUrl: config.apiBaseUrl,
      getAuthToken: config.getAuthToken,
      tenantId: config.tenantId,
      maxConcurrentUploads: 3,
      syncIntervalMs: config.syncIntervalMs || 30000,
      maxRetries: 5,
      baseRetryDelayMs: 1000,
      maxRetryDelayMs: 30000,
      mediaChunkSize: 1024 * 1024,
      enableSMSFallback: config.enableSMSFallback || false,
      smsGatewayUrl: config.smsGatewayUrl
    };
    
    this.syncEngine = new SyncEngine(this.db, syncConfig, this.connectivity);
    this.preflight = new PreflightLoader(this.db, syncConfig);
  }

  /**
   * Initialize the manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await this.db.initialize();
    
    // Set up sync progress events
    this.syncEngine.onProgress((progress) => {
      this.emit('syncProgress', progress);
    });
    
    // Set up connectivity events
    this.connectivity.subscribe((online) => {
      this.emit('connectivityChange', { online });
    });
    
    // Start auto-sync
    this.syncEngine.startAutoSync();
    
    // Start periodic connectivity checks
    this.connectivity.startPeriodicChecks();
    
    this.initialized = true;
    console.log('[OfflineExcursionManager] Initialized');
  }

  // ==========================================================================
  // PREFLIGHT (Before leaving for excursion)
  // ==========================================================================

  /**
   * Pre-load excursion data for offline use
   */
  async preloadExcursion(
    excursionId: string,
    onProgress?: (phase: string, progress: number) => void
  ): Promise<{ success: boolean; error?: string }> {
    return this.preflight.loadExcursionData(excursionId, onProgress);
  }

  /**
   * Check if excursion is ready for offline use
   */
  async isExcursionReady(excursionId: string): Promise<boolean> {
    return this.preflight.isExcursionCached(excursionId);
  }

  // ==========================================================================
  // EXCURSION DATA ACCESS
  // ==========================================================================

  /**
   * Get excursion details
   */
  async getExcursion(excursionId: string): Promise<LocalExcursion | null> {
    const results = await this.db.queryByIndex<LocalExcursion>(
      STORES.EXCURSIONS, 'by_excursion_id', excursionId
    );
    return results[0] || null;
  }

  /**
   * Get students on excursion
   */
  async getStudents(excursionId: string): Promise<LocalStudent[]> {
    return this.db.queryByIndex<LocalStudent>(
      STORES.STUDENTS, 'by_excursion', excursionId
    );
  }

  /**
   * Get student by ID
   */
  async getStudent(excursionId: string, studentId: string): Promise<LocalStudent | null> {
    const results = await this.db.queryByIndex<LocalStudent>(
      STORES.STUDENTS, 'by_student', [excursionId, studentId]
    );
    return results[0] || null;
  }

  /**
   * Get checkpoints
   */
  async getCheckpoints(excursionId: string): Promise<any[]> {
    return this.db.queryByIndex(STORES.CHECKPOINTS, 'by_excursion', excursionId);
  }

  /**
   * Get discovery tasks
   */
  async getTasks(excursionId: string): Promise<any[]> {
    return this.db.queryByIndex(STORES.TASKS, 'by_excursion', excursionId);
  }

  // ==========================================================================
  // CHECK-IN OPERATIONS (Safety Critical)
  // ==========================================================================

  /**
   * Check in a student at a checkpoint
   */
  async checkInStudent(
    excursionId: string,
    checkpointId: string,
    checkpointName: string,
    studentId: string,
    studentName: string,
    status: CheckInStatus,
    options?: {
      method?: 'manual' | 'qr_scan' | 'geofence' | 'nfc';
      location?: GeoLocation;
      notes?: string;
    }
  ): Promise<CheckInResult> {
    const localId = generateLocalId();
    const now = new Date();
    
    const checkIn: LocalCheckIn = createLocalRecord({
      excursionId,
      checkpointId,
      checkpointName,
      studentId,
      studentName,
      status,
      checkedAt: now,
      checkedBy: this.config.userId,
      checkedByName: this.config.userName,
      method: options?.method || 'manual',
      location: options?.location,
      notes: options?.notes
    }) as LocalCheckIn;
    
    // Save locally
    await this.db.put(STORES.CHECK_INS, checkIn);
    
    // Update student status
    const student = await this.getStudent(excursionId, studentId);
    if (student) {
      student.checkInStatus = status;
      student.localModifiedAt = now;
      student.syncStatus = SyncStatus.PENDING;
      if (options?.location) {
        student.lastLocation = { ...options.location, timestamp: now };
      }
      await this.db.put(STORES.STUDENTS, student);
    }
    
    // Queue for sync with HIGH priority
    await this.db.queueForSync({
      type: 'check_in',
      priority: SyncPriority.HIGH,
      entityType: 'check_in',
      entityId: localId,
      payload: checkIn,
      maxRetries: 5
    });
    
    // Emit event
    this.emit(CLASSROOM_EXCURSION_EVENTS.CHECKPOINT_COMPLETED, {
      excursionId,
      checkpointId,
      studentId,
      status
    });
    
    // If online, trigger immediate sync
    if (this.connectivity.isOnline()) {
      this.syncEngine.triggerSync();
    }
    
    return {
      success: true,
      localId,
      syncStatus: SyncStatus.PENDING,
      studentStatus: status
    };
  }

  /**
   * Mark student as MISSING - CRITICAL PRIORITY
   * This will sync immediately if online, or queue with highest priority
   */
  async markStudentMissing(
    excursionId: string,
    checkpointId: string,
    checkpointName: string,
    studentId: string,
    studentName: string,
    location?: GeoLocation
  ): Promise<CheckInResult> {
    const result = await this.checkInStudent(
      excursionId,
      checkpointId,
      checkpointName,
      studentId,
      studentName,
      CheckInStatus.MISSING,
      { location }
    );
    
    // Also create a CRITICAL alert
    const alertId = generateLocalId();
    const alert: MissingStudentAlert = {
      excursionId,
      checkpointId,
      checkpointName,
      studentIds: [studentId],
      studentNames: [studentName],
      reportedBy: this.config.userName,
      reportedAt: new Date(),
      location
    };
    
    // Queue with CRITICAL priority
    await this.db.queueForSync({
      type: 'alert',
      priority: SyncPriority.CRITICAL,
      entityType: 'missing_alert',
      entityId: alertId,
      payload: alert,
      maxRetries: 10 // More retries for critical
    });
    
    // Emit critical event
    this.emit(CLASSROOM_EXCURSION_EVENTS.STUDENTS_MISSING, alert);
    
    // Force immediate sync attempt
    if (this.connectivity.isOnline()) {
      this.syncEngine.forceSync();
    }
    
    return result;
  }

  /**
   * Mark student as found (after being missing)
   */
  async markStudentFound(
    excursionId: string,
    studentId: string,
    studentName: string,
    location?: GeoLocation,
    notes?: string
  ): Promise<CheckInResult> {
    const localId = generateLocalId();
    const now = new Date();
    
    // Create a "found" check-in
    const checkIn: LocalCheckIn = createLocalRecord({
      excursionId,
      checkpointId: `found_${Date.now()}`,
      checkpointName: 'Found After Missing',
      studentId,
      studentName,
      status: CheckInStatus.AT_DESTINATION,
      checkedAt: now,
      checkedBy: this.config.userId,
      checkedByName: this.config.userName,
      method: 'manual',
      location,
      notes,
      foundAt: now,
      foundBy: this.config.userName,
      foundNotes: notes
    }) as LocalCheckIn;
    
    await this.db.put(STORES.CHECK_INS, checkIn);
    
    // Queue with CRITICAL priority (good news is also critical!)
    await this.db.queueForSync({
      type: 'check_in',
      priority: SyncPriority.CRITICAL,
      entityType: 'student_found',
      entityId: localId,
      payload: checkIn,
      maxRetries: 10
    });
    
    this.emit(CLASSROOM_EXCURSION_EVENTS.STUDENT_FOUND, {
      excursionId,
      studentId,
      studentName,
      location
    });
    
    if (this.connectivity.isOnline()) {
      this.syncEngine.forceSync();
    }
    
    return {
      success: true,
      localId,
      syncStatus: SyncStatus.PENDING,
      studentStatus: CheckInStatus.AT_DESTINATION
    };
  }

  /**
   * Perform a complete checkpoint roll call
   */
  async checkpointRollCall(
    excursionId: string,
    checkpointId: string,
    checkpointName: string,
    checkIns: { studentId: string; studentName: string; status: CheckInStatus }[],
    location?: GeoLocation
  ): Promise<{
    success: boolean;
    presentCount: number;
    missingStudents: string[];
    missingNames: string[];
  }> {
    const results = [];
    const missingStudents: string[] = [];
    const missingNames: string[] = [];
    
    for (const checkIn of checkIns) {
      const result = await this.checkInStudent(
        excursionId,
        checkpointId,
        checkpointName,
        checkIn.studentId,
        checkIn.studentName,
        checkIn.status,
        { location }
      );
      results.push(result);
      
      if (checkIn.status === CheckInStatus.MISSING) {
        missingStudents.push(checkIn.studentId);
        missingNames.push(checkIn.studentName);
      }
    }
    
    // If any missing, create bulk alert
    if (missingStudents.length > 0) {
      const alertId = generateLocalId();
      const alert: MissingStudentAlert = {
        excursionId,
        checkpointId,
        checkpointName,
        studentIds: missingStudents,
        studentNames: missingNames,
        reportedBy: this.config.userName,
        reportedAt: new Date(),
        location
      };
      
      await this.db.queueForSync({
        type: 'alert',
        priority: SyncPriority.CRITICAL,
        entityType: 'missing_alert',
        entityId: alertId,
        payload: alert,
        maxRetries: 10
      });
      
      this.emit(CLASSROOM_EXCURSION_EVENTS.STUDENTS_MISSING, alert);
    }
    
    const presentCount = checkIns.filter(c => 
      c.status !== CheckInStatus.MISSING && 
      c.status !== CheckInStatus.NOT_CHECKED_IN
    ).length;
    
    return {
      success: true,
      presentCount,
      missingStudents,
      missingNames
    };
  }

  /**
   * Quick head count
   */
  async quickHeadCount(
    excursionId: string,
    actualCount: number,
    location?: GeoLocation
  ): Promise<{
    expectedCount: number;
    actualCount: number;
    discrepancy: number;
    alert: boolean;
  }> {
    const students = await this.getStudents(excursionId);
    const expectedCount = students.filter(s => 
      s.checkInStatus !== CheckInStatus.EARLY_DEPARTURE
    ).length;
    
    const discrepancy = expectedCount - actualCount;
    const alert = discrepancy !== 0;
    
    if (alert) {
      this.emit(CLASSROOM_EXCURSION_EVENTS.HEAD_COUNT_DISCREPANCY, {
        excursionId,
        expectedCount,
        actualCount,
        discrepancy,
        location,
        reportedBy: this.config.userName
      });
    }
    
    return {
      expectedCount,
      actualCount,
      discrepancy,
      alert
    };
  }

  // ==========================================================================
  // DISCOVERY & CAPTURE OPERATIONS
  // ==========================================================================

  /**
   * Submit a capture (photo, note, etc.)
   */
  async submitCapture(
    excursionId: string,
    taskId: string,
    studentId: string,
    type: CaptureType,
    data: {
      mediaBlob?: Blob;
      textContent?: string;
      caption?: string;
      tags?: string[];
      location?: GeoLocation;
      sensorData?: { sensorType: string; value: number; unit: string };
    }
  ): Promise<CaptureResult> {
    const localId = generateLocalId();
    const now = new Date();
    
    // If media, store blob separately
    let mediaBlobId: string | undefined;
    if (data.mediaBlob) {
      mediaBlobId = `media_${localId}`;
      await this.db.storeMedia(mediaBlobId, data.mediaBlob);
    }
    
    const capture: LocalCapture = createLocalRecord({
      excursionId,
      taskId,
      studentId,
      participantType: 'student',
      participantId: studentId,
      type,
      mediaBlobId,
      mediaSize: data.mediaBlob?.size,
      mediaMimeType: data.mediaBlob?.type,
      textContent: data.textContent,
      caption: data.caption,
      tags: data.tags,
      location: data.location,
      capturedAt: now,
      sensorData: data.sensorData
    }) as LocalCapture;
    
    await this.db.put(STORES.CAPTURES, capture);
    
    // Queue for sync with NORMAL priority
    await this.db.queueForSync({
      type: 'capture',
      priority: SyncPriority.NORMAL,
      entityType: 'capture',
      entityId: localId,
      payload: {
        ...capture,
        // Don't include blob in sync payload - will be uploaded separately
        mediaBlobId: mediaBlobId
      },
      maxRetries: 3
    });
    
    this.emit(CLASSROOM_EXCURSION_EVENTS.CAPTURE_SUBMITTED, {
      excursionId,
      taskId,
      studentId,
      type,
      localId
    });
    
    return {
      success: true,
      localId,
      syncStatus: SyncStatus.PENDING
    };
  }

  /**
   * Get captures for a task
   */
  async getCapturesForTask(excursionId: string, taskId: string): Promise<LocalCapture[]> {
    return this.db.queryByIndex<LocalCapture>(
      STORES.CAPTURES, 'by_task', [excursionId, taskId]
    );
  }

  /**
   * Get media blob for a capture
   */
  async getCaptureMedia(mediaBlobId: string): Promise<Blob | null> {
    return this.db.getMedia(mediaBlobId);
  }

  // ==========================================================================
  // SYNC STATUS & CONTROL
  // ==========================================================================

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    lastSync: string | null;
    pendingCount: number;
    criticalPending: number;
    queueBreakdown: Record<string, number>;
  }> {
    const status = await this.syncEngine.getSyncStatus();
    const queueCount = await this.db.getSyncQueueCount();
    
    return {
      ...status,
      queueBreakdown: queueCount.byPriority
    };
  }

  /**
   * Force a sync attempt
   */
  async forceSync(): Promise<SyncResult> {
    return this.syncEngine.forceSync();
  }

  /**
   * Check if we're online
   */
  isOnline(): boolean {
    return this.connectivity.isOnline();
  }

  /**
   * Get storage usage
   */
  async getStorageUsage(): Promise<{
    used: number;
    available: number;
    percentage: number;
    mediaUsed: number;
  }> {
    const estimate = await this.db.getStorageEstimate();
    const mediaUsed = await this.db.getMediaStorageUsed();
    
    return {
      ...estimate,
      mediaUsed
    };
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clear all data for an excursion (after it's completed)
   */
  async clearExcursionData(excursionId: string): Promise<void> {
    await this.preflight.clearExcursionCache(excursionId);
    
    // Clear check-ins
    const checkIns = await this.db.queryByIndex<LocalCheckIn>(
      STORES.CHECK_INS, 'by_excursion', excursionId
    );
    for (const ci of checkIns) {
      await this.db.delete(STORES.CHECK_INS, ci.localId);
    }
    
    // Clear captures and their media
    const captures = await this.db.queryByIndex<LocalCapture>(
      STORES.CAPTURES, 'by_task', excursionId
    );
    for (const cap of captures) {
      if (cap.mediaBlobId) {
        await this.db.deleteMedia(cap.mediaBlobId);
      }
      await this.db.delete(STORES.CAPTURES, cap.localId);
    }
    
    console.log(`[OfflineExcursionManager] Cleared data for excursion ${excursionId}`);
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    this.syncEngine.destroy();
    this.connectivity.stopPeriodicChecks();
    this.db.close();
  }
}
