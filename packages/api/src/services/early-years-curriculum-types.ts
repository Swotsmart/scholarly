/**
 * Early Years Curriculum Types
 *
 * Extends the Curriculum Curator to support early childhood education frameworks:
 * - EYLF (Early Years Learning Framework) - Australia
 * - EYFS (Early Years Foundation Stage) - England
 * - Te Whariki - New Zealand
 * - Head Start ELOF - USA
 *
 * @module EarlyYearsCurriculumTypes
 */

// ============================================================================
// FRAMEWORK IDENTITY
// ============================================================================

/**
 * Supported early years curriculum frameworks
 */
export type EarlyYearsFramework =
  | 'EYLF' // Early Years Learning Framework (Australia)
  | 'EYFS' // Early Years Foundation Stage (England)
  | 'TE_WHARIKI' // Te Whariki (New Zealand)
  | 'HEAD_START' // Head Start Early Learning Outcomes Framework (USA)
  | 'NAEYC' // National Association for the Education of Young Children (USA)
  | 'REGGIO' // Reggio Emilia approach (International)
  | 'MONTESSORI' // Montessori method (International)
  | 'STEINER'; // Steiner/Waldorf approach (International)

/**
 * Framework metadata and configuration
 */
export interface EarlyYearsFrameworkConfig {
  id: string;
  tenantId: string;

  // Identity
  code: EarlyYearsFramework;
  name: string;
  version: string;
  jurisdiction: string;

  // Age range
  ageRange: {
    minMonths: number;
    maxMonths: number;
    displayRange: string;
  };

  // Structure
  principles: FrameworkPrinciple[];
  practices: FrameworkPractice[];
  outcomes: LearningOutcome[];
  developmentalAreas: DevelopmentalArea[];

  // Assessment approach
  assessmentApproach: AssessmentApproach;

  // Observation types supported
  observationTypes: ObservationType[];

  // Documentation requirements
  documentationRequirements: DocumentationRequirement[];

  // Cross-framework mappings
  crossFrameworkMappings: CrossFrameworkMapping[];

  // Metadata
  sourceUrl: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  ingestedAt: Date;
  lastUpdated: Date;

  // AI enrichment
  aiEnrichment: {
    conceptsExtracted: number;
    progressionsIdentified: number;
    crossMappingsGenerated: number;
    lastEnrichedAt: Date;
  };
}

// ============================================================================
// PRINCIPLES AND PRACTICES
// ============================================================================

export interface FrameworkPrinciple {
  id: string;
  code: string;
  name: string;
  description: string;
  practiceIndicators: string[];
  reflectiveQuestions: string[];
  relatedOutcomeIds: string[];
}

export interface FrameworkPractice {
  id: string;
  code: string;
  name: string;
  description: string;
  indicators: string[];
  strategies: string[];
  relatedPrincipleIds: string[];
  exampleScenarios: PracticeScenario[];
}

export interface PracticeScenario {
  context: string;
  educatorAction: string;
  childResponse: string;
  practiceAlignment: string;
}

// ============================================================================
// LEARNING OUTCOMES
// ============================================================================

export interface LearningOutcome {
  id: string;
  frameworkId: string;
  code: string;
  number?: number;
  name: string;
  description: string;
  subElements: OutcomeSubElement[];
  ageExpectations?: AgeExpectation[];
  indicators: OutcomeIndicator[];
  developmentalAreaIds: string[];
  aiEnrichment: OutcomeAIEnrichment;
}

export interface OutcomeSubElement {
  id: string;
  outcomeId: string;
  code: string;
  description: string;
  exampleBehaviours: string[];
  progressionDescriptors: ProgressionDescriptor[];
}

export interface AgeExpectation {
  ageRange: {
    minMonths: number;
    maxMonths: number;
    label: string;
  };
  typicalBehaviours: string[];
  expectedLevel: DevelopmentalLevel;
}

export interface OutcomeIndicator {
  id: string;
  outcomeId: string;
  subElementId?: string;
  text: string;
  exampleObservations: string[];
  suitableAgeRange?: {
    minMonths: number;
    maxMonths: number;
  };
  indicatesLevel: DevelopmentalLevel;
  keywords: string[];
  embedding?: number[];
}

// ============================================================================
// DEVELOPMENTAL AREAS
// ============================================================================

export interface DevelopmentalArea {
  id: string;
  frameworkId: string;
  code: string;
  name: string;
  description: string;
  areaType?: 'prime' | 'specific' | 'cross_cutting';
  aspects: DevelopmentalAspect[];
  developmentMatters?: DevelopmentMattersEntry[];
  earlyLearningGoals?: EarlyLearningGoal[];
  linkedAreaIds: string[];
  supportedOutcomeIds: string[];
}

export interface DevelopmentalAspect {
  id: string;
  areaId: string;
  code: string;
  name: string;
  description: string;
  progressionSteps: ProgressionStep[];
  suggestedActivities: ActivitySuggestion[];
}

