/**
 * Intelligence Mesh v1.5.0 - Unified Learning Nexus
 * 
 * A comprehensive educational platform that weaves enrollment, attendance,
 * assessment, and gradebook into an intelligent fabric where every module
 * shares data to build holistic student profiles and enable early intervention.
 * 
 * ## Architecture
 * 
 * The Intelligence Mesh consists of six interconnected domains:
 * 
 * 1. **Enrollment** - Application through Knowledge Graph seeding
 * 2. **Attendance** - Daily presence with AI pattern detection
 * 3. **Assessment** - Dual-mode evaluation with AI marking
 * 4. **Gradebook** - Standards-based grading with AI narratives
 * 5. **Wellbeing** - Student support tracking (v1.6.0)
 * 6. **Parent Portal** - Family engagement layer (v1.6.0)
 * 
 * ## Cross-Module Intelligence
 * 
 * Events flow between modules via NATS, enabling:
 * - Attendance patterns correlate with assessment performance
 * - Grade drops trigger wellbeing signals
 * - Mastery updates feed the Learner Intelligence System
 * 
 * @module IntelligenceMesh
 * @version 1.5.0
 */

// ============================================================================
// SHARED TYPES & EVENTS
// ============================================================================

export * from './shared/mesh-types';
export * from './events/mesh-events';

// ============================================================================
// ENROLLMENT MODULE
// ============================================================================

export { EnrollmentService } from './enrollment/enrollment.service';
export { createEnrollmentRoutes } from './enrollment/enrollment.routes';
export { FormBuilderService } from './enrollment/form-builder.service';
export { createFormBuilderRoutes } from './enrollment/form-builder.routes';
export * from './enrollment/form-builder.types';

// Offline capabilities
export { OfflineStorageManager, SyncManager } from './enrollment/offline-storage';
export { registerServiceWorker, ServiceWorkerManager } from './enrollment/service-worker';
export { OfflineProvider, useOfflineForm, OfflineIndicator, SyncStatus, AutoSaveIndicator } from './enrollment/offline-react';

// ============================================================================
// ATTENDANCE MODULE
// ============================================================================

export { AttendanceService } from './attendance/attendance.service';
export { createAttendanceRoutes } from './attendance/attendance.routes';

// ============================================================================
// CLASSROOM & EXCURSION MODULE
// ============================================================================

export * from './classroom-excursion/classroom-excursion.types';
export { OfflineExcursionManager } from './classroom-excursion/offline/offline-excursion-manager';
export { OfflineDatabase } from './classroom-excursion/offline/offline-database';
export { ExcursionSyncEngine } from './classroom-excursion/offline/sync-engine';
export { DiscoveryCapture, SpeciesIdentifier, NatureJournal, QuickCapture } from './classroom-excursion/discovery/discovery-components';

// ============================================================================
// ASSESSMENT MODULE (v1.5.0)
// ============================================================================

export * from './assessment/assessment.types';
export { AssessmentService } from './assessment/assessment.service';
export { createAssessmentRoutes } from './assessment/assessment.routes';

// ============================================================================
// GRADEBOOK MODULE (v1.5.0)
// ============================================================================

export * from './gradebook/gradebook.types';
export { GradebookService } from './gradebook/gradebook.service';
export { createGradebookRoutes } from './gradebook/gradebook.routes';

// ============================================================================
// VERSION & MODULE REGISTRY
// ============================================================================

export const MESH_VERSION = '1.5.0';

export const MESH_MODULES = {
  enrollment: { version: '1.4.1', status: 'stable' },
  attendance: { version: '1.4.1', status: 'stable' },
  classroom: { version: '1.4.1', status: 'stable' },
  assessment: { version: '1.5.0', status: 'stable' },
  gradebook: { version: '1.5.0', status: 'stable' },
  wellbeing: { version: '1.6.0', status: 'preview' },
  parentPortal: { version: '1.6.0', status: 'preview' }
} as const;

export const MODULE_DEPENDENCIES = {
  enrollment: [],
  attendance: ['enrollment'],
  classroom: ['attendance'],
  assessment: ['enrollment'],
  gradebook: ['assessment'],
  wellbeing: ['attendance', 'assessment', 'gradebook'],
  parentPortal: ['enrollment', 'attendance', 'assessment', 'gradebook']
} as const;
