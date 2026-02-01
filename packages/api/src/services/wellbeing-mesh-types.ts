/**
 * Wellbeing Module - Type Definitions
 *
 * The synthesis engine of the Intelligence Mesh - consumes signals from all domains
 * to build holistic student wellbeing profiles and enable early intervention.
 *
 * ## The Granny Explanation
 *
 * Imagine a student named Timmy. His maths teacher notices his grades slipping.
 * His homeroom teacher sees he's been absent on Mondays. The office notices his
 * mum hasn't logged into the parent portal in weeks. Each person sees one piece,
 * but nobody sees the whole picture.
 *
 * The Wellbeing module is like a caring school counsellor who talks to everyone
 * and puts the pieces together: "Timmy might be struggling at home - let's check
 * in with him and reach out to his family."
 *
 * It collects "signals" from everywhere:
 * - Attendance patterns (Monday absences, increasing tardiness)
 * - Academic changes (grade drops, missing assignments)
 * - Classroom behaviour (less participation, help requests)
 * - Parent engagement (login frequency, message responses)
 * - Direct check-ins (how are you feeling today?)
 *
 * The AI looks at all these signals together and says: "This combination of
 * patterns suggests Timmy might need support." It doesn't replace human judgment -
 * it ensures no student falls through the cracks.
 *
 * @module IntelligenceMesh/Wellbeing
 * @version 1.7.0
 */

import { MeshBaseEntity } from './mesh-types-v17';

// ============================================================================
// CORE ENUMS
// ============================================================================

export type RiskLevel = 'minimal' | 'low' | 'moderate' | 'elevated' | 'high' | 'critical';

export type WellbeingDomain =
  | 'emotional'    // Mood, anxiety, depression indicators
  | 'social'       // Peer relationships, isolation, bullying
  | 'academic'     // Learning struggles, engagement, motivation
  | 'physical'     // Health, sleep, attendance patterns
  | 'family'       // Home environment, parent engagement
  | 'safety'       // Self-harm risk, abuse indicators
  | 'purpose'      // Goals, future orientation, meaning
  | 'resilience';  // Coping skills, adaptability

export type SignalSource =
  | 'attendance'      // From Attendance module
  | 'assessment'      // From Assessment module
  | 'gradebook'       // From Gradebook module
  | 'classroom'       // From Classroom module
  | 'parent_portal'   // From Parent Portal module
  | 'check_in'        // Direct student check-ins
  | 'incident'        // Behaviour incidents
  | 'peer_report'     // Peer concern reports
  | 'staff_observation' // Teacher observations
  | 'external';       // External agency input

export type SignalSeverity = 'info' | 'minor' | 'moderate' | 'significant' | 'severe';

export type SignalStrength = 'weak' | 'moderate' | 'strong' | 'definitive';

export type SignalStatus = 'active' | 'monitoring' | 'addressed' | 'resolved' | 'expired';

export type CheckInType =
  | 'daily_mood'      // Quick daily mood check
  | 'weekly_reflection' // Weekly wellbeing reflection
  | 'incident_followup' // After an incident
  | 'intervention_check' // During intervention
  | 'return_to_school'  // After absence
  | 'transition'        // Major transitions
  | 'custom'           // Custom check-in
  | 'crisis';          // Crisis assessment

export type InterventionType =
  // Tier 1 - Universal
  | 'classroom_support'
  | 'peer_buddy'
  | 'check_in_increase'
  // Tier 2 - Targeted
  | 'counsellor_referral'
  | 'small_group'
  | 'mentoring'
  | 'parent_meeting'
  | 'academic_support'
  // Tier 3 - Intensive
  | 'individual_plan'
  | 'external_referral'
  | 'case_management'
  | 'crisis_response'
  | 'safety_plan';

export type InterventionStatus =
  | 'planned' | 'scheduled' | 'active' | 'paused'
  | 'completed' | 'cancelled' | 'effective' | 'ineffective';

