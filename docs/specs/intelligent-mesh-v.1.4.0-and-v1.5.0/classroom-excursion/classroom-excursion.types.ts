/**
 * Classroom & Excursion Module - Type Definitions
 * 
 * Extends the Intelligence Mesh Attendance module with:
 * - AI-Assisted Roll Call with seating arrangements
 * - Real-time help requests during lessons
 * - Offline-capable excursion management
 * - Outdoor discovery and capture tools
 * - End-of-lesson feedback with school pulse
 * 
 * ## The Granny Explanation
 * 
 * Imagine a school excursion to the national park. It's beautiful but there's
 * no phone signal. The teacher needs to count heads at every checkpoint -
 * missing a child could be catastrophic. With paper lists, they tick names,
 * but what if the list blows away? What if they miscount?
 * 
 * This module is like having a smart clipboard that:
 * - Works without internet (stores everything locally)
 * - Instantly alerts if someone's missing at a checkpoint
 * - Sends the alert the moment signal returns
 * - Lets kids capture photos/notes for their assignment
 * - Tracks who's done what, even offline
 * 
 * Back in the classroom, it's like having eyes in the back of your head:
 * - Kids can silently flag "I'm stuck" without embarrassment
 * - Seating is optimized so troublemakers don't sit together
 * - End-of-lesson feedback tells the principal which lessons are struggling
 * 
 * @module IntelligenceMesh/ClassroomExcursion
 * @version 1.0.0
 */

import {
  MeshBaseEntity, MeshStudent, MeshStaff, AttendanceRecord, AttendanceStatus
} from '../shared/mesh-types';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Methods for taking roll call
 */
export enum RollCallMethod {
  MANUAL = 'manual',
  QR_SCAN = 'qr_scan',
  NFC_TAP = 'nfc_tap',
  FACIAL = 'facial',
  VOICE = 'voice',
  GEOFENCE = 'geofence',
  AI_ASSISTED = 'ai_assisted'
}

/**
 * Seating arrangement layouts
 */
export enum SeatingLayoutType {
  ROWS = 'rows',
  CLUSTERS = 'clusters',
  U_SHAPE = 'u_shape',
  CIRCLE = 'circle',
  PAIRS = 'pairs',
  FLEXIBLE = 'flexible',
  CUSTOM = 'custom'
}

/**
 * AI strategies for seating optimization
 */
export enum SeatingStrategy {
  MANUAL = 'manual',
  RANDOM = 'random',
  ALPHABETICAL = 'alphabetical',
  AI_COLLABORATIVE = 'ai_collaborative',
  AI_MINIMIZE_DISRUPTION = 'ai_minimize_disruption',
  AI_PEER_SUPPORT = 'ai_peer_support',
  MIXED_ABILITY = 'mixed_ability',
  ABILITY_GROUPED = 'ability_grouped'
}

/**
 * Types of help a student can request
 */
export enum HelpRequestType {
  CLARIFICATION = 'clarification',
  STUCK = 'stuck',
  PREREQUISITE_GAP = 'prerequisite_gap',
  PACE_TOO_FAST = 'pace_too_fast',
  PACE_TOO_SLOW = 'pace_too_slow',
  TECHNICAL = 'technical',
  WELLBEING = 'wellbeing',
  OTHER = 'other'
}

/**
 * Urgency levels for help requests
 */
export enum HelpUrgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Help request status progression
 */
export enum HelpRequestStatus {
  PENDING = 'pending',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
  DEFERRED = 'deferred'
}

/**
 * Excursion lifecycle states
 */
export enum ExcursionStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PERMISSIONS_SENT = 'permissions_sent',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * Parent consent status for excursions
 */
export enum ConsentStatus {
  NOT_REQUESTED = 'not_requested',
  REQUESTED = 'requested',
  REMINDED = 'reminded',
  GRANTED = 'granted',
  DENIED = 'denied',
  EXPIRED = 'expired'
}

/**
 * Student check-in status during excursion
 */
