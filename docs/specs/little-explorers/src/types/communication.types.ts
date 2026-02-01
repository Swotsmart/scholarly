/**
 * Little Explorers - Communication System Types
 * 
 * The Communication System enables rich, real-time communication between
 * teachers, parents, and the school community. It includes:
 * 
 * - Class Story: A private, social media-style feed for each class
 * - School Story: School-wide announcements and updates
 * - Direct Messaging: Private teacher-parent communication
 * - Automatic Translation: Break down language barriers
 * - Event Calendar: School and class events
 * - Emergency Alerts: Critical notifications that bypass quiet hours
 * 
 * ## AI Integration
 * 
 * The system uses AI to:
 * - Draft message suggestions for teachers
 * - Analyse message tone and sentiment
 * - Translate content automatically
 * - Detect sensitive content for safeguarding
 * - Generate engaging story captions
 * - Summarise weekly updates for parents
 * 
 * @module LittleExplorers/Types/Communication
 */

import {
  Result, success, failure,
  ValidationError, NotFoundError, QuietHoursError,
  ContentModerationError, SafeguardingError,
  EntityStatus, Paginated, PaginationOptions, DateRange,
  generateId, Validator, ConsentType
} from './core.types';

// ============================================================================
// CLASS STORY TYPES
// ============================================================================

/**
 * A post in the Class Story feed
 */
export interface StoryPost {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  
  // Author
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'assistant' | 'specialist' | 'school_admin';
  authorAvatarUrl?: string;
  
  // Content
  content: StoryContent;
  
  // Visibility
  visibility: 'class' | 'school' | 'selected_parents';
  visibleToParentIds?: string[];  // For selected_parents visibility
  
  // Tagged students (for portfolio linking)
  taggedStudentIds: string[];
  
  // Curriculum/learning connections
  learningConnections?: LearningConnection[];
  
  // AI involvement
  aiGenerated: boolean;
  aiCaptionSuggestion?: string;
  aiContentAnalysis?: ContentAnalysis;
  
  // Moderation
  moderationStatus: 'pending' | 'approved' | 'flagged' | 'removed';
  moderationNotes?: string;
  moderatedBy?: string;
  moderatedAt?: Date;
  
  // Engagement
  engagement: StoryEngagement;
  
  // Schedule
  scheduledFor?: Date;
  publishedAt?: Date;
  
  // Status
  status: 'draft' | 'scheduled' | 'published' | 'archived' | 'deleted';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Content of a story post
 */
export interface StoryContent {
  type: 'text' | 'photo' | 'video' | 'album' | 'document' | 'announcement';
  
  // Text content
  text?: string;
  formattedText?: string;  // With markdown/rich text
  
  // Media
  media?: StoryMedia[];
  
  // Document (for PDFs, worksheets, etc.)
  document?: {
    url: string;
    name: string;
    type: string;
    size: number;
  };
  
  // Announcement specific
  announcementType?: 'general' | 'event' | 'reminder' | 'celebration' | 'important';
  announcementPriority?: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Media attachment in a story
 */
export interface StoryMedia {
  id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl: string;
  
  // Dimensions
  width: number;
  height: number;
  duration?: number;  // For video, in seconds
  
  // Processing
  processingStatus: 'uploading' | 'processing' | 'ready' | 'failed';
  
  // AI analysis
  aiCaption?: string;
  aiTags?: string[];
  aiFaces?: {
    studentId?: string;
    boundingBox: { x: number; y: number; width: number; height: number };
    consented: boolean;
    blurred: boolean;
  }[];
  
  // Consent tracking
  allFacesConsented: boolean;
  nonConsentedFacesBlurred: boolean;
}

/**
 * Connection to learning outcomes
 */
export interface LearningConnection {
  type: 'curriculum_code' | 'learning_area' | 'skill' | 'topic';
  code?: string;
  name: string;
  framework?: string;  // "EYLF", "ACARA", etc.
}

/**
 * AI analysis of content
 */
export interface ContentAnalysis {
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'concerning';
  themes: string[];
  suggestedTags: string[];
  safeguardingFlags: string[];
  qualityScore: number;  // 0-100
  readabilityLevel: string;
  suggestedImprovements?: string[];
  analyzedAt: Date;
}

/**
 * Engagement metrics for a story
 */
export interface StoryEngagement {
  viewCount: number;
  uniqueViewers: string[];  // Parent IDs
  
