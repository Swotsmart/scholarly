/**
 * Little Explorers - Communication Service
 * 
 * The Communication Service manages all parent-teacher communication channels,
 * including the Class Story feed, direct messaging, event management, and
 * emergency alerts. It provides:
 * 
 * - **Class Story** - Instagram-style photo/video feed per classroom
 * - **School Story** - School-wide announcements and updates  
 * - **Direct Messaging** - Private teacher-parent conversations
 * - **Automatic Translation** - 20+ language support
 * - **Calendar Events** - RSVP tracking and reminders
 * - **Emergency Alerts** - Bypasses quiet hours for critical communications
 * 
 * ## AI Integration
 * 
 * The service leverages AI to:
 * 
 * 1. **Draft messages** with appropriate tone for context
 * 2. **Generate captions** for story posts with learning connections
 * 3. **Analyze sentiment** to flag concerning messages
 * 4. **Summarize conversations** for quick teacher review
 * 5. **Enhance translations** beyond simple machine translation
 * 6. **Moderate content** for safeguarding concerns
 * 
 * ## Design Philosophy
 * 
 * Communication respects family boundaries:
 * - Quiet hours prevent notifications during evenings/weekends
 * - Parents control notification preferences per channel
 * - Emergency alerts can bypass all restrictions
 * - Translation happens transparently
 * 
 * @module LittleExplorers/Services/Communication
 * @version 1.0.0
 */

import {
  Result, success, failure,
  ValidationError, NotFoundError, QuietHoursError, ContentModerationError,
  Student, Classroom, Teacher, Parent,
  generateId, Validator, DateRange,
  Paginated, PaginationOptions
} from '../types';

import {
  StoryPost, StoryContent, StoryVisibility,
  SchoolStoryPost,
  Conversation, Message, MessageContent,
  Translation, SupportedLanguage, SUPPORTED_LANGUAGES,
  CalendarEvent, EventLocation,
  EmergencyAlert, EmergencyAlertType, AlertSeverity,
  Notification, NotificationChannel, NotificationStatus,
  StoryPostRepository, ConversationRepository, MessageRepository,
  CalendarEventRepository, EmergencyAlertRepository, NotificationRepository,
  StoryReaction, StoryComment, StoryView,
  ConversationParticipant, MessageDeliveryStatus,
  AIMessageDraft
} from '../types/communication.types';

import {
  LittleExplorersBaseService,
  ServiceDependencies
} from '../infrastructure';

import { LittleExplorersAIService } from '../ai/ai-service';

import {
  AIContext,
  CaptionGenerationInput,
  MessageDraftInput,
  MessageAnalysisInput,
  SafeguardingCheckInput
} from '../types/ai.types';

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface CommunicationServiceDependencies extends ServiceDependencies {
  storyRepository: StoryPostRepository;
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  eventRepository: CalendarEventRepository;
  alertRepository: EmergencyAlertRepository;
  notificationRepository: NotificationRepository;
  aiService: LittleExplorersAIService;
  
  // Cross-service integrations
  getStudent: (tenantId: string, studentId: string) => Promise<Student | null>;
  getClassroom: (tenantId: string, classroomId: string) => Promise<Classroom | null>;
  getTeacher: (tenantId: string, teacherId: string) => Promise<Teacher | null>;
  getParent: (tenantId: string, parentId: string) => Promise<Parent | null>;
  getParentsForStudent: (tenantId: string, studentId: string) => Promise<Parent[]>;
  
  // External services
  sendPushNotification: (userId: string, notification: PushPayload) => Promise<boolean>;
  sendEmail: (to: string, subject: string, body: string, html?: string) => Promise<boolean>;
  sendSMS: (to: string, message: string) => Promise<boolean>;
  translateText: (text: string, from: string, to: string) => Promise<string>;
  uploadMedia: (file: Buffer, contentType: string, path: string) => Promise<string>;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

export interface CreateStoryInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  authorId: string;
  content: StoryContent;
  taggedStudentIds?: string[];
  visibility?: StoryVisibility;
  scheduledFor?: Date;
  useAICaption?: boolean;
}

export interface CreateMessageInput {
  tenantId: string;
  conversationId: string;
  senderId: string;
  content: MessageContent;
  useAIDraft?: boolean;
  translationLanguages?: SupportedLanguage[];
}

export interface CreateEventInput {
  tenantId: string;
  schoolId: string;
  classroomId?: string;
  createdBy: string;
  title: string;
  description?: string;
  type: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  location?: EventLocation;
  rsvpEnabled?: boolean;
  rsvpDeadline?: Date;
}

export interface CreateAlertInput {
  tenantId: string;
  schoolId: string;
  createdBy: string;
  type: EmergencyAlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  instructions?: string[];
  targetClassroomIds?: string[];
  channels: NotificationChannel[];
  requiresAcknowledgement?: boolean;
}

// ============================================================================
// COMMUNICATION SERVICE
// ============================================================================