export enum CheckInStatus {
  NOT_CHECKED_IN = 'not_checked_in',
  DEPARTED = 'departed',
  AT_DESTINATION = 'at_destination',
  RETURNING = 'returning',
  RETURNED = 'returned',
  MISSING = 'missing',
  MEDICAL = 'medical',
  EARLY_DEPARTURE = 'early_departure'
}

/**
 * Types of captures for outdoor discovery
 */
export enum CaptureType {
  PHOTO = 'photo',
  VIDEO = 'video',
  AUDIO = 'audio',
  TEXT_NOTE = 'text_note',
  VOICE_MEMO = 'voice_memo',
  SKETCH = 'sketch',
  LOCATION_PIN = 'location_pin',
  SENSOR_DATA = 'sensor_data',
  QR_SCAN = 'qr_scan',
  AR_MARKER = 'ar_marker'
}

/**
 * Discovery task completion status
 */
export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  REVIEWED = 'reviewed',
  COMPLETED = 'completed',
  SKIPPED = 'skipped'
}

/**
 * Feedback question types
 */
export enum FeedbackQuestionType {
  RATING = 'rating',
  EMOJI = 'emoji',
  SLIDER = 'slider',
  MULTIPLE_CHOICE = 'multiple_choice',
  BOOLEAN = 'boolean',
  FREE_TEXT = 'free_text'
}

/**
 * Sentiment analysis results
 */
export enum Sentiment {
  VERY_NEGATIVE = 'very_negative',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  POSITIVE = 'positive',
  VERY_POSITIVE = 'very_positive'
}

/**
 * Sync status for offline records
 */
export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
  CONFLICT = 'conflict'
}

/**
 * Sync priority (higher = sync first)
 */
export enum SyncPriority {
  CRITICAL = 100,  // Missing student alerts
  HIGH = 75,       // Check-ins, attendance
  NORMAL = 50,     // Captures, progress
  LOW = 25         // Analytics
}

// ============================================================================
// CLASS SESSION INTERFACES
// ============================================================================

/**
 * A class session (specific instance of a scheduled class)
 */
export interface ClassSession extends MeshBaseEntity {
  schoolId: string;
  classId: string;
  className: string;
  subject: string;
  yearLevel: string;
  
  teacherId: string;
  teacherName: string;
  
  roomId?: string;
  roomName?: string;
  
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  
  periodNumber?: number;
  timetableSlotId?: string;
  lessonPlanId?: string;
  curriculumCodes?: string[];
  
  expectedStudentIds: string[];
  
  seatingArrangementId?: string;
  excursionId?: string;
  
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * Roll call for a class session
 */
export interface SessionRollCall extends MeshBaseEntity {
  sessionId: string;
  
  takenAt: Date;
  takenBy: string;
  method: RollCallMethod;
  
  isReRoll: boolean;
  previousRollCallId?: string;
  
  attendance: StudentSessionAttendance[];
  
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  
  aiSuggestions?: AIRollCallSuggestion[];
  
  location?: GeoLocation;
  deviceId?: string;
  
  syncStatus: SyncStatus;
  syncedAt?: Date;
}

/**
 * Individual student attendance in a session
 */
export interface StudentSessionAttendance {
  studentId: string;
  studentName: string;
  
  status: AttendanceStatus;
  markedAt: Date;
  markedBy: string;
  
  arrivalTime?: Date;
  departureTime?: Date;
  
  reason?: string;
  reasonApproved?: boolean;
  parentNotified?: boolean;
  
  notes?: string;
  
  aiConfidence?: number;
  wasOverridden?: boolean;
  seatId?: string;
}

/**
 * AI suggestion for roll call
 */
export interface AIRollCallSuggestion {
  studentId: string;
  suggestedStatus: AttendanceStatus;
  confidence: number;
  reasoning: string;
  basedOn: ('historical_pattern' | 'visual_recognition' | 'device_proximity' | 'schedule_analysis')[];
}

// ============================================================================
// SEATING INTERFACES
// ============================================================================

/**
 * Classroom layout definition
 */
export interface ClassroomLayout extends MeshBaseEntity {
  roomId: string;
  roomName: string;
  
