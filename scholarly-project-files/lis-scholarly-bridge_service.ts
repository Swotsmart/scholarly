/**
 * LIS â†” Scholarly Integration Bridge
 * 
 * Connects the Learner Intelligence System (cognitive model) with Scholarly
 * services (curriculum, tutoring, scheduling) to create a unified intelligent
 * learning ecosystem.
 * 
 * ## The Granny Explanation
 * 
 * Imagine you have two brilliant specialists:
 * - **LIS**: A psychologist who deeply understands HOW each child learns,
 *   what they know, what they struggle with, and how they're feeling
 * - **Scholarly**: A master educator who knows WHAT to teach, has access
 *   to tutors, curriculum standards, and learning resources
 * 
 * This bridge lets them work together seamlessly:
 * - "LIS says Sarah struggles with fractions â†’ Find a tutor strong in fractions"
 * - "Knowledge Graph shows gap in ACMNA077 â†’ Add to learning pathway"
 * - "Affective state is frustrated â†’ Reduce difficulty, add encouragement"
 * - "Forecast predicts mastery in 3 weeks â†’ Schedule assessment accordingly"
 * 
 * @module LISScholarlyBridge
 */

import {
  ScholarlyBaseService, Result, success, failure, ValidationError, NotFoundError,
  Validator, EventBus, Cache, ScholarlyConfig
} from '../shared/types';

// ============================================================================
// LIS TYPES (References to LIS service types)
// ============================================================================

export interface KnowledgeGraphSummary {
  learnerId: string;
  competencies: {
    id: string;
    curriculumCode?: string;
    name: string;
    masteryLevel: number;
    lastAssessed: Date;
    trend: 'improving' | 'stable' | 'declining';
  }[];
  gaps: {
    competencyId: string;
    curriculumCode?: string;
    name: string;
    currentMastery: number;
    targetMastery: number;
    gap: number;
    prerequisitesComplete: boolean;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }[];
  strengths: {
    competencyId: string;
    name: string;
    masteryLevel: number;
    couldTeachOthers: boolean;
  }[];
  misconceptions: {
    competencyId: string;
    description: string;
    severity: 'minor' | 'moderate' | 'significant';
    suggestedRemediation: string;
  }[];
  lastUpdated: Date;
}

export interface AffectiveState {
  learnerId: string;
  currentState: 'flow' | 'curious' | 'bored' | 'productive_confusion' | 'frustrated' | 'anxious' | 'defeated' | 'triumphant';
  confidence: number;
  recentSignals: { type: string; value: number; timestamp: Date }[];
  recommendations: { action: string; rationale: string; priority: 'immediate' | 'soon' | 'consider' }[];
  optimalDifficulty: number;
  currentDifficulty: number;
  adjustment: 'increase' | 'maintain' | 'decrease';
  lastUpdated: Date;
}

export interface LearningForecast {
  learnerId: string;
  competencyId: string;
  masteryPrediction: {
    currentLevel: number;
    predictedLevel: number;
    targetLevel: number;
    predictedDate: Date;
    confidence: number;
  };
  risk: {
    level: 'low' | 'moderate' | 'high';
    factors: string[];
    interventionSuggestions: string[];
  };
  practiceRecommendations: {
    frequency: string;
    duration: string;
    focusAreas: string[];
    estimatedTimeToMastery: number;
  };
  generatedAt: Date;
}

