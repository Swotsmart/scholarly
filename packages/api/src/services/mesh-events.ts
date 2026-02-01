/**
 * Intelligence Mesh - Event Taxonomy
 *
 * Defines the complete event vocabulary for the Intelligence Mesh, enabling
 * loose coupling between modules while ensuring comprehensive data flow for
 * cross-module intelligence synthesis.
 *
 * ## The Granny Explanation
 *
 * Imagine you're in a big family house where everyone needs to know what's
 * happening to help each other effectively:
 *
 * - When Grandma notices a child looking unwell (wellbeing), she shouts to the
 *   kitchen so someone can prepare soup (response), and mentions it to Mum who
 *   was expecting the child at piano practice (attendance).
 *
 * - When Dad sees the child struggling with homework (assessment), he mentions
 *   it at dinner so everyone's aware, and Grandpa offers to help tomorrow since
 *   he was a maths teacher (intervention).
 *
 * The Intelligence Mesh works the same way: when something happens in one
 * domain, it "announces" it so other domains can respond appropriately. The
 * event system is how these announcements flow - ensuring nothing falls through
 * the cracks and everyone has the information they need.
 *
 * ## Event Categories
 *
 * Events are organised into six domain namespaces plus a cross-cutting mesh
 * namespace for synthesised intelligence:
 *
 * - `scholarly.enrollment.*`  - Application and enrollment lifecycle
 * - `scholarly.attendance.*`  - Daily presence and absence events
 * - `scholarly.assessment.*`  - Learning evidence and mastery
 * - `scholarly.gradebook.*`   - Achievement recording and reporting
 * - `scholarly.wellbeing.*`   - Emotional and behavioural signals
 * - `scholarly.parent.*`      - Parent engagement and communication
 * - `scholarly.mesh.*`        - Cross-module intelligence synthesis
 *
 * ## Architecture Principles
 *
 * 1. **Eventual Consistency**: Events enable async processing; readers must
 *    tolerate brief delays in cross-module views.
 *
 * 2. **Idempotency**: All event handlers must be idempotent - processing the
 *    same event twice should have no additional effect.
 *
 * 3. **Replay Capability**: Event streams support replay for disaster recovery
 *    and new module integration.
 *
 * 4. **Privacy Awareness**: Events containing PII are marked and handled
 *    according to privacy settings.
 *
 * @module IntelligenceMesh/Events
 * @version 1.4.0
 */

import {
  ApplicationStatus, AttendanceStatus, AbsenceReason, PatternType, AlertType,
  StudentStatus
} from './mesh-types';

// ============================================================================
// BASE EVENT STRUCTURE
// ============================================================================

/**
 * Base scholarly event interface
 */
export interface ScholarlyEvent {
  id: string;
  type: string;
  tenantId: string;
  timestamp: Date;
  payload: Record<string, unknown>;
}

/**
 * Extended event structure for mesh events
 * Includes cross-module correlation and privacy metadata
 */
export interface MeshEvent extends ScholarlyEvent {
  // Mesh-specific metadata
  meshMetadata: {
    domain: MeshDomain;
    affectsStudents: string[];      // Student IDs affected
    correlationId?: string;         // Links related events across domains
    causedBy?: string;              // ID of event that triggered this one
    containsPII: boolean;           // Flags events with personal data
    privacyLevel: 'public' | 'staff' | 'restricted';
  };

  // For LIS sync
  lisSync?: {
    shouldSync: boolean;
    syncType: 'immediate' | 'batch';
    lisEventMapping?: string;       // Corresponding LIS event type
  };
}

export type MeshDomain =
  | 'enrollment'
  | 'attendance'
  | 'assessment'
  | 'gradebook'
  | 'wellbeing'
  | 'parent'
  | 'mesh';                         // Cross-cutting intelligence

// ============================================================================
// ENROLLMENT EVENTS
// ============================================================================