  type: SeatingLayoutType;
  
  dimensions: {
    width: number;
    height: number;
  };
  
  seats: SeatPosition[];
  fixedElements: LayoutElement[];
  
  capacity: number;
  isDefault: boolean;
}

/**
 * Position of a seat in the layout
 */
export interface SeatPosition {
  id: string;
  x: number;
  y: number;
  label?: string;
  groupId?: string;
  isAvailable: boolean;
  attributes?: ('near_front' | 'near_door' | 'near_window' | 'accessible' | 'quiet_zone')[];
}

/**
 * Fixed element in classroom layout
 */
export interface LayoutElement {
  id: string;
  type: 'teacher_desk' | 'whiteboard' | 'door' | 'window' | 'storage' | 'computer_station';
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

/**
 * Seating arrangement for a class
 */
export interface SeatingArrangement extends MeshBaseEntity {
  classId: string;
  layoutId: string;
  
  name: string;
  description?: string;
  
  strategy: SeatingStrategy;
  assignments: SeatAssignment[];
  groups?: SeatingGroup[];
  
  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;
  
  aiScore?: {
    overall: number;
    collaboration: number;
    behaviorManagement: number;
    accessibility: number;
  };
}

/**
 * Student assigned to a seat
 */
export interface SeatAssignment {
  studentId: string;
  studentName: string;
  seatId: string;
  groupId?: string;
  reason?: string;
  isManualOverride?: boolean;
}

/**
 * Group of seats (for collaborative work)
 */
export interface SeatingGroup {
  id: string;
  name: string;
  color?: string;
  seatIds: string[];
  purpose?: string;
}

// ============================================================================
// HELP REQUEST INTERFACES
// ============================================================================

/**
 * Student help request during lesson
 */
export interface HelpRequest extends MeshBaseEntity {
  sessionId: string;
  
  studentId: string;
  studentName: string;
  
  type: HelpRequestType;
  urgency: HelpUrgency;
  status: HelpRequestStatus;
  
  description?: string;
  topic?: string;
  curriculumCode?: string;
  seatId?: string;
  
  isAnonymousToClass: boolean;
  
  submittedAt: Date;
  acknowledgedAt?: Date;
  helpStartedAt?: Date;
  resolvedAt?: Date;
  
  resolutionNotes?: string;
  teacherNotes?: string;
  deferredToAfterClass?: boolean;
  followUpScheduled?: Date;
  
  aiSuggestedResources?: {
    type: 'video' | 'article' | 'practice' | 'tutor';
    title: string;
    url?: string;
    relevanceScore: number;
  }[];
  
  syncStatus: SyncStatus;
}

/**
 * Post-lesson help reflection
 */
export interface PostLessonHelpRequest extends MeshBaseEntity {
  sessionId: string;
  studentId: string;
  
  confusedTopics: {
    topic: string;
    curriculumCode?: string;
    description?: string;
  }[];
  
  preferredHelpMethod: 'teacher_time' | 'peer_help' | 'tutor' | 'online_resources' | 'any';
  availability?: string;
  
  submittedAt: Date;
  
  teacherResponse?: {
    message: string;
    scheduledHelp?: Date;
    assignedResources?: string[];
    respondedAt: Date;
  };
  
  status: 'pending' | 'acknowledged' | 'scheduled' | 'resolved';
}

// ============================================================================
// EXCURSION INTERFACES
// ============================================================================

/**
 * Excursion/field trip definition
 */
export interface Excursion extends MeshBaseEntity {
  schoolId: string;
  
  name: string;
  description: string;
  
  educationalObjectives: string[];
  curriculumCodes: string[];
  subjects: string[];
  yearLevels: string[];
  classIds: string[];
  
