/**
 * Parent Portal Module - Type Definitions
 * 
 * The partnership interface - translating complex educational data into actionable
 * insights for parents and enabling seamless school-home communication.
 * 
 * ## The Granny Explanation
 * 
 * Remember when parents only knew how their kids were doing at school from report
 * cards twice a year? The Parent Portal changes that completely.
 * 
 * It's like having a friendly translator who:
 * - Turns complicated school data into plain language ("Timmy is doing great in
 *   reading but might need help with fractions")
 * - Knows the best time to reach each parent (Mrs. Smith checks emails at 7pm,
 *   Mr. Jones prefers text messages)
 * - Makes booking parent-teacher meetings as easy as booking a restaurant
 * - Keeps track of permission slips and consent forms
 * - Alerts parents when something needs attention, but doesn't overwhelm them
 * 
 * The AI helps by:
 * - Writing messages in the parent's preferred language and reading level
 * - Predicting which parents might be disengaging and need outreach
 * - Suggesting the best time to send important messages
 * - Preparing teachers for parent meetings with relevant context
 * 
 * @module IntelligenceMesh/ParentPortal
 * @version 1.7.0
 */

import { MeshBaseEntity } from '../shared/mesh-types';

// ============================================================================
// CORE ENUMS
// ============================================================================

export type GuardianRelationship = 
  | 'mother' | 'father' | 'stepmother' | 'stepfather'
  | 'grandmother' | 'grandfather' | 'guardian' | 'other';

export type PortalAccessLevel = 'full' | 'limited' | 'view_only';

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export type MessageCategory = 
  | 'general' | 'academic' | 'behaviour' | 'attendance' 
  | 'wellbeing' | 'administrative' | 'event';

export type MeetingType = 
  | 'parent_teacher' | 'progress_review' | 'behaviour_concern'
  | 'wellbeing_support' | 'transition' | 'other';

export type MeetingStatus = 
  | 'requested' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no_show';

export type ConsentType = 
  | 'excursion' | 'photo_video' | 'medical' | 'data_sharing'
  | 'program_participation' | 'assessment' | 'general';

export type ConsentStatus = 'pending' | 'granted' | 'denied' | 'expired' | 'withdrawn';

export type ActionCategory = 
  | 'form' | 'payment' | 'consent' | 'meeting' 
  | 'document' | 'response' | 'other';

export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export type EngagementLevel = 'highly_engaged' | 'engaged' | 'moderate' | 'low' | 'disengaged';

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Parent/Guardian profile
 */
export interface ParentPortalGuardian extends MeshBaseEntity {
  userId: string;
  
  // Identity
  firstName: string;
  lastName: string;
  preferredName?: string;
  
  // Contact
  email: string;
  phone?: string;
  phoneSecondary?: string;
  
  // Preferences
  preferredLanguage: string;
  preferredContactMethod: 'email' | 'sms' | 'phone' | 'portal';
  communicationPreferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    digestFrequency: 'immediate' | 'daily' | 'weekly';
    quietHoursStart?: string;
    quietHoursEnd?: string;
  };
  
  // Students
  studentLinks: ParentStudentLink[];
  
  // Engagement
  engagementMetrics: GuardianEngagementMetrics;
  engagementLevel: EngagementLevel;
  
  // AI profile
  aiProfile?: {
    optimalContactTime: string;
    optimalContactDay: string;
    responsePatterns: {
      averageResponseTime: number;
      preferredChannels: string[];
      topicResponsiveness: { topic: string; rate: number }[];
    };
    engagementPrediction: {
      nextMonthLevel: EngagementLevel;
      riskOfDisengagement: number;
      factorsInfluencing: string[];
    };
    communicationStyle: 'formal' | 'casual' | 'direct' | 'detailed';
  };
}

export interface ParentStudentLink {
  studentId: string;
  studentName: string;
  relationship: GuardianRelationship;
  isPrimary: boolean;
  
  // Permissions
  permissions: {
    viewGrades: boolean;
    viewAttendance: boolean;
    viewBehaviour: boolean;
    viewWellbeing: boolean;
    viewMedical: boolean;
    communicateWithStaff: boolean;
    bookMeetings: boolean;
    giveConsent: boolean;
    makePayments: boolean;
  };
  
