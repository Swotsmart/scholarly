/**
 * Intelligence Mesh - Shared Types & Schema Definitions
 * 
 * This module establishes the foundational type system for the Intelligence Mesh,
 * defining the six interconnected domains that together create a unified view of
 * every student in the Scholarly ecosystem.
 * 
 * ## The Granny Explanation
 * 
 * Imagine you're a school principal who wants to truly understand each student.
 * Currently, you have six different filing cabinets:
 * - One for enrollment paperwork
 * - One for attendance records
 * - One for test scores
 * - One for report cards
 * - One for wellbeing notes
 * - One for parent communications
 * 
 * The problem? When little Timmy starts struggling, you have to manually check
 * all six cabinets to see the full picture: his grades dropped, attendance
 * slipped, parents haven't logged in lately, and the wellbeing notes mention
 * anxiety. By the time you piece it together, Timmy's in crisis.
 * 
 * The Intelligence Mesh is like having a brilliant assistant who reads all six
 * cabinets simultaneously and says: "Timmy's showing early warning signs across
 * four domains. Here's what's happening, and here's what we should do."
 * 
 * ## The Six Domains
 * 
 * 1. **Enrollment**: The student's starting point - prior learning, family context,
 *    learning needs identified at entry
 * 
 * 2. **Attendance**: Daily presence signals - patterns reveal engagement, wellbeing,
 *    and potential issues before academics suffer
 * 
 * 3. **Assessment**: Continuous evidence of learning - not just scores, but mastery
 *    trajectories, misconceptions, and learning gaps
 * 
 * 4. **Gradebook**: The translation layer - turning evidence into meaningful
 *    achievement records that track growth over time
 * 
 * 5. **Wellbeing**: The synthesis engine - consuming signals from all other domains
 *    to build holistic risk profiles and intervention recommendations
 * 
 * 6. **Parent Portal**: The partnership interface - translating complex educational
 *    data into actionable partnership, optimising communication timing and content
 * 
 * ## Architecture Principles
 * 
 * - **Multi-tenant isolation**: Every entity carries tenantId
 * - **Soft deletes**: deletedAt timestamp, never hard delete student data
 * - **Audit trails**: createdAt, updatedAt, createdBy, updatedBy on all records
 * - **Event-driven**: Changes emit events for cross-module intelligence
 * - **Privacy-first**: Fine-grained consent controls on all data sharing
 * 
 * @module IntelligenceMesh
 * @version 1.4.0
 */

import {
  ScholarlyBaseService, Result, success, failure, ValidationError, NotFoundError,
  Validator, EventBus, Cache, ScholarlyConfig, Jurisdiction, SafeguardingCheck
} from '../../types';

// ============================================================================
// COMMON TYPES (Used across all six modules)
// ============================================================================

/**
 * Base entity interface - all mesh entities extend this
 * Ensures consistent audit trails and multi-tenant isolation
 */
export interface MeshBaseEntity {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  deletedAt?: Date;
  deletedBy?: string;
}

/**
 * Student identity across the mesh
 * The central linking entity that connects all six domains
 */
export interface MeshStudent extends MeshBaseEntity {
  // Core identity
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: Date;
  gender?: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
  
  // External system links
  lisProfileId?: string;           // Link to Learner Intelligence System
  schoolStudentId?: string;        // School's internal student ID
  homeschoolChildId?: string;      // Link to Homeschool Hub
  governmentStudentId?: string;    // E.g., USI in Australia
  
  // Current enrollment status
  currentStatus: StudentStatus;
  currentYearLevel: string;
  currentClassGroups: string[];
  
  // Privacy and consent
  privacySettings: StudentPrivacySettings;
  
  // Mesh intelligence
  meshProfile: {
    riskScore?: number;            // 0-100, synthesised from all domains
    riskFactors?: string[];
    lastRiskAssessment?: Date;
    interventionStatus?: 'none' | 'monitoring' | 'active' | 'resolved';
  };
}

export type StudentStatus = 
  | 'prospective'      // Application in progress
  | 'offered'          // Offer made, awaiting acceptance
  | 'enrolled'         // Active student
  | 'suspended'        // Temporarily not attending
  | 'withdrawn'        // Left the school
  | 'graduated'        // Completed schooling
  | 'deferred';        // Deferred enrollment