export interface DevelopmentMattersEntry {
  id: string;
  aspectId: string;
  ageBand: EYFSAgeBand;
  typicalBehaviours: string[];
  adultSupport: string[];
  enablingEnvironments: string[];
}

export type EYFSAgeBand = 'birth_to_3' | '3_and_4' | 'reception';

export interface EarlyLearningGoal {
  id: string;
  areaId: string;
  aspectId: string;
  code: string;
  name: string;
  description: string;
  expectedIndicators: string[];
  exceedingIndicators?: string[];
}

// ============================================================================
// DEVELOPMENTAL PROGRESSION
// ============================================================================

export type DevelopmentalLevel =
  | 'not_yet_observed'
  | 'emerging'
  | 'developing'
  | 'secure'
  | 'extending'
  | 'embedded';

export interface ProgressionDescriptor {
  subElementId: string;
  level: DevelopmentalLevel;
  description: string;
  typicalIndicators: string[];
  typicalAgeRange?: { minMonths: number; maxMonths: number };
}

export interface ProgressionStep {
  id: string;
  aspectId: string;
  sequence: number;
  description: string;
  typicalAgeRange: {
    minMonths: number;
    maxMonths: number;
  };
  observableIndicators: string[];
  prerequisiteStepIds: string[];
  nextStepIds: string[];
}

// ============================================================================
// OBSERVATION & ASSESSMENT
// ============================================================================

export interface AssessmentApproach {
  type: 'observation_based' | 'milestone_based' | 'portfolio_based' | 'hybrid';
  observationFrequency: {
    minimum: number;
    recommended: number;
    period: 'week' | 'month' | 'term';
  };
  documentationExpectations: string[];
  formalAssessmentPoints: FormalAssessmentPoint[];
  moderationRequired: boolean;
  moderationGuidance?: string;
}

export interface FormalAssessmentPoint {
  id: string;
  name: string;
  timing: string;
  purpose: string;
  required: boolean;
  outputType: 'report' | 'profile' | 'summary' | 'checklist';
}

export interface ObservationType {
  id: string;
  code: string;
  name: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  typicalLength: 'brief' | 'medium' | 'extended';
  bestUsedFor: string[];
  templatePrompt?: string;
}

export interface DocumentationRequirement {
  type: 'learning_journal' | 'portfolio' | 'progress_report' | 'transition_statement';
  frequency: 'ongoing' | 'termly' | 'annual' | 'at_transition';
  audience: ('parent' | 'educator' | 'child' | 'next_setting')[];
  requiredElements: string[];
  formatGuidance: string;
}

// ============================================================================
// CROSS-FRAMEWORK MAPPING
// ============================================================================

export interface CrossFrameworkMapping {
  id: string;
  sourceFramework: EarlyYearsFramework;
  sourceCode: string;
  sourceType: 'outcome' | 'area' | 'indicator' | 'goal';
  targetFramework: EarlyYearsFramework;
  targetCode: string;
  targetType: 'outcome' | 'area' | 'indicator' | 'goal';
  mappingType: 'equivalent' | 'partial' | 'related' | 'broader' | 'narrower';
  confidence: number;
  explanation: string;
  source: 'official' | 'ai_generated' | 'educator_validated';
  validatedBy?: string;
  validatedAt?: Date;
}

// ============================================================================
// AI ENRICHMENT
// ============================================================================

export interface OutcomeAIEnrichment {
  keyConcepts: string[];
  developmentalDomains: DevelopmentalDomain[];
  embedding?: number[];
  activitySuggestionsByAge: {
    ageRange: { minMonths: number; maxMonths: number };
    activities: ActivitySuggestion[];
  }[];
  commonMisconceptions: string[];
  environmentSuggestions: string[];
  relatedOutcomes: {
    outcomeId: string;
    framework: EarlyYearsFramework;
    relationshipType: 'prerequisite' | 'corequisite' | 'extends' | 'complements';
    strength: number;
  }[];
  typicalProgressionTimeline: {
    level: DevelopmentalLevel;
    typicalAgeRange: { minMonths: number; maxMonths: number };
  }[];
}

export type DevelopmentalDomain =
  | 'cognitive'
  | 'language'
  | 'social_emotional'
  | 'physical_gross'
  | 'physical_fine'
  | 'creative'
  | 'approaches_to_learning'
  | 'self_regulation'
  | 'executive_function';

export interface ActivitySuggestion {
  id: string;
  title: string;
  description: string;
  suitableAgeRange: {
    minMonths: number;
    maxMonths: number;
  };
  supportsOutcomeIds: string[];
  supportsAreaIds: string[];
  resourcesNeeded: string[];
  setupTime: number;
  activityDuration: {
    min: number;
    max: number;
  };
  groupSize: 'individual' | 'small_group' | 'large_group' | 'whole_class' | 'flexible';
  environment: 'indoor' | 'outdoor' | 'either';
  adaptations: {
    type: 'extension' | 'simplification' | 'sensory' | 'physical' | 'language';
    description: string;
  }[];
  observationPrompts: string[];
  educationalRationale: string;
}