export type IncidentType =
  | 'behaviour'       // Behavioural incident
  | 'bullying'        // Bullying (perpetrator or victim)
  | 'conflict'        // Peer conflict
  | 'self_harm'       // Self-harm disclosure/observation
  | 'harm_to_others'  // Violence/threats
  | 'substance'       // Substance use
  | 'truancy'         // Truancy/absconding
  | 'family_crisis'   // Family emergency
  | 'disclosure'      // Child protection disclosure
  | 'mental_health'   // Mental health crisis
  | 'medical'         // Medical emergency
  | 'grief'           // Bereavement
  | 'trauma'          // Trauma disclosure
  | 'other';

export type NotificationType =
  | 'risk_escalation' | 'check_in_required' | 'intervention_due'
  | 'parent_alert' | 'staff_alert' | 'admin_alert' | 'external_alert';

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Student's holistic wellbeing profile
 */
export interface StudentWellbeingProfile extends MeshBaseEntity {
  studentId: string;
  studentName: string;
  yearLevel: string;
  classGroups: string[];

  // Current state
  currentState: WellbeingState;

  // Domain scores
  domainScores: DomainScore[];

  // AI synthesis
  aiSynthesis?: WellbeingSynthesis;

  // Intervention state
  interventionState: {
    hasActiveIntervention: boolean;
    activeInterventionIds: string[];
    currentTier: 1 | 2 | 3;
    lastInterventionDate?: Date;
  };

  // Notification settings
  notificationSettings: {
    escalationChain: EscalationStep[];
    suppressUntil?: Date;
    customThresholds?: Partial<Record<RiskLevel, number>>;
  };

  // History summary
  historySummary: {
    signalCount30Days: number;
    checkInCount30Days: number;
    interventionCount12Months: number;
    riskLevelHistory: { date: Date; level: RiskLevel }[];
  };
}

export interface WellbeingState {
  riskLevel: RiskLevel;
  riskScore: number;                   // 0-100
  trend: 'improving' | 'stable' | 'declining' | 'volatile';
  lastAssessedAt: Date;
  assessmentMethod: 'ai_synthesis' | 'manual' | 'scheduled';

  primaryConcerns: string[];
  protectiveFactors: string[];

  requiresAttention: boolean;
  attentionReason?: string;
}

export interface DomainScore {
  domain: WellbeingDomain;
  score: number;                       // 0-100 (higher = more concern)
  riskLevel: RiskLevel;
  trend: 'improving' | 'stable' | 'declining';
  signalCount: number;
  lastSignalDate?: Date;
  aiNotes?: string;
}

export interface EscalationStep {
  triggerLevel: RiskLevel;
  notifyRoles: string[];
  notifyUserIds?: string[];
  delayMinutes: number;
  channels: ('portal' | 'email' | 'sms')[];
  requiresAcknowledgement: boolean;
}

/**
 * AI-generated wellbeing synthesis
 */
export interface WellbeingSynthesis {
  generatedAt: Date;
  modelVersion: string;
  confidence: number;

  // Overall assessment
  overallRiskLevel: RiskLevel;
  overallRiskScore: number;

  // Domain assessments
  domainAssessments: {
    domain: WellbeingDomain;
    score: number;
    riskLevel: RiskLevel;
    trend: string;
    signals: string[];
    aiNotes: string;
  }[];

  // Key findings
  activeSignals: {
    signalId: string;
    summary: string;
    contribution: number;
  }[];

  protectiveFactors: string[];

  // Recommendations
  recommendations: {
    priority: 'immediate' | 'soon' | 'monitor';
    type: InterventionType;
    rationale: string;
    suggestedActions: string[];
  }[];

  // Narrative
  narrativeSummary: string;

  // Uncertainty
  uncertainAreas: string[];
  dataGaps: string[];
}

// ============================================================================
// SIGNALS
// ============================================================================

/**
 * Individual wellbeing signal from any source
 */
export interface WellbeingSignal extends MeshBaseEntity {
  profileId: string;
  studentId: string;

  // Classification
  source: SignalSource;
  domain: WellbeingDomain;
  signalType: string;                  // Specific signal type code

