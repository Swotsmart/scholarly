/**
 * Early Years Curriculum Types
 * 
 * Extends the Curriculum Curator to support early childhood education frameworks:
 * - EYLF (Early Years Learning Framework) - Australia
 * - EYFS (Early Years Foundation Stage) - England
 * - Te Whāriki - New Zealand
 * - Head Start ELOF - USA
 * 
 * ## The Granny Explanation
 * 
 * Early years education is fundamentally different from K-12. Instead of subjects
 * like "Mathematics" and "English", we have developmental areas like:
 * - "Being, Belonging, Becoming" (EYLF's philosophy)
 * - "Physical Development", "Communication and Language" (EYFS areas)
 * 
 * Children don't "pass" or "fail" - they're observed showing "emerging", "developing",
 * or "secure" understanding of concepts. A teacher might note "Emma showed curiosity
 * by asking 'why?' three times during our nature walk" - that's evidence of the
 * EYLF Learning Outcome 4: "Children are confident and involved learners."
 * 
 * This module provides the types needed to:
 * 1. Represent these holistic, observation-based frameworks
 * 2. Map observations to developmental outcomes
 * 3. Track progression in developmentally appropriate ways
 * 4. Generate reports that parents can understand
 * 
 * ## Key Differences from K-12 Curriculum
 * 
 * | K-12 | Early Years |
 * |------|-------------|
 * | Content descriptions | Learning outcomes |
 * | Year levels | Age ranges (flexible) |
 * | Subjects | Developmental areas |
 * | Assessment grades | Observation notes |
 * | Prerequisites | Developmental progressions |
 * | Bloom's taxonomy | Developmental domains |
 * 
 * @module EarlyYearsCurriculum
 */

// ============================================================================
// FRAMEWORK IDENTITY
// ============================================================================

/**
 * Supported early years curriculum frameworks
 */
export type EarlyYearsFramework = 
  | 'EYLF'        // Early Years Learning Framework (Australia)
  | 'EYFS'        // Early Years Foundation Stage (England)
  | 'TE_WHARIKI'  // Te Whāriki (New Zealand)
  | 'HEAD_START'  // Head Start Early Learning Outcomes Framework (USA)
  | 'NAEYC'       // National Association for the Education of Young Children (USA)
  | 'REGGIO'      // Reggio Emilia approach (International)
  | 'MONTESSORI'  // Montessori method (International)
  | 'STEINER';    // Steiner/Waldorf approach (International)

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
    displayRange: string;  // "Birth to 5 years"
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
// EYLF-SPECIFIC TYPES (Australian Framework)
// ============================================================================

/**
 * EYLF Principles - The beliefs that guide practice
 * 
 * EYLF has 5 principles:
 * 1. Secure, respectful and reciprocal relationships
 * 2. Partnerships
 * 3. High expectations and equity
 * 4. Respect for diversity
 * 5. Ongoing learning and reflective practice
 */
export interface FrameworkPrinciple {
  id: string;
  code: string;           // "EYLF_P1", "EYFS_PR1"
  name: string;
  description: string;
  
  // How this principle manifests in practice
  practiceIndicators: string[];
  
  // Questions for reflective practice
  reflectiveQuestions: string[];
  
  // Related outcomes
  relatedOutcomeIds: string[];
}

/**
 * EYLF Practices - How educators work with children
 * 
 * EYLF has 8 practices:
 * 1. Holistic approaches
 * 2. Responsiveness to children
 * 3. Learning through play
 * 4. Intentional teaching
 * 5. Learning environments
 * 6. Cultural competence
 * 7. Continuity of learning and transitions
 * 8. Assessment for learning
 */
export interface FrameworkPractice {
  id: string;
  code: string;           // "EYLF_PR1"
  name: string;
  description: string;
  
  // Observable indicators
  indicators: string[];
  
  // Strategies for implementation
  strategies: string[];
  
  // Related principles
  relatedPrincipleIds: string[];
  
  // Example scenarios
  exampleScenarios: PracticeScenario[];
}