  portalAccessLevel: PortalAccessLevel;
  
  // Custody/access notes
  accessRestrictions?: string;
}

export interface GuardianEngagementMetrics {
  // Login metrics
  lastLoginAt?: Date;
  loginCount30Days: number;
  averageSessionDuration: number;
  
  // Communication metrics
  messagesReceived: number;
  messagesRead: number;
  messageReadRate: number;
  averageResponseTime: number;         // Hours
  responseRate: number;
  
  // Resource access
  reportsViewed: number;
  gradesChecked: number;
  attendanceChecked: number;
  
  // Meeting participation
  meetingsAttended: number;
  meetingsMissed: number;
  meetingAttendanceRate: number;
  
  // Action completion
  actionsCompleted: number;
  actionsOverdue: number;
  actionCompletionRate: number;
  
  // Overall
  engagementScore: number;             // 0-100
  engagementTrend: 'improving' | 'stable' | 'declining';
}

// ============================================================================
// MESSAGING
// ============================================================================

/**
 * Parent message
 */
export interface ParentMessage extends MeshBaseEntity {
  threadId?: string;
  
  // Participants
  senderId: string;
  senderType: 'parent' | 'staff' | 'system';
  senderName: string;
  recipientId: string;
  recipientType: 'parent' | 'staff';
  recipientName: string;
  
  // Context
  studentIds: string[];
  
  // Content
  subject?: string;
  content: string;
  contentType: 'text' | 'html' | 'markdown';
  
  // Classification
  priority: MessagePriority;
  category: MessageCategory;
  
  // Attachments
  attachments?: { id: string; name: string; url: string; type: string; size: number }[];
  
  // Delivery
  sentAt: Date;
  deliveredAt?: Date;
  deliveryMethod: 'portal' | 'email' | 'sms' | 'push';
  readAt?: Date;
  
  // AI metadata
  aiMetadata?: {
    sentiment: number;
    urgencyScore: number;
    topicClassification: string[];
    suggestedResponses?: string[];
    translatedContent?: Record<string, string>;
    readabilityScore: number;
    simplifiedContent?: string;
  };
}

/**
 * Message thread
 */
export interface MessageThread extends MeshBaseEntity {
  subject: string;
  participants: { id: string; type: 'parent' | 'staff'; name: string }[];
  studentIds: string[];
  category: MessageCategory;
  
  messageCount: number;
  lastMessageAt: Date;
  lastMessageBy: string;
  
  status: 'active' | 'archived' | 'closed';
  closedAt?: Date;
  closedBy?: string;
}

/**
 * Broadcast message
 */
export interface ParentBroadcast extends MeshBaseEntity {
  // Targeting
  targetType: 'all' | 'year_level' | 'class_group' | 'custom';
  targetYearLevels?: string[];
  targetClassGroups?: string[];
  targetGuardianIds?: string[];
  
  // Content
  subject: string;
  content: string;
  contentType: 'text' | 'html' | 'markdown';
  priority: MessagePriority;
  category: MessageCategory;
  
  attachments?: { id: string; name: string; url: string; type: string }[];
  
  // Scheduling
  scheduledFor?: Date;
  sentAt?: Date;
  sentBy: string;
  
  // Delivery
  deliveryChannels: ('portal' | 'email' | 'sms' | 'push')[];
  
  // Stats
  recipientCount: number;
  deliveredCount: number;
  readCount: number;
  
  // AI optimisation
  aiOptimised?: {
    optimalSendTime: Date;
    subjectVariants: string[];
    predictedOpenRate: number;
  };
}

// ============================================================================
// MEETINGS
// ============================================================================

/**
 * Parent-teacher meeting
 */
export interface ParentMeeting extends MeshBaseEntity {
  guardianId: string;
  guardianName: string;
  staffId: string;
  staffName: string;
  studentIds: string[];
  
  type: MeetingType;
  title: string;
  description?: string;
  agenda?: string[];
  
  // Scheduling
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;
  