export interface StudentPrivacySettings {
  shareWithLIS: boolean;           // Allow Knowledge Graph sync
  shareAcrossModules: boolean;     // Allow cross-module intelligence
  shareWithTutors: boolean;        // Allow tutor matching
  shareWithParents: boolean;       // Parent portal access level
  photoConsent: boolean;           // Allow photos in reports/portal
  externalDataSharing: boolean;    // Share with external systems
  consentRecordedAt: Date;
  consentRecordedBy: string;       // Parent/guardian ID
}

/**
 * Guardian/parent identity
 * Links to students and controls portal access
 */
export interface MeshGuardian extends MeshBaseEntity {
  // Identity
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  
  // Relationship to students
  studentLinks: {
    studentId: string;
    relationship: 'mother' | 'father' | 'step_mother' | 'step_father' | 
                  'guardian' | 'grandparent' | 'foster_carer' | 'other';
    isPrimaryContact: boolean;
    hasLegalCustody: boolean;
    canPickUp: boolean;
    emergencyContact: boolean;
    portalAccessLevel: 'full' | 'limited' | 'none';
  }[];
  
  // Portal preferences
  communicationPreferences: CommunicationPreferences;
  
  // Engagement metrics (for intelligence)
  engagementMetrics?: {
    lastPortalLogin?: Date;
    loginFrequency: number;        // Logins per month
    messageResponseTime?: number;  // Average hours to respond
    resourcesAccessed: number;
    engagementScore: number;       // 0-100
  };
}

export interface CommunicationPreferences {
  preferredLanguage: string;
  preferredChannel: 'email' | 'sms' | 'app' | 'phone';
  emailOptIn: boolean;
  smsOptIn: boolean;
  pushNotifications: boolean;
  quietHours?: { start: string; end: string; timezone: string };
  communicationFrequency: 'real_time' | 'daily_digest' | 'weekly_digest';
}

/**
 * Staff identity across the mesh
 * Teachers, aides, administrators
 */
export interface MeshStaff extends MeshBaseEntity {
  // Identity
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  
  // Roles and permissions
  roles: StaffRole[];
  departments: string[];
  yearLevels: string[];
  subjects: string[];
  
  // Safeguarding
  safeguardingChecks: SafeguardingCheck[];
  
  // System access
  systemPermissions: string[];
}

export type StaffRole = 
  | 'teacher'
  | 'head_of_department'
  | 'year_coordinator'
  | 'counsellor'
  | 'wellbeing_officer'
  | 'administrator'
  | 'principal'
  | 'deputy_principal'
  | 'teacher_aide'
  | 'learning_support';

// ============================================================================
// ENROLLMENT DOMAIN TYPES
// ============================================================================

/**
 * Enrollment Application
 * Captures the full context of a prospective student
 */
export interface EnrollmentApplication extends MeshBaseEntity {
  // Student information (may become MeshStudent on enrollment)
  student: {
    firstName: string;
    lastName: string;
    preferredName?: string;
    dateOfBirth: Date;
    gender?: string;
    countryOfBirth: string;
    languagesSpoken: string[];
    indigenousStatus?: 'aboriginal' | 'torres_strait_islander' | 'both' | 'neither' | 'not_stated';
  };
  
  // Family information
  guardians: {
    firstName: string;
    lastName: string;
    relationship: string;
    email: string;
    phone: string;
    occupation?: string;
    employer?: string;
    isPrimaryContact: boolean;
    hasLegalCustody: boolean;
  }[];
  
  // Current/previous schooling
  previousSchooling: {
    schoolName?: string;
    schoolType?: 'government' | 'catholic' | 'independent' | 'homeschool' | 'international' | 'none';
    yearLevel?: string;
    lastAttendanceDate?: Date;
    reasonForLeaving?: string;
    contactPermission: boolean;
  };
  
  // Requested enrollment
  requestedStartDate: Date;
  requestedYearLevel: string;
  preferredClassGroup?: string;
  
  // Documents
  documents: ApplicationDocument[];
  
  // Status tracking
  status: ApplicationStatus;
  statusHistory: ApplicationStatusChange[];
  
  // Assessment
  priorLearningAssessment?: PriorLearningAssessment;
  
  // Decision
  decision?: EnrollmentDecision;
}

export interface ApplicationDocument {
  id: string;
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  uploadedBy: string;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  aiExtractedData?: Record<string, any>;
}