export interface PracticeScenario {
  context: string;
  educatorAction: string;
  childResponse: string;
  practiceAlignment: string;
}

/**
 * EYLF Learning Outcomes
 * 
 * EYLF has 5 outcomes:
 * 1. Children have a strong sense of identity
 * 2. Children are connected with and contribute to their world
 * 3. Children have a strong sense of wellbeing
 * 4. Children are confident and involved learners
 * 5. Children are effective communicators
 * 
 * Each outcome has sub-elements that provide more detail.
 */
export interface LearningOutcome {
  id: string;
  frameworkId: string;
  
  // Identity
  code: string;           // "EYLF_O1", "EYFS_CL"
  number?: number;        // 1, 2, 3... for numbered frameworks
  name: string;
  description: string;
  
  // Sub-elements
  subElements: OutcomeSubElement[];
  
  // Age-based expectations (optional - EYFS has these, EYLF doesn't)
  ageExpectations?: AgeExpectation[];
  
  // Observable indicators
  indicators: OutcomeIndicator[];
  
  // Linked developmental areas
  developmentalAreaIds: string[];
  
  // AI enrichment
  aiEnrichment: OutcomeAIEnrichment;
}

export interface OutcomeSubElement {
  id: string;
  outcomeId: string;
  code: string;           // "EYLF_O1.1"
  description: string;
  
  // Example behaviours showing this sub-element
  exampleBehaviours: string[];
  
  // Progression descriptors
  progressionDescriptors: ProgressionDescriptor[];
}

export interface AgeExpectation {
  ageRange: {
    minMonths: number;
    maxMonths: number;
    label: string;        // "0-11 months", "16-26 months"
  };
  typicalBehaviours: string[];
  expectedLevel: DevelopmentalLevel;
}

/**
 * Observable indicators - What you might see a child doing
 */
export interface OutcomeIndicator {
  id: string;
  outcomeId: string;
  subElementId?: string;
  
  // The indicator text
  text: string;           // "Child initiates interactions with others"
  
  // What it looks like in practice
  exampleObservations: string[];
  
  // Suitable age range for this indicator
  suitableAgeRange?: {
    minMonths: number;
    maxMonths: number;
  };
  
  // Developmental level this indicates
  indicatesLevel: DevelopmentalLevel;
  
  // Related keywords for AI matching
  keywords: string[];
  
  // AI-generated embedding for semantic matching
  embedding?: number[];
}

// ============================================================================
// EYFS-SPECIFIC TYPES (UK Framework)
// ============================================================================

/**
 * EYFS has 7 areas of learning:
 * 
 * Prime areas (fundamental, time-sensitive):
 * 1. Communication and Language
 * 2. Physical Development
 * 3. Personal, Social and Emotional Development
 * 
 * Specific areas (built on prime areas):
 * 4. Literacy
 * 5. Mathematics
 * 6. Understanding the World
 * 7. Expressive Arts and Design
 */
export interface DevelopmentalArea {
  id: string;
  frameworkId: string;
  
  // Identity
  code: string;           // "EYFS_CL", "EYLF_DA1"
  name: string;           // "Communication and Language"
  description: string;
  
  // EYFS-specific: Prime vs Specific
  areaType?: 'prime' | 'specific' | 'cross_cutting';
  
  // Aspects/components within this area
  aspects: DevelopmentalAspect[];
  
  // Age-related expectations (EYFS has these)
  developmentMatters?: DevelopmentMattersEntry[];
  
  // Early Learning Goals (EYFS end-of-reception expectations)
  earlyLearningGoals?: EarlyLearningGoal[];
  
  // Links to other areas
  linkedAreaIds: string[];
  
  // Which outcomes does this area support
  supportedOutcomeIds: string[];
}

export interface DevelopmentalAspect {
  id: string;
  areaId: string;
  code: string;
  name: string;           // "Listening and Attention" (aspect of Communication & Language)
  description: string;
  
  // Progression within this aspect
  progressionSteps: ProgressionStep[];
  
  // Example activities
  suggestedActivities: ActivitySuggestion[];
}