  // Reactions
  likes: StoryReaction[];
  hearts: StoryReaction[];
  celebrates: StoryReaction[];
  
  // Comments
  comments: StoryComment[];
  commentCount: number;
  
  // Tracking
  parentViewPercentage: number;  // % of class parents who viewed
  firstViewedAt?: Date;
  lastViewedAt?: Date;
}

/**
 * A reaction on a story
 */
export interface StoryReaction {
  userId: string;
  userName: string;
  type: 'like' | 'heart' | 'celebrate';
  reactedAt: Date;
}

/**
 * A comment on a story
 */
export interface StoryComment {
  id: string;
  userId: string;
  userName: string;
  userRole: 'teacher' | 'parent';
  
  content: string;
  
  // Moderation
  moderationStatus: 'approved' | 'pending' | 'hidden';
  
  // Threading
  parentCommentId?: string;
  replies?: StoryComment[];
  
  // Timestamps
  createdAt: Date;
  editedAt?: Date;
}

// ============================================================================
// SCHOOL STORY TYPES
// ============================================================================

/**
 * A school-wide story post
 */
export interface SchoolStoryPost extends Omit<StoryPost, 'classroomId' | 'taggedStudentIds' | 'visibility'> {
  // Target audience
  targetAudience: {
    type: 'all' | 'selected_grades' | 'selected_classes';
    grades?: string[];
    classroomIds?: string[];
  };
  
  // Priority for feed ordering
  pinned: boolean;
  pinnedUntil?: Date;
  
  // Acknowledgement tracking
  requiresAcknowledgement: boolean;
  acknowledgements?: {
    userId: string;
    acknowledgedAt: Date;
  }[];
}

// ============================================================================
// DIRECT MESSAGING TYPES
// ============================================================================

/**
 * A conversation thread between teacher and parent
 */
export interface Conversation {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  
  // Participants
  participants: ConversationParticipant[];
  
  // Related student (optional)
  relatedStudentId?: string;
  relatedStudentName?: string;
  
  // Subject/topic
  subject?: string;
  
  // Messages
  lastMessageAt: Date;
  lastMessagePreview: string;
  lastMessageBy: string;
  
  // Unread tracking
  unreadCounts: { [participantId: string]: number };
  
  // Status
  status: 'active' | 'archived' | 'closed';
  
  // AI insights
  aiSummary?: string;
  aiSentiment?: 'positive' | 'neutral' | 'concerning';
  aiActionItems?: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A participant in a conversation
 */
export interface ConversationParticipant {
  userId: string;
  name: string;
  role: 'teacher' | 'parent' | 'admin';
  avatarUrl?: string;
  
  // Settings
  notificationsEnabled: boolean;
  lastReadAt?: Date;
  
  // Status
  leftAt?: Date;
}

/**
 * A single message in a conversation
 */
export interface Message {
  id: string;
  tenantId: string;
  conversationId: string;
  
  // Sender
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'parent' | 'admin' | 'system';
  
  // Content
  content: MessageContent;
  
  // Translation
  originalLanguage: string;
  translations: { [languageCode: string]: string };
  translationRequested: boolean;
  
  // AI involvement
  aiDrafted: boolean;
  aiSuggestionId?: string;
  aiToneAnalysis?: {
    tone: 'professional' | 'warm' | 'urgent' | 'concerning';
    sentiment: number;  // -1 to 1
    suggestions?: string[];
  };
  
  // Moderation
  moderationStatus: 'approved' | 'flagged' | 'blocked';
  moderationFlags?: string[];
  
  // Delivery
  deliveryStatus: DeliveryStatus;
  
  // Read receipts
  readBy: { userId: string; readAt: Date }[];
  
  // Status
  status: 'sent' | 'edited' | 'deleted';
  editedAt?: Date;
  deletedAt?: Date;
  
  // Timestamps
  sentAt: Date;
  createdAt: Date;
}

/**
 * Content of a message
 */
export interface MessageContent {
  type: 'text' | 'image' | 'document' | 'voice' | 'system';
  
  // Text
  text?: string;
  
  // Media
  imageUrl?: string;
  imageThumbnailUrl?: string;
  
  // Document
  documentUrl?: string;
  documentName?: string;
  documentType?: string;
  documentSize?: number;
  
  // Voice message
  voiceUrl?: string;
  voiceDuration?: number;
  voiceTranscription?: string;
  