export type DocumentType = 
  | 'birth_certificate'
  | 'previous_report'
  | 'immunisation_record'
  | 'custody_order'
  | 'medical_plan'
  | 'iep_document'
  | 'ndis_plan'
  | 'visa_document'
  | 'proof_of_address'
  | 'other';

export type ApplicationStatus = 
  | 'draft'
  | 'submitted'
  | 'documents_pending'
  | 'under_review'
  | 'assessment_scheduled'
  | 'assessment_complete'
  | 'decision_pending'
  | 'offered'
  | 'offer_accepted'
  | 'enrolled'
  | 'waitlisted'
  | 'declined'
  | 'withdrawn';

export interface ApplicationStatusChange {
  from: ApplicationStatus;
  to: ApplicationStatus;
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

/**
 * Prior Learning Assessment
 * Diagnostic assessment to determine starting point
 */
export interface PriorLearningAssessment extends MeshBaseEntity {
  applicationId: string;
  
  // Assessment details
  assessmentDate: Date;
  assessedBy: string;
  assessmentType: 'diagnostic' | 'portfolio_review' | 'interview' | 'observation' | 'combined';
  
  // Results by domain
  domainResults: {
    domain: string;                // E.g., 'literacy', 'numeracy', 'science'
    subDomain?: string;
    assessedLevel: string;         // E.g., 'Year 3 equivalent'
    masteryEstimate: number;       // 0-100
    strengths: string[];
    gaps: string[];
    misconceptions?: string[];
    notes?: string;
  }[];
  
  // AI analysis of previous reports
  reportAnalysis?: {
    reportsAnalysed: string[];     // Document IDs
    extractedGrades: { subject: string; grade: string; period: string }[];
    identifiedPatterns: string[];
    concerns: string[];
    recommendations: string[];
    confidence: number;
  };
  
  // Recommendations
  recommendedYearLevel: string;
  recommendedInterventions: string[];
  transitionPlan?: TransitionPlan;
  
  // LIS seeding data
  initialCompetencies?: {
    competencyId: string;
    curriculumCode?: string;
    estimatedMastery: number;
    confidence: number;
    source: 'assessment' | 'report_analysis' | 'interview' | 'inferred';
  }[];
}

/**
 * Transition Plan
 * Curriculum gap analysis with recommended pathways
 */
export interface TransitionPlan extends MeshBaseEntity {
  applicationId: string;
  studentId?: string;              // Set once enrolled
  
  // Gap analysis
  identifiedGaps: {
    curriculumCode: string;
    gapDescription: string;
    severity: 'minor' | 'moderate' | 'significant';
    prerequisitesAffected: string[];
    remediationApproach: string;
    estimatedTimeToClose: number;  // Hours
  }[];
  
  // Recommended pathway
  pathwaySteps: {
    sequence: number;
    curriculumCode: string;
    title: string;
    description: string;
    estimatedDuration: number;     // Hours
    resources: string[];
    assessmentCheckpoint?: string;
  }[];
  
  // Teacher briefing
  teacherBriefing: {
    keyStrengths: string[];
    areasNeedingSupport: string[];
    learningPreferences?: string[];
    socialEmotionalNotes?: string;
    accommodationsNeeded: string[];
    parentCommunicationNotes?: string;
  };
  
  // Tracking
  status: 'draft' | 'active' | 'completed' | 'revised';
  progressCheckpoints: {
    date: Date;
    gapsAddressed: string[];
    remainingGaps: string[];
    adjustments?: string;
    reviewedBy: string;
  }[];
}

/**
 * Enrollment Decision
 * The final decision on an application
 */
export interface EnrollmentDecision extends MeshBaseEntity {
  applicationId: string;
  
  decision: 'offer' | 'waitlist' | 'decline';
  decisionDate: Date;
  decidedBy: string;
  
  // For offers
  offerDetails?: {
    startDate: Date;
    yearLevel: string;
    classGroup?: string;
    conditions?: string[];
    expiresAt: Date;
    acceptedAt?: Date;
    acceptedBy?: string;
  };
  
  // For waitlist
  waitlistDetails?: {
    position: number;
    estimatedWait?: string;
    notifyWhenAvailable: boolean;
  };
  
  // For decline
  declineDetails?: {
    reason: string;
    appealable: boolean;
    alternativeSuggestions?: string[];
  };
  