export const ENROLLMENT_EVENTS = {
  // Application lifecycle
  APPLICATION_CREATED: 'scholarly.enrollment.application_created',
  APPLICATION_SUBMITTED: 'scholarly.enrollment.application_submitted',
  APPLICATION_UPDATED: 'scholarly.enrollment.application_updated',

  // Document handling
  DOCUMENT_UPLOADED: 'scholarly.enrollment.document_uploaded',
  DOCUMENT_VERIFIED: 'scholarly.enrollment.document_verified',
  DOCUMENTS_COMPLETE: 'scholarly.enrollment.documents_complete',

  // Assessment
  ASSESSMENT_SCHEDULED: 'scholarly.enrollment.assessment_scheduled',
  ASSESSMENT_STARTED: 'scholarly.enrollment.assessment_started',
  ASSESSMENT_COMPLETED: 'scholarly.enrollment.assessment_completed',
  PRIOR_LEARNING_ANALYSED: 'scholarly.enrollment.prior_learning_analysed',

  // Decision
  DECISION_MADE: 'scholarly.enrollment.decision_made',
  OFFER_EXTENDED: 'scholarly.enrollment.offer_extended',
  OFFER_ACCEPTED: 'scholarly.enrollment.offer_accepted',
  OFFER_DECLINED: 'scholarly.enrollment.offer_declined',
  WAITLISTED: 'scholarly.enrollment.waitlisted',

  // Enrollment completion
  STUDENT_ENROLLED: 'scholarly.enrollment.student_enrolled',
  TRANSITION_PLAN_CREATED: 'scholarly.enrollment.transition_plan_created',
  TEACHER_BRIEFING_GENERATED: 'scholarly.enrollment.teacher_briefing_generated',
  KNOWLEDGE_GRAPH_SEEDED: 'scholarly.enrollment.knowledge_graph_seeded',

  // Status changes
  STATUS_CHANGED: 'scholarly.enrollment.status_changed',
  STUDENT_WITHDRAWN: 'scholarly.enrollment.student_withdrawn',
  STUDENT_GRADUATED: 'scholarly.enrollment.student_graduated'
} as const;

export interface ApplicationCreatedEvent extends MeshEvent {
  type: typeof ENROLLMENT_EVENTS.APPLICATION_CREATED;
  payload: {
    applicationId: string;
    studentName: string;
    requestedYearLevel: string;
    requestedStartDate: string;
    primaryGuardianEmail: string;
  };
}

export interface StudentEnrolledEvent extends MeshEvent {
  type: typeof ENROLLMENT_EVENTS.STUDENT_ENROLLED;
  payload: {
    applicationId: string;
    studentId: string;
    studentName: string;
    yearLevel: string;
    classGroup?: string;
    startDate: string;
    hasTransitionPlan: boolean;
    hasIEP: boolean;
    initialCompetencies?: { curriculumCode: string; masteryEstimate: number }[];
  };
}

export interface KnowledgeGraphSeededEvent extends MeshEvent {
  type: typeof ENROLLMENT_EVENTS.KNOWLEDGE_GRAPH_SEEDED;
  payload: {
    studentId: string;
    lisProfileId: string;
    competenciesSeeded: number;
    sourceAssessmentId: string;
    confidence: number;
  };
}

// ============================================================================
// ATTENDANCE EVENTS
// ============================================================================