// ============================================================================
// CHILD PROGRESS TRACKING
// ============================================================================

export interface ChildFrameworkProgress {
  id: string;
  tenantId: string;
  childId: string;
  frameworkId: string;
  ageAtLastUpdate: number;
  outcomeProgress: OutcomeProgress[];
  areaProgress: AreaProgress[];
  strengths: {
    outcomeId: string;
    description: string;
    evidenceObservationIds: string[];
  }[];
  areasForGrowth: {
    outcomeId: string;
    description: string;
    suggestedStrategies: string[];
  }[];
  aiSummary?: {
    narrativeSummary: string;
    keyHighlights: string[];
    recommendations: string[];
    generatedAt: Date;
  };
  createdAt: Date;
  lastUpdatedAt: Date;
  lastObservationAt?: Date;
}

export interface OutcomeProgress {
  outcomeId: string;
  currentLevel: DevelopmentalLevel;
  subElementProgress: {
    subElementId: string;
    level: DevelopmentalLevel;
    lastObservedAt?: Date;
    observationCount: number;
  }[];
  trend: 'progressing' | 'consolidating' | 'needs_support' | 'insufficient_data';
  evidenceCount: number;
  lastEvidenceAt?: Date;
}

export interface AreaProgress {
  areaId: string;
  aspectProgress: {
    aspectId: string;
    currentStepId: string;
    observationCount: number;
  }[];
  onTrackForELG?: boolean;
  elgPrediction?: {
    likelihood: 'likely' | 'possible' | 'unlikely';
    confidence: number;
    supportStrategies?: string[];
  };
}

// ============================================================================
// OBSERVATION LINKING
// ============================================================================

export interface ObservationFrameworkLink {
  id: string;
  observationId: string;
  linkedElements: LinkedElement[];
  evidenceQuality: 'strong' | 'moderate' | 'weak';
  aiAnalysis?: {
    suggestedLinks: LinkedElement[];
    confidence: number;
    reasoning: string;
    detectedDevelopmentalDomains: DevelopmentalDomain[];
  };
  teacherValidated: boolean;
  teacherAdjustments?: string;
  createdAt: Date;
}

export interface LinkedElement {
  elementType: 'outcome' | 'sub_element' | 'area' | 'aspect' | 'indicator' | 'goal';
  elementId: string;
  frameworkCode: EarlyYearsFramework;
  evidenceStrength: 'strong' | 'supporting' | 'emerging';
  levelDemonstrated?: DevelopmentalLevel;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

export interface ProgressReportConfig {
  frameworkCode: EarlyYearsFramework;
  reportType: 'termly_summary' | 'annual_report' | 'transition_statement' | '2_year_check';
  includeNarratives: boolean;
  includeObservationExamples: boolean;
  includePhotos: boolean;
  includeNextSteps: boolean;
  includeHomeActivities: boolean;
  audience: 'parent' | 'educator' | 'next_setting' | 'health_visitor';
  tone: 'celebratory' | 'balanced' | 'developmental';
  readingLevel: 'simple' | 'standard' | 'professional';
  outputFormat: 'narrative' | 'checklist' | 'hybrid';
}

export interface GeneratedProgressReport {
  id: string;
  tenantId: string;
  childId: string;
  frameworkId: string;
  config: ProgressReportConfig;
  content: {
    introduction: string;
    sections: ReportSection[];
    keyStrengths: string[];
    areasForGrowth: string[];
    nextSteps: string[];
    homeActivities?: string[];
    conclusion: string;
  };
  observationIdsUsed: string[];
  periodCovered: {
    start: Date;
    end: Date;
  };
  childAgeAtReport: number;
  generatedAt: Date;
  generatedBy: 'ai' | 'teacher' | 'hybrid';
  status: 'draft' | 'approved' | 'shared';
  approvedBy?: string;
  sharedAt?: Date;
}

export interface ReportSection {
  outcomeId?: string;
  areaId?: string;
  title: string;
  narrative: string;
  currentLevel?: DevelopmentalLevel;
  exampleObservations: string[];
  nextSteps: string[];
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

export interface FrameworkIngestionStats {
  outcomesCreated: number;
  subElementsCreated: number;
  indicatorsCreated: number;
  areasCreated: number;
  aspectsCreated: number;
  processingTime: number;
}

export interface FrameworkDataTemplate {
  name: string;
  version: string;
  jurisdiction: string;
  ageRange: { minMonths: number; maxMonths: number; displayRange: string };
  sourceUrl: string;
  principles: FrameworkPrinciple[];
  practices: FrameworkPractice[];
  assessmentApproach: AssessmentApproach;
  observationTypes: ObservationType[];
  documentationRequirements: DocumentationRequirement[];
}

export interface OutcomeSearchFilters {
  frameworkCodes?: EarlyYearsFramework[];
  developmentalDomains?: DevelopmentalDomain[];
  ageRange?: { minMonths: number; maxMonths: number };
}