  // Communication
  communicationsSent: {
    type: 'offer_letter' | 'waitlist_notification' | 'decline_letter' | 'reminder';
    sentAt: Date;
    sentTo: string;
    channel: 'email' | 'postal' | 'portal';
  }[];
}

// ============================================================================
// ATTENDANCE DOMAIN TYPES
// ============================================================================

/**
 * Attendance Record
 * Individual attendance mark for a student
 */
export interface AttendanceRecord extends MeshBaseEntity {
  studentId: string;
  
  // When
  date: Date;
  period?: string;                 // For secondary schools with periods
  
  // Status
  status: AttendanceStatus;
  
  // Details for non-present statuses
  absenceDetails?: {
    reason: AbsenceReason;
    explanation?: string;
    verificationStatus: 'unverified' | 'parent_note' | 'medical_cert' | 'verified';
    verificationDocument?: string;
    parentNotified: boolean;
    parentNotifiedAt?: Date;
  };
  
  // Late arrival details
  lateDetails?: {
    arrivalTime: string;
    minutesLate: number;
    reason?: string;
    parentNotified: boolean;
  };
  
  // Recording metadata
  recordedBy: string;
  recordedAt: Date;
  recordingMethod: 'manual' | 'kiosk' | 'nfc' | 'biometric' | 'parent_app' | 'import';
  
  // Corrections
  corrections?: {
    previousStatus: AttendanceStatus;
    correctedAt: Date;
    correctedBy: string;
    reason: string;
  }[];
}

export type AttendanceStatus = 
  | 'present'
  | 'absent'
  | 'late'
  | 'early_departure'
  | 'partial'              // Present for part of the day
  | 'school_activity'      // Excursion, sport, etc.
  | 'approved_leave'       // Pre-approved absence
  | 'suspended'
  | 'holiday';             // School-sanctioned holiday (e.g., religious)

export type AbsenceReason =
  | 'illness'
  | 'medical_appointment'
  | 'family_emergency'
  | 'bereavement'
  | 'religious_observance'
  | 'cultural_event'
  | 'family_holiday'
  | 'unexplained'
  | 'truancy'
  | 'school_refusal'
  | 'mental_health'
  | 'bullying_related'
  | 'transport_issue'
  | 'weather'
  | 'other';

/**
 * Attendance Pattern
 * AI-detected patterns for early intervention
 */
export interface AttendancePattern extends MeshBaseEntity {
  studentId: string;
  
  // Pattern identification
  patternType: PatternType;
  confidence: number;              // 0-100
  
  // Pattern details
  description: string;
  detectedAt: Date;
  
  // Supporting data
  evidencePeriod: { from: Date; to: Date };
  evidenceRecords: string[];       // Attendance record IDs
  
  // Statistics
  statistics: {
    absenceRate: number;           // Percentage
    lateRate: number;
    consecutiveAbsences?: number;
    dayOfWeekBias?: Record<string, number>;
    periodBias?: Record<string, number>;
  };
  
  // Risk assessment
  chronicAbsenteeismRisk: 'low' | 'moderate' | 'high' | 'chronic';
  riskFactors: string[];
  
  // Correlation with other domains
  correlations?: {
    assessmentTrend?: 'improving' | 'stable' | 'declining';
    wellbeingSignals?: string[];
    parentEngagement?: 'high' | 'medium' | 'low';
  };
  
  // Recommendations
  recommendedActions: {
    action: string;
    priority: 'immediate' | 'soon' | 'monitor';
    targetAudience: 'teacher' | 'admin' | 'counsellor' | 'parent';
  }[];
  
  // Alert status
  alertStatus: 'pending' | 'sent' | 'acknowledged' | 'actioned' | 'dismissed';
  alertedTo?: string[];
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export type PatternType =
  | 'monday_absence'               // Frequently absent on Mondays
  | 'friday_absence'               // Frequently absent on Fridays
  | 'day_before_assessment'        // Absent before tests
  | 'post_weekend_pattern'         // Extended weekends
  | 'increasing_absences'          // Gradual increase in absences
  | 'sudden_change'                // Abrupt change in attendance
  | 'period_specific'              // Absent for specific periods/subjects
  | 'chronic_lateness'             // Consistently late
  | 'early_departure_pattern'      // Regular early departures
  | 'seasonal'                     // Seasonal absence patterns
  | 'cluster_with_peers';          // Absences correlate with peer group

/**
 * Attendance Alert
 * Triggered alerts requiring action
 */
export interface AttendanceAlert extends MeshBaseEntity {
  studentId: string;
  patternId?: string;
  