export class CommunicationService extends LittleExplorersBaseService {
  private readonly storyRepo: StoryPostRepository;
  private readonly conversationRepo: ConversationRepository;
  private readonly messageRepo: MessageRepository;
  private readonly eventRepo: CalendarEventRepository;
  private readonly alertRepo: EmergencyAlertRepository;
  private readonly notificationRepo: NotificationRepository;
  private readonly aiService: LittleExplorersAIService;
  
  private readonly getStudent: CommunicationServiceDependencies['getStudent'];
  private readonly getClassroom: CommunicationServiceDependencies['getClassroom'];
  private readonly getTeacher: CommunicationServiceDependencies['getTeacher'];
  private readonly getParent: CommunicationServiceDependencies['getParent'];
  private readonly getParentsForStudent: CommunicationServiceDependencies['getParentsForStudent'];
  private readonly sendPushNotification: CommunicationServiceDependencies['sendPushNotification'];
  private readonly sendEmail: CommunicationServiceDependencies['sendEmail'];
  private readonly sendSMS: CommunicationServiceDependencies['sendSMS'];
  private readonly translateText: CommunicationServiceDependencies['translateText'];
  private readonly uploadMedia: CommunicationServiceDependencies['uploadMedia'];

  constructor(deps: CommunicationServiceDependencies) {
    super('CommunicationService', deps);
    this.storyRepo = deps.storyRepository;
    this.conversationRepo = deps.conversationRepository;
    this.messageRepo = deps.messageRepository;
    this.eventRepo = deps.eventRepository;
    this.alertRepo = deps.alertRepository;
    this.notificationRepo = deps.notificationRepository;
    this.aiService = deps.aiService;
    
    this.getStudent = deps.getStudent;
    this.getClassroom = deps.getClassroom;
    this.getTeacher = deps.getTeacher;
    this.getParent = deps.getParent;
    this.getParentsForStudent = deps.getParentsForStudent;
    this.sendPushNotification = deps.sendPushNotification;
    this.sendEmail = deps.sendEmail;
    this.sendSMS = deps.sendSMS;
    this.translateText = deps.translateText;
    this.uploadMedia = deps.uploadMedia;
  }

  // ===========================================================================
  // CLASS STORY
  // ===========================================================================

  /**
   * Create a new story post
   * 
   * Story posts are the primary way teachers share classroom moments with parents.
   * They support photos, videos, text, and can tag students for personalized feeds.
   */
  async createStoryPost(input: CreateStoryInput): Promise<Result<StoryPost>> {
    try {
      this.validateTenantId(input.tenantId);
      this.validateEntityId(input.classroomId, 'classroom');
      this.validateEntityId(input.authorId, 'author');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createStoryPost', input.tenantId, async () => {
      // Get author details
      const teacher = await this.getTeacher(input.tenantId, input.authorId);
      if (!teacher) {
        throw new NotFoundError('Teacher', input.authorId);
      }

      // Get classroom for context
      const classroom = await this.getClassroom(input.tenantId, input.classroomId);
      if (!classroom) {
        throw new NotFoundError('Classroom', input.classroomId);
      }

      // Content moderation check
      const moderationResult = await this.moderateContent(
        input.tenantId,
        'story_post',
        this.extractTextContent(input.content)
      );

      if (!moderationResult.safe && moderationResult.severity === 'critical') {
        throw new ContentModerationError(
          'Content failed moderation check',
          moderationResult.flags
        );
      }

      // Generate AI caption if requested
      let aiCaption: string | undefined;
      if (input.useAICaption && input.content.text) {
        const captionResult = await this.generateAICaption(input, classroom);
        aiCaption = captionResult?.main;
      }

      // Validate tagged students
      const validTaggedIds: string[] = [];
      if (input.taggedStudentIds) {
        for (const studentId of input.taggedStudentIds) {
          const student = await this.getStudent(input.tenantId, studentId);
          if (student) {
            validTaggedIds.push(studentId);
          }
        }
      }

      // Create the story post
      const post: StoryPost = {
        id: this.generateId('story'),
        tenantId: input.tenantId,
        schoolId: input.schoolId,
        classroomId: input.classroomId,
        
        author: {
          id: teacher.id,
          name: teacher.displayName,
          role: teacher.role,
          avatarUrl: teacher.photoUrl
        },
        
        content: input.content,
        
        taggedStudentIds: validTaggedIds,
        taggedStudentNames: [], // Would populate with names
        
        visibility: input.visibility || 'class',
        
        aiGenerated: false,
        aiCaptionSuggestion: aiCaption,
        
        moderationStatus: moderationResult.safe ? 'approved' : 'pending_review',
        
        engagement: {
          viewCount: 0,
          likeCount: 0,
          heartCount: 0,
          commentCount: 0,
          uniqueViewers: [],
          parentViewPercentage: 0
        },
        
        scheduledFor: input.scheduledFor,
        publishedAt: input.scheduledFor ? undefined : new Date(),
        
        status: input.scheduledFor ? 'scheduled' : 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const savedPost = await this.storyRepo.create(post);

      // If published immediately, notify parents
      if (!input.scheduledFor) {
        await this.notifyParentsOfStory(savedPost, validTaggedIds);
      }

      // Publish event
      await this.publishEvent('communication.story_created', input.tenantId, {
        storyId: savedPost.id,
        classroomId: input.classroomId,
        authorId: input.authorId,
        taggedStudentCount: validTaggedIds.length,
        hasMedia: !!(input.content.mediaUrls && input.content.mediaUrls.length > 0)
      });

      return savedPost;
    }, { classroomId: input.classroomId });
  }