  leadTeacherId: string;
  leadTeacherName: string;
  leadTeacherMobile: string;
  
  supervisingStaff: ExcursionStaff[];
  
  date: Date;
  departureTime: Date;
  expectedReturnTime: Date;
  actualReturnTime?: Date;
  
  destinations: ExcursionDestination[];
  transport: ExcursionTransport;
  
  costs: {
    perStudent: number;
    totalEstimate: number;
    currency: string;
    inclusions: string[];
  };
  
  status: ExcursionStatus;
  approvals: ExcursionApproval[];
  
  riskAssessment: RiskAssessment;
  emergencyProcedures: EmergencyProcedures;
  
  studentManifest: ExcursionStudent[];
  checkpoints: ExcursionCheckpoint[];
  
  discoveryTasks?: DiscoveryTask[];
  weatherContingency?: string;
  notes?: string;
}

/**
 * Staff member on excursion
 */
export interface ExcursionStaff {
  staffId: string;
  name: string;
  role: 'lead' | 'supervisor' | 'first_aid' | 'driver' | 'specialist';
  mobileNumber: string;
  wwccNumber: string;
  wwccVerified: boolean;
  firstAidCertified: boolean;
  assignedGroup?: string;
}

/**
 * Excursion destination
 */
export interface ExcursionDestination {
  id: string;
  name: string;
  address: string;
  location: GeoLocation;
  geofenceRadius: number;
  arrivalTime: Date;
  departureTime: Date;
  contactName?: string;
  contactPhone?: string;
  activities: string[];
  facilities: ('toilets' | 'first_aid' | 'shelter' | 'food' | 'wifi')[];
}

/**
 * Transport details
 */
export interface ExcursionTransport {
  type: 'bus' | 'train' | 'walking' | 'private_vehicle' | 'mixed';
  provider?: string;
  vehicleDetails?: string;
  capacity?: number;
  meetingPoint: string;
  meetingTime: Date;
  returnDropoff: string;
}

/**
 * Excursion approval
 */
export interface ExcursionApproval {
  role: 'department_head' | 'principal' | 'deputy' | 'admin';
  approverId?: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'conditional';
  conditions?: string;
  comments?: string;
  decidedAt?: Date;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  assessedBy: string;
  assessedAt: Date;
  overallRisk: 'low' | 'medium' | 'high';
  
  risks: {
    category: 'transport' | 'activity' | 'environment' | 'medical' | 'supervision' | 'other';
    description: string;
    likelihood: 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost_certain';
    impact: 'negligible' | 'minor' | 'moderate' | 'major' | 'catastrophic';
    mitigations: string[];
    residualRisk: 'low' | 'medium' | 'high';
  }[];
  
  staffRatio: {
    required: number;
    actual: number;
    meetsRequirement: boolean;
  };
}

/**
 * Emergency procedures
 */
export interface EmergencyProcedures {
  emergencyContact: { name: string; role: string; phone: string };
  schoolContact: { name: string; phone: string };
  nearestHospital: { name: string; address: string; phone: string };
  assemblyPoint: string;
  procedures: { scenario: string; steps: string[] }[];
}

/**
 * Student on excursion manifest
 */
export interface ExcursionStudent {
  studentId: string;
  studentName: string;
  yearLevel: string;
  classId: string;
  photoUrl?: string;
  
  consentStatus: ConsentStatus;
  consentReceivedAt?: Date;
  consentDeniedReason?: string;
  
  medicalInfo?: {
    conditions: string[];
    medications: string[];
    allergies: string[];
    dietaryRequirements: string[];
    specialNeeds: string[];
  };
  
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  
  groupId?: string;
  groupName?: string;
  
  checkInStatus: CheckInStatus;
  checkInHistory: CheckInRecord[];
  
  hasDiscoveryDevice?: boolean;
  deviceId?: string;
}

/**
 * Excursion checkpoint
 */
export interface ExcursionCheckpoint {
  id: string;
  name: string;
  type: 'departure' | 'arrival' | 'activity' | 'meal' | 'return' | 'custom';
  scheduledTime: Date;
  location?: GeoLocation;
  requiresFullCount: boolean;
  