  alertType: AlertType;
  severity: 'info' | 'warning' | 'critical';
  
  title: string;
  description: string;
  
  // Trigger conditions
  triggerConditions: {
    condition: string;
    value: any;
    threshold: any;
  }[];
  
  // Response tracking
  status: 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  assignedTo?: string;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolution?: {
    action: string;
    outcome: string;
    resolvedAt: Date;
    resolvedBy: string;
  };
  
  // Escalation
  escalationLevel: number;
  escalatedAt?: Date;
  escalationHistory: {
    level: number;
    escalatedTo: string;
    escalatedAt: Date;
  }[];
}

export type AlertType =
  | 'consecutive_absence'          // X days absent in a row
  | 'absence_threshold'            // X% absent over period
  | 'chronic_absenteeism'          // Meets chronic absenteeism threshold
  | 'unexplained_absence'          // Unexplained absences requiring follow-up
  | 'pattern_detected'             // Concerning pattern identified
  | 'late_threshold'               // Excessive lateness
  | 'sudden_change'                // Sudden behaviour change
  | 'parent_notification_failed'   // Unable to reach parent
  | 'compliance_risk';             // At risk of breaching attendance requirements

// ============================================================================
// ASSESSMENT DOMAIN TYPES (Preview - Full in v1.5.0)
// ============================================================================

export interface AssessmentDefinition extends MeshBaseEntity {
  // Definition details - will be expanded in v1.5.0
  title: string;
  type: 'diagnostic' | 'formative' | 'summative';
  yearLevels: string[];
  subjects: string[];
  curriculumCodes: string[];
}

export interface AssessmentAttempt extends MeshBaseEntity {
  // Attempt details - will be expanded in v1.5.0
  assessmentId: string;
  studentId: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'marked' | 'reviewed';
  startedAt?: Date;
  submittedAt?: Date;
  score?: number;
  masteryEstimate?: number;
}

// ============================================================================
// GRADEBOOK DOMAIN TYPES (Preview - Full in v1.5.0)
// ============================================================================

export interface GradeRecord extends MeshBaseEntity {
  // Grade details - will be expanded in v1.5.0
  studentId: string;
  assessmentId: string;
  grade: string;
  achievementLevel: 'below' | 'approaching' | 'at' | 'above';
  masteryLevel: number;
}

export interface ReportCard extends MeshBaseEntity {
  // Report details - will be expanded in v1.5.0
  studentId: string;
  periodId: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  grades: GradeRecord[];
  narratives: { subject: string; comment: string }[];
}

// ============================================================================
// WELLBEING DOMAIN TYPES (Preview - Full in v1.6.0)
// ============================================================================

export interface WellbeingCheckIn extends MeshBaseEntity {
  // Check-in details - will be expanded in v1.6.0
  studentId: string;
  checkInType: 'self_report' | 'teacher_observation' | 'counsellor';
  emotionalState: string;
  concerns?: string[];
}

export interface BehaviourIncident extends MeshBaseEntity {
  // Incident details - will be expanded in v1.6.0
  studentId: string;
  incidentType: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  witnesses?: string[];
  interventions?: string[];
}

export interface InterventionRecord extends MeshBaseEntity {
  // Intervention details - will be expanded in v1.6.0
  studentId: string;
  interventionType: string;
  status: 'planned' | 'active' | 'completed' | 'discontinued';
  goals: string[];
  progress?: { date: Date; note: string; progressRating: number }[];
}

// ============================================================================
// PARENT PORTAL DOMAIN TYPES (Preview - Full in v1.6.0)
// ============================================================================

export interface PortalActivity extends MeshBaseEntity {
  // Activity details - will be expanded in v1.6.0
  guardianId: string;
  activityType: 'login' | 'view_progress' | 'view_attendance' | 'send_message' | 'view_resource';
  details: Record<string, any>;
}

export interface PortalMessage extends MeshBaseEntity {
  // Message details - will be expanded in v1.6.0
  fromId: string;
  fromType: 'guardian' | 'teacher' | 'admin';
  toId: string;
  toType: 'guardian' | 'teacher' | 'admin';
  subject: string;
  content: string;
  readAt?: Date;
  repliedAt?: Date;
}

// ============================================================================
// CROSS-MODULE INTELLIGENCE TYPES
// ============================================================================

/**
 * Student Risk Assessment
 * Synthesised view from all six domains
 */
export interface StudentRiskAssessment {
  studentId: string;
  assessmentDate: Date;
  