/**
 * Development Matters - EYFS non-statutory guidance
 * Provides age-related checkpoints
 */
export interface DevelopmentMattersEntry {
  id: string;
  aspectId: string;
  
  // Age band
  ageBand: EYFSAgeBand;
  
  // Typical behaviours at this age
  typicalBehaviours: string[];
  
  // What adults can do to support
  adultSupport: string[];
  
  // Enabling environments
  enablingEnvironments: string[];
}

export type EYFSAgeBand = 
  | 'birth_to_3'       // 0-36 months
  | '3_and_4'          // 36-48 months  
  | 'reception';       // 48-60 months

/**
 * Early Learning Goals - Expected attainment at end of Reception
 */
export interface EarlyLearningGoal {
  id: string;
  areaId: string;
  aspectId: string;
  code: string;         // "ELG01"
  name: string;
  description: string;
  
  // What "expected" looks like
  expectedIndicators: string[];
  
  // What "exceeding" might look like (removed in 2021, but some settings still track)
  exceedingIndicators?: string[];
}

// ============================================================================
// DEVELOPMENTAL PROGRESSION
// ============================================================================

/**
 * Developmental levels - How children progress
 * Unlike K-12 grades, these represent developmental continua
 */
export type DevelopmentalLevel = 
  | 'not_yet_observed'     // Haven't seen this yet
  | 'emerging'             // Beginning to show
  | 'developing'           // Working towards
  | 'secure'               // Consistently demonstrates
  | 'extending'            // Going beyond expectations
  | 'embedded';            // Deeply integrated, applies in new contexts

/**
 * Progression descriptor - What each level looks like
 */
export interface ProgressionDescriptor {
  subElementId: string;
  level: DevelopmentalLevel;
  description: string;
  typicalIndicators: string[];
  typicalAgeRange?: { minMonths: number; maxMonths: number };
}

/**
 * Individual progression step in a developmental continuum
 */
export interface ProgressionStep {
  id: string;
  aspectId: string;
  sequence: number;
  
  // Description of this step
  description: string;
  
  // Typical age when this might be observed
  typicalAgeRange: {
    minMonths: number;
    maxMonths: number;
  };
  
  // What you might observe
  observableIndicators: string[];
  
  // Prerequisites (previous steps)
  prerequisiteStepIds: string[];
  
  // What comes next
  nextStepIds: string[];
}

// ============================================================================
// OBSERVATION & ASSESSMENT
// ============================================================================

/**
 * Assessment approach configuration
 */
export interface AssessmentApproach {
  type: 'observation_based' | 'milestone_based' | 'portfolio_based' | 'hybrid';
  
  // Frequency expectations
  observationFrequency: {
    minimum: number;
    recommended: number;
    period: 'week' | 'month' | 'term';
  };
  
  // Documentation expectations
  documentationExpectations: string[];
  
  // Formal assessment points
  formalAssessmentPoints: FormalAssessmentPoint[];
  
  // Moderation requirements
  moderationRequired: boolean;
  moderationGuidance?: string;
}

export interface FormalAssessmentPoint {
  id: string;
  name: string;
  timing: string;          // "End of Reception", "2-year check"
  purpose: string;
  required: boolean;
  outputType: 'report' | 'profile' | 'summary' | 'checklist';
}

/**
 * Types of observations that can be recorded
 */
export interface ObservationType {
  id: string;
  code: string;
  name: string;           // "Learning Story", "Anecdotal Note", "Photo Observation"
  description: string;
  
  // Required elements
  requiredFields: string[];
  optionalFields: string[];
  
  // Typical length
  typicalLength: 'brief' | 'medium' | 'extended';
  
  // When to use
  bestUsedFor: string[];
  
  // Template/prompt
  templatePrompt?: string;
}

/**
 * Documentation requirements by framework
 */
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

/**
 * Maps equivalent concepts across frameworks
 * 
 * For example:
 * - EYLF Outcome 4 "Children are confident and involved learners"
 * - ≈ EYFS "Personal, Social and Emotional Development" + aspects of all areas
 * - ≈ Head Start "Approaches to Learning"
 */
