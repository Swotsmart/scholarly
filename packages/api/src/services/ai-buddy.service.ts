/**
 * AI Buddy Service
 *
 * Essential conversational AI companion for the Scholarly platform.
 * Provides personalized learning support for students, teachers, and parents.
 *
 * Features:
 * - Contextual learning assistance
 * - Socratic questioning for deeper understanding
 * - Curriculum-aligned responses
 * - Progress tracking and encouragement
 * - Multi-role support (student, teacher, parent)
 * - Conversation history and memory
 * - Safety guardrails
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  EventBus,
  Cache,
  ScholarlyConfig
} from '@scholarly/shared/types/scholarly-types';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger';
import {
  AIIntegrationService,
  AIBuddyContext,
  AIBuddyMessage,
  getAIService
} from './ai-integration.service';

// ============================================================================
// TYPES
// ============================================================================

export type BuddyRole = 'student' | 'teacher' | 'parent';

export interface Conversation {
  id: string;
  tenantId: string;
  userId: string;
  role: BuddyRole;
  title: string;
  messages: StoredMessage[];
  context: ConversationContext;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
  feedback?: MessageFeedback;
}

export interface MessageMetadata {
  curriculumCodes?: string[];
  resourcesReferenced?: string[];
  learningObjectives?: string[];
  suggestedActions?: SuggestedAction[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'confused' | 'frustrated';
  topics?: string[];
}

export interface MessageFeedback {
  helpful: boolean;
  rating?: number;
  comment?: string;
  timestamp: Date;
}

export interface SuggestedAction {
  type: 'resource' | 'practice' | 'review' | 'ask_teacher' | 'take_break';
  title: string;
  description: string;
  link?: string;
}

export interface ConversationContext {
  yearLevel?: string;
  subjects?: string[];
  currentTopic?: string;
  currentLesson?: string;
  currentAssignment?: string;
  learningGoals?: string[];
  recentActivity?: ActivityItem[];
  mood?: 'focused' | 'tired' | 'confused' | 'excited' | 'frustrated';
}

export interface ActivityItem {
  type: string;
  description: string;
  timestamp: Date;
  outcome?: string;
}

export interface LearnerProfile {
  userId: string;
  yearLevel: string;
  subjects: string[];
  strengths: string[];
  areasForGrowth: string[];
  preferredLearningStyles: string[];
  pace: 'slower' | 'standard' | 'accelerated';
  interests: string[];
  accommodations?: string[];
}

export interface BuddySettings {
  userId: string;
  responseStyle: 'encouraging' | 'direct' | 'socratic' | 'playful';
  verbosityLevel: 'concise' | 'detailed' | 'comprehensive';
  useEmojis: boolean;
  includeExamples: boolean;
  provideChallenges: boolean;
  reminderFrequency: 'none' | 'daily' | 'weekly';
  parentNotifications: boolean;
}

export interface SendMessageRequest {
  conversationId?: string;
  message: string;
  context?: Partial<ConversationContext>;
  attachments?: { type: string; content: string }[];
}

export interface SendMessageResponse {
  conversationId: string;
  message: AIBuddyMessage;
  suggestedActions?: SuggestedAction[];
  relatedResources?: { title: string; url: string; type: string }[];
  learningInsight?: string;
}

// ============================================================================
// SAFETY PROMPTS
// ============================================================================

const SAFETY_GUIDELINES = `
IMPORTANT SAFETY GUIDELINES:
1. Never provide personal advice on health, legal, or financial matters - redirect to appropriate adults
2. If a student mentions self-harm, bullying, or abuse, express care and encourage speaking to a trusted adult
3. Keep all content age-appropriate for the student's year level
4. Never share personal information or encourage sharing it
5. Redirect off-topic conversations back to learning in a gentle, engaging way
6. If unsure about content appropriateness, err on the side of caution
7. Never pretend to be human or claim capabilities you don't have
8. Encourage breaks and healthy study habits
`;

const ROLE_PROMPTS: Record<BuddyRole, string> = {
  student: `You are Scholar, a friendly and encouraging AI learning buddy. Your role is to:
- Help students understand concepts without giving away answers
- Use Socratic questioning to guide discovery
- Celebrate effort and progress, not just results
- Make learning engaging and relevant
- Adapt explanations to the student's level
- Encourage growth mindset and resilience
- Know when to suggest asking a teacher or taking a break

Communication style:
- Warm, supportive, and patient
- Use age-appropriate language
- Include relatable examples
- Ask clarifying questions
- Break complex topics into manageable pieces
${SAFETY_GUIDELINES}`,

  teacher: `You are an expert educational AI assistant for teachers. Your role is to:
- Provide evidence-based teaching strategies
- Help with curriculum alignment and lesson planning
- Suggest differentiation approaches
- Offer assessment and feedback ideas
- Share classroom management techniques
- Support professional growth
- Reference educational research when relevant

Communication style:
- Professional and knowledgeable
- Practical and actionable
- Respectful of teacher expertise
- Focused on student outcomes
- Evidence-based recommendations`,

  parent: `You are a supportive AI assistant helping parents support their child's education. Your role is to:
- Explain educational concepts and curriculum
- Suggest ways to support learning at home
- Provide context on teaching methods
- Offer encouragement and perspective
- Help understand student progress
- Suggest when to contact teachers

Communication style:
- Warm and reassuring
- Non-judgmental
- Practical suggestions
- Clear explanations without jargon
- Focus on partnership with school`
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class AIBuddyService extends ScholarlyBaseService {
  private aiService: AIIntegrationService;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
  }) {
    super('AIBuddyService', deps);
    this.aiService = getAIService();
  }

  // ==========================================================================
  // CONVERSATION MANAGEMENT
  // ==========================================================================

  /**
   * Start a new conversation
   */
  async startConversation(
    tenantId: string,
    userId: string,
    role: BuddyRole,
    initialContext?: Partial<ConversationContext>
  ): Promise<Result<Conversation>> {
    try {
      const profile = await this.getLearnerProfile(tenantId, userId);
      const settings = await this.getBuddySettings(tenantId, userId);

      const conversation: Conversation = {
        id: this.generateId('conv'),
        tenantId,
        userId,
        role,
        title: this.generateConversationTitle(initialContext),
        messages: [],
        context: {
          yearLevel: profile?.yearLevel,
          subjects: profile?.subjects,
          ...initialContext,
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
      };

      // Add system message with context
      const systemMessage: StoredMessage = {
        id: this.generateId('msg'),
        role: 'system',
        content: this.buildSystemPrompt(role, profile, settings, initialContext),
        timestamp: new Date(),
      };
      conversation.messages.push(systemMessage);

      // Store conversation
      await this.saveConversation(tenantId, conversation);

      await this.publishEvent('scholarly.ai_buddy.conversation_started', tenantId, {
        conversationId: conversation.id,
        userId,
        role,
      });

      return success(conversation);
    } catch (error) {
      log.error('Failed to start conversation', error as Error);
      return failure(new ValidationError('Failed to start conversation'));
    }
  }

  /**
   * Send a message and get a response
   */
  async sendMessage(
    tenantId: string,
    userId: string,
    role: BuddyRole,
    request: SendMessageRequest
  ): Promise<Result<SendMessageResponse>> {
    try {
      // Get or create conversation
      let conversation: Conversation;
      if (request.conversationId) {
        const existing = await this.getConversation(tenantId, request.conversationId);
        if (!existing) {
          return failure(new NotFoundError('Conversation', request.conversationId));
        }
        if (existing.userId !== userId) {
          return failure(new ValidationError('Conversation does not belong to user'));
        }
        conversation = existing;
      } else {
        const newConv = await this.startConversation(tenantId, userId, role, request.context);
        if (!newConv.success) return newConv as Result<SendMessageResponse>;
        conversation = newConv.data;
      }

      // Update context if provided
      if (request.context) {
        conversation.context = { ...conversation.context, ...request.context };
      }

      // Analyze user message sentiment and topics
      const messageAnalysis = await this.analyzeMessage(tenantId, request.message, conversation.context);

      // Add user message
      const userMessage: StoredMessage = {
        id: this.generateId('msg'),
        role: 'user',
        content: request.message,
        timestamp: new Date(),
        metadata: {
          sentiment: messageAnalysis.sentiment,
          topics: messageAnalysis.topics,
        },
      };
      conversation.messages.push(userMessage);

      // Check for safety concerns
      const safetyCheck = await this.performSafetyCheck(request.message, role);
      if (safetyCheck.intervention) {
        const safetyMessage = await this.handleSafetyConcern(
          tenantId,
          userId,
          safetyCheck,
          conversation
        );
        return success(safetyMessage);
      }

      // Get learner profile for context
      const profile = await this.getLearnerProfile(tenantId, userId);
      const settings = await this.getBuddySettings(tenantId, userId);

      // Build AI context
      const aiContext: AIBuddyContext = {
        userId,
        userRole: role,
        yearLevel: conversation.context.yearLevel,
        subjects: conversation.context.subjects,
        learningProfile: profile ? {
          strengths: profile.strengths,
          areasForGrowth: profile.areasForGrowth,
          preferredLearningStyles: profile.preferredLearningStyles,
          pace: profile.pace,
        } : undefined,
        currentGoals: conversation.context.learningGoals,
        recentActivity: conversation.context.recentActivity?.map(a => a.description),
      };

      // Get AI response based on role
      const aiMessages = conversation.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp,
        }));

      let aiResponse: Result<AIBuddyMessage>;
      if (role === 'student') {
        aiResponse = await this.aiService.aiBuddyStudent(
          tenantId,
          request.message,
          aiContext,
          aiMessages
        );
      } else {
        aiResponse = await this.aiService.aiBuddyTeacher(
          tenantId,
          request.message,
          aiContext,
          aiMessages
        );
      }

      if (!aiResponse.success) {
        return aiResponse as Result<SendMessageResponse>;
      }

      // Post-process response based on settings
      let responseContent = aiResponse.data.content;
      if (settings) {
        responseContent = this.applySettings(responseContent, settings);
      }

      // Generate suggested actions
      const suggestedActions = await this.generateSuggestedActions(
        tenantId,
        request.message,
        responseContent,
        conversation.context,
        role
      );

      // Find related resources
      const relatedResources = await this.findRelatedResources(
        tenantId,
        messageAnalysis.topics,
        conversation.context
      );

      // Generate learning insight if appropriate
      const learningInsight = await this.generateLearningInsight(
        tenantId,
        conversation,
        request.message,
        responseContent
      );

      // Add assistant message
      const assistantMessage: StoredMessage = {
        id: this.generateId('msg'),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        metadata: {
          suggestedActions,
          topics: messageAnalysis.topics,
        },
      };
      conversation.messages.push(assistantMessage);
      conversation.lastMessageAt = new Date();
      conversation.updatedAt = new Date();

      // Update conversation title if this is early in the conversation
      if (conversation.messages.length <= 4) {
        conversation.title = await this.generateTitleFromContent(
          tenantId,
          conversation.messages
        );
      }

      // Save updated conversation
      await this.saveConversation(tenantId, conversation);

      // Track analytics
      await this.publishEvent('scholarly.ai_buddy.message_sent', tenantId, {
        conversationId: conversation.id,
        userId,
        role,
        messageLength: request.message.length,
        responseLength: responseContent.length,
        topics: messageAnalysis.topics,
      });

      return success({
        conversationId: conversation.id,
        message: {
          role: 'assistant' as const,
          content: responseContent,
          timestamp: new Date(),
          metadata: {
            suggestedActions,
          },
        } as AIBuddyMessage,
        suggestedActions,
        relatedResources,
        learningInsight,
      });
    } catch (error) {
      log.error('Failed to send message', error as Error);
      return failure(new ValidationError('Failed to process message'));
    }
  }

  /**
   * Get conversation history
   */
  async getConversation(
    tenantId: string,
    conversationId: string
  ): Promise<Conversation | null> {
    const cached = await this.getCached<Conversation>(tenantId, `conversation:${conversationId}`);
    if (cached) return cached;

    // In production, fetch from database
    const conversation = await prisma.aIBuddyConversation.findUnique({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) return null;

    const parsed: Conversation = {
      id: conversation.id,
      tenantId: conversation.tenantId,
      userId: conversation.userId,
      role: conversation.role as BuddyRole,
      title: conversation.title,
      messages: conversation.messages as unknown as StoredMessage[],
      context: conversation.context as unknown as ConversationContext,
      status: conversation.status as 'active' | 'archived',
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
    };

    await this.setCached(tenantId, `conversation:${conversationId}`, parsed, 3600);
    return parsed;
  }

  /**
   * List user's conversations
   */
  async listConversations(
    tenantId: string,
    userId: string,
    options?: {
      role?: BuddyRole;
      status?: 'active' | 'archived';
      limit?: number;
      offset?: number;
    }
  ): Promise<Result<{ conversations: Conversation[]; total: number }>> {
    try {
      const where: Record<string, unknown> = { tenantId, userId };
      if (options?.role) where.role = options.role;
      if (options?.status) where.status = options.status;

      const [conversations, total] = await Promise.all([
        prisma.aIBuddyConversation.findMany({
          where,
          orderBy: { lastMessageAt: 'desc' },
          take: options?.limit || 20,
          skip: options?.offset || 0,
        }),
        prisma.aIBuddyConversation.count({ where }),
      ]);

      return success({
        conversations: conversations.map(c => ({
          id: c.id,
          tenantId: c.tenantId,
          userId: c.userId,
          role: c.role as BuddyRole,
          title: c.title,
          messages: c.messages as unknown as StoredMessage[],
          context: c.context as unknown as ConversationContext,
          status: c.status as 'active' | 'archived',
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          lastMessageAt: c.lastMessageAt,
        })),
        total,
      });
    } catch (error) {
      log.error('Failed to list conversations', error as Error);
      return failure(new ValidationError('Failed to list conversations'));
    }
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(
    tenantId: string,
    userId: string,
    conversationId: string
  ): Promise<Result<void>> {
    try {
      await prisma.aIBuddyConversation.update({
        where: { id: conversationId, tenantId, userId },
        data: { status: 'archived', updatedAt: new Date() },
      });

      await this.clearCached(tenantId, `conversation:${conversationId}`);
      return success(undefined);
    } catch (error) {
      return failure(new ValidationError('Failed to archive conversation'));
    }
  }

  /**
   * Provide feedback on a message
   */
  async provideFeedback(
    tenantId: string,
    userId: string,
    conversationId: string,
    messageId: string,
    feedback: { helpful: boolean; rating?: number; comment?: string }
  ): Promise<Result<void>> {
    try {
      const conversation = await this.getConversation(tenantId, conversationId);
      if (!conversation || conversation.userId !== userId) {
        return failure(new NotFoundError('Conversation', conversationId));
      }

      const message = conversation.messages.find(m => m.id === messageId);
      if (!message) {
        return failure(new NotFoundError('Message', messageId));
      }

      message.feedback = {
        helpful: feedback.helpful,
        rating: feedback.rating,
        comment: feedback.comment,
        timestamp: new Date(),
      };

      await this.saveConversation(tenantId, conversation);

      await this.publishEvent('scholarly.ai_buddy.feedback_received', tenantId, {
        conversationId,
        messageId,
        helpful: feedback.helpful,
        rating: feedback.rating,
      });

      return success(undefined);
    } catch (error) {
      return failure(new ValidationError('Failed to save feedback'));
    }
  }

  // ==========================================================================
  // PROFILE AND SETTINGS
  // ==========================================================================

  /**
   * Get learner profile for personalization
   */
  async getLearnerProfile(
    tenantId: string,
    userId: string
  ): Promise<LearnerProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId, tenantId },
      include: {
        learnerProfile: true,
      },
    });

    if (!user?.learnerProfile) return null;

    const profile = user.learnerProfile as any;
    return {
      userId,
      yearLevel: profile.yearLevel || '',
      subjects: profile.subjects || [],
      strengths: profile.strengths || [],
      areasForGrowth: profile.areasForGrowth || [],
      preferredLearningStyles: profile.learningStyles || [],
      pace: profile.pace || 'standard',
      interests: profile.interests || [],
      accommodations: profile.accommodations || undefined,
    };
  }

  /**
   * Get buddy settings for user
   */
  async getBuddySettings(
    tenantId: string,
    userId: string
  ): Promise<BuddySettings | null> {
    const settings = await prisma.aIBuddySettings.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!settings) return null;

    return {
      userId,
      responseStyle: settings.responseStyle as BuddySettings['responseStyle'],
      verbosityLevel: settings.verbosityLevel as BuddySettings['verbosityLevel'],
      useEmojis: settings.useEmojis,
      includeExamples: settings.includeExamples,
      provideChallenges: settings.provideChallenges,
      reminderFrequency: settings.reminderFrequency as BuddySettings['reminderFrequency'],
      parentNotifications: settings.parentNotifications,
    };
  }

  /**
   * Update buddy settings
   */
  async updateBuddySettings(
    tenantId: string,
    userId: string,
    updates: Partial<BuddySettings>
  ): Promise<Result<BuddySettings>> {
    try {
      const settings = await prisma.aIBuddySettings.upsert({
        where: { userId_tenantId: { userId, tenantId } },
        create: {
          userId,
          tenantId,
          responseStyle: updates.responseStyle || 'encouraging',
          verbosityLevel: updates.verbosityLevel || 'concise',
          useEmojis: updates.useEmojis ?? true,
          includeExamples: updates.includeExamples ?? true,
          provideChallenges: updates.provideChallenges ?? true,
          reminderFrequency: updates.reminderFrequency || 'none',
          parentNotifications: updates.parentNotifications ?? false,
        },
        update: updates,
      });

      return success({
        userId,
        responseStyle: settings.responseStyle as BuddySettings['responseStyle'],
        verbosityLevel: settings.verbosityLevel as BuddySettings['verbosityLevel'],
        useEmojis: settings.useEmojis,
        includeExamples: settings.includeExamples,
        provideChallenges: settings.provideChallenges,
        reminderFrequency: settings.reminderFrequency as BuddySettings['reminderFrequency'],
        parentNotifications: settings.parentNotifications,
      });
    } catch (error) {
      return failure(new ValidationError('Failed to update settings'));
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private buildSystemPrompt(
    role: BuddyRole,
    profile: LearnerProfile | null,
    settings: BuddySettings | null,
    context?: Partial<ConversationContext>
  ): string {
    let prompt = ROLE_PROMPTS[role];

    if (profile) {
      prompt += `\n\nLearner Profile:
- Year Level: ${profile.yearLevel}
- Subjects: ${profile.subjects.join(', ')}
- Strengths: ${profile.strengths.join(', ')}
- Areas for Growth: ${profile.areasForGrowth.join(', ')}
- Learning Styles: ${profile.preferredLearningStyles.join(', ')}
- Pace: ${profile.pace}
- Interests: ${profile.interests.join(', ')}`;

      if (profile.accommodations?.length) {
        prompt += `\n- Accommodations: ${profile.accommodations.join(', ')}`;
      }
    }

    if (settings) {
      prompt += `\n\nResponse Preferences:
- Style: ${settings.responseStyle}
- Verbosity: ${settings.verbosityLevel}
- Include emojis: ${settings.useEmojis}
- Include examples: ${settings.includeExamples}
- Provide challenges: ${settings.provideChallenges}`;
    }

    if (context) {
      if (context.currentTopic) {
        prompt += `\n\nCurrent Topic: ${context.currentTopic}`;
      }
      if (context.currentLesson) {
        prompt += `\nCurrent Lesson: ${context.currentLesson}`;
      }
      if (context.learningGoals?.length) {
        prompt += `\nLearning Goals: ${context.learningGoals.join(', ')}`;
      }
    }

    return prompt;
  }

  private async analyzeMessage(
    tenantId: string,
    message: string,
    context: ConversationContext
  ): Promise<{ sentiment: StoredMessage['metadata']['sentiment']; topics: string[] }> {
    // Quick pattern matching for common sentiments
    const lowerMessage = message.toLowerCase();

    let sentiment: StoredMessage['metadata']['sentiment'] = 'neutral';
    if (lowerMessage.includes('don\'t understand') || lowerMessage.includes('confused') || lowerMessage.includes('?')) {
      sentiment = 'confused';
    } else if (lowerMessage.includes('frustrated') || lowerMessage.includes('hate') || lowerMessage.includes('can\'t')) {
      sentiment = 'frustrated';
    } else if (lowerMessage.includes('thanks') || lowerMessage.includes('got it') || lowerMessage.includes('makes sense')) {
      sentiment = 'positive';
    }

    // Extract topics from message
    const topics: string[] = [];
    if (context.subjects) {
      for (const subject of context.subjects) {
        if (lowerMessage.includes(subject.toLowerCase())) {
          topics.push(subject);
        }
      }
    }

    // Common educational topics
    const commonTopics = [
      'homework', 'assignment', 'test', 'exam', 'project',
      'math', 'science', 'english', 'history', 'reading', 'writing',
      'algebra', 'geometry', 'fractions', 'multiplication'
    ];
    for (const topic of commonTopics) {
      if (lowerMessage.includes(topic) && !topics.includes(topic)) {
        topics.push(topic);
      }
    }

    return { sentiment, topics };
  }

  private async performSafetyCheck(
    message: string,
    role: BuddyRole
  ): Promise<{ intervention: boolean; type?: string; response?: string }> {
    const lowerMessage = message.toLowerCase();

    // Check for concerning content
    const concernPatterns = [
      { pattern: /\b(hurt|harm|kill)\s*(myself|self)\b/i, type: 'self_harm' },
      { pattern: /\b(bully|bullied|bullying)\b/i, type: 'bullying' },
      { pattern: /\b(abuse|abused|hitting me)\b/i, type: 'abuse' },
      { pattern: /\b(drugs|alcohol|drinking)\b/i, type: 'substances' },
    ];

    for (const { pattern, type } of concernPatterns) {
      if (pattern.test(message)) {
        return {
          intervention: true,
          type,
          response: this.getSafetyResponse(type, role),
        };
      }
    }

    // Check for off-topic adult content
    const inappropriatePatterns = [
      /\b(gambling|betting)\b/i,
      /\b(weapon|gun|knife)\b/i,
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(message)) {
        return {
          intervention: true,
          type: 'inappropriate',
          response: "I'm here to help with learning! Let's focus on your studies. What subject would you like to work on?",
        };
      }
    }

    return { intervention: false };
  }

  private getSafetyResponse(type: string, role: BuddyRole): string {
    const responses: Record<string, string> = {
      self_harm: "I hear that you're going through a difficult time. Your feelings matter, and it's important to talk to someone who can help. Please reach out to a trusted adult like a parent, teacher, or school counselor. If you're in crisis, please contact a helpline in your country. You're not alone, and there are people who care about you and want to help.",
      bullying: "I'm sorry to hear you might be experiencing bullying. That's not okay, and you deserve to feel safe. Please talk to a trusted adult like a parent, teacher, or school counselor about what's happening. They can help make things better. Would you like to talk about some coping strategies in the meantime?",
      abuse: "What you've shared sounds serious, and I want you to know that your safety matters. Please talk to a trusted adult like a teacher, school counselor, or another family member about what's happening. There are people who can help keep you safe.",
      substances: "These are important topics that are best discussed with a trusted adult like a parent, teacher, or school counselor. They can give you accurate information and support. Is there something related to your schoolwork I can help with?",
    };

    return responses[type] || "I think this is something you should discuss with a trusted adult. Is there something related to your learning I can help with?";
  }

  private async handleSafetyConcern(
    tenantId: string,
    userId: string,
    safetyCheck: { type?: string; response?: string },
    conversation: Conversation
  ): Promise<SendMessageResponse> {
    // Log safety concern (for review, not shared with parents without proper protocols)
    await this.publishEvent('scholarly.ai_buddy.safety_concern', tenantId, {
      conversationId: conversation.id,
      userId,
      type: safetyCheck.type,
      // Don't log message content for privacy
    });

    const assistantMessage: StoredMessage = {
      id: this.generateId('msg'),
      role: 'assistant',
      content: safetyCheck.response || "Let's focus on your learning. What would you like to work on?",
      timestamp: new Date(),
      metadata: {
        suggestedActions: [{
          type: 'ask_teacher',
          title: 'Talk to a trusted adult',
          description: 'Some things are best discussed with a parent, teacher, or counselor',
        }],
      },
    };

    conversation.messages.push(assistantMessage);
    await this.saveConversation(tenantId, conversation);

    return {
      conversationId: conversation.id,
      message: {
        role: 'assistant',
        content: assistantMessage.content,
        timestamp: assistantMessage.timestamp,
      },
    };
  }

  private applySettings(content: string, settings: BuddySettings): string {
    let processed = content;

    // Adjust verbosity
    if (settings.verbosityLevel === 'concise' && processed.length > 500) {
      // Try to find a natural break point
      const sentences = processed.split(/(?<=[.!?])\s+/);
      if (sentences.length > 3) {
        processed = sentences.slice(0, 3).join(' ');
        if (!processed.endsWith('.') && !processed.endsWith('!') && !processed.endsWith('?')) {
          processed += '...';
        }
      }
    }

    // Remove or add emojis based on preference
    if (!settings.useEmojis) {
      processed = processed.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
    }

    return processed.trim();
  }

  private async generateSuggestedActions(
    tenantId: string,
    userMessage: string,
    response: string,
    context: ConversationContext,
    role: BuddyRole
  ): Promise<SuggestedAction[]> {
    const actions: SuggestedAction[] = [];
    const lowerMessage = userMessage.toLowerCase();

    // Context-based suggestions
    if (lowerMessage.includes('practice') || lowerMessage.includes('more examples')) {
      actions.push({
        type: 'practice',
        title: 'Practice problems',
        description: 'Try some practice exercises to reinforce this concept',
      });
    }

    if (lowerMessage.includes('still confused') || lowerMessage.includes('don\'t get it')) {
      actions.push({
        type: 'resource',
        title: 'Watch a video',
        description: 'Sometimes a different explanation helps. Try watching a video on this topic.',
      });
      actions.push({
        type: 'ask_teacher',
        title: 'Ask your teacher',
        description: 'Your teacher can explain this in class or during office hours.',
      });
    }

    if (context.recentActivity && context.recentActivity.length > 5) {
      actions.push({
        type: 'take_break',
        title: 'Take a short break',
        description: "You've been working hard! A 5-minute break can help you stay focused.",
      });
    }

    // Always limit to top 3 most relevant
    return actions.slice(0, 3);
  }

  private async findRelatedResources(
    _tenantId: string,
    topics: string[],
    _context: ConversationContext
  ): Promise<{ title: string; url: string; type: string }[]> {
    if (topics.length === 0) return [];

    // TODO: In production, query content library when ContentResource model is available
    // For now, return empty array as placeholder
    return [];
  }

  private async generateLearningInsight(
    tenantId: string,
    conversation: Conversation,
    userMessage: string,
    response: string
  ): Promise<string | undefined> {
    // Generate insights after every 5 messages
    if (conversation.messages.length % 5 !== 0) return undefined;

    // Simple pattern-based insights
    const recentMessages = conversation.messages.slice(-5);
    const topics = new Set<string>();
    for (const msg of recentMessages) {
      if (msg.metadata?.topics) {
        msg.metadata.topics.forEach(t => topics.add(t));
      }
    }

    if (topics.size > 0) {
      return `You've been exploring ${Array.from(topics).join(', ')}. Great progress!`;
    }

    return undefined;
  }

  private generateConversationTitle(context?: Partial<ConversationContext>): string {
    if (context?.currentTopic) {
      return `Help with ${context.currentTopic}`;
    }
    if (context?.currentLesson) {
      return context.currentLesson;
    }
    if (context?.subjects?.length) {
      return `${context.subjects[0]} chat`;
    }
    return 'New conversation';
  }

  private async generateTitleFromContent(
    tenantId: string,
    messages: StoredMessage[]
  ): Promise<string> {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return 'New conversation';

    const firstMessage = userMessages[0].content;
    // Extract first meaningful phrase
    const words = firstMessage.split(' ').slice(0, 6);
    let title = words.join(' ');
    if (firstMessage.length > title.length) {
      title += '...';
    }
    return title;
  }

  private async saveConversation(tenantId: string, conversation: Conversation): Promise<void> {
    await prisma.aIBuddyConversation.upsert({
      where: { id: conversation.id },
      create: {
        id: conversation.id,
        tenantId: conversation.tenantId,
        userId: conversation.userId,
        role: conversation.role,
        title: conversation.title,
        messages: conversation.messages as unknown as [],
        context: conversation.context as unknown as Record<string, unknown>,
        status: conversation.status,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        lastMessageAt: conversation.lastMessageAt,
      },
      update: {
        title: conversation.title,
        messages: conversation.messages as unknown as [],
        context: conversation.context as unknown as Record<string, unknown>,
        status: conversation.status,
        updatedAt: conversation.updatedAt,
        lastMessageAt: conversation.lastMessageAt,
      },
    });

    await this.setCached(tenantId, `conversation:${conversation.id}`, conversation, 3600);
  }

  private async getCached<T>(tenantId: string, key: string): Promise<T | null> {
    return null; // Implementation uses cache service
  }

  private async setCached<T>(tenantId: string, key: string, value: T, ttl: number): Promise<void> {
    // Implementation uses cache service
  }

  private async clearCached(tenantId: string, key: string): Promise<void> {
    // Implementation uses cache service
  }
}

// Export singleton
let buddyServiceInstance: AIBuddyService | null = null;

export function getAIBuddyService(): AIBuddyService {
  if (!buddyServiceInstance) {
    throw new Error('AI Buddy Service not initialized');
  }
  return buddyServiceInstance;
}

export function initializeAIBuddyService(deps: {
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
}): AIBuddyService {
  buddyServiceInstance = new AIBuddyService(deps);
  return buddyServiceInstance;
}

export { AIBuddyService as default };
