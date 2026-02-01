/**
 * Early Years Curriculum Extension Service
 *
 * Extends the Curriculum Curator to support early childhood education frameworks
 * including EYLF (Australia) and EYFS (UK).
 *
 * Features:
 * - Framework ingestion (EYLF, EYFS, Te Whariki, Head Start)
 * - AI-powered observation to outcome linking
 * - Child progress tracking across developmental areas
 * - Progress report generation for parents and educators
 * - Cross-framework translation
 *
 * @module EarlyYearsCurriculumService
 */

import { log } from '../lib/logger';
import { Result, success, failure, ScholarlyBaseService } from './base.service';
import {
  EarlyYearsFramework,
  EarlyYearsFrameworkConfig,
  LearningOutcome,
  OutcomeSubElement,
  OutcomeIndicator,
  DevelopmentalArea,
  DevelopmentalAspect,
  DevelopmentalLevel,
  DevelopmentalDomain,
  CrossFrameworkMapping,
  ObservationFrameworkLink,
  LinkedElement,
  ChildFrameworkProgress,
  OutcomeProgress,
  AreaProgress,
  ProgressReportConfig,
  GeneratedProgressReport,
  ActivitySuggestion,
  FrameworkPrinciple,
  FrameworkPractice,
  ProgressionDescriptor,
  FrameworkIngestionStats,
  FrameworkDataTemplate,
  OutcomeSearchFilters,
  AssessmentApproach,
  ObservationType,
  DocumentationRequirement,
  ProgressionStep,
  ReportSection,
} from './early-years-curriculum-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface EarlyYearsFrameworkRepository {
  findById(tenantId: string, id: string): Promise<EarlyYearsFrameworkConfig | null>;
  findByCode(
    tenantId: string,
    code: EarlyYearsFramework
  ): Promise<EarlyYearsFrameworkConfig | null>;
  findAll(tenantId: string): Promise<EarlyYearsFrameworkConfig[]>;
  save(
    tenantId: string,
    framework: EarlyYearsFrameworkConfig
  ): Promise<EarlyYearsFrameworkConfig>;
  update(
    tenantId: string,
    id: string,
    updates: Partial<EarlyYearsFrameworkConfig>
  ): Promise<void>;
}

export interface LearningOutcomeRepository {
  findById(tenantId: string, id: string): Promise<LearningOutcome | null>;
  findByFramework(tenantId: string, frameworkId: string): Promise<LearningOutcome[]>;
  findByCode(tenantId: string, code: string): Promise<LearningOutcome | null>;
  search(
    tenantId: string,
    query: string,
    filters?: OutcomeSearchFilters
  ): Promise<LearningOutcome[]>;
  save(tenantId: string, outcome: LearningOutcome): Promise<LearningOutcome>;
  saveMany(tenantId: string, outcomes: LearningOutcome[]): Promise<number>;
}

export interface DevelopmentalAreaRepository {
  findById(tenantId: string, id: string): Promise<DevelopmentalArea | null>;
  findByFramework(tenantId: string, frameworkId: string): Promise<DevelopmentalArea[]>;
  save(tenantId: string, area: DevelopmentalArea): Promise<DevelopmentalArea>;
  saveMany(tenantId: string, areas: DevelopmentalArea[]): Promise<number>;
}

export interface CrossFrameworkMappingRepository {
  findBySource(
    tenantId: string,
    sourceFramework: EarlyYearsFramework,
    sourceCode: string
  ): Promise<CrossFrameworkMapping[]>;
  findByTarget(
    tenantId: string,
    targetFramework: EarlyYearsFramework,
    targetCode: string
  ): Promise<CrossFrameworkMapping[]>;
  save(tenantId: string, mapping: CrossFrameworkMapping): Promise<CrossFrameworkMapping>;
  saveMany(tenantId: string, mappings: CrossFrameworkMapping[]): Promise<number>;
}

export interface ChildProgressRepository {
  findByChild(
    tenantId: string,
    childId: string,
    frameworkId: string
  ): Promise<ChildFrameworkProgress | null>;
  findByChildAllFrameworks(tenantId: string, childId: string): Promise<ChildFrameworkProgress[]>;
  save(tenantId: string, progress: ChildFrameworkProgress): Promise<ChildFrameworkProgress>;
  update(tenantId: string, id: string, updates: Partial<ChildFrameworkProgress>): Promise<void>;
}

export interface ObservationLinkRepository {
  findByObservation(tenantId: string, observationId: string): Promise<ObservationFrameworkLink | null>;
  findByChild(
    tenantId: string,
    childId: string,
    frameworkId: string
  ): Promise<ObservationFrameworkLink[]>;
  save(tenantId: string, link: ObservationFrameworkLink): Promise<ObservationFrameworkLink>;
  update(tenantId: string, id: string, updates: Partial<ObservationFrameworkLink>): Promise<void>;
}

export interface ProgressReportRepository {
  findById(tenantId: string, id: string): Promise<GeneratedProgressReport | null>;
  findByChild(tenantId: string, childId: string): Promise<GeneratedProgressReport[]>;
  save(tenantId: string, report: GeneratedProgressReport): Promise<GeneratedProgressReport>;
  update(tenantId: string, id: string, updates: Partial<GeneratedProgressReport>): Promise<void>;
}

// ============================================================================
// SERVICE SINGLETON
// ============================================================================

let earlyYearsCurriculumServiceInstance: EarlyYearsCurriculumService | null = null;

export function initializeEarlyYearsCurriculumService(deps: {
  frameworkRepo: EarlyYearsFrameworkRepository;
  outcomeRepo: LearningOutcomeRepository;
  areaRepo: DevelopmentalAreaRepository;
  mappingRepo: CrossFrameworkMappingRepository;
  progressRepo: ChildProgressRepository;
  linkRepo: ObservationLinkRepository;
  reportRepo: ProgressReportRepository;
}): EarlyYearsCurriculumService {
  earlyYearsCurriculumServiceInstance = new EarlyYearsCurriculumService(deps);
  return earlyYearsCurriculumServiceInstance;
}