  // Severity assessment
  severity: SignalSeverity;
  strength: SignalStrength;
  riskContribution: number;            // How much this contributes to risk score

  // Source data
  sourceEventId?: string;              // Original event that triggered this
  sourceEntityType?: string;
  sourceEntityId?: string;
  rawData: Record<string, any>;

  // AI interpretation
  aiInterpretation?: {
    summary: string;
    contextFactors: string[];
    relatedSignals: string[];
    confidence: number;
  };

  // Status
  status: SignalStatus;

  // Timestamps
  detectedAt: Date;
  expiresAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNote?: string;
}

/**
 * Signal type definition
 */
export interface SignalTypeDefinition {
  code: string;
  name: string;
  description: string;

  source: SignalSource;
  domain: WellbeingDomain;

  // Detection
  detectionRules: {
    eventType: string;
    conditions: Record<string, any>;
  }[];

  // Severity calculation
  severityRules: {
    condition: Record<string, any>;
    severity: SignalSeverity;
  }[];

  // Defaults
  defaultStrength: SignalStrength;
  defaultExpireDays: number;

  isActive: boolean;
}

// ============================================================================
// CHECK-INS
// ============================================================================

/**
 * Student wellbeing check-in
 */
export interface WellbeingCheckIn extends MeshBaseEntity {
  profileId: string;
  studentId: string;
  studentName: string;

  templateId: string;
  type: CheckInType;

  // Schedule
  scheduledAt?: Date;
  completedAt?: Date;

  // Responses
  responses: CheckInResponse[];

  // Calculated scores
  overallMoodScore?: number;           // 1-5 or 1-10 depending on template
  domainScores?: { domain: WellbeingDomain; score: number }[];

  // AI analysis
  aiAnalysis?: {
    sentimentScore: number;            // -1 to 1
    concernIndicators: string[];
    positiveIndicators: string[];
    recommendedFollowUp: boolean;
    followUpReason?: string;
    keyThemes: string[];
    riskFlags: string[];
    confidence: number;
  };

  // Follow-up
  requiresFollowUp: boolean;
  followUpAssignedTo?: string;
  followUpCompletedAt?: Date;
  followUpNotes?: string;

  // Context
  triggeredBy?: string;                // Event or reason for check-in
  environmentContext?: string;         // Where/when completed
}

export interface CheckInResponse {
  questionId: string;
  questionText: string;
  questionType: 'mood_scale' | 'likert' | 'text' | 'multiple_choice' | 'emoji';
  response: any;
  responseText?: string;               // Human-readable version
}

/**
 * Check-in template
 */
export interface CheckInTemplate extends MeshBaseEntity {
  name: string;
  description: string;
  type: CheckInType;

  // Questions
  questions: CheckInQuestion[];

  // Scheduling
  schedule?: {
    frequency: 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'on_demand';
    dayOfWeek?: number[];
    timeOfDay?: string;
  };

  // Targeting
  targetYearLevels?: string[];
  targetRiskLevels?: RiskLevel[];

  // AI configuration
  aiConfig: {
    analyseResponses: boolean;
    detectConcerns: boolean;
    suggestFollowUp: boolean;
  };

  isActive: boolean;
  isDefault: boolean;
}

export interface CheckInQuestion {
  id: string;
  order: number;
  text: string;
  type: 'mood_scale' | 'likert' | 'text' | 'multiple_choice' | 'emoji';
  required: boolean;

  // Type-specific options
  options?: { value: any; label: string; emoji?: string }[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };

  // Conditional
  showIf?: { questionId: string; condition: string; value: any };

  // Mapping
  mapsToDomain?: WellbeingDomain;
  concernThreshold?: number;
}

// ============================================================================
// INTERVENTIONS
// ============================================================================

/**
 * Wellbeing intervention plan
 */
export interface WellbeingIntervention extends MeshBaseEntity {
  profileId: string;
  studentId: string;
  studentName: string;

  // Classification
  type: InterventionType;
  tier: 1 | 2 | 3;

  // Details
  title: string;
  description: string;
  rationale: string;