  // System message
  systemAction?: 'conversation_started' | 'participant_added' | 'participant_left' | 'subject_changed';
}

/**
 * Delivery status of a message
 */
export interface DeliveryStatus {
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  
  // Push notification
  pushSent: boolean;
  pushDelivered: boolean;
  
  // Email notification
  emailSent: boolean;
  emailDelivered: boolean;
  
  // SMS (if enabled)
  smsSent: boolean;
  smsDelivered: boolean;
}

// ============================================================================
// AI MESSAGE DRAFTS
// ============================================================================

/**
 * AI-generated message draft suggestion
 */
export interface AIMessageDraft {
  id: string;
  tenantId: string;
  conversationId?: string;  // null for new conversations
  
  // Context
  context: DraftContext;
  
  // Generated drafts
  drafts: GeneratedDraft[];
  
  // Teacher selection
  selectedDraftIndex?: number;
  teacherEdits?: string;
  finalMessage?: string;
  
  // Status
  status: 'pending' | 'selected' | 'edited' | 'rejected' | 'expired';
  
  // Timestamps
  generatedAt: Date;
  expiresAt: Date;
}

/**
 * Context for generating a draft
 */
export interface DraftContext {
  purpose: 'introduction' | 'update' | 'concern' | 'celebration' | 'reminder' | 'response' | 'general';
  
  // Related content
  relatedStudentId?: string;
  relatedBehaviourPoints?: string[];
  relatedPortfolioItems?: string[];
  relatedAttendance?: string;
  
  // Previous messages for context
  recentMessageIds?: string[];
  
  // Teacher notes
  teacherNotes?: string;
  keyPoints?: string[];
  
  // Tone preference
  preferredTone: 'professional' | 'warm' | 'casual' | 'urgent';
  
  // Length preference
  preferredLength: 'brief' | 'standard' | 'detailed';
}

/**
 * A single generated draft option
 */
export interface GeneratedDraft {
  text: string;
  tone: string;
  wordCount: number;
  
  // AI metadata
  confidence: number;
  reasoning: string;
  suggestedSubject?: string;
}

// ============================================================================
// TRANSLATION TYPES
// ============================================================================

/**
 * Translation request and result
 */
export interface Translation {
  id: string;
  tenantId: string;
  
  // Source
  sourceType: 'message' | 'story' | 'notification' | 'report';
  sourceId: string;
  sourceText: string;
  sourceLanguage: string;
  
  // Target
  targetLanguage: string;
  translatedText: string;
  
  // Quality
  confidence: number;
  machineTranslated: boolean;
  humanReviewed: boolean;
  
  // Timestamps
  translatedAt: Date;
}

/**
 * Supported languages for translation
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文(简体)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '中文(繁體)' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' }
] as const;

export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

// ============================================================================
// EVENT CALENDAR TYPES
// ============================================================================

/**
 * A calendar event
 */
export interface CalendarEvent {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId?: string;  // null = school-wide
  
  // Event details
  title: string;
  description?: string;
  
  // Type
  type: EventType;
  
  // Timing
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  timezone: string;
  
  // Recurrence
  recurring: boolean;
  recurrenceRule?: RecurrenceRule;
  
  // Location
  location?: EventLocation;
  
  // Visibility
  visibility: 'class' | 'school' | 'public';
  
  // RSVP
  rsvpEnabled: boolean;
  rsvpDeadline?: Date;
  rsvpResponses?: EventRSVP[];
  
  // Reminders
  reminders: EventReminder[];
  
  // Attachments
  attachments: EventAttachment[];
  
  // Created by
  createdBy: string;
  createdByName: string;
  
  // Status
  status: 'scheduled' | 'cancelled' | 'completed';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export type EventType = 
  | 'general'
  | 'parent_teacher_conference'
  | 'excursion'
  | 'performance'
  | 'celebration'
  | 'professional_development'
  | 'public_holiday'
  | 'school_holiday'
  | 'assembly'
  | 'sports_day'
  | 'photo_day'
  | 'deadline'
  | 'other';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: Date;
  occurrences?: number;
}

export interface EventLocation {
  type: 'in_school' | 'external' | 'online';
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  onlineLink?: string;
  onlinePlatform?: string;
}

export interface EventRSVP {
  userId: string;
  userName: string;
  studentIds: string[];  // Which children are attending
  response: 'attending' | 'not_attending' | 'maybe';
  respondedAt: Date;
  notes?: string;
}

export interface EventReminder {
  id: string;
  timing: number;  // Minutes before event
  channels: ('push' | 'email' | 'sms')[];
  sent: boolean;
  sentAt?: Date;
}

export interface EventAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

// ============================================================================
// EMERGENCY ALERTS
// ============================================================================

/**
 * Emergency alert that bypasses quiet hours
 */
export interface EmergencyAlert {
  id: string;
  tenantId: string;
  schoolId: string;
  