  rollCallCompleted?: boolean;
  rollCallTime?: Date;
  rollCallBy?: string;
  presentCount?: number;
  missingStudents?: string[];
}

/**
 * Check-in record
 */
export interface CheckInRecord {
  checkpointId: string;
  checkpointName: string;
  status: CheckInStatus;
  checkedAt: Date;
  checkedBy: string;
  method: 'manual' | 'qr_scan' | 'geofence' | 'nfc';
  location?: GeoLocation;
  notes?: string;
  
  syncStatus: SyncStatus;
  syncedAt?: Date;
}

// ============================================================================
// DISCOVERY & CAPTURE INTERFACES
// ============================================================================

/**
 * Discovery task for excursion
 */
export interface DiscoveryTask extends MeshBaseEntity {
  excursionId: string;
  
  title: string;
  instructions: string;
  learningObjectives: string[];
  curriculumCodes: string[];
  
  type: 'individual' | 'group' | 'whole_class';
  
  requiredCaptures: {
    type: CaptureType;
    count: number;
    description: string;
    rubric?: CaptureRubric;
  }[];
  
  locationBound?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    locationName: string;
  };
  
  availableFrom?: Date;
  availableUntil?: Date;
  
  points?: number;
  hints?: string[];
  sequenceOrder?: number;
  prerequisites?: string[];
}

/**
 * Rubric for capture assessment
 */
export interface CaptureRubric {
  criteria: {
    name: string;
    description: string;
    maxPoints: number;
  }[];
}

/**
 * Student progress on discovery task
 */
export interface DiscoveryTaskProgress extends MeshBaseEntity {
  taskId: string;
  excursionId: string;
  
  participantType: 'student' | 'group';
  participantId: string;
  participantName: string;
  memberIds?: string[];
  
  status: TaskStatus;
  captures: StudentCapture[];
  
  startedAt?: Date;
  submittedAt?: Date;
  
  review?: {
    reviewedBy: string;
    reviewedAt: Date;
    score?: number;
    feedback?: string;
    rubricScores?: { criterionName: string; score: number; comment?: string }[];
  };
  
  pointsEarned?: number;
  
  syncStatus: SyncStatus;
}

/**
 * Student capture (photo, note, etc.)
 */
export interface StudentCapture {
  id: string;
  type: CaptureType;
  
  // For media
  localBlobId?: string;
  serverUrl?: string;
  fileSize?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  
  // For text
  textContent?: string;
  
  // For audio/voice
  transcription?: string;
  duration?: number;
  
  // For sensor data
  sensorData?: {
    sensorType: string;
    value: number;
    unit: string;
  };
  
  caption?: string;
  tags?: string[];
  
  location?: GeoLocation;
  capturedAt: Date;
  deviceId?: string;
  
  aiAnalysis?: {
    objects?: string[];
    text?: string[];
    labels?: string[];
    description?: string;
  };
  
  syncStatus: SyncStatus;
  syncedAt?: Date;
}

/**
 * Real-time student activity on excursion
 */
export interface StudentExcursionActivity {
  studentId: string;
  studentName: string;
  excursionId: string;
  
  currentStatus: CheckInStatus;
  
  lastLocation?: GeoLocation & { timestamp: Date };
  
  currentTaskId?: string;
  currentTaskName?: string;
  taskStatus?: TaskStatus;
  
  tasksCompleted: number;
  totalTasks: number;
  capturesSubmitted: number;
  
  lastActivityAt: Date;
  lastActivityType: string;
  
  alerts?: {
    type: 'off_task' | 'out_of_bounds' | 'inactive' | 'low_battery' | 'sos';
    message: string;
    since: Date;
  }[];
  