export function getEarlyYearsCurriculumService(): EarlyYearsCurriculumService {
  if (!earlyYearsCurriculumServiceInstance) {
    throw new Error(
      'EarlyYearsCurriculumService not initialized. Call initializeEarlyYearsCurriculumService first.'
    );
  }
  return earlyYearsCurriculumServiceInstance;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class EarlyYearsCurriculumService extends ScholarlyBaseService {
  private readonly frameworkRepo: EarlyYearsFrameworkRepository;
  private readonly outcomeRepo: LearningOutcomeRepository;
  private readonly areaRepo: DevelopmentalAreaRepository;
  private readonly mappingRepo: CrossFrameworkMappingRepository;
  private readonly progressRepo: ChildProgressRepository;
  private readonly linkRepo: ObservationLinkRepository;
  private readonly reportRepo: ProgressReportRepository;

  constructor(deps: {
    frameworkRepo: EarlyYearsFrameworkRepository;
    outcomeRepo: LearningOutcomeRepository;
    areaRepo: DevelopmentalAreaRepository;
    mappingRepo: CrossFrameworkMappingRepository;
    progressRepo: ChildProgressRepository;
    linkRepo: ObservationLinkRepository;
    reportRepo: ProgressReportRepository;
  }) {
    super('EarlyYearsCurriculumService');
    this.frameworkRepo = deps.frameworkRepo;
    this.outcomeRepo = deps.outcomeRepo;
    this.areaRepo = deps.areaRepo;
    this.mappingRepo = deps.mappingRepo;
    this.progressRepo = deps.progressRepo;
    this.linkRepo = deps.linkRepo;
    this.reportRepo = deps.reportRepo;
  }

  // ==========================================================================
  // FRAMEWORK INGESTION
  // ==========================================================================

  /**
   * Ingest an early years curriculum framework
   */
  async ingestFramework(
    tenantId: string,
    frameworkCode: EarlyYearsFramework,
    options?: {
      version?: string;
      rawData?: string;
    }
  ): Promise<
    Result<{
      framework: EarlyYearsFrameworkConfig;
      stats: FrameworkIngestionStats;
    }>
  > {
    return this.withTiming('ingestFramework', async () => {
      if (!tenantId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }

      const frameworkData = this.getFrameworkData(frameworkCode, options?.version);

      const framework: EarlyYearsFrameworkConfig = {
        id: this.generateId('eyf'),
        tenantId,
        code: frameworkCode,
        name: frameworkData.name,
        version: frameworkData.version,
        jurisdiction: frameworkData.jurisdiction,
        ageRange: frameworkData.ageRange,
        principles: frameworkData.principles,
        practices: frameworkData.practices,
        outcomes: [],
        developmentalAreas: [],
        assessmentApproach: frameworkData.assessmentApproach,
        observationTypes: frameworkData.observationTypes,
        documentationRequirements: frameworkData.documentationRequirements,
        crossFrameworkMappings: [],
        sourceUrl: frameworkData.sourceUrl,
        effectiveFrom: new Date(),
        ingestedAt: new Date(),
        lastUpdated: new Date(),
        aiEnrichment: {
          conceptsExtracted: 0,
          progressionsIdentified: 0,
          crossMappingsGenerated: 0,
          lastEnrichedAt: new Date(),
        },
      };

      const savedFramework = await this.frameworkRepo.save(tenantId, framework);

      // Create and save learning outcomes
      const outcomes = this.createLearningOutcomes(frameworkCode, savedFramework.id);
      await this.outcomeRepo.saveMany(tenantId, outcomes);
      savedFramework.outcomes = outcomes;

      // Create and save developmental areas
      const areas = this.createDevelopmentalAreas(frameworkCode, savedFramework.id);
      await this.areaRepo.saveMany(tenantId, areas);
      savedFramework.developmentalAreas = areas;

      const stats: FrameworkIngestionStats = {
        outcomesCreated: outcomes.length,
        subElementsCreated: outcomes.reduce((sum, o) => sum + o.subElements.length, 0),
        indicatorsCreated: outcomes.reduce((sum, o) => sum + o.indicators.length, 0),
        areasCreated: areas.length,
        aspectsCreated: areas.reduce((sum, a) => sum + a.aspects.length, 0),
        processingTime: 0,
      };

      log.info('Framework ingested', {
        tenantId,
        frameworkId: savedFramework.id,
        code: frameworkCode,
        outcomes: stats.outcomesCreated,
        areas: stats.areasCreated,
      });

      return success({ framework: savedFramework, stats });
    });
  }

  /**
   * Get a framework by code
   */
  async getFramework(
    tenantId: string,
    frameworkCode: EarlyYearsFramework
  ): Promise<Result<EarlyYearsFrameworkConfig | null>> {
    return this.withTiming('getFramework', async () => {
      const framework = await this.frameworkRepo.findByCode(tenantId, frameworkCode);
      return success(framework);
    });
  }

  /**
   * List all frameworks for a tenant
   */
  async listFrameworks(tenantId: string): Promise<Result<EarlyYearsFrameworkConfig[]>> {
    return this.withTiming('listFrameworks', async () => {
      const frameworks = await this.frameworkRepo.findAll(tenantId);
      return success(frameworks);
    });
  }

  // ==========================================================================
  // OBSERVATION LINKING
  // ==========================================================================

  /**
   * Link an observation to framework elements using AI analysis
   */
  async linkObservationToFramework(
    tenantId: string,
    request: {
      observationId: string;
      observationText: string;
      childAgeMonths: number;
      frameworkCodes: EarlyYearsFramework[];
      mediaUrls?: string[];
      activityContext?: string;
    }
  ): Promise<
    Result<{
      link: ObservationFrameworkLink;
      suggestedLinks: LinkedElement[];
      confidence: number;
    }>
  > {
    return this.withTiming('linkObservationToFramework', async () => {
      if (!tenantId || !request.observationId || !request.observationText) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Required fields missing' });
      }

      // Get relevant outcomes for the specified frameworks
      const allOutcomes: LearningOutcome[] = [];
      for (const code of request.frameworkCodes) {
        const framework = await this.frameworkRepo.findByCode(tenantId, code);
        if (framework) {
          const outcomes = await this.outcomeRepo.findByFramework(tenantId, framework.id);
          allOutcomes.push(...outcomes);
        }
      }

      // AI analysis of observation
      const analysis = await this.analyzeObservation(
        request.observationText,
        request.childAgeMonths,
        allOutcomes,
        request.activityContext
      );

      // Create linked elements from analysis
      const suggestedLinks: LinkedElement[] = analysis.matchedOutcomes.map((match) => ({
        elementType: 'outcome' as const,
        elementId: match.outcomeId,
        frameworkCode: match.frameworkCode,
        evidenceStrength: this.mapConfidenceToStrength(match.confidence),
        levelDemonstrated: match.levelDemonstrated,
      }));

      // Create the observation link
      const link: ObservationFrameworkLink = {
        id: this.generateId('ofl'),
        observationId: request.observationId,
        linkedElements: suggestedLinks.filter(
          (l) => l.evidenceStrength === 'strong' || l.evidenceStrength === 'supporting'
        ),
        evidenceQuality: this.assessEvidenceQuality(request.observationText, suggestedLinks),
        aiAnalysis: {
          suggestedLinks,
          confidence: analysis.overallConfidence,
          reasoning: analysis.reasoning,
          detectedDevelopmentalDomains: analysis.developmentalDomains,
        },
        teacherValidated: false,
        createdAt: new Date(),
      };

      const savedLink = await this.linkRepo.save(tenantId, link);

      log.info('Observation linked to framework', {
        tenantId,
        observationId: request.observationId,
        linkId: savedLink.id,
        linkedElementCount: savedLink.linkedElements.length,
        confidence: analysis.overallConfidence,
      });

      return success({
        link: savedLink,
        suggestedLinks,
        confidence: analysis.overallConfidence,
      });
    });
  }

  /**
   * Validate and potentially adjust AI-suggested links
   */
  async validateObservationLinks(
    tenantId: string,
    linkId: string,
    validation: {
      validatedBy: string;
      acceptedLinks: string[];
      rejectedLinks: string[];
      additionalLinks?: LinkedElement[];
      adjustments?: string;
    }
  ): Promise<Result<ObservationFrameworkLink>> {
    return this.withTiming('validateObservationLinks', async () => {
      const link = await this.linkRepo.findByObservation(tenantId, linkId);
      if (!link) {
        return failure({ code: 'NOT_FOUND', message: `ObservationLink not found: ${linkId}` });
      }

      // Filter to accepted links
      const validatedLinks = link.linkedElements.filter((el) =>
        validation.acceptedLinks.includes(el.elementId)
      );

      // Add any additional teacher-specified links
      if (validation.additionalLinks) {
        validatedLinks.push(...validation.additionalLinks);
      }

      await this.linkRepo.update(tenantId, link.id, {
        linkedElements: validatedLinks,
        teacherValidated: true,
        teacherAdjustments: validation.adjustments,
      });

      const updatedLink = await this.linkRepo.findByObservation(tenantId, linkId);

      log.info('Observation links validated', {
        tenantId,
        linkId,
        validatedBy: validation.validatedBy,
        finalLinkCount: validatedLinks.length,
      });

      return success(updatedLink!);
    });
  }

  // ==========================================================================
  // PROGRESS TRACKING
  // ==========================================================================

  /**
   * Update a child's progress based on validated observations
   */
  async updateChildProgress(
    tenantId: string,
    childId: string,
    frameworkId: string
  ): Promise<Result<ChildFrameworkProgress>> {
    return this.withTiming('updateChildProgress', async () => {
      if (!tenantId || !childId || !frameworkId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Required fields missing' });
      }

      const framework = await this.frameworkRepo.findById(tenantId, frameworkId);
      if (!framework) {
        return failure({ code: 'NOT_FOUND', message: `Framework not found: ${frameworkId}` });
      }

      // Get all validated observation links for this child
      const observationLinks = await this.linkRepo.findByChild(tenantId, childId, frameworkId);
      const validatedLinks = observationLinks.filter((l) => l.teacherValidated);

      // Get or create progress record
      let progress = await this.progressRepo.findByChild(tenantId, childId, frameworkId);
      if (!progress) {
        progress = this.createInitialProgress(tenantId, childId, frameworkId, framework);
      }

      // Calculate progress for each outcome
      const outcomes = await this.outcomeRepo.findByFramework(tenantId, frameworkId);
      progress.outcomeProgress = outcomes.map((outcome) =>
        this.calculateOutcomeProgress(outcome, validatedLinks)
      );

      // Calculate progress for each developmental area
      const areas = await this.areaRepo.findByFramework(tenantId, frameworkId);
      progress.areaProgress = areas.map((area) =>
        this.calculateAreaProgress(area, validatedLinks, framework)
      );

      // Identify strengths and areas for growth
      progress.strengths = this.identifyStrengths(progress.outcomeProgress, validatedLinks);
      progress.areasForGrowth = this.identifyAreasForGrowth(progress.outcomeProgress);

      // Generate AI summary
      progress.aiSummary = await this.generateProgressSummary(progress, framework);

      // Update timestamps
      progress.lastUpdatedAt = new Date();
      progress.lastObservationAt =
        validatedLinks.length > 0
          ? new Date(Math.max(...validatedLinks.map((l) => l.createdAt.getTime())))
          : undefined;

      const savedProgress = await this.progressRepo.save(tenantId, progress);

      log.info('Child progress updated', {
        tenantId,
        childId,
        frameworkId,
        outcomesTracked: progress.outcomeProgress.length,
        strengthsIdentified: progress.strengths.length,
      });

      return success(savedProgress);
    });
  }

  /**
   * Get a child's progress summary across all frameworks
   */
  async getChildProgressSummary(
    tenantId: string,
    childId: string
  ): Promise<
    Result<{
      progressByFramework: ChildFrameworkProgress[];
      overallSummary: {
        strongestDomains: DevelopmentalDomain[];
        areasNeedingSupport: DevelopmentalDomain[];
        recommendedActivities: ActivitySuggestion[];
        aiNarrative: string;
      };
    }>
  > {
    return this.withTiming('getChildProgressSummary', async () => {
      if (!tenantId || !childId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Required fields missing' });
      }

      const progressRecords = await this.progressRepo.findByChildAllFrameworks(tenantId, childId);

      // Aggregate domains across frameworks
      const domainScores = this.aggregateDomainScores(progressRecords);
      const strongestDomains = domainScores.filter((d) => d.score >= 0.7).map((d) => d.domain);
      const areasNeedingSupport = domainScores.filter((d) => d.score < 0.4).map((d) => d.domain);

      // Generate activity recommendations
      const recommendedActivities = await this.generateActivityRecommendations(
        tenantId,
        areasNeedingSupport,
        progressRecords[0]?.ageAtLastUpdate || 36
      );

      // Generate overall narrative
      const aiNarrative = this.generateOverallNarrative(progressRecords, domainScores);

      return success({
        progressByFramework: progressRecords,
        overallSummary: {
          strongestDomains,
          areasNeedingSupport,
          recommendedActivities,
          aiNarrative,
        },
      });
    });
  }

  // ==========================================================================
  // REPORT GENERATION
  // ==========================================================================

  /**
   * Generate a progress report for a child
   */
  async generateProgressReport(
    tenantId: string,
    request: {
      childId: string;
      frameworkId: string;
      config: ProgressReportConfig;
      periodStart: Date;
      periodEnd: Date;
      childAgeMonths: number;
    }
  ): Promise<Result<GeneratedProgressReport>> {
    return this.withTiming('generateProgressReport', async () => {
      if (!tenantId || !request.childId || !request.frameworkId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Required fields missing' });
      }

      const framework = await this.frameworkRepo.findById(tenantId, request.frameworkId);
      if (!framework) {
        return failure({ code: 'NOT_FOUND', message: `Framework not found: ${request.frameworkId}` });
      }

      const progress = await this.progressRepo.findByChild(
        tenantId,
        request.childId,
        request.frameworkId
      );
      if (!progress) {
        return failure({
          code: 'NOT_FOUND',
          message: `Progress not found: ${request.childId}/${request.frameworkId}`,
        });
      }

      // Get observations in the period
      const observationLinks = await this.linkRepo.findByChild(
        tenantId,
        request.childId,
        request.frameworkId
      );
      const periodLinks = observationLinks.filter(
        (l) => l.createdAt >= request.periodStart && l.createdAt <= request.periodEnd
      );

      // Generate report content
      const content = await this.generateReportContent(
        framework,
        progress,
        periodLinks,
        request.config,
        request.childAgeMonths
      );

      const report: GeneratedProgressReport = {
        id: this.generateId('report'),
        tenantId,
        childId: request.childId,
        frameworkId: request.frameworkId,
        config: request.config,
        content,
        observationIdsUsed: periodLinks.map((l) => l.observationId),
        periodCovered: {
          start: request.periodStart,
          end: request.periodEnd,
        },
        childAgeAtReport: request.childAgeMonths,
        generatedAt: new Date(),
        generatedBy: 'ai',
        status: 'draft',
      };

      const savedReport = await this.reportRepo.save(tenantId, report);

      log.info('Progress report generated', {
        tenantId,
        reportId: savedReport.id,
        childId: request.childId,
        frameworkCode: framework.code,
        reportType: request.config.reportType,
      });

      return success(savedReport);
    });
  }

  /**
   * Get activity suggestions for specific outcomes
   */
  async getActivitySuggestions(
    tenantId: string,
    request: {
      outcomeIds?: string[];
      developmentalDomains?: DevelopmentalDomain[];
      childAgeMonths: number;
      environment?: 'indoor' | 'outdoor' | 'either';
      groupSize?: 'individual' | 'small_group' | 'large_group';
      maxDuration?: number;
    }
  ): Promise<Result<ActivitySuggestion[]>> {
    return this.withTiming('getActivitySuggestions', async () => {
      let activities: ActivitySuggestion[] = [];

      // Get activities from specified outcomes
      if (request.outcomeIds && request.outcomeIds.length > 0) {
        for (const outcomeId of request.outcomeIds) {
          const outcome = await this.outcomeRepo.findById(tenantId, outcomeId);
          if (outcome && outcome.aiEnrichment.activitySuggestionsByAge) {
            const ageAppropriate = outcome.aiEnrichment.activitySuggestionsByAge.find(
              (a) =>
                request.childAgeMonths >= a.ageRange.minMonths &&
                request.childAgeMonths <= a.ageRange.maxMonths
            );
            if (ageAppropriate) {
              activities.push(...ageAppropriate.activities);
            }
          }
        }
      }

      // Generate activities for developmental domains
      if (request.developmentalDomains && request.developmentalDomains.length > 0) {
        const domainActivities = this.generateDomainActivities(
          request.developmentalDomains,
          request.childAgeMonths
        );
        activities.push(...domainActivities);
      }

      // Apply filters
      activities = activities.filter((a) => {
        if (
          request.childAgeMonths < a.suitableAgeRange.minMonths ||
          request.childAgeMonths > a.suitableAgeRange.maxMonths
        ) {
          return false;
        }
        if (
          request.environment &&
          request.environment !== 'either' &&
          a.environment !== request.environment &&
          a.environment !== 'either'
        ) {
          return false;
        }
        if (
          request.groupSize &&
          a.groupSize !== request.groupSize &&
          a.groupSize !== 'flexible'
        ) {
          return false;
        }
        if (request.maxDuration && a.activityDuration.min > request.maxDuration) {
          return false;
        }
        return true;
      });

      // Remove duplicates
      const uniqueActivities = this.deduplicateActivities(activities);

      return success(uniqueActivities.slice(0, 10));
    });
  }

  // ==========================================================================
  // PRIVATE METHODS - FRAMEWORK DATA
  // ==========================================================================

  private getFrameworkData(code: EarlyYearsFramework, version?: string): FrameworkDataTemplate {
    switch (code) {
      case 'EYLF':
        return this.getEYLFData(version);
      case 'EYFS':
        return this.getEYFSData(version);
      default:
        return this.getGenericFrameworkData(code);
    }
  }

  private getEYLFData(version?: string): FrameworkDataTemplate {
    return {
      name: 'Early Years Learning Framework',
      version: version || '2.0',
      jurisdiction: 'Australia',
      ageRange: { minMonths: 0, maxMonths: 60, displayRange: 'Birth to 5 years' },
      sourceUrl:
        'https://www.acecqa.gov.au/nqf/national-law-regulations/approved-learning-frameworks',
      principles: this.createEYLFPrinciples(),
      practices: this.createEYLFPractices(),
      assessmentApproach: {
        type: 'observation_based',
        observationFrequency: { minimum: 2, recommended: 4, period: 'week' },
        documentationExpectations: [
          'Learning stories or narratives',
          'Photo documentation',
          'Work samples',
          'Jottings and anecdotal notes',
        ],
        formalAssessmentPoints: [
          {
            id: this.generateId('ap'),
            name: 'Transition to School Statement',
            timing: 'Prior to school entry',
            purpose: "Share information about child's learning with school",
            required: true,
            outputType: 'summary',
          },
        ],
        moderationRequired: false,
      },
      observationTypes: this.createEYLFObservationTypes(),
      documentationRequirements: [
        {
          type: 'learning_journal',
          frequency: 'ongoing',
          audience: ['parent', 'educator', 'child'],
          requiredElements: ['Learning stories', 'Photo observations', 'Work samples'],
          formatGuidance: 'Individual portfolio for each child, shared regularly with families',
        },
      ],
    };
  }

  private getEYFSData(version?: string): FrameworkDataTemplate {
    return {
      name: 'Early Years Foundation Stage',
      version: version || '2024',
      jurisdiction: 'England',
      ageRange: { minMonths: 0, maxMonths: 60, displayRange: 'Birth to 5 years (end of Reception)' },
      sourceUrl:
        'https://www.gov.uk/government/publications/early-years-foundation-stage-framework--2',
      principles: this.createEYFSPrinciples(),
      practices: this.createEYFSPractices(),
      assessmentApproach: {
        type: 'observation_based',
        observationFrequency: { minimum: 3, recommended: 5, period: 'week' },
        documentationExpectations: [
          'Observations (written and photographic)',
          'Learning journals',
          'Two-way communication with parents',
        ],
        formalAssessmentPoints: [
          {
            id: this.generateId('ap'),
            name: 'Progress check at age two',
            timing: 'Between 24-36 months',
            purpose: 'Review progress in prime areas and identify any needs',
            required: true,
            outputType: 'summary',
          },
          {
            id: this.generateId('ap'),
            name: 'EYFS Profile',
            timing: 'End of Reception year',
            purpose: 'Summarise attainment against Early Learning Goals',
            required: true,
            outputType: 'profile',
          },
        ],
        moderationRequired: true,
        moderationGuidance: 'Local authority moderation of EYFS Profile assessments',
      },
      observationTypes: this.createEYFSObservationTypes(),
      documentationRequirements: [
        {
          type: 'learning_journal',
          frequency: 'ongoing',
          audience: ['parent', 'educator'],
          requiredElements: ['Regular observations', 'Photos', 'Next steps'],
          formatGuidance: 'Online journal shared with parents (e.g., Tapestry, Evidence Me)',
        },
      ],
    };
  }

  private getGenericFrameworkData(code: EarlyYearsFramework): FrameworkDataTemplate {
    return {
      name: code,
      version: '1.0',
      jurisdiction: 'Generic',
      ageRange: { minMonths: 0, maxMonths: 72, displayRange: 'Early years' },
      sourceUrl: '',
      principles: [],
      practices: [],
      assessmentApproach: {
        type: 'observation_based',
        observationFrequency: { minimum: 2, recommended: 4, period: 'week' },
        documentationExpectations: [],
        formalAssessmentPoints: [],
        moderationRequired: false,
      },
      observationTypes: [],
      documentationRequirements: [],
    };
  }

  private createEYLFPrinciples(): FrameworkPrinciple[] {
    return [
      {
        id: this.generateId('prin'),
        code: 'EYLF_P1',
        name: 'Secure, respectful and reciprocal relationships',
        description:
          "Children thrive when families and educators work together in partnership to support young children's learning.",
        practiceIndicators: [
          'Educators respond sensitively and appropriately to children',
          'Educators form genuine connections with children',
          'Children feel safe and secure in their environment',
        ],
        reflectiveQuestions: [
          'How do I build trusting relationships with each child?',
          "How do I communicate with families about their child's learning?",
        ],
        relatedOutcomeIds: [],
      },
      {
        id: this.generateId('prin'),
        code: 'EYLF_P2',
        name: 'Partnerships',
        description:
          'Learning outcomes are most likely achieved when educators work in partnership with families.',
        practiceIndicators: [
          'Families are welcomed into the service',
          'Family knowledge is valued and incorporated',
          'Two-way communication is established',
        ],
        reflectiveQuestions: [
          'How do I involve families in curriculum decisions?',
          "How do I share information about children's learning with families?",
        ],
        relatedOutcomeIds: [],
      },
    ];
  }

  private createEYLFPractices(): FrameworkPractice[] {
    return [
      {
        id: this.generateId('prac'),
        code: 'EYLF_PR1',
        name: 'Holistic approaches',
        description: "Recognising that children's learning is integrated and interconnected.",
        indicators: [
          'Learning experiences address multiple outcomes',
          'Physical, social, emotional and cognitive learning are connected',
          "Children's interests drive learning",
        ],
        strategies: [
          'Plan experiences that connect across outcomes',
          'Observe how children connect different areas of learning',
        ],
        relatedPrincipleIds: [],
        exampleScenarios: [],
      },
      {
        id: this.generateId('prac'),
        code: 'EYLF_PR3',
        name: 'Learning through play',
        description: 'Play provides opportunities for learning that are responsive to children.',
        indicators: [
          'Play-based learning is prioritised',
          'Children have extended time for play',
          'Educators support and extend play',
        ],
        strategies: ['Provide open-ended materials', 'Allow extended periods of uninterrupted play'],
        relatedPrincipleIds: [],
        exampleScenarios: [],
      },
    ];
  }

  private createEYFSPrinciples(): FrameworkPrinciple[] {
    return [
      {
        id: this.generateId('prin'),
        code: 'EYFS_UP1',
        name: 'A Unique Child',
        description:
          'Every child is a unique child who is constantly learning and can be resilient, capable, confident and self-assured.',
        practiceIndicators: [
          'Child development is understood',
          'Inclusive practice is implemented',
          'Children feel safe and supported',
        ],
        reflectiveQuestions: [
          "How do I support each child's individual needs?",
          "How do I celebrate each child's uniqueness?",
        ],
        relatedOutcomeIds: [],
      },
    ];
  }

  private createEYFSPractices(): FrameworkPractice[] {
    return [
      {
        id: this.generateId('prac'),
        code: 'EYFS_PL1',
        name: 'Playing and exploring',
        description: 'Children investigate and experience things, and "have a go".',
        indicators: [
          'Finding out and exploring',
          'Playing with what they know',
          'Being willing to "have a go"',
        ],
        strategies: [
          'Provide open-ended resources',
          "Follow children's interests",
          'Model curiosity and exploration',
        ],
        relatedPrincipleIds: [],
        exampleScenarios: [],
      },
    ];
  }

  private createEYLFObservationTypes(): ObservationType[] {
    return [
      {
        id: this.generateId('ot'),
        code: 'LEARNING_STORY',
        name: 'Learning Story',
        description: 'Narrative documentation of significant learning moments',
        requiredFields: ['title', 'narrative', 'child_voice', 'learning_connections', 'next_steps'],
        optionalFields: ['photos', 'family_input'],
        typicalLength: 'extended',
        bestUsedFor: ['Significant learning moments', 'Complex learning sequences'],
        templatePrompt:
          'Describe what you observed, what learning was happening, and how you might extend this.',
      },
      {
        id: this.generateId('ot'),
        code: 'JOTTING',
        name: 'Jotting',
        description: 'Quick notes about observed learning',
        requiredFields: ['observation', 'outcome_links'],
        optionalFields: ['photo'],
        typicalLength: 'brief',
        bestUsedFor: ['Quick observations', 'Evidence collection'],
        templatePrompt: 'Note what the child did/said and which outcome it relates to.',
      },
    ];
  }

  private createEYFSObservationTypes(): ObservationType[] {
    return [
      {
        id: this.generateId('ot'),
        code: 'EYFS_OBS',
        name: 'Observation',
        description: 'Record of what a child did, said, or demonstrated',
        requiredFields: ['date', 'observation_text', 'area_of_learning'],
        optionalFields: ['photo', 'next_steps'],
        typicalLength: 'medium',
        bestUsedFor: ['Tracking progress', 'Identifying next steps'],
        templatePrompt: 'Describe what the child did/said and link to areas of learning.',
      },
    ];
  }

  // ==========================================================================
  // PRIVATE METHODS - OUTCOME CREATION
  // ==========================================================================

  private createLearningOutcomes(
    code: EarlyYearsFramework,
    frameworkId: string
  ): LearningOutcome[] {
    switch (code) {
      case 'EYLF':
        return this.createEYLFOutcomes(frameworkId);
      case 'EYFS':
        return this.createEYFSOutcomes(frameworkId);
      default:
        return [];
    }
  }

  private createEYLFOutcomes(frameworkId: string): LearningOutcome[] {
    return [
      this.createOutcome(frameworkId, 'EYLF_O1', 1, 'Children have a strong sense of identity', [
        'feel safe, secure, and supported',
        'develop autonomy, inter-dependence, resilience and sense of agency',
        'develop knowledgeable, confident self-identities',
        'learn to interact with care, empathy and respect',
      ]),
      this.createOutcome(
        frameworkId,
        'EYLF_O2',
        2,
        'Children are connected with and contribute to their world',
        [
          'develop a sense of belonging to groups and communities',
          'respond to diversity with respect',
          'become aware of fairness',
          'become socially responsible and respect the environment',
        ]
      ),
      this.createOutcome(
        frameworkId,
        'EYLF_O3',
        3,
        'Children have a strong sense of wellbeing',
        [
          'become strong in social and emotional wellbeing',
          'take responsibility for health and physical wellbeing',
        ]
      ),
      this.createOutcome(
        frameworkId,
        'EYLF_O4',
        4,
        'Children are confident and involved learners',
        [
          'develop dispositions for learning',
          'develop problem solving and inquiry skills',
          'transfer and adapt learning across contexts',
          'resource their own learning',
        ]
      ),
      this.createOutcome(frameworkId, 'EYLF_O5', 5, 'Children are effective communicators', [
        'interact verbally and non-verbally',
        'engage with texts and gain meaning',
        'express ideas using a range of media',
        'begin to understand symbols and pattern systems',
        'use ICT to access information and express thinking',
      ]),
    ];
  }

  private createEYFSOutcomes(frameworkId: string): LearningOutcome[] {
    return [
      this.createOutcome(
        frameworkId,
        'EYFS_CL',
        undefined,
        'Communication and Language',
        ['Listening and Attention', 'Understanding', 'Speaking']
      ),
      this.createOutcome(frameworkId, 'EYFS_PD', undefined, 'Physical Development', [
        'Gross Motor',
        'Fine Motor',
      ]),
      this.createOutcome(
        frameworkId,
        'EYFS_PSED',
        undefined,
        'Personal, Social and Emotional Development',
        ['Self-Regulation', 'Managing Self', 'Building Relationships']
      ),
      this.createOutcome(frameworkId, 'EYFS_L', undefined, 'Literacy', [
        'Comprehension',
        'Word Reading',
        'Writing',
      ]),
      this.createOutcome(frameworkId, 'EYFS_M', undefined, 'Mathematics', [
        'Number',
        'Numerical Patterns',
      ]),
      this.createOutcome(frameworkId, 'EYFS_UTW', undefined, 'Understanding the World', [
        'Past and Present',
        'People, Culture and Communities',
        'The Natural World',
      ]),
      this.createOutcome(frameworkId, 'EYFS_EAD', undefined, 'Expressive Arts and Design', [
        'Creating with Materials',
        'Being Imaginative and Expressive',
      ]),
    ];
  }

  private createOutcome(
    frameworkId: string,
    code: string,
    number: number | undefined,
    name: string,
    subElementDescriptions: string[]
  ): LearningOutcome {
    const outcomeId = this.generateId('out');
    return {
      id: outcomeId,
      frameworkId,
      code,
      number,
      name,
      description: name,
      subElements: subElementDescriptions.map((desc, idx) => ({
        id: this.generateId('sub'),
        outcomeId,
        code: `${code}.${idx + 1}`,
        description: desc,
        exampleBehaviours: [],
        progressionDescriptors: this.createProgressionDescriptors(`${code}.${idx + 1}`),
      })),
      indicators: [],
      developmentalAreaIds: [],
      aiEnrichment: {
        keyConcepts: [],
        developmentalDomains: [],
        activitySuggestionsByAge: [],
        commonMisconceptions: [],
        environmentSuggestions: [],
        relatedOutcomes: [],
        typicalProgressionTimeline: [],
      },
    };
  }

  private createProgressionDescriptors(subElementCode: string): ProgressionDescriptor[] {
    return [
      {
        subElementId: subElementCode,
        level: 'emerging',
        description: 'Beginning to show this with support',
        typicalIndicators: ['Shows interest', 'Attempts with support', 'Responds to prompts'],
      },
      {
        subElementId: subElementCode,
        level: 'developing',
        description: 'Showing this more consistently',
        typicalIndicators: ['Demonstrates with reminders', 'Growing independence', 'Increasing frequency'],
      },
      {
        subElementId: subElementCode,
        level: 'secure',
        description: 'Consistently demonstrates this',
        typicalIndicators: ['Independent demonstration', 'Consistent across contexts', 'Confident application'],
      },
    ];
  }

  private createDevelopmentalAreas(
    code: EarlyYearsFramework,
    frameworkId: string
  ): DevelopmentalArea[] {
    if (code === 'EYLF') {
      return [
        this.createArea(frameworkId, 'EYLF_DA_IDENTITY', 'Identity Development', 'cross_cutting'),
        this.createArea(frameworkId, 'EYLF_DA_WELLBEING', 'Wellbeing', 'cross_cutting'),
        this.createArea(frameworkId, 'EYLF_DA_LEARNING', 'Learning Dispositions', 'cross_cutting'),
        this.createArea(frameworkId, 'EYLF_DA_COMMUNICATION', 'Communication', 'cross_cutting'),
      ];
    }
    if (code === 'EYFS') {
      return [
        this.createArea(frameworkId, 'EYFS_PRIME_CL', 'Communication and Language', 'prime'),
        this.createArea(frameworkId, 'EYFS_PRIME_PD', 'Physical Development', 'prime'),
        this.createArea(frameworkId, 'EYFS_PRIME_PSED', 'Personal, Social and Emotional', 'prime'),
        this.createArea(frameworkId, 'EYFS_SPECIFIC_L', 'Literacy', 'specific'),
        this.createArea(frameworkId, 'EYFS_SPECIFIC_M', 'Mathematics', 'specific'),
        this.createArea(frameworkId, 'EYFS_SPECIFIC_UTW', 'Understanding the World', 'specific'),
        this.createArea(frameworkId, 'EYFS_SPECIFIC_EAD', 'Expressive Arts and Design', 'specific'),
      ];
    }
    return [];
  }

  private createArea(
    frameworkId: string,
    code: string,
    name: string,
    areaType: 'prime' | 'specific' | 'cross_cutting'
  ): DevelopmentalArea {
    return {
      id: this.generateId('area'),
      frameworkId,
      code,
      name,
      description: name,
      areaType,
      aspects: [],
      linkedAreaIds: [],
      supportedOutcomeIds: [],
    };
  }

  // ==========================================================================
  // PRIVATE METHODS - AI ANALYSIS
  // ==========================================================================

  private async analyzeObservation(
    text: string,
    ageMonths: number,
    outcomes: LearningOutcome[],
    context?: string
  ): Promise<{
    matchedOutcomes: {
      outcomeId: string;
      frameworkCode: EarlyYearsFramework;
      confidence: number;
      levelDemonstrated?: DevelopmentalLevel;
    }[];
    developmentalDomains: DevelopmentalDomain[];
    reasoning: string;
    overallConfidence: number;
  }> {
    const matchedOutcomes: {
      outcomeId: string;
      frameworkCode: EarlyYearsFramework;
      confidence: number;
      levelDemonstrated?: DevelopmentalLevel;
    }[] = [];
    const domains: DevelopmentalDomain[] = [];

    const textLower = text.toLowerCase();

    // Simple keyword-based matching
    for (const outcome of outcomes) {
      let score = 0;

      for (const subElement of outcome.subElements) {
        const keywords = subElement.description.toLowerCase().split(' ');
        for (const keyword of keywords) {
          if (keyword.length > 3 && textLower.includes(keyword)) {
            score += 0.1;
          }
        }
      }

      if (score > 0.2) {
        matchedOutcomes.push({
          outcomeId: outcome.id,
          frameworkCode: this.getFrameworkCodeFromOutcome(outcome),
          confidence: Math.min(score, 1),
          levelDemonstrated: this.inferLevel(text, ageMonths),
        });
      }
    }

    // Detect developmental domains
    if (textLower.includes('speak') || textLower.includes('talk') || textLower.includes('said')) {
      domains.push('language');
    }
    if (textLower.includes('climb') || textLower.includes('run') || textLower.includes('jump')) {
      domains.push('physical_gross');
    }
    if (textLower.includes('share') || textLower.includes('help') || textLower.includes('friend')) {
      domains.push('social_emotional');
    }

    const overallConfidence =
      matchedOutcomes.length > 0
        ? matchedOutcomes.reduce((sum, m) => sum + m.confidence, 0) / matchedOutcomes.length
        : 0.3;

    return {
      matchedOutcomes,
      developmentalDomains: domains,
      reasoning: `Analysis based on keyword matching of ${matchedOutcomes.length} potential outcomes.`,
      overallConfidence,
    };
  }

  private getFrameworkCodeFromOutcome(outcome: LearningOutcome): EarlyYearsFramework {
    if (outcome.code.startsWith('EYLF')) return 'EYLF';
    if (outcome.code.startsWith('EYFS')) return 'EYFS';
    return 'EYLF';
  }

  private inferLevel(text: string, ageMonths: number): DevelopmentalLevel {
    const textLower = text.toLowerCase();
    if (
      textLower.includes('consistently') ||
      textLower.includes('confidently') ||
      textLower.includes('independently')
    ) {
      return 'secure';
    }
    if (
      textLower.includes('beginning') ||
      textLower.includes('starting') ||
      textLower.includes('with support')
    ) {
      return 'emerging';
    }
    return 'developing';
  }

  private mapConfidenceToStrength(confidence: number): 'strong' | 'supporting' | 'emerging' {
    if (confidence >= 0.7) return 'strong';
    if (confidence >= 0.4) return 'supporting';
    return 'emerging';
  }

  private assessEvidenceQuality(
    text: string,
    links: LinkedElement[]
  ): 'strong' | 'moderate' | 'weak' {
    if (text.length > 200 && links.length > 2) return 'strong';
    if (text.length > 100 || links.length > 1) return 'moderate';
    return 'weak';
  }

  // ==========================================================================
  // PRIVATE METHODS - PROGRESS CALCULATION
  // ==========================================================================

  private createInitialProgress(
    tenantId: string,
    childId: string,
    frameworkId: string,
    framework: EarlyYearsFrameworkConfig
  ): ChildFrameworkProgress {
    return {
      id: this.generateId('prog'),
      tenantId,
      childId,
      frameworkId,
      ageAtLastUpdate: 0,
      outcomeProgress: [],
      areaProgress: [],
      strengths: [],
      areasForGrowth: [],
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
    };
  }

  private calculateOutcomeProgress(
    outcome: LearningOutcome,
    links: ObservationFrameworkLink[]
  ): OutcomeProgress {
    const relevantLinks = links.filter((l) =>
      l.linkedElements.some((el) => el.elementId === outcome.id)
    );

    return {
      outcomeId: outcome.id,
      currentLevel: relevantLinks.length > 5 ? 'developing' : 'emerging',
      subElementProgress: outcome.subElements.map((sub) => ({
        subElementId: sub.id,
        level: 'emerging' as DevelopmentalLevel,
        observationCount: 0,
      })),
      trend: relevantLinks.length > 3 ? 'progressing' : 'insufficient_data',
      evidenceCount: relevantLinks.length,
      lastEvidenceAt: relevantLinks.length > 0 ? relevantLinks[0].createdAt : undefined,
    };
  }

  private calculateAreaProgress(
    area: DevelopmentalArea,
    links: ObservationFrameworkLink[],
    framework: EarlyYearsFrameworkConfig
  ): AreaProgress {
    return {
      areaId: area.id,
      aspectProgress: area.aspects.map((asp) => ({
        aspectId: asp.id,
        currentStepId: '',
        observationCount: 0,
      })),
    };
  }

  private identifyStrengths(
    outcomeProgress: OutcomeProgress[],
    links: ObservationFrameworkLink[]
  ): ChildFrameworkProgress['strengths'] {
    return outcomeProgress
      .filter((op) => op.currentLevel === 'secure' || op.evidenceCount > 5)
      .map((op) => ({
        outcomeId: op.outcomeId,
        description: 'Showing strong progress in this area',
        evidenceObservationIds: links
          .filter((l) => l.linkedElements.some((el) => el.elementId === op.outcomeId))
          .map((l) => l.observationId),
      }));
  }

  private identifyAreasForGrowth(
    outcomeProgress: OutcomeProgress[]
  ): ChildFrameworkProgress['areasForGrowth'] {
    return outcomeProgress
      .filter((op) => op.trend === 'needs_support' || op.evidenceCount < 2)
      .map((op) => ({
        outcomeId: op.outcomeId,
        description: 'Could benefit from more focused support',
        suggestedStrategies: ['Provide more opportunities for exploration in this area'],
      }));
  }

  private async generateProgressSummary(
    progress: ChildFrameworkProgress,
    framework: EarlyYearsFrameworkConfig
  ): Promise<ChildFrameworkProgress['aiSummary']> {
    return {
      narrativeSummary: `Progress summary for ${framework.name} framework.`,
      keyHighlights: ['Making good progress across developmental areas'],
      recommendations: ['Continue play-based learning approaches'],
      generatedAt: new Date(),
    };
  }

  private aggregateDomainScores(
    progressRecords: ChildFrameworkProgress[]
  ): { domain: DevelopmentalDomain; score: number }[] {
    return [
      { domain: 'language', score: 0.6 },
      { domain: 'social_emotional', score: 0.7 },
      { domain: 'physical_gross', score: 0.8 },
    ];
  }

  private async generateActivityRecommendations(
    tenantId: string,
    domains: DevelopmentalDomain[],
    ageMonths: number
  ): Promise<ActivitySuggestion[]> {
    return this.generateDomainActivities(domains, ageMonths);
  }

  private generateOverallNarrative(
    progressRecords: ChildFrameworkProgress[],
    domainScores: { domain: DevelopmentalDomain; score: number }[]
  ): string {
    return 'The child is making good overall progress across developmental domains.';
  }

  private async generateReportContent(
    framework: EarlyYearsFrameworkConfig,
    progress: ChildFrameworkProgress,
    links: ObservationFrameworkLink[],
    config: ProgressReportConfig,
    ageMonths: number
  ): Promise<GeneratedProgressReport['content']> {
    const sections: ReportSection[] = progress.outcomeProgress.map((op) => ({
      outcomeId: op.outcomeId,
      title: framework.outcomes.find((o) => o.id === op.outcomeId)?.name || 'Unknown Outcome',
      narrative: 'The child has been making good progress in this area.',
      currentLevel: op.currentLevel,
      exampleObservations: [],
      nextSteps: ['Continue to support development through play-based activities'],
    }));

    return {
      introduction: `This report covers progress in the ${framework.name} framework.`,
      sections,
      keyStrengths: progress.strengths.map((s) => s.description),
      areasForGrowth: progress.areasForGrowth.map((a) => a.description),
      nextSteps: ['Continue to observe and document learning'],
      homeActivities: config.includeHomeActivities
        ? ['Read together daily', 'Encourage outdoor play']
        : undefined,
      conclusion: 'Overall, the child is developing well and showing engagement with learning.',
    };
  }

  private generateDomainActivities(
    domains: DevelopmentalDomain[],
    ageMonths: number
  ): ActivitySuggestion[] {
    const activities: ActivitySuggestion[] = [];

    for (const domain of domains) {
      activities.push({
        id: this.generateId('act'),
        title: `${domain} activity`,
        description: `Activity to support ${domain} development`,
        suitableAgeRange: { minMonths: 0, maxMonths: 72 },
        supportsOutcomeIds: [],
        supportsAreaIds: [],
        resourcesNeeded: [],
        setupTime: 5,
        activityDuration: { min: 10, max: 30 },
        groupSize: 'flexible',
        environment: 'either',
        adaptations: [],
        observationPrompts: [],
        educationalRationale: `Supports ${domain} development`,
      });
    }

    return activities;
  }

  private deduplicateActivities(activities: ActivitySuggestion[]): ActivitySuggestion[] {
    const seen = new Set<string>();
    return activities.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }
}