export const ATTENDANCE_EVENTS = {
  // Daily attendance
  ATTENDANCE_MARKED: 'scholarly.attendance.marked',
  ATTENDANCE_CORRECTED: 'scholarly.attendance.corrected',
  ROLL_COMPLETED: 'scholarly.attendance.roll_completed',

  // Absence handling
  ABSENCE_RECORDED: 'scholarly.attendance.absence_recorded',
  ABSENCE_EXPLAINED: 'scholarly.attendance.absence_explained',
  ABSENCE_VERIFIED: 'scholarly.attendance.absence_verified',

  // Late arrivals
  LATE_ARRIVAL_RECORDED: 'scholarly.attendance.late_arrival_recorded',
  EARLY_DEPARTURE_RECORDED: 'scholarly.attendance.early_departure_recorded',

  // Kiosk events
  KIOSK_CHECKIN: 'scholarly.attendance.kiosk_checkin',
  PARENT_APP_ABSENCE: 'scholarly.attendance.parent_app_absence',

  // Pattern detection
  PATTERN_DETECTED: 'scholarly.attendance.pattern_detected',
  PATTERN_RESOLVED: 'scholarly.attendance.pattern_resolved',

  // Alerts
  ALERT_TRIGGERED: 'scholarly.attendance.alert_triggered',
  ALERT_ACKNOWLEDGED: 'scholarly.attendance.alert_acknowledged',
  ALERT_ESCALATED: 'scholarly.attendance.alert_escalated',
  ALERT_RESOLVED: 'scholarly.attendance.alert_resolved',

  // Compliance
  CHRONIC_ABSENTEEISM_RISK: 'scholarly.attendance.chronic_absenteeism_risk',
  COMPLIANCE_THRESHOLD_BREACH: 'scholarly.attendance.compliance_threshold_breach',

  // Intervention triggers
  INTERVENTION_RECOMMENDED: 'scholarly.attendance.intervention_recommended',
  PARENT_CONTACT_REQUIRED: 'scholarly.attendance.parent_contact_required'
} as const;

export interface AttendanceMarkedEvent extends MeshEvent {
  type: typeof ATTENDANCE_EVENTS.ATTENDANCE_MARKED;
  payload: {
    recordId: string;
    studentId: string;
    date: string;
    period?: string;
    status: AttendanceStatus;
    recordedBy: string;
    recordingMethod: string;
  };
}

export interface PatternDetectedEvent extends MeshEvent {
  type: typeof ATTENDANCE_EVENTS.PATTERN_DETECTED;
  payload: {
    patternId: string;
    studentId: string;
    patternType: PatternType;
    confidence: number;
    description: string;
    evidencePeriod: { from: string; to: string };
    riskLevel: string;
    recommendedActions: { action: string; priority: string }[];
  };
}

export interface AlertTriggeredEvent extends MeshEvent {
  type: typeof ATTENDANCE_EVENTS.ALERT_TRIGGERED;
  payload: {
    alertId: string;
    studentId: string;
    alertType: AlertType;
    severity: string;
    title: string;
    description: string;
    triggerConditions: { condition: string; value: unknown; threshold: unknown }[];
  };
}

export interface ChronicAbsenteeismRiskEvent extends MeshEvent {
  type: typeof ATTENDANCE_EVENTS.CHRONIC_ABSENTEEISM_RISK;
  payload: {
    studentId: string;
    currentAbsenceRate: number;
    threshold: number;
    riskLevel: 'moderate' | 'high' | 'chronic';
    projectedEndOfTermRate: number;
    interventionRequired: boolean;
  };
}

// ============================================================================
// ASSESSMENT EVENTS (Preview - Full in v1.5.0)
// ============================================================================

export const ASSESSMENT_EVENTS = {
  // Attempt lifecycle
  ATTEMPT_STARTED: 'scholarly.assessment.attempt_started',
  ATTEMPT_SUBMITTED: 'scholarly.assessment.attempt_submitted',
  ATTEMPT_MARKED: 'scholarly.assessment.attempt_marked',
  ATTEMPT_REVIEWED: 'scholarly.assessment.attempt_reviewed',

  // Mastery updates
  MASTERY_UPDATED: 'scholarly.assessment.mastery_updated',
  MISCONCEPTION_DETECTED: 'scholarly.assessment.misconception_detected',

  // AI marking
  AI_MARKING_COMPLETED: 'scholarly.assessment.ai_marking_completed',
  TEACHER_REVIEW_REQUIRED: 'scholarly.assessment.teacher_review_required',

  // Engagement signals
  ENGAGEMENT_SIGNAL: 'scholarly.assessment.engagement_signal',
  STRUGGLE_DETECTED: 'scholarly.assessment.struggle_detected',

  // Additional events for assessment service
  ASSESSMENT_CREATED: 'scholarly.assessment.assessment_created',
  ASSESSMENT_PUBLISHED: 'scholarly.assessment.assessment_published',
  ATTEMPT_AI_MARKED: 'scholarly.assessment.attempt_ai_marked',
  ATTEMPT_RETURNED: 'scholarly.assessment.attempt_returned',
  ANALYTICS_GENERATED: 'scholarly.assessment.analytics_generated',
  PEER_REVIEW_ASSIGNED: 'scholarly.assessment.peer_review_assigned'
} as const;

