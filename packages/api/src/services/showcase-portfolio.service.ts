/**
 * Showcase Portfolio Service
 *
 * The terminal phase of the Design & Pitch AI journey. Enables learners to transform
 * their raw iterative process (sketches, failed prototypes, peer critiques) into a
 * polished, professional narrative for external stakeholders, employers, or college admissions.
 *
 * Features:
 * - Artifact curation and "Push to Showcase"
 * - Narrative overlays with reflection blocks
 * - Pitch deck embedding with web-optimized viewer
 * - Public/private vanity URLs
 * - Password-protected and time-limited access
 * - Stakeholder guestbook with approval workflow
 * - AI Skill Mapping and auto-tagging
 * - AI Portfolio Executive Summary generator
 * - SEO management with no-index toggle
 * - View analytics and stakeholder tracking
 *
 * @see PRD: Showcase-Digital-Portfolio-Module.md
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  EventBus,
  Cache,
  ScholarlyConfig
} from '@scholarly/shared/types/scholarly-types';
import { prisma } from '@scholarly/database';
import { AIIntegrationService, getAIService } from './ai-integration.service';
import { DesignPitchAIService, getDesignPitchAIService } from './design-pitch-ai.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Showcase Portfolio - main portfolio container
 */
export interface ShowcasePortfolio {
  id: string;
  tenantId: string;
  userId: string;
  journeyId: string; // Links to Design & Pitch journey

  // Identity & Branding
  title: string;
  headline?: string;
  customSlug: string; // Vanity URL slug
  fullUrl: string; // Complete portfolio URL

  // Privacy & Access
  isPublic: boolean;
  passwordProtected: boolean;
  passwordHash?: string;
  accessExpiry?: Date; // Time-limited access
  allowedEmails?: string[]; // Specific email access list

  // SEO Settings
  seoSettings: SEOSettings;

  // Theme & Layout
  themeConfig: ShowcaseTheme;

  // Content
  items: ShowcaseItem[];
  featuredItems: string[]; // IDs of featured items
  pitchDeckEmbed?: PitchDeckEmbed;

  // AI Generated
  aiSkillTags: SkillTag[];
  aiExecutiveSummary?: string;
  aiGrowthNarrative?: string;

  // Analytics
  analytics: PortfolioAnalytics;

  // Guestbook
  guestbookEnabled: boolean;
  guestbookEntries: GuestbookEntry[];

  // Metadata
  status: PortfolioStatus;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  lastViewedAt?: Date;
}

export type PortfolioStatus = 'draft' | 'published' | 'archived' | 'suspended';

/**
 * SEO Settings for portfolio
 */
export interface SEOSettings {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  noIndex: boolean; // Prevent search engine indexing
  canonicalUrl?: string;
  keywords: string[];
}

/**
 * Theme configuration for showcase
 */
export interface ShowcaseTheme {
  layout: ShowcaseLayout;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  headerStyle: 'minimal' | 'hero' | 'split';
  cardStyle: 'flat' | 'elevated' | 'bordered' | 'glass';
  showGrowthTimeline: boolean;
  customCSS?: string;
}

export type ShowcaseLayout =
  | 'timeline' // Chronological journey view
  | 'grid' // Gallery-style grid
  | 'magazine' // Editorial magazine layout
  | 'story' // Narrative scroll
  | 'minimal'; // Clean, simple layout

/**
 * Individual item in the showcase
 */
export interface ShowcaseItem {
  id: string;
  portfolioId: string;
  artifactId: string; // Reference to original artifact
  artifactVersion: number; // Specific version (V1 vs Final)

  // Display
  displayOrder: number;
  isFeatured: boolean;
  isVisible: boolean;

  // Learner Reflection (required per PRD)
  reflection: ItemReflection;

  // Context from journey
  journeyPhase: string; // Which phase this came from
  iterationNumber: number;

  // Display customization
  displayConfig: ItemDisplayConfig;

  // Timestamps
  addedAt: Date;
  updatedAt: Date;
}

/**
 * Reflection block for each curated item
 */
export interface ItemReflection {
  content: string; // The reflection text
  promptUsed?: string; // AI prompt that generated the reflection question
  wordCount: number;
  sentiment?: 'growth' | 'challenge' | 'insight' | 'achievement';
  learningOutcomes: string[];
  peerFeedbackInfluence?: string; // How peer feedback influenced this version
  keyTakeaways: string[];
  writtenAt: Date;
  lastEditedAt?: Date;
}

/**
 * Display configuration for an item
 */
export interface ItemDisplayConfig {
  size: 'small' | 'medium' | 'large' | 'full';
  showBeforeAfter: boolean; // Show V1 vs Final comparison
  beforeArtifactId?: string; // Reference to earlier version
  highlightGrowth: boolean;
  customCaption?: string;
  mediaOverlay?: 'none' | 'gradient' | 'blur';
}

/**
 * Embedded pitch deck viewer
 */
export interface PitchDeckEmbed {
  deckId: string;
  embedCode: string;
  autoPlay: boolean;
  showControls: boolean;
  allowFullscreen: boolean;
  slideTransition: 'slide' | 'fade' | 'none';
  viewerTheme: 'light' | 'dark' | 'auto';
  shareableLink: string;
}

/**
 * AI-generated skill tag
 */
export interface SkillTag {
  id: string;
  name: string;
  category: SkillCategory;
  confidence: number; // 0-1 confidence score
  evidence: SkillEvidence[];
  endorsedBy?: string[]; // Instructor/peer endorsements
  isVerified: boolean;
}

export type SkillCategory =
  | 'design_thinking'
  | 'technical'
  | 'communication'
  | 'collaboration'
  | 'problem_solving'
  | 'research'
  | 'creativity'
  | 'leadership'
  | 'data_analysis'
  | 'user_empathy';

/**
 * Evidence supporting a skill tag
 */
export interface SkillEvidence {
  artifactId: string;
  description: string;
  strength: 'weak' | 'moderate' | 'strong';
  extractedFrom: string; // What part of the journey this came from
}

/**
 * Guestbook entry from external viewers
 */
export interface GuestbookEntry {
  id: string;
  portfolioId: string;

  // Guest info
  guestName: string;
  guestEmail?: string;
  guestOrganization?: string;
  guestRole?: string;

  // Feedback
  message: string;
  rating?: number; // 1-5 stars
  impressionTags: string[]; // Quick tags like "Impressive", "Creative"

  // Moderation
  status: GuestbookStatus;
  approvedAt?: Date;
  rejectedReason?: string;

  // Analytics
  viewerLocation?: ViewerLocation;
  submittedAt: Date;
}

export type GuestbookStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

/**
 * Viewer location for analytics
 */
export interface ViewerLocation {
  city?: string;
  region?: string;
  country: string;
  timezone?: string;
}

/**
 * Portfolio view analytics
 */
export interface PortfolioAnalytics {
  totalViews: number;
  uniqueViews: number;
  viewsByDate: ViewsByDate[];
  viewsByLocation: ViewByLocation[];
  viewsBySource: ViewBySource[];
  averageTimeOnPage: number; // seconds
  pitchDeckViews: number;
  pitchDeckCompletionRate: number; // % who watched full deck
  mostViewedItems: ItemViewStats[];
  guestbookConversionRate: number; // % viewers who left feedback
  shareClicks: number;
  downloadRequests: number;
}

