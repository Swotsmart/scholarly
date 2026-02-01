/**
 * Early Years Curriculum Extension Service
 * 
 * Extends the Curriculum Curator to support early childhood education frameworks
 * including EYLF (Australia) and EYFS (UK).
 * 
 * ## The Granny Explanation
 * 
 * The main Curriculum Curator is like a librarian for school curricula - it knows
 * about subjects, grades, and what kids should learn at each level. But early
 * childhood education works differently - it's less about "Year 3 Maths" and more
 * about watching children grow and develop.
 * 
 * This extension is like adding a nursery section to the library. Instead of
 * textbooks, it has observation journals. Instead of test scores, it tracks
 * "Emma showed empathy today when she shared her toy with a crying friend."
 * 
 * The AI helps teachers by:
 * 1. Looking at an observation and suggesting which developmental outcomes it shows
 * 2. Noticing patterns ("Lots of observations about physical play, fewer about literacy")
 * 3. Generating parent-friendly progress reports
 * 4. Suggesting activities to support specific areas of development
 * 
 * ## Architecture
 * 
 * ```
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                    EARLY YEARS CURRICULUM EXTENSION                        │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
 * │  │    Framework    │  │   Observation   │  │      Progress              │ │
 * │  │    Ingestion    │  │     Linking     │  │      Tracking              │ │
 * │  │                 │  │                 │  │                            │ │
 * │  │  • EYLF v2.0    │  │  • AI Analysis  │  │  • Outcome Progress        │ │
 * │  │  • EYFS 2024    │  │  • Suggestion   │  │  • Area Development        │ │
 * │  │  • Te Whāriki   │  │  • Validation   │  │  • Trend Detection         │ │
 * │  │  • Head Start   │  │  • Evidence     │  │  • ELG Prediction          │ │
 * │  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
 * │           │                   │                        │                   │
 * │           ▼                   ▼                        ▼                   │
 * │  ┌─────────────────────────────────────────────────────────────────────┐   │
 * │  │                    Cross-Framework Intelligence                     │   │
 * │  │  • EYLF ↔ EYFS mapping    • Activity generation by outcome         │   │
 * │  │  • Progress translation    • Report generation (parent/educator)   │   │
 * │  └─────────────────────────────────────────────────────────────────────┘   │
 * │                                                                             │
 * │  ┌─────────────────────────────────────────────────────────────────────┐   │
 * │  │                    Integration with Little Explorers                │   │
 * │  │  Portfolio items → Observation links → Progress tracking            │   │
 * │  └─────────────────────────────────────────────────────────────────────┘   │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * ```
 * 
 * @module EarlyYearsCurriculumExtension
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  Validator,
  EventBus,
  Cache,
  ScholarlyConfig
} from './shared-types';

import {
  EarlyYearsFramework,
  EarlyYearsFrameworkConfig,
  LearningOutcome,
  OutcomeSubElement,
  OutcomeIndicator,
  DevelopmentalArea,
  DevelopmentalAspect,
  DevelopmentalLevel,
  CrossFrameworkMapping,
  ObservationFrameworkLink,
  LinkedElement,
  ChildFrameworkProgress,
  OutcomeProgress,
  AreaProgress,
  ProgressReportConfig,
  GeneratedProgressReport,
  ActivitySuggestion,
  DevelopmentalDomain,
  FrameworkPrinciple,
  FrameworkPractice,
  EarlyLearningGoal,
  ProgressionStep
} from './types/early-years-curriculum.types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface EarlyYearsFrameworkRepository {
  findById(tenantId: string, id: string): Promise<EarlyYearsFrameworkConfig | null>;
  findByCode(tenantId: string, code: EarlyYearsFramework): Promise<EarlyYearsFrameworkConfig | null>;
  findAll(tenantId: string): Promise<EarlyYearsFrameworkConfig[]>;
  save(tenantId: string, framework: EarlyYearsFrameworkConfig): Promise<EarlyYearsFrameworkConfig>;
  update(tenantId: string, id: string, updates: Partial<EarlyYearsFrameworkConfig>): Promise<void>;
}

export interface LearningOutcomeRepository {
  findById(tenantId: string, id: string): Promise<LearningOutcome | null>;
  findByFramework(tenantId: string, frameworkId: string): Promise<LearningOutcome[]>;
  findByCode(tenantId: string, code: string): Promise<LearningOutcome | null>;
  search(tenantId: string, query: string, filters?: OutcomeSearchFilters): Promise<LearningOutcome[]>;
  save(tenantId: string, outcome: LearningOutcome): Promise<LearningOutcome>;
  saveMany(tenantId: string, outcomes: LearningOutcome[]): Promise<number>;
}

export interface OutcomeSearchFilters {
  frameworkCodes?: EarlyYearsFramework[];
  developmentalDomains?: DevelopmentalDomain[];
  ageRange?: { minMonths: number; maxMonths: number };
}

export interface DevelopmentalAreaRepository {
  findById(tenantId: string, id: string): Promise<DevelopmentalArea | null>;
  findByFramework(tenantId: string, frameworkId: string): Promise<DevelopmentalArea[]>;
  save(tenantId: string, area: DevelopmentalArea): Promise<DevelopmentalArea>;
  saveMany(tenantId: string, areas: DevelopmentalArea[]): Promise<number>;
}

export interface CrossFrameworkMappingRepository {
  findBySource(tenantId: string, sourceFramework: EarlyYearsFramework, sourceCode: string): Promise<CrossFrameworkMapping[]>;
  findByTarget(tenantId: string, targetFramework: EarlyYearsFramework, targetCode: string): Promise<CrossFrameworkMapping[]>;
  save(tenantId: string, mapping: CrossFrameworkMapping): Promise<CrossFrameworkMapping>;
  saveMany(tenantId: string, mappings: CrossFrameworkMapping[]): Promise<number>;
}

export interface ChildProgressRepository {
  findByChild(tenantId: string, childId: string, frameworkId: string): Promise<ChildFrameworkProgress | null>;
  findByChildAllFrameworks(tenantId: string, childId: string): Promise<ChildFrameworkProgress[]>;
  save(tenantId: string, progress: ChildFrameworkProgress): Promise<ChildFrameworkProgress>;
  update(tenantId: string, id: string, updates: Partial<ChildFrameworkProgress>): Promise<void>;
}

export interface ObservationLinkRepository {
  findByObservation(tenantId: string, observationId: string): Promise<ObservationFrameworkLink | null>;
  findByChild(tenantId: string, childId: string, frameworkId: string): Promise<ObservationFrameworkLink[]>;
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
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    frameworkRepo: EarlyYearsFrameworkRepository;
    outcomeRepo: LearningOutcomeRepository;
    areaRepo: DevelopmentalAreaRepository;
    mappingRepo: CrossFrameworkMappingRepository;
    progressRepo: ChildProgressRepository;
    linkRepo: ObservationLinkRepository;
    reportRepo: ProgressReportRepository;
  }) {
    super('EarlyYearsCurriculumService', deps);
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
   * 
   * This loads and parses framework data from official sources, creating
   * the structured data needed for observation linking and progress tracking.
   */
  async ingestFramework(
    tenantId: string,
    frameworkCode: EarlyYearsFramework,
    options?: {
      version?: string;
      rawData?: string;
    }
  ): Promise<Result<{
    framework: EarlyYearsFrameworkConfig;
    stats: FrameworkIngestionStats;
  }>> {
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('ingestFramework', tenantId, async () => {
      // Get or generate framework data based on code
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
        outcomes: [],  // Will be populated below
        developmentalAreas: [],  // Will be populated below
        assessmentApproach: frameworkData.assessmentApproach,
        observationTypes: frameworkData.observationTypes,
        documentationRequirements: frameworkData.documentationRequirements,
        crossFrameworkMappings: [],  // Will be populated during enrichment
        sourceUrl: frameworkData.sourceUrl,
        effectiveFrom: new Date(),
        ingestedAt: new Date(),
        lastUpdated: new Date(),
        aiEnrichment: {
          conceptsExtracted: 0,
          progressionsIdentified: 0,
          crossMappingsGenerated: 0,
          lastEnrichedAt: new Date()
        }
      };

      // Save the framework
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
        processingTime: 0
      };

      await this.publishEvent('scholarly.early_years.framework_ingested', tenantId, {
        frameworkId: savedFramework.id,
        code: frameworkCode,
        outcomes: stats.outcomesCreated,
        areas: stats.areasCreated
      });

      return { framework: savedFramework, stats };
    }, { frameworkCode });
  }

  /**
   * Enrich framework with AI-generated insights
   */
  async enrichFramework(
    tenantId: string,
    frameworkId: string
  ): Promise<Result<{
    conceptsExtracted: number;
    progressionsIdentified: number;
    crossMappingsGenerated: number;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(frameworkId, 'frameworkId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('enrichFramework', tenantId, async () => {
      const framework = await this.frameworkRepo.findById(tenantId, frameworkId);
      if (!framework) throw new NotFoundError('Framework', frameworkId);

      const outcomes = await this.outcomeRepo.findByFramework(tenantId, frameworkId);
      const areas = await this.areaRepo.findByFramework(tenantId, frameworkId);

      let conceptsExtracted = 0;
      let progressionsIdentified = 0;
      let crossMappingsGenerated = 0;

      // Enrich each outcome
      for (const outcome of outcomes) {
        // Extract key concepts using NLP
        const concepts = this.extractConcepts(outcome.description);
        outcome.aiEnrichment.keyConcepts = concepts;
        conceptsExtracted += concepts.length;

        // Identify developmental domains
        outcome.aiEnrichment.developmentalDomains = this.identifyDevelopmentalDomains(outcome);

        // Generate semantic embedding
        outcome.aiEnrichment.embedding = await this.generateEmbedding(outcome.description);

        // Generate activity suggestions by age
        outcome.aiEnrichment.activitySuggestionsByAge = this.generateActivitySuggestions(outcome);

        // Identify typical progression timeline
        outcome.aiEnrichment.typicalProgressionTimeline = this.generateProgressionTimeline(outcome);
        progressionsIdentified++;

        await this.outcomeRepo.save(tenantId, outcome);
      }

      // Generate cross-framework mappings
      const mappings = await this.generateCrossFrameworkMappings(tenantId, framework, outcomes);
      await this.mappingRepo.saveMany(tenantId, mappings);
      crossMappingsGenerated = mappings.length;

      // Update framework enrichment stats
      await this.frameworkRepo.update(tenantId, frameworkId, {
        aiEnrichment: {
          conceptsExtracted,
          progressionsIdentified,
          crossMappingsGenerated,
          lastEnrichedAt: new Date()
        }
      });

      await this.publishEvent('scholarly.early_years.framework_enriched', tenantId, {
        frameworkId,
        conceptsExtracted,
        progressionsIdentified,
        crossMappingsGenerated
      });

      return { conceptsExtracted, progressionsIdentified, crossMappingsGenerated };
    }, { frameworkId });
  }

  // ==========================================================================
  // OBSERVATION LINKING
  // ==========================================================================

  /**
   * Link an observation to framework elements
   * 
   * This is the core AI function - it analyzes observation text and suggests
   * which learning outcomes, developmental areas, and indicators are evidenced.
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
  ): Promise<Result<{
    link: ObservationFrameworkLink;
    suggestedLinks: LinkedElement[];
    confidence: number;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.observationId, 'observationId');
      Validator.required(request.observationText, 'observationText');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('linkObservationToFramework', tenantId, async () => {
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
      const suggestedLinks: LinkedElement[] = analysis.matchedOutcomes.map(match => ({
        elementType: 'outcome' as const,
        elementId: match.outcomeId,
        frameworkCode: match.frameworkCode,
        evidenceStrength: this.mapConfidenceToStrength(match.confidence),
        levelDemonstrated: match.levelDemonstrated
      }));

      // Add sub-element links for strong matches
      for (const match of analysis.matchedOutcomes.filter(m => m.confidence > 0.7)) {
        const outcome = allOutcomes.find(o => o.id === match.outcomeId);
        if (outcome) {
          const matchedSubElements = this.matchSubElements(
            request.observationText,
            outcome.subElements
          );
          suggestedLinks.push(...matchedSubElements.map(sub => ({
            elementType: 'sub_element' as const,
            elementId: sub.subElementId,
            frameworkCode: match.frameworkCode,
            evidenceStrength: this.mapConfidenceToStrength(sub.confidence),
            levelDemonstrated: sub.levelDemonstrated
          })));
        }
      }

      // Add indicator links
      const indicatorMatches = this.matchIndicators(request.observationText, allOutcomes);
      suggestedLinks.push(...indicatorMatches.map(ind => ({
        elementType: 'indicator' as const,
        elementId: ind.indicatorId,
        frameworkCode: ind.frameworkCode,
        evidenceStrength: this.mapConfidenceToStrength(ind.confidence)
      })));

      // Create the observation link
      const link: ObservationFrameworkLink = {
        id: this.generateId('ofl'),
        observationId: request.observationId,
        linkedElements: suggestedLinks.filter(l => 
          l.evidenceStrength === 'strong' || l.evidenceStrength === 'supporting'
        ),
        evidenceQuality: this.assessEvidenceQuality(request.observationText, suggestedLinks),
        aiAnalysis: {
          suggestedLinks,
          confidence: analysis.overallConfidence,
          reasoning: analysis.reasoning,
          detectedDevelopmentalDomains: analysis.developmentalDomains
        },
        teacherValidated: false,
        createdAt: new Date()
      };

      // Save the link
      const savedLink = await this.linkRepo.save(tenantId, link);

      await this.publishEvent('scholarly.early_years.observation_linked', tenantId, {
        observationId: request.observationId,
        linkId: savedLink.id,
        linkedElementCount: savedLink.linkedElements.length,
        confidence: analysis.overallConfidence
      });

      return {
        link: savedLink,
        suggestedLinks,
        confidence: analysis.overallConfidence
      };
    }, { observationId: request.observationId });
  }

  /**
   * Validate and potentially adjust AI-suggested links
   */
  async validateObservationLinks(
    tenantId: string,
    linkId: string,
    validation: {
      validatedBy: string;
      acceptedLinks: string[];      // Element IDs to keep
      rejectedLinks: string[];      // Element IDs to remove
      additionalLinks?: LinkedElement[];  // Teacher-added links
      adjustments?: string;         // Notes on adjustments made
    }
  ): Promise<Result<ObservationFrameworkLink>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(linkId, 'linkId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('validateObservationLinks', tenantId, async () => {
      const link = await this.linkRepo.findByObservation(tenantId, linkId);
      if (!link) throw new NotFoundError('ObservationLink', linkId);

      // Filter to accepted links
      const validatedLinks = link.linkedElements.filter(
        el => validation.acceptedLinks.includes(el.elementId)
      );

      // Add any additional teacher-specified links
      if (validation.additionalLinks) {
        validatedLinks.push(...validation.additionalLinks);
      }

      // Update the link
      await this.linkRepo.update(tenantId, link.id, {
        linkedElements: validatedLinks,
        teacherValidated: true,
        teacherAdjustments: validation.adjustments
      });

      const updatedLink = await this.linkRepo.findByObservation(tenantId, linkId);

      await this.publishEvent('scholarly.early_years.observation_validated', tenantId, {
        linkId,
        validatedBy: validation.validatedBy,
        finalLinkCount: validatedLinks.length
      });

      return updatedLink!;
    }, { linkId });
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
    try {
      Validator.tenantId(tenantId);
      Validator.required(childId, 'childId');
      Validator.required(frameworkId, 'frameworkId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('updateChildProgress', tenantId, async () => {
      const framework = await this.frameworkRepo.findById(tenantId, frameworkId);
      if (!framework) throw new NotFoundError('Framework', frameworkId);

      // Get all validated observation links for this child
      const observationLinks = await this.linkRepo.findByChild(tenantId, childId, frameworkId);
      const validatedLinks = observationLinks.filter(l => l.teacherValidated);

      // Get or create progress record
      let progress = await this.progressRepo.findByChild(tenantId, childId, frameworkId);
      if (!progress) {
        progress = this.createInitialProgress(tenantId, childId, frameworkId, framework);
      }

      // Calculate progress for each outcome
      const outcomes = await this.outcomeRepo.findByFramework(tenantId, frameworkId);
      progress.outcomeProgress = outcomes.map(outcome => 
        this.calculateOutcomeProgress(outcome, validatedLinks)
      );

      // Calculate progress for each developmental area
      const areas = await this.areaRepo.findByFramework(tenantId, frameworkId);
      progress.areaProgress = areas.map(area =>
        this.calculateAreaProgress(area, validatedLinks, framework)
      );

      // Identify strengths and areas for growth
      progress.strengths = this.identifyStrengths(progress.outcomeProgress, validatedLinks);
      progress.areasForGrowth = this.identifyAreasForGrowth(progress.outcomeProgress);

      // Generate AI summary
      progress.aiSummary = await this.generateProgressSummary(progress, framework);

      // Update timestamps
      progress.lastUpdatedAt = new Date();
      progress.lastObservationAt = validatedLinks.length > 0 
        ? new Date(Math.max(...validatedLinks.map(l => l.createdAt.getTime())))
        : undefined;

      // Save
      const savedProgress = await this.progressRepo.save(tenantId, progress);

      await this.publishEvent('scholarly.early_years.progress_updated', tenantId, {
        childId,
        frameworkId,
        outcomesTracked: progress.outcomeProgress.length,
        strengthsIdentified: progress.strengths.length
      });

      return savedProgress;
    }, { childId, frameworkId });
  }

  /**
   * Get a child's progress across all frameworks
   */
  async getChildProgressSummary(
    tenantId: string,
    childId: string
  ): Promise<Result<{
    progressByFramework: ChildFrameworkProgress[];
    overallSummary: {
      strongestDomains: DevelopmentalDomain[];
      areasNeedingSupport: DevelopmentalDomain[];
      recommendedActivities: ActivitySuggestion[];
      aiNarrative: string;
    };
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(childId, 'childId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getChildProgressSummary', tenantId, async () => {
      const progressRecords = await this.progressRepo.findByChildAllFrameworks(tenantId, childId);

      // Aggregate domains across frameworks
      const domainScores = this.aggregateDomainScores(progressRecords);
      const strongestDomains = domainScores
        .filter(d => d.score >= 0.7)
        .map(d => d.domain);
      const areasNeedingSupport = domainScores
        .filter(d => d.score < 0.4)
        .map(d => d.domain);

      // Generate activity recommendations
      const recommendedActivities = await this.generateActivityRecommendations(
        tenantId,
        areasNeedingSupport,
        progressRecords[0]?.ageAtLastUpdate || 36  // Default to 3 years
      );

      // Generate overall narrative
      const aiNarrative = this.generateOverallNarrative(progressRecords, domainScores);

      return {
        progressByFramework: progressRecords,
        overallSummary: {
          strongestDomains,
          areasNeedingSupport,
          recommendedActivities,
          aiNarrative
        }
      };
    }, { childId });
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
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.childId, 'childId');
      Validator.required(request.frameworkId, 'frameworkId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateProgressReport', tenantId, async () => {
      const framework = await this.frameworkRepo.findById(tenantId, request.frameworkId);
      if (!framework) throw new NotFoundError('Framework', request.frameworkId);

      const progress = await this.progressRepo.findByChild(
        tenantId,
        request.childId,
        request.frameworkId
      );
      if (!progress) throw new NotFoundError('Progress', `${request.childId}/${request.frameworkId}`);

      // Get observations in the period
      const observationLinks = await this.linkRepo.findByChild(
        tenantId,
        request.childId,
        request.frameworkId
      );
      const periodLinks = observationLinks.filter(
        l => l.createdAt >= request.periodStart && l.createdAt <= request.periodEnd
      );

      // Generate report content based on config
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
        observationIdsUsed: periodLinks.map(l => l.observationId),
        periodCovered: {
          start: request.periodStart,
          end: request.periodEnd
        },
        childAgeAtReport: request.childAgeMonths,
        generatedAt: new Date(),
        generatedBy: 'ai',
        status: 'draft'
      };

      const savedReport = await this.reportRepo.save(tenantId, report);

      await this.publishEvent('scholarly.early_years.report_generated', tenantId, {
        reportId: savedReport.id,
        childId: request.childId,
        frameworkCode: framework.code,
        reportType: request.config.reportType
      });

      return savedReport;
    }, { childId: request.childId, reportType: request.config.reportType });
  }

  /**
   * Translate progress from one framework to another
   */
  async translateProgress(
    tenantId: string,
    request: {
      childId: string;
      sourceFramework: EarlyYearsFramework;
      targetFramework: EarlyYearsFramework;
    }
  ): Promise<Result<{
    translatedProgress: ChildFrameworkProgress;
    mappingsUsed: CrossFrameworkMapping[];
    confidence: number;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.childId, 'childId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('translateProgress', tenantId, async () => {
      // Get source progress
      const sourceFrameworkConfig = await this.frameworkRepo.findByCode(tenantId, request.sourceFramework);
      if (!sourceFrameworkConfig) throw new NotFoundError('Framework', request.sourceFramework);

      const sourceProgress = await this.progressRepo.findByChild(
        tenantId,
        request.childId,
        sourceFrameworkConfig.id
      );
      if (!sourceProgress) throw new NotFoundError('Progress', request.childId);

      // Get target framework
      const targetFrameworkConfig = await this.frameworkRepo.findByCode(tenantId, request.targetFramework);
      if (!targetFrameworkConfig) throw new NotFoundError('Framework', request.targetFramework);

      // Get cross-framework mappings
      const mappings: CrossFrameworkMapping[] = [];
      for (const outcomeProgress of sourceProgress.outcomeProgress) {
        const outcomeMappings = await this.mappingRepo.findBySource(
          tenantId,
          request.sourceFramework,
          outcomeProgress.outcomeId
        );
        mappings.push(...outcomeMappings.filter(m => m.targetFramework === request.targetFramework));
      }

      // Translate progress using mappings
      const translatedProgress = this.translateProgressUsingMappings(
        sourceProgress,
        targetFrameworkConfig,
        mappings
      );

      // Calculate confidence based on mapping quality
      const confidence = mappings.length > 0
        ? mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length
        : 0.5;

      return {
        translatedProgress,
        mappingsUsed: mappings,
        confidence
      };
    }, { childId: request.childId, source: request.sourceFramework, target: request.targetFramework });
  }

  // ==========================================================================
  // ACTIVITY SUGGESTIONS
  // ==========================================================================

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
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getActivitySuggestions', tenantId, async () => {
      let activities: ActivitySuggestion[] = [];

      // Get activities from specified outcomes
      if (request.outcomeIds && request.outcomeIds.length > 0) {
        for (const outcomeId of request.outcomeIds) {
          const outcome = await this.outcomeRepo.findById(tenantId, outcomeId);
          if (outcome && outcome.aiEnrichment.activitySuggestionsByAge) {
            const ageAppropriate = outcome.aiEnrichment.activitySuggestionsByAge.find(
              a => request.childAgeMonths >= a.ageRange.minMonths &&
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
      activities = activities.filter(a => {
        // Age filter
        if (request.childAgeMonths < a.suitableAgeRange.minMonths ||
            request.childAgeMonths > a.suitableAgeRange.maxMonths) {
          return false;
        }
        
        // Environment filter
        if (request.environment && request.environment !== 'either' &&
            a.environment !== request.environment && a.environment !== 'either') {
          return false;
        }

        // Group size filter
        if (request.groupSize && a.groupSize !== request.groupSize && a.groupSize !== 'flexible') {
          return false;
        }

        // Duration filter
        if (request.maxDuration && a.activityDuration.min > request.maxDuration) {
          return false;
        }

        return true;
      });

      // Remove duplicates and sort by relevance
      const uniqueActivities = this.deduplicateActivities(activities);

      return uniqueActivities.slice(0, 10);  // Return top 10
    }, { outcomeCount: request.outcomeIds?.length });
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
      case 'TE_WHARIKI':
        return this.getTeWharikiData(version);
      case 'HEAD_START':
        return this.getHeadStartData(version);
      default:
        return this.getGenericFrameworkData(code);
    }
  }

  private getEYLFData(version?: string): FrameworkDataTemplate {
    return {
      name: 'Early Years Learning Framework',
      version: version || '2.0',
      jurisdiction: 'Australia',
      ageRange: {
        minMonths: 0,
        maxMonths: 60,
        displayRange: 'Birth to 5 years'
      },
      sourceUrl: 'https://www.acecqa.gov.au/nqf/national-law-regulations/approved-learning-frameworks',
      principles: [
        {
          id: this.generateId('prin'),
          code: 'EYLF_P1',
          name: 'Secure, respectful and reciprocal relationships',
          description: 'Children thrive when families and educators work together in partnership to support young children\'s learning.',
          practiceIndicators: [
            'Educators respond sensitively and appropriately to children',
            'Educators form genuine connections with children',
            'Children feel safe and secure in their environment'
          ],
          reflectiveQuestions: [
            'How do I build trusting relationships with each child?',
            'How do I communicate with families about their child\'s learning?'
          ],
          relatedOutcomeIds: []
        },
        {
          id: this.generateId('prin'),
          code: 'EYLF_P2',
          name: 'Partnerships',
          description: 'Learning outcomes are most likely achieved when educators work in partnership with families.',
          practiceIndicators: [
            'Families are welcomed into the service',
            'Family knowledge is valued and incorporated',
            'Two-way communication is established'
          ],
          reflectiveQuestions: [
            'How do I involve families in curriculum decisions?',
            'How do I share information about children\'s learning with families?'
          ],
          relatedOutcomeIds: []
        },
        {
          id: this.generateId('prin'),
          code: 'EYLF_P3',
          name: 'High expectations and equity',
          description: 'Educators hold high expectations for every child\'s learning.',
          practiceIndicators: [
            'All children are supported to achieve their full potential',
            'Educators recognise and challenge bias',
            'Diverse perspectives are included'
          ],
          reflectiveQuestions: [
            'Do I have high expectations for all children?',
            'How do I ensure equity in my practice?'
          ],
          relatedOutcomeIds: []
        },
        {
          id: this.generateId('prin'),
          code: 'EYLF_P4',
          name: 'Respect for diversity',
          description: 'Deep respect for Australia\'s Aboriginal and Torres Strait Islander cultures and diversity.',
          practiceIndicators: [
            'Cultural backgrounds are acknowledged and respected',
            'Aboriginal and Torres Strait Islander perspectives are embedded',
            'Home languages are supported'
          ],
          reflectiveQuestions: [
            'How do I incorporate diverse perspectives?',
            'How do I support children\'s cultural identities?'
          ],
          relatedOutcomeIds: []
        },
        {
          id: this.generateId('prin'),
          code: 'EYLF_P5',
          name: 'Ongoing learning and reflective practice',
          description: 'Reflective practice is a form of ongoing learning that involves engagement with questions.',
          practiceIndicators: [
            'Educators engage in critical reflection',
            'Practice is regularly evaluated and improved',
            'Professional learning is ongoing'
          ],
          reflectiveQuestions: [
            'What theories inform my practice?',
            'How do I know my practice is effective?'
          ],
          relatedOutcomeIds: []
        }
      ],
      practices: [
        {
          id: this.generateId('prac'),
          code: 'EYLF_PR1',
          name: 'Holistic approaches',
          description: 'Recognising that children\'s learning is integrated and interconnected.',
          indicators: [
            'Learning experiences address multiple outcomes',
            'Physical, social, emotional and cognitive learning are connected',
            'Children\'s interests drive learning'
          ],
          strategies: [
            'Plan experiences that connect across outcomes',
            'Observe how children connect different areas of learning'
          ],
          relatedPrincipleIds: [],
          exampleScenarios: []
        },
        {
          id: this.generateId('prac'),
          code: 'EYLF_PR2',
          name: 'Responsiveness to children',
          description: 'Educators respond to children\'s strengths, abilities, interests and needs.',
          indicators: [
            'Programming is responsive to children\'s interests',
            'Individual children\'s needs are met',
            'Experiences are adapted based on children\'s responses'
          ],
          strategies: [
            'Observe children to understand their interests',
            'Modify experiences based on children\'s responses'
          ],
          relatedPrincipleIds: [],
          exampleScenarios: []
        },
        {
          id: this.generateId('prac'),
          code: 'EYLF_PR3',
          name: 'Learning through play',
          description: 'Play provides opportunities for learning that are responsive to children.',
          indicators: [
            'Play-based learning is prioritised',
            'Children have extended time for play',
            'Educators support and extend play'
          ],
          strategies: [
            'Provide open-ended materials',
            'Allow extended periods of uninterrupted play'
          ],
          relatedPrincipleIds: [],
          exampleScenarios: []
        },
        {
          id: this.generateId('prac'),
          code: 'EYLF_PR4',
          name: 'Intentional teaching',
          description: 'Educators are deliberate, purposeful and thoughtful in their decisions and actions.',
          indicators: [
            'Teaching is planned and purposeful',
            'Educators scaffold children\'s learning',
            'Learning intentions are clear'
          ],
          strategies: [
            'Set clear learning intentions',
            'Use questioning to extend thinking'
          ],
          relatedPrincipleIds: [],
          exampleScenarios: []
        },
        {
          id: this.generateId('prac'),
          code: 'EYLF_PR5',
          name: 'Learning environments',
          description: 'Learning environments support all children\'s learning.',
          indicators: [
            'Environments are inclusive and accessible',
            'Resources reflect diversity',
            'Indoor and outdoor spaces are engaging'
          ],
          strategies: [
            'Create inviting, accessible spaces',
            'Rotate resources to maintain engagement'
          ],
          relatedPrincipleIds: [],
          exampleScenarios: []
        },
        {
          id: this.generateId('prac'),
          code: 'EYLF_PR6',
          name: 'Cultural competence',
          description: 'Cultural competence is knowing, understanding and valuing cultures.',
          indicators: [
            'Educators develop cultural self-awareness',
            'Cultural practices are respected',
            'Anti-bias approaches are used'
          ],
          strategies: [
            'Learn about families\' cultural backgrounds',
            'Embed Aboriginal and Torres Strait Islander perspectives'
          ],
          relatedPrincipleIds: [],
          exampleScenarios: []
        },
        {
          id: this.generateId('prac'),
          code: 'EYLF_PR7',
          name: 'Continuity of learning and transitions',
          description: 'Continuity of learning supports children as they move between settings.',
          indicators: [
            'Transitions are planned and supported',
            'Information is shared between settings',
            'Children are prepared for changes'
          ],
          strategies: [
            'Communicate with families about transitions',
            'Share information with receiving settings'
          ],
          relatedPrincipleIds: [],
          exampleScenarios: []
        },
        {
          id: this.generateId('prac'),
          code: 'EYLF_PR8',
          name: 'Assessment for learning',
          description: 'Assessment for learning engages educators in documenting, analysing and acting on evidence.',
          indicators: [
            'Observation and documentation are ongoing',
            'Assessment informs planning',
            'Families are involved in assessment'
          ],
          strategies: [
            'Use multiple forms of documentation',
            'Share assessments with families'
          ],
          relatedPrincipleIds: [],
          exampleScenarios: []
        }
      ],
      assessmentApproach: {
        type: 'observation_based',
        observationFrequency: {
          minimum: 2,
          recommended: 4,
          period: 'week'
        },
        documentationExpectations: [
          'Learning stories or narratives',
          'Photo documentation',
          'Work samples',
          'Jottings and anecdotal notes'
        ],
        formalAssessmentPoints: [
          {
            id: this.generateId('ap'),
            name: 'Transition to School Statement',
            timing: 'Prior to school entry',
            purpose: 'Share information about child\'s learning with school',
            required: true,
            outputType: 'summary'
          }
        ],
        moderationRequired: false
      },
      observationTypes: [
        {
          id: this.generateId('ot'),
          code: 'LEARNING_STORY',
          name: 'Learning Story',
          description: 'Narrative documentation of significant learning moments',
          requiredFields: ['title', 'narrative', 'child_voice', 'learning_connections', 'next_steps'],
          optionalFields: ['photos', 'family_input'],
          typicalLength: 'extended',
          bestUsedFor: ['Significant learning moments', 'Complex learning sequences'],
          templatePrompt: 'Describe what you observed, what learning was happening, and how you might extend this.'
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
          templatePrompt: 'Note what the child did/said and which outcome it relates to.'
        },
        {
          id: this.generateId('ot'),
          code: 'PHOTO_OBS',
          name: 'Photo Observation',
          description: 'Photo with caption describing learning',
          requiredFields: ['photo', 'caption', 'outcome_links'],
          optionalFields: ['child_quote'],
          typicalLength: 'brief',
          bestUsedFor: ['Visual documentation', 'Sharing with families'],
          templatePrompt: 'Include a photo and describe the learning visible.'
        }
      ],
      documentationRequirements: [
        {
          type: 'learning_journal',
          frequency: 'ongoing',
          audience: ['parent', 'educator', 'child'],
          requiredElements: ['Learning stories', 'Photo observations', 'Work samples'],
          formatGuidance: 'Individual portfolio for each child, shared regularly with families'
        },
        {
          type: 'transition_statement',
          frequency: 'at_transition',
          audience: ['next_setting', 'parent'],
          requiredElements: ['Summary of learning', 'Strengths', 'Areas of interest', 'Support strategies'],
          formatGuidance: 'Use the national Transition to School Statement template'
        }
      ]
    };
  }

  private getEYFSData(version?: string): FrameworkDataTemplate {
    return {
      name: 'Early Years Foundation Stage',
      version: version || '2024',
      jurisdiction: 'England',
      ageRange: {
        minMonths: 0,
        maxMonths: 60,
        displayRange: 'Birth to 5 years (end of Reception)'
      },
      sourceUrl: 'https://www.gov.uk/government/publications/early-years-foundation-stage-framework--2',
      principles: [
        {
          id: this.generateId('prin'),
          code: 'EYFS_UP1',
          name: 'A Unique Child',
          description: 'Every child is a unique child who is constantly learning and can be resilient, capable, confident and self-assured.',
          practiceIndicators: [
            'Child development is understood',
            'Inclusive practice is implemented',
            'Children feel safe and supported'
          ],
          reflectiveQuestions: [
            'How do I support each child\'s individual needs?',
            'How do I celebrate each child\'s uniqueness?'
          ],
          relatedOutcomeIds: []
        },
        {
          id: this.generateId('prin'),
          code: 'EYFS_UP2',
          name: 'Positive Relationships',
          description: 'Children learn to be strong and independent through positive relationships.',
          practiceIndicators: [
            'Key person approach is implemented',
            'Relationships with parents are strong',
            'Children form attachments'
          ],
          reflectiveQuestions: [
            'How effective is my key person approach?',
            'How do I build relationships with all families?'
          ],
          relatedOutcomeIds: []
        },
        {
          id: this.generateId('prin'),
          code: 'EYFS_UP3',
          name: 'Enabling Environments',
          description: 'Children learn and develop well in enabling environments with teaching and support from adults.',
          practiceIndicators: [
            'Environment supports learning',
            'Routines are flexible and responsive',
            'Resources are accessible'
          ],
          reflectiveQuestions: [
            'Does my environment promote independence?',
            'How do I use the outdoor environment?'
          ],
          relatedOutcomeIds: []
        },
        {
          id: this.generateId('prin'),
          code: 'EYFS_UP4',
          name: 'Learning and Development',
          description: 'Children develop and learn at different rates.',
          practiceIndicators: [
            'Play-based learning is central',
            'Individual rates of development are respected',
            'Adults support and extend learning'
          ],
          reflectiveQuestions: [
            'How do I balance adult-led and child-initiated activities?',
            'How do I track children\'s progress?'
          ],
          relatedOutcomeIds: []
        }
      ],
      practices: [
        {
          id: this.generateId('prac'),
          code: 'EYFS_PL1',
          name: 'Playing and exploring',
          description: 'Children investigate and experience things, and "have a go".',
          indicators: [
            'Finding out and exploring',
            'Playing with what they know',
            'Being willing to "have a go"'
          ],
          strategies: [
            'Provide open-ended resources',
            'Follow children\'s interests',
            'Model curiosity and exploration'
          ],
          relatedPrincipleIds: [],
          exampleScenarios: []
        },
        {
          id: this.generateId('prac'),
          code: 'EYFS_PL2',
          name: 'Active learning',
          description: 'Children concentrate and keep on trying if they encounter difficulties.',
          indicators: [
            'Being involved and concentrating',
            'Keeping trying',
            'Enjoying achieving what they set out to do'
          ],
          strategies: [
            'Allow extended time for activities',
            'Celebrate persistence and effort',
            'Avoid over-praising outcomes'
          ],
          relatedPrincipleIds: [],
          exampleScenarios: []
        },
        {
          id: this.generateId('prac'),
          code: 'EYFS_PL3',
          name: 'Creating and thinking critically',
          description: 'Children have and develop their own ideas, make links between ideas, and develop strategies for doing things.',
          indicators: [
            'Having their own ideas',
            'Making links',
            'Choosing ways to do things'
          ],
          strategies: [
            'Ask open-ended questions',
            'Support problem-solving',
            'Value children\'s ideas'
          ],
          relatedPrincipleIds: [],
          exampleScenarios: []
        }
      ],
      assessmentApproach: {
        type: 'observation_based',
        observationFrequency: {
          minimum: 3,
          recommended: 5,
          period: 'week'
        },
        documentationExpectations: [
          'Observations (written and photographic)',
          'Learning journals',
          'Two-way communication with parents'
        ],
        formalAssessmentPoints: [
          {
            id: this.generateId('ap'),
            name: 'Progress check at age two',
            timing: 'Between 24-36 months',
            purpose: 'Review progress in prime areas and identify any needs',
            required: true,
            outputType: 'summary'
          },
          {
            id: this.generateId('ap'),
            name: 'EYFS Profile',
            timing: 'End of Reception year',
            purpose: 'Summarise attainment against Early Learning Goals',
            required: true,
            outputType: 'profile'
          }
        ],
        moderationRequired: true,
        moderationGuidance: 'Local authority moderation of EYFS Profile assessments'
      },
      observationTypes: [
        {
          id: this.generateId('ot'),
          code: 'EYFS_OBS',
          name: 'Observation',
          description: 'Record of what a child did, said, or demonstrated',
          requiredFields: ['date', 'observation_text', 'area_of_learning'],
          optionalFields: ['photo', 'next_steps'],
          typicalLength: 'medium',
          bestUsedFor: ['Tracking progress', 'Identifying next steps'],
          templatePrompt: 'Describe what the child did/said and link to areas of learning.'
        },
        {
          id: this.generateId('ot'),
          code: 'TAPESTRY_OBS',
          name: 'Tapestry-style Observation',
          description: 'Photo-led observation with developmental links',
          requiredFields: ['photo', 'description', 'area_links', 'characteristics_of_effective_learning'],
          optionalFields: ['parent_comment', 'next_steps'],
          typicalLength: 'medium',
          bestUsedFor: ['Sharing with parents', 'Portfolio building'],
          templatePrompt: 'Add a photo and describe the learning, linking to EYFS areas.'
        }
      ],
      documentationRequirements: [
        {
          type: 'learning_journal',
          frequency: 'ongoing',
          audience: ['parent', 'educator'],
          requiredElements: ['Regular observations', 'Photos', 'Next steps'],
          formatGuidance: 'Online journal shared with parents (e.g., Tapestry, Evidence Me)'
        },
        {
          type: 'progress_report',
          frequency: 'termly',
          audience: ['parent'],
          requiredElements: ['Summary of progress', 'Next steps'],
          formatGuidance: 'Written summary for parents each term'
        }
      ]
    };
  }

  private getTeWharikiData(version?: string): FrameworkDataTemplate {
    // Te Whāriki - New Zealand early childhood curriculum
    return {
      name: 'Te Whāriki',
      version: version || '2017',
      jurisdiction: 'New Zealand',
      ageRange: {
        minMonths: 0,
        maxMonths: 72,
        displayRange: 'Birth to school entry'
      },
      sourceUrl: 'https://www.education.govt.nz/early-childhood/teaching-and-learning/te-whariki/',
      principles: [],  // Would be populated with actual Te Whāriki principles
      practices: [],
      assessmentApproach: {
        type: 'observation_based',
        observationFrequency: { minimum: 2, recommended: 4, period: 'week' },
        documentationExpectations: ['Learning stories'],
        formalAssessmentPoints: [],
        moderationRequired: false
      },
      observationTypes: [],
      documentationRequirements: []
    };
  }

  private getHeadStartData(version?: string): FrameworkDataTemplate {
    // Head Start Early Learning Outcomes Framework
    return {
      name: 'Head Start Early Learning Outcomes Framework',
      version: version || '2015',
      jurisdiction: 'USA',
      ageRange: {
        minMonths: 0,
        maxMonths: 60,
        displayRange: 'Birth to 5 years'
      },
      sourceUrl: 'https://eclkc.ohs.acf.hhs.gov/school-readiness/article/head-start-early-learning-outcomes-framework',
      principles: [],
      practices: [],
      assessmentApproach: {
        type: 'observation_based',
        observationFrequency: { minimum: 3, recommended: 5, period: 'week' },
        documentationExpectations: ['Observations', 'Work samples', 'Checklists'],
        formalAssessmentPoints: [],
        moderationRequired: false
      },
      observationTypes: [],
      documentationRequirements: []
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
        moderationRequired: false
      },
      observationTypes: [],
      documentationRequirements: []
    };
  }

  // ==========================================================================
  // PRIVATE METHODS - OUTCOME CREATION
  // ==========================================================================

  private createLearningOutcomes(code: EarlyYearsFramework, frameworkId: string): LearningOutcome[] {
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
    const outcomes: LearningOutcome[] = [
      {
        id: this.generateId('out'),
        frameworkId,
        code: 'EYLF_O1',
        number: 1,
        name: 'Children have a strong sense of identity',
        description: 'Children feel safe, secure, and supported. They develop their autonomy, inter-dependence, resilience and sense of agency.',
        subElements: [
          {
            id: this.generateId('sub'),
            outcomeId: '',  // Will be set after outcome creation
            code: 'EYLF_O1.1',
            description: 'Children feel safe, secure, and supported',
            exampleBehaviours: [
              'Separates from carer with minimal distress',
              'Seeks comfort from familiar adults',
              'Expresses a wide range of emotions'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O1.1')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O1.2',
            description: 'Children develop their emerging autonomy, inter-dependence, resilience and sense of agency',
            exampleBehaviours: [
              'Makes choices and decisions',
              'Attempts new challenges',
              'Persists when tasks are difficult'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O1.2')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O1.3',
            description: 'Children develop knowledgeable, confident self-identities and a positive sense of self-worth',
            exampleBehaviours: [
              'Shares information about themselves',
              'Shows pride in achievements',
              'Recognises own strengths'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O1.3')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O1.4',
            description: 'Children learn to interact in relation to others with care, empathy and respect',
            exampleBehaviours: [
              'Shows care and concern for others',
              'Responds to others\' distress',
              'Takes turns and shares'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O1.4')
          }
        ],
        indicators: this.createEYLFIndicators('EYLF_O1'),
        developmentalAreaIds: [],
        aiEnrichment: this.createEmptyOutcomeEnrichment()
      },
      {
        id: this.generateId('out'),
        frameworkId,
        code: 'EYLF_O2',
        number: 2,
        name: 'Children are connected with and contribute to their world',
        description: 'Children develop a sense of belonging to groups and communities and an understanding of the reciprocal rights and responsibilities necessary for active civic participation.',
        subElements: [
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O2.1',
            description: 'Children develop a sense of belonging to groups and communities and an understanding of the reciprocal rights and responsibilities',
            exampleBehaviours: [
              'Participates in group activities',
              'Follows group rules',
              'Contributes to group decisions'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O2.1')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O2.2',
            description: 'Children respond to diversity with respect',
            exampleBehaviours: [
              'Shows interest in others\' backgrounds',
              'Asks questions about differences respectfully',
              'Includes others in play'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O2.2')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O2.3',
            description: 'Children become aware of fairness',
            exampleBehaviours: [
              'Notices when things are unfair',
              'Advocates for fairness',
              'Shares resources equitably'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O2.3')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O2.4',
            description: 'Children become socially responsible and show respect for the environment',
            exampleBehaviours: [
              'Cares for living things',
              'Participates in recycling',
              'Shows interest in nature'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O2.4')
          }
        ],
        indicators: this.createEYLFIndicators('EYLF_O2'),
        developmentalAreaIds: [],
        aiEnrichment: this.createEmptyOutcomeEnrichment()
      },
      {
        id: this.generateId('out'),
        frameworkId,
        code: 'EYLF_O3',
        number: 3,
        name: 'Children have a strong sense of wellbeing',
        description: 'Children become strong in their social and emotional wellbeing, take increasing responsibility for their own health and physical wellbeing.',
        subElements: [
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O3.1',
            description: 'Children become strong in their social and emotional wellbeing',
            exampleBehaviours: [
              'Expresses emotions appropriately',
              'Manages frustration',
              'Forms positive relationships'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O3.1')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O3.2',
            description: 'Children take increasing responsibility for their own health and physical wellbeing',
            exampleBehaviours: [
              'Attends to personal hygiene',
              'Makes healthy food choices',
              'Rests when tired'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O3.2')
          }
        ],
        indicators: this.createEYLFIndicators('EYLF_O3'),
        developmentalAreaIds: [],
        aiEnrichment: this.createEmptyOutcomeEnrichment()
      },
      {
        id: this.generateId('out'),
        frameworkId,
        code: 'EYLF_O4',
        number: 4,
        name: 'Children are confident and involved learners',
        description: 'Children develop dispositions such as curiosity, cooperation, confidence, creativity, commitment, enthusiasm, persistence, imagination and reflexivity.',
        subElements: [
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O4.1',
            description: 'Children develop dispositions for learning such as curiosity, cooperation, confidence, creativity, commitment, enthusiasm, persistence, imagination and reflexivity',
            exampleBehaviours: [
              'Shows curiosity and interest',
              'Persists with challenging tasks',
              'Uses imagination in play'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O4.1')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O4.2',
            description: 'Children develop a range of skills and processes such as problem solving, inquiry, experimentation, hypothesising, researching and investigating',
            exampleBehaviours: [
              'Asks questions',
              'Makes predictions',
              'Tests ideas'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O4.2')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O4.3',
            description: 'Children transfer and adapt what they have learned from one context to another',
            exampleBehaviours: [
              'Applies skills in new situations',
              'Makes connections between experiences',
              'Uses prior knowledge'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O4.3')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O4.4',
            description: 'Children resource their own learning through connecting with people, place, technologies and natural and processed materials',
            exampleBehaviours: [
              'Selects appropriate materials',
              'Seeks help when needed',
              'Uses technology purposefully'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O4.4')
          }
        ],
        indicators: this.createEYLFIndicators('EYLF_O4'),
        developmentalAreaIds: [],
        aiEnrichment: this.createEmptyOutcomeEnrichment()
      },
      {
        id: this.generateId('out'),
        frameworkId,
        code: 'EYLF_O5',
        number: 5,
        name: 'Children are effective communicators',
        description: 'Children interact verbally and non-verbally with others for a range of purposes. They engage with a range of texts and gain meaning from them. They express ideas and make meaning using a range of media.',
        subElements: [
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O5.1',
            description: 'Children interact verbally and non-verbally with others for a range of purposes',
            exampleBehaviours: [
              'Initiates conversations',
              'Uses gestures to communicate',
              'Listens to others'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O5.1')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O5.2',
            description: 'Children engage with a range of texts and gain meaning from these texts',
            exampleBehaviours: [
              'Shows interest in books',
              'Recognises familiar signs and logos',
              'Retells stories'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O5.2')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O5.3',
            description: 'Children express ideas and make meaning using a range of media',
            exampleBehaviours: [
              'Uses drawing to communicate',
              'Creates constructions',
              'Engages in dramatic play'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O5.3')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O5.4',
            description: 'Children begin to understand how symbols and pattern systems work',
            exampleBehaviours: [
              'Recognises letters in name',
              'Counts objects',
              'Recognises patterns'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O5.4')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYLF_O5.5',
            description: 'Children use information and communication technologies to access information, investigate ideas and represent their thinking',
            exampleBehaviours: [
              'Uses tablets and computers purposefully',
              'Takes photos to document learning',
              'Uses technology for creative expression'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYLF_O5.5')
          }
        ],
        indicators: this.createEYLFIndicators('EYLF_O5'),
        developmentalAreaIds: [],
        aiEnrichment: this.createEmptyOutcomeEnrichment()
      }
    ];

    // Set outcome IDs on sub-elements
    for (const outcome of outcomes) {
      for (const subElement of outcome.subElements) {
        subElement.outcomeId = outcome.id;
      }
    }

    return outcomes;
  }

  private createEYFSOutcomes(frameworkId: string): LearningOutcome[] {
    // EYFS uses "Areas of Learning" rather than "Outcomes"
    // We'll represent them as outcomes for consistency
    const outcomes: LearningOutcome[] = [
      // Prime Areas
      {
        id: this.generateId('out'),
        frameworkId,
        code: 'EYFS_CL',
        name: 'Communication and Language',
        description: 'The development of children\'s spoken language underpins all seven areas of learning and development.',
        subElements: [
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_CL_LA',
            description: 'Listening and Attention: Listen attentively in a range of situations',
            exampleBehaviours: [
              'Maintains attention during appropriate activities',
              'Listens to stories with increasing attention',
              'Responds to instructions involving two or more steps'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_CL_LA')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_CL_U',
            description: 'Understanding: Follow instructions and understand questions',
            exampleBehaviours: [
              'Responds to simple instructions',
              'Understands \'why\' and \'how\' questions',
              'Shows understanding of prepositions'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_CL_U')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_CL_S',
            description: 'Speaking: Express themselves effectively',
            exampleBehaviours: [
              'Uses language to share feelings and experiences',
              'Speaks in sentences',
              'Uses past, present and future tenses'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_CL_S')
          }
        ],
        indicators: this.createEYFSIndicators('EYFS_CL'),
        developmentalAreaIds: [],
        aiEnrichment: this.createEmptyOutcomeEnrichment()
      },
      {
        id: this.generateId('out'),
        frameworkId,
        code: 'EYFS_PD',
        name: 'Physical Development',
        description: 'Physical activity is vital for children\'s all-round development.',
        subElements: [
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_PD_GM',
            description: 'Gross Motor: Move energetically and develop overall body strength, coordination and balance',
            exampleBehaviours: [
              'Runs, jumps, climbs confidently',
              'Negotiates space successfully',
              'Shows good control in ball skills'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_PD_GM')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_PD_FM',
            description: 'Fine Motor: Use a range of small tools and develop fine motor skills',
            exampleBehaviours: [
              'Uses scissors effectively',
              'Shows good pencil grip',
              'Buttons and zips clothing'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_PD_FM')
          }
        ],
        indicators: this.createEYFSIndicators('EYFS_PD'),
        developmentalAreaIds: [],
        aiEnrichment: this.createEmptyOutcomeEnrichment()
      },
      {
        id: this.generateId('out'),
        frameworkId,
        code: 'EYFS_PSED',
        name: 'Personal, Social and Emotional Development',
        description: 'Children\'s personal, social and emotional development (PSED) is crucial for children to lead healthy and happy lives.',
        subElements: [
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_PSED_SR',
            description: 'Self-Regulation: Show an understanding of their own feelings and those of others',
            exampleBehaviours: [
              'Expresses a range of emotions',
              'Manages own feelings',
              'Follows rules without adult reminders'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_PSED_SR')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_PSED_MS',
            description: 'Managing Self: Be confident to try new activities',
            exampleBehaviours: [
              'Tries new activities',
              'Shows independence in self-care',
              'Makes healthy choices'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_PSED_MS')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_PSED_BR',
            description: 'Building Relationships: Work and play cooperatively',
            exampleBehaviours: [
              'Forms positive relationships',
              'Takes turns and shares',
              'Shows sensitivity to others'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_PSED_BR')
          }
        ],
        indicators: this.createEYFSIndicators('EYFS_PSED'),
        developmentalAreaIds: [],
        aiEnrichment: this.createEmptyOutcomeEnrichment()
      },
      // Specific Areas
      {
        id: this.generateId('out'),
        frameworkId,
        code: 'EYFS_L',
        name: 'Literacy',
        description: 'It is crucial for children to develop a life-long love of reading.',
        subElements: [
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_L_C',
            description: 'Comprehension: Demonstrate understanding of what has been read',
            exampleBehaviours: [
              'Listens to and talks about stories',
              'Anticipates key events in stories',
              'Describes main story settings and characters'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_L_C')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_L_WR',
            description: 'Word Reading: Read words and simple sentences',
            exampleBehaviours: [
              'Says a sound for each letter',
              'Blends sounds to read words',
              'Reads simple phrases and sentences'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_L_WR')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_L_W',
            description: 'Writing: Write simple phrases and sentences',
            exampleBehaviours: [
              'Forms lower-case letters correctly',
              'Spells words by identifying sounds',
              'Writes simple sentences'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_L_W')
          }
        ],
        indicators: this.createEYFSIndicators('EYFS_L'),
        developmentalAreaIds: [],
        aiEnrichment: this.createEmptyOutcomeEnrichment()
      },
      {
        id: this.generateId('out'),
        frameworkId,
        code: 'EYFS_M',
        name: 'Mathematics',
        description: 'Developing a strong grounding in number is essential.',
        subElements: [
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_M_N',
            description: 'Number: Have a deep understanding of number to 10',
            exampleBehaviours: [
              'Counts objects accurately',
              'Understands composition of numbers',
              'Solves practical problems'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_M_N')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_M_NP',
            description: 'Numerical Patterns: Explore and represent patterns',
            exampleBehaviours: [
              'Recognises and continues patterns',
              'Compares quantities',
              'Explores and represents number relationships'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_M_NP')
          }
        ],
        indicators: this.createEYFSIndicators('EYFS_M'),
        developmentalAreaIds: [],
        aiEnrichment: this.createEmptyOutcomeEnrichment()
      },
      {
        id: this.generateId('out'),
        frameworkId,
        code: 'EYFS_UTW',
        name: 'Understanding the World',
        description: 'Understanding the world involves guiding children to make sense of their physical world and their community.',
        subElements: [
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_UTW_PP',
            description: 'Past and Present: Talk about the lives of people around them',
            exampleBehaviours: [
              'Talks about family members',
              'Understands past and present',
              'Knows about similarities and differences'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_UTW_PP')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_UTW_PC',
            description: 'People, Culture and Communities: Know about similarities and differences',
            exampleBehaviours: [
              'Describes immediate environment',
              'Knows about similarities and differences',
              'Explores the natural world'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_UTW_PC')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_UTW_NW',
            description: 'The Natural World: Explore the natural world around them',
            exampleBehaviours: [
              'Explores the natural world',
              'Describes what they see, hear and feel',
              'Understands seasons and change'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_UTW_NW')
          }
        ],
        indicators: this.createEYFSIndicators('EYFS_UTW'),
        developmentalAreaIds: [],
        aiEnrichment: this.createEmptyOutcomeEnrichment()
      },
      {
        id: this.generateId('out'),
        frameworkId,
        code: 'EYFS_EAD',
        name: 'Expressive Arts and Design',
        description: 'The development of children\'s artistic and cultural awareness supports their imagination and creativity.',
        subElements: [
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_EAD_CM',
            description: 'Creating with Materials: Safely use and explore materials',
            exampleBehaviours: [
              'Explores colour and colour mixing',
              'Uses drawing, painting, and collage',
              'Constructs with a purpose in mind'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_EAD_CM')
          },
          {
            id: this.generateId('sub'),
            outcomeId: '',
            code: 'EYFS_EAD_BI',
            description: 'Being Imaginative and Expressive: Invent, adapt and recount narratives',
            exampleBehaviours: [
              'Engages in imaginative play',
              'Performs songs, rhymes, poems and stories',
              'Expresses feelings through art, music and dance'
            ],
            progressionDescriptors: this.createProgressionDescriptors('EYFS_EAD_BI')
          }
        ],
        indicators: this.createEYFSIndicators('EYFS_EAD'),
        developmentalAreaIds: [],
        aiEnrichment: this.createEmptyOutcomeEnrichment()
      }
    ];

    // Set outcome IDs on sub-elements
    for (const outcome of outcomes) {
      for (const subElement of outcome.subElements) {
        subElement.outcomeId = outcome.id;
      }
    }

    return outcomes;
  }

  // ==========================================================================
  // PRIVATE METHODS - DEVELOPMENTAL AREAS
  // ==========================================================================

  private createDevelopmentalAreas(code: EarlyYearsFramework, frameworkId: string): DevelopmentalArea[] {
    // EYFS has explicit areas; EYLF is outcome-based but we can create implicit areas
    switch (code) {
      case 'EYFS':
        return this.createEYFSAreas(frameworkId);
      case 'EYLF':
        return this.createEYLFAreas(frameworkId);
      default:
        return [];
    }
  }

  private createEYFSAreas(frameworkId: string): DevelopmentalArea[] {
    return [
      {
        id: this.generateId('area'),
        frameworkId,
        code: 'EYFS_PRIME_CL',
        name: 'Communication and Language',
        description: 'The development of children\'s spoken language underpins all seven areas of learning.',
        areaType: 'prime',
        aspects: [
          {
            id: this.generateId('asp'),
            areaId: '',
            code: 'EYFS_CL_LA',
            name: 'Listening and Attention',
            description: 'Listening attentively in a range of situations',
            progressionSteps: this.createProgressionSteps('listening'),
            suggestedActivities: []
          },
          {
            id: this.generateId('asp'),
            areaId: '',
            code: 'EYFS_CL_U',
            name: 'Understanding',
            description: 'Following instructions and understanding questions',
            progressionSteps: this.createProgressionSteps('understanding'),
            suggestedActivities: []
          },
          {
            id: this.generateId('asp'),
            areaId: '',
            code: 'EYFS_CL_S',
            name: 'Speaking',
            description: 'Expressing themselves effectively',
            progressionSteps: this.createProgressionSteps('speaking'),
            suggestedActivities: []
          }
        ],
        linkedAreaIds: ['EYFS_SPECIFIC_L'],  // Literacy builds on C&L
        supportedOutcomeIds: ['EYFS_CL']
      },
      {
        id: this.generateId('area'),
        frameworkId,
        code: 'EYFS_PRIME_PD',
        name: 'Physical Development',
        description: 'Physical activity is vital for children\'s all-round development.',
        areaType: 'prime',
        aspects: [
          {
            id: this.generateId('asp'),
            areaId: '',
            code: 'EYFS_PD_GM',
            name: 'Gross Motor',
            description: 'Moving energetically with control and coordination',
            progressionSteps: this.createProgressionSteps('gross_motor'),
            suggestedActivities: []
          },
          {
            id: this.generateId('asp'),
            areaId: '',
            code: 'EYFS_PD_FM',
            name: 'Fine Motor',
            description: 'Using tools and developing fine motor skills',
            progressionSteps: this.createProgressionSteps('fine_motor'),
            suggestedActivities: []
          }
        ],
        linkedAreaIds: [],
        supportedOutcomeIds: ['EYFS_PD']
      },
      {
        id: this.generateId('area'),
        frameworkId,
        code: 'EYFS_PRIME_PSED',
        name: 'Personal, Social and Emotional Development',
        description: 'PSED is crucial for children to lead healthy and happy lives.',
        areaType: 'prime',
        aspects: [
          {
            id: this.generateId('asp'),
            areaId: '',
            code: 'EYFS_PSED_SR',
            name: 'Self-Regulation',
            description: 'Understanding own feelings and those of others',
            progressionSteps: this.createProgressionSteps('self_regulation'),
            suggestedActivities: []
          },
          {
            id: this.generateId('asp'),
            areaId: '',
            code: 'EYFS_PSED_MS',
            name: 'Managing Self',
            description: 'Being confident to try new activities',
            progressionSteps: this.createProgressionSteps('managing_self'),
            suggestedActivities: []
          },
          {
            id: this.generateId('asp'),
            areaId: '',
            code: 'EYFS_PSED_BR',
            name: 'Building Relationships',
            description: 'Working and playing cooperatively',
            progressionSteps: this.createProgressionSteps('relationships'),
            suggestedActivities: []
          }
        ],
        linkedAreaIds: [],
        supportedOutcomeIds: ['EYFS_PSED']
      }
      // Specific areas would follow similar pattern...
    ];
  }

  private createEYLFAreas(frameworkId: string): DevelopmentalArea[] {
    // EYLF doesn't have explicit areas like EYFS, but we can create
    // developmental domains for tracking purposes
    return [
      {
        id: this.generateId('area'),
        frameworkId,
        code: 'EYLF_DA_IDENTITY',
        name: 'Identity Development',
        description: 'Supporting children to develop a strong sense of identity',
        areaType: 'cross_cutting',
        aspects: [],
        linkedAreaIds: [],
        supportedOutcomeIds: ['EYLF_O1']
      },
      {
        id: this.generateId('area'),
        frameworkId,
        code: 'EYLF_DA_COMMUNITY',
        name: 'Community Connection',
        description: 'Supporting children to connect with and contribute to their world',
        areaType: 'cross_cutting',
        aspects: [],
        linkedAreaIds: [],
        supportedOutcomeIds: ['EYLF_O2']
      },
      {
        id: this.generateId('area'),
        frameworkId,
        code: 'EYLF_DA_WELLBEING',
        name: 'Wellbeing',
        description: 'Supporting children\'s social, emotional and physical wellbeing',
        areaType: 'cross_cutting',
        aspects: [],
        linkedAreaIds: [],
        supportedOutcomeIds: ['EYLF_O3']
      },
      {
        id: this.generateId('area'),
        frameworkId,
        code: 'EYLF_DA_LEARNING',
        name: 'Learning Dispositions',
        description: 'Supporting children to become confident and involved learners',
        areaType: 'cross_cutting',
        aspects: [],
        linkedAreaIds: [],
        supportedOutcomeIds: ['EYLF_O4']
      },
      {
        id: this.generateId('area'),
        frameworkId,
        code: 'EYLF_DA_COMMUNICATION',
        name: 'Communication',
        description: 'Supporting children to become effective communicators',
        areaType: 'cross_cutting',
        aspects: [],
        linkedAreaIds: [],
        supportedOutcomeIds: ['EYLF_O5']
      }
    ];
  }

  // ==========================================================================
  // PRIVATE METHODS - HELPERS
  // ==========================================================================

  private createProgressionDescriptors(subElementCode: string): ProgressionDescriptor[] {
    return [
      {
        subElementId: subElementCode,
        level: 'emerging',
        description: 'Beginning to show this with support',
        typicalIndicators: ['Shows interest', 'Attempts with support', 'Responds to prompts']
      },
      {
        subElementId: subElementCode,
        level: 'developing',
        description: 'Showing this more consistently',
        typicalIndicators: ['Demonstrates with reminders', 'Growing independence', 'Increasing frequency']
      },
      {
        subElementId: subElementCode,
        level: 'secure',
        description: 'Consistently demonstrates this',
        typicalIndicators: ['Independent demonstration', 'Consistent across contexts', 'Confident application']
      },
      {
        subElementId: subElementCode,
        level: 'extending',
        description: 'Going beyond expectations, applying in new ways',
        typicalIndicators: ['Creative application', 'Helps others', 'Applies in complex situations']
      }
    ];
  }

  private createEYLFIndicators(outcomeCode: string): OutcomeIndicator[] {
    // Sample indicators - in production these would be comprehensive
    const indicatorsByOutcome: Record<string, string[]> = {
      'EYLF_O1': [
        'Child separates confidently from familiar adults',
        'Child expresses a wide range of emotions',
        'Child shows pride in their achievements',
        'Child makes independent choices'
      ],
      'EYLF_O2': [
        'Child participates cooperatively in group activities',
        'Child shows interest in different cultures',
        'Child cares for the environment'
      ],
      'EYLF_O3': [
        'Child manages emotions appropriately',
        'Child attends to personal hygiene needs',
        'Child makes healthy food choices'
      ],
      'EYLF_O4': [
        'Child shows curiosity and asks questions',
        'Child persists with challenging tasks',
        'Child uses imagination in play'
      ],
      'EYLF_O5': [
        'Child initiates conversations',
        'Child shows interest in books and stories',
        'Child uses drawing to communicate ideas'
      ]
    };

    const indicators = indicatorsByOutcome[outcomeCode] || [];
    return indicators.map((text, index) => ({
      id: this.generateId('ind'),
      outcomeId: outcomeCode,
      text,
      exampleObservations: [],
      indicatesLevel: 'developing' as DevelopmentalLevel,
      keywords: text.toLowerCase().split(' ').filter(w => w.length > 3)
    }));
  }

  private createEYFSIndicators(outcomeCode: string): OutcomeIndicator[] {
    // Similar to EYLF indicators
    return [];
  }

  private createProgressionSteps(aspect: string): ProgressionStep[] {
    // Simplified - would be comprehensive in production
    return [];
  }

  private createEmptyOutcomeEnrichment(): any {
    return {
      keyConcepts: [],
      developmentalDomains: [],
      activitySuggestionsByAge: [],
      commonMisconceptions: [],
      environmentSuggestions: [],
      relatedOutcomes: [],
      typicalProgressionTimeline: []
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
    // AI analysis logic - in production would use Claude API
    const matchedOutcomes: any[] = [];
    const domains: DevelopmentalDomain[] = [];

    // Simple keyword matching for demonstration
    const textLower = text.toLowerCase();

    for (const outcome of outcomes) {
      let score = 0;

      // Check indicators
      for (const indicator of outcome.indicators) {
        const keywords = indicator.keywords || [];
        for (const keyword of keywords) {
          if (textLower.includes(keyword)) {
            score += 0.1;
          }
        }
      }

      // Check sub-elements
      for (const subElement of outcome.subElements) {
        const subKeywords = subElement.exampleBehaviours.join(' ').toLowerCase().split(' ');
        for (const keyword of subKeywords) {
          if (keyword.length > 3 && textLower.includes(keyword)) {
            score += 0.05;
          }
        }
      }

      if (score > 0.2) {
        matchedOutcomes.push({
          outcomeId: outcome.id,
          frameworkCode: this.getFrameworkCodeFromOutcome(outcome),
          confidence: Math.min(score, 1),
          levelDemonstrated: this.inferLevel(text, ageMonths)
        });
      }
    }

    // Identify developmental domains from text
    if (textLower.includes('speak') || textLower.includes('talk') || textLower.includes('said')) {
      domains.push('language');
    }
    if (textLower.includes('climb') || textLower.includes('run') || textLower.includes('jump')) {
      domains.push('physical_gross');
    }
    if (textLower.includes('draw') || textLower.includes('write') || textLower.includes('cut')) {
      domains.push('physical_fine');
    }
    if (textLower.includes('share') || textLower.includes('help') || textLower.includes('friend')) {
      domains.push('social_emotional');
    }

    const overallConfidence = matchedOutcomes.length > 0
      ? matchedOutcomes.reduce((sum, m) => sum + m.confidence, 0) / matchedOutcomes.length
      : 0.3;

    return {
      matchedOutcomes,
      developmentalDomains: domains,
      reasoning: `Analysis based on keyword matching of ${matchedOutcomes.length} potential outcomes.`,
      overallConfidence
    };
  }

  private getFrameworkCodeFromOutcome(outcome: LearningOutcome): EarlyYearsFramework {
    if (outcome.code.startsWith('EYLF')) return 'EYLF';
    if (outcome.code.startsWith('EYFS')) return 'EYFS';
    return 'EYLF';  // Default
  }

  private inferLevel(text: string, ageMonths: number): DevelopmentalLevel {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('consistently') || textLower.includes('confidently') || textLower.includes('independently')) {
      return 'secure';
    }
    if (textLower.includes('beginning') || textLower.includes('starting') || textLower.includes('with support')) {
      return 'emerging';
    }
    if (textLower.includes('sometimes') || textLower.includes('growing')) {
      return 'developing';
    }
    
    return 'developing';  // Default
  }

  private mapConfidenceToStrength(confidence: number): 'strong' | 'supporting' | 'emerging' {
    if (confidence >= 0.7) return 'strong';
    if (confidence >= 0.4) return 'supporting';
    return 'emerging';
  }

  private matchSubElements(
    text: string,
    subElements: OutcomeSubElement[]
  ): { subElementId: string; confidence: number; levelDemonstrated?: DevelopmentalLevel }[] {
    // Simplified matching
    return [];
  }

  private matchIndicators(
    text: string,
    outcomes: LearningOutcome[]
  ): { indicatorId: string; frameworkCode: EarlyYearsFramework; confidence: number }[] {
    // Simplified matching
    return [];
  }

  private assessEvidenceQuality(
    text: string,
    links: LinkedElement[]
  ): 'strong' | 'moderate' | 'weak' {
    // Based on observation length and specificity
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
      lastUpdatedAt: new Date()
    };
  }

  private calculateOutcomeProgress(
    outcome: LearningOutcome,
    links: ObservationFrameworkLink[]
  ): OutcomeProgress {
    const relevantLinks = links.filter(l =>
      l.linkedElements.some(el => el.elementId === outcome.id)
    );

    const subElementProgress = outcome.subElements.map(sub => {
      const subLinks = links.filter(l =>
        l.linkedElements.some(el => el.elementId === sub.id)
      );
      return {
        subElementId: sub.id,
        level: this.calculateLevelFromLinks(subLinks),
        lastObservedAt: subLinks.length > 0 
          ? new Date(Math.max(...subLinks.map(l => l.createdAt.getTime())))
          : undefined,
        observationCount: subLinks.length
      };
    });

    return {
      outcomeId: outcome.id,
      currentLevel: this.aggregateLevel(subElementProgress.map(s => s.level)),
      subElementProgress,
      trend: this.calculateTrend(relevantLinks),
      evidenceCount: relevantLinks.length,
      lastEvidenceAt: relevantLinks.length > 0
        ? new Date(Math.max(...relevantLinks.map(l => l.createdAt.getTime())))
        : undefined
    };
  }

  private calculateAreaProgress(
    area: DevelopmentalArea,
    links: ObservationFrameworkLink[],
    framework: EarlyYearsFrameworkConfig
  ): AreaProgress {
    return {
      areaId: area.id,
      aspectProgress: area.aspects.map(asp => ({
        aspectId: asp.id,
        currentStepId: '',
        observationCount: 0
      }))
    };
  }

  private calculateLevelFromLinks(links: ObservationFrameworkLink[]): DevelopmentalLevel {
    if (links.length === 0) return 'not_yet_observed';
    
    const levels = links.flatMap(l => 
      l.linkedElements
        .filter(el => el.levelDemonstrated)
        .map(el => el.levelDemonstrated!)
    );

    if (levels.length === 0) return 'emerging';

    // Return most common level
    const counts: Record<DevelopmentalLevel, number> = {
      'not_yet_observed': 0,
      'emerging': 0,
      'developing': 0,
      'secure': 0,
      'extending': 0,
      'embedded': 0
    };

    for (const level of levels) {
      counts[level]++;
    }

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)[0][0] as DevelopmentalLevel;
  }

  private aggregateLevel(levels: DevelopmentalLevel[]): DevelopmentalLevel {
    if (levels.length === 0) return 'not_yet_observed';
    return this.calculateLevelFromLinks([]);  // Simplified
  }

  private calculateTrend(
    links: ObservationFrameworkLink[]
  ): 'progressing' | 'consolidating' | 'needs_support' | 'insufficient_data' {
    if (links.length < 3) return 'insufficient_data';
    // Would analyze trend over time
    return 'progressing';
  }

  private identifyStrengths(
    outcomeProgress: OutcomeProgress[],
    links: ObservationFrameworkLink[]
  ): { outcomeId: string; description: string; evidenceObservationIds: string[] }[] {
    return outcomeProgress
      .filter(op => op.currentLevel === 'secure' || op.currentLevel === 'extending')
      .slice(0, 3)
      .map(op => ({
        outcomeId: op.outcomeId,
        description: 'Showing strong progress in this area',
        evidenceObservationIds: links
          .filter(l => l.linkedElements.some(el => el.elementId === op.outcomeId))
          .slice(0, 3)
          .map(l => l.observationId)
      }));
  }

  private identifyAreasForGrowth(
    outcomeProgress: OutcomeProgress[]
  ): { outcomeId: string; description: string; suggestedStrategies: string[] }[] {
    return outcomeProgress
      .filter(op => op.currentLevel === 'emerging' || op.currentLevel === 'not_yet_observed')
      .filter(op => op.evidenceCount > 0)  // Only flag if we have some evidence
      .slice(0, 3)
      .map(op => ({
        outcomeId: op.outcomeId,
        description: 'An area that could benefit from additional focus',
        suggestedStrategies: ['Provide more opportunities', 'Scaffold learning', 'Observe more closely']
      }));
  }

  private async generateProgressSummary(
    progress: ChildFrameworkProgress,
    framework: EarlyYearsFrameworkConfig
  ): Promise<{
    narrativeSummary: string;
    keyHighlights: string[];
    recommendations: string[];
    generatedAt: Date;
  }> {
    const strengthCount = progress.strengths.length;
    const growthCount = progress.areasForGrowth.length;

    return {
      narrativeSummary: `The child is showing wonderful progress across ${strengthCount} key areas. ` +
        `There are ${growthCount} areas where additional support could help further development.`,
      keyHighlights: progress.strengths.map(s => s.description),
      recommendations: progress.areasForGrowth.flatMap(a => a.suggestedStrategies),
      generatedAt: new Date()
    };
  }

  // ==========================================================================
  // PRIVATE METHODS - CROSS-FRAMEWORK
  // ==========================================================================

  private async generateCrossFrameworkMappings(
    tenantId: string,
    framework: EarlyYearsFrameworkConfig,
    outcomes: LearningOutcome[]
  ): Promise<CrossFrameworkMapping[]> {
    const mappings: CrossFrameworkMapping[] = [];

    // EYLF <-> EYFS mappings
    if (framework.code === 'EYLF') {
      // EYLF O1 (Identity) -> EYFS PSED
      mappings.push({
        id: this.generateId('map'),
        sourceFramework: 'EYLF',
        sourceCode: 'EYLF_O1',
        sourceType: 'outcome',
        targetFramework: 'EYFS',
        targetCode: 'EYFS_PSED',
        targetType: 'area',
        mappingType: 'related',
        confidence: 0.8,
        explanation: 'EYLF Outcome 1 (Identity) relates to EYFS PSED, particularly Self-Regulation and Managing Self',
        source: 'ai_generated'
      });

      // EYLF O5 (Communication) -> EYFS C&L
      mappings.push({
        id: this.generateId('map'),
        sourceFramework: 'EYLF',
        sourceCode: 'EYLF_O5',
        sourceType: 'outcome',
        targetFramework: 'EYFS',
        targetCode: 'EYFS_CL',
        targetType: 'area',
        mappingType: 'equivalent',
        confidence: 0.9,
        explanation: 'EYLF Outcome 5 (Effective Communicators) closely aligns with EYFS Communication and Language',
        source: 'ai_generated'
      });
    }

    return mappings;
  }

  private translateProgressUsingMappings(
    sourceProgress: ChildFrameworkProgress,
    targetFramework: EarlyYearsFrameworkConfig,
    mappings: CrossFrameworkMapping[]
  ): ChildFrameworkProgress {
    // Create a new progress record for the target framework
    const translatedProgress: ChildFrameworkProgress = {
      id: this.generateId('prog'),
      tenantId: sourceProgress.tenantId,
      childId: sourceProgress.childId,
      frameworkId: targetFramework.id,
      ageAtLastUpdate: sourceProgress.ageAtLastUpdate,
      outcomeProgress: [],
      areaProgress: [],
      strengths: [],
      areasForGrowth: [],
      createdAt: new Date(),
      lastUpdatedAt: new Date()
    };

    // Translate using mappings
    for (const mapping of mappings) {
      const sourceOutcome = sourceProgress.outcomeProgress.find(
        op => op.outcomeId === mapping.sourceCode
      );
      if (sourceOutcome) {
        // Create translated progress
        translatedProgress.outcomeProgress.push({
          outcomeId: mapping.targetCode,
          currentLevel: sourceOutcome.currentLevel,
          subElementProgress: [],
          trend: sourceOutcome.trend,
          evidenceCount: sourceOutcome.evidenceCount
        });
      }
    }

    return translatedProgress;
  }

  // ==========================================================================
  // PRIVATE METHODS - REPORTS
  // ==========================================================================

  private async generateReportContent(
    framework: EarlyYearsFrameworkConfig,
    progress: ChildFrameworkProgress,
    links: ObservationFrameworkLink[],
    config: ProgressReportConfig,
    ageMonths: number
  ): Promise<any> {
    const sections = progress.outcomeProgress.map(op => ({
      outcomeId: op.outcomeId,
      title: framework.outcomes.find(o => o.id === op.outcomeId)?.name || 'Unknown',
      narrative: this.generateSectionNarrative(op, config.tone),
      currentLevel: op.currentLevel,
      exampleObservations: [],
      nextSteps: progress.areasForGrowth
        .filter(a => a.outcomeId === op.outcomeId)
        .flatMap(a => a.suggestedStrategies)
    }));

    return {
      introduction: this.generateReportIntroduction(config, ageMonths),
      sections,
      keyStrengths: progress.strengths.map(s => s.description),
      areasForGrowth: progress.areasForGrowth.map(a => a.description),
      nextSteps: progress.areasForGrowth.flatMap(a => a.suggestedStrategies),
      conclusion: this.generateReportConclusion(config)
    };
  }

  private generateSectionNarrative(progress: OutcomeProgress, tone: string): string {
    const levelDescriptions: Record<DevelopmentalLevel, string> = {
      'not_yet_observed': 'We haven\'t had many opportunities to observe this area yet.',
      'emerging': 'is beginning to show interest in this area',
      'developing': 'is making wonderful progress in this area',
      'secure': 'is showing strong, consistent skills in this area',
      'extending': 'is exceeding expectations in this area',
      'embedded': 'has deeply integrated these skills'
    };

    return `Your child ${levelDescriptions[progress.currentLevel] || 'is developing well'}.`;
  }

  private generateReportIntroduction(config: ProgressReportConfig, ageMonths: number): string {
    const ageYears = Math.floor(ageMonths / 12);
    const ageRemainderMonths = ageMonths % 12;
    
    return `This report summarises learning and development over the reporting period. ` +
      `At ${ageYears} years and ${ageRemainderMonths} months, your child continues to grow and learn in wonderful ways.`;
  }

  private generateReportConclusion(config: ProgressReportConfig): string {
    if (config.tone === 'celebratory') {
      return 'It has been a joy to watch your child\'s growth and we look forward to continuing this journey together!';
    }
    return 'We appreciate your partnership in supporting your child\'s learning and development.';
  }

  // ==========================================================================
  // PRIVATE METHODS - ACTIVITIES
  // ==========================================================================

  private generateActivitySuggestions(outcome: LearningOutcome): {
    ageRange: { minMonths: number; maxMonths: number };
    activities: ActivitySuggestion[];
  }[] {
    // Generate age-appropriate activities
    const ageRanges = [
      { minMonths: 0, maxMonths: 24 },
      { minMonths: 24, maxMonths: 36 },
      { minMonths: 36, maxMonths: 48 },
      { minMonths: 48, maxMonths: 60 }
    ];

    return ageRanges.map(range => ({
      ageRange: range,
      activities: this.generateActivitiesForRange(outcome, range)
    }));
  }

  private generateActivitiesForRange(
    outcome: LearningOutcome,
    range: { minMonths: number; maxMonths: number }
  ): ActivitySuggestion[] {
    // Simplified activity generation
    return [{
      id: this.generateId('act'),
      title: `Activity for ${outcome.name}`,
      description: 'An engaging activity to support this learning outcome',
      suitableAgeRange: range,
      supportsOutcomeIds: [outcome.id],
      supportsAreaIds: [],
      resourcesNeeded: ['Basic materials'],
      setupTime: 5,
      activityDuration: { min: 10, max: 20 },
      groupSize: 'flexible',
      environment: 'either',
      adaptations: [],
      observationPrompts: ['What did the child do?', 'What learning was evident?'],
      educationalRationale: `This activity supports ${outcome.name}.`
    }];
  }

  private generateProgressionTimeline(outcome: LearningOutcome): {
    level: DevelopmentalLevel;
    typicalAgeRange: { minMonths: number; maxMonths: number };
  }[] {
    return [
      { level: 'emerging', typicalAgeRange: { minMonths: 12, maxMonths: 24 } },
      { level: 'developing', typicalAgeRange: { minMonths: 24, maxMonths: 36 } },
      { level: 'secure', typicalAgeRange: { minMonths: 36, maxMonths: 48 } },
      { level: 'extending', typicalAgeRange: { minMonths: 48, maxMonths: 60 } }
    ];
  }

  private extractConcepts(text: string): string[] {
    // Simple concept extraction
    const words = text.toLowerCase().split(/\s+/);
    const conceptKeywords = ['learning', 'development', 'skills', 'communication', 'social', 'emotional', 'physical'];
    return words.filter(w => conceptKeywords.some(k => w.includes(k)));
  }

  private identifyDevelopmentalDomains(outcome: LearningOutcome): DevelopmentalDomain[] {
    const domains: DevelopmentalDomain[] = [];
    const textLower = outcome.description.toLowerCase();

    if (textLower.includes('communication') || textLower.includes('language')) {
      domains.push('language');
    }
    if (textLower.includes('social') || textLower.includes('emotional') || textLower.includes('relationship')) {
      domains.push('social_emotional');
    }
    if (textLower.includes('physical') || textLower.includes('motor')) {
      domains.push('physical_gross', 'physical_fine');
    }
    if (textLower.includes('learn') || textLower.includes('curious') || textLower.includes('explore')) {
      domains.push('approaches_to_learning');
    }

    return domains;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Placeholder - would use real embedding API
    return new Array(384).fill(0).map(() => Math.random());
  }

  private async findCrossCurricularConnections(
    tenantId: string,
    content: any
  ): Promise<any[]> {
    return [];
  }

  private aggregateDomainScores(
    progressRecords: ChildFrameworkProgress[]
  ): { domain: DevelopmentalDomain; score: number }[] {
    // Simplified aggregation
    const domains: DevelopmentalDomain[] = [
      'cognitive', 'language', 'social_emotional', 'physical_gross', 'physical_fine', 'creative'
    ];

    return domains.map(domain => ({
      domain,
      score: Math.random() * 0.5 + 0.3  // Placeholder score
    }));
  }

  private async generateActivityRecommendations(
    tenantId: string,
    domains: DevelopmentalDomain[],
    ageMonths: number
  ): Promise<ActivitySuggestion[]> {
    return this.generateDomainActivities(domains, ageMonths);
  }

  private generateDomainActivities(
    domains: DevelopmentalDomain[],
    ageMonths: number
  ): ActivitySuggestion[] {
    return domains.map(domain => ({
      id: this.generateId('act'),
      title: `${domain} Activity`,
      description: `An activity to support ${domain} development`,
      suitableAgeRange: { minMonths: ageMonths - 6, maxMonths: ageMonths + 6 },
      supportsOutcomeIds: [],
      supportsAreaIds: [],
      resourcesNeeded: ['Basic materials'],
      setupTime: 5,
      activityDuration: { min: 10, max: 20 },
      groupSize: 'flexible',
      environment: 'either',
      adaptations: [],
      observationPrompts: [],
      educationalRationale: `Supports ${domain} development`
    }));
  }

  private generateOverallNarrative(
    progressRecords: ChildFrameworkProgress[],
    domainScores: { domain: DevelopmentalDomain; score: number }[]
  ): string {
    const strong = domainScores.filter(d => d.score >= 0.7);
    const developing = domainScores.filter(d => d.score < 0.4);

    let narrative = 'Overall, the child is making good progress across all developmental areas. ';
    
    if (strong.length > 0) {
      narrative += `Particular strengths are evident in ${strong.map(s => s.domain).join(', ')}. `;
    }
    
    if (developing.length > 0) {
      narrative += `Additional support in ${developing.map(d => d.domain).join(', ')} would be beneficial.`;
    }

    return narrative;
  }

  private deduplicateActivities(activities: ActivitySuggestion[]): ActivitySuggestion[] {
    const seen = new Set<string>();
    return activities.filter(a => {
      if (seen.has(a.title)) return false;
      seen.add(a.title);
      return true;
    });
  }
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

interface FrameworkDataTemplate {
  name: string;
  version: string;
  jurisdiction: string;
  ageRange: { minMonths: number; maxMonths: number; displayRange: string };
  sourceUrl: string;
  principles: FrameworkPrinciple[];
  practices: FrameworkPractice[];
  assessmentApproach: any;
  observationTypes: any[];
  documentationRequirements: any[];
}

interface FrameworkIngestionStats {
  outcomesCreated: number;
  subElementsCreated: number;
  indicatorsCreated: number;
  areasCreated: number;
  aspectsCreated: number;
  processingTime: number;
}

// Shared types placeholder - these would be imported from main Scholarly types
interface EventBus {
  publish(topic: string, event: any): Promise<void>;
}

interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
}

interface ScholarlyConfig {
  environment: string;
}

class ScholarlyBaseService {
  protected readonly serviceName: string;
  protected readonly eventBus: EventBus;
  protected readonly cache: Cache;
  protected readonly config: ScholarlyConfig;

  constructor(serviceName: string, deps: { eventBus: EventBus; cache: Cache; config: ScholarlyConfig }) {
    this.serviceName = serviceName;
    this.eventBus = deps.eventBus;
    this.cache = deps.cache;
    this.config = deps.config;
  }

  protected async withTiming<T>(
    operation: string,
    tenantId: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<Result<T, any>> {
    try {
      const result = await fn();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error };
    }
  }

  protected async publishEvent(type: string, tenantId: string, payload: any): Promise<void> {
    await this.eventBus.publish(type, { type, tenantId, payload, timestamp: new Date() });
  }

  protected generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

type Result<T, E = any> = { success: true; data: T } | { success: false; error: E };
function success<T>(data: T): Result<T, never> { return { success: true, data }; }
function failure<E>(error: E): Result<never, E> { return { success: false, error }; }

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

const Validator = {
  tenantId(id: string): void {
    if (!id) throw new ValidationError('tenantId is required');
  },
  required(value: any, name: string): void {
    if (!value) throw new ValidationError(`${name} is required`);
  }
};

export { EarlyYearsCurriculumService };