export interface MasteryUpdatedEvent extends MeshEvent {
  type: typeof ASSESSMENT_EVENTS.MASTERY_UPDATED;
  payload: {
    studentId: string;
    assessmentId: string;
    competencyId: string;
    curriculumCode?: string;
    previousMastery: number;
    newMastery: number;
    confidence: number;
    source: 'assessment' | 'practice' | 'observation';
  };
}

export interface MisconceptionDetectedEvent extends MeshEvent {
  type: typeof ASSESSMENT_EVENTS.MISCONCEPTION_DETECTED;
  payload: {
    studentId: string;
    competencyId: string;
    misconceptionType: string;
    description: string;
    severity: 'minor' | 'moderate' | 'significant';
    evidenceItems: string[];
    suggestedRemediation: string;
  };
}

// ============================================================================
// GRADEBOOK EVENTS (Preview - Full in v1.5.0)
// ============================================================================

export const GRADEBOOK_EVENTS = {
  // Grade recording
  GRADE_RECORDED: 'scholarly.gradebook.grade_recorded',
  GRADE_UPDATED: 'scholarly.gradebook.grade_updated',
  ACHIEVEMENT_LEVEL_CHANGED: 'scholarly.gradebook.achievement_level_changed',

  // Trajectory analysis
  TRAJECTORY_UPDATED: 'scholarly.gradebook.trajectory_updated',
  ANOMALY_DETECTED: 'scholarly.gradebook.anomaly_detected',

  // Reporting
  REPORT_GENERATED: 'scholarly.gradebook.report_generated',
  REPORT_PUBLISHED: 'scholarly.gradebook.report_published',
  NARRATIVE_GENERATED: 'scholarly.gradebook.narrative_generated',

  // Additional events for gradebook service
  GRADEBOOK_CREATED: 'scholarly.gradebook.gradebook_created',
  SCORE_ENTERED: 'scholarly.gradebook.score_entered',
  SCORE_EXCUSED: 'scholarly.gradebook.score_excused',
  GRADES_CALCULATED: 'scholarly.gradebook.grades_calculated',
  REPORT_DRAFT_READY: 'scholarly.gradebook.report_draft_ready',
  NARRATIVE_APPROVED: 'scholarly.gradebook.narrative_approved',
  FAILING_RISK: 'scholarly.gradebook.failing_risk',
  GRADE_DROP_DETECTED: 'scholarly.gradebook.grade_drop_detected',
  WELLBEING_SIGNAL: 'scholarly.gradebook.wellbeing_signal'
} as const;

export interface GradeRecordedEvent extends MeshEvent {
  type: typeof GRADEBOOK_EVENTS.GRADE_RECORDED;
  payload: {
    recordId: string;
    studentId: string;
    assessmentId: string;
    subject: string;
    grade: string;
    achievementLevel: string;
    masteryLevel: number;
    recordedBy: string;
  };
}

export interface AnomalyDetectedEvent extends MeshEvent {
  type: typeof GRADEBOOK_EVENTS.ANOMALY_DETECTED;
  payload: {
    studentId: string;
    subject: string;
    anomalyType: 'sudden_drop' | 'sudden_improvement' | 'inconsistent_performance';
    description: string;
    previousAverage: number;
    currentScore: number;
    requiresInvestigation: boolean;
  };
}