export interface CrossFrameworkMapping {
  id: string;
  
  // Source
  sourceFramework: EarlyYearsFramework;
  sourceCode: string;
  sourceType: 'outcome' | 'area' | 'indicator' | 'goal';
  
  // Target
  targetFramework: EarlyYearsFramework;
  targetCode: string;
  targetType: 'outcome' | 'area' | 'indicator' | 'goal';
  
  // Mapping quality
  mappingType: 'equivalent' | 'partial' | 'related' | 'broader' | 'narrower';
  confidence: number;     // 0-1
  
  // Explanation
  explanation: string;
  
  // Source of mapping
  source: 'official' | 'ai_generated' | 'educator_validated';
  validatedBy?: string;
  validatedAt?: Date;
}

// ============================================================================
// AI ENRICHMENT
// ============================================================================

/**
 * AI-generated enrichment for learning outcomes
 */
export interface OutcomeAIEnrichment {
  // Extracted key concepts
  keyConcepts: string[];
  
  // Developmental domains covered
  developmentalDomains: DevelopmentalDomain[];
  
  // Semantic embedding for similarity matching
  embedding?: number[];
  
  // Activity suggestions by age
  activitySuggestionsByAge: {
    ageRange: { minMonths: number; maxMonths: number };
    activities: ActivitySuggestion[];
  }[];
  
  // Common misconceptions adults have
  commonMisconceptions: string[];
  
  // Environment setup suggestions
  environmentSuggestions: string[];
  
  // Links to other outcomes (within and across frameworks)
  relatedOutcomes: {
    outcomeId: string;
    framework: EarlyYearsFramework;
    relationshipType: 'prerequisite' | 'corequisite' | 'extends' | 'complements';
    strength: number;
  }[];
  
  // Typical progression timeline
  typicalProgressionTimeline: {
    level: DevelopmentalLevel;
    typicalAgeRange: { minMonths: number; maxMonths: number };
  }[];
}

/**
 * Developmental domains (holistic view)
 */
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

/**
 * Activity suggestion with educational rationale
 */
export interface ActivitySuggestion {
  id: string;
  title: string;
  description: string;
  
  // Age suitability
  suitableAgeRange: {
    minMonths: number;
    maxMonths: number;
  };
  
  // What outcomes/areas this supports
  supportsOutcomeIds: string[];
  supportsAreaIds: string[];
  
  // Resources needed
  resourcesNeeded: string[];
  
  // Setup time and duration
  setupTime: number;      // minutes
  activityDuration: {
    min: number;
    max: number;
  };
  
  // Group size
  groupSize: 'individual' | 'small_group' | 'large_group' | 'whole_class' | 'flexible';
  
  // Environment
  environment: 'indoor' | 'outdoor' | 'either';
  
  // Adaptations
  adaptations: {
    type: 'extension' | 'simplification' | 'sensory' | 'physical' | 'language';
    description: string;
  }[];
  
  // What to observe
  observationPrompts: string[];
  
  // Educational rationale
  educationalRationale: string;
}

// ============================================================================
// CHILD PROGRESS TRACKING
// ============================================================================

/**
 * Individual child's progress against framework
 */
export interface ChildFrameworkProgress {
  id: string;
  tenantId: string;
  childId: string;
  frameworkId: string;
  
  // Age at last update
  ageAtLastUpdate: number;  // months
  
  // Progress by outcome
  outcomeProgress: OutcomeProgress[];
  
  // Progress by developmental area
  areaProgress: AreaProgress[];
  
  // Key strengths identified
  strengths: {
    outcomeId: string;
    description: string;
    evidenceObservationIds: string[];
  }[];
  
  // Areas for growth
  areasForGrowth: {
    outcomeId: string;
    description: string;
    suggestedStrategies: string[];
  }[];
  
  // Overall summary (AI-generated)
  aiSummary?: {
    narrativeSummary: string;
    keyHighlights: string[];
    recommendations: string[];
    generatedAt: Date;
  };
  