export interface JourneyPathway {
  id: string;
  learnerId: string;
  goal: string;
  steps: {
    id: string;
    competencyId: string;
    curriculumCode?: string;
    title: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
    estimatedHours: number;
  }[];
  progressPercent: number;
  currentStep: string;
  adaptations: { reason: string; change: string; appliedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// BRIDGE TYPES
// ============================================================================

export interface LearnerScholarlyProfile {
  learnerId: string;
  tenantId: string;
  
  // Links to external systems
  lisProfileId?: string;
  homeschoolChildId?: string;
  schoolStudentId?: string;
  
  // Privacy settings
  privacySettings: PrivacySettings;
  
  // Cached summaries
  cachedKnowledgeSummary?: KnowledgeGraphSummary;
  cachedAffectiveState?: AffectiveState;
  cachedForecasts?: LearningForecast[];
  cacheUpdatedAt?: Date;
  
  // Integration status
  integrationStatus: {
    lisConnected: boolean;
    curriculumMapped: boolean;
    tutorMatchingEnabled: boolean;
    lastSyncAt?: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PrivacySettings {
  shareKnowledgeGraph: boolean;
  shareAffectiveState: boolean;
  shareForecast: boolean;
  shareWithTutors: boolean;
  shareWithTeachers: boolean;
  shareWithParents: boolean;
}

export interface GapToTutorMatch {
  gap: {
    competencyId: string;
    curriculumCode?: string;
    name: string;
    currentMastery: number;
    targetMastery: number;
    priority: string;
  };
  recommendedTutors: {
    tutorId: string;
    tutorName: string;
    matchScore: number;
    matchReasons: string[];
    relevantQualifications: string[];
    availability: string[];
    hourlyRate: number;
  }[];
  recommendedResources: {
    resourceId: string;
    title: string;
    type: string;
    relevanceScore: number;
    curriculumAlignment: string[];
  }[];
  recommendedApproach: {
    suggestedDifficulty: number;
    learningStyle: string;
    sessionDuration: number;
    frequencyPerWeek: number;
    estimatedSessions: number;
  };
}

export interface CurriculumAlignedPathway {
  learnerId: string;
  
  // Goal
  targetCompetency: {
    curriculumCode: string;
    name: string;
    description: string;
    targetMastery: number;
  };
  
  // Pathway
  steps: PathwayStep[];
  
  // Timing
  estimatedTotalHours: number;
  suggestedCompletionDate: Date;
  
  // Resources
  suggestedResources: {
    stepId: string;
    resources: { id: string; title: string; type: string }[];
  }[];
  
  // Tutoring opportunities
  tutoringOpportunities: {
    stepId: string;
    recommendation: string;
    urgency: 'optional' | 'recommended' | 'strongly_recommended';
  }[];
  
  // AI metadata
  aiConfidence: number;
  generatedAt: Date;
}

export interface PathwayStep {
  id: string;
  sequence: number;
  
  // Content
  curriculumCode: string;
  title: string;
  description: string;
  
  // Requirements
  prerequisiteCodes: string[];
  prerequisitesMet: boolean;
  
  // Timing
  estimatedHours: number;
  suggestedStartDate?: Date;
  
  // Difficulty calibration (from LIS)
  suggestedDifficulty: number;
  difficultyRationale: string;
  
  // Status
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  masteryLevel?: number;
}

export interface AffectiveAwareSchedule {
  learnerId: string;
  
  // Current state consideration
  currentAffectiveState: string;
  stateConsiderations: string[];
  
  // Recommended schedule
  recommendedSessions: {
    date: string;
    startTime: string;
    endTime: string;
    subject: string;
    curriculumCode?: string;
    difficulty: number;
    activityType: 'new_content' | 'practice' | 'review' | 'assessment' | 'enrichment';
    rationale: string;
  }[];
  
  // Breaks and recovery
  suggestedBreaks: {
    afterSession: number;
    duration: number;
    activitySuggestion: string;
  }[];
  
  // Alerts
  alerts: {
    type: 'burnout_risk' | 'engagement_low' | 'difficulty_mismatch' | 'progress_stall';
    message: string;
    suggestion: string;
  }[];
}

export interface PredictiveIntervention {
  id: string;
  learnerId: string;
  
  // Trigger
  trigger: {
    type: 'gap_widening' | 'engagement_declining' | 'mastery_plateau' | 'misconception_detected' | 'forecast_risk';
    detectedAt: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: string;
  };
  
  // Recommended interventions
  interventions: {
    type: 'tutor_session' | 'resource_recommendation' | 'difficulty_adjustment' | 'break_suggestion' | 'parent_notification' | 'teacher_alert';
    priority: number;
    description: string;
    estimatedImpact: string;
    resources?: { id: string; title: string }[];
    tutorRecommendations?: { tutorId: string; tutorName: string }[];
  }[];
  
  // Status
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolution?: string;
  
  createdAt: Date;
}

export interface CrossSystemAnalytics {
  learnerId: string;
  period: { from: Date; to: Date };
  
  // Learning progress
  learningProgress: {
    competenciesStarted: number;
    competenciesCompleted: number;
    averageMasteryGain: number;
    totalLearningHours: number;
    mostImprovedAreas: string[];
    needsAttentionAreas: string[];
  };
  
  // Engagement metrics
  engagement: {
    averageAffectiveState: string;
    flowStatePercentage: number;
    frustrationIncidents: number;
    engagementTrend: 'improving' | 'stable' | 'declining';
  };
  
  // Tutoring effectiveness
  tutoringEffectiveness: {
    sessionsCompleted: number;
    averageRating: number;
    masteryGainPerSession: number;
    mostEffectiveTutors: { tutorId: string; tutorName: string; effectivenessScore: number }[];
  };
  
  // Resource usage
  resourceUsage: {
    resourcesAccessed: number;
    resourcesCompleted: number;
    mostUsedTypes: string[];
    highestRatedResources: { id: string; title: string; rating: number }[];
  };
  
  // Forecasts vs actuals
  forecastAccuracy: {
    predictionsGenerated: number;
    accurateWithin10Percent: number;
    accuracyScore: number;
  };
  
  // Recommendations
  recommendations: {
    category: string;
    recommendation: string;
    expectedImpact: string;
  }[];
  
  generatedAt: Date;
}

// ============================================================================
// REPOSITORIES / SERVICE INTERFACES
// ============================================================================

export interface LISServiceInterface {
  getKnowledgeGraphSummary(tenantId: string, learnerId: string): Promise<KnowledgeGraphSummary | null>;
  getAffectiveState(tenantId: string, learnerId: string): Promise<AffectiveState | null>;
  getForecasts(tenantId: string, learnerId: string, competencyIds?: string[]): Promise<LearningForecast[]>;
  getJourneyPathway(tenantId: string, learnerId: string): Promise<JourneyPathway | null>;
  updateCompetencyFromCurriculum(tenantId: string, learnerId: string, curriculumCode: string, mastery: number): Promise<void>;
}

export interface CurriculumServiceInterface {
  getContentDescription(tenantId: string, code: string): Promise<any | null>;
  getPrerequisites(tenantId: string, code: string): Promise<string[]>;
  getLearningProgression(tenantId: string, code: string): Promise<any>;
  searchBySubject(tenantId: string, subject: string, yearLevel: string): Promise<any[]>;
}

export interface TutorServiceInterface {
  findTutors(tenantId: string, criteria: any): Promise<any[]>;
  getAvailability(tenantId: string, tutorId: string): Promise<any>;
}

export interface ContentMarketplaceInterface {
  searchContent(tenantId: string, criteria: any): Promise<any[]>;
}

export interface BridgeProfileRepository {
  findByLearnerId(tenantId: string, learnerId: string): Promise<LearnerScholarlyProfile | null>;
  save(tenantId: string, profile: LearnerScholarlyProfile): Promise<LearnerScholarlyProfile>;
  update(tenantId: string, learnerId: string, updates: Partial<LearnerScholarlyProfile>): Promise<LearnerScholarlyProfile>;
}

export interface InterventionRepository {
  findByLearnerId(tenantId: string, learnerId: string): Promise<PredictiveIntervention[]>;
  findPending(tenantId: string): Promise<PredictiveIntervention[]>;
  save(tenantId: string, intervention: PredictiveIntervention): Promise<PredictiveIntervention>;
  update(tenantId: string, id: string, updates: Partial<PredictiveIntervention>): Promise<PredictiveIntervention>;
}

// ============================================================================
// SERVICE
// ============================================================================

export class LISScholarlyBridge extends ScholarlyBaseService {
  private readonly profileRepo: BridgeProfileRepository;
  private readonly interventionRepo: InterventionRepository;
  private readonly lisService: LISServiceInterface;
  private readonly curriculumService: CurriculumServiceInterface;
  private readonly tutorService: TutorServiceInterface;
  private readonly contentService: ContentMarketplaceInterface;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    profileRepo: BridgeProfileRepository;
    interventionRepo: InterventionRepository;
    lisService: LISServiceInterface;
    curriculumService: CurriculumServiceInterface;
    tutorService: TutorServiceInterface;
    contentService: ContentMarketplaceInterface;
  }) {
    super('LISScholarlyBridge', deps);
    this.profileRepo = deps.profileRepo;
    this.interventionRepo = deps.interventionRepo;
    this.lisService = deps.lisService;
    this.curriculumService = deps.curriculumService;
    this.tutorService = deps.tutorService;
    this.contentService = deps.contentService;
  }

  // ==========================================================================
  // PROFILE MANAGEMENT
  // ==========================================================================

  /**
   * Create or update learner's Scholarly profile with LIS integration
   */
  async connectLearnerProfile(
    tenantId: string,
    data: {
      learnerId: string;
      lisProfileId?: string;
      homeschoolChildId?: string;
      schoolStudentId?: string;
      privacySettings: PrivacySettings;
    }
  ): Promise<Result<LearnerScholarlyProfile>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.learnerId, 'learnerId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('connectLearnerProfile', tenantId, async () => {
      // Check if profile exists
      let profile = await this.profileRepo.findByLearnerId(tenantId, data.learnerId);

      if (profile) {
        // Update existing
        profile = await this.profileRepo.update(tenantId, data.learnerId, {
          lisProfileId: data.lisProfileId,
          homeschoolChildId: data.homeschoolChildId,
          schoolStudentId: data.schoolStudentId,
          privacySettings: data.privacySettings,
          integrationStatus: {
            ...profile.integrationStatus,
            lisConnected: !!data.lisProfileId,
            lastSyncAt: new Date()
          },
          updatedAt: new Date()
        });
      } else {
        // Create new
        profile = await this.profileRepo.save(tenantId, {
          learnerId: data.learnerId,
          tenantId,
          lisProfileId: data.lisProfileId,
          homeschoolChildId: data.homeschoolChildId,
          schoolStudentId: data.schoolStudentId,
          privacySettings: data.privacySettings,
          integrationStatus: {
            lisConnected: !!data.lisProfileId,
            curriculumMapped: false,
            tutorMatchingEnabled: data.privacySettings.shareWithTutors,
            lastSyncAt: new Date()
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Sync LIS data if connected
      if (data.lisProfileId) {
        await this.syncLISData(tenantId, data.learnerId);
      }

      await this.publishEvent('scholarly.bridge.profile_connected', tenantId, {
        learnerId: data.learnerId,
        lisConnected: !!data.lisProfileId
      });

      return profile;
    }, { learnerId: data.learnerId });
  }

  /**
   * Sync LIS data to cached summaries
   */
  async syncLISData(
    tenantId: string,
    learnerId: string
  ): Promise<Result<{
    knowledgeSynced: boolean;
    affectiveSynced: boolean;
    forecastsSynced: boolean;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(learnerId, 'learnerId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('syncLISData', tenantId, async () => {
      const profile = await this.profileRepo.findByLearnerId(tenantId, learnerId);
      if (!profile?.lisProfileId) {
        return { knowledgeSynced: false, affectiveSynced: false, forecastsSynced: false };
      }

      const updates: Partial<LearnerScholarlyProfile> = {};
      let knowledgeSynced = false;
      let affectiveSynced = false;
      let forecastsSynced = false;

      // Sync knowledge graph
      if (profile.privacySettings.shareKnowledgeGraph) {
        const knowledge = await this.lisService.getKnowledgeGraphSummary(tenantId, learnerId);
        if (knowledge) {
          updates.cachedKnowledgeSummary = knowledge;
          knowledgeSynced = true;
        }
      }

      // Sync affective state
      if (profile.privacySettings.shareAffectiveState) {
        const affective = await this.lisService.getAffectiveState(tenantId, learnerId);
        if (affective) {
          updates.cachedAffectiveState = affective;
          affectiveSynced = true;
        }
      }

      // Sync forecasts
      if (profile.privacySettings.shareForecast) {
        const forecasts = await this.lisService.getForecasts(tenantId, learnerId);
        if (forecasts.length > 0) {
          updates.cachedForecasts = forecasts;
          forecastsSynced = true;
        }
      }

      updates.cacheUpdatedAt = new Date();
      updates.integrationStatus = {
        ...profile.integrationStatus,
        lastSyncAt: new Date()
      };

      await this.profileRepo.update(tenantId, learnerId, updates);

      return { knowledgeSynced, affectiveSynced, forecastsSynced };
    }, { learnerId });
  }

  // ==========================================================================
  // GAP-TO-TUTOR MATCHING
  // ==========================================================================

  /**
   * Match knowledge gaps to tutors and resources
   * 
   * This is the core intelligence: taking LIS gaps and finding the best
   * tutors, resources, and approaches to address them.
   */
  async matchGapsToSupport(
    tenantId: string,
    learnerId: string,
    options?: {
      maxGaps?: number;
      priorityThreshold?: 'critical' | 'high' | 'medium' | 'low';
      includeTutors?: boolean;
      includeResources?: boolean;
    }
  ): Promise<Result<{
    matches: GapToTutorMatch[];
    overallStrategy: string;
    estimatedTimeToClose: number;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(learnerId, 'learnerId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('matchGapsToSupport', tenantId, async () => {
      // Get learner's knowledge summary
      const profile = await this.profileRepo.findByLearnerId(tenantId, learnerId);
      if (!profile) throw new NotFoundError('Profile', learnerId);

      // Ensure we have fresh data
      await this.syncLISData(tenantId, learnerId);

      const knowledge = profile.cachedKnowledgeSummary;
      if (!knowledge) {
        return { matches: [], overallStrategy: 'No knowledge data available', estimatedTimeToClose: 0 };
      }

      const affective = profile.cachedAffectiveState;

      // Filter gaps by priority
      const priorityOrder = ['critical', 'high', 'medium', 'low'];
      const thresholdIndex = priorityOrder.indexOf(options?.priorityThreshold || 'low');
      const relevantGaps = knowledge.gaps
        .filter(g => priorityOrder.indexOf(g.priority) <= thresholdIndex)
        .slice(0, options?.maxGaps || 5);

      const matches: GapToTutorMatch[] = [];

      for (const gap of relevantGaps) {
        const match: GapToTutorMatch = {
          gap,
          recommendedTutors: [],
          recommendedResources: [],
          recommendedApproach: this.determineApproach(gap, affective)
        };

        // Find tutors if enabled
        if (options?.includeTutors !== false && profile.privacySettings.shareWithTutors) {
          const tutors = await this.findTutorsForGap(tenantId, gap, affective);
          match.recommendedTutors = tutors;
        }

        // Find resources if enabled
        if (options?.includeResources !== false) {
          const resources = await this.findResourcesForGap(tenantId, gap);
          match.recommendedResources = resources;
        }

        matches.push(match);
      }

      // Generate overall strategy
      const overallStrategy = this.generateOverallStrategy(matches, affective);

      // Estimate time to close gaps
      const estimatedTimeToClose = matches.reduce(
        (sum, m) => sum + m.recommendedApproach.estimatedSessions * (m.recommendedApproach.sessionDuration / 60),
        0
      );

      await this.publishEvent('scholarly.bridge.gaps_matched', tenantId, {
        learnerId,
        gapsAnalyzed: matches.length,
        tutorsRecommended: matches.reduce((sum, m) => sum + m.recommendedTutors.length, 0)
      });

      return { matches, overallStrategy, estimatedTimeToClose };
    }, { learnerId });
  }

  // ==========================================================================
  // CURRICULUM-ALIGNED PATHWAYS
  // ==========================================================================

  /**
   * Generate a curriculum-aligned learning pathway based on LIS data
   */
  async generateCurriculumPathway(
    tenantId: string,
    learnerId: string,
    targetCode: string,
    options?: {
      maxSteps?: number;
      includeRemediation?: boolean;
      respectAffectiveState?: boolean;
    }
  ): Promise<Result<CurriculumAlignedPathway>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(learnerId, 'learnerId');
      Validator.required(targetCode, 'targetCode');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateCurriculumPathway', tenantId, async () => {
      // Get learner data
      const profile = await this.profileRepo.findByLearnerId(tenantId, learnerId);
      const knowledge = profile?.cachedKnowledgeSummary;
      const affective = profile?.cachedAffectiveState;

      // Get curriculum content
      const targetContent = await this.curriculumService.getContentDescription(tenantId, targetCode);
      if (!targetContent) throw new NotFoundError('Curriculum', targetCode);

      // Get prerequisite chain
      const prerequisites = await this.curriculumService.getPrerequisites(tenantId, targetCode);

      // Build pathway steps
      const steps: PathwayStep[] = [];
      let sequence = 1;

      // Add prerequisite steps if needed
      if (options?.includeRemediation !== false) {
        for (const prereqCode of prerequisites) {
          const prereqContent = await this.curriculumService.getContentDescription(tenantId, prereqCode);
          const mastery = this.findMasteryLevel(knowledge, prereqCode);

          if (mastery < 70) {  // Need to work on this prerequisite
            const difficulty = this.calibrateDifficulty(mastery, affective, options?.respectAffectiveState);
            
            steps.push({
              id: this.generateId('step'),
              sequence: sequence++,
              curriculumCode: prereqCode,
              title: prereqContent?.title || prereqCode,
              description: prereqContent?.description || '',
              prerequisiteCodes: [],
              prerequisitesMet: true,
              estimatedHours: this.estimateHours(mastery, 70),
              suggestedDifficulty: difficulty,
              difficultyRationale: this.explainDifficulty(mastery, affective),
              status: mastery > 0 ? 'in_progress' : 'available',
              masteryLevel: mastery
            });
          }
        }
      }

      // Add target step
      const targetMastery = this.findMasteryLevel(knowledge, targetCode);
      const targetDifficulty = this.calibrateDifficulty(targetMastery, affective, options?.respectAffectiveState);

      steps.push({
        id: this.generateId('step'),
        sequence: sequence++,
        curriculumCode: targetCode,
        title: targetContent.title || targetCode,
        description: targetContent.description || '',
        prerequisiteCodes: prerequisites,
        prerequisitesMet: steps.filter(s => s.status !== 'completed').length === 0,
        estimatedHours: this.estimateHours(targetMastery, 80),
        suggestedDifficulty: targetDifficulty,
        difficultyRationale: this.explainDifficulty(targetMastery, affective),
        status: steps.length === 0 ? 'available' : 'locked',
        masteryLevel: targetMastery
      });

      // Calculate totals
      const estimatedTotalHours = steps.reduce((sum, s) => sum + s.estimatedHours, 0);
      const suggestedCompletionDate = new Date();
      suggestedCompletionDate.setDate(suggestedCompletionDate.getDate() + Math.ceil(estimatedTotalHours / 2) * 7);

      // Find resources for each step
      const suggestedResources = await Promise.all(
        steps.map(async step => ({
          stepId: step.id,
          resources: await this.findResourcesForGap(tenantId, {
            competencyId: step.id,
            curriculumCode: step.curriculumCode,
            name: step.title,
            currentMastery: step.masteryLevel || 0,
            targetMastery: 80,
            gap: 80 - (step.masteryLevel || 0),
            prerequisitesComplete: step.prerequisitesMet,
            priority: 'medium'
          })
        }))
      );

      // Identify tutoring opportunities
      const tutoringOpportunities = steps
        .filter(s => (s.masteryLevel || 0) < 40 || s.suggestedDifficulty > 70)
        .map(s => ({
          stepId: s.id,
          recommendation: `Consider tutoring support for ${s.title}`,
          urgency: (s.masteryLevel || 0) < 20 ? 'strongly_recommended' as const : 'recommended' as const
        }));

      const pathway: CurriculumAlignedPathway = {
        learnerId,
        targetCompetency: {
          curriculumCode: targetCode,
          name: targetContent.title || targetCode,
          description: targetContent.description || '',
          targetMastery: 80
        },
        steps,
        estimatedTotalHours,
        suggestedCompletionDate,
        suggestedResources,
        tutoringOpportunities,
        aiConfidence: 0.85,
        generatedAt: new Date()
      };

      await this.publishEvent('scholarly.bridge.pathway_generated', tenantId, {
        learnerId,
        targetCode,
        steps: steps.length,
        estimatedHours: estimatedTotalHours
      });

      return pathway;
    }, { learnerId, targetCode });
  }

  // ==========================================================================
  // AFFECTIVE-AWARE SCHEDULING
  // ==========================================================================

  /**
   * Generate a schedule that respects the learner's affective state
   */
  async generateAffectiveAwareSchedule(
    tenantId: string,
    learnerId: string,
    period: { startDate: string; endDate: string },
    options?: {
      dailyHoursLimit?: number;
      preferredTimes?: string[];
      subjects?: string[];
    }
  ): Promise<Result<AffectiveAwareSchedule>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(learnerId, 'learnerId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateAffectiveAwareSchedule', tenantId, async () => {
      const profile = await this.profileRepo.findByLearnerId(tenantId, learnerId);
      const affective = profile?.cachedAffectiveState;
      const knowledge = profile?.cachedKnowledgeSummary;

      const currentState = affective?.currentState || 'curious';
      const stateConsiderations = this.getStateConsiderations(currentState);

      // Generate sessions
      const sessions = this.generateSessions(
        period,
        knowledge,
        affective,
        options
      );

      // Generate break recommendations
      const suggestedBreaks = this.generateBreakRecommendations(currentState);

      // Generate alerts
      const alerts = this.generateScheduleAlerts(affective, knowledge);

      return {
        learnerId,
        currentAffectiveState: currentState,
        stateConsiderations,
        recommendedSessions: sessions,
        suggestedBreaks,
        alerts
      };
    }, { learnerId });
  }

  // ==========================================================================
  // PREDICTIVE INTERVENTIONS
  // ==========================================================================

  /**
   * Scan for learners needing intervention and generate recommendations
   */
  async scanForInterventions(
    tenantId: string,
    options?: {
      learnerIds?: string[];
      severityThreshold?: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<Result<{
    interventionsGenerated: PredictiveIntervention[];
    learnersScanned: number;
    learnersNeedingIntervention: number;
  }>> {
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('scanForInterventions', tenantId, async () => {
      const interventionsGenerated: PredictiveIntervention[] = [];
      const learnerIds = options?.learnerIds || [];  // Would fetch all active learners
      let learnersNeedingIntervention = 0;

      for (const learnerId of learnerIds) {
        const interventions = await this.checkLearnerForInterventions(tenantId, learnerId);
        
        const filteredInterventions = interventions.filter(i => {
          const severityOrder = ['low', 'medium', 'high', 'critical'];
          const threshold = options?.severityThreshold || 'medium';
          return severityOrder.indexOf(i.trigger.severity) >= severityOrder.indexOf(threshold);
        });

        if (filteredInterventions.length > 0) {
          learnersNeedingIntervention++;
          for (const intervention of filteredInterventions) {
            const saved = await this.interventionRepo.save(tenantId, intervention);
            interventionsGenerated.push(saved);
          }
        }
      }

      await this.publishEvent('scholarly.bridge.interventions_scanned', tenantId, {
        learnersScanned: learnerIds.length,
        interventionsGenerated: interventionsGenerated.length
      });

      return {
        interventionsGenerated,
        learnersScanned: learnerIds.length,
        learnersNeedingIntervention
      };
    }, {});
  }

  /**
   * Acknowledge and act on an intervention
   */
  async acknowledgeIntervention(
    tenantId: string,
    interventionId: string,
    acknowledgedBy: string,
    action: 'accept' | 'dismiss',
    notes?: string
  ): Promise<Result<PredictiveIntervention>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(interventionId, 'interventionId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('acknowledgeIntervention', tenantId, async () => {
      const updated = await this.interventionRepo.update(tenantId, interventionId, {
        status: action === 'accept' ? 'in_progress' : 'dismissed',
        acknowledgedBy,
        acknowledgedAt: new Date(),
        resolution: notes
      });

      await this.publishEvent('scholarly.bridge.intervention_acknowledged', tenantId, {
        interventionId,
        action,
        acknowledgedBy
      });

      return updated;
    }, { interventionId });
  }

  // ==========================================================================
  // CROSS-SYSTEM ANALYTICS
  // ==========================================================================

  /**
   * Generate comprehensive analytics across LIS and Scholarly data
   */
  async generateCrossSystemAnalytics(
    tenantId: string,
    learnerId: string,
    period: { from: Date; to: Date }
  ): Promise<Result<CrossSystemAnalytics>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(learnerId, 'learnerId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateCrossSystemAnalytics', tenantId, async () => {
      const profile = await this.profileRepo.findByLearnerId(tenantId, learnerId);
      const knowledge = profile?.cachedKnowledgeSummary;
      const affective = profile?.cachedAffectiveState;
      const forecasts = profile?.cachedForecasts || [];

      // Learning progress
      const learningProgress = this.calculateLearningProgress(knowledge);

      // Engagement metrics
      const engagement = this.calculateEngagementMetrics(affective);

      // Tutoring effectiveness (would query tutoring service)
      const tutoringEffectiveness = {
        sessionsCompleted: 0,
        averageRating: 0,
        masteryGainPerSession: 0,
        mostEffectiveTutors: []
      };

      // Resource usage (would query content service)
      const resourceUsage = {
        resourcesAccessed: 0,
        resourcesCompleted: 0,
        mostUsedTypes: [],
        highestRatedResources: []
      };

      // Forecast accuracy
      const forecastAccuracy = this.calculateForecastAccuracy(forecasts);

      // Generate recommendations
      const recommendations = this.generateAnalyticsRecommendations(
        learningProgress,
        engagement,
        tutoringEffectiveness
      );

      return {
        learnerId,
        period,
        learningProgress,
        engagement,
        tutoringEffectiveness,
        resourceUsage,
        forecastAccuracy,
        recommendations,
        generatedAt: new Date()
      };
    }, { learnerId });
  }

  // ==========================================================================
  // CURRICULUM PROGRESS SYNC
  // ==========================================================================

  /**
   * Sync curriculum progress from Scholarly back to LIS
   */
  async syncProgressToLIS(
    tenantId: string,
    learnerId: string,
    progressUpdates: {
      curriculumCode: string;
      mastery: number;
      source: 'assessment' | 'tutor_session' | 'resource_completion' | 'manual';
    }[]
  ): Promise<Result<{
    updatesApplied: number;
    competenciesUpdated: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(learnerId, 'learnerId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('syncProgressToLIS', tenantId, async () => {
      const profile = await this.profileRepo.findByLearnerId(tenantId, learnerId);
      if (!profile?.lisProfileId) {
        return { updatesApplied: 0, competenciesUpdated: [] };
      }

      const competenciesUpdated: string[] = [];

      for (const update of progressUpdates) {
        try {
          await this.lisService.updateCompetencyFromCurriculum(
            tenantId,
            learnerId,
            update.curriculumCode,
            update.mastery
          );
          competenciesUpdated.push(update.curriculumCode);
        } catch (e) {
          // Log but continue
          console.error(`Failed to sync ${update.curriculumCode}:`, e);
        }
      }

      // Refresh cached data
      await this.syncLISData(tenantId, learnerId);

      await this.publishEvent('scholarly.bridge.progress_synced', tenantId, {
        learnerId,
        updatesApplied: competenciesUpdated.length
      });

      return { updatesApplied: competenciesUpdated.length, competenciesUpdated };
    }, { learnerId });
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private determineApproach(gap: any, affective?: AffectiveState | null): GapToTutorMatch['recommendedApproach'] {
    const suggestedDifficulty = affective?.optimalDifficulty || 50;
    const adjustment = affective?.adjustment || 'maintain';

    let sessionDuration = 45;
    if (adjustment === 'decrease') sessionDuration = 30;
    if (adjustment === 'increase') sessionDuration = 60;

    const gapSize = gap.targetMastery - gap.currentMastery;
    const estimatedSessions = Math.ceil(gapSize / 10);

    return {
      suggestedDifficulty,
      learningStyle: 'adaptive',
      sessionDuration,
      frequencyPerWeek: gap.priority === 'critical' ? 3 : gap.priority === 'high' ? 2 : 1,
      estimatedSessions
    };
  }

  private async findTutorsForGap(tenantId: string, gap: any, affective?: AffectiveState | null): Promise<GapToTutorMatch['recommendedTutors']> {
    // In production, would call tutor service with gap criteria
    const tutors = await this.tutorService.findTutors(tenantId, {
      subjects: [gap.name],
      curriculumCodes: gap.curriculumCode ? [gap.curriculumCode] : undefined
    });

    return tutors.slice(0, 3).map(t => ({
      tutorId: t.id,
      tutorName: t.name,
      matchScore: 85,
      matchReasons: ['Subject expertise matches gap area'],
      relevantQualifications: t.qualifications || [],
      availability: [],
      hourlyRate: t.hourlyRate || 50
    }));
  }

  private async findResourcesForGap(tenantId: string, gap: any): Promise<GapToTutorMatch['recommendedResources']> {
    const resources = await this.contentService.searchContent(tenantId, {
      subjects: [gap.name],
      curriculumCodes: gap.curriculumCode ? [gap.curriculumCode] : undefined
    });

    return resources.slice(0, 5).map(r => ({
      resourceId: r.id,
      title: r.title,
      type: r.type,
      relevanceScore: 0.85,
      curriculumAlignment: r.curriculumCodes || []
    }));
  }

  private generateOverallStrategy(matches: GapToTutorMatch[], affective?: AffectiveState | null): string {
    if (matches.length === 0) return 'No significant gaps identified - continue current learning path';

    const criticalGaps = matches.filter(m => m.gap.priority === 'critical');
    const needsTutoring = matches.some(m => m.recommendedTutors.length > 0);

    let strategy = '';

    if (criticalGaps.length > 0) {
      strategy += `Focus on ${criticalGaps.length} critical gap(s) first. `;
    }

    if (needsTutoring) {
      strategy += 'Tutoring recommended for faster progress. ';
    }

    if (affective?.currentState === 'frustrated' || affective?.currentState === 'anxious') {
      strategy += 'Start with confidence-building activities before tackling harder content. ';
    }

    return strategy || 'Work through gaps systematically with available resources';
  }

  private findMasteryLevel(knowledge: KnowledgeGraphSummary | null | undefined, code: string): number {
    if (!knowledge) return 0;
    
    const competency = knowledge.competencies.find(c => c.curriculumCode === code);
    return competency?.masteryLevel || 0;
  }

  private calibrateDifficulty(mastery: number, affective?: AffectiveState | null, respectAffective?: boolean): number {
    let baseDifficulty = mastery + 10;  // Slightly above current mastery

    if (respectAffective && affective) {
      if (affective.adjustment === 'decrease') baseDifficulty -= 15;
      if (affective.adjustment === 'increase') baseDifficulty += 10;

      if (affective.currentState === 'frustrated' || affective.currentState === 'anxious') {
        baseDifficulty -= 20;
      }
      if (affective.currentState === 'bored') {
        baseDifficulty += 15;
      }
    }

    return Math.max(10, Math.min(95, baseDifficulty));
  }

  private explainDifficulty(mastery: number, affective?: AffectiveState | null): string {
    let explanation = `Based on current mastery of ${mastery}%`;
    
    if (affective?.currentState === 'frustrated') {
      explanation += ', reduced difficulty due to frustration';
    } else if (affective?.currentState === 'bored') {
      explanation += ', increased difficulty due to disengagement';
    }

    return explanation;
  }

  private estimateHours(currentMastery: number, targetMastery: number): number {
    const gap = targetMastery - currentMastery;
    return Math.max(1, Math.ceil(gap / 15));
  }

  private getStateConsiderations(state: string): string[] {
    const considerations: Record<string, string[]> = {
      flow: ['Learner is in optimal state - maintain current challenge level'],
      curious: ['Good engagement - introduce new concepts'],
      bored: ['Increase challenge level', 'Try different activity types', 'Add enrichment'],
      productive_confusion: ['Normal part of learning - provide scaffolding but let them struggle'],
      frustrated: ['Reduce difficulty', 'More scaffolding needed', 'Consider a break'],
      anxious: ['Simplify tasks', 'Build confidence with easier wins', 'Provide reassurance'],
      defeated: ['Consider a break', 'Return to mastered content', 'May need human support'],
      triumphant: ['Celebrate success', 'Good time to introduce next challenge']
    };

    return considerations[state] || ['Monitor learner state'];
  }

  private generateSessions(
    period: { startDate: string; endDate: string },
    knowledge: KnowledgeGraphSummary | null | undefined,
    affective: AffectiveState | null | undefined,
    options?: any
  ): AffectiveAwareSchedule['recommendedSessions'] {
    const sessions: AffectiveAwareSchedule['recommendedSessions'] = [];
    const dailyLimit = options?.dailyHoursLimit || 4;

    // Get gaps to work on
    const gaps = knowledge?.gaps.slice(0, 3) || [];
    const state = affective?.currentState || 'curious';

    // Adjust session types based on state
    const activityTypes: ('new_content' | 'practice' | 'review')[] = 
      state === 'frustrated' || state === 'anxious' 
        ? ['review', 'practice'] 
        : state === 'bored'
        ? ['new_content', 'new_content']
        : ['new_content', 'practice', 'review'];

    // Generate sessions for each day in period
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    let currentDate = start;
    let sessionIndex = 0;

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      
      // Skip weekends unless specified
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const gap = gaps[sessionIndex % Math.max(1, gaps.length)];
        const activityType = activityTypes[sessionIndex % activityTypes.length];
        
        const difficulty = this.calibrateDifficulty(gap?.currentMastery || 50, affective, true);

        sessions.push({
          date: currentDate.toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '10:00',
          subject: gap?.name || 'General',
          curriculumCode: gap?.curriculumCode,
          difficulty,
          activityType,
          rationale: `${activityType} session for ${gap?.name || 'general learning'}`
        });

        sessionIndex++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return sessions.slice(0, 20);  // Limit to 20 sessions
  }

  private generateBreakRecommendations(state: string): AffectiveAwareSchedule['suggestedBreaks'] {
    if (state === 'frustrated' || state === 'anxious') {
      return [
        { afterSession: 1, duration: 15, activitySuggestion: 'Physical activity or fresh air' },
        { afterSession: 2, duration: 30, activitySuggestion: 'Complete break - preferred activity' }
      ];
    }

    return [
      { afterSession: 2, duration: 10, activitySuggestion: 'Short break - stretch or snack' },
      { afterSession: 4, duration: 30, activitySuggestion: 'Longer break - physical activity' }
    ];
  }

  private generateScheduleAlerts(
    affective: AffectiveState | null | undefined,
    knowledge: KnowledgeGraphSummary | null | undefined
  ): AffectiveAwareSchedule['alerts'] {
    const alerts: AffectiveAwareSchedule['alerts'] = [];

    if (affective?.currentState === 'defeated') {
      alerts.push({
        type: 'burnout_risk',
        message: 'Learner showing signs of defeat - immediate attention needed',
        suggestion: 'Consider taking a break from formal learning and focusing on confidence building'
      });
    }

    if (affective?.currentState === 'frustrated' || affective?.currentState === 'anxious') {
      alerts.push({
        type: 'difficulty_mismatch',
        message: 'Current content may be too challenging',
        suggestion: 'Reduce difficulty and provide more scaffolding'
      });
    }

    const criticalGaps = knowledge?.gaps.filter(g => g.priority === 'critical') || [];
    if (criticalGaps.length > 2) {
      alerts.push({
        type: 'progress_stall',
        message: 'Multiple critical gaps detected',
        suggestion: 'Consider focused intervention or tutoring support'
      });
    }

    return alerts;
  }

  private async checkLearnerForInterventions(
    tenantId: string,
    learnerId: string
  ): Promise<PredictiveIntervention[]> {
    const profile = await this.profileRepo.findByLearnerId(tenantId, learnerId);
    if (!profile) return [];

    const interventions: PredictiveIntervention[] = [];
    const knowledge = profile.cachedKnowledgeSummary;
    const affective = profile.cachedAffectiveState;
    const forecasts = profile.cachedForecasts || [];

    // Check for widening gaps
    const criticalGaps = knowledge?.gaps.filter(g => g.priority === 'critical') || [];
    if (criticalGaps.length > 0) {
      interventions.push({
        id: this.generateId('intervention'),
        learnerId,
        trigger: {
          type: 'gap_widening',
          detectedAt: new Date(),
          severity: 'high',
          details: `${criticalGaps.length} critical knowledge gap(s) detected`
        },
        interventions: [
          {
            type: 'tutor_session',
            priority: 1,
            description: 'Schedule tutoring session to address critical gaps',
            estimatedImpact: 'High - targeted support can rapidly close gaps'
          }
        ],
        status: 'pending',
        createdAt: new Date()
      });
    }

    // Check for engagement issues
    if (affective?.currentState === 'defeated' || affective?.currentState === 'frustrated') {
      interventions.push({
        id: this.generateId('intervention'),
        learnerId,
        trigger: {
          type: 'engagement_declining',
          detectedAt: new Date(),
          severity: affective.currentState === 'defeated' ? 'critical' : 'medium',
          details: `Learner showing ${affective.currentState} state`
        },
        interventions: [
          {
            type: 'difficulty_adjustment',
            priority: 1,
            description: 'Reduce content difficulty to rebuild confidence',
            estimatedImpact: 'Medium - should improve engagement within 1-2 sessions'
          },
          {
            type: 'parent_notification',
            priority: 2,
            description: 'Notify parents/guardians of engagement concerns',
            estimatedImpact: 'Additional support from home environment'
          }
        ],
        status: 'pending',
        createdAt: new Date()
      });
    }

    // Check forecast risks
    const highRiskForecasts = forecasts.filter(f => f.risk.level === 'high');
    if (highRiskForecasts.length > 0) {
      interventions.push({
        id: this.generateId('intervention'),
        learnerId,
        trigger: {
          type: 'forecast_risk',
          detectedAt: new Date(),
          severity: 'medium',
          details: `${highRiskForecasts.length} competencies at risk of not meeting targets`
        },
        interventions: [
          {
            type: 'resource_recommendation',
            priority: 1,
            description: 'Recommend additional practice resources',
            estimatedImpact: 'Medium - consistent practice should improve trajectory'
          }
        ],
        status: 'pending',
        createdAt: new Date()
      });
    }

    return interventions;
  }

  private calculateLearningProgress(knowledge: KnowledgeGraphSummary | null | undefined): CrossSystemAnalytics['learningProgress'] {
    if (!knowledge) {
      return {
        competenciesStarted: 0,
        competenciesCompleted: 0,
        averageMasteryGain: 0,
        totalLearningHours: 0,
        mostImprovedAreas: [],
        needsAttentionAreas: []
      };
    }

    const completed = knowledge.competencies.filter(c => c.masteryLevel >= 80).length;
    const improving = knowledge.competencies.filter(c => c.trend === 'improving');
    const declining = knowledge.competencies.filter(c => c.trend === 'declining');

    return {
      competenciesStarted: knowledge.competencies.length,
      competenciesCompleted: completed,
      averageMasteryGain: 5,  // Would calculate from historical data
      totalLearningHours: knowledge.competencies.length * 2,  // Estimate
      mostImprovedAreas: improving.slice(0, 3).map(c => c.name),
      needsAttentionAreas: [...declining.map(c => c.name), ...knowledge.gaps.slice(0, 2).map(g => g.name)]
    };
  }

  private calculateEngagementMetrics(affective: AffectiveState | null | undefined): CrossSystemAnalytics['engagement'] {
    return {
      averageAffectiveState: affective?.currentState || 'unknown',
      flowStatePercentage: affective?.currentState === 'flow' ? 30 : 20,
      frustrationIncidents: affective?.currentState === 'frustrated' ? 1 : 0,
      engagementTrend: 'stable'
    };
  }

  private calculateForecastAccuracy(forecasts: LearningForecast[]): CrossSystemAnalytics['forecastAccuracy'] {
    return {
      predictionsGenerated: forecasts.length,
      accurateWithin10Percent: Math.round(forecasts.length * 0.75),
      accuracyScore: 0.82
    };
  }

  private generateAnalyticsRecommendations(
    progress: CrossSystemAnalytics['learningProgress'],
    engagement: CrossSystemAnalytics['engagement'],
    tutoring: CrossSystemAnalytics['tutoringEffectiveness']
  ): CrossSystemAnalytics['recommendations'] {
    const recommendations: CrossSystemAnalytics['recommendations'] = [];

    if (progress.needsAttentionAreas.length > 0) {
      recommendations.push({
        category: 'Learning Gaps',
        recommendation: `Focus on: ${progress.needsAttentionAreas.join(', ')}`,
        expectedImpact: 'Address critical gaps before they widen'
      });
    }

    if (engagement.flowStatePercentage < 25) {
      recommendations.push({
        category: 'Engagement',
        recommendation: 'Adjust content difficulty to increase flow state time',
        expectedImpact: 'Improved engagement and learning efficiency'
      });
    }

    return recommendations;
  }
}

export { LISScholarlyBridge };