// ============================================================================
// WELLBEING EVENTS (Preview - Full in v1.6.0)
// ============================================================================

export const WELLBEING_EVENTS = {
  // Check-ins
  CHECKIN_RECORDED: 'scholarly.wellbeing.checkin_recorded',
  EMOTIONAL_STATE_FLAGGED: 'scholarly.wellbeing.emotional_state_flagged',

  // Behaviour
  INCIDENT_RECORDED: 'scholarly.wellbeing.incident_recorded',
  INCIDENT_RESOLVED: 'scholarly.wellbeing.incident_resolved',

  // Risk assessment
  RISK_ELEVATED: 'scholarly.wellbeing.risk_elevated',
  RISK_REDUCED: 'scholarly.wellbeing.risk_reduced',

  // Interventions
  INTERVENTION_STARTED: 'scholarly.wellbeing.intervention_started',
  INTERVENTION_PROGRESS_UPDATED: 'scholarly.wellbeing.intervention_progress_updated',
  INTERVENTION_COMPLETED: 'scholarly.wellbeing.intervention_completed',

  // IEP/Special Education
  IEP_CREATED: 'scholarly.wellbeing.iep_created',
  IEP_GOAL_UPDATED: 'scholarly.wellbeing.iep_goal_updated',
  ACCOMMODATION_REQUIRED: 'scholarly.wellbeing.accommodation_required',

  // Case management
  CASE_OPENED: 'scholarly.wellbeing.case_opened',
  CASE_NOTE_ADDED: 'scholarly.wellbeing.case_note_added',
  CASE_CLOSED: 'scholarly.wellbeing.case_closed'
} as const;

export interface RiskElevatedEvent extends MeshEvent {
  type: typeof WELLBEING_EVENTS.RISK_ELEVATED;
  payload: {
    studentId: string;
    previousRiskLevel: string;
    newRiskLevel: string;
    contributingFactors: { domain: string; factor: string; weight: number }[];
    urgency: 'immediate' | 'urgent' | 'elevated';
    recommendedActions: string[];
  };
}

// ============================================================================
// PARENT PORTAL EVENTS (Preview - Full in v1.6.0)
// ============================================================================

export const PARENT_EVENTS = {
  // Authentication
  PARENT_LOGGED_IN: 'scholarly.parent.logged_in',
  PARENT_LOGGED_OUT: 'scholarly.parent.logged_out',

  // Engagement
  PROGRESS_VIEWED: 'scholarly.parent.progress_viewed',
  ATTENDANCE_VIEWED: 'scholarly.parent.attendance_viewed',
  REPORT_VIEWED: 'scholarly.parent.report_viewed',
  RESOURCE_ACCESSED: 'scholarly.parent.resource_accessed',

  // Communication
  MESSAGE_SENT: 'scholarly.parent.message_sent',
  MESSAGE_READ: 'scholarly.parent.message_read',
  NOTIFICATION_SENT: 'scholarly.parent.notification_sent',
  NOTIFICATION_CLICKED: 'scholarly.parent.notification_clicked',

  // Actions
  ABSENCE_SUBMITTED: 'scholarly.parent.absence_submitted',
  PERMISSION_GRANTED: 'scholarly.parent.permission_granted',
  APPOINTMENT_BOOKED: 'scholarly.parent.appointment_booked',

  // Engagement analytics
  ENGAGEMENT_SCORE_UPDATED: 'scholarly.parent.engagement_score_updated',
  ENGAGEMENT_DROP_DETECTED: 'scholarly.parent.engagement_drop_detected'
} as const;

export interface ParentLoggedInEvent extends MeshEvent {
  type: typeof PARENT_EVENTS.PARENT_LOGGED_IN;
  payload: {
    guardianId: string;
    studentIds: string[];
    loginMethod: 'password' | 'sso' | 'magic_link';
    deviceType: 'desktop' | 'mobile' | 'tablet';
    isFirstLoginThisMonth: boolean;
  };
}