export interface ViewsByDate {
  date: string;
  views: number;
  uniqueViews: number;
}

export interface ViewByLocation {
  location: string;
  country: string;
  views: number;
}

export interface ViewBySource {
  source: string; // 'direct', 'linkedin', 'email', 'other'
  referrer?: string;
  views: number;
}

export interface ItemViewStats {
  itemId: string;
  artifactTitle: string;
  views: number;
  averageViewTime: number;
}

/**
 * Portfolio view event for tracking
 */
export interface PortfolioViewEvent {
  id: string;
  portfolioId: string;
  viewerId?: string; // null for anonymous
  viewerFingerprint: string; // For unique visitor tracking
  location?: ViewerLocation;
  source: string;
  referrer?: string;
  userAgent: string;
  duration?: number;
  itemsViewed: string[];
  pitchDeckWatched: boolean;
  pitchDeckProgress?: number; // 0-100%
  viewedAt: Date;
}

/**
 * Access link for sharing
 */
export interface AccessLink {
  id: string;
  portfolioId: string;
  token: string;
  type: 'public' | 'password' | 'email' | 'time_limited';
  password?: string;
  allowedEmails?: string[];
  expiresAt?: Date;
  maxUses?: number;
  currentUses: number;
  createdAt: Date;
  createdBy: string;
  lastUsedAt?: Date;
  isActive: boolean;
}

/**
 * AI Curation suggestion
 */
export interface CurationSuggestion {
  artifactId: string;
  artifactTitle: string;
  version: number;
  phase: string;
  suggestedReason: string;
  growthIndicators: string[];
  recommendedReflectionPrompt: string;
  suggestedDisplayOrder: number;
  showAsBeforeAfter: boolean;
  pairedWithArtifactId?: string;
  confidence: number;
}

/**
 * Growth analysis from AI
 */
export interface GrowthAnalysis {
  overallGrowthScore: number; // 0-100
  growthAreas: GrowthAreaAnalysis[];
  strengthsIdentified: string[];
  challengesOvercome: string[];
  journeyHighlights: JourneyHighlight[];
  recommendedNarrative: string;
}

export interface GrowthAreaAnalysis {
  area: string;
  startingPoint: string;
  endPoint: string;
  growthPercentage: number;
  keyMilestones: string[];
  evidenceArtifacts: string[];
}

export interface JourneyHighlight {
  title: string;
  description: string;
  artifactId: string;
  significance: string;
  displayPriority: number;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

let serviceInstance: ShowcasePortfolioService | null = null;

export class ShowcasePortfolioService extends ScholarlyBaseService {
  private aiService: AIIntegrationService | null = null;
  private designPitchService: DesignPitchAIService | null = null;
  private readonly SALT_ROUNDS = 12;
  private readonly BASE_URL = process.env.SHOWCASE_BASE_URL || 'https://portfolio.scholarly.ai';

  constructor(config: ScholarlyConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.aiService = getAIService();
    this.designPitchService = getDesignPitchAIService();
  }

  // ============================================================================
  // PORTFOLIO MANAGEMENT
  // ============================================================================