  // Location
  locationType: 'in_person' | 'video' | 'phone';
  location?: string;
  meetingUrl?: string;
  dialInNumber?: string;
  
  // Status
  status: MeetingStatus;
  requestedBy: 'parent' | 'staff';
  requestedAt: Date;
  confirmedAt?: Date;
  
  // Attendance
  attendedByParent?: boolean;
  attendedByStaff?: boolean;
  
  // Notes
  staffNotes?: string;
  sharedNotes?: string;
  
  // Outcomes
  outcomes?: string[];
  followUpActions?: { id: string; description: string; assignedTo: 'parent' | 'staff'; dueDate?: Date; completed: boolean }[];
  
  // AI support
  aiPrep?: {
    suggestedTopics: string[];
    studentSummary: string;
    recentConcerns: string[];
    positiveHighlights: string[];
    questionsToConsider: string[];
  };
}

/**
 * Meeting slot
 */
export interface MeetingSlot {
  id: string;
  staffId: string;
  staffName: string;
  
  startTime: Date;
  endTime: Date;
  timezone: string;
  
  meetingTypes: MeetingType[];
  locationType: 'in_person' | 'video' | 'phone' | 'any';
  location?: string;
  
  isAvailable: boolean;
  bookedBy?: string;
}

// ============================================================================
// CONSENTS
// ============================================================================

/**
 * Consent request
 */
export interface ParentConsent extends MeshBaseEntity {
  guardianId: string;
  studentId: string;
  studentName: string;
  
  consentType: ConsentType;
  title: string;
  description: string;
  
  details?: Record<string, any>;
  documentUrl?: string;
  
  // Request
  requestedAt: Date;
  requestedBy: string;
  requestedByName: string;
  expiresAt?: Date;
  
  // Response
  status: ConsentStatus;
  respondedAt?: Date;
  response?: boolean;
  responseNote?: string;
  responseSignature?: string;
  
  // Validity
  validFrom?: Date;
  validUntil?: Date;
  
  // Reminders
  remindersSent: number;
  lastReminderAt?: Date;
  nextReminderAt?: Date;
}

// ============================================================================
// ACTION ITEMS
// ============================================================================

/**
 * Action item for parent
 */
export interface ParentActionItem extends MeshBaseEntity {
  guardianId: string;
  studentIds: string[];
  
  title: string;
  description: string;
  category: ActionCategory;
  
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  
  status: ActionStatus;
  completedAt?: Date;
  
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  
  reminderEnabled: boolean;
  remindersSent: number;
  lastReminderAt?: Date;
}

// ============================================================================
// LEARNING SUMMARIES
// ============================================================================

/**
 * Student learning summary for parents
 */
export interface StudentLearningSummary {
  studentId: string;
  studentName: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  
  overallProgress: {
    summary: string;
    trend: 'excellent' | 'good' | 'steady' | 'needs_attention';
    highlights: string[];
    areasForGrowth: string[];
  };
  
  subjects: {
    subject: string;
    grade?: string;
    trend: 'improving' | 'stable' | 'declining';
    summary: string;
    recentWork: { title: string; score?: number; date: Date }[];
  }[];
  
  attendance: {
    present: number;
    absent: number;
    late: number;
    rate: number;
    summary: string;
  };
  
  wellbeing?: {
    summary: string;
    recentMood: 'positive' | 'neutral' | 'needs_support';
    supportInPlace: string[];
  };
  
  homeSupport: {
    recommendation: string;
    resources: { title: string; url: string }[];
  }[];
  
  upcoming: {
    assessments: { title: string; date: Date; subject: string }[];
    events: { title: string; date: Date; requiresAction: boolean }[];
  };
}

// ============================================================================
// AI SERVICE INTERFACE
// ============================================================================

export interface AIParentPortalService {
  // Message optimisation
  optimiseMessage(
    message: Partial<ParentMessage>,
    guardian: ParentPortalGuardian
  ): Promise<{
    optimisedContent: string;
    simplifiedContent: string;
    suggestedSubject: string;
    predictedReadProbability: number;
    translations?: Record<string, string>;
  }>;
  