  batteryLevel?: number;
  deviceOnline: boolean;
}

// ============================================================================
// LESSON FEEDBACK INTERFACES
// ============================================================================

/**
 * Feedback template for lessons
 */
export interface LessonFeedbackTemplate extends MeshBaseEntity {
  name: string;
  description?: string;
  
  questions: FeedbackQuestion[];
  
  isDefault: boolean;
  subjects?: string[];
  yearLevels?: string[];
  
  estimatedTime: number;
  isAnonymous: boolean;
}

/**
 * Feedback question
 */
export interface FeedbackQuestion {
  id: string;
  text: string;
  type: FeedbackQuestionType;
  
  options?: string[];
  emojiOptions?: string[];
  scaleRange?: { min: number; max: number; labels?: { value: number; label: string }[] };
  
  isRequired: boolean;
  category: 'understanding' | 'engagement' | 'pace' | 'teaching' | 'environment' | 'general';
  order: number;
  
  conditional?: {
    questionId: string;
    condition: 'equals' | 'greater_than' | 'less_than';
    value: any;
  };
}

/**
 * Collected feedback for a session
 */
export interface SessionFeedback extends MeshBaseEntity {
  sessionId: string;
  templateId: string;
  
  openedAt: Date;
  closedAt?: Date;
  
  responses: StudentFeedbackResponse[];
  
  responseRate: {
    total: number;
    responded: number;
    rate: number;
  };
  
  aggregatedResults?: AggregatedFeedback;
  aiInsights?: FeedbackInsights;
  
  teacherReviewed: boolean;
  teacherReviewedAt?: Date;
  teacherNotes?: string;
}

/**
 * Individual student feedback response
 */
export interface StudentFeedbackResponse {
  id: string;
  studentId?: string;
  anonymousId: string;
  
  answers: {
    questionId: string;
    value: any;
    sentiment?: Sentiment;
  }[];
  
  completionTime: number;
  submittedAt: Date;
}

/**
 * Aggregated feedback results
 */
export interface AggregatedFeedback {
  byQuestion: {
    questionId: string;
    questionText: string;
    category: string;
    
    average?: number;
    median?: number;
    distribution?: { value: number; count: number }[];
    
    optionCounts?: { option: string; count: number; percentage: number }[];
    
    yesCount?: number;
    noCount?: number;
    
    sentimentBreakdown?: { sentiment: Sentiment; count: number }[];
    commonThemes?: string[];
  }[];
  
  byCategory: {
    category: string;
    averageScore: number;
    trend: 'improving' | 'stable' | 'declining';
    trendVsPrevious: number;
  }[];
  
  overallScore: number;
  vsSchoolAverage?: number;
  vsSubjectAverage?: number;
}

/**
 * AI-generated feedback insights
 */
export interface FeedbackInsights {
  keyTakeaways: string[];
  strengths: string[];
  improvements: string[];
  
  suggestedActions: {
    action: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
  }[];
  
  sentimentSummary: {
    overall: Sentiment;
    understanding: Sentiment;
    engagement: Sentiment;
  };
  
  anomalies?: string[];
  generatedAt: Date;
}

/**
 * School-wide feedback dashboard
 */
export interface SchoolFeedbackDashboard {
  tenantId: string;
  schoolId: string;
  dateRange: { from: Date; to: Date };
  
  overall: {
    totalSessions: number;
    sessionsWithFeedback: number;
    feedbackRate: number;
    averageScore: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  
  bySubject: {
    subject: string;
    sessionCount: number;
    averageScore: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];
  
  byYearLevel: {
    yearLevel: string;
    sessionCount: number;
    averageScore: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];
  
  byCategory: {
    category: string;
    averageScore: number;
    trend: 'improving' | 'stable' | 'declining';
    topConcerns: string[];
  }[];
  
  teachersNeedingSupport: {
    teacherId: string;
    teacherName: string;
    subject: string;
    averageScore: number;
    sessionCount: number;
    primaryConcern: string;
  }[];
  
  topLessons: {
    sessionId: string;
    teacherName: string;
    subject: string;
    date: Date;
    score: number;
    highlights: string[];
  }[];
  
  alerts: {
    type: 'low_score' | 'declining_trend' | 'low_response_rate' | 'concerning_feedback';
    message: string;
    sessionId?: string;
    teacherId?: string;
    severity: 'info' | 'warning' | 'critical';
    createdAt: Date;
  }[];
  
  generatedAt: Date;
}

// ============================================================================
// OFFLINE SYNC INTERFACES
// ============================================================================

/**
 * Geographic location
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
}

/**
 * Offline sync queue item
 */
export interface SyncQueueItem {
  id: string;
  type: 'check_in' | 'roll_call' | 'capture' | 'task_progress' | 'help_request' | 'feedback' | 'alert';
  priority: SyncPriority;
  
