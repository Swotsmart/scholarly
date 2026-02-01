/**
 * Classroom & Excursion Module
 * 
 * Extends the Intelligence Mesh with:
 * - AI-Assisted Roll Call
 * - Dynamic Seating Arrangements
 * - Real-Time Help Requests
 * - Offline-Capable Excursion Management
 * - Outdoor Discovery & Capture
 * - Lesson Feedback & School Pulse
 * 
 * @module IntelligenceMesh/ClassroomExcursion
 * @version 1.0.0
 */

// Types
export * from './classroom-excursion.types';

// Offline Layer
export { 
  OfflineDatabase, 
  STORES,
  generateLocalId,
  generateOrderedId,
  createLocalRecord,
  type LocalExcursion,
  type LocalStudent,
  type LocalCheckIn,
  type LocalCapture
} from './offline/offline-database';

export {
  SyncEngine,
  ConnectivityMonitor,
  PreflightLoader,
  type SyncConfig,
  type SyncResult,
  type SyncProgress
} from './offline/sync-engine';

export {
  OfflineExcursionManager,
  type OfflineManagerConfig,
  type CheckInResult,
  type CaptureResult,
  type MissingStudentAlert
} from './offline/offline-excursion-manager';

// Discovery Components
export {
  useOfflineExcursion,
  useGeolocation,
  SyncStatusIndicator,
  PhotoCapture,
  VoiceMemo,
  TextNote,
  TaskCard,
  DiscoveryApp
} from './discovery/discovery-components';