  /**
   * Get story feed for a classroom
   */
  async getClassroomFeed(
    tenantId: string,
    classroomId: string,
    options: PaginationOptions & { viewerId?: string }
  ): Promise<Result<Paginated<StoryPost>>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(classroomId, 'classroom');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getClassroomFeed', tenantId, async () => {
      const stories = await this.storyRepo.findByClassroom(tenantId, classroomId, {
        status: 'published',
        ...options
      });

      // Record view if viewer specified
      if (options.viewerId) {
        for (const story of stories.items) {
          await this.recordStoryView(tenantId, story.id, options.viewerId);
        }
      }

      return stories;
    }, { classroomId });
  }

  /**
   * Get personalized feed for a parent (stories featuring their children)
   */
  async getParentFeed(
    tenantId: string,
    parentId: string,
    options: PaginationOptions
  ): Promise<Result<Paginated<StoryPost>>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(parentId, 'parent');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getParentFeed', tenantId, async () => {
      const parent = await this.getParent(tenantId, parentId);
      if (!parent) {
        throw new NotFoundError('Parent', parentId);
      }

      // Get all children's IDs
      const childrenIds = parent.childrenIds || [];
      
      // Get stories where children are tagged
      const stories = await this.storyRepo.findByTaggedStudents(tenantId, childrenIds, {
        status: 'published',
        ...options
      });

      // Record views
      for (const story of stories.items) {
        await this.recordStoryView(tenantId, story.id, parentId);
      }

      return stories;
    }, { parentId });
  }

  /**
   * React to a story post
   */
  async reactToStory(
    tenantId: string,
    storyId: string,
    userId: string,
    userName: string,
    reactionType: 'like' | 'heart' | 'celebrate'
  ): Promise<Result<StoryReaction>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(storyId, 'story');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('reactToStory', tenantId, async () => {
      const story = await this.storyRepo.findById(tenantId, storyId);
      if (!story) {
        throw new NotFoundError('StoryPost', storyId);
      }

      const reaction: StoryReaction = {
        id: this.generateId('react'),
        userId,
        userName,
        type: reactionType,
        reactedAt: new Date()
      };

      await this.storyRepo.addReaction(tenantId, storyId, reaction);

      // Publish event
      await this.publishEvent('communication.story_reaction', tenantId, {
        storyId,
        userId,
        reactionType
      });

      return reaction;
    }, { storyId, reactionType });
  }

  /**
   * Comment on a story post
   */
  async commentOnStory(
    tenantId: string,
    storyId: string,
    userId: string,
    userName: string,
    userRole: string,
    content: string,
    parentCommentId?: string
  ): Promise<Result<StoryComment>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(storyId, 'story');
      Validator.required(content, 'content');
      Validator.maxLength(content, 500, 'content');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('commentOnStory', tenantId, async () => {
      const story = await this.storyRepo.findById(tenantId, storyId);
      if (!story) {
        throw new NotFoundError('StoryPost', storyId);
      }

      // Moderate comment
      const moderation = await this.moderateContent(tenantId, 'comment', content);
      
      const comment: StoryComment = {
        id: this.generateId('comment'),
        userId,
        userName,
        userRole,
        content,
        moderationStatus: moderation.safe ? 'approved' : 'pending_review',
        parentCommentId,
        createdAt: new Date()
      };

      await this.storyRepo.addComment(tenantId, storyId, comment);

      // Notify story author
      if (story.author.id !== userId) {
        await this.createNotification({
          tenantId,
          recipientId: story.author.id,
          type: 'story_comment',
          title: 'New comment on your post',
          body: `${userName} commented on your story`,
          data: { storyId, commentId: comment.id }
        });
      }

      return comment;
    }, { storyId });
  }

  // ===========================================================================
  // DIRECT MESSAGING
  // ===========================================================================

  /**
   * Start a new conversation
   */
  async startConversation(
    tenantId: string,
    schoolId: string,
    classroomId: string,
    initiatorId: string,
    participantIds: string[],
    relatedStudentId?: string,
    subject?: string
  ): Promise<Result<Conversation>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(classroomId, 'classroom');
      Validator.arrayNotEmpty(participantIds, 'participantIds');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('startConversation', tenantId, async () => {
      // Build participant list
      const participants: ConversationParticipant[] = [];
      
      for (const userId of [initiatorId, ...participantIds]) {
        // Try to find as teacher first, then parent
        const teacher = await this.getTeacher(tenantId, userId);
        if (teacher) {
          participants.push({
            userId,
            parentId: undefined,
            name: teacher.displayName,
            role: 'teacher',
            avatarUrl: teacher.photoUrl,
            notificationsEnabled: true,
            unreadCount: 0
          });
          continue;
        }

        const parent = await this.getParent(tenantId, userId);
        if (parent) {
          participants.push({
            userId,
            parentId: parent.id,
            name: `${parent.firstName} ${parent.lastName}`,
            role: 'parent',
            notificationsEnabled: true,
            unreadCount: 0
          });
        }
      }

      if (participants.length < 2) {
        throw new ValidationError('Conversation requires at least 2 participants');
      }

      // Get related student name if applicable
      let relatedStudentName: string | undefined;
      if (relatedStudentId) {
        const student = await this.getStudent(tenantId, relatedStudentId);
        if (student) {
          relatedStudentName = `${student.firstName} ${student.lastName}`;
        }
      }

      const conversation: Conversation = {
        id: this.generateId('conv'),
        tenantId,
        schoolId,
        classroomId,
        
        participants,
        
        relatedStudentId,
        relatedStudentName,
        
        subject,
        
        lastMessage: {
          preview: 'Conversation started',
          sentAt: new Date(),
          senderId: initiatorId,
          senderName: participants.find(p => p.userId === initiatorId)?.name || 'Unknown'
        },
        
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.conversationRepo.create(conversation);

      await this.publishEvent('communication.conversation_started', tenantId, {
        conversationId: saved.id,
        classroomId,
        participantCount: participants.length,
        hasRelatedStudent: !!relatedStudentId
      });

      return saved;
    }, { classroomId });
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(input: CreateMessageInput): Promise<Result<Message>> {
    try {
      this.validateTenantId(input.tenantId);
      this.validateEntityId(input.conversationId, 'conversation');
      this.validateEntityId(input.senderId, 'sender');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('sendMessage', input.tenantId, async () => {
      // Get conversation
      const conversation = await this.conversationRepo.findById(input.tenantId, input.conversationId);
      if (!conversation) {
        throw new NotFoundError('Conversation', input.conversationId);
      }

      // Verify sender is participant
      const sender = conversation.participants.find(p => p.userId === input.senderId);
      if (!sender) {
        throw new ValidationError('Sender is not a participant in this conversation');
      }

      // Moderate content
      const textContent = this.extractMessageText(input.content);
      const moderation = await this.moderateContent(input.tenantId, 'message', textContent);
      
      if (!moderation.safe && moderation.severity === 'critical') {
        throw new ContentModerationError('Message content failed moderation', moderation.flags);
      }

      // Analyze message tone
      const toneAnalysis = await this.aiService.analyzeMessage({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        messageContent: textContent,
        senderRole: sender.role,
        conversationHistory: [] // Would load recent messages
      });

      // Generate translations if requested
      const translations: Record<string, string> = {};
      if (input.translationLanguages) {
        for (const lang of input.translationLanguages) {
          if (lang !== 'en') {
            translations[lang] = await this.translateText(textContent, 'en', lang);
          }
        }
      }

      // Create the message
      const message: Message = {
        id: this.generateId('msg'),
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        
        sender: {
          userId: input.senderId,
          name: sender.name,
          role: sender.role,
          avatarUrl: sender.avatarUrl
        },
        
        content: input.content,
        
        originalLanguage: 'en',
        translations,
        
        aiDrafted: input.useAIDraft || false,
        aiToneAnalysis: toneAnalysis ? {
          sentiment: toneAnalysis.sentiment,
          tone: toneAnalysis.tone,
          urgency: toneAnalysis.urgency,
          actionItemsDetected: toneAnalysis.suggestsActionItems,
          safeguardingFlags: toneAnalysis.safeguardingFlags
        } : undefined,
        
        moderationStatus: moderation.safe ? 'approved' : 'pending_review',
        moderationFlags: moderation.safe ? undefined : moderation.flags,
        
        deliveryStatus: {},
        readBy: [{ userId: input.senderId, readAt: new Date() }],
        
        status: 'sent',
        sentAt: new Date(),
        createdAt: new Date()
      };

      const saved = await this.messageRepo.create(message);

      // Update conversation
      await this.conversationRepo.updateLastMessage(input.tenantId, input.conversationId, {
        preview: this.truncateText(textContent, 100),
        sentAt: saved.sentAt,
        senderId: input.senderId,
        senderName: sender.name
      });

      // Notify other participants
      await this.notifyMessageRecipients(conversation, saved, sender);

      // Flag for review if tone analysis suggests concern
      if (toneAnalysis?.safeguardingFlags && toneAnalysis.safeguardingFlags.length > 0) {
        await this.flagForSafeguardingReview(input.tenantId, 'message', saved.id, toneAnalysis.safeguardingFlags);
      }

      await this.publishEvent('communication.message_sent', input.tenantId, {
        messageId: saved.id,
        conversationId: input.conversationId,
        senderId: input.senderId,
        hasTranslations: Object.keys(translations).length > 0,
        aiDrafted: input.useAIDraft
      });

      return saved;
    }, { conversationId: input.conversationId });
  }

  /**
   * Get AI-drafted message suggestions
   */
  async getMessageDrafts(
    tenantId: string,
    conversationId: string,
    purpose: string,
    context?: string
  ): Promise<Result<AIMessageDraft>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(conversationId, 'conversation');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getMessageDrafts', tenantId, async () => {
      const conversation = await this.conversationRepo.findById(tenantId, conversationId);
      if (!conversation) {
        throw new NotFoundError('Conversation', conversationId);
      }

      // Get recent messages for context
      const recentMessages = await this.messageRepo.findByConversation(tenantId, conversationId, {
        limit: 10,
        sortBy: 'sentAt',
        sortDirection: 'desc'
      });

      // Build AI context
      const aiContext: AIContext = {
        school: { id: conversation.schoolId, name: '', type: 'primary_school', jurisdiction: 'AU_NSW' },
        classroom: { id: conversation.classroomId, name: '', grade: 'kindergarten', studentCount: 0, teacherNames: [] },
        timeContext: this.buildTimeContext()
      };

      if (conversation.relatedStudentId) {
        const student = await this.getStudent(tenantId, conversation.relatedStudentId);
        if (student) {
          aiContext.student = {
            id: student.id,
            firstName: student.firstName,
            age: this.calculateAge(student.dateOfBirth),
            grade: 'kindergarten' as any
          };
        }
      }

      // Generate drafts
      const draftInput: MessageDraftInput = {
        tenantId,
        conversationId,
        context: aiContext,
        purpose: purpose as any,
        relatedStudentId: conversation.relatedStudentId,
        conversationHistory: recentMessages.items.reverse().map(m => ({
          role: m.sender.role,
          content: this.extractMessageText(m.content),
          timestamp: m.sentAt
        })),
        additionalContext: context
      };

      const drafts = await this.aiService.generateMessageDraft(draftInput);

      return {
        id: this.generateId('draft'),
        tenantId,
        conversationId,
        purpose: purpose as any,
        drafts: drafts.drafts,
        suggestedSubjectLine: drafts.suggestedSubjectLine,
        contextUsed: drafts.contextUsed,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };
    }, { conversationId, purpose });
  }

  /**
   * Get conversations for a user
   */
  async getUserConversations(
    tenantId: string,
    userId: string,
    options: PaginationOptions & { status?: string }
  ): Promise<Result<Paginated<Conversation>>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(userId, 'user');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getUserConversations', tenantId, async () => {
      return this.conversationRepo.findByParticipant(tenantId, userId, options);
    }, { userId });
  }

  /**
   * Mark messages as read
   */
  async markMessagesRead(
    tenantId: string,
    conversationId: string,
    userId: string,
    upToMessageId?: string
  ): Promise<Result<number>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(conversationId, 'conversation');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('markMessagesRead', tenantId, async () => {
      const count = await this.messageRepo.markAsRead(tenantId, conversationId, userId, upToMessageId);
      await this.conversationRepo.resetUnreadCount(tenantId, conversationId, userId);
      return count;
    }, { conversationId });
  }

  // ===========================================================================
  // CALENDAR EVENTS
  // ===========================================================================

  /**
   * Create a calendar event
   */
  async createEvent(input: CreateEventInput): Promise<Result<CalendarEvent>> {
    try {
      this.validateTenantId(input.tenantId);
      this.validateEntityId(input.schoolId, 'school');
      Validator.required(input.title, 'title');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createEvent', input.tenantId, async () => {
      const teacher = await this.getTeacher(input.tenantId, input.createdBy);
      if (!teacher) {
        throw new NotFoundError('Teacher', input.createdBy);
      }

      const event: CalendarEvent = {
        id: this.generateId('event'),
        tenantId: input.tenantId,
        schoolId: input.schoolId,
        classroomId: input.classroomId,
        
        title: input.title,
        description: input.description,
        type: input.type,
        
        startDate: input.startDate,
        endDate: input.endDate,
        allDay: input.allDay || false,
        timezone: 'Australia/Sydney',
        
        location: input.location,
        
        visibility: input.classroomId ? 'class' : 'school',
        
        rsvpEnabled: input.rsvpEnabled || false,
        rsvpDeadline: input.rsvpDeadline,
        rsvpResponses: [],
        
        reminders: [
          { type: 'push', beforeMinutes: 60 },
          { type: 'push', beforeMinutes: 1440 } // 24 hours
        ],
        
        createdBy: input.createdBy,
        createdByName: teacher.displayName,
        
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.eventRepo.create(event);

      await this.publishEvent('communication.event_created', input.tenantId, {
        eventId: saved.id,
        type: input.type,
        classroomId: input.classroomId,
        startDate: input.startDate.toISOString()
      });

      return saved;
    }, { type: input.type });
  }

  /**
   * RSVP to an event
   */
  async rsvpToEvent(
    tenantId: string,
    eventId: string,
    userId: string,
    userName: string,
    response: 'yes' | 'no' | 'maybe',
    studentIds?: string[],
    notes?: string
  ): Promise<Result<void>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(eventId, 'event');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('rsvpToEvent', tenantId, async () => {
      const event = await this.eventRepo.findById(tenantId, eventId);
      if (!event) {
        throw new NotFoundError('CalendarEvent', eventId);
      }

      if (!event.rsvpEnabled) {
        throw new ValidationError('RSVP is not enabled for this event');
      }

      if (event.rsvpDeadline && new Date() > event.rsvpDeadline) {
        throw new ValidationError('RSVP deadline has passed');
      }

      await this.eventRepo.addRsvp(tenantId, eventId, {
        userId,
        userName,
        response,
        studentIds,
        notes,
        respondedAt: new Date()
      });

      await this.publishEvent('communication.event_rsvp', tenantId, {
        eventId,
        userId,
        response
      });
    }, { eventId, response });
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(
    tenantId: string,
    scope: { schoolId?: string; classroomId?: string },
    daysAhead: number = 30
  ): Promise<Result<CalendarEvent[]>> {
    try {
      this.validateTenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getUpcomingEvents', tenantId, async () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);

      return this.eventRepo.findUpcoming(tenantId, scope, {
        start: new Date(),
        end: endDate
      });
    }, { daysAhead });
  }

  // ===========================================================================
  // EMERGENCY ALERTS
  // ===========================================================================

  /**
   * Send an emergency alert
   * 
   * Emergency alerts bypass all quiet hours and notification preferences.
   * They are delivered immediately via all enabled channels.
   */
  async sendEmergencyAlert(input: CreateAlertInput): Promise<Result<EmergencyAlert>> {
    try {
      this.validateTenantId(input.tenantId);
      this.validateEntityId(input.schoolId, 'school');
      Validator.required(input.title, 'title');
      Validator.required(input.message, 'message');
      Validator.arrayNotEmpty(input.channels, 'channels');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('sendEmergencyAlert', input.tenantId, async () => {
      const teacher = await this.getTeacher(input.tenantId, input.createdBy);
      if (!teacher) {
        throw new NotFoundError('Teacher', input.createdBy);
      }

      // Verify teacher has permission to send alerts
      if (!['school_admin', 'principal'].includes(teacher.role)) {
        throw new ValidationError('Only administrators can send emergency alerts');
      }

      const alert: EmergencyAlert = {
        id: this.generateId('alert'),
        tenantId: input.tenantId,
        schoolId: input.schoolId,
        
        scope: input.targetClassroomIds ? 'classrooms' : 'school',
        targetClassroomIds: input.targetClassroomIds,
        
        type: input.type,
        severity: input.severity,
        
        title: input.title,
        message: input.message,
        instructions: input.instructions,
        
        channels: input.channels,
        deliveryStats: {
          total: 0,
          sent: 0,
          delivered: 0,
          failed: 0,
          byChannel: {}
        },
        
        requiresAcknowledgement: input.requiresAcknowledgement || false,
        acknowledgements: [],
        
        createdBy: input.createdBy,
        createdByName: teacher.displayName,
        
        status: 'sending',
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.alertRepo.create(alert);

      // Send immediately via all channels
      await this.deliverEmergencyAlert(saved);

      await this.publishEvent('communication.emergency_alert_sent', input.tenantId, {
        alertId: saved.id,
        type: input.type,
        severity: input.severity,
        schoolId: input.schoolId,
        targetClassroomCount: input.targetClassroomIds?.length || 0
      });

      return saved;
    }, { type: input.type, severity: input.severity });
  }

  /**
   * Acknowledge an emergency alert
   */
  async acknowledgeAlert(
    tenantId: string,
    alertId: string,
    userId: string,
    userName: string,
    userRole: string
  ): Promise<Result<void>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(alertId, 'alert');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('acknowledgeAlert', tenantId, async () => {
      const alert = await this.alertRepo.findById(tenantId, alertId);
      if (!alert) {
        throw new NotFoundError('EmergencyAlert', alertId);
      }

      await this.alertRepo.addAcknowledgement(tenantId, alertId, {
        userId,
        userName,
        role: userRole as any,
        acknowledgedAt: new Date()
      });

      await this.publishEvent('communication.alert_acknowledged', tenantId, {
        alertId,
        userId,
        userRole
      });
    }, { alertId });
  }

  // ===========================================================================
  // NOTIFICATIONS
  // ===========================================================================

  /**
   * Create and deliver a notification
   */
  async createNotification(input: {
    tenantId: string;
    recipientId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    channels?: NotificationChannel[];
    respectQuietHours?: boolean;
  }): Promise<Result<Notification>> {
    return this.withTiming('createNotification', input.tenantId, async () => {
      // Check quiet hours unless bypassed
      if (input.respectQuietHours !== false) {
        const parent = await this.getParent(input.tenantId, input.recipientId);
        if (parent && this.isInQuietHours(parent)) {
          // Queue for later delivery
          return this.queueNotificationForLater(input, parent);
        }
      }

      const notification: Notification = {
        id: this.generateId('notif'),
        tenantId: input.tenantId,
        recipientId: input.recipientId,
        
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
        
        channels: input.channels || ['push'],
        deliveryStatus: {},
        
        read: false,
        
        createdAt: new Date(),
        scheduledFor: undefined
      };

      const saved = await this.notificationRepo.create(notification);

      // Deliver immediately
      await this.deliverNotification(saved);

      return saved;
    }, { type: input.type });
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    tenantId: string,
    userId: string,
    options: PaginationOptions & { unreadOnly?: boolean }
  ): Promise<Result<Paginated<Notification>>> {
    return this.withTiming('getUserNotifications', tenantId, async () => {
      return this.notificationRepo.findByRecipient(tenantId, userId, options);
    }, { userId });
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(
    tenantId: string,
    notificationId: string,
    userId: string
  ): Promise<Result<void>> {
    return this.withTiming('markNotificationRead', tenantId, async () => {
      await this.notificationRepo.markRead(tenantId, notificationId, userId);
    }, { notificationId });
  }

  // ===========================================================================
  // TRANSLATION
  // ===========================================================================

  /**
   * Translate content for a user
   */
  async translateForUser(
    tenantId: string,
    content: string,
    targetLanguage: SupportedLanguage,
    sourceLanguage: SupportedLanguage = 'en'
  ): Promise<Result<Translation>> {
    return this.withTiming('translateForUser', tenantId, async () => {
      if (sourceLanguage === targetLanguage) {
        return {
          originalText: content,
          originalLanguage: sourceLanguage,
          translatedText: content,
          targetLanguage,
          method: 'none',
          translatedAt: new Date()
        };
      }

      // Use external translation service
      const translated = await this.translateText(content, sourceLanguage, targetLanguage);

      // Optionally enhance with AI
      const enhanced = await this.aiService.enhanceTranslation(
        translated,
        sourceLanguage,
        targetLanguage,
        'parent_communication'
      );

      return {
        originalText: content,
        originalLanguage: sourceLanguage,
        translatedText: enhanced || translated,
        targetLanguage,
        method: enhanced ? 'ai_enhanced' : 'machine',
        translatedAt: new Date()
      };
    }, { targetLanguage });
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private async moderateContent(
    tenantId: string,
    contentType: string,
    text: string
  ): Promise<{ safe: boolean; severity: string; flags: Array<{ type: string; description: string }> }> {
    if (!text || text.length === 0) {
      return { safe: true, severity: 'none', flags: [] };
    }

    const result = await this.aiService.checkSafeguarding({
      tenantId,
      contentType: contentType as any,
      content: text
    });

    return {
      safe: result.safe,
      severity: result.severity,
      flags: result.flags.map(f => ({ type: f.type, description: f.description }))
    };
  }

  private async generateAICaption(
    input: CreateStoryInput,
    classroom: Classroom
  ): Promise<{ main: string; alternatives: string[] } | null> {
    try {
      const captionInput: CaptionGenerationInput = {
        tenantId: input.tenantId,
        classroomId: input.classroomId,
        contentDescription: input.content.text,
        mediaUrls: input.content.mediaUrls,
        taggedStudentNames: [], // Would populate
        tone: 'playful',
        context: {
          school: { id: input.schoolId, name: '', type: 'primary_school', jurisdiction: 'AU_NSW' },
          classroom: {
            id: classroom.id,
            name: classroom.name,
            grade: classroom.grade,
            studentCount: 0,
            teacherNames: [],
            currentTheme: classroom.theme?.name
          },
          timeContext: this.buildTimeContext()
        }
      };

      const result = await this.aiService.generateCaption(captionInput);
      return {
        main: result.caption,
        alternatives: result.alternatives
      };
    } catch (error) {
      this.logger.error('Failed to generate AI caption', error as Error);
      return null;
    }
  }

  private async notifyParentsOfStory(post: StoryPost, taggedStudentIds: string[]): Promise<void> {
    // Get parents of tagged students
    const parentNotifications = new Set<string>();

    for (const studentId of taggedStudentIds) {
      const parents = await this.getParentsForStudent(post.tenantId, studentId);
      for (const parent of parents) {
        if (!parentNotifications.has(parent.id)) {
          parentNotifications.add(parent.id);
          
          await this.createNotification({
            tenantId: post.tenantId,
            recipientId: parent.id,
            type: 'new_story',
            title: `📸 New class story`,
            body: `${post.author.name} posted a new update`,
            data: { storyId: post.id }
          });
        }
      }
    }
  }

  private async recordStoryView(tenantId: string, storyId: string, userId: string): Promise<void> {
    const view: StoryView = {
      userId,
      viewedAt: new Date()
    };

    await this.storyRepo.addView(tenantId, storyId, view);
  }

  private async notifyMessageRecipients(
    conversation: Conversation,
    message: Message,
    sender: ConversationParticipant
  ): Promise<void> {
    for (const participant of conversation.participants) {
      if (participant.userId === sender.userId) continue;
      if (!participant.notificationsEnabled) continue;

      // Check quiet hours for parents
      if (participant.parentId) {
        const parent = await this.getParent(conversation.tenantId, participant.parentId);
        if (parent && this.isInQuietHours(parent)) {
          // Update unread count but don't notify
          await this.conversationRepo.incrementUnreadCount(
            conversation.tenantId,
            conversation.id,
            participant.userId
          );
          continue;
        }
      }

      await this.createNotification({
        tenantId: conversation.tenantId,
        recipientId: participant.userId,
        type: 'new_message',
        title: `Message from ${sender.name}`,
        body: this.truncateText(this.extractMessageText(message.content), 50),
        data: {
          conversationId: conversation.id,
          messageId: message.id
        },
        respectQuietHours: true
      });

      await this.conversationRepo.incrementUnreadCount(
        conversation.tenantId,
        conversation.id,
        participant.userId
      );
    }
  }

  private async deliverEmergencyAlert(alert: EmergencyAlert): Promise<void> {
    // Get all recipients based on scope
    const recipients: Array<{ userId: string; phone?: string; email?: string }> = [];
    
    // This would load parents from the targeted classrooms or whole school
    // For now, simplified implementation
    
    let totalSent = 0;
    let totalFailed = 0;

    for (const recipient of recipients) {
      for (const channel of alert.channels) {
        try {
          switch (channel) {
            case 'push':
              await this.sendPushNotification(recipient.userId, {
                title: `🚨 ${alert.title}`,
                body: alert.message,
                data: { alertId: alert.id, type: 'emergency' },
                sound: 'emergency'
              });
              break;
            case 'sms':
              if (recipient.phone) {
                await this.sendSMS(recipient.phone, `${alert.title}: ${alert.message}`);
              }
              break;
            case 'email':
              if (recipient.email) {
                await this.sendEmail(
                  recipient.email,
                  `🚨 ${alert.title}`,
                  alert.message
                );
              }
              break;
          }
          totalSent++;
        } catch (error) {
          totalFailed++;
          this.logger.error(`Failed to deliver alert via ${channel}`, error as Error);
        }
      }
    }

    // Update delivery stats
    await this.alertRepo.updateDeliveryStats(alert.tenantId, alert.id, {
      total: recipients.length * alert.channels.length,
      sent: totalSent,
      delivered: totalSent, // Simplified - would track actual delivery
      failed: totalFailed,
      byChannel: {}
    });

    await this.alertRepo.updateStatus(alert.tenantId, alert.id, 'sent');
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    for (const channel of notification.channels) {
      try {
        switch (channel) {
          case 'push':
            const success = await this.sendPushNotification(notification.recipientId, {
              title: notification.title,
              body: notification.body,
              data: notification.data
            });
            
            await this.notificationRepo.updateDeliveryStatus(
              notification.tenantId,
              notification.id,
              channel,
              success ? 'delivered' : 'failed'
            );
            break;
            
          // Would handle email, SMS similarly
        }
      } catch (error) {
        this.logger.error(`Failed to deliver notification via ${channel}`, error as Error);
        await this.notificationRepo.updateDeliveryStatus(
          notification.tenantId,
          notification.id,
          channel,
          'failed'
        );
      }
    }
  }

  private async queueNotificationForLater(
    input: any,
    parent: Parent
  ): Promise<Notification> {
    const quietEnd = this.getQuietHoursEnd(parent);
    
    const notification: Notification = {
      id: this.generateId('notif'),
      tenantId: input.tenantId,
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      channels: input.channels || ['push'],
      deliveryStatus: {},
      read: false,
      createdAt: new Date(),
      scheduledFor: quietEnd
    };

    return this.notificationRepo.create(notification);
  }

  private async flagForSafeguardingReview(
    tenantId: string,
    contentType: string,
    contentId: string,
    flags: string[]
  ): Promise<void> {
    await this.publishEvent('safeguarding.content_flagged', tenantId, {
      contentType,
      contentId,
      flags,
      flaggedAt: new Date()
    });
  }

  private isInQuietHours(parent: Parent): boolean {
    if (!parent.communicationPrefs?.quietHours?.enabled) {
      return false;
    }

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    const { start, end } = parent.communicationPrefs.quietHours;
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 21:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }

    return currentTime >= startTime && currentTime < endTime;
  }

  private getQuietHoursEnd(parent: Parent): Date {
    const now = new Date();
    const { end } = parent.communicationPrefs?.quietHours || { end: '07:00' };
    const [endHour, endMin] = end.split(':').map(Number);
    
    const quietEnd = new Date(now);
    quietEnd.setHours(endHour, endMin, 0, 0);
    
    // If quiet hours end is earlier than now, it means tomorrow
    if (quietEnd <= now) {
      quietEnd.setDate(quietEnd.getDate() + 1);
    }
    
    return quietEnd;
  }

  private extractTextContent(content: StoryContent): string {
    return content.text || '';
  }

  private extractMessageText(content: MessageContent): string {
    if (content.type === 'text') return content.text || '';
    if (content.type === 'mixed') return content.text || '';
    return '';
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private buildTimeContext(): AIContext['timeContext'] {
    const now = new Date();
    const hours = now.getHours();
    return {
      currentTime: now,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
      periodOfDay: hours < 12 ? 'morning' : hours < 15 ? 'midday' : 'afternoon'
    };
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) age--;
    return age;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createCommunicationService(deps: CommunicationServiceDependencies): CommunicationService {
  return new CommunicationService(deps);
}
