/**
 * Little Explorers - Communication Service
 *
 * Manages all parent-teacher communication for early years education (ages 3-7).
 * Provides Class Story feed, direct messaging with AI assistance, event calendars,
 * and emergency alerts with built-in translation support (20+ languages).
 *
 * Features:
 * - Class Story feed (teacher posts, photos, updates)
 * - Direct messaging with parents
 * - AI message drafts and translations
 * - Event calendar with RSVP
 * - Emergency/urgent alerts
 * - Quiet hours and notification preferences
 * - Safeguarding content monitoring
 *
 * @module LittleExplorers/Communication
 */

import { log } from '../lib/logger';
import {
  Result,
  success,
  failure,
  isFailure,
  ScholarlyBaseService,
  ServiceDependencies,
  ValidationError,
  NotFoundError,
  Validator,
} from './base.service';
import {
  LittleExplorersStudent,
  LittleExplorersClassroom,
  LittleExplorersTeacher,
  LittleExplorersParent,
  LittleExplorersStoryPost,
  LittleExplorersConversation,
  LittleExplorersMessage,
  LittleExplorersCalendarEvent,
  LittleExplorersEmergencyAlert,
  LittleExplorersNotification,
  LittleExplorersAIContext,
  LittleExplorersAgeGroup,
  LittleExplorersEventRSVP,
  LittleExplorersEmergencyType,
  generateLittleExplorersId,
} from './little-explorers-types';
import {
  LittleExplorersAIService,
  getLittleExplorersAIService,
} from './little-explorers-ai.service';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface LittleExplorersStoryPostRepository {
  create(post: LittleExplorersStoryPost): Promise<LittleExplorersStoryPost>;
  findById(tenantId: string, id: string): Promise<LittleExplorersStoryPost | null>;
  findByClassroom(
    tenantId: string,
    classroomId: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<{ items: LittleExplorersStoryPost[]; total: number }>;
  incrementViews(tenantId: string, postId: string): Promise<void>;
  addLike(tenantId: string, postId: string, parentId: string, emoji: string): Promise<void>;
  addComment(
    tenantId: string,
    postId: string,
    comment: LittleExplorersStoryPost['comments'][0]
  ): Promise<void>;
  approveComment(tenantId: string, postId: string, commentId: string): Promise<void>;
  updateStatus(
    tenantId: string,
    postId: string,
    status: LittleExplorersStoryPost['status']
  ): Promise<void>;
  pin(tenantId: string, postId: string): Promise<void>;
  unpin(tenantId: string, postId: string): Promise<void>;
}

export interface LittleExplorersConversationRepository {
  create(conversation: LittleExplorersConversation): Promise<LittleExplorersConversation>;
  findById(tenantId: string, id: string): Promise<LittleExplorersConversation | null>;
  findByParticipant(
    tenantId: string,
    userId: string,
    options?: { limit?: number }
  ): Promise<LittleExplorersConversation[]>;
  findByClassroom(
    tenantId: string,
    classroomId: string
  ): Promise<LittleExplorersConversation[]>;
  updateLastMessage(
    tenantId: string,
    conversationId: string,
    message: LittleExplorersMessage
  ): Promise<void>;
  incrementUnread(tenantId: string, conversationId: string, userId: string): Promise<void>;
  markRead(tenantId: string, conversationId: string, userId: string): Promise<void>;
}

export interface LittleExplorersMessageRepository {
  create(message: LittleExplorersMessage): Promise<LittleExplorersMessage>;
  findById(tenantId: string, id: string): Promise<LittleExplorersMessage | null>;
  findByConversation(
    tenantId: string,
    conversationId: string,
    options?: { limit?: number; before?: Date }
  ): Promise<LittleExplorersMessage[]>;
  addTranslation(
    tenantId: string,
    messageId: string,
    language: string,
    translatedText: string
  ): Promise<void>;
  markDelivered(tenantId: string, messageId: string): Promise<void>;
  markRead(tenantId: string, messageId: string): Promise<void>;
}

export interface LittleExplorersCalendarEventRepository {
  create(event: LittleExplorersCalendarEvent): Promise<LittleExplorersCalendarEvent>;
  findById(tenantId: string, id: string): Promise<LittleExplorersCalendarEvent | null>;
  findByClassroom(
    tenantId: string,
    classroomId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<LittleExplorersCalendarEvent[]>;
  addRsvp(
    tenantId: string,
    eventId: string,
    rsvp: LittleExplorersCalendarEvent['rsvps'][0]
  ): Promise<void>;
  updateRsvp(
    tenantId: string,
    eventId: string,
    parentId: string,
    response: string
  ): Promise<void>;
  cancel(tenantId: string, eventId: string, reason: string): Promise<void>;
}

export interface LittleExplorersEmergencyAlertRepository {
  create(alert: LittleExplorersEmergencyAlert): Promise<LittleExplorersEmergencyAlert>;
  findById(tenantId: string, id: string): Promise<LittleExplorersEmergencyAlert | null>;
  findActiveByScope(
    tenantId: string,
    scope: string,
    scopeId: string
  ): Promise<LittleExplorersEmergencyAlert[]>;
  resolve(tenantId: string, alertId: string, resolution: string): Promise<void>;
  recordAcknowledgment(
    tenantId: string,
    alertId: string,
    userId: string,
    method: string
  ): Promise<void>;
}

export interface LittleExplorersNotificationRepository {
  create(notification: LittleExplorersNotification): Promise<LittleExplorersNotification>;
  findByUser(
    tenantId: string,
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<LittleExplorersNotification[]>;
  markRead(tenantId: string, notificationId: string): Promise<void>;
  markAllRead(tenantId: string, userId: string): Promise<void>;
}

// ============================================================================
// SERVICE INPUT/OUTPUT TYPES
// ============================================================================

export interface LittleExplorersCommunicationServiceDependencies extends ServiceDependencies {
  storyRepository: LittleExplorersStoryPostRepository;
  conversationRepository: LittleExplorersConversationRepository;
  messageRepository: LittleExplorersMessageRepository;
  eventRepository: LittleExplorersCalendarEventRepository;
  alertRepository: LittleExplorersEmergencyAlertRepository;
  notificationRepository: LittleExplorersNotificationRepository;
  aiService?: LittleExplorersAIService;
  getStudent: (tenantId: string, studentId: string) => Promise<LittleExplorersStudent | null>;
  getClassroom: (tenantId: string, classroomId: string) => Promise<LittleExplorersClassroom | null>;
  getTeacher: (tenantId: string, teacherId: string) => Promise<LittleExplorersTeacher | null>;
  getParent: (tenantId: string, parentId: string) => Promise<LittleExplorersParent | null>;
  translateText: (text: string, from: string, to: string) => Promise<string>;
  sendPushNotification: (
    userIds: string[],
    notification: { title: string; body: string; data?: Record<string, string> }
  ) => Promise<void>;
  sendSMS: (phoneNumber: string, message: string) => Promise<void>;
}

export interface LittleExplorersCreateStoryPostInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  createdBy: string;
  type: LittleExplorersStoryPost['type'];
  title?: string;
  text: string;
  mediaItems?: LittleExplorersStoryPost['mediaItems'];
  taggedStudentIds?: string[];
  visibility?: LittleExplorersStoryPost['visibility'];
  scheduledFor?: Date;
  useAICaptions?: boolean;
}

export interface LittleExplorersSendMessageInput {
  tenantId: string;
  schoolId?: string;
  conversationId?: string;
  senderId: string;
  senderRole: 'teacher' | 'parent';
  recipientIds?: string[];
  classroomId?: string;
  studentId?: string;
  content: string;
  replyToMessageId?: string;
  generateAIDraft?: boolean;
}

export interface LittleExplorersCreateEventInput {
  tenantId: string;
  schoolId: string;
  classroomId?: string;
  createdBy: string;
  title: string;
  description?: string;
  type: LittleExplorersCalendarEvent['type'];
  startTime: Date;
  endTime: Date;
  location?: string;
  requiresRsvp?: boolean;
  rsvpDeadline?: Date;
  maxAttendees?: number;
  reminderTimes?: number[];
}

export interface LittleExplorersSendAlertInput {
  tenantId: string;
  schoolId: string;
  classroomIds?: string[];
  createdBy: string;
  severity: LittleExplorersEmergencyAlert['severity'];
  title: string;
  message: string;
  requiresAcknowledgment?: boolean;
  sendSMS?: boolean;
}

// ============================================================================
// LITTLE EXPLORERS COMMUNICATION SERVICE
// ============================================================================

export class LittleExplorersCommunicationService extends ScholarlyBaseService {
  private readonly storyRepo: LittleExplorersStoryPostRepository;
  private readonly conversationRepo: LittleExplorersConversationRepository;
  private readonly messageRepo: LittleExplorersMessageRepository;
  private readonly eventRepo: LittleExplorersCalendarEventRepository;
  private readonly alertRepo: LittleExplorersEmergencyAlertRepository;
  private readonly notificationRepo: LittleExplorersNotificationRepository;
  private readonly aiService: LittleExplorersAIService;

  private readonly getStudent: LittleExplorersCommunicationServiceDependencies['getStudent'];
  private readonly getClassroom: LittleExplorersCommunicationServiceDependencies['getClassroom'];
  private readonly getTeacher: LittleExplorersCommunicationServiceDependencies['getTeacher'];
  private readonly getParent: LittleExplorersCommunicationServiceDependencies['getParent'];
  private readonly translateText: LittleExplorersCommunicationServiceDependencies['translateText'];
  private readonly sendPushNotification: LittleExplorersCommunicationServiceDependencies['sendPushNotification'];
  private readonly sendSMS: LittleExplorersCommunicationServiceDependencies['sendSMS'];

  constructor(deps: LittleExplorersCommunicationServiceDependencies) {
    super('LittleExplorersCommunicationService', deps);
    this.storyRepo = deps.storyRepository;
    this.conversationRepo = deps.conversationRepository;
    this.messageRepo = deps.messageRepository;
    this.eventRepo = deps.eventRepository;
    this.alertRepo = deps.alertRepository;
    this.notificationRepo = deps.notificationRepository;
    this.aiService = deps.aiService || getLittleExplorersAIService();
    this.getStudent = deps.getStudent;
    this.getClassroom = deps.getClassroom;
    this.getTeacher = deps.getTeacher;
    this.getParent = deps.getParent;
    this.translateText = deps.translateText;
    this.sendPushNotification = deps.sendPushNotification;
    this.sendSMS = deps.sendSMS;
  }

  // ===========================================================================
  // CLASS STORY
  // ===========================================================================

  async createStoryPost(
    input: LittleExplorersCreateStoryPostInput
  ): Promise<Result<LittleExplorersStoryPost>> {
    const validation = this.validateRequired(input, [
      'tenantId',
      'schoolId',
      'classroomId',
      'createdBy',
      'type',
      'text',
    ]);
    if (isFailure(validation)) return failure(validation.error);

    return this.withTiming('createStoryPost', async () => {
      const teacher = await this.getTeacher(input.tenantId, input.createdBy);
      if (!teacher) {
        return failure(new NotFoundError('Teacher', input.createdBy));
      }

      const classroom = await this.getClassroom(input.tenantId, input.classroomId);
      if (!classroom) {
        return failure(new NotFoundError('Classroom', input.classroomId));
      }

      // Check photo consent for tagged students
      if (input.taggedStudentIds && input.mediaItems && input.mediaItems.length > 0) {
        for (const studentId of input.taggedStudentIds) {
          const student = await this.getStudent(input.tenantId, studentId);
          if (student) {
            const hasPhotoConsent = student.consents?.some(
              (c) => c.type === 'photo_consent' && c.status === 'granted'
            );
            if (!hasPhotoConsent) {
              return failure(
                new ValidationError(`Student ${student.firstName} does not have photo consent`)
              );
            }
          }
        }
      }

      // Run safeguarding check on content
      const safeguardingCheck = await this.aiService.checkSafeguarding({
        tenantId: input.tenantId,
        contentType: 'text',
        content: input.text,
      });

      if (safeguardingCheck.success && !safeguardingCheck.data.safe) {
        log.warn('Story post flagged by safeguarding', {
          tenantId: input.tenantId,
          flags: safeguardingCheck.data.flags,
        });
        if (safeguardingCheck.data.severity === 'high' || safeguardingCheck.data.severity === 'critical') {
          return failure(
            new ValidationError('Content flagged for safeguarding review')
          );
        }
      }

      // Generate AI caption if requested
      let aiCaption: string | undefined;
      if (input.useAICaptions) {
        const taggedNames = await Promise.all(
          (input.taggedStudentIds || []).map(async (id) => {
            const student = await this.getStudent(input.tenantId, id);
            return student?.firstName;
          })
        ).then((names) => names.filter(Boolean) as string[]);

        const captionResult = await this.aiService.generateCaption({
          tenantId: input.tenantId,
          classroomId: input.classroomId,
          contentDescription: input.text,
          taggedStudentNames: taggedNames,
          tone: input.type === 'celebration' ? 'celebratory' : 'informative',
          includeLearningConnection: true,
        });

        if (captionResult.success) {
          aiCaption = captionResult.data.caption;
        }
      }

      const post: LittleExplorersStoryPost = {
        id: generateLittleExplorersId('story'),
        tenantId: input.tenantId,
        schoolId: input.schoolId,
        classroomId: input.classroomId,
        authorId: input.createdBy,
        authorName: `${teacher.firstName} ${teacher.lastName}`,
        authorRole: 'teacher',
        authorAvatarUrl: teacher.profileImageUrl,
        content: {
          type: input.type === 'update' ? 'text' : input.type as 'text' | 'photo' | 'video' | 'album' | 'document' | 'announcement',
          text: aiCaption || input.text,
          media: input.mediaItems,
        },
        engagement: {
          likes: [],
          comments: [],
          commentCount: 0,
          parentViewPercentage: 0,
        },
        moderationStatus: 'approved',
        type: input.type,
        title: input.title,
        text: aiCaption || input.text,
        originalText: aiCaption ? input.text : undefined,
        mediaItems: input.mediaItems || [],
        taggedStudentIds: input.taggedStudentIds || [],
        visibility: input.visibility || 'parents_only',
        status: input.scheduledFor ? 'scheduled' : 'published',
        scheduledFor: input.scheduledFor,
        publishedAt: input.scheduledFor ? undefined : new Date(),
        createdBy: input.createdBy,
        createdByName: `${teacher.firstName} ${teacher.lastName}`,
        createdByAvatar: teacher.profileImageUrl,
        likes: [],
        comments: [],
        viewCount: 0,
        uniqueViewerIds: [],
        aiGenerated: !!aiCaption,
        safeguardingCleared: safeguardingCheck.success && safeguardingCheck.data.safe,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.storyRepo.create(post);

      // Notify parents if published
      if (saved.status === 'published') {
        await this.notifyParentsOfStory(saved, classroom);
      }

      await this.publishEvent('communication.story_created', input.tenantId, {
        postId: saved.id,
        classroomId: input.classroomId,
        type: input.type,
        taggedStudentCount: input.taggedStudentIds?.length || 0,
      });

      return success(saved);
    });
  }

  async getClassStory(
    tenantId: string,
    classroomId: string,
    viewerId: string,
    viewerRole: 'teacher' | 'parent',
    options?: { limit?: number; offset?: number }
  ): Promise<Result<{ items: LittleExplorersStoryPost[]; total: number }>> {
    return this.withTiming('getClassStory', async () => {
      const classroom = await this.getClassroom(tenantId, classroomId);
      if (!classroom) {
        return failure(new NotFoundError('Classroom', classroomId));
      }

      // For parents, filter to posts they can see based on their children
      const result = await this.storyRepo.findByClassroom(tenantId, classroomId, {
        status: 'published',
        limit: options?.limit || 20,
        offset: options?.offset || 0,
      });

      if (viewerRole === 'parent') {
        // Get parent's children in this classroom
        const parent = await this.getParent(tenantId, viewerId);
        const childIds = parent?.childrenIds || [];

        // Filter posts to show only those visible to this parent
        const filteredItems = result.items.filter((post) => {
          if (post.visibility === 'public') return true;
          if (post.visibility === 'tagged_parents_only') {
            return post.taggedStudentIds.some((id) => childIds.includes(id));
          }
          return true; // parents_only shows all
        });

        return success({ items: filteredItems, total: filteredItems.length });
      }

      return success(result);
    });
  }

  async likeStoryPost(
    tenantId: string,
    postId: string,
    parentId: string,
    emoji: string
  ): Promise<Result<void>> {
    return this.withTiming('likeStoryPost', async () => {
      const post = await this.storyRepo.findById(tenantId, postId);
      if (!post) {
        return failure(new NotFoundError('StoryPost', postId));
      }

      await this.storyRepo.addLike(tenantId, postId, parentId, emoji);

      await this.publishEvent('communication.story_liked', tenantId, {
        postId,
        parentId,
        emoji,
      });

      return success(undefined);
    });
  }

  async commentOnStoryPost(
    tenantId: string,
    postId: string,
    parentId: string,
    content: string
  ): Promise<Result<LittleExplorersStoryPost['comments'][0]>> {
    if (!Validator.isNonEmptyString(content)) {
      return failure({ code: 'VALIDATION_ERROR', message: 'Comment content is required' });
    }

    return this.withTiming('commentOnStoryPost', async () => {
      const post = await this.storyRepo.findById(tenantId, postId);
      if (!post) {
        return failure(new NotFoundError('StoryPost', postId));
      }

      const parent = await this.getParent(tenantId, parentId);
      if (!parent) {
        return failure(new NotFoundError('Parent', parentId));
      }

      // Run safeguarding check
      const safeguardingCheck = await this.aiService.checkSafeguarding({
        tenantId,
        contentType: 'text',
        content,
      });

      const comment: LittleExplorersStoryPost['comments'][0] = {
        id: generateLittleExplorersId('cmt'),
        parentId,
        parentName: `${parent.firstName} ${parent.lastName}`,
        content,
        isApproved:
          safeguardingCheck.success &&
          safeguardingCheck.data.safe &&
          safeguardingCheck.data.severity === 'none',
        createdAt: new Date(),
      };

      await this.storyRepo.addComment(tenantId, postId, comment);

      if (!comment.isApproved) {
        log.info('Comment pending approval', { postId, commentId: comment.id });
      }

      return success(comment);
    });
  }

  async pinStoryPost(tenantId: string, postId: string): Promise<Result<void>> {
    return this.withTiming('pinStoryPost', async () => {
      const post = await this.storyRepo.findById(tenantId, postId);
      if (!post) {
        return failure(new NotFoundError('StoryPost', postId));
      }
      await this.storyRepo.pin(tenantId, postId);
      return success(undefined);
    });
  }

  // ===========================================================================
  // DIRECT MESSAGING
  // ===========================================================================

  async sendMessage(input: LittleExplorersSendMessageInput): Promise<Result<LittleExplorersMessage>> {
    const validation = this.validateRequired(input, ['tenantId', 'senderId', 'senderRole', 'content']);
    if (isFailure(validation)) return failure(validation.error);

    return this.withTiming('sendMessage', async () => {
      let conversation: LittleExplorersConversation | null = null;

      // Get or create conversation
      if (input.conversationId) {
        conversation = await this.conversationRepo.findById(input.tenantId, input.conversationId);
        if (!conversation) {
          return failure(new NotFoundError('Conversation', input.conversationId));
        }
      } else if (input.recipientIds && input.recipientIds.length > 0) {
        // Create new conversation
        const participants: LittleExplorersConversation['participants'] = [];

        // Add sender
        if (input.senderRole === 'teacher') {
          const teacher = await this.getTeacher(input.tenantId, input.senderId);
          if (teacher) {
            participants.push({
              userId: teacher.id,
              role: 'teacher',
              name: `${teacher.firstName} ${teacher.lastName}`,
              unreadCount: 0,
              isMuted: false,
              mutedUntil: undefined,
            });
          }
        } else {
          const parent = await this.getParent(input.tenantId, input.senderId);
          if (parent) {
            participants.push({
              userId: parent.id,
              role: 'parent',
              name: `${parent.firstName} ${parent.lastName}`,
              unreadCount: 0,
              isMuted: false,
              mutedUntil: undefined,
            });
          }
        }

        // Add recipients
        for (const recipientId of input.recipientIds) {
          const teacher = await this.getTeacher(input.tenantId, recipientId);
          if (teacher) {
            participants.push({
              userId: teacher.id,
              role: 'teacher',
              name: `${teacher.firstName} ${teacher.lastName}`,
              unreadCount: 0,
              isMuted: false,
              mutedUntil: undefined,
            });
          } else {
            const parent = await this.getParent(input.tenantId, recipientId);
            if (parent) {
              participants.push({
                userId: parent.id,
                role: 'parent',
                name: `${parent.firstName} ${parent.lastName}`,
                unreadCount: 0,
                isMuted: false,
                mutedUntil: undefined,
              });
            }
          }
        }

        conversation = await this.conversationRepo.create({
          id: generateLittleExplorersId('conv'),
          tenantId: input.tenantId,
          schoolId: input.schoolId || '',
          classroomId: input.classroomId,
          studentId: input.studentId,
          participants,
          type: participants.length > 2 ? 'group' : 'direct',
          lastMessageAt: new Date(),
          unreadCounts: {},
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        return failure(new ValidationError('Either conversationId or recipientIds is required'));
      }

      // Run safeguarding check
      const safeguardingCheck = await this.aiService.checkSafeguarding({
        tenantId: input.tenantId,
        contentType: 'text',
        content: input.content,
      });

      if (safeguardingCheck.success && !safeguardingCheck.data.safe) {
        if (
          safeguardingCheck.data.severity === 'high' ||
          safeguardingCheck.data.severity === 'critical'
        ) {
          log.warn('Message blocked by safeguarding', {
            tenantId: input.tenantId,
            senderId: input.senderId,
            severity: safeguardingCheck.data.severity,
          });
          return failure(new ValidationError('Message flagged for review'));
        }
      }

      // Get sender info
      let senderName = 'Unknown';
      if (input.senderRole === 'teacher') {
        const teacher = await this.getTeacher(input.tenantId, input.senderId);
        if (teacher) senderName = `${teacher.firstName} ${teacher.lastName}`;
      } else {
        const parent = await this.getParent(input.tenantId, input.senderId);
        if (parent) senderName = `${parent.firstName} ${parent.lastName}`;
      }

      const message: LittleExplorersMessage = {
        id: generateLittleExplorersId('msg'),
        tenantId: input.tenantId,
        conversationId: conversation.id,
        senderId: input.senderId,
        senderRole: input.senderRole,
        senderName,
        content: input.content,
        translations: {},
        replyToMessageId: input.replyToMessageId,
        status: 'sent',
        safeguardingFlags: safeguardingCheck.success ? safeguardingCheck.data.flags.map(f => f.type) : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.messageRepo.create(message);
      await this.conversationRepo.updateLastMessage(input.tenantId, conversation.id, saved);

      // Increment unread count for other participants and send notifications
      for (const participant of conversation.participants) {
        if (participant.userId !== input.senderId && !participant.isMuted) {
          await this.conversationRepo.incrementUnread(input.tenantId, conversation.id, participant.userId);

          // Send push notification
          await this.sendPushNotification([participant.userId], {
            title: `New message from ${senderName}`,
            body: input.content.substring(0, 100),
            data: { conversationId: conversation.id, messageId: saved.id },
          });
        }
      }

      await this.publishEvent('communication.message_sent', input.tenantId, {
        messageId: saved.id,
        conversationId: conversation.id,
        senderId: input.senderId,
      });

      return success(saved);
    });
  }

  async getConversations(
    tenantId: string,
    userId: string,
    options?: { limit?: number }
  ): Promise<Result<LittleExplorersConversation[]>> {
    return this.withTiming('getConversations', async () => {
      const conversations = await this.conversationRepo.findByParticipant(tenantId, userId, options);
      return success(conversations);
    });
  }

  async getMessages(
    tenantId: string,
    conversationId: string,
    userId: string,
    options?: { limit?: number; before?: Date }
  ): Promise<Result<LittleExplorersMessage[]>> {
    return this.withTiming('getMessages', async () => {
      const conversation = await this.conversationRepo.findById(tenantId, conversationId);
      if (!conversation) {
        return failure(new NotFoundError('Conversation', conversationId));
      }

      // Verify user is participant
      const isParticipant = conversation.participants.some((p) => p.userId === userId);
      if (!isParticipant) {
        return failure(new ValidationError('User is not a participant in this conversation'));
      }

      const messages = await this.messageRepo.findByConversation(tenantId, conversationId, options);

      // Mark as read
      await this.conversationRepo.markRead(tenantId, conversationId, userId);

      return success(messages);
    });
  }

  async translateMessage(
    tenantId: string,
    messageId: string,
    targetLanguage: string
  ): Promise<Result<string>> {
    return this.withTiming('translateMessage', async () => {
      const message = await this.messageRepo.findById(tenantId, messageId);
      if (!message) {
        return failure(new NotFoundError('Message', messageId));
      }

      // Check if translation exists
      if (message.translations && message.translations[targetLanguage]) {
        return success(message.translations[targetLanguage]);
      }

      // Translate
      const messageContent = typeof message.content === 'string' ? message.content : (message.content.text || '');
      const translated = await this.translateText(messageContent, 'auto', targetLanguage);

      // Enhance translation with AI
      const enhanced = await this.aiService.enhanceTranslation(
        translated,
        'auto',
        targetLanguage,
        'parent_communication'
      );

      const finalTranslation = enhanced.success ? enhanced.data : translated;

      // Store translation
      await this.messageRepo.addTranslation(tenantId, messageId, targetLanguage, finalTranslation);

      return success(finalTranslation);
    });
  }

  async generateMessageDraft(
    tenantId: string,
    teacherId: string,
    purpose: 'celebration' | 'update' | 'concern' | 'introduction' | 'reminder',
    context?: { studentId?: string; keyPoints?: string[] }
  ): Promise<Result<string[]>> {
    return this.withTiming('generateMessageDraft', async () => {
      const teacher = await this.getTeacher(tenantId, teacherId);
      if (!teacher) {
        return failure(new NotFoundError('Teacher', teacherId));
      }

      let student: LittleExplorersStudent | null = null;
      if (context?.studentId) {
        student = await this.getStudent(tenantId, context.studentId);
      }

      const aiContext: LittleExplorersAIContext = {
        school: { id: '', name: '', type: 'primary_school', jurisdiction: 'AU_NSW' },
        teacher: {
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          role: 'teacher',
        },
        student: student
          ? {
              id: student.id,
              firstName: student.firstName,
              age: this.calculateAge(student.dateOfBirth),
              grade: LittleExplorersAgeGroup.KINDERGARTEN,
            }
          : undefined,
        timeContext: this.buildTimeContext(),
      };

      const result = await this.aiService.generateMessageDrafts({
        tenantId,
        teacherId,
        context: aiContext,
        draftContext: {
          purpose,
          keyPoints: context?.keyPoints,
          preferredTone: 'warm',
        },
        numberOfDrafts: 3,
      });

      if (isFailure(result)) return failure(result.error);

      return success(result.data.drafts.map((d) => d.text));
    });
  }

  // ===========================================================================
  // CALENDAR EVENTS
  // ===========================================================================

  async createEvent(
    input: LittleExplorersCreateEventInput
  ): Promise<Result<LittleExplorersCalendarEvent>> {
    const validation = this.validateRequired(input, [
      'tenantId',
      'schoolId',
      'createdBy',
      'title',
      'type',
      'startTime',
      'endTime',
    ]);
    if (isFailure(validation)) return failure(validation.error);

    if (input.startTime >= input.endTime) {
      return failure(new ValidationError('End time must be after start time'));
    }

    return this.withTiming('createEvent', async () => {
      const teacher = await this.getTeacher(input.tenantId, input.createdBy);
      if (!teacher) {
        return failure(new NotFoundError('Teacher', input.createdBy));
      }

      const event: LittleExplorersCalendarEvent = {
        id: generateLittleExplorersId('event'),
        tenantId: input.tenantId,
        schoolId: input.schoolId,
        classroomId: input.classroomId,
        title: input.title,
        description: input.description,
        type: input.type,
        startDate: input.startTime,
        endDate: input.endTime,
        startTime: input.startTime,
        endTime: input.endTime,
        allDay: false,
        isAllDay: false,
        timezone: 'UTC',
        recurring: false,
        visibility: 'class',
        rsvpEnabled: input.requiresRsvp ?? false,
        reminders: [],
        attachments: [],
        location: input.location,
        requiresRsvp: input.requiresRsvp ?? false,
        rsvpDeadline: input.rsvpDeadline,
        maxAttendees: input.maxAttendees,
        rsvps: [],
        remindersSent: [],
        createdBy: input.createdBy,
        createdByName: `${teacher.firstName} ${teacher.lastName}`,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.eventRepo.create(event);

      // Notify parents
      if (input.classroomId) {
        const classroom = await this.getClassroom(input.tenantId, input.classroomId);
        if (classroom) {
          await this.notifyParentsOfEvent(saved, classroom);
        }
      }

      await this.publishEvent('communication.event_created', input.tenantId, {
        eventId: saved.id,
        type: input.type,
        classroomId: input.classroomId,
      });

      return success(saved);
    });
  }

  async getClassroomEvents(
    tenantId: string,
    classroomId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<Result<LittleExplorersCalendarEvent[]>> {
    return this.withTiming('getClassroomEvents', async () => {
      const events = await this.eventRepo.findByClassroom(tenantId, classroomId, dateRange);
      return success(events);
    });
  }

  async submitRsvp(
    tenantId: string,
    eventId: string,
    parentId: string,
    response: 'attending' | 'not_attending' | 'maybe',
    notes?: string
  ): Promise<Result<void>> {
    return this.withTiming('submitRsvp', async () => {
      const event = await this.eventRepo.findById(tenantId, eventId);
      if (!event) {
        return failure(new NotFoundError('CalendarEvent', eventId));
      }

      if (!event.requiresRsvp) {
        return failure(new ValidationError('This event does not require RSVP'));
      }

      if (event.rsvpDeadline && new Date() > event.rsvpDeadline) {
        return failure(new ValidationError('RSVP deadline has passed'));
      }

      const parent = await this.getParent(tenantId, parentId);
      if (!parent) {
        return failure(new NotFoundError('Parent', parentId));
      }

      const rsvp: LittleExplorersEventRSVP = {
        userId: parentId,
        userName: `${parent.firstName} ${parent.lastName}`,
        studentIds: parent.childrenIds || [],
        parentId,
        parentName: `${parent.firstName} ${parent.lastName}`,
        response,
        notes,
        respondedAt: new Date(),
      };

      // Check if already responded
      const existingRsvp = event.rsvps.find((r) => r.parentId === parentId);
      if (existingRsvp) {
        await this.eventRepo.updateRsvp(tenantId, eventId, parentId, response);
      } else {
        // Check max attendees
        if (
          response === 'attending' &&
          event.maxAttendees &&
          event.rsvps.filter((r) => r.response === 'attending').length >= event.maxAttendees
        ) {
          return failure(new ValidationError('Event is at capacity'));
        }
        await this.eventRepo.addRsvp(tenantId, eventId, rsvp);
      }

      return success(undefined);
    });
  }

  async cancelEvent(
    tenantId: string,
    eventId: string,
    reason: string
  ): Promise<Result<void>> {
    return this.withTiming('cancelEvent', async () => {
      const event = await this.eventRepo.findById(tenantId, eventId);
      if (!event) {
        return failure(new NotFoundError('CalendarEvent', eventId));
      }

      await this.eventRepo.cancel(tenantId, eventId, reason);

      // Notify attendees
      const attendeeIds = event.rsvps
        .filter((r) => r.response === 'attending')
        .map((r) => r.parentId);

      if (attendeeIds.length > 0) {
        await this.sendPushNotification(attendeeIds, {
          title: 'Event Cancelled',
          body: `${event.title} has been cancelled: ${reason}`,
          data: { eventId },
        });
      }

      return success(undefined);
    });
  }

  // ===========================================================================
  // EMERGENCY ALERTS
  // ===========================================================================

  async sendEmergencyAlert(
    input: LittleExplorersSendAlertInput
  ): Promise<Result<LittleExplorersEmergencyAlert>> {
    const validation = this.validateRequired(input, [
      'tenantId',
      'schoolId',
      'createdBy',
      'severity',
      'title',
      'message',
    ]);
    if (isFailure(validation)) return failure(validation.error);

    return this.withTiming('sendEmergencyAlert', async () => {
      const teacher = await this.getTeacher(input.tenantId, input.createdBy);
      if (!teacher) {
        return failure(new NotFoundError('Teacher', input.createdBy));
      }

      const alert: LittleExplorersEmergencyAlert = {
        id: generateLittleExplorersId('alert'),
        tenantId: input.tenantId,
        schoolId: input.schoolId,
        classroomIds: input.classroomIds,
        targetClassroomIds: input.classroomIds,
        scope: input.classroomIds && input.classroomIds.length > 0 ? 'classroom' : 'school',
        type: 'general_emergency' as LittleExplorersEmergencyType,
        severity: input.severity,
        title: input.title,
        message: input.message,
        channels: ['push', 'sms'],
        deliveryStats: {
          totalRecipients: 0,
          delivered: 0,
          failed: 0,
          acknowledged: 0,
        },
        requiresAcknowledgement: input.requiresAcknowledgment ?? (input.severity === 'critical'),
        requiresAcknowledgment: input.requiresAcknowledgment ?? (input.severity === 'critical'),
        acknowledgements: [],
        acknowledgments: [],
        createdBy: input.createdBy,
        createdByName: `${teacher.firstName} ${teacher.lastName}`,
        status: 'active',
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.alertRepo.create(alert);

      // Send notifications to all affected parents
      const parentIds = await this.getAffectedParentIds(input.tenantId, input.schoolId, input.classroomIds);

      // Send push notifications (override quiet hours for critical)
      await this.sendPushNotification(parentIds, {
        title: `${this.getSeverityEmoji(input.severity)} ${input.title}`,
        body: input.message,
        data: { alertId: saved.id, severity: input.severity },
      });

      // Send SMS for critical alerts
      if (input.sendSMS && (input.severity === 'critical' || input.severity === 'urgent')) {
        for (const parentId of parentIds) {
          const parent = await this.getParent(input.tenantId, parentId);
          if (parent?.phone) {
            try {
              await this.sendSMS(parent.phone, `URGENT: ${input.title} - ${input.message}`);
            } catch (error) {
              log.error('Failed to send SMS alert', error as Error, { parentId });
            }
          }
        }
      }

      await this.publishEvent('communication.alert_sent', input.tenantId, {
        alertId: saved.id,
        severity: input.severity,
        recipientCount: parentIds.length,
      });

      return success(saved);
    });
  }

  async acknowledgeAlert(
    tenantId: string,
    alertId: string,
    parentId: string,
    method: 'app' | 'sms' | 'call'
  ): Promise<Result<void>> {
    return this.withTiming('acknowledgeAlert', async () => {
      const alert = await this.alertRepo.findById(tenantId, alertId);
      if (!alert) {
        return failure(new NotFoundError('EmergencyAlert', alertId));
      }

      if (!alert.requiresAcknowledgment) {
        return failure(new ValidationError('This alert does not require acknowledgment'));
      }

      await this.alertRepo.recordAcknowledgment(tenantId, alertId, parentId, method);

      return success(undefined);
    });
  }

  async resolveAlert(
    tenantId: string,
    alertId: string,
    resolution: string
  ): Promise<Result<void>> {
    return this.withTiming('resolveAlert', async () => {
      const alert = await this.alertRepo.findById(tenantId, alertId);
      if (!alert) {
        return failure(new NotFoundError('EmergencyAlert', alertId));
      }

      await this.alertRepo.resolve(tenantId, alertId, resolution);

      // Notify parents of resolution
      const parentIds = await this.getAffectedParentIds(tenantId, alert.schoolId, alert.classroomIds);

      await this.sendPushNotification(parentIds, {
        title: 'Alert Resolved',
        body: `${alert.title}: ${resolution}`,
        data: { alertId },
      });

      return success(undefined);
    });
  }

  // ===========================================================================
  // NOTIFICATIONS
  // ===========================================================================

  async getNotifications(
    tenantId: string,
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<Result<LittleExplorersNotification[]>> {
    return this.withTiming('getNotifications', async () => {
      const notifications = await this.notificationRepo.findByUser(tenantId, userId, options);
      return success(notifications);
    });
  }

  async markNotificationRead(
    tenantId: string,
    notificationId: string
  ): Promise<Result<void>> {
    return this.withTiming('markNotificationRead', async () => {
      await this.notificationRepo.markRead(tenantId, notificationId);
      return success(undefined);
    });
  }

  async markAllNotificationsRead(
    tenantId: string,
    userId: string
  ): Promise<Result<void>> {
    return this.withTiming('markAllNotificationsRead', async () => {
      await this.notificationRepo.markAllRead(tenantId, userId);
      return success(undefined);
    });
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private async notifyParentsOfStory(
    post: LittleExplorersStoryPost,
    classroom: LittleExplorersClassroom
  ): Promise<void> {
    const parentIds = new Set<string>();

    // Get parents of all students in classroom (or tagged students)
    const targetStudentIds =
      post.taggedStudentIds.length > 0
        ? post.taggedStudentIds
        : classroom.students.filter((s) => s.status === 'enrolled').map((s) => s.studentId);

    for (const studentId of targetStudentIds) {
      const student = await this.getStudent(post.tenantId, studentId);
      if (student) {
        student.familyConnections.forEach((fc) => parentIds.add(fc.userId));
      }
    }

    if (parentIds.size > 0) {
      await this.sendPushNotification([...parentIds], {
        title: 'New Class Story Post',
        body: post.title || post.text.substring(0, 100),
        data: { postId: post.id, classroomId: post.classroomId },
      });
    }
  }

  private async notifyParentsOfEvent(
    event: LittleExplorersCalendarEvent,
    classroom: LittleExplorersClassroom
  ): Promise<void> {
    const parentIds = new Set<string>();

    for (const enrollment of classroom.students.filter((s) => s.status === 'enrolled')) {
      const student = await this.getStudent(event.tenantId, enrollment.studentId);
      if (student) {
        student.familyConnections.forEach((fc) => parentIds.add(fc.userId));
      }
    }

    if (parentIds.size > 0) {
      await this.sendPushNotification([...parentIds], {
        title: 'New Event',
        body: `${event.title} - ${event.startTime.toLocaleDateString()}`,
        data: { eventId: event.id, classroomId: event.classroomId || '' },
      });
    }
  }

  private async getAffectedParentIds(
    tenantId: string,
    schoolId: string,
    classroomIds?: string[]
  ): Promise<string[]> {
    const parentIds = new Set<string>();

    if (classroomIds && classroomIds.length > 0) {
      for (const classroomId of classroomIds) {
        const classroom = await this.getClassroom(tenantId, classroomId);
        if (classroom) {
          for (const enrollment of classroom.students.filter((s) => s.status === 'enrolled')) {
            const student = await this.getStudent(tenantId, enrollment.studentId);
            if (student) {
              student.familyConnections.forEach((fc) => parentIds.add(fc.userId));
            }
          }
        }
      }
    } else {
      // School-wide: would need to get all classrooms for school
      log.info('School-wide alert', { schoolId });
    }

    return [...parentIds];
  }

  private getSeverityEmoji(severity: LittleExplorersEmergencyAlert['severity']): string {
    const emojis: Record<string, string> = {
      info: 'info',
      warning: 'warning',
      urgent: 'exclamation',
      critical: 'alert',
    };
    return emojis[severity] || 'bell';
  }

  private buildTimeContext(): LittleExplorersAIContext['timeContext'] {
    const now = new Date();
    const hours = now.getHours();
    return {
      currentTime: now,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
        now.getDay()
      ],
      periodOfDay: hours < 12 ? 'morning' : hours < 15 ? 'midday' : 'afternoon',
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
// SINGLETON PATTERN
// ============================================================================

let littleExplorersCommunicationServiceInstance: LittleExplorersCommunicationService | null = null;

export function initializeLittleExplorersCommunicationService(
  deps: LittleExplorersCommunicationServiceDependencies
): LittleExplorersCommunicationService {
  littleExplorersCommunicationServiceInstance = new LittleExplorersCommunicationService(deps);
  log.info('LittleExplorersCommunicationService initialized');
  return littleExplorersCommunicationServiceInstance;
}

export function getLittleExplorersCommunicationService(): LittleExplorersCommunicationService {
  if (!littleExplorersCommunicationServiceInstance) {
    throw new Error(
      'LittleExplorersCommunicationService not initialized. Call initializeLittleExplorersCommunicationService first.'
    );
  }
  return littleExplorersCommunicationServiceInstance;
}