export interface EngagementDropDetectedEvent extends MeshEvent {
  type: typeof PARENT_EVENTS.ENGAGEMENT_DROP_DETECTED;
  payload: {
    guardianId: string;
    studentIds: string[];
    previousEngagementScore: number;
    currentEngagementScore: number;
    daysSinceLastLogin: number;
    concernLevel: 'monitor' | 'reach_out' | 'urgent';
    correlatedStudentSignals?: string[];
  };
}

// ============================================================================
// MESH (CROSS-MODULE) EVENTS
// ============================================================================

export const MESH_EVENTS = {
  // Risk assessment
  RISK_ASSESSMENT_GENERATED: 'scholarly.mesh.risk_assessment_generated',
  RISK_LEVEL_CHANGED: 'scholarly.mesh.risk_level_changed',

  // Signal synthesis
  SIGNALS_SYNTHESISED: 'scholarly.mesh.signals_synthesised',
  CORRELATION_DETECTED: 'scholarly.mesh.correlation_detected',

  // Intervention recommendations
  INTERVENTION_RECOMMENDED: 'scholarly.mesh.intervention_recommended',
  INTERVENTION_ACCEPTED: 'scholarly.mesh.intervention_accepted',
  INTERVENTION_DECLINED: 'scholarly.mesh.intervention_declined',

  // LIS sync
  LIS_SYNC_REQUESTED: 'scholarly.mesh.lis_sync_requested',
  LIS_SYNC_COMPLETED: 'scholarly.mesh.lis_sync_completed',
  LIS_DATA_RECEIVED: 'scholarly.mesh.lis_data_received',

  // Student lifecycle
  STUDENT_PROFILE_UPDATED: 'scholarly.mesh.student_profile_updated',
  STUDENT_TRANSITION_COMPLETED: 'scholarly.mesh.student_transition_completed',

  // Alert aggregation
  MULTI_DOMAIN_ALERT: 'scholarly.mesh.multi_domain_alert',
  ESCALATION_TRIGGERED: 'scholarly.mesh.escalation_triggered'
} as const;

export interface RiskAssessmentGeneratedEvent extends MeshEvent {
  type: typeof MESH_EVENTS.RISK_ASSESSMENT_GENERATED;
  payload: {
    studentId: string;
    overallRiskScore: number;
    riskLevel: string;
    domainScores: Record<string, { score: number; factors: string[] }>;
    trend: 'improving' | 'stable' | 'declining';
    keySignals: { signal: string; domain: string; severity: string }[];
    recommendedInterventions: string[];
  };
}

export interface CorrelationDetectedEvent extends MeshEvent {
  type: typeof MESH_EVENTS.CORRELATION_DETECTED;
  payload: {
    correlationId: string;
    studentId: string;
    correlationType: string;
    domains: string[];
    signals: { domain: string; signal: string; timestamp: string }[];
    confidence: number;
    interpretation: string;
    suggestedAction?: string;
  };
}

export interface InterventionRecommendedEvent extends MeshEvent {
  type: typeof MESH_EVENTS.INTERVENTION_RECOMMENDED;
  payload: {
    recommendationId: string;
    studentId: string;
    interventionType: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    rationale: string;
    supportingSignals: { domain: string; signal: string }[];
    suggestedOwner: string;
    suggestedActions: string[];
    timeframe: string;
  };
}

export interface MultiDomainAlertEvent extends MeshEvent {
  type: typeof MESH_EVENTS.MULTI_DOMAIN_ALERT;
  payload: {
    alertId: string;
    studentId: string;
    severity: 'warning' | 'critical';
    title: string;
    description: string;
    contributingAlerts: { domain: string; alertId: string; alertType: string }[];
    immediateActionRequired: boolean;
    notifyRoles: string[];
  };
}

// ============================================================================
// EVENT TYPE UNIONS
// ============================================================================

