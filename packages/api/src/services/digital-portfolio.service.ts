/**
 * Digital Portfolio Service
 *
 * Manages student digital portfolios with AI-powered learning journey creation.
 * Enables students to document, reflect on, and showcase their learning.
 *
 * Features:
 * - Learning artifact management
 * - AI-guided reflection
 * - Learning journey visualization
 * - Goal setting and tracking
 * - Curriculum alignment
 * - Sharing with parents/teachers
 * - Achievement badges
 * - Growth tracking over time
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
import { AIIntegrationService, getAIService } from './ai-integration.service';

// ============================================================================
// TYPES
// ============================================================================

export interface Portfolio {
  id: string;
  tenantId: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  visibility: 'private' | 'parents' | 'teachers' | 'public';
  theme: PortfolioTheme;
  sections: PortfolioSection[];
  goals: LearningGoal[];
  achievements: Achievement[];
  stats: PortfolioStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioTheme {
  primaryColor: string;
  accentColor: string;
  layout: 'grid' | 'timeline' | 'masonry';
  fontFamily: string;
}

export interface PortfolioSection {
  id: string;
  name: string;
  description?: string;
  type: 'subject' | 'project' | 'achievement' | 'reflection' | 'custom';
  order: number;
  isVisible: boolean;
  artifactIds: string[];
}

export interface Artifact {
  id: string;
  portfolioId: string;
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  type: ArtifactType;
  content: ArtifactContent;
  metadata: ArtifactMetadata;
  reflection?: ArtifactReflection;
  curriculumAlignment?: CurriculumAlignment[];
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  visibility: 'private' | 'portfolio' | 'shared';
  feedback: ArtifactFeedback[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export type ArtifactType =
  | 'document'
  | 'image'
  | 'video'
  | 'audio'
  | 'presentation'
  | 'code'
  | 'project'
  | 'assessment'
  | 'certificate'
  | 'badge'
  | 'reflection'
  | 'goal'
  | 'link';

export interface ArtifactContent {
  url?: string;
  text?: string;
  embedCode?: string;
  fileSize?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface ArtifactMetadata {
  subject?: string;
  yearLevel?: string;
  createdDate: Date;
  source?: 'upload' | 'assignment' | 'ai_generated' | 'external';
  assignmentId?: string;
  lessonId?: string;
  originalFileName?: string;
  collaborators?: string[];
}

export interface ArtifactReflection {
  whatILearned: string;
  challengesFaced: string;
  howIOvercame: string;
  connectionsToPrior: string;
  nextSteps: string;
  selfRating?: number;
  aiSuggestions?: string[];
  teacherFeedback?: string;
  reflectedAt: Date;
}

export interface CurriculumAlignment {
  code: string;
  framework: string;
  description: string;
  alignmentStrength: 'strong' | 'moderate' | 'partial';
  aiGenerated: boolean;
  verified: boolean;
}

export interface ArtifactFeedback {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserRole: 'teacher' | 'parent' | 'peer';
  content: string;
  rating?: number;
  createdAt: Date;
}

export interface LearningGoal {
  id: string;
  portfolioId: string;
  title: string;
  description: string;
  category: 'academic' | 'skill' | 'personal' | 'project';
  subject?: string;
  targetDate?: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  progress: number;
  milestones: GoalMilestone[];
  relatedArtifacts: string[];
  curriculumCodes?: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface GoalMilestone {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: Date;
  evidence?: string;
}

export interface Achievement {
  id: string;
  portfolioId: string;
  type: 'badge' | 'certificate' | 'award' | 'milestone';
  title: string;
  description: string;
  imageUrl: string;
  earnedAt: Date;
  issuedBy: string;
  criteria: string;
  evidence?: string[];
  blockchain?: {
    tokenId: string;
    contractAddress: string;
    txHash: string;
  };
}

export interface PortfolioStats {
  totalArtifacts: number;
  artifactsByType: Record<string, number>;
  artifactsBySubject: Record<string, number>;
  totalReflections: number;
  goalsCompleted: number;
  goalsInProgress: number;
  achievementsEarned: number;
  streakDays: number;
  lastActivityAt: Date;
}

export interface LearningJourney {
  id: string;
  portfolioId: string;
  title: string;
  description: string;
  subject?: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'paused';
  path: JourneyNode[];
  currentNode: string;
  aiRecommendations?: JourneyRecommendation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface JourneyNode {
  id: string;
  type: 'start' | 'milestone' | 'artifact' | 'goal' | 'reflection' | 'end';
  title: string;
  description?: string;
  linkedId?: string;
  curriculumCodes?: string[];
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  order: number;
  completedAt?: Date;
  nextNodes: string[];
}

export interface JourneyRecommendation {
  type: 'next_step' | 'resource' | 'challenge' | 'review';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  linkedResource?: { type: string; id: string };
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class DigitalPortfolioService extends ScholarlyBaseService {
  private aiService: AIIntegrationService;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
  }) {
    super('DigitalPortfolioService', deps);
    this.aiService = getAIService();
  }

  // ==========================================================================
  // PORTFOLIO MANAGEMENT
  // ==========================================================================

  /**
   * Create a new portfolio for a user
   */
  async createPortfolio(
    tenantId: string,
    userId: string,
    data: {
      displayName: string;
      bio?: string;
      visibility?: Portfolio['visibility'];
      theme?: Partial<PortfolioTheme>;
    }
  ): Promise<Result<Portfolio>> {
    try {
      // Check if portfolio already exists
      const existing = await prisma.portfolio.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
      });

      if (existing) {
        return failure(new ValidationError('Portfolio already exists for this user'));
      }

      const defaultTheme: PortfolioTheme = {
        primaryColor: '#4F46E5',
        accentColor: '#10B981',
        layout: 'grid',
        fontFamily: 'Inter',
        ...data.theme,
      };

      const portfolio: Portfolio = {
        id: this.generateId('portfolio'),
        tenantId,
        userId,
        displayName: data.displayName,
        bio: data.bio,
        visibility: data.visibility || 'private',
        theme: defaultTheme,
        sections: this.createDefaultSections(),
        goals: [],
        achievements: [],
        stats: {
          totalArtifacts: 0,
          artifactsByType: {},
          artifactsBySubject: {},
          totalReflections: 0,
          goalsCompleted: 0,
          goalsInProgress: 0,
          achievementsEarned: 0,
          streakDays: 0,
          lastActivityAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await prisma.portfolio.create({
        data: {
          id: portfolio.id,
          tenantId,
          userId,
          displayName: portfolio.displayName,
          bio: portfolio.bio,
          visibility: portfolio.visibility,
          theme: portfolio.theme as unknown as Record<string, unknown>,
          sections: portfolio.sections as unknown as [],
          stats: portfolio.stats as unknown as Record<string, unknown>,
          createdAt: portfolio.createdAt,
          updatedAt: portfolio.updatedAt,
        },
      });

      await this.publishEvent('scholarly.portfolio.created', tenantId, {
        portfolioId: portfolio.id,
        userId,
      });

      return success(portfolio);
    } catch (error) {
      this.logError('Failed to create portfolio', error as Error);
      return failure(new ValidationError('Failed to create portfolio'));
    }
  }

  /**
   * Get portfolio by user ID
   */
  async getPortfolio(
    tenantId: string,
    userId: string
  ): Promise<Result<Portfolio>> {
    try {
      const portfolio = await prisma.portfolio.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
        include: {
          goals: true,
          achievements: true,
        },
      });

      if (!portfolio) {
        return failure(new NotFoundError('Portfolio', userId));
      }

      return success({
        id: portfolio.id,
        tenantId: portfolio.tenantId,
        userId: portfolio.userId,
        displayName: portfolio.displayName,
        bio: portfolio.bio || undefined,
        avatarUrl: portfolio.avatarUrl || undefined,
        coverImageUrl: portfolio.coverImageUrl || undefined,
        visibility: portfolio.visibility as Portfolio['visibility'],
        theme: portfolio.theme as unknown as PortfolioTheme,
        sections: portfolio.sections as unknown as PortfolioSection[],
        goals: portfolio.goals.map(g => this.mapGoal(g)),
        achievements: portfolio.achievements.map(a => this.mapAchievement(a)),
        stats: portfolio.stats as unknown as PortfolioStats,
        createdAt: portfolio.createdAt,
        updatedAt: portfolio.updatedAt,
      });
    } catch (error) {
      this.logError('Failed to get portfolio', error as Error);
      return failure(new ValidationError('Failed to get portfolio'));
    }
  }

  /**
   * Update portfolio settings
   */
  async updatePortfolio(
    tenantId: string,
    userId: string,
    updates: Partial<Pick<Portfolio, 'displayName' | 'bio' | 'visibility' | 'theme' | 'sections'>>
  ): Promise<Result<Portfolio>> {
    try {
      const existing = await prisma.portfolio.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
      });

      if (!existing) {
        return failure(new NotFoundError('Portfolio', userId));
      }

      await prisma.portfolio.update({
        where: { id: existing.id },
        data: {
          displayName: updates.displayName,
          bio: updates.bio,
          visibility: updates.visibility,
          theme: updates.theme as unknown as Record<string, unknown>,
          sections: updates.sections as unknown as [],
          updatedAt: new Date(),
        },
      });

      return this.getPortfolio(tenantId, userId);
    } catch (error) {
      return failure(new ValidationError('Failed to update portfolio'));
    }
  }

  // ==========================================================================
  // ARTIFACT MANAGEMENT
  // ==========================================================================

  /**
   * Add an artifact to the portfolio
   */
  async addArtifact(
    tenantId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      type: ArtifactType;
      content: ArtifactContent;
      metadata?: Partial<ArtifactMetadata>;
      tags?: string[];
      sectionId?: string;
    }
  ): Promise<Result<Artifact>> {
    try {
      const portfolio = await prisma.portfolio.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
      });

      if (!portfolio) {
        return failure(new NotFoundError('Portfolio', userId));
      }

      const artifact: Artifact = {
        id: this.generateId('artifact'),
        portfolioId: portfolio.id,
        tenantId,
        userId,
        title: data.title,
        description: data.description,
        type: data.type,
        content: data.content,
        metadata: {
          createdDate: new Date(),
          source: 'upload',
          ...data.metadata,
        },
        tags: data.tags || [],
        status: 'draft',
        visibility: 'private',
        feedback: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // AI-powered curriculum alignment
      if (data.description || data.content.text) {
        const alignmentResult = await this.alignArtifactToCurriculum(
          tenantId,
          artifact
        );
        if (alignmentResult.success) {
          artifact.curriculumAlignment = alignmentResult.data;
        }
      }

      await prisma.artifact.create({
        data: {
          id: artifact.id,
          portfolioId: artifact.portfolioId,
          tenantId,
          userId,
          title: artifact.title,
          description: artifact.description,
          type: artifact.type,
          content: artifact.content as unknown as Record<string, unknown>,
          metadata: artifact.metadata as unknown as Record<string, unknown>,
          curriculumAlignment: artifact.curriculumAlignment as unknown as [],
          tags: artifact.tags,
          status: artifact.status,
          visibility: artifact.visibility,
          createdAt: artifact.createdAt,
          updatedAt: artifact.updatedAt,
        },
      });

      // Update portfolio stats
      await this.updatePortfolioStats(tenantId, userId);

      // Add to section if specified
      if (data.sectionId) {
        await this.addArtifactToSection(tenantId, userId, artifact.id, data.sectionId);
      }

      await this.publishEvent('scholarly.portfolio.artifact_added', tenantId, {
        portfolioId: portfolio.id,
        artifactId: artifact.id,
        type: artifact.type,
      });

      return success(artifact);
    } catch (error) {
      this.logError('Failed to add artifact', error as Error);
      return failure(new ValidationError('Failed to add artifact'));
    }
  }

  /**
   * Get artifacts for a portfolio
   */
  async getArtifacts(
    tenantId: string,
    userId: string,
    options?: {
      type?: ArtifactType;
      subject?: string;
      status?: Artifact['status'];
      sectionId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Result<{ artifacts: Artifact[]; total: number }>> {
    try {
      const portfolio = await prisma.portfolio.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
      });

      if (!portfolio) {
        return failure(new NotFoundError('Portfolio', userId));
      }

      const where: Record<string, unknown> = {
        portfolioId: portfolio.id,
        tenantId,
      };

      if (options?.type) where.type = options.type;
      if (options?.status) where.status = options.status;
      if (options?.subject) {
        where.metadata = { path: ['subject'], equals: options.subject };
      }

      const [artifacts, total] = await Promise.all([
        prisma.artifact.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: options?.limit || 20,
          skip: options?.offset || 0,
        }),
        prisma.artifact.count({ where }),
      ]);

      return success({
        artifacts: artifacts.map(a => this.mapArtifact(a)),
        total,
      });
    } catch (error) {
      return failure(new ValidationError('Failed to get artifacts'));
    }
  }

  /**
   * Add reflection to an artifact with AI assistance
   */
  async addReflection(
    tenantId: string,
    userId: string,
    artifactId: string,
    reflection: {
      whatILearned: string;
      challengesFaced: string;
      howIOvercame: string;
      connectionsToPrior: string;
      nextSteps: string;
      selfRating?: number;
    }
  ): Promise<Result<Artifact>> {
    try {
      const artifact = await prisma.artifact.findUnique({
        where: { id: artifactId, tenantId, userId },
      });

      if (!artifact) {
        return failure(new NotFoundError('Artifact', artifactId));
      }

      // Get AI suggestions to enhance reflection
      const aiSuggestions = await this.getReflectionSuggestions(
        tenantId,
        artifact.title,
        artifact.type,
        reflection
      );

      const fullReflection: ArtifactReflection = {
        ...reflection,
        aiSuggestions: aiSuggestions.success ? aiSuggestions.data : undefined,
        reflectedAt: new Date(),
      };

      await prisma.artifact.update({
        where: { id: artifactId },
        data: {
          reflection: fullReflection as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        },
      });

      // Update portfolio stats
      await this.updatePortfolioStats(tenantId, userId);

      // Check for reflection milestones
      await this.checkReflectionMilestones(tenantId, userId);

      const updatedArtifact = await prisma.artifact.findUnique({
        where: { id: artifactId },
      });

      return success(this.mapArtifact(updatedArtifact!));
    } catch (error) {
      return failure(new ValidationError('Failed to add reflection'));
    }
  }

  // ==========================================================================
  // LEARNING JOURNEY
  // ==========================================================================

  /**
   * Create a personalized learning journey
   */
  async createLearningJourney(
    tenantId: string,
    userId: string,
    data: {
      title: string;
      description: string;
      subject?: string;
      goals: string[];
      curriculumCodes?: string[];
    }
  ): Promise<Result<LearningJourney>> {
    try {
      const portfolio = await prisma.portfolio.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
      });

      if (!portfolio) {
        return failure(new NotFoundError('Portfolio', userId));
      }

      // Get AI recommendations for journey structure
      const journeyStructure = await this.generateJourneyStructure(
        tenantId,
        data.subject || 'General',
        data.goals,
        data.curriculumCodes
      );

      if (!journeyStructure.success) {
        return failure(new ValidationError('Failed to generate journey structure'));
      }

      const journey: LearningJourney = {
        id: this.generateId('journey'),
        portfolioId: portfolio.id,
        title: data.title,
        description: data.description,
        subject: data.subject,
        startDate: new Date(),
        status: 'active',
        path: journeyStructure.data.nodes,
        currentNode: journeyStructure.data.nodes[0].id,
        aiRecommendations: journeyStructure.data.recommendations,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await prisma.learningJourney.create({
        data: {
          id: journey.id,
          portfolioId: journey.portfolioId,
          tenantId,
          userId,
          title: journey.title,
          description: journey.description,
          subject: journey.subject,
          startDate: journey.startDate,
          status: journey.status,
          path: journey.path as unknown as [],
          currentNode: journey.currentNode,
          aiRecommendations: journey.aiRecommendations as unknown as [],
          createdAt: journey.createdAt,
          updatedAt: journey.updatedAt,
        },
      });

      await this.publishEvent('scholarly.portfolio.journey_created', tenantId, {
        portfolioId: portfolio.id,
        journeyId: journey.id,
        subject: journey.subject,
      });

      return success(journey);
    } catch (error) {
      this.logError('Failed to create learning journey', error as Error);
      return failure(new ValidationError('Failed to create learning journey'));
    }
  }

  /**
   * Get learning journeys for a user
   */
  async getLearningJourneys(
    tenantId: string,
    userId: string,
    options?: {
      status?: LearningJourney['status'];
      subject?: string;
    }
  ): Promise<Result<LearningJourney[]>> {
    try {
      const portfolio = await prisma.portfolio.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
      });

      if (!portfolio) {
        return failure(new NotFoundError('Portfolio', userId));
      }

      const where: Record<string, unknown> = {
        portfolioId: portfolio.id,
        tenantId,
      };

      if (options?.status) where.status = options.status;
      if (options?.subject) where.subject = options.subject;

      const journeys = await prisma.learningJourney.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
      });

      return success(journeys.map(j => ({
        id: j.id,
        portfolioId: j.portfolioId,
        title: j.title,
        description: j.description,
        subject: j.subject || undefined,
        startDate: j.startDate,
        endDate: j.endDate || undefined,
        status: j.status as LearningJourney['status'],
        path: j.path as unknown as JourneyNode[],
        currentNode: j.currentNode,
        aiRecommendations: j.aiRecommendations as unknown as JourneyRecommendation[],
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })));
    } catch (error) {
      return failure(new ValidationError('Failed to get learning journeys'));
    }
  }

  /**
   * Progress in a learning journey
   */
  async progressJourney(
    tenantId: string,
    userId: string,
    journeyId: string,
    nodeId: string,
    evidence?: {
      artifactId?: string;
      reflection?: string;
    }
  ): Promise<Result<LearningJourney>> {
    try {
      const journey = await prisma.learningJourney.findUnique({
        where: { id: journeyId, tenantId, userId },
      });

      if (!journey) {
        return failure(new NotFoundError('Learning Journey', journeyId));
      }

      const path = journey.path as unknown as JourneyNode[];
      const nodeIndex = path.findIndex(n => n.id === nodeId);

      if (nodeIndex === -1) {
        return failure(new ValidationError('Node not found in journey'));
      }

      const node = path[nodeIndex];
      if (node.status === 'locked') {
        return failure(new ValidationError('Node is locked'));
      }

      // Mark node as completed
      node.status = 'completed';
      node.completedAt = new Date();

      // Unlock next nodes
      for (const nextNodeId of node.nextNodes) {
        const nextNode = path.find(n => n.id === nextNodeId);
        if (nextNode && nextNode.status === 'locked') {
          nextNode.status = 'available';
        }
      }

      // Find next available node
      const nextAvailable = path.find(n => n.status === 'available');
      const currentNode = nextAvailable?.id || node.id;

      // Check if journey is complete
      const allCompleted = path.every(n => n.status === 'completed' || n.type === 'end');
      const status = allCompleted ? 'completed' : 'active';

      // Get AI recommendations for next steps
      const recommendations = await this.getJourneyRecommendations(
        tenantId,
        journey.subject || '',
        path,
        currentNode
      );

      await prisma.learningJourney.update({
        where: { id: journeyId },
        data: {
          path: path as unknown as [],
          currentNode,
          status,
          aiRecommendations: recommendations.success ? recommendations.data as unknown as [] : undefined,
          endDate: status === 'completed' ? new Date() : undefined,
          updatedAt: new Date(),
        },
      });

      // Award achievement if journey completed
      if (status === 'completed') {
        await this.awardJourneyCompletion(tenantId, userId, journey.title);
      }

      const updated = await prisma.learningJourney.findUnique({
        where: { id: journeyId },
      });

      return success({
        id: updated!.id,
        portfolioId: updated!.portfolioId,
        title: updated!.title,
        description: updated!.description,
        subject: updated!.subject || undefined,
        startDate: updated!.startDate,
        endDate: updated!.endDate || undefined,
        status: updated!.status as LearningJourney['status'],
        path: updated!.path as unknown as JourneyNode[],
        currentNode: updated!.currentNode,
        aiRecommendations: updated!.aiRecommendations as unknown as JourneyRecommendation[],
        createdAt: updated!.createdAt,
        updatedAt: updated!.updatedAt,
      });
    } catch (error) {
      return failure(new ValidationError('Failed to progress journey'));
    }
  }

  // ==========================================================================
  // GOALS
  // ==========================================================================

  /**
   * Create a learning goal
   */
  async createGoal(
    tenantId: string,
    userId: string,
    data: {
      title: string;
      description: string;
      category: LearningGoal['category'];
      subject?: string;
      targetDate?: Date;
      milestones?: { title: string }[];
      curriculumCodes?: string[];
    }
  ): Promise<Result<LearningGoal>> {
    try {
      const portfolio = await prisma.portfolio.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
      });

      if (!portfolio) {
        return failure(new NotFoundError('Portfolio', userId));
      }

      const goal: LearningGoal = {
        id: this.generateId('goal'),
        portfolioId: portfolio.id,
        title: data.title,
        description: data.description,
        category: data.category,
        subject: data.subject,
        targetDate: data.targetDate,
        status: 'not_started',
        progress: 0,
        milestones: (data.milestones || []).map(m => ({
          id: this.generateId('milestone'),
          title: m.title,
          isCompleted: false,
        })),
        relatedArtifacts: [],
        curriculumCodes: data.curriculumCodes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await prisma.learningGoal.create({
        data: {
          id: goal.id,
          portfolioId: goal.portfolioId,
          tenantId,
          userId,
          title: goal.title,
          description: goal.description,
          category: goal.category,
          subject: goal.subject,
          targetDate: goal.targetDate,
          status: goal.status,
          progress: goal.progress,
          milestones: goal.milestones as unknown as [],
          relatedArtifacts: goal.relatedArtifacts,
          curriculumCodes: goal.curriculumCodes || [],
          createdAt: goal.createdAt,
          updatedAt: goal.updatedAt,
        },
      });

      // Update portfolio stats
      await this.updatePortfolioStats(tenantId, userId);

      await this.publishEvent('scholarly.portfolio.goal_created', tenantId, {
        portfolioId: portfolio.id,
        goalId: goal.id,
        category: goal.category,
      });

      return success(goal);
    } catch (error) {
      return failure(new ValidationError('Failed to create goal'));
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(
    tenantId: string,
    userId: string,
    goalId: string,
    updates: {
      status?: LearningGoal['status'];
      progress?: number;
      completedMilestoneId?: string;
      linkedArtifactId?: string;
    }
  ): Promise<Result<LearningGoal>> {
    try {
      const goal = await prisma.learningGoal.findUnique({
        where: { id: goalId, tenantId, userId },
      });

      if (!goal) {
        return failure(new NotFoundError('Goal', goalId));
      }

      const milestones = goal.milestones as unknown as GoalMilestone[];
      const relatedArtifacts = [...goal.relatedArtifacts];

      // Update milestone if specified
      if (updates.completedMilestoneId) {
        const milestone = milestones.find(m => m.id === updates.completedMilestoneId);
        if (milestone) {
          milestone.isCompleted = true;
          milestone.completedAt = new Date();
        }
      }

      // Link artifact if specified
      if (updates.linkedArtifactId && !relatedArtifacts.includes(updates.linkedArtifactId)) {
        relatedArtifacts.push(updates.linkedArtifactId);
      }

      // Calculate progress based on milestones
      const completedMilestones = milestones.filter(m => m.isCompleted).length;
      const progress = updates.progress ??
        (milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : goal.progress);

      // Determine status
      let status = updates.status || goal.status;
      if (progress === 100 && status !== 'completed') {
        status = 'completed';
      } else if (progress > 0 && status === 'not_started') {
        status = 'in_progress';
      }

      await prisma.learningGoal.update({
        where: { id: goalId },
        data: {
          status,
          progress,
          milestones: milestones as unknown as [],
          relatedArtifacts,
          completedAt: status === 'completed' ? new Date() : undefined,
          updatedAt: new Date(),
        },
      });

      // Update portfolio stats
      await this.updatePortfolioStats(tenantId, userId);

      // Award achievement if goal completed
      if (status === 'completed' && goal.status !== 'completed') {
        await this.awardGoalCompletion(tenantId, userId, goal.title);
      }

      const updated = await prisma.learningGoal.findUnique({
        where: { id: goalId },
      });

      return success(this.mapGoal(updated!));
    } catch (error) {
      return failure(new ValidationError('Failed to update goal'));
    }
  }

  // ==========================================================================
  // AI-POWERED FEATURES
  // ==========================================================================

  /**
   * Get AI suggestions for reflection
   */
  private async getReflectionSuggestions(
    tenantId: string,
    artifactTitle: string,
    artifactType: ArtifactType,
    currentReflection: {
      whatILearned: string;
      challengesFaced: string;
      howIOvercame: string;
      connectionsToPrior: string;
      nextSteps: string;
    }
  ): Promise<Result<string[]>> {
    const result = await this.aiService.generatePortfolioReflection(
      tenantId,
      artifactType,
      artifactTitle,
      [],
      `${currentReflection.whatILearned} ${currentReflection.challengesFaced}`
    );

    if (!result.success) return failure(new ValidationError('Failed to get suggestions'));

    return success([
      ...result.data.guidingQuestions,
      ...result.data.reflectionStarters,
    ]);
  }

  /**
   * Generate learning journey structure using AI
   */
  private async generateJourneyStructure(
    tenantId: string,
    subject: string,
    goals: string[],
    curriculumCodes?: string[]
  ): Promise<Result<{ nodes: JourneyNode[]; recommendations: JourneyRecommendation[] }>> {
    const result = await this.aiService.recommendLearningPath(
      tenantId,
      {
        currentLevel: 'intermediate',
        strengths: [],
        goals,
        learningStyles: [],
        timeAvailable: 'flexible',
      },
      curriculumCodes || []
    );

    if (!result.success) {
      // Return a default structure
      return success({
        nodes: [
          {
            id: this.generateId('node'),
            type: 'start',
            title: 'Begin Journey',
            description: `Start your ${subject} learning journey`,
            status: 'available',
            order: 0,
            nextNodes: [],
          },
        ],
        recommendations: [],
      });
    }

    // Convert AI output to journey nodes
    const nodes: JourneyNode[] = [
      {
        id: this.generateId('node'),
        type: 'start',
        title: 'Begin Journey',
        description: `Start your ${subject} learning journey`,
        status: 'available',
        order: 0,
        nextNodes: [],
      },
    ];

    let order = 1;
    for (const topic of result.data.priorityTopics.slice(0, 5)) {
      const nodeId = this.generateId('node');
      const prevNode = nodes[nodes.length - 1];
      prevNode.nextNodes.push(nodeId);

      nodes.push({
        id: nodeId,
        type: 'milestone',
        title: topic,
        description: `Learn about ${topic}`,
        status: 'locked',
        order: order++,
        nextNodes: [],
      });
    }

    // Add end node
    const endNodeId = this.generateId('node');
    nodes[nodes.length - 1].nextNodes.push(endNodeId);
    nodes.push({
      id: endNodeId,
      type: 'end',
      title: 'Journey Complete',
      description: 'Congratulations on completing your learning journey!',
      status: 'locked',
      order: order,
      nextNodes: [],
    });

    const recommendations: JourneyRecommendation[] = result.data.suggestedResources.slice(0, 3).map(r => ({
      type: 'resource' as const,
      title: r.resource,
      description: r.reason,
      priority: 'medium' as const,
    }));

    return success({ nodes, recommendations });
  }

  /**
   * Get AI recommendations for journey progress
   */
  private async getJourneyRecommendations(
    tenantId: string,
    subject: string,
    path: JourneyNode[],
    currentNodeId: string
  ): Promise<Result<JourneyRecommendation[]>> {
    const currentNode = path.find(n => n.id === currentNodeId);
    const completedTopics = path
      .filter(n => n.status === 'completed')
      .map(n => n.title);
    const remainingTopics = path
      .filter(n => n.status !== 'completed' && n.type !== 'end')
      .map(n => n.title);

    const recommendations: JourneyRecommendation[] = [];

    if (currentNode && currentNode.type !== 'end') {
      recommendations.push({
        type: 'next_step',
        title: `Continue with: ${currentNode.title}`,
        description: currentNode.description || 'Keep making progress on your current topic',
        priority: 'high',
      });
    }

    if (completedTopics.length > 2) {
      recommendations.push({
        type: 'review',
        title: 'Review your progress',
        description: `You've completed ${completedTopics.length} topics. Take a moment to review what you've learned.`,
        priority: 'medium',
      });
    }

    if (remainingTopics.length <= 2) {
      recommendations.push({
        type: 'challenge',
        title: 'Almost there!',
        description: `Only ${remainingTopics.length} topics left. Push through to complete your journey!`,
        priority: 'high',
      });
    }

    return success(recommendations);
  }

  /**
   * Align artifact to curriculum using AI
   */
  private async alignArtifactToCurriculum(
    tenantId: string,
    artifact: Artifact
  ): Promise<Result<CurriculumAlignment[]>> {
    const contentToAlign = artifact.description || artifact.content.text || artifact.title;

    const result = await this.aiService.complete(tenantId, {
      messages: [{
        role: 'user',
        content: `Analyze this student work and suggest curriculum alignments:
Title: ${artifact.title}
Description: ${contentToAlign}
Type: ${artifact.type}
Subject: ${artifact.metadata.subject || 'Not specified'}
Year Level: ${artifact.metadata.yearLevel || 'Not specified'}

Respond with JSON array of alignments with code, framework, description, and strength (strong/moderate/partial).`
      }],
      systemPrompt: 'You are an expert in Australian curriculum alignment. Suggest relevant ACARA curriculum codes.',
      jsonMode: true,
      maxTokens: 500,
    });

    if (!result.success) return success([]);

    try {
      const parsed = JSON.parse(result.data.content);
      return success(parsed.alignments?.map((a: Record<string, unknown>) => ({
        code: a.code as string,
        framework: a.framework as string || 'ACARA',
        description: a.description as string,
        alignmentStrength: a.strength as 'strong' | 'moderate' | 'partial',
        aiGenerated: true,
        verified: false,
      })) || []);
    } catch {
      return success([]);
    }
  }

  // ==========================================================================
  // ACHIEVEMENTS
  // ==========================================================================

  private async awardGoalCompletion(
    tenantId: string,
    userId: string,
    goalTitle: string
  ): Promise<void> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!portfolio) return;

    await prisma.achievement.create({
      data: {
        id: this.generateId('achievement'),
        portfolioId: portfolio.id,
        tenantId,
        userId,
        type: 'milestone',
        title: 'Goal Achieved!',
        description: `Completed goal: ${goalTitle}`,
        imageUrl: '/badges/goal-complete.svg',
        earnedAt: new Date(),
        issuedBy: 'Scholarly',
        criteria: 'Complete a learning goal',
      },
    });

    await this.updatePortfolioStats(tenantId, userId);
  }

  private async awardJourneyCompletion(
    tenantId: string,
    userId: string,
    journeyTitle: string
  ): Promise<void> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!portfolio) return;

    await prisma.achievement.create({
      data: {
        id: this.generateId('achievement'),
        portfolioId: portfolio.id,
        tenantId,
        userId,
        type: 'badge',
        title: 'Journey Complete!',
        description: `Completed learning journey: ${journeyTitle}`,
        imageUrl: '/badges/journey-complete.svg',
        earnedAt: new Date(),
        issuedBy: 'Scholarly',
        criteria: 'Complete a learning journey',
      },
    });

    await this.updatePortfolioStats(tenantId, userId);
  }

  private async checkReflectionMilestones(
    tenantId: string,
    userId: string
  ): Promise<void> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!portfolio) return;

    const stats = portfolio.stats as unknown as PortfolioStats;
    const reflectionMilestones = [5, 10, 25, 50, 100];

    for (const milestone of reflectionMilestones) {
      if (stats.totalReflections === milestone) {
        await prisma.achievement.create({
          data: {
            id: this.generateId('achievement'),
            portfolioId: portfolio.id,
            tenantId,
            userId,
            type: 'badge',
            title: `Reflective Learner: ${milestone}`,
            description: `Wrote ${milestone} reflections`,
            imageUrl: `/badges/reflection-${milestone}.svg`,
            earnedAt: new Date(),
            issuedBy: 'Scholarly',
            criteria: `Write ${milestone} reflections`,
          },
        });
        break;
      }
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private createDefaultSections(): PortfolioSection[] {
    return [
      {
        id: this.generateId('section'),
        name: 'Best Work',
        description: 'My proudest achievements',
        type: 'custom',
        order: 0,
        isVisible: true,
        artifactIds: [],
      },
      {
        id: this.generateId('section'),
        name: 'Projects',
        description: 'Major projects I\'ve worked on',
        type: 'project',
        order: 1,
        isVisible: true,
        artifactIds: [],
      },
      {
        id: this.generateId('section'),
        name: 'Reflections',
        description: 'My learning reflections',
        type: 'reflection',
        order: 2,
        isVisible: true,
        artifactIds: [],
      },
      {
        id: this.generateId('section'),
        name: 'Achievements',
        description: 'Badges and certificates',
        type: 'achievement',
        order: 3,
        isVisible: true,
        artifactIds: [],
      },
    ];
  }

  private async addArtifactToSection(
    tenantId: string,
    userId: string,
    artifactId: string,
    sectionId: string
  ): Promise<void> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!portfolio) return;

    const sections = portfolio.sections as unknown as PortfolioSection[];
    const section = sections.find(s => s.id === sectionId);

    if (section && !section.artifactIds.includes(artifactId)) {
      section.artifactIds.push(artifactId);

      await prisma.portfolio.update({
        where: { id: portfolio.id },
        data: {
          sections: sections as unknown as [],
          updatedAt: new Date(),
        },
      });
    }
  }

  private async updatePortfolioStats(tenantId: string, userId: string): Promise<void> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: {
        goals: true,
        achievements: true,
      },
    });

    if (!portfolio) return;

    const artifacts = await prisma.artifact.findMany({
      where: { portfolioId: portfolio.id },
    });

    const artifactsByType: Record<string, number> = {};
    const artifactsBySubject: Record<string, number> = {};
    let totalReflections = 0;

    for (const artifact of artifacts) {
      // Count by type
      artifactsByType[artifact.type] = (artifactsByType[artifact.type] || 0) + 1;

      // Count by subject
      const metadata = artifact.metadata as unknown as ArtifactMetadata;
      if (metadata?.subject) {
        artifactsBySubject[metadata.subject] = (artifactsBySubject[metadata.subject] || 0) + 1;
      }

      // Count reflections
      if (artifact.reflection) {
        totalReflections++;
      }
    }

    const stats: PortfolioStats = {
      totalArtifacts: artifacts.length,
      artifactsByType,
      artifactsBySubject,
      totalReflections,
      goalsCompleted: portfolio.goals.filter(g => g.status === 'completed').length,
      goalsInProgress: portfolio.goals.filter(g => g.status === 'in_progress').length,
      achievementsEarned: portfolio.achievements.length,
      streakDays: 0, // Would calculate from activity history
      lastActivityAt: new Date(),
    };

    await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        stats: stats as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      },
    });
  }

  private mapArtifact(artifact: Record<string, unknown>): Artifact {
    return {
      id: artifact.id as string,
      portfolioId: artifact.portfolioId as string,
      tenantId: artifact.tenantId as string,
      userId: artifact.userId as string,
      title: artifact.title as string,
      description: artifact.description as string | undefined,
      type: artifact.type as ArtifactType,
      content: artifact.content as unknown as ArtifactContent,
      metadata: artifact.metadata as unknown as ArtifactMetadata,
      reflection: artifact.reflection as unknown as ArtifactReflection | undefined,
      curriculumAlignment: artifact.curriculumAlignment as unknown as CurriculumAlignment[] | undefined,
      tags: artifact.tags as string[],
      status: artifact.status as Artifact['status'],
      visibility: artifact.visibility as Artifact['visibility'],
      feedback: artifact.feedback as unknown as ArtifactFeedback[] || [],
      createdAt: artifact.createdAt as Date,
      updatedAt: artifact.updatedAt as Date,
      publishedAt: artifact.publishedAt as Date | undefined,
    };
  }

  private mapGoal(goal: Record<string, unknown>): LearningGoal {
    return {
      id: goal.id as string,
      portfolioId: goal.portfolioId as string,
      title: goal.title as string,
      description: goal.description as string,
      category: goal.category as LearningGoal['category'],
      subject: goal.subject as string | undefined,
      targetDate: goal.targetDate as Date | undefined,
      status: goal.status as LearningGoal['status'],
      progress: goal.progress as number,
      milestones: goal.milestones as unknown as GoalMilestone[],
      relatedArtifacts: goal.relatedArtifacts as string[],
      curriculumCodes: goal.curriculumCodes as string[] | undefined,
      createdAt: goal.createdAt as Date,
      updatedAt: goal.updatedAt as Date,
      completedAt: goal.completedAt as Date | undefined,
    };
  }

  private mapAchievement(achievement: Record<string, unknown>): Achievement {
    return {
      id: achievement.id as string,
      portfolioId: achievement.portfolioId as string,
      type: achievement.type as Achievement['type'],
      title: achievement.title as string,
      description: achievement.description as string,
      imageUrl: achievement.imageUrl as string,
      earnedAt: achievement.earnedAt as Date,
      issuedBy: achievement.issuedBy as string,
      criteria: achievement.criteria as string,
      evidence: achievement.evidence as string[] | undefined,
      blockchain: achievement.blockchain as Achievement['blockchain'] | undefined,
    };
  }
}

// Export singleton
let portfolioServiceInstance: DigitalPortfolioService | null = null;

export function getDigitalPortfolioService(): DigitalPortfolioService {
  if (!portfolioServiceInstance) {
    throw new Error('Digital Portfolio Service not initialized');
  }
  return portfolioServiceInstance;
}

export function initializeDigitalPortfolioService(deps: {
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
}): DigitalPortfolioService {
  portfolioServiceInstance = new DigitalPortfolioService(deps);
  return portfolioServiceInstance;
}

export { DigitalPortfolioService as default };