  /**
   * Create a new showcase portfolio from a Design & Pitch journey
   * [FR-5.1] Initialize portfolio for artifact curation
   */
  async createShowcase(
    tenantId: string,
    userId: string,
    journeyId: string,
    input: CreateShowcaseInput
  ): Promise<Result<ShowcasePortfolio>> {
    try {
      // Validate journey exists and belongs to user
      const journeyValidation = await this.validateJourneyOwnership(tenantId, userId, journeyId);
      if (!journeyValidation.success) {
        return failure(journeyValidation.error!);
      }

      // Generate unique slug
      const slug = await this.generateUniqueSlug(input.preferredSlug, userId);

      const portfolio: ShowcasePortfolio = {
        id: crypto.randomUUID(),
        tenantId,
        userId,
        journeyId,
        title: input.title,
        headline: input.headline,
        customSlug: slug,
        fullUrl: `${this.BASE_URL}/u/${slug}`,
        isPublic: false,
        passwordProtected: false,
        seoSettings: {
          noIndex: true, // Default to no-index for privacy
          keywords: []
        },
        themeConfig: input.theme || this.getDefaultTheme(),
        items: [],
        featuredItems: [],
        aiSkillTags: [],
        analytics: this.initializeAnalytics(),
        guestbookEnabled: true,
        guestbookEntries: [],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in database
      await this.savePortfolio(portfolio);

      // Emit event
      this.eventBus?.emit('showcase.created', {
        portfolioId: portfolio.id,
        userId,
        journeyId,
        timestamp: new Date()
      });

      return success(portfolio);
    } catch (error) {
      return failure(new ValidationError(`Failed to create showcase: ${error}`));
    }
  }

  /**
   * Get portfolio by ID
   */
  async getShowcase(
    tenantId: string,
    portfolioId: string,
    userId?: string
  ): Promise<Result<ShowcasePortfolio>> {
    try {
      const portfolio = await this.loadPortfolio(portfolioId);

      if (!portfolio) {
        return failure(new NotFoundError('Portfolio not found'));
      }

      if (portfolio.tenantId !== tenantId) {
        return failure(new NotFoundError('Portfolio not found'));
      }

      // Check access permissions
      if (userId && portfolio.userId !== userId && !portfolio.isPublic) {
        return failure(new UnauthorizedError('Access denied to this portfolio'));
      }

      return success(portfolio);
    } catch (error) {
      return failure(new ValidationError(`Failed to get showcase: ${error}`));
    }
  }

  /**
   * Get portfolio by public slug (for external viewers)
   * [FR-5.4] Public vanity URL access
   */
  async getShowcaseBySlug(
    slug: string,
    accessToken?: string,
    password?: string
  ): Promise<Result<ShowcasePortfolio>> {
    try {
      const portfolio = await this.loadPortfolioBySlug(slug);

      if (!portfolio) {
        return failure(new NotFoundError('Portfolio not found'));
      }

      if (portfolio.status !== 'published') {
        return failure(new NotFoundError('Portfolio not found'));
      }

      // Check access
      if (!portfolio.isPublic) {
        // Check if password protected
        if (portfolio.passwordProtected) {
          if (!password) {
            return failure(new UnauthorizedError('Password required'));
          }
          const passwordValid = await this.verifyPassword(password, portfolio.passwordHash!);
          if (!passwordValid) {
            return failure(new UnauthorizedError('Invalid password'));
          }
        } else if (portfolio.accessExpiry && new Date() > portfolio.accessExpiry) {
          return failure(new UnauthorizedError('Access link has expired'));
        }
      }

      // Track view
      await this.trackView(portfolio.id, {
        source: 'direct',
        viewedAt: new Date()
      });

      return success(portfolio);
    } catch (error) {
      return failure(new ValidationError(`Failed to get showcase: ${error}`));
    }
  }

  /**
   * Update showcase settings
   */
  async updateShowcase(
    tenantId: string,
    userId: string,
    portfolioId: string,
    updates: UpdateShowcaseInput
  ): Promise<Result<ShowcasePortfolio>> {
    try {
      const portfolioResult = await this.getShowcase(tenantId, portfolioId, userId);
      if (!portfolioResult.success) {
        return portfolioResult;
      }

      const portfolio = portfolioResult.data!;

      // Apply updates
      if (updates.title) portfolio.title = updates.title;
      if (updates.headline !== undefined) portfolio.headline = updates.headline;
      if (updates.themeConfig) portfolio.themeConfig = { ...portfolio.themeConfig, ...updates.themeConfig };
      if (updates.seoSettings) portfolio.seoSettings = { ...portfolio.seoSettings, ...updates.seoSettings };
      if (updates.guestbookEnabled !== undefined) portfolio.guestbookEnabled = updates.guestbookEnabled;

      portfolio.updatedAt = new Date();

      await this.savePortfolio(portfolio);

      return success(portfolio);
    } catch (error) {
      return failure(new ValidationError(`Failed to update showcase: ${error}`));
    }
  }

  /**
   * Publish portfolio to make it accessible
   */
  async publishShowcase(
    tenantId: string,
    userId: string,
    portfolioId: string,
    publishSettings: PublishSettings
  ): Promise<Result<ShowcasePortfolio>> {
    try {
      const portfolioResult = await this.getShowcase(tenantId, portfolioId, userId);
      if (!portfolioResult.success) {
        return portfolioResult;
      }

      const portfolio = portfolioResult.data!;

      // Validate portfolio has required content
      if (portfolio.items.length === 0) {
        return failure(new ValidationError('Portfolio must have at least one curated item'));
      }

      // Check all items have reflections
      const missingReflections = portfolio.items.filter(item => !item.reflection?.content);
      if (missingReflections.length > 0) {
        return failure(new ValidationError(
          `${missingReflections.length} item(s) are missing required reflections`
        ));
      }

      // Apply publish settings
      portfolio.isPublic = publishSettings.isPublic;

      if (publishSettings.password) {
        portfolio.passwordProtected = true;
        portfolio.passwordHash = await this.hashPassword(publishSettings.password);
      } else {
        portfolio.passwordProtected = false;
        portfolio.passwordHash = undefined;
      }

      if (publishSettings.expiresAt) {
        portfolio.accessExpiry = publishSettings.expiresAt;
      }

      if (publishSettings.allowedEmails) {
        portfolio.allowedEmails = publishSettings.allowedEmails;
      }

      // Update SEO settings
      if (publishSettings.allowIndexing !== undefined) {
        portfolio.seoSettings.noIndex = !publishSettings.allowIndexing;
      }

      portfolio.status = 'published';
      portfolio.publishedAt = new Date();
      portfolio.updatedAt = new Date();

      // Generate AI summary if not already done
      if (!portfolio.aiExecutiveSummary) {
        const summaryResult = await this.generateExecutiveSummary(tenantId, portfolioId);
        if (summaryResult.success) {
          portfolio.aiExecutiveSummary = summaryResult.data!.summary;
        }
      }

      await this.savePortfolio(portfolio);

      this.eventBus?.emit('showcase.published', {
        portfolioId: portfolio.id,
        userId,
        isPublic: portfolio.isPublic,
        timestamp: new Date()
      });

      return success(portfolio);
    } catch (error) {
      return failure(new ValidationError(`Failed to publish showcase: ${error}`));
    }
  }

  // ============================================================================
  // ARTIFACT CURATION
  // ============================================================================

  /**
   * Add artifact to showcase ("Push to Showcase" / "Star")
   * [FR-5.1] Artifact Selection
   */
  async addItemToShowcase(
    tenantId: string,
    userId: string,
    portfolioId: string,
    input: AddItemInput
  ): Promise<Result<ShowcaseItem>> {
    try {
      const portfolioResult = await this.getShowcase(tenantId, portfolioId, userId);
      if (!portfolioResult.success) {
        return portfolioResult;
      }

      const portfolio = portfolioResult.data!;

      // Validate artifact exists and belongs to the journey
      const artifactValidation = await this.validateArtifact(
        tenantId,
        input.artifactId,
        portfolio.journeyId
      );
      if (!artifactValidation.success) {
        return failure(artifactValidation.error!);
      }

      const item: ShowcaseItem = {
        id: crypto.randomUUID(),
        portfolioId,
        artifactId: input.artifactId,
        artifactVersion: input.version || 1,
        displayOrder: portfolio.items.length,
        isFeatured: input.isFeatured || false,
        isVisible: true,
        reflection: {
          content: '',
          wordCount: 0,
          learningOutcomes: [],
          keyTakeaways: [],
          writtenAt: new Date()
        },
        journeyPhase: artifactValidation.data!.phase,
        iterationNumber: artifactValidation.data!.iteration,
        displayConfig: {
          size: 'medium',
          showBeforeAfter: input.showBeforeAfter || false,
          beforeArtifactId: input.beforeArtifactId,
          highlightGrowth: true,
          mediaOverlay: 'none'
        },
        addedAt: new Date(),
        updatedAt: new Date()
      };

      portfolio.items.push(item);

      if (input.isFeatured) {
        portfolio.featuredItems.push(item.id);
      }

      portfolio.updatedAt = new Date();
      await this.savePortfolio(portfolio);

      this.eventBus?.emit('showcase.item_added', {
        portfolioId,
        itemId: item.id,
        artifactId: input.artifactId,
        timestamp: new Date()
      });

      return success(item);
    } catch (error) {
      return failure(new ValidationError(`Failed to add item: ${error}`));
    }
  }

  /**
   * Update item reflection
   * [FR-5.2] Narrative Overlays - Reflection block
   */
  async updateItemReflection(
    tenantId: string,
    userId: string,
    portfolioId: string,
    itemId: string,
    reflection: ReflectionInput
  ): Promise<Result<ShowcaseItem>> {
    try {
      const portfolioResult = await this.getShowcase(tenantId, portfolioId, userId);
      if (!portfolioResult.success) {
        return portfolioResult;
      }

      const portfolio = portfolioResult.data!;
      const item = portfolio.items.find(i => i.id === itemId);

      if (!item) {
        return failure(new NotFoundError('Item not found in portfolio'));
      }

      // Update reflection
      item.reflection = {
        content: reflection.content,
        promptUsed: reflection.promptUsed,
        wordCount: reflection.content.split(/\s+/).length,
        sentiment: reflection.sentiment,
        learningOutcomes: reflection.learningOutcomes || [],
        peerFeedbackInfluence: reflection.peerFeedbackInfluence,
        keyTakeaways: reflection.keyTakeaways || [],
        writtenAt: item.reflection.writtenAt,
        lastEditedAt: new Date()
      };

      item.updatedAt = new Date();
      portfolio.updatedAt = new Date();

      await this.savePortfolio(portfolio);

      return success(item);
    } catch (error) {
      return failure(new ValidationError(`Failed to update reflection: ${error}`));
    }
  }

  /**
   * Generate AI reflection prompt for an artifact
   * [FR-5.2] Contextual prompts like "How did peer feedback influence this version?"
   */
  async generateReflectionPrompt(
    tenantId: string,
    portfolioId: string,
    itemId: string
  ): Promise<Result<{ prompt: string; context: string }>> {
    try {
      const portfolio = await this.loadPortfolio(portfolioId);
      if (!portfolio) {
        return failure(new NotFoundError('Portfolio not found'));
      }

      const item = portfolio.items.find(i => i.id === itemId);
      if (!item) {
        return failure(new NotFoundError('Item not found'));
      }

      // Get artifact details
      const artifactDetails = await this.getArtifactDetails(item.artifactId);

      // Generate contextual prompt based on phase and iteration
      const prompts: Record<string, string[]> = {
        'empathize': [
          'What assumptions did you have about users before your research?',
          'What surprised you most about your user interviews or observations?',
          'How did this artifact help you understand the problem more deeply?'
        ],
        'define': [
          'How did you narrow down from many problems to this specific one?',
          'What makes this problem worth solving?',
          'How would you explain this problem to someone outside your field?'
        ],
        'ideate': [
          'What other ideas did you consider before landing on this approach?',
          'How did peer feedback influence this version?',
          'What constraints shaped your creative decisions?'
        ],
        'prototype': [
          'What did you learn from building this that you couldn\'t learn from planning?',
          'What would you change if you started over?',
          'How does this prototype test your riskiest assumption?'
        ],
        'iterate': [
          'How specifically did peer feedback change your approach?',
          'What growth do you see between this version and earlier ones?',
          'What critique was hardest to hear but most valuable?'
        ],
        'pitch': [
          'How did you decide what story to tell?',
          'What did you learn about communication from this process?',
          'How would you pitch this differently to a different audience?'
        ]
      };

      const phasePrompts = prompts[item.journeyPhase.toLowerCase()] || prompts['iterate'];
      const selectedPrompt = phasePrompts[item.iterationNumber % phasePrompts.length];

      return success({
        prompt: selectedPrompt,
        context: `This is from the ${item.journeyPhase} phase, iteration ${item.iterationNumber}`
      });
    } catch (error) {
      return failure(new ValidationError(`Failed to generate prompt: ${error}`));
    }
  }

  /**
   * Reorder items in the showcase
   */
  async reorderItems(
    tenantId: string,
    userId: string,
    portfolioId: string,
    itemOrder: string[]
  ): Promise<Result<ShowcaseItem[]>> {
    try {
      const portfolioResult = await this.getShowcase(tenantId, portfolioId, userId);
      if (!portfolioResult.success) {
        return portfolioResult;
      }

      const portfolio = portfolioResult.data!;

      // Validate all IDs exist
      const existingIds = new Set(portfolio.items.map(i => i.id));
      for (const id of itemOrder) {
        if (!existingIds.has(id)) {
          return failure(new ValidationError(`Item ${id} not found in portfolio`));
        }
      }

      // Reorder
      portfolio.items = itemOrder.map((id, index) => {
        const item = portfolio.items.find(i => i.id === id)!;
        item.displayOrder = index;
        return item;
      });

      portfolio.updatedAt = new Date();
      await this.savePortfolio(portfolio);

      return success(portfolio.items);
    } catch (error) {
      return failure(new ValidationError(`Failed to reorder items: ${error}`));
    }
  }

  /**
   * Remove item from showcase
   */
  async removeItem(
    tenantId: string,
    userId: string,
    portfolioId: string,
    itemId: string
  ): Promise<Result<void>> {
    try {
      const portfolioResult = await this.getShowcase(tenantId, portfolioId, userId);
      if (!portfolioResult.success) {
        return failure(portfolioResult.error!);
      }

      const portfolio = portfolioResult.data!;
      const itemIndex = portfolio.items.findIndex(i => i.id === itemId);

      if (itemIndex === -1) {
        return failure(new NotFoundError('Item not found'));
      }

      portfolio.items.splice(itemIndex, 1);
      portfolio.featuredItems = portfolio.featuredItems.filter(id => id !== itemId);

      // Reorder remaining items
      portfolio.items.forEach((item, index) => {
        item.displayOrder = index;
      });

      portfolio.updatedAt = new Date();
      await this.savePortfolio(portfolio);

      return success(undefined);
    } catch (error) {
      return failure(new ValidationError(`Failed to remove item: ${error}`));
    }
  }

  // ============================================================================
  // PITCH DECK EMBEDDING
  // ============================================================================

  /**
   * Configure pitch deck embed for the showcase
   * [FR-5.3] Native web-optimized pitch deck viewer
   */
  async configurePitchDeckEmbed(
    tenantId: string,
    userId: string,
    portfolioId: string,
    deckId: string,
    config: PitchDeckEmbedConfig
  ): Promise<Result<PitchDeckEmbed>> {
    try {
      const portfolioResult = await this.getShowcase(tenantId, portfolioId, userId);
      if (!portfolioResult.success) {
        return portfolioResult;
      }

      const portfolio = portfolioResult.data!;

      // Validate deck exists and belongs to journey
      const deckValidation = await this.validatePitchDeck(tenantId, deckId, portfolio.journeyId);
      if (!deckValidation.success) {
        return failure(deckValidation.error!);
      }

      // Generate embed code and shareable link
      const embedToken = crypto.randomBytes(32).toString('hex');
      const embedCode = this.generateEmbedCode(portfolioId, deckId, embedToken, config);
      const shareableLink = `${this.BASE_URL}/embed/${portfolioId}/deck/${embedToken}`;

      const embed: PitchDeckEmbed = {
        deckId,
        embedCode,
        autoPlay: config.autoPlay || false,
        showControls: config.showControls ?? true,
        allowFullscreen: config.allowFullscreen ?? true,
        slideTransition: config.slideTransition || 'slide',
        viewerTheme: config.viewerTheme || 'auto',
        shareableLink
      };

      portfolio.pitchDeckEmbed = embed;
      portfolio.updatedAt = new Date();

      await this.savePortfolio(portfolio);

      return success(embed);
    } catch (error) {
      return failure(new ValidationError(`Failed to configure pitch deck: ${error}`));
    }
  }

  // ============================================================================
  // ACCESS CONTROL & SHARING
  // ============================================================================

  /**
   * Generate a shareable access link
   * [FR-5.4] [FR-5.5] Vanity URLs with access control
   */
  async generateAccessLink(
    tenantId: string,
    userId: string,
    portfolioId: string,
    linkConfig: AccessLinkConfig
  ): Promise<Result<AccessLink>> {
    try {
      const portfolioResult = await this.getShowcase(tenantId, portfolioId, userId);
      if (!portfolioResult.success) {
        return portfolioResult;
      }

      const token = crypto.randomBytes(32).toString('hex');

      const accessLink: AccessLink = {
        id: crypto.randomUUID(),
        portfolioId,
        token,
        type: linkConfig.type,
        password: linkConfig.password ? await this.hashPassword(linkConfig.password) : undefined,
        allowedEmails: linkConfig.allowedEmails,
        expiresAt: linkConfig.expiresAt,
        maxUses: linkConfig.maxUses,
        currentUses: 0,
        createdAt: new Date(),
        createdBy: userId,
        isActive: true
      };

      await this.saveAccessLink(accessLink);

      // Return link with full URL
      const fullUrl = linkConfig.type === 'public'
        ? portfolioResult.data!.fullUrl
        : `${this.BASE_URL}/access/${token}`;

      return success({ ...accessLink, token: fullUrl });
    } catch (error) {
      return failure(new ValidationError(`Failed to generate link: ${error}`));
    }
  }

  /**
   * Validate and use an access link
   */
  async validateAccessLink(
    token: string,
    password?: string,
    email?: string
  ): Promise<Result<{ portfolioId: string; accessGranted: boolean }>> {
    try {
      const link = await this.loadAccessLink(token);

      if (!link || !link.isActive) {
        return failure(new NotFoundError('Invalid or expired link'));
      }

      // Check expiry
      if (link.expiresAt && new Date() > link.expiresAt) {
        return failure(new UnauthorizedError('Link has expired'));
      }

      // Check max uses
      if (link.maxUses && link.currentUses >= link.maxUses) {
        return failure(new UnauthorizedError('Link has reached maximum uses'));
      }

      // Check password
      if (link.type === 'password' && link.password) {
        if (!password || !(await this.verifyPassword(password, link.password))) {
          return failure(new UnauthorizedError('Invalid password'));
        }
      }

      // Check email allowlist
      if (link.type === 'email' && link.allowedEmails) {
        if (!email || !link.allowedEmails.includes(email.toLowerCase())) {
          return failure(new UnauthorizedError('Email not authorized'));
        }
      }

      // Update usage
      link.currentUses++;
      link.lastUsedAt = new Date();
      await this.saveAccessLink(link);

      return success({ portfolioId: link.portfolioId, accessGranted: true });
    } catch (error) {
      return failure(new ValidationError(`Failed to validate link: ${error}`));
    }
  }

  /**
   * Update custom slug (vanity URL)
   * [FR-5.4] Custom vanity URL
   */
  async updateCustomSlug(
    tenantId: string,
    userId: string,
    portfolioId: string,
    newSlug: string
  ): Promise<Result<{ slug: string; fullUrl: string }>> {
    try {
      const portfolioResult = await this.getShowcase(tenantId, portfolioId, userId);
      if (!portfolioResult.success) {
        return portfolioResult;
      }

      // Validate and sanitize slug
      const sanitizedSlug = this.sanitizeSlug(newSlug);
      if (!sanitizedSlug || sanitizedSlug.length < 3) {
        return failure(new ValidationError('Slug must be at least 3 characters'));
      }

      // Check availability
      const existing = await this.loadPortfolioBySlug(sanitizedSlug);
      if (existing && existing.id !== portfolioId) {
        return failure(new ValidationError('This URL is already taken'));
      }

      const portfolio = portfolioResult.data!;
      portfolio.customSlug = sanitizedSlug;
      portfolio.fullUrl = `${this.BASE_URL}/u/${sanitizedSlug}`;
      portfolio.updatedAt = new Date();

      await this.savePortfolio(portfolio);

      return success({ slug: sanitizedSlug, fullUrl: portfolio.fullUrl });
    } catch (error) {
      return failure(new ValidationError(`Failed to update slug: ${error}`));
    }
  }

  // ============================================================================
  // GUESTBOOK
  // ============================================================================

  /**
   * Submit a guestbook entry (external viewer)
   * [FR-5.6] Stakeholder Guest Comments
   */
  async submitGuestbookEntry(
    portfolioId: string,
    entry: GuestbookEntryInput,
    viewerContext: ViewerContext
  ): Promise<Result<GuestbookEntry>> {
    try {
      const portfolio = await this.loadPortfolio(portfolioId);

      if (!portfolio) {
        return failure(new NotFoundError('Portfolio not found'));
      }

      if (!portfolio.guestbookEnabled) {
        return failure(new ValidationError('Guestbook is not enabled for this portfolio'));
      }

      const guestbookEntry: GuestbookEntry = {
        id: crypto.randomUUID(),
        portfolioId,
        guestName: entry.name,
        guestEmail: entry.email,
        guestOrganization: entry.organization,
        guestRole: entry.role,
        message: entry.message,
        rating: entry.rating,
        impressionTags: entry.impressionTags || [],
        status: 'pending', // Requires learner approval
        viewerLocation: viewerContext.location,
        submittedAt: new Date()
      };

      portfolio.guestbookEntries.push(guestbookEntry);
      portfolio.updatedAt = new Date();

      await this.savePortfolio(portfolio);

      // Notify portfolio owner
      this.eventBus?.emit('showcase.guestbook_entry', {
        portfolioId,
        entryId: guestbookEntry.id,
        guestName: entry.name,
        timestamp: new Date()
      });

      return success(guestbookEntry);
    } catch (error) {
      return failure(new ValidationError(`Failed to submit guestbook entry: ${error}`));
    }
  }

  /**
   * Moderate guestbook entry (approve/reject)
   */
  async moderateGuestbookEntry(
    tenantId: string,
    userId: string,
    portfolioId: string,
    entryId: string,
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<Result<GuestbookEntry>> {
    try {
      const portfolioResult = await this.getShowcase(tenantId, portfolioId, userId);
      if (!portfolioResult.success) {
        return portfolioResult;
      }

      const portfolio = portfolioResult.data!;
      const entry = portfolio.guestbookEntries.find(e => e.id === entryId);

      if (!entry) {
        return failure(new NotFoundError('Guestbook entry not found'));
      }

      if (action === 'approve') {
        entry.status = 'approved';
        entry.approvedAt = new Date();
      } else {
        entry.status = 'rejected';
        entry.rejectedReason = reason;
      }

      portfolio.updatedAt = new Date();
      await this.savePortfolio(portfolio);

      return success(entry);
    } catch (error) {
      return failure(new ValidationError(`Failed to moderate entry: ${error}`));
    }
  }

  /**
   * Get approved guestbook entries for public display
   */
  async getPublicGuestbook(portfolioId: string): Promise<Result<GuestbookEntry[]>> {
    try {
      const portfolio = await this.loadPortfolio(portfolioId);

      if (!portfolio) {
        return failure(new NotFoundError('Portfolio not found'));
      }

      const approvedEntries = portfolio.guestbookEntries.filter(
        e => e.status === 'approved'
      );

      return success(approvedEntries);
    } catch (error) {
      return failure(new ValidationError(`Failed to get guestbook: ${error}`));
    }
  }

  // ============================================================================
  // AI PORTFOLIO ASSISTANT
  // ============================================================================

  /**
   * Generate AI skill tags based on journey artifacts
   * [FR-5.7] Skill Mapping AI
   */
  async generateSkillTags(
    tenantId: string,
    portfolioId: string
  ): Promise<Result<SkillTag[]>> {
    try {
      const portfolio = await this.loadPortfolio(portfolioId);
      if (!portfolio) {
        return failure(new NotFoundError('Portfolio not found'));
      }

      if (!this.aiService) {
        return failure(new ValidationError('AI service not available'));
      }

      // Gather all artifact data for analysis
      const artifactData = await this.gatherArtifactData(portfolio);

      const prompt = `Analyze this learner's Design & Pitch journey and identify demonstrated skills.

Journey Data:
${JSON.stringify(artifactData, null, 2)}

Identify 5-8 key skills demonstrated, focusing on:
- Design Thinking skills (empathy, ideation, prototyping)
- Technical skills shown in artifacts
- Communication skills from pitch and reflections
- Collaboration skills from peer review engagement
- Problem-solving approaches

For each skill, provide:
1. Skill name (e.g., "Rapid Prototyping", "User Empathy", "Data-Driven Persuasion")
2. Category (design_thinking, technical, communication, collaboration, problem_solving, research, creativity, leadership, data_analysis, user_empathy)
3. Confidence score (0-1)
4. Specific evidence from artifacts

Return as JSON array.`;

      const response = await this.aiService.complete({
        prompt,
        maxTokens: 2000,
        temperature: 0.3
      });

      const skillTags: SkillTag[] = this.parseSkillTagsResponse(response.data!.content, portfolio.id);

      // Update portfolio
      portfolio.aiSkillTags = skillTags;
      portfolio.updatedAt = new Date();
      await this.savePortfolio(portfolio);

      return success(skillTags);
    } catch (error) {
      return failure(new ValidationError(`Failed to generate skill tags: ${error}`));
    }
  }

  /**
   * Generate AI executive summary of the journey
   * [FR-5.8] Portfolio "Executive Summary" Generator
   */
  async generateExecutiveSummary(
    tenantId: string,
    portfolioId: string
  ): Promise<Result<{ summary: string; growthNarrative: string }>> {
    try {
      const portfolio = await this.loadPortfolio(portfolioId);
      if (!portfolio) {
        return failure(new NotFoundError('Portfolio not found'));
      }

      if (!this.aiService) {
        return failure(new ValidationError('AI service not available'));
      }

      // Gather journey data
      const journeyData = await this.gatherJourneyNarrative(portfolio);

      const prompt = `Generate a professional 200-word executive summary for this learner's Design & Pitch portfolio.

Journey Data:
- Problem Statement: ${journeyData.problemStatement}
- Key Iterations: ${journeyData.iterations}
- Final Pitch Summary: ${journeyData.pitchSummary}
- Peer Feedback Themes: ${journeyData.feedbackThemes}
- Growth Areas: ${journeyData.growthAreas}
- Curated Artifacts: ${journeyData.artifactSummary}

Write in third person, professional tone suitable for:
- College admissions
- Job applications
- Professional networking

Highlight:
1. The journey from problem identification to solution
2. Key growth moments and learning
3. Skills demonstrated
4. Impact and innovation shown

Also provide a separate "Growth Narrative" (100 words) specifically highlighting the transformation from initial problem statement to final pitch.`;

      const response = await this.aiService.complete({
        prompt,
        maxTokens: 800,
        temperature: 0.5
      });

      const { summary, growthNarrative } = this.parseExecutiveSummaryResponse(response.data!.content);

      // Update portfolio
      portfolio.aiExecutiveSummary = summary;
      portfolio.aiGrowthNarrative = growthNarrative;
      portfolio.updatedAt = new Date();
      await this.savePortfolio(portfolio);

      return success({ summary, growthNarrative });
    } catch (error) {
      return failure(new ValidationError(`Failed to generate summary: ${error}`));
    }
  }

  /**
   * Get AI curation suggestions
   * Analyze journey and suggest best artifacts to showcase
   */
  async getCurationSuggestions(
    tenantId: string,
    userId: string,
    portfolioId: string
  ): Promise<Result<CurationSuggestion[]>> {
    try {
      const portfolioResult = await this.getShowcase(tenantId, portfolioId, userId);
      if (!portfolioResult.success) {
        return portfolioResult;
      }

      const portfolio = portfolioResult.data!;

      if (!this.aiService) {
        return failure(new ValidationError('AI service not available'));
      }

      // Get all artifacts from journey
      const journeyArtifacts = await this.getJourneyArtifacts(portfolio.journeyId);

      const prompt = `Analyze these Design & Pitch journey artifacts and suggest which ones should be showcased.

Artifacts:
${JSON.stringify(journeyArtifacts, null, 2)}

Consider:
1. Growth demonstration (show delta between iterations)
2. Key learning moments
3. Peer feedback impact
4. Visual appeal for portfolio
5. Story coherence

For each suggestion, provide:
- Artifact ID and version to showcase
- Why it should be included
- Recommended reflection prompt
- Whether to show as before/after comparison
- Display order for narrative flow

Select 5-8 artifacts that tell the best story of growth.`;

      const response = await this.aiService.complete({
        prompt,
        maxTokens: 1500,
        temperature: 0.4
      });

      const suggestions = this.parseCurationSuggestions(response.data!.content);

      return success(suggestions);
    } catch (error) {
      return failure(new ValidationError(`Failed to get suggestions: ${error}`));
    }
  }

  /**
   * Analyze growth between initial and final artifacts
   */
  async analyzeGrowth(
    tenantId: string,
    portfolioId: string
  ): Promise<Result<GrowthAnalysis>> {
    try {
      const portfolio = await this.loadPortfolio(portfolioId);
      if (!portfolio) {
        return failure(new NotFoundError('Portfolio not found'));
      }

      if (!this.aiService) {
        return failure(new ValidationError('AI service not available'));
      }

      const journeyData = await this.gatherGrowthData(portfolio);

      const prompt = `Analyze the growth trajectory in this Design & Pitch journey.

Journey Data:
${JSON.stringify(journeyData, null, 2)}

Provide a comprehensive growth analysis including:
1. Overall growth score (0-100)
2. Growth areas with start/end points and percentage improvement
3. Key strengths identified
4. Challenges overcome
5. Journey highlights with significance
6. Recommended narrative for the portfolio

Focus on measurable growth and transformation.`;

      const response = await this.aiService.complete({
        prompt,
        maxTokens: 2000,
        temperature: 0.3
      });

      const analysis = this.parseGrowthAnalysis(response.data!.content);

      return success(analysis);
    } catch (error) {
      return failure(new ValidationError(`Failed to analyze growth: ${error}`));
    }
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Track portfolio view
   * Workflow Step 5: Analytics notification
   */
  async trackView(
    portfolioId: string,
    viewData: Partial<PortfolioViewEvent>
  ): Promise<Result<void>> {
    try {
      const portfolio = await this.loadPortfolio(portfolioId);
      if (!portfolio) {
        return success(undefined); // Silent fail for tracking
      }

      const viewEvent: PortfolioViewEvent = {
        id: crypto.randomUUID(),
        portfolioId,
        viewerFingerprint: viewData.viewerFingerprint || crypto.randomUUID(),
        source: viewData.source || 'direct',
        referrer: viewData.referrer,
        userAgent: viewData.userAgent || 'unknown',
        itemsViewed: viewData.itemsViewed || [],
        pitchDeckWatched: viewData.pitchDeckWatched || false,
        viewedAt: new Date(),
        ...viewData
      };

      // Update analytics
      portfolio.analytics.totalViews++;

      // Check if unique view
      const isUnique = await this.isUniqueViewer(portfolioId, viewEvent.viewerFingerprint);
      if (isUnique) {
        portfolio.analytics.uniqueViews++;
      }

      // Update by date
      const today = new Date().toISOString().split('T')[0];
      const dateEntry = portfolio.analytics.viewsByDate.find(v => v.date === today);
      if (dateEntry) {
        dateEntry.views++;
        if (isUnique) dateEntry.uniqueViews++;
      } else {
        portfolio.analytics.viewsByDate.push({
          date: today,
          views: 1,
          uniqueViews: isUnique ? 1 : 0
        });
      }

      // Update by location
      if (viewEvent.location) {
        const locationKey = `${viewEvent.location.city || 'Unknown'}, ${viewEvent.location.country}`;
        const locationEntry = portfolio.analytics.viewsByLocation.find(v => v.location === locationKey);
        if (locationEntry) {
          locationEntry.views++;
        } else {
          portfolio.analytics.viewsByLocation.push({
            location: locationKey,
            country: viewEvent.location.country,
            views: 1
          });
        }
      }

      // Update by source
      const sourceEntry = portfolio.analytics.viewsBySource.find(v => v.source === viewEvent.source);
      if (sourceEntry) {
        sourceEntry.views++;
      } else {
        portfolio.analytics.viewsBySource.push({
          source: viewEvent.source,
          referrer: viewEvent.referrer,
          views: 1
        });
      }

      portfolio.lastViewedAt = new Date();
      await this.savePortfolio(portfolio);

      // Store view event
      await this.saveViewEvent(viewEvent);

      // Send notification to owner (Workflow Step 5)
      if (viewEvent.location && portfolio.analytics.uniqueViews % 5 === 0) {
        this.eventBus?.emit('showcase.view_milestone', {
          portfolioId,
          userId: portfolio.userId,
          uniqueViews: portfolio.analytics.uniqueViews,
          location: viewEvent.location,
          timestamp: new Date()
        });
      }

      return success(undefined);
    } catch (error) {
      // Silent fail for tracking
      console.error('Failed to track view:', error);
      return success(undefined);
    }
  }

  /**
   * Get portfolio analytics
   */
  async getAnalytics(
    tenantId: string,
    userId: string,
    portfolioId: string
  ): Promise<Result<PortfolioAnalytics>> {
    try {
      const portfolioResult = await this.getShowcase(tenantId, portfolioId, userId);
      if (!portfolioResult.success) {
        return portfolioResult;
      }

      return success(portfolioResult.data!.analytics);
    } catch (error) {
      return failure(new ValidationError(`Failed to get analytics: ${error}`));
    }
  }

  // ============================================================================
  // SEO MANAGEMENT
  // ============================================================================

  /**
   * Update SEO settings
   * [Technical Requirement 3.1] SEO Management
   */
  async updateSEOSettings(
    tenantId: string,
    userId: string,
    portfolioId: string,
    seoSettings: Partial<SEOSettings>
  ): Promise<Result<SEOSettings>> {
    try {
      const portfolioResult = await this.getShowcase(tenantId, portfolioId, userId);
      if (!portfolioResult.success) {
        return portfolioResult;
      }

      const portfolio = portfolioResult.data!;
      portfolio.seoSettings = { ...portfolio.seoSettings, ...seoSettings };
      portfolio.updatedAt = new Date();

      await this.savePortfolio(portfolio);

      return success(portfolio.seoSettings);
    } catch (error) {
      return failure(new ValidationError(`Failed to update SEO settings: ${error}`));
    }
  }

  /**
   * Generate SEO metadata for public view
   */
  async generateSEOMetadata(portfolioId: string): Promise<Result<SEOMetadata>> {
    try {
      const portfolio = await this.loadPortfolio(portfolioId);
      if (!portfolio || portfolio.status !== 'published') {
        return failure(new NotFoundError('Portfolio not found'));
      }

      const metadata: SEOMetadata = {
        title: portfolio.seoSettings.metaTitle || `${portfolio.title} | Design & Pitch Portfolio`,
        description: portfolio.seoSettings.metaDescription ||
          portfolio.aiExecutiveSummary?.substring(0, 160) ||
          `View ${portfolio.title}'s design and pitch portfolio showcasing their innovation journey.`,
        ogImage: portfolio.seoSettings.ogImage || await this.generateOGImage(portfolio),
        ogType: 'profile',
        twitterCard: 'summary_large_image',
        canonicalUrl: portfolio.seoSettings.canonicalUrl || portfolio.fullUrl,
        robots: portfolio.seoSettings.noIndex ? 'noindex, nofollow' : 'index, follow',
        keywords: portfolio.seoSettings.keywords.join(', '),
        structuredData: this.generateStructuredData(portfolio)
      };

      return success(metadata);
    } catch (error) {
      return failure(new ValidationError(`Failed to generate SEO metadata: ${error}`));
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async validateJourneyOwnership(
    tenantId: string,
    userId: string,
    journeyId: string
  ): Promise<Result<void>> {
    // In production, validate against Design & Pitch journey
    return success(undefined);
  }

  private async validateArtifact(
    tenantId: string,
    artifactId: string,
    journeyId: string
  ): Promise<Result<{ phase: string; iteration: number }>> {
    // In production, validate artifact exists and get metadata
    return success({ phase: 'iterate', iteration: 1 });
  }

  private async validatePitchDeck(
    tenantId: string,
    deckId: string,
    journeyId: string
  ): Promise<Result<void>> {
    // In production, validate deck exists
    return success(undefined);
  }

  private async generateUniqueSlug(preferred: string | undefined, userId: string): Promise<string> {
    const base = preferred
      ? this.sanitizeSlug(preferred)
      : `portfolio-${userId.substring(0, 8)}`;

    let slug = base;
    let counter = 0;

    while (await this.loadPortfolioBySlug(slug)) {
      counter++;
      slug = `${base}-${counter}`;
    }

    return slug;
  }

  private sanitizeSlug(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private getDefaultTheme(): ShowcaseTheme {
    return {
      layout: 'timeline',
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      accentColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter, system-ui, sans-serif',
      headerStyle: 'hero',
      cardStyle: 'elevated',
      showGrowthTimeline: true
    };
  }

  private initializeAnalytics(): PortfolioAnalytics {
    return {
      totalViews: 0,
      uniqueViews: 0,
      viewsByDate: [],
      viewsByLocation: [],
      viewsBySource: [],
      averageTimeOnPage: 0,
      pitchDeckViews: 0,
      pitchDeckCompletionRate: 0,
      mostViewedItems: [],
      guestbookConversionRate: 0,
      shareClicks: 0,
      downloadRequests: 0
    };
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private generateEmbedCode(
    portfolioId: string,
    deckId: string,
    token: string,
    config: PitchDeckEmbedConfig
  ): string {
    return `<iframe
  src="${this.BASE_URL}/embed/${portfolioId}/deck/${token}"
  width="100%"
  height="600"
  frameborder="0"
  allowfullscreen="${config.allowFullscreen ?? true}"
  allow="autoplay; fullscreen"
></iframe>`;
  }

  private async gatherArtifactData(portfolio: ShowcasePortfolio): Promise<unknown> {
    // Gather all artifact data for AI analysis
    return {
      items: portfolio.items.map(item => ({
        phase: item.journeyPhase,
        iteration: item.iterationNumber,
        reflection: item.reflection
      })),
      itemCount: portfolio.items.length
    };
  }

  private async gatherJourneyNarrative(portfolio: ShowcasePortfolio): Promise<unknown> {
    return {
      problemStatement: 'User journey problem',
      iterations: portfolio.items.length,
      pitchSummary: 'Final pitch summary',
      feedbackThemes: ['theme1', 'theme2'],
      growthAreas: ['area1', 'area2'],
      artifactSummary: `${portfolio.items.length} artifacts curated`
    };
  }

  private async gatherGrowthData(portfolio: ShowcasePortfolio): Promise<unknown> {
    return {
      items: portfolio.items,
      reflections: portfolio.items.map(i => i.reflection),
      phases: [...new Set(portfolio.items.map(i => i.journeyPhase))]
    };
  }

  private async getJourneyArtifacts(journeyId: string): Promise<unknown[]> {
    // Get artifacts from Design & Pitch journey
    return [];
  }

  private async getArtifactDetails(artifactId: string): Promise<unknown> {
    return { id: artifactId };
  }

  private parseSkillTagsResponse(content: string, portfolioId: string): SkillTag[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((skill: any) => ({
          id: crypto.randomUUID(),
          name: skill.name || skill.skill,
          category: skill.category || 'problem_solving',
          confidence: skill.confidence || 0.7,
          evidence: skill.evidence || [],
          isVerified: false
        }));
      }
    } catch (e) {
      console.error('Failed to parse skill tags:', e);
    }
    return [];
  }

  private parseExecutiveSummaryResponse(content: string): { summary: string; growthNarrative: string } {
    // Parse AI response for summary sections
    const summaryMatch = content.match(/Summary[:\s]*([\s\S]*?)(?=Growth|$)/i);
    const growthMatch = content.match(/Growth[:\s]*([\s\S]*?)$/i);

    return {
      summary: summaryMatch ? summaryMatch[1].trim() : content.substring(0, 600),
      growthNarrative: growthMatch ? growthMatch[1].trim() : ''
    };
  }

  private parseCurationSuggestions(content: string): CurationSuggestion[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse suggestions:', e);
    }
    return [];
  }

  private parseGrowthAnalysis(content: string): GrowthAnalysis {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse growth analysis:', e);
    }
    return {
      overallGrowthScore: 75,
      growthAreas: [],
      strengthsIdentified: [],
      challengesOvercome: [],
      journeyHighlights: [],
      recommendedNarrative: ''
    };
  }

  private async isUniqueViewer(portfolioId: string, fingerprint: string): Promise<boolean> {
    // Check if this fingerprint has viewed before
    return true; // Simplified for now
  }

  private async generateOGImage(portfolio: ShowcasePortfolio): Promise<string> {
    // Generate Open Graph image
    return `${this.BASE_URL}/og/${portfolio.id}.png`;
  }

  private generateStructuredData(portfolio: ShowcasePortfolio): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: portfolio.title,
      description: portfolio.aiExecutiveSummary,
      url: portfolio.fullUrl,
      author: {
        '@type': 'Person',
        name: portfolio.title
      },
      datePublished: portfolio.publishedAt?.toISOString(),
      keywords: portfolio.seoSettings.keywords.join(', ')
    };
  }

  // Database operations (would use Prisma in production)
  private async savePortfolio(portfolio: ShowcasePortfolio): Promise<void> {
    // Save to database
  }

  private async loadPortfolio(portfolioId: string): Promise<ShowcasePortfolio | null> {
    // Load from database
    return null;
  }

  private async loadPortfolioBySlug(slug: string): Promise<ShowcasePortfolio | null> {
    // Load from database by slug
    return null;
  }

  private async saveAccessLink(link: AccessLink): Promise<void> {
    // Save access link
  }

  private async loadAccessLink(token: string): Promise<AccessLink | null> {
    // Load access link
    return null;
  }

  private async saveViewEvent(event: PortfolioViewEvent): Promise<void> {
    // Save view event for analytics
  }
}

// ============================================================================
// INPUT/OUTPUT TYPES
// ============================================================================

export interface CreateShowcaseInput {
  title: string;
  headline?: string;
  preferredSlug?: string;
  theme?: Partial<ShowcaseTheme>;
}

export interface UpdateShowcaseInput {
  title?: string;
  headline?: string;
  themeConfig?: Partial<ShowcaseTheme>;
  seoSettings?: Partial<SEOSettings>;
  guestbookEnabled?: boolean;
}

export interface PublishSettings {
  isPublic: boolean;
  password?: string;
  expiresAt?: Date;
  allowedEmails?: string[];
  allowIndexing?: boolean;
}

export interface AddItemInput {
  artifactId: string;
  version?: number;
  isFeatured?: boolean;
  showBeforeAfter?: boolean;
  beforeArtifactId?: string;
}

export interface ReflectionInput {
  content: string;
  promptUsed?: string;
  sentiment?: 'growth' | 'challenge' | 'insight' | 'achievement';
  learningOutcomes?: string[];
  peerFeedbackInfluence?: string;
  keyTakeaways?: string[];
}

export interface PitchDeckEmbedConfig {
  autoPlay?: boolean;
  showControls?: boolean;
  allowFullscreen?: boolean;
  slideTransition?: 'slide' | 'fade' | 'none';
  viewerTheme?: 'light' | 'dark' | 'auto';
}

export interface AccessLinkConfig {
  type: 'public' | 'password' | 'email' | 'time_limited';
  password?: string;
  allowedEmails?: string[];
  expiresAt?: Date;
  maxUses?: number;
}

export interface GuestbookEntryInput {
  name: string;
  email?: string;
  organization?: string;
  role?: string;
  message: string;
  rating?: number;
  impressionTags?: string[];
}

export interface ViewerContext {
  location?: ViewerLocation;
  fingerprint?: string;
  userAgent?: string;
  referrer?: string;
}

export interface SEOMetadata {
  title: string;
  description: string;
  ogImage: string;
  ogType: string;
  twitterCard: string;
  canonicalUrl: string;
  robots: string;
  keywords: string;
  structuredData: object;
}

// ============================================================================
// SERVICE INITIALIZATION
// ============================================================================

export function initializeShowcasePortfolioService(config: ScholarlyConfig): ShowcasePortfolioService {
  if (!serviceInstance) {
    serviceInstance = new ShowcasePortfolioService(config);
  }
  return serviceInstance;
}

export function getShowcasePortfolioService(): ShowcasePortfolioService | null {
  return serviceInstance;
}