  // Broadcast optimisation
  optimiseBroadcast(
    broadcast: Partial<ParentBroadcast>,
    targetGuardians: ParentPortalGuardian[]
  ): Promise<{
    optimalSendTime: Date;
    subjectVariants: { subject: string; predictedOpenRate: number }[];
    contentVariants: { variant: string; targetAudience: string }[];
    segmentRecommendations: { segment: string; channel: string; timing: Date }[];
  }>;
  
  // Learning summary generation
  generateLearningSummary(
    studentId: string,
    period: { start: Date; end: Date },
    guardianPreferences: { language: string; detailLevel: 'brief' | 'detailed'; focusAreas?: string[] }
  ): Promise<StudentLearningSummary>;
  
  // Meeting preparation
  prepareMeetingBrief(
    meeting: ParentMeeting,
    studentData: any
  ): Promise<{
    suggestedTopics: string[];
    studentSummary: string;
    recentConcerns: string[];
    positiveHighlights: string[];
    questionsToConsider: string[];
  }>;
  
  // Engagement prediction
  predictEngagement(
    guardian: ParentPortalGuardian,
    lookforwardDays: number
  ): Promise<{
    predictedLevel: EngagementLevel;
    riskOfDisengagement: number;
    riskFactors: string[];
    recommendedActions: { action: string; rationale: string; priority: 'high' | 'medium' | 'low' }[];
  }>;
  
  // Response suggestions
  suggestResponses(
    message: ParentMessage,
    context: { staffRole: string; studentInfo: any }
  ): Promise<{
    responses: { tone: 'formal' | 'warm' | 'direct'; content: string; suitability: number }[];
  }>;
  
  // Anomaly detection
  detectEngagementAnomalies(
    tenantId: string,
    threshold: number
  ): Promise<{
    guardianId: string;
    anomalyType: 'sudden_drop' | 'gradual_decline' | 'no_response';
    severity: 'low' | 'medium' | 'high';
    details: string;
    recommendedAction: string;
  }[]>;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface ParentEngagementAnalytics {
  tenantId: string;
  schoolId: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  
  cohort: {
    type: 'school' | 'year_level' | 'class_group';
    identifier: string;
    guardianCount: number;
    studentCount: number;
  };
  
  engagementDistribution: {
    highlyEngaged: number;
    engaged: number;
    moderate: number;
    low: number;
    disengaged: number;
  };
  
  communicationMetrics: {
    messagesSent: number;
    messagesRead: number;
    readRate: number;
    averageResponseTime: number;
    responseRate: number;
  };
  
  portalUsage: {
    activeUsers: number;
    averageLoginsPerUser: number;
    mostAccessedFeatures: { feature: string; accessCount: number }[];
    peakUsageTimes: { hour: number; count: number }[];
  };
  
  meetingMetrics: {
    totalScheduled: number;
    attendanceRate: number;
    averageMeetingsPerFamily: number;
  };
  
  consentMetrics: {
    pending: number;
    grantedRate: number;
    averageResponseTime: number;
  };
  
  atRiskFamilies: {
    guardianId: string;
    studentIds: string[];
    riskIndicators: string[];
    recommendedAction: string;
  }[];
  
  aiInsights: {
    trends: string[];
    recommendations: string[];
    predictedChallenges: string[];
  };
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export interface ParentNotification {
  id: string;
  tenantId: string;
  guardianId: string;
  
  type: 'message' | 'report' | 'consent' | 'action' | 'meeting' | 'alert';
  title: string;
  body: string;
  
  priority: MessagePriority;
  
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  
  channels: ('portal' | 'email' | 'sms' | 'push')[];
  
  createdAt: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  readAt?: Date;
  
  deliveryStatus: {
    channel: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    sentAt?: Date;
    error?: string;
  }[];
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  ParentPortalGuardian,
  ParentStudentLink,
  GuardianEngagementMetrics,
  ParentMessage,
  MessageThread,
  ParentBroadcast,
  ParentMeeting,
  MeetingSlot,
  ParentConsent,
  ParentActionItem,
  StudentLearningSummary,
  ParentEngagementAnalytics,
  ParentNotification
};