export type EnrollmentEventType = typeof ENROLLMENT_EVENTS[keyof typeof ENROLLMENT_EVENTS];
export type AttendanceEventType = typeof ATTENDANCE_EVENTS[keyof typeof ATTENDANCE_EVENTS];
export type AssessmentEventType = typeof ASSESSMENT_EVENTS[keyof typeof ASSESSMENT_EVENTS];
export type GradebookEventType = typeof GRADEBOOK_EVENTS[keyof typeof GRADEBOOK_EVENTS];
export type WellbeingEventType = typeof WELLBEING_EVENTS[keyof typeof WELLBEING_EVENTS];
export type ParentEventType = typeof PARENT_EVENTS[keyof typeof PARENT_EVENTS];
export type MeshEventType = typeof MESH_EVENTS[keyof typeof MESH_EVENTS];

export type AllMeshEventTypes =
  | EnrollmentEventType
  | AttendanceEventType
  | AssessmentEventType
  | GradebookEventType
  | WellbeingEventType
  | ParentEventType
  | MeshEventType;

// ============================================================================
// EVENT HANDLERS REGISTRY
// ============================================================================

/**
 * Event handler function type
 */
export type MeshEventHandler<T extends MeshEvent = MeshEvent> = (event: T) => Promise<void>;

/**
 * Registry of event handlers for cross-module intelligence
 *
 * Example usage:
 * ```typescript
 * const registry = new MeshEventRegistry();
 *
 * // Wellbeing module listens to attendance patterns
 * registry.register(
 *   ATTENDANCE_EVENTS.PATTERN_DETECTED,
 *   async (event: PatternDetectedEvent) => {
 *     // Consider pattern in wellbeing risk assessment
 *   }
 * );
 *
 * // Parent portal listens to wellbeing risk changes
 * registry.register(
 *   WELLBEING_EVENTS.RISK_ELEVATED,
 *   async (event: RiskElevatedEvent) => {
 *     // Consider notifying parents
 *   }
 * );
 * ```
 */
export class MeshEventRegistry {
  private handlers: Map<string, MeshEventHandler[]> = new Map();

  register<T extends MeshEvent>(eventType: string, handler: MeshEventHandler<T>): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler as MeshEventHandler);
    this.handlers.set(eventType, existing);
  }

  unregister(eventType: string, handler: MeshEventHandler): void {
    const existing = this.handlers.get(eventType) || [];
    const index = existing.indexOf(handler);
    if (index > -1) {
      existing.splice(index, 1);
      this.handlers.set(eventType, existing);
    }
  }

  async dispatch(event: MeshEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    await Promise.all(handlers.map(handler => handler(event)));
  }

  getHandlerCount(eventType: string): number {
    return (this.handlers.get(eventType) || []).length;
  }

  getAllRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// ============================================================================
// EVENT BUILDER UTILITIES
// ============================================================================

/**
 * Creates a properly structured mesh event
 */
export function createMeshEvent<T extends Record<string, unknown>>(
  type: AllMeshEventTypes,
  tenantId: string,
  payload: T,
  options: {
    domain: MeshDomain;
    affectsStudents: string[];
    correlationId?: string;
    causedBy?: string;
    containsPII?: boolean;
    privacyLevel?: 'public' | 'staff' | 'restricted';
    lisSync?: MeshEvent['lisSync'];
  }
): MeshEvent {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    tenantId,
    timestamp: new Date(),
    payload,
    meshMetadata: {
      domain: options.domain,
      affectsStudents: options.affectsStudents,
      correlationId: options.correlationId,
      causedBy: options.causedBy,
      containsPII: options.containsPII ?? true,
      privacyLevel: options.privacyLevel ?? 'staff'
    },
    lisSync: options.lisSync
  };
}

// ============================================================================
// CROSS-MODULE SUBSCRIPTION HELPERS
// ============================================================================

/**
 * Standard subscriptions for each module to enable cross-module intelligence
 */