  // Goals
  goals: InterventionGoal[];

  // Activities
  activities: InterventionActivity[];

  // Team
  leadStaffId: string;
  leadStaffName: string;
  supportTeam: { userId: string; name: string; role: string }[];

  // Timeline
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;

  // Status
  status: InterventionStatus;
  priority: 'routine' | 'priority' | 'urgent' | 'critical';

  // Review
  reviewSchedule: { date: Date; completed: boolean; notes?: string }[];
  nextReviewDate?: Date;

  // Outcome
  outcome?: {
    status: 'successful' | 'partially_successful' | 'unsuccessful' | 'inconclusive';
    summary: string;
    goalsAchieved: number;
    lessonsLearned: string[];
    recommendNextSteps: string[];
  };

  // AI learning
  aiLearningData?: {
    predictedEffectiveness: number;
    actualEffectiveness?: number;
    factorsInfluencing: string[];
    similarInterventionOutcomes: { interventionId: string; outcome: string; similarity: number }[];
  };

  // Parent involvement
  parentNotified: boolean;
  parentConsentRequired: boolean;
  parentConsentReceived?: boolean;
  parentInvolved: boolean;
}

export interface InterventionGoal {
  id: string;
  description: string;
  domain: WellbeingDomain;
  measurable: string;
  targetDate?: Date;
  achieved: boolean;
  achievedDate?: Date;
  progress: number;                    // 0-100
  progressNotes: string[];
}

export interface InterventionActivity {
  id: string;
  description: string;
  frequency: string;
  assignedTo: string;
  startDate: Date;
  endDate?: Date;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  notes: string[];
}

// ============================================================================
// INCIDENTS
// ============================================================================

/**
 * Wellbeing incident record
 */
export interface WellbeingIncident extends MeshBaseEntity {
  profileId: string;
  studentId: string;
  studentName: string;

  // Classification
  type: IncidentType;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Details
  title: string;
  description: string;
  occurredAt: Date;
  location?: string;

  // People involved
  reportedBy: string;
  reportedByRole: string;
  reportedAt: Date;

  witnessIds?: string[];
  otherStudentsInvolved?: { studentId: string; role: 'victim' | 'perpetrator' | 'witness' | 'bystander' }[];

  // Investigation
  investigation?: {
    status: 'pending' | 'in_progress' | 'completed';
    assignedTo: string;
    startedAt?: Date;
    completedAt?: Date;
    findings: string;
    evidence: { type: string; description: string; url?: string }[];
  };

  // Response
  immediateActions: string[];
  followUpActions: { action: string; assignedTo: string; dueDate?: Date; completed: boolean }[];

  // External reporting
  externalReportRequired: boolean;
  externalReportSubmitted?: boolean;
  externalReportDetails?: {
    agency: string;
    reportDate: Date;
    referenceNumber?: string;
  };

  // AI analysis
  aiAnalysis?: {
    patternMatch: boolean;
    relatedIncidents: string[];
    riskAssessment: string;
    recommendedActions: string[];
  };

  // Status
  status: 'open' | 'investigating' | 'resolved' | 'closed' | 'referred';
  resolution?: string;
  closedAt?: Date;
  closedBy?: string;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Wellbeing notification
 */
export interface WellbeingNotification extends MeshBaseEntity {
  profileId: string;
  studentId: string;

  type: NotificationType;
  priority: 'low' | 'normal' | 'high' | 'urgent';

  title: string;
  message: string;

  // Recipients
  recipientIds: string[];
  recipientRoles: string[];

  // Delivery
  channels: ('portal' | 'email' | 'sms')[];

  // Status
  sentAt?: Date;
  deliveredTo: { userId: string; channel: string; deliveredAt: Date }[];
  readBy: { userId: string; readAt: Date }[];

  // Action required
  actionRequired: boolean;
  actionDescription?: string;
  actionDueDate?: Date;
  actionCompletedBy?: string;
  actionCompletedAt?: Date;