  // Timestamps
  createdAt: Date;
  lastUpdatedAt: Date;
  lastObservationAt?: Date;
}

export interface OutcomeProgress {
  outcomeId: string;
  currentLevel: DevelopmentalLevel;
  
  // Progress on sub-elements
  subElementProgress: {
    subElementId: string;
    level: DevelopmentalLevel;
    lastObservedAt?: Date;
    observationCount: number;
  }[];
  
  // Trend
  trend: 'progressing' | 'consolidating' | 'needs_support' | 'insufficient_data';
  
  // Evidence count
  evidenceCount: number;
  lastEvidenceAt?: Date;
}

export interface AreaProgress {
  areaId: string;
  
  // Aspect-level progress
  aspectProgress: {
    aspectId: string;
    currentStepId: string;
    observationCount: number;
  }[];
  
  // EYFS-specific: on track for ELG?
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

/**
 * Links an observation to framework elements
 */
export interface ObservationFrameworkLink {
  id: string;
  observationId: string;
  
  // What this observation evidences
  linkedElements: LinkedElement[];
  
  // Overall quality assessment
  evidenceQuality: 'strong' | 'moderate' | 'weak';
  
  // AI analysis
  aiAnalysis?: {
    suggestedLinks: LinkedElement[];
    confidence: number;
    reasoning: string;
    detectedDevelopmentalDomains: DevelopmentalDomain[];
  };
  
  // Teacher validation
  teacherValidated: boolean;
  teacherAdjustments?: string;
  
  createdAt: Date;
}

export interface LinkedElement {
  elementType: 'outcome' | 'sub_element' | 'area' | 'aspect' | 'indicator' | 'goal';
  elementId: string;
  frameworkCode: EarlyYearsFramework;
  
  // Strength of evidence
  evidenceStrength: 'strong' | 'supporting' | 'emerging';
  
  // Level demonstrated (if applicable)
  levelDemonstrated?: DevelopmentalLevel;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Configuration for generating progress reports
 */
export interface ProgressReportConfig {
  frameworkCode: EarlyYearsFramework;
  reportType: 'termly_summary' | 'annual_report' | 'transition_statement' | '2_year_check';
  
  // Content options
  includeNarratives: boolean;
  includeObservationExamples: boolean;
  includePhotos: boolean;
  includeNextSteps: boolean;
  includeHomeActivities: boolean;
  
  // Audience
  audience: 'parent' | 'educator' | 'next_setting' | 'health_visitor';
  
  // Language/tone
  tone: 'celebratory' | 'balanced' | 'developmental';
  readingLevel: 'simple' | 'standard' | 'professional';
  
  // Output format
  outputFormat: 'narrative' | 'checklist' | 'hybrid';
}

/**
 * Generated progress report
 */
export interface GeneratedProgressReport {
  id: string;
  tenantId: string;
  childId: string;
  frameworkId: string;
  config: ProgressReportConfig;
  
  // Report content
  content: {
    introduction: string;
    
    // By outcome or area depending on framework
    sections: ReportSection[];
    
    keyStrengths: string[];
    areasForGrowth: string[];
    nextSteps: string[];
    homeActivities?: string[];
    
    conclusion: string;
  };
  
  // Evidence used
  observationIdsUsed: string[];
  
  // Metadata
  periodCovered: {
    start: Date;
    end: Date;
  };
  childAgeAtReport: number;  // months
  
  generatedAt: Date;
  generatedBy: 'ai' | 'teacher' | 'hybrid';
  
  // Status
  status: 'draft' | 'approved' | 'shared';
  approvedBy?: string;
  sharedAt?: Date;
}

export interface ReportSection {
  // What this section covers
  outcomeId?: string;
  areaId?: string;
  title: string;
  
  // Narrative content
  narrative: string;
  
  // Current level/status
  currentLevel?: DevelopmentalLevel;
  
  // Example observations (summarized)
  exampleObservations: string[];
  
  // Next steps for this area
  nextSteps: string[];
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Re-export common types from main curriculum module
  // These would be imported from the main curriculum-curator types
};