  // Overall risk
  overallRiskScore: number;        // 0-100
  riskLevel: 'minimal' | 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
  
  // Domain-specific contributions
  domainScores: {
    enrollment: { score: number; factors: string[] };
    attendance: { score: number; factors: string[] };
    assessment: { score: number; factors: string[] };
    gradebook: { score: number; factors: string[] };
    wellbeing: { score: number; factors: string[] };
    parentEngagement: { score: number; factors: string[] };
  };
  
  // Trend analysis
  trend: 'improving' | 'stable' | 'declining';
  trendPeriod: { from: Date; to: Date };
  
  // Key signals
  keySignals: {
    signal: string;
    domain: string;
    severity: 'info' | 'warning' | 'critical';
    detectedAt: Date;
  }[];
  
  // Intervention recommendations
  recommendedInterventions: {
    intervention: string;
    rationale: string;
    priority: 'immediate' | 'soon' | 'monitor';
    assignTo: string;
  }[];
  
  // Model metadata
  modelVersion: string;
  confidence: number;
}

/**
 * Intervention Recommendation
 * AI-generated recommendation based on cross-module signals
 */
export interface InterventionRecommendation {
  id: string;
  studentId: string;
  generatedAt: Date;
  
  // Recommendation details
  interventionType: string;
  title: string;
  description: string;
  rationale: string;
  
  // Supporting evidence
  supportingSignals: {
    domain: string;
    signal: string;
    weight: number;
  }[];
  
  // Priority and urgency
  priority: 'critical' | 'high' | 'medium' | 'low';
  timeframe: 'immediate' | 'this_week' | 'this_month' | 'this_term';
  
  // Implementation
  suggestedOwner: string;
  suggestedActions: string[];
  resources?: string[];
  
  // Expected outcomes
  expectedOutcomes: string[];
  successMetrics: { metric: string; target: any }[];
  
  // Status tracking
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'declined';
  statusHistory: { status: string; changedAt: Date; changedBy: string; reason?: string }[];
}

// ============================================================================
// LIS BRIDGE EXTENSIONS
// ============================================================================

/**
 * LIS Sync Configuration
 * Controls bidirectional data flow with LIS
 */
export interface LISSyncConfig {
  studentId: string;
  
  // Outbound to LIS
  enrollmentToLIS: {
    enabled: boolean;
    seedInitialCompetencies: boolean;
    syncTransitionProgress: boolean;
  };
  
  assessmentToLIS: {
    enabled: boolean;
    syncMasteryUpdates: boolean;
    syncMisconceptions: boolean;
    syncEngagementSignals: boolean;
  };
  
  attendanceToLIS: {
    enabled: boolean;
    syncEngagementIndicators: boolean;
    syncAffectiveSignals: boolean;
  };
  
  wellbeingToLIS: {
    enabled: boolean;
    syncAffectiveState: boolean;
    syncInterventionContext: boolean;
  };
  
  // Inbound from LIS
  lisToModules: {
    receiveRiskScores: boolean;
    receivePathwayAdjustments: boolean;
    receiveDifficultyCalibration: boolean;
    receiveInterventionRecommendations: boolean;
  };
  
  lastSyncAt?: Date;
  syncFrequency: 'real_time' | 'hourly' | 'daily';
}

// ============================================================================
// MESH SERVICE CONFIGURATION
// ============================================================================

export interface MeshServiceConfig extends ScholarlyConfig {
  mesh: {
    enableCrossModuleIntelligence: boolean;
    riskAssessmentFrequency: 'real_time' | 'hourly' | 'daily';
    interventionAutoGeneration: boolean;
    parentNotificationDelay: number;  // Minutes to wait before auto-notifying parents
    chronicAbsenteeismThreshold: number; // Percentage
    alertEscalationTimeouts: number[];  // Hours before each escalation level
  };
  
  lisbridgeExtensions: {
    enableBidirectionalSync: boolean;
    batchSyncInterval: number;      // Minutes
    realTimeEvents: string[];       // Event types to sync in real-time
  };
}

// ============================================================================
// MODULE VERSION
// ============================================================================

export const MESH_VERSION = '1.4.0';
export const MESH_MODULES = [
  'enrollment',
  'attendance',
  'assessment',
  'gradebook',
  'wellbeing',
  'parent-portal'
];