  // Related
  relatedEntityType?: string;
  relatedEntityId?: string;
}

// ============================================================================
// AI SERVICE INTERFACE
// ============================================================================

export interface AIWellbeingService {
  // Core synthesis
  synthesiseStudentWellbeing(
    request: {
      tenantId: string;
      studentId: string;
      lookbackDays: number;
      includeSignals?: boolean;
    }
  ): Promise<WellbeingSynthesis>;

  // Check-in analysis
  analyseCheckIn(
    checkIn: WellbeingCheckIn,
    history: WellbeingCheckIn[]
  ): Promise<{
    sentimentScore: number;
    concernIndicators: string[];
    positiveIndicators: string[];
    recommendedFollowUp: boolean;
    followUpReason?: string;
    keyThemes: string[];
    riskFlags: string[];
    confidence: number;
  }>;

  // Incident analysis
  analyseIncident(
    incident: WellbeingIncident,
    profile: StudentWellbeingProfile
  ): Promise<{
    patternMatch: boolean;
    relatedIncidents: string[];
    riskAssessment: string;
    recommendedActions: string[];
  }>;

  // Intervention prediction
  predictInterventionEffectiveness(
    intervention: Partial<WellbeingIntervention>,
    profile: StudentWellbeingProfile,
    history: WellbeingIntervention[]
  ): Promise<{
    predictedEffectiveness: number;
    confidence: number;
    factorsSupporting: string[];
    factorsAgainst: string[];
    alternativeSuggestions: InterventionType[];
  }>;

  // Signal interpretation
  interpretSignal(
    signal: WellbeingSignal,
    profile: StudentWellbeingProfile,
    recentSignals: WellbeingSignal[]
  ): Promise<{
    summary: string;
    contextFactors: string[];
    relatedSignals: string[];
    recommendedActions: string[];
    confidence: number;
  }>;

  // Cohort analysis
  analyseCohort(
    tenantId: string,
    cohort: { type: 'school' | 'year_level' | 'class'; identifier: string }
  ): Promise<{
    overallHealth: 'excellent' | 'good' | 'fair' | 'concerning';
    riskDistribution: Record<RiskLevel, number>;
    topConcerns: { domain: WellbeingDomain; studentCount: number }[];
    trends: string[];
    recommendations: string[];
  }>;

  // Emerging concern detection
  detectEmergingConcerns(
    tenantId: string,
    timeframeHours: number
  ): Promise<{
    studentsOfConcern: {
      studentId: string;
      reason: string;
      urgency: 'low' | 'medium' | 'high';
      recommendedAction: string;
    }[];
  }>;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface WellbeingAnalytics {
  tenantId: string;
  generatedAt: Date;
  period: { start: Date; end: Date };

  cohort: {
    type: 'school' | 'year_level' | 'class_group';
    identifier: string;
    studentCount: number;
  };

  // Risk distribution
  riskDistribution: {
    level: RiskLevel;
    count: number;
    percentage: number;
    change: number;                    // vs previous period
  }[];

  // Domain breakdown
  domainBreakdown: {
    domain: WellbeingDomain;
    averageScore: number;
    studentsAtRisk: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];

  // Signals
  signalMetrics: {
    totalSignals: number;
    bySource: { source: SignalSource; count: number }[];
    bySeverity: { severity: SignalSeverity; count: number }[];
    topSignalTypes: { type: string; count: number }[];
  };

  // Check-ins
  checkInMetrics: {
    totalCheckIns: number;
    completionRate: number;
    averageMoodScore: number;
    followUpRequired: number;
  };

  // Interventions
  interventionMetrics: {
    activeInterventions: number;
    newInterventions: number;
    completedInterventions: number;
    successRate: number;
    byType: { type: InterventionType; count: number }[];
  };

  // Incidents
  incidentMetrics: {
    totalIncidents: number;
    byType: { type: IncidentType; count: number }[];
    bySeverity: { severity: string; count: number }[];
    resolutionRate: number;
  };

  // AI insights
  aiInsights: {
    overallAssessment: string;
    emergingPatterns: string[];
    recommendations: string[];
    predictedTrends: string[];
  };
}