export const MODULE_SUBSCRIPTIONS = {
  // Enrollment module listens to:
  enrollment: [] as AllMeshEventTypes[],

  // Attendance module listens to:
  attendance: [
    WELLBEING_EVENTS.RISK_ELEVATED,           // Consider wellbeing in pattern analysis
    ENROLLMENT_EVENTS.STUDENT_ENROLLED,       // Set up attendance tracking for new students
    ENROLLMENT_EVENTS.STUDENT_WITHDRAWN       // Clean up attendance tracking
  ] as AllMeshEventTypes[],

  // Assessment module listens to:
  assessment: [
    ATTENDANCE_EVENTS.PATTERN_DETECTED,       // Consider attendance in engagement analysis
    WELLBEING_EVENTS.RISK_ELEVATED,           // Adjust assessment difficulty
    ENROLLMENT_EVENTS.KNOWLEDGE_GRAPH_SEEDED  // Initialize assessment baselines
  ] as AllMeshEventTypes[],

  // Gradebook module listens to:
  gradebook: [
    ASSESSMENT_EVENTS.MASTERY_UPDATED,        // Update achievement levels
    ASSESSMENT_EVENTS.ATTEMPT_MARKED,         // Record grades
    WELLBEING_EVENTS.ACCOMMODATION_REQUIRED   // Apply grading accommodations
  ] as AllMeshEventTypes[],

  // Wellbeing module listens to (the synthesis engine):
  wellbeing: [
    ATTENDANCE_EVENTS.PATTERN_DETECTED,       // Attendance signals
    ATTENDANCE_EVENTS.CHRONIC_ABSENTEEISM_RISK,
    ASSESSMENT_EVENTS.STRUGGLE_DETECTED,      // Academic struggle signals
    GRADEBOOK_EVENTS.ANOMALY_DETECTED,        // Grade anomalies
    PARENT_EVENTS.ENGAGEMENT_DROP_DETECTED,   // Parent engagement signals
    ENROLLMENT_EVENTS.TRANSITION_PLAN_CREATED // Transition needs
  ] as AllMeshEventTypes[],

  // Parent portal listens to:
  parent: [
    ATTENDANCE_EVENTS.ABSENCE_RECORDED,       // Notify of absences
    ATTENDANCE_EVENTS.ALERT_TRIGGERED,        // Attendance alerts
    GRADEBOOK_EVENTS.REPORT_PUBLISHED,        // New reports available
    WELLBEING_EVENTS.RISK_ELEVATED,           // Risk notifications
    MESH_EVENTS.INTERVENTION_RECOMMENDED      // Intervention involvement
  ] as AllMeshEventTypes[]
};

// ============================================================================
// LIS SYNC EVENT MAPPINGS
// ============================================================================

/**
 * Maps mesh events to LIS events for bidirectional sync
 */
export const LIS_EVENT_MAPPINGS: Record<string, { lisEvent: string; syncType: 'immediate' | 'batch' }> = {
  [ENROLLMENT_EVENTS.KNOWLEDGE_GRAPH_SEEDED]: {
    lisEvent: 'lis.knowledge.graph_seeded',
    syncType: 'immediate'
  },
  [ASSESSMENT_EVENTS.MASTERY_UPDATED]: {
    lisEvent: 'lis.knowledge.mastery_updated',
    syncType: 'immediate'
  },
  [ASSESSMENT_EVENTS.MISCONCEPTION_DETECTED]: {
    lisEvent: 'lis.knowledge.misconception_identified',
    syncType: 'immediate'
  },
  [ATTENDANCE_EVENTS.PATTERN_DETECTED]: {
    lisEvent: 'lis.affective.engagement_signal',
    syncType: 'batch'
  },
  [WELLBEING_EVENTS.CHECKIN_RECORDED]: {
    lisEvent: 'lis.affective.state_reported',
    syncType: 'immediate'
  },
  [WELLBEING_EVENTS.RISK_ELEVATED]: {
    lisEvent: 'lis.affective.risk_elevated',
    syncType: 'immediate'
  }
};