  // Scope
  scope: 'school' | 'district';
  targetClassroomIds?: string[];
  
  // Content
  type: EmergencyType;
  title: string;
  message: string;
  instructions?: string[];
  
  // Severity
  severity: 'information' | 'warning' | 'critical' | 'emergency';
  
  // Delivery
  channels: ('push' | 'sms' | 'email' | 'voice_call')[];
  deliveryStats: {
    totalRecipients: number;
    delivered: number;
    failed: number;
    acknowledged: number;
  };
  
  // Acknowledgement
  requiresAcknowledgement: boolean;
  acknowledgements: {
    userId: string;
    acknowledgedAt: Date;
    method: 'app' | 'sms_reply' | 'email_link';
  }[];
  
  // Status
  status: 'draft' | 'sending' | 'sent' | 'cancelled';
  
  // Created by
  createdBy: string;
  createdByName: string;
  
  // Timestamps
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type EmergencyType =
  | 'lockdown'
  | 'evacuation'
  | 'shelter_in_place'
  | 'weather_alert'
  | 'early_dismissal'
  | 'delayed_opening'
  | 'closure'
  | 'medical_emergency'
  | 'security_alert'
  | 'general_emergency'
  | 'test';

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

/**
 * A notification sent to a user
 */
export interface Notification {
  id: string;
  tenantId: string;
  
  // Recipient
  recipientId: string;
  recipientType: 'parent' | 'teacher' | 'admin';
  
  // Content
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  
  // Action
  actionType?: 'open_story' | 'open_message' | 'open_portfolio' | 'open_event' | 'open_report' | 'external_link';
  actionData?: Record<string, string>;
  
  // Delivery
  channels: ('push' | 'email' | 'sms' | 'in_app')[];
  deliveryStatus: {
    push?: { sent: boolean; delivered: boolean; opened: boolean };
    email?: { sent: boolean; delivered: boolean; opened: boolean };
    sms?: { sent: boolean; delivered: boolean };
    inApp?: { displayed: boolean; dismissed: boolean };
  };
  
  // Status
  read: boolean;
  readAt?: Date;
  dismissed: boolean;
  dismissedAt?: Date;
  