  entityType: string;
  entityId: string;
  
  payload: any;
  
  createdAt: Date;
  attempts: number;
  lastAttempt?: Date;
  lastError?: string;
  maxRetries: number;
  
  dependencies?: string[];
}

/**
 * Local record base for offline storage
 */
export interface LocalRecord {
  localId: string;
  serverId: string | null;
  syncStatus: SyncStatus;
  localModifiedAt: Date;
  syncedAt: Date | null;
  version: number;
  serverVersion: number | null;
}

/**
 * Conflict record
 */
export interface ConflictRecord {
  id: string;
  entityType: string;
  entityId: string;
  localVersion: any;
  serverVersion: any;
  conflictFields: string[];
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: 'local_wins' | 'server_wins' | 'merged' | 'manual';
  resolvedBy?: string;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Events published by this module
 */
export const CLASSROOM_EXCURSION_EVENTS = {
  // Session events
  SESSION_STARTED: 'classroom.session_started',
  SESSION_ENDED: 'classroom.session_ended',
  
  // Roll call events
  ROLL_CALL_TAKEN: 'classroom.roll_call_taken',
  ATTENDANCE_UPDATED: 'classroom.attendance_updated',
  UNEXPLAINED_ABSENCE: 'classroom.unexplained_absence',
  
  // Seating events
  SEATING_CREATED: 'classroom.seating_created',
  STUDENT_MOVED: 'classroom.student_moved',
  
  // Help request events
  HELP_REQUESTED: 'classroom.help_requested',
  HELP_CRITICAL: 'classroom.help_critical',
  HELP_RESOLVED: 'classroom.help_resolved',
  POST_LESSON_HELP_SUBMITTED: 'classroom.post_lesson_help_submitted',
  
  // Excursion events
  EXCURSION_CREATED: 'excursion.created',
  EXCURSION_APPROVED: 'excursion.approved',
  EXCURSION_STARTED: 'excursion.started',
  EXCURSION_COMPLETED: 'excursion.completed',
  
  // Safety events (CRITICAL)
  CHECKPOINT_COMPLETED: 'excursion.checkpoint_completed',
  STUDENTS_MISSING: 'excursion.students_missing',
  STUDENT_FOUND: 'excursion.student_found',
  HEAD_COUNT_DISCREPANCY: 'excursion.head_count_discrepancy',
  SOS_TRIGGERED: 'excursion.sos_triggered',
  
  // Discovery events
  TASK_STARTED: 'excursion.task_started',
  CAPTURE_SUBMITTED: 'excursion.capture_submitted',
  TASK_SUBMITTED: 'excursion.task_submitted',
  
  // Feedback events
  FEEDBACK_OPENED: 'feedback.collection_opened',
  FEEDBACK_SUBMITTED: 'feedback.response_submitted',
  FEEDBACK_CLOSED: 'feedback.collection_closed',
  LOW_SCORE_ALERT: 'feedback.low_score_alert',
  
  // Sync events
  SYNC_STARTED: 'sync.started',
  SYNC_COMPLETED: 'sync.completed',
  SYNC_CONFLICT: 'sync.conflict',
  OFFLINE_QUEUE_CRITICAL: 'sync.queue_critical'
} as const;