  // Timestamps
  sentAt: Date;
  createdAt: Date;
}

export type NotificationType =
  | 'point_awarded'
  | 'celebration_achieved'
  | 'story_posted'
  | 'message_received'
  | 'portfolio_item_added'
  | 'event_reminder'
  | 'event_created'
  | 'attendance_alert'
  | 'report_available'
  | 'emergency_alert'
  | 'system';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface StoryPostRepository {
  findById(tenantId: string, id: string): Promise<StoryPost | null>;
  findByClassroom(tenantId: string, classroomId: string, options?: {
    status?: StoryPost['status'];
    dateRange?: DateRange;
    pagination?: PaginationOptions;
  }): Promise<Paginated<StoryPost>>;
  findBySchool(tenantId: string, schoolId: string, options?: {
    status?: StoryPost['status'];
    dateRange?: DateRange;
    pagination?: PaginationOptions;
  }): Promise<Paginated<SchoolStoryPost>>;
  
  create(post: Omit<StoryPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoryPost>;
  update(tenantId: string, id: string, updates: Partial<StoryPost>): Promise<StoryPost>;
  delete(tenantId: string, id: string): Promise<void>;
  
  addReaction(tenantId: string, postId: string, reaction: StoryReaction): Promise<void>;
  removeReaction(tenantId: string, postId: string, userId: string): Promise<void>;
  addComment(tenantId: string, postId: string, comment: StoryComment): Promise<StoryComment>;
  deleteComment(tenantId: string, postId: string, commentId: string): Promise<void>;
  
  recordView(tenantId: string, postId: string, userId: string): Promise<void>;
}

export interface ConversationRepository {
  findById(tenantId: string, id: string): Promise<Conversation | null>;
  findByParticipant(tenantId: string, userId: string, options?: {
    status?: Conversation['status'];
    pagination?: PaginationOptions;
  }): Promise<Paginated<Conversation>>;
  findByClassroom(tenantId: string, classroomId: string): Promise<Conversation[]>;
  
  create(conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Conversation>;
  update(tenantId: string, id: string, updates: Partial<Conversation>): Promise<Conversation>;
  
  markRead(tenantId: string, conversationId: string, userId: string): Promise<void>;
}

export interface MessageRepository {
  findById(tenantId: string, id: string): Promise<Message | null>;
  findByConversation(tenantId: string, conversationId: string, options?: {
    before?: Date;
    limit?: number;
  }): Promise<Message[]>;
  
  create(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message>;
  update(tenantId: string, id: string, updates: Partial<Message>): Promise<Message>;
  markDeleted(tenantId: string, id: string): Promise<void>;
  
  markRead(tenantId: string, messageId: string, userId: string): Promise<void>;
}

export interface CalendarEventRepository {
  findById(tenantId: string, id: string): Promise<CalendarEvent | null>;
  findByDateRange(tenantId: string, options: {
    schoolId?: string;
    classroomId?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<CalendarEvent[]>;
  findUpcoming(tenantId: string, options: {
    schoolId?: string;
    classroomId?: string;
    limit?: number;
  }): Promise<CalendarEvent[]>;
  
  create(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent>;
  update(tenantId: string, id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent>;
  delete(tenantId: string, id: string): Promise<void>;
  
  addRSVP(tenantId: string, eventId: string, rsvp: EventRSVP): Promise<void>;
  updateRSVP(tenantId: string, eventId: string, userId: string, response: EventRSVP['response']): Promise<void>;
}

export interface NotificationRepository {
  findById(tenantId: string, id: string): Promise<Notification | null>;
  findByRecipient(tenantId: string, recipientId: string, options?: {
    unreadOnly?: boolean;
    types?: NotificationType[];
    pagination?: PaginationOptions;
  }): Promise<Paginated<Notification>>;
  
  create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  createBatch(notifications: Omit<Notification, 'id' | 'createdAt'>[]): Promise<Notification[]>;
  
  markRead(tenantId: string, id: string): Promise<void>;
  markAllRead(tenantId: string, recipientId: string): Promise<void>;
  dismiss(tenantId: string, id: string): Promise<void>;
  
  updateDeliveryStatus(tenantId: string, id: string, channel: keyof Notification['deliveryStatus'], status: Record<string, boolean>): Promise<void>;
}

// ============================================================================
// INPUT/OUTPUT TYPES
// ============================================================================

export interface CreateStoryPostInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  authorId: string;
  
  content: StoryContent;
  visibility?: StoryPost['visibility'];
  taggedStudentIds?: string[];
  learningConnections?: LearningConnection[];
  
  scheduledFor?: Date;
  
  // AI options
  generateCaption?: boolean;
  analyzeContent?: boolean;
}

export interface SendMessageInput {
  tenantId: string;
  conversationId?: string;  // null to create new conversation
  senderId: string;
  
  // New conversation details
  newConversation?: {
    classroomId: string;
    participantIds: string[];
    relatedStudentId?: string;
    subject?: string;
  };
  
  content: MessageContent;
  
  // AI options
  useDraft?: string;  // AI draft ID
  translateTo?: string[];  // Language codes
  analyzeToggle?: boolean;
}

export interface CreateEventInput {
  tenantId: string;
  schoolId: string;
  classroomId?: string;
  createdBy: string;
  
  title: string;
  description?: string;
  type: EventType;
  
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  timezone: string;
  
  recurring?: boolean;
  recurrenceRule?: RecurrenceRule;
  
  location?: EventLocation;
  visibility?: CalendarEvent['visibility'];
  
  rsvpEnabled?: boolean;
  rsvpDeadline?: Date;
  
  reminders?: Omit<EventReminder, 'id' | 'sent' | 'sentAt'>[];
  attachments?: Omit<EventAttachment, 'id'>[];
}

export interface SendEmergencyAlertInput {
  tenantId: string;
  schoolId: string;
  createdBy: string;
  
  scope: EmergencyAlert['scope'];
  targetClassroomIds?: string[];
  
  type: EmergencyType;
  severity: EmergencyAlert['severity'];
  title: string;
  message: string;
  instructions?: string[];
  
  channels: EmergencyAlert['channels'];
  requiresAcknowledgement?: boolean;
}

export interface GenerateAIDraftInput {
  tenantId: string;
  teacherId: string;
  context: DraftContext;
  numberOfDrafts?: number;  // Default 3
}

export interface TranslateContentInput {
  tenantId: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguages: string[];
}
